import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,seedStore,colors} from './feature-host.mjs';
import {encodeDocument,parseDocument,existingPalette} from './core/spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache',meta={id:'5gjHrjV4IhqPqoDHQUAriQ',title:'Burn It Down',artists:['KimYeji'],album:'',duration:213.6};
const words=['오늘은 바람이 조용합니다','We walk beside the river','oh'];
const translations=['今天的风很平静','我们走在河边',''];
const lyric=words.map((s,i)=>'[00:0'+(i*2+1)+'.00]'+s).join('\n');
function seed(legacy=false){
 const store=seedStore(meta);
 if(legacy){const d=JSON.parse(store.get(KEY));for(const [key,value] of [
  ['lyrics:auto:'+meta.id,{missing:true,sourceRevision:7}],
  ['source-miss:v1:qq:'+meta.id,{revision:7}],
  ['synced-miss:v1:auto:'+meta.id,{revision:7}],
  ['source-sync-miss:v1:qq:'+meta.id,{revision:7}]
 ])d.entries.push({key,value,expires:Date.now()+90000});store.set(KEY,JSON.stringify(d));}
 return store;
}
const network=async u=>{
 if(u.includes('lrclib.net'))return{status:u.includes('/get?')?404:200,body:u.includes('/get?')?'{}':'[]'};
 if(u.includes('/soso/'))return{body:JSON.stringify({code:0,data:{song:{list:[
  {songmid:'WRONGVERSION',songname:'Burn It Down (Instrumental)',singer:[{name:'KimYeji'}],albumname:'Friendly Rivalry',interval:213},
  {songmid:'WRONGARTIST',songname:'Burn It Down',singer:[{name:'Other Singer'}],albumname:'Friendly Rivalry',interval:213},
  {songmid:'TESTMID',songname:'Burn It Down',singer:[{name:'김예지 (Kim Yeji)'}],albumname:'Friendly Rivalry',interval:213}
 ]}}})};
 if(u.includes('/lyric/')){assert.equal(new URL(u).searchParams.get('songmid'),'TESTMID');return{body:JSON.stringify({code:0,lyric})};}
 if(u.includes('translate.googleapis.com')){const q=new URL(u).searchParams.getAll('q');assert.deepEqual(q,words.slice(0,2));return{body:JSON.stringify(translations.slice(0,2))};}
 throw Error('Unexpected service');
};
function check(out,format){
 const d=parseDocument(out.bytes,format==='json'?'application/json':'application/x-protobuf');assert.equal(d.unsynced,false);assert.deepEqual(d.words,words);assert.equal(d.hasAlternatives,true);
 assert.deepEqual(existingPalette(out.bytes,d),colors);assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);
 const cache=JSON.parse(out.store.get(KEY));assert.ok(out.store.get(KEY).length<=64000);assert.ok(cache.entries.length<=128);
 const translated=cache.entries.find(e=>e.key==='translations:v1:zh-CN:'+meta.id)?.value.pairs;
 assert.deepEqual(translated?.map(p=>p.slice(0,2)),words.slice(0,2).map((s,i)=>[s,translations[i]]));
 if(format==='json'){const doc=JSON.parse(out.bytes);assert.deepEqual(doc.lyrics.lines.map(l=>l.startTimeMs),['1000','3000','5000']);assert.deepEqual(doc.lyrics.alternatives[0].lines,translations);}
 return d;
}
for(const client of ['Loon','Egern','Surge','Shadowrocket','QuantumultX'])for(const format of ['json','protobuf']){
 const name=client+' '+format;
 for(const legacy of [false,true])test(name+': absent official lyrics use bilingual source labels; legacy miss '+legacy,async()=>{
  const store=seed(legacy),out=await invoke(client,{format,track:meta.id,provider:'auto',store,network});check(out,format);assert.equal(out.calls.length,5);
  const warm=await invoke(client,{format,track:meta.id,provider:'auto',store,network:()=>{throw Error('Warm must not fetch');}});check(warm,format);assert.equal(warm.calls.length,0);assert.deepEqual(warm.bytes,out.bytes);
 });
 test(name+': static-to-timed upgrade also bypasses the old source miss',async()=>{
  const body=encodeDocument({lyrics:{syncType:'UNSYNCED',provider:'Spotify',providerDisplayName:'Spotify',lines:words.map(words=>({words,startTimeMs:'0'}))},colors},format);
  const out=await invoke(client,{format,track:meta.id,provider:'auto',store:seed(true),status:200,responseBody:body,network});check(out,format);assert.equal(out.calls.length,5);
 });
 test(name+': disabling static replacement preserves the official lyric response without source lookup',async()=>{
  const body=encodeDocument({lyrics:{syncType:'UNSYNCED',provider:'Spotify',providerDisplayName:'Spotify',lines:words.map(words=>({words,startTimeMs:'0'}))},colors},format);
  const out=await invoke(client,{format,track:meta.id,provider:'auto',store:seed(true),status:200,responseBody:body,env:{REPLACE_UNSYNCED:false,TRANSLATION_ENABLED:false},network:()=>{throw Error('Replacement disabled');}});
  assert.deepEqual(out.bytes,Buffer.from(body));assert.equal(out.calls.length,0);assert.equal(out.done,1);assert.equal(out.active,0);
 });
 test(name+': cache-only reuses successful lyrics without any source or translator call',async()=>{
  const store=seed(),first=await invoke(client,{format,track:meta.id,provider:'auto',store,network});check(first,format);
  const out=await invoke(client,{format,track:meta.id,provider:'auto',store,env:{NETWORK_MODE:'cache-only'},network:()=>{throw Error('Cache only');}});check(out,format);assert.equal(out.calls.length,0);assert.deepEqual(out.bytes,first.bytes);
 });
 test(name+': compact cache retains bilingual fallback and translations within its own limits',async()=>{
  const store=seed(true),out=await invoke(client,{format,track:meta.id,provider:'auto',store,env:{MEMORY_MODE:'compact'},network});check(out,format);
  const raw=store.get(KEY);assert.ok(raw.length<=32000);assert.ok(JSON.parse(raw).entries.length<=64);
  const warm=await invoke(client,{format,track:meta.id,provider:'auto',store,env:{MEMORY_MODE:'compact'},network:()=>{throw Error('Compact cache miss');}});check(warm,format);assert.equal(warm.calls.length,0);assert.deepEqual(warm.bytes,out.bytes);
 });
}
