import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCandidates,sourceLyrics,backup,cachedBackup,loadCache,settings} from '../spotify-lyrics.js';
const meta={id:'0000000000000000000001',title:'Paper Lantern',artists:['HaeRin'],album:'Quiet Walk',duration:180};
const record={...meta,artists:['해린 (Hae Rin)']};
const select=(m,rows)=>sourceCandidates(m,rows,x=>x);
for(const [plain,label] of [
 ['HaeRin','해린 (Hae Rin)'],['해린','해린 (Hae Rin)'],
 ['Hae Rin','Hae Rin（해린）'],['海林','海林 (Hai Lin)'],
 ['Hai Lin','海林 (Hai Lin)'],['Aoi','アオイ (Aoi)'],
 ['アオイ','Aoi (アオイ)'],['汪苏泷','汪苏泷 (Silence Wang)'],
 ['Silence Wang','汪苏泷 (Silence Wang)'],['Mia','美亜 (Mia)']
])for(const reverse of [false,true])test('complete bilingual names compare in either direction: '+plain+' / '+label+' '+reverse,()=>{
 const a={...meta,artists:[reverse?label:plain]},b={...record,artists:[reverse?plain:label]};
 assert.deepEqual(select(a,[b]),[b]);
});
for(const bad of ['해린 (Other Singer)','Hae Rin (Solo)','해린 (Hae)','해린 (of Hae Rin)','해린 (Hae Rin cover)','해린 (Hae Rin) (Live)','해린 ((Hae Rin))','해린 (Hae Rin','해린 [Hae Rin]','해린 / Hae Rin','해린 & Hae Rin','해린 (Hae Rin feat Ada North)','Hae Rin Group','XHaeRinX','해린 (Hae Rin cover by Ada)','해린 (Hae Rin / Other)'])test('qualified, partial, malformed and additional performer names do not become an alias: '+bad,()=>{
 assert.deepEqual(select(meta,[{...record,artists:[bad]}]),[]);
});
test('bilingual labels never weaken title, duration, version or unique-candidate checks',()=>{
 for(const wrong of [
  {...record,title:meta.title+' (Instrumental)'},{...record,title:meta.title+' (Live)'},
  {...record,title:meta.title+' (Remix)'},{...record,duration:184},
  {...record,album:'Quiet Walk Live'},{...record,artists:['해린 (Hae Rin)','Other Singer']}
 ])assert.deepEqual(select(meta,[wrong]),[]);
 assert.deepEqual(select({...meta,album:''},[record,{...record,album:'Another Album'}]),[]);
 assert.deepEqual(select({...meta,album:''},[{...record,duration:181.2}]),[]);
 assert.deepEqual(select(meta,[{...record,duration:181.2}]),[{...record,duration:181.2}]);
});
test('all collaborators match one to one and artist order can differ',()=>{
 const m={...meta,artists:['Hae Rin','Mia']},r={...record,artists:['美亜 (Mia)','해린 (Hae Rin)']};
 assert.deepEqual(select(m,[r]),[r]);
 for(const names of [['해린 (Hae Rin)'],['해린 (Hae Rin)','Other'],['해린 (Hae Rin)','해린 (Mia)']])
  assert.deepEqual(select(m,[{...r,artists:names}]),[]);
 // Both source records claim the same complete Latin name: identity is ambiguous.
 assert.deepEqual(select({...meta,artists:['Hae Rin','해린']},[{...record,artists:['해린 (Hae Rin)','미아 (Hae Rin)']}]),[]);
});
test('bounded alias matching supports 32 performers and rejects an added performer',()=>{
 const names=Array.from({length:32},(_,i)=>'Singer '+i),labels=names.map((n,i)=>'가수'+i+' ('+n+')');
 assert.deepEqual(select({...meta,artists:names},[{...record,artists:labels}]),[{...record,artists:labels}]);
 assert.deepEqual(select({...meta,artists:names},[{...record,artists:[...labels,'다른 (Other)']}]),[]);
});
function session(provider,network){
 const store=new Map(),calls=[],ctx={env:{},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async(u,o)=>{calls.push(u);return new Response(JSON.stringify(network(u,o)));},post:async(u,o)=>{calls.push(u);return new Response(JSON.stringify(network(u,o)));}}};
 return {store,ctx,calls,state:{cache:loadCache(ctx),settings:settings({FALLBACK_PROVIDER:provider}),deadline:Date.now()+10000}};
}
const lrc='[00:01.00]Self written lantern line.\n[00:03.00]Another self written line.';
for(const provider of ['qq','netease','kugou','kuwo','lrclib','lyricsovh'])test(provider+': existing lookup accepts a complete bilingual label without any extra query',async()=>{
 const label='해린 (Hae Rin)';
 const x=session(provider,u=>{
  if(u.includes('/soso/'))return{code:0,data:{song:{list:[{songmid:'TESTMID',songname:meta.title,singer:[{name:label}],albumname:meta.album,interval:180}]}}};
  if(u.includes('/cloudsearch/'))return{code:200,result:{songs:[{id:42,name:meta.title,ar:[{name:label}],al:{name:meta.album},dt:180000}]}};
  if(u.includes('kugou.com/search'))return{status:200,candidates:[{id:42,accesskey:'TESTKEY',song:meta.title,singer:label,duration:180000}]};
  if(u.includes('kuwo.cn/r.s'))return{abslist:[{MUSICRID:'MUSIC_42',SONGNAME:meta.title,ARTIST:label,ALBUM:meta.album,DURATION:'180'}]};
  if(u.includes('lrclib'))return{trackName:meta.title,artistName:label,albumName:meta.album,duration:180,syncedLyrics:lrc,instrumental:false};
  if(u.includes('/suggest/'))return{data:[{title:meta.title,artist:{name:label},album:{title:meta.album},duration:180}]};
  if(provider==='qq')return{code:0,lyric:lrc};
  if(provider==='netease')return{code:200,lrc:{lyric:lrc}};
  if(provider==='kugou')return{status:200,id:42,fmt:'lrc',charset:'utf8',content:Buffer.from(lrc).toString('base64')};
  if(provider==='kuwo')return{code:200,success:true,data:{songinfo:{id:42,songName:meta.title,artist:label,duration:'180'},lrclist:[{time:'1',lineLyric:'Self written lantern line.'},{time:'3',lineLyric:'Another self written line.'}]}};
  return{lyrics:'Self written lantern line.\nAnother self written line.'};
 }),doc=await sourceLyrics(x.ctx,provider,meta,x.state);
 assert.ok(doc);assert.equal(doc.lyrics.provider,provider);assert.equal(doc.lyrics.lines.length,2);
 assert.equal(doc.lyrics.syncType,provider==='lyricsovh'?'UNSYNCED':'LINE_SYNCED');
 assert.equal(x.calls.length,provider==='lrclib'?1:2);
});
test('old whole-song and source misses cannot hide newly matchable lyrics; new misses still work',async()=>{
 const x=session('auto',u=>u.includes('/soso/')?{code:0,data:{song:{list:[{songmid:'TESTMID',songname:meta.title,singer:[{name:'해린 (Hae Rin)'}],albumname:meta.album,interval:180}]}}}:u.includes('/lyric/')?{code:0,lyric:lrc}:[]);
 x.state.cache.put('lyrics:auto:'+meta.id,{missing:true,sourceRevision:7},90000);
 x.state.cache.put('source-miss:v1:qq:'+meta.id,{revision:7},90000);
 x.state.settings.preferred='qq';
 const doc=await backup(x.ctx,meta,x.state);assert.equal(doc.lyrics.syncType,'LINE_SYNCED');assert.equal(x.calls.length,2);
 assert.ok(cachedBackup(x.state,meta.id));
 const y=session('auto',()=>{throw Error('new miss must remain cached');});y.state.cache.put('lyrics:auto:'+meta.id,{missing:true,sourceRevision:8},90000);assert.equal(cachedBackup(y.state,meta.id),null);
});
test('old timed-only misses invalidate without removing successful lyrics or translations',async()=>{
 const x=session('qq',u=>u.includes('/soso/')?{code:0,data:{song:{list:[{songmid:'TESTMID',songname:meta.title,singer:[{name:'해린 (Hae Rin)'}],albumname:meta.album,interval:180}]}}}:{code:0,lyric:lrc});
 x.state.cache.put('synced-miss:v1:qq:'+meta.id,{revision:7},90000);x.state.cache.put('translations:v1:zh-CN:'+meta.id,{pairs:[['Self written lantern line.','自写灯笼句子。']]});
 assert.equal((await backup(x.ctx,meta,x.state,true)).lyrics.syncType,'LINE_SYNCED');assert.equal(x.calls.length,2);
 assert.ok(x.state.cache.get('translations:v1:zh-CN:'+meta.id));x.state.cache.save();assert.ok(x.store.get('VerseLyrics.v1.cache').length<=64000);
});
