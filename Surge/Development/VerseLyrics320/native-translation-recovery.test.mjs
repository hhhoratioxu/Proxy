import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,seedStore,colors} from './feature-host.mjs';
import {encodeDocument,parseDocument,existingPalette} from './core/spotify-lyrics.js';
const id='6n7jFn3rgC6qWjsYaPJfB8',KEY='VerseLyrics.v1.cache';
const words=['오늘은 바람이 조용합니다','Please stay with me','다시 함께 걸어요'],answers=['今天的风很平静','请留在我身边','再次一起走吧'];
function official(format,rows=words){return encodeDocument({lyrics:{syncType:'LINE_SYNCED',language:'ko',provider:'Spotify',providerDisplayName:'Spotify',lines:rows.map((words,i)=>({words,startTimeMs:String(i*2100+1000),endTimeMs:'0'})),alternatives:[{language:'zh-CN',lines:rows.map(()=> 'OLD_OFFICIAL')}]},colors},format);}
function seed(pairs){const store=seedStore(),d=JSON.parse(store.get(KEY));if(pairs)d.entries.push({key:'translations:v1:zh-CN:'+id,value:{pairs},expires:Date.now()+600000});store.set(KEY,JSON.stringify(d));return store;}
function expire(store){const d=JSON.parse(store.get(KEY));for(const e of d.entries)for(const p of e.value?.pairs||[])if(typeof p[2]==='number')p[2]=Date.now()-1;store.set(KEY,JSON.stringify({entries:d.entries,cooldowns:d.cooldowns||{}}));}
function inspect(out,format,expected,rows=words){
 const type=format==='json'?'application/json':'application/x-protobuf',doc=parseDocument(out.bytes,type);
 assert.deepEqual(doc.words,rows);assert.deepEqual(existingPalette(out.bytes,doc),colors);
 const want=encodeDocument({lyrics:{syncType:'LINE_SYNCED',language:'ko',provider:'Spotify',providerDisplayName:'Spotify',lines:rows.map((words,i)=>({words,startTimeMs:String(i*2100+1000),endTimeMs:'0'})),alternatives:expected.some(Boolean)?[{language:'zh-CN',lines:expected}]:[]},colors},format);
 assert.deepEqual(out.bytes,Buffer.from(want));assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);assert.ok(!out.bytes.includes(Buffer.from('OLD_OFFICIAL')));
 const raw=out.store.get(KEY);assert.ok(!raw||raw.length<=64000);assert.ok(!raw||JSON.parse(raw).entries.length<=128);
}
for(const client of ['Loon','Egern','Surge','Shadowrocket','QuantumultX'])for(const format of ['json','protobuf']){
 const name=client+' '+format,body=official(format);
 test(name+': a Korean track with English phrases translates and reopens without HTTP',async()=>{
  const store=seed(),out=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:async u=>{const url=new URL(u);assert.equal(url.searchParams.get('sl'),'ko');assert.deepEqual(url.searchParams.getAll('q'),words);return{body:JSON.stringify(answers)};}});
  inspect(out,format,answers);assert.equal(out.calls.length,1);
  const warm=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:()=>{throw Error('Warm translation must not request');}});inspect(warm,format,answers);assert.equal(warm.calls.length,0);
 });
 test(name+': stale original-as-translation track cache recovers without clearing other cache entries',async()=>{
  const store=seed(words.map(s=>[s,s])),out=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:async()=>({body:JSON.stringify(answers)})});
  inspect(out,format,answers);assert.equal(out.calls.length,1);assert.ok(JSON.parse(store.get(KEY)).entries.some(e=>e.key.startsWith('meta:')));
 });
 test(name+': a null answer preserves other rows and retries only that row after the interval',async()=>{
  const store=seed(),out=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:async()=>({body:JSON.stringify([answers[0],null,answers[2]])})});inspect(out,format,[answers[0],'',answers[2]]);assert.equal(out.calls.length,1);
  const warm=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:()=>{throw Error('Short retry interval');}});inspect(warm,format,[answers[0],'',answers[2]]);assert.equal(warm.calls.length,0);
  expire(store);const retry=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:async u=>{assert.deepEqual(new URL(u).searchParams.getAll('q'),[words[1]]);return{body:JSON.stringify([answers[1]])};}});inspect(retry,format,answers);assert.equal(retry.calls.length,1);
 });
 test(name+': a service identity is not a permanent successful translation',async()=>{
  const store=seed(),out=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:async u=>({body:JSON.stringify(new URL(u).searchParams.getAll('q'))})});inspect(out,format,['','','']);assert.equal(out.calls.length,1);
  const warm=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:()=>{throw Error('Unchanged rows should wait');}});inspect(warm,format,['','','']);assert.equal(warm.calls.length,0);
  expire(store);const retry=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:async()=>({body:JSON.stringify(answers)})});inspect(retry,format,answers);assert.equal(retry.calls.length,1);
 });
 test(name+': unmatched result count never attaches an answer to an unknown original position',async()=>{
  const store=seed(),out=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:async()=>({body:JSON.stringify([answers[0]])})});inspect(out,format,['','','']);assert.equal(out.calls.length,1);
  const next=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:async()=>({body:JSON.stringify(answers)})});inspect(next,format,answers);assert.equal(next.calls.length,1);
 });
 test(name+': cache-only identity suppression keeps originals and permits later online recovery',async()=>{
  const store=seed(words.map(s=>[s,s])),out=await invoke(client,{track:id,format,store,status:200,responseBody:body,env:{NETWORK_MODE:'cache-only'},network:()=>{throw Error('Offline');}});inspect(out,format,['','','']);assert.equal(out.calls.length,0);
  const online=await invoke(client,{track:id,format,store,status:200,responseBody:body,network:async()=>({body:JSON.stringify(answers)})});inspect(online,format,answers);assert.equal(online.calls.length,1);
 });
}

