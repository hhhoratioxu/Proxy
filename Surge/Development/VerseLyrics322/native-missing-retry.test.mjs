import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,seedStore,sourceFixture} from './feature-host.mjs';
const clients=['Loon','Surge','Shadowrocket','QuantumultX','Egern'];
const cache='VerseLyrics.v1.cache',slot='VerseLyrics.v1.network';
const headers={'Cache-Control':'public, max-age=86400',ETag:'temporary-missing','Last-Modified':'yesterday',Expires:'tomorrow','X-Test':'preserve'};
const header=(result,name)=>result.headers?.get?.(name)??Object.entries(result.headers||{}).find(([k])=>k.toLowerCase()===name.toLowerCase())?.[1];
for(const client of clients)for(const format of ['json','protobuf']){
 test(`${client} ${format}: busy missing result is not cacheable and the next idle request can fill lyrics`,async()=>{
  const store=seedStore();store.set(slot,JSON.stringify([{owner:'other',track:'0000000000000000000002',expires:Date.now()+10000}]));
  const first=await invoke(client,{format,store,responseHeaders:headers,network:()=>{throw Error('busy must not start HTTP');}});
  assert.equal(first.done,1);assert.equal(first.active,0);assert.equal(first.calls.length,0);assert.equal(first.timers.length,0);
  assert.equal(first.bytes.toString(),'missing');assert.equal(first.result.status,undefined);assert.equal(header(first.result,'Cache-Control'),'no-store');assert.equal(header(first.result,'X-Test'),'preserve');
  for(const k of ['ETag','Expires','Last-Modified'])assert.ok(header(first.result,k)==null);
  assert.ok(!JSON.parse(store.get(cache)).entries.some(e=>e.value?.missing));
  store.set(slot,'[]');
  const second=await invoke(client,{format,store,responseHeaders:headers,network:async u=>({body:JSON.stringify(sourceFixture('netease',u))})});
  assert.equal(second.done,1);assert.equal(second.active,0);assert.ok(second.maxActive<=1);assert.ok(second.bytes.includes(Buffer.from('My original paper lantern 0.')));assert.ok(second.bytes.includes(Buffer.from('第0句译文')));
 });
 test(`${client} ${format}: temporary upstream failure cannot become a permanent lyric miss`,async()=>{
  const store=seedStore(),out=await invoke(client,{format,store,responseHeaders:headers,network:async()=>({status:503,body:'temporary'})});
  assert.equal(out.done,1);assert.equal(out.bytes.toString(),'missing');assert.equal(header(out.result,'Cache-Control'),'no-store');assert.ok(!JSON.parse(store.get(cache)).entries.some(e=>e.value?.missing));
 });
 test(`${client} ${format}: source disabled retains the upstream no-lyrics response`,async()=>{
  const out=await invoke(client,{format,provider:'off',responseHeaders:headers,network:()=>{throw Error('off');}});
  assert.equal(out.calls.length,0);assert.equal(out.bytes.toString(),'missing');assert.ok(header(out.result,'Cache-Control')!=='no-store');
 });
}
