import test from 'node:test';
import assert from 'node:assert/strict';
import {backup,loadCache,settings} from '../spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache',id='0000000000000000000001';
const meta={id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:300};
function setup(network,store=new Map()){
 const calls=[],request=async(u,o)=>{calls.push(u);return network(u,o);};const ctx={env:{},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:request,post:request}};
 return {ctx,store,calls,state:{cache:loadCache(ctx,{track:id,language:'zh-CN'}),settings:settings({FALLBACK_PROVIDER:'auto'}),deadline:Date.now()+10000}};
}
const reply=x=>new Response(JSON.stringify(x));
function empty(u){
 if(u.includes('lrclib'))return u.includes('/get?')?new Response('{}',{status:404}):reply([]);
 if(u.includes('/soso/'))return reply({code:0,data:{song:{list:[]}}});
 if(u.includes('/cloudsearch/'))return reply({code:200,result:{songs:[]}});
 if(u.includes('kugou'))return reply({status:200,candidates:[]});
 if(u.includes('kuwo'))return reply({abslist:[]});
 if(u.includes('/suggest/'))return reply({data:[]});
 throw Error('unexpected request '+u);
}
test('a retry skips recently verified empty sources and can reach the recovered next source',async()=>{
 const original=Date.now;let now=original(),recover=false;Date.now=()=>now;
 try{
  const network=u=>{
   if(u.includes('/cloudsearch/'))return recover?reply({code:200,result:{songs:[{id:9,name:meta.title,ar:[{name:meta.artists[0]}],al:{name:meta.album},dt:300000}]}}):new Response('busy',{status:503});
   if(u.includes('/api/song/lyric'))return reply({code:200,lrc:{lyric:'[00:01]Original lantern one.\n[00:03]Original lantern two.'}});
   return empty(u);
  };
  const a=setup(network);assert.equal(await backup(a.ctx,meta,a.state),null);assert.equal(a.calls.length,7);a.state.cache.save();
  const saved=JSON.parse(a.store.get(KEY));
  assert.equal(saved.entries.filter(e=>e.key.startsWith('source-miss:')).length,5);
  assert.ok(!saved.entries.some(e=>e.key==='lyrics:auto:'+id));
  now+=61000;recover=true;const b=setup(network,a.store);
  const found=await backup(b.ctx,meta,b.state);assert.equal(found.lyrics.provider,'netease');
  assert.equal(b.calls.length,2);assert.ok(b.calls.every(u=>u.includes('music.163.com')));
  b.state.cache.save();assert.ok(b.store.get(KEY).length<=64000);
 }finally{Date.now=original;}
});
test('an expired complete miss does not discard still-valid per-source evidence or renew its deadline',async()=>{
 const x=setup(empty);assert.equal(await backup(x.ctx,meta,x.state),null);x.state.cache.save();
 const data=JSON.parse(x.store.get(KEY)),whole=data.entries.find(e=>e.key==='lyrics:auto:'+id),earliest=Math.min(...data.entries.filter(e=>e.key.startsWith('source-miss:')).map(e=>e.expires));
 whole.expires=Date.now()-1;x.store.set(KEY,JSON.stringify(data));
 const y=setup(empty,x.store);assert.equal(await backup(y.ctx,meta,y.state),null);assert.equal(y.calls.length,0);y.state.cache.save();
 assert.ok(JSON.parse(y.store.get(KEY)).entries.find(e=>e.key==='lyrics:auto:'+id).expires<=earliest);
});
test('individual miss expiry and source revision changes both allow a fresh lookup',async()=>{
 const x=setup(empty);await backup(x.ctx,meta,x.state);x.state.cache.save();
 for(const mode of ['expiry','revision']){
  const data=JSON.parse(x.store.get(KEY));
  data.entries=data.entries.filter(e=>!e.key.startsWith('lyrics:'));
  for(const e of data.entries)if(e.key.startsWith('source-miss:')){if(mode==='expiry')e.expires=Date.now()-1;else e.value.revision=5;}
  const y=setup(empty,new Map([[KEY,JSON.stringify(data)]]));
  await backup(y.ctx,meta,y.state);assert.equal(y.calls.length,7);
 }
});
for(const provider of ['qq','netease','kugou','kuwo'])test(provider+': application download errors are retryable, not missing-song evidence',async()=>{
 const x=setup(u=>{
  if(u.includes('/soso/'))return reply({code:0,data:{song:{list:[{songmid:'TESTMID',songname:meta.title,singer:[{name:meta.artists[0]}],albumname:meta.album,interval:300}]}}});
  if(u.includes('/cloudsearch/'))return reply({code:200,result:{songs:[{id:9,name:meta.title,ar:[{name:meta.artists[0]}],al:{name:meta.album},dt:300000}]}});
  if(u.includes('kugou.com/search'))return reply({status:200,candidates:[{id:9,accesskey:'testkey',song:meta.title,singer:meta.artists[0],duration:300000}]});
  if(u.includes('search.kuwo'))return reply({abslist:[{MUSICRID:'MUSIC_9',SONGNAME:meta.title,ARTIST:meta.artists[0],ALBUM:meta.album,DURATION:300}]});
  return reply({code:503,retcode:503,status:503,success:false});
 });
 x.state.settings.provider=provider;assert.equal(await backup(x.ctx,meta,x.state),null);x.state.cache.save();
 const rows=JSON.parse(x.store.get(KEY)||'{"entries":[]}').entries;
 assert.ok(!rows.some(e=>e.key.startsWith('source-miss:')||e.key.startsWith('lyrics:')));
 assert.ok(x.state.attempts.some(a=>a.result==='request-or-format'));
});
for(const provider of ['qq','netease','kugou','kuwo'])test(provider+': a failed first download preserves the second identity-checked candidate',async()=>{
 let downloads=0;
 const x=setup(u=>{
  if(u.includes('/soso/'))return reply({code:0,data:{song:{list:[1,2].map(i=>({songmid:'MID'+i,songname:meta.title,singer:[{name:meta.artists[0]}],albumname:meta.album,interval:300}))}}});
  if(u.includes('/cloudsearch/'))return reply({code:200,result:{songs:[1,2].map(i=>({id:i,name:meta.title,ar:[{name:meta.artists[0]}],al:{name:meta.album},dt:300000}))}});
  if(u.includes('kugou.com/search'))return reply({status:200,candidates:[1,2].map(i=>({id:i,accesskey:'testkey',song:meta.title,singer:meta.artists[0],duration:300000}))});
  if(u.includes('search.kuwo'))return reply({abslist:[1,2].map(i=>({MUSICRID:'MUSIC_'+i,SONGNAME:meta.title,ARTIST:meta.artists[0],ALBUM:meta.album,DURATION:300}))});
  downloads++;
  if(downloads===1)return reply({code:503,retcode:503,status:503,success:false});
  const lyric='[00:01]Original lantern one.\n[00:03]Original lantern two.';
  if(provider==='qq')return reply({retcode:0,lyric});
  if(provider==='netease')return reply({code:200,lrc:{lyric}});
  if(provider==='kugou')return reply({status:200,id:2,fmt:'lrc',charset:'utf8',content:Buffer.from(lyric).toString('base64')});
  return reply({code:200,success:true,data:{lrclist:[{time:'1',lineLyric:'Original lantern one.'},{time:'3',lineLyric:'Original lantern two.'}]}});
 });
 x.state.settings.provider=provider;
 const result=await backup(x.ctx,meta,x.state);assert.equal(result.lyrics.provider,provider);assert.equal(downloads,2);
});

