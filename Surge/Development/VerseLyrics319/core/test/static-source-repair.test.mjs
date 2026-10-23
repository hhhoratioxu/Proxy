import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCandidates,sourceLyrics,loadCache,settings,backup,cachedBackup,parseDocument,encodeDocument} from '../spotify-lyrics.js';
const id='0000000000000000000001',base={id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:300};
function session(provider='auto',network=()=>{throw Error('unexpected request');}) {
 const store=new Map(),calls=[],ctx={env:{},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{calls.push(u);return new Response(JSON.stringify(network(u)));},post:async u=>{calls.push(u);return new Response(JSON.stringify(network(u)));}}};
 return {ctx,store,calls,state:{cache:loadCache(ctx),settings:settings({FALLBACK_PROVIDER:provider}),deadline:Date.now()+10000}};
}
test('soundtrack annotation and a verified full artist alias match the same recording, independent of Spotify track id',()=>{
 for(const track of ['1fpBhAhO9gpTwuglQfjVBh',id]) {
  const meta={id:track,title:'后会无期 (《诡案》网络剧插曲)',artists:['Silence Wang','徐良'],album:'',duration:211.76};
  const record={title:'后会无期',artists:['徐良','汪苏泷'],album:'不良少年',duration:211};
  assert.deepEqual(sourceCandidates(meta,[record],s=>s),[record]);
  for(const wrong of [ {...record,title:'后会无期 (Remix)'}, {...record,title:'后会无期 (Live)'}, {...record,artists:['徐良','Other singer']}, {...record,artists:['Silence','徐良']}, {...record,duration:206.186}, {...record,album:'Live 2026'}]) assert.deepEqual(sourceCandidates(meta,[wrong],s=>s),[]);
  assert.deepEqual(sourceCandidates(meta,[record,{...record,album:'Another album'}],s=>s),[]);
 }
});
for(const suffix of ['（《原创剧》主题曲）',' (《原创剧》片尾曲)',' (《原创剧》网络剧插曲)'])test('only an explicit promotional title suffix is comparable: '+suffix,()=>{
 const record={...base},meta={...base,title:base.title+suffix};assert.deepEqual(sourceCandidates(meta,[record],s=>s),[record]);
 for(const title of [base.title+' (Live)',base.title+' (《Live Show》插曲)',base.title+' (《剧》插曲 Remix)',base.title+' (Acoustic)',base.title+' Part 2'])assert.deepEqual(sourceCandidates({...base,title},[record],s=>s),[]);
});
function twoCandidates(provider,u) {
 if(u.includes('/soso/'))return {code:0,data:{song:{list:[1,2].map(n=>({songmid:'TEST'+n,songname:base.title,singer:[{name:base.artists[0]}],albumname:base.album,interval:300}))}}};
 if(u.includes('/cloudsearch/'))return {code:200,result:{songs:[1,2].map(n=>({id:n,name:base.title,ar:[{name:base.artists[0]}],al:{name:base.album},dt:300000}))}};
 if(u.includes('kugou.com/search'))return {status:200,candidates:[1,2].map(n=>({id:String(n),accesskey:'TESTKEY',song:base.title,singer:base.artists[0],duration:300000}))};
 if(u.includes('kuwo.cn/r.s'))return {abslist:[1,2].map(n=>({MUSICRID:'MUSIC_'+n,SONGNAME:base.title,ARTIST:base.artists[0],ALBUM:base.album,DURATION:300}))};
 const key=new URL(u).searchParams,isSecond=(key.get('songmid')==='TEST2'||key.get('id')==='2'||key.get('musicId')==='2'),lyric=isSecond?'[00:01]Self written timed line.\n[00:03]Another timed line.':'[00:00]Self written static line.';
 if(provider==='qq')return {code:0,lyric};
 if(provider==='netease')return {code:200,lrc:{lyric}};
 if(provider==='kugou')return {status:200,content:Buffer.from(lyric).toString('base64')};
 return {code:200,success:true,data:{lrclist:[{time:isSecond?'1':'0',lineLyric:'Self written line.'},{time:isSecond?'3':'0',lineLyric:'Another line.'}]}};
}
for(const provider of ['qq','netease','kugou','kuwo']) {
 test(provider+': static upgrades continue after an untimed first accepted candidate',async()=>{
  const x=session(provider,u=>twoCandidates(provider,u));x.state.timedOnly=true;
  const doc=await sourceLyrics(x.ctx,provider,base,x.state);assert.equal(doc.lyrics.syncType,'LINE_SYNCED');assert.equal(x.calls.length,3);
 });
 test(provider+': ordinary fallback preserves the first usable result and request count',async()=>{
  const x=session(provider,u=>twoCandidates(provider,u)),doc=await sourceLyrics(x.ctx,provider,base,x.state);assert.equal(doc.lyrics.syncType,'UNSYNCED');assert.equal(x.calls.length,2);
 });
}
test('a whole-lyrics negative cache cannot block a timed-only upgrade',()=>{
 const x=session();x.state.cache.put('lyrics:auto:'+id,{missing:true,sourceRevision:8},90000);assert.equal(cachedBackup(x.state,id),null);assert.equal(cachedBackup(x.state,id,false,true),undefined);
});
test('timed-only source misses stay in separate bounded records from ordinary source misses',async()=>{
 const x=session('auto',u=>{
  if(u.includes('/soso/'))return twoCandidates('qq',u);
  if(u.includes('/lyric/'))return {code:0,lyric:'[00:00]Self written static one.\n[00:00]Self written static two.'};
  if(u.includes('/cloudsearch/'))return {code:200,result:{songs:[]}};
  if(u.includes('kugou'))return {status:200,candidates:[]};
  if(u.includes('kuwo'))return {abslist:[]};
  if(u.includes('lrclib'))return [];
  if(u.includes('lyrics.ovh'))return {data:[]};
  throw Error('unexpected host');
 });
 assert.equal(await backup(x.ctx,base,x.state,true),null);assert.ok(x.state.cache.entries.some(e=>e.key==='source-sync-miss:v1:qq:'+id));assert.ok(!x.state.cache.entries.some(e=>e.key==='source-miss:v1:qq:'+id));
 const before=x.calls.filter(u=>u.includes('/soso/')).length;
 const ordinary=await backup(x.ctx,base,{...x.state,deadline:Date.now()+10000});assert.equal(ordinary.lyrics.syncType,'UNSYNCED');assert.equal(x.calls.filter(u=>u.includes('/soso/')).length,before+1);x.state.cache.save();assert.ok(x.store.get('VerseLyrics.v1.cache').length<=64000);
});
for(const format of ['json','protobuf'])test(format+': a synchronized label with an all-zero multi-line timeline is static; real, single-line and unknown enums stay guarded',()=>{
 const make=(sync,times)=>encodeDocument({lyrics:{syncType:sync,provider:'Spotify',providerDisplayName:'Spotify',lines:times.map((t,i)=>({startTimeMs:String(t),words:'Original '+i}))},colors:{background:-10985626,text:-16777216,highlightText:-1}},format),type=format==='json'?'application/json':'application/x-protobuf';
 assert.equal(parseDocument(make('LINE_SYNCED',[0,0,0]),type).unsynced,true);
 assert.equal(parseDocument(make('LINE_SYNCED',[0,1000,3000]),type).unsynced,false);
 assert.equal(parseDocument(make('LINE_SYNCED',[0]),type).unsynced,false);
 if(format==='json'){const d=JSON.parse(Buffer.from(make('LINE_SYNCED',[0,0])));d.lyrics.syncType='FUTURE_SYNC';assert.equal(parseDocument(Buffer.from(JSON.stringify(d)),type).unsynced,false);d.lyrics.syncType='LINE_SYNCED';delete d.lyrics.lines[1].startTimeMs;assert.equal(parseDocument(Buffer.from(JSON.stringify(d)),type).unsynced,false);}
});
