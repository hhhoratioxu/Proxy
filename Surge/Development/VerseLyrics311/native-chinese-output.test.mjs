import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,seedStore,id,colors,sourceFixture} from './feature-host.mjs';
import {parseDocument,encodeDocument,existingPalette} from './core/spotify-lyrics.js';
const clients=['Loon','Surge','Shadowrocket','QuantumultX','Egern'],KEY='VerseLyrics.v1.cache';
const originals=['Hey，原創紙燈','WJK 妳穿著白衣','WJK 這裡 紙\u200b燈'],converted=['Hey, 原创纸灯','WJK 你穿着白衣','WJK 这里 纸灯'];
function official(format,words,language='zh'){
 return encodeDocument({lyrics:{syncType:'LINE_SYNCED',language,provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[{language:'zh-CN',lines:words.map((_,i)=>'OFFICIAL_'+i)}]},colors},format);
}
function seedPairs(store,target,words,values){const data=JSON.parse(store.get(KEY));data.entries.push({key:'translations:v1:'+target+':'+id,value:{pairs:words.map((s,i)=>[s,values[i]])},expires:Date.now()+600000});store.set(KEY,JSON.stringify(data));}
function verify(out,format,words){const doc=parseDocument(out.bytes,format==='json'?'application/json':'application/x-protobuf');assert.deepEqual(doc.words,words);assert.deepEqual(existingPalette(out.bytes,doc),colors);assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);assert.equal(out.bytes.includes(Buffer.from('OFFICIAL_')),false);const raw=out.store.get(KEY);if(raw){assert.ok(raw.length<=64000);assert.ok(JSON.parse(raw).entries.length<=128);}return doc;}
for(const client of clients)for(const format of ['json','protobuf'])for(const target of ['zh-CN','zh-TW']){
 const name=client+' '+format+' '+target;
 test(name+': Chinese with Latin names/ad-libs is unchanged and only the independent English row translates',async()=>{
  const words=[...originals,'The sea is quiet.'],store=seedStore();seedPairs(store,target,originals,converted);
  const out=await invoke(client,{format,store,status:200,responseBody:official(format,words),env:{TARGET_LANGUAGE:target},network:async u=>{assert.deepEqual(new URL(u).searchParams.getAll('q'),[words.at(-1)]);return {body:JSON.stringify([['自写外语译文','en']])};}});
  verify(out,format,words);assert.equal(out.calls.length,1);assert.ok(out.bytes.includes(Buffer.from('自写外语译文')));assert.equal(out.bytes.includes(Buffer.from('Hey, 原创纸灯')),false);
 });
 test(name+': final output gate handles stale Japanese metadata from both cache and live conversion',async()=>{
  for(const cached of [true,false]){
   const words=[...originals,'The sea is quiet.'],values=[...converted,'自写外语译文'],store=seedStore();if(cached)seedPairs(store,target,words,values);
   const out=await invoke(client,{format,store,status:200,responseBody:official(format,words,'ja'),env:{TARGET_LANGUAGE:target},network:async u=>({body:JSON.stringify(new URL(u).searchParams.getAll('q').map(s=>[values[words.indexOf(s)],'en']))})});
   verify(out,format,words);assert.equal(out.calls.length,cached?0:1);assert.ok(out.bytes.includes(Buffer.from('自写外语译文')));assert.equal(out.bytes.includes(Buffer.from('Hey, 原创纸灯')),false);assert.equal(out.bytes.includes(Buffer.from('WJK 你穿着白衣')),false);assert.equal(out.bytes.includes(Buffer.from('WJK 这里 纸灯')),false);
  }
 });
 test(name+': service Chinese detection corrects mislabelled original and warm reopen uses zero HTTP',async()=>{
  const words=['WJK 软件正在更新'],body=official(format,words,'ja'),store=seedStore();
  const a=await invoke(client,{format,store,status:200,responseBody:body,env:{TARGET_LANGUAGE:target},network:async()=>({body:JSON.stringify([['WJK 軟體正在更新','zh-CN']])})});assert.equal(verify(a,format,words).hasAlternatives,false);assert.equal(a.calls.length,1);
  const b=await invoke(client,{format,store,status:200,responseBody:body,env:{TARGET_LANGUAGE:target},network:async()=>{throw Error('identity cache must suppress repeated calls');}});assert.equal(verify(b,format,words).hasAlternatives,false);assert.equal(b.calls.length,0);assert.deepEqual(b.bytes,a.bytes);
 });
 test(name+': mixed Chinese source lyrics never reuse source cross-conversions or call translation',async()=>{
  const network=async u=>{
   if(u.includes('/cloudsearch/'))return {body:JSON.stringify(sourceFixture('netease',u))};assert.ok(!u.includes('translate.googleapis'));
   return {body:JSON.stringify({code:200,lrc:{lyric:'[00:01]Hey，原創紙燈\n[00:03]WJK 妳穿著白衣'},tlyric:{lyric:'[00:01]Hey, 原创纸灯\n[00:03]WJK 你穿着白衣'}})};
  };
  const out=await invoke(client,{format,env:{TARGET_LANGUAGE:target},network});assert.equal(verify(out,format,originals.slice(0,2)).hasAlternatives,false);assert.equal(out.calls.length,2);
 });
}
