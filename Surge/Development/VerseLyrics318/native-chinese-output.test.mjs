import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,seedStore,id,colors,sourceFixture} from './feature-host.mjs';
import {parseDocument,encodeDocument,existingPalette} from './core/spotify-lyrics.js';
const clients=['Loon','Surge','Shadowrocket','QuantumultX','Egern'],KEY='VerseLyrics.v1.cache';
const originals=['我愛你 baby','WJK 妳穿著白衣','WJK 這裡 紙\u200b燈'],converted=['我爱你 baby','WJK 你穿着白衣','WJK 这里 纸灯'];
function official(format,words,language='zh'){
 return encodeDocument({lyrics:{syncType:'LINE_SYNCED',language,provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[{language:'zh-CN',lines:words.map((_,i)=>'OFFICIAL_'+i)}]},colors},format);
}
function seedPairs(store,target,words,values,tag){const data=JSON.parse(store.get(KEY));data.entries.push({key:'translations:v1:'+target+':'+id,value:{pairs:words.map((s,i)=>[s,values[i],...(tag?[tag]:[])])},expires:Date.now()+600000});store.set(KEY,JSON.stringify(data));}
function verify(out,format,words){const doc=parseDocument(out.bytes,format==='json'?'application/json':'application/x-protobuf');assert.deepEqual(doc.words,words);assert.deepEqual(existingPalette(out.bytes,doc),colors);assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);assert.equal(out.bytes.includes(Buffer.from('OFFICIAL_')),false);const raw=out.store.get(KEY);if(raw){assert.ok(raw.length<=64000);assert.ok(JSON.parse(raw).entries.length<=128);}return doc;}
for(const client of clients)for(const format of ['json','protobuf'])for(const target of ['zh-CN','zh-TW']){
 const name=client+' '+format+' '+target;
 test(name+': mixed English translates while pure Chinese never becomes cross-conversion',async()=>{
  const words=['原創紙燈',...originals,'The sea is quiet.'],values=['宝贝','WJK','自写外语译文'],store=seedStore();
  const out=await invoke(client,{format,store,status:200,responseBody:official(format,words),env:{TARGET_LANGUAGE:target},network:async u=>{assert.deepEqual(new URL(u).searchParams.getAll('q'),['baby','WJK',words.at(-1)]);return {body:JSON.stringify(values.map(s=>[s,'zh']))};}});
  verify(out,format,words);assert.equal(out.calls.length,1);assert.ok(out.bytes.includes(Buffer.from('我愛你 宝贝')));assert.ok(out.bytes.includes(Buffer.from('自写外语译文')));assert.equal(out.bytes.includes(Buffer.from(converted[1])),false);assert.equal(out.bytes.includes(Buffer.from(converted[2])),false);
  const warm=await invoke(client,{format,store,status:200,responseBody:official(format,words),env:{TARGET_LANGUAGE:target},network:async()=>{throw Error('warm must not fetch');}});verify(warm,format,words);assert.equal(warm.calls.length,0);assert.deepEqual(warm.bytes,out.bytes);
 });
 for(const cache of ['identity','conversion','tagged-source','legacy'])test(name+': migrate stale '+cache+' cache once without losing English',async()=>{
  const words=[originals[0]],store=seedStore(),values=[cache==='identity'?words[0]:converted[0]];
  if(cache==='legacy'){const d=JSON.parse(store.get(KEY));d.entries.push({key:'translation:'+target+':'+words[0],value:values[0],expires:Date.now()+600000});store.set(KEY,JSON.stringify(d));}else seedPairs(store,target,words,values,cache==='tagged-source'?'source':null);
  const a=await invoke(client,{format,store,status:200,responseBody:official(format,words,'ja'),env:{TARGET_LANGUAGE:target},network:async u=>{assert.deepEqual(new URL(u).searchParams.getAll('q'),['baby']);return {body:JSON.stringify([['宝贝','zh-CN']])};}});verify(a,format,words);assert.equal(a.calls.length,1);assert.ok(a.bytes.includes(Buffer.from('我愛你 宝贝')));
  const b=await invoke(client,{format,store,status:200,responseBody:official(format,words,'ja'),env:{TARGET_LANGUAGE:target},network:async()=>{throw Error('warm cache must not fetch');}});verify(b,format,words);assert.equal(b.calls.length,0);assert.deepEqual(b.bytes,a.bytes);
 });
 test(name+': actual conversion-only attempt is hidden and never requested again on reopen',async()=>{
  const words=[...originals],body=official(format,words,'ja'),store=seedStore();
  const a=await invoke(client,{format,store,status:200,responseBody:body,env:{TARGET_LANGUAGE:target},network:async()=>({body:JSON.stringify(['baby','WJK'].map(s=>[s,'en']))})});assert.equal(verify(a,format,words).hasAlternatives,false);assert.equal(a.calls.length,1);
  const b=await invoke(client,{format,store,status:200,responseBody:body,env:{TARGET_LANGUAGE:target,SOURCE_TRANSLATIONS:'false'},network:async()=>{throw Error('attempt proof must suppress repeated calls');}});assert.equal(verify(b,format,words).hasAlternatives,false);assert.equal(b.calls.length,0);assert.deepEqual(b.bytes,a.bytes);
 });
 test(name+': cache-only retains useful mixed translation and filters stale conversion without HTTP',async()=>{
  const words=[...originals],store=seedStore();seedPairs(store,target,words,['我愛你 宝贝',converted[1],words[2]]);
  const a=await invoke(client,{format,store,status:200,responseBody:official(format,words),env:{TARGET_LANGUAGE:target,NETWORK_MODE:'cache-only'},network:async()=>{throw Error('cache-only');}});verify(a,format,words);assert.equal(a.calls.length,0);assert.ok(a.bytes.includes(Buffer.from('我愛你 宝贝')));assert.equal(a.bytes.includes(Buffer.from(converted[1])),false);
 });
 test(name+': mixed fallback source lyrics translate English without additional source fetches',async()=>{
  const words=['我愛你 baby','原創紙燈'],network=async u=>{
   if(u.includes('/cloudsearch/'))return {body:JSON.stringify(sourceFixture('netease',u))};
   if(u.includes('translate.googleapis')){assert.deepEqual(new URL(u).searchParams.getAll('q'),['baby']);return {body:JSON.stringify([['宝贝','zh']])};}
   return {body:JSON.stringify({code:200,lrc:{lyric:'[00:01]我愛你 baby\n[00:03]原創紙燈'},tlyric:{lyric:'[00:01]我爱你 baby\n[00:03]原创纸灯'}})};
  };
  const store=seedStore(),out=await invoke(client,{format,store,env:{TARGET_LANGUAGE:target},network});verify(out,format,words);assert.equal(out.calls.length,3);assert.ok(out.bytes.includes(Buffer.from('我愛你 宝贝')));
  const b=await invoke(client,{format,store,env:{TARGET_LANGUAGE:target},network:async()=>{throw Error('warm source hit');}});verify(b,format,words);assert.equal(b.calls.length,0);assert.deepEqual(b.bytes,out.bytes);
 });
}
