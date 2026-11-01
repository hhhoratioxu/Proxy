import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,seedStore,meta,colors,sourceFixture} from './feature-host.mjs';
import {encodeDocument,parseDocument,existingPalette,loadCache} from './core/spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache',clients=['Loon','Surge','Shadowrocket','QuantumultX','Egern'],id=n=>String(n).padStart(22,'0');
const invalid='<html>'+ 'x'.repeat(90000)+'</html>';
function expire(store,host){const data=JSON.parse(store.get(KEY));data.cooldowns[host]=Date.now()-1;store.set(KEY,JSON.stringify(data));}
for(const client of clients)for(const format of ['json','protobuf']){
 test(client+' '+format+': malformed translator is fetched once across ten songs; expiry retries without losing originals',async()=>{
  const store=seedStore(),words=['Original self-written line.','Another original line.'],body=encodeDocument({lyrics:{provider:'Spotify',providerDisplayName:'Spotify',language:'en',syncType:'LINE_SYNCED',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[{language:'zh-CN',lines:['OFFICIAL','OFFICIAL']}]},colors},format);let calls=0,until;
  for(let n=1;n<=10;n++){
   const r=await invoke(client,{format,store,track:id(n),status:200,responseBody:body,network:async u=>{assert.ok(u.includes('translate.googleapis.com'));calls++;return {body:invalid};}}),d=parseDocument(r.bytes,format==='json'?'application/json':'application/x-protobuf');assert.deepEqual(d.words,words);assert.equal(d.hasAlternatives,false);assert.equal(r.done,1);assert.equal(r.active,0);assert.ok(r.maxActive<=1);
   const raw=store.get(KEY),saved=JSON.parse(raw);assert.ok(raw.length<=64000);const current=saved.cooldowns['translate.googleapis.com'];assert.ok(current>Date.now());if(until)assert.equal(current,until,'busy songs must not prolong backoff');until=current;
   if(n>1){assert.equal(r.calls.length,0);assert.equal(r.timers.length,0);}assert.ok(!saved.entries.some(e=>e.key.startsWith('translations:')));
  }
  assert.equal(calls,1);expire(store,'translate.googleapis.com');const r=await invoke(client,{format,store,track:id(11),status:200,responseBody:body,network:async()=>{calls++;return {body:JSON.stringify(['原创译文一','原创译文二'])};}});assert.equal(calls,2);assert.ok(r.bytes.includes(Buffer.from('原创译文一')));assert.deepEqual(parseDocument(r.bytes,format==='json'?'application/json':'application/x-protobuf').words,words);
 });
 test(client+' '+format+': invalid first source backs off across distinct artists while QQ fallback and same-response translation remain',async()=>{
  const store=new Map();let invalidCalls=0,sourceCalls=0,current=0;const attempts=[];
  const network=async u=>{
   if(u.includes('lrclib.net')){invalidCalls++;return {body:invalid};}
   assert.ok(u.includes('c.y.qq.com'));sourceCalls++;const value=sourceFixture('qq',u,{lines:2});if(u.includes('/soso/'))value.data.song.list[0].singer=[{name:'Ada North '+current}];return {body:JSON.stringify(value)};
  };
  for(current=1;current<=10;current++){
   const track=id(current),cache=loadCache({storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)}});cache.put('meta:'+track,{...meta,id:track,artists:['Ada North '+current]});cache.put('palette:v1:'+track,{colors});cache.save();
   const out=await invoke(client,{format,provider:'auto',store,track,network}),d=parseDocument(out.bytes,format==='json'?'application/json':'application/x-protobuf');assert.equal(d.words.length,2);assert.ok(out.bytes.includes(Buffer.from('第0句译文')));assert.deepEqual(existingPalette(out.bytes,d),colors);assert.equal(out.done,1);assert.equal(out.active,0);assert.equal(out.maxActive,1);attempts.push(out.calls.length);
   const saved=JSON.parse(store.get(KEY));assert.ok(store.get(KEY).length<=64000);assert.ok(!saved.entries.some(e=>e.key==='source-miss:v1:lrclib:'+track));
  }
  assert.equal(invalidCalls,1);assert.equal(sourceCalls,20);assert.deepEqual(attempts,[3,...Array(9).fill(2)]);
 });
}
