import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,sourceFixture,seedStore,id,colors} from './feature-host.mjs';
import {encodeDocument,parseDocument,existingPalette} from './core/spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache';
const official=(format,words,language)=>encodeDocument({lyrics:{syncType:'LINE_SYNCED',language,provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,i)=>({words,startTimeMs:String(i*2100)})),alternatives:[{language:'zh-CN',lines:words.map(()=> 'OLD_OFFICIAL')} ]},colors},format);
function check(out){assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);assert.ok(!out.bytes.includes(Buffer.from('OLD_OFFICIAL')));const raw=out.store.get(KEY);assert.ok(!raw||raw.length<=64000);assert.ok(!raw||JSON.parse(raw).entries.length<=128);}
for(const client of ['Loon','Egern','Surge','Shadowrocket','QuantumultX'])for(const format of ['json','protobuf']){
 const title=client+' '+format,type=format==='json'?'application/json':'application/x-protobuf';
 test(title+': joined/invisible English vocal rows discard official and cached translations with zero HTTP',async()=>{
  const words=['ohohoh','hahaha','woooow','oh\u200b','o\u200bh','中文 lalala'],store=seedStore(),saved=JSON.parse(store.get(KEY));saved.entries.push({key:'translations:v1:zh-CN:'+id,value:{pairs:words.map(s=>[s,'BAD_OLD_FILLER'])},expires:Date.now()+60000});store.set(KEY,JSON.stringify(saved));
  const out=await invoke(client,{format,store,status:200,responseBody:official(format,words,'en'),network:()=>{throw Error('No filler HTTP');}}),doc=parseDocument(out.bytes,type);assert.deepEqual(doc.words,words);assert.equal(doc.hasAlternatives,false);assert.equal(out.calls.length,0);assert.ok(!out.bytes.includes(Buffer.from('BAD_OLD_FILLER')));check(out);
 });
 for(const [source,words,answers,expectedSL] of [
  ['fr',['na','la','oh','hello'],['在','这里','哦','你好'],'fr'],
  ['ko-KR',['나','아','오','기억'],['我','啊','哦','记忆'],'ko'],
  ['jpn',['ラララ','手紙','na','oh'],['啦啦啦','信件','短词译文','哦'],'ja']
 ])test(title+': '+source+' short/vocal/meaningful words translate and then reopen from cache',async()=>{
  const body=official(format,words,source),store=seedStore(),cold=await invoke(client,{format,store,status:200,responseBody:body,network:async u=>{const url=new URL(u);assert.equal(url.searchParams.get('sl'),expectedSL);assert.deepEqual(url.searchParams.getAll('q'),words);return{body:JSON.stringify(answers)};}});assert.equal(cold.calls.length,1);assert.deepEqual(parseDocument(cold.bytes,type).words,words);assert.deepEqual(existingPalette(cold.bytes,parseDocument(cold.bytes,type)),colors);for(const answer of answers)assert.ok(cold.bytes.includes(Buffer.from(answer)));check(cold);
  const warm=await invoke(client,{format,store,status:200,responseBody:body,network:()=>{throw Error('Warm cache');}});assert.equal(warm.calls.length,0);assert.deepEqual(warm.bytes,cold.bytes);check(warm);
 });
 test(title+': Chinese mixed English keeps literal joined/invisible fillers and translates useful spans',async()=>{
  const words=['我说 ohohoh','我说 o\u200bh','我说 lalala，在等 I miss you'],store=seedStore(),body=official(format,words,'zh-Hant');
  const out=await invoke(client,{format,store,status:200,responseBody:body,network:async u=>{const url=new URL(u);assert.equal(url.searchParams.get('sl'),'auto');assert.deepEqual(url.searchParams.getAll('q'),['I miss you']);return{body:JSON.stringify(['我想你'])};}}),doc=parseDocument(out.bytes,type);assert.deepEqual(doc.words,words);assert.ok(out.bytes.includes(Buffer.from('我说 lalala，在等 我想你')));assert.equal(out.calls.length,1);check(out);
 });
 test(title+': unknown-language fallback keeps vocal suppression plus meaningful English/Korean source translations',async()=>{
  const words=['ohohoh','hahaha','whooo','I miss you','한국어'],lyric=words.map((s,i)=>'[00:'+String(i*2+1).padStart(2,'0')+']'+s).join('\n'),answers=['BAD_SOURCE_FILLER','BAD_SOURCE_FILLER','BAD_SOURCE_FILLER','我想你','韩语'],trans=answers.map((s,i)=>'[00:'+String(i*2+1).padStart(2,'0')+']'+s).join('\n');
  const out=await invoke(client,{format,network:async u=>{assert.ok(!u.includes('translate.googleapis'));return{body:JSON.stringify(u.includes('/cloudsearch/')?sourceFixture('netease',u):{code:200,lrc:{lyric},tlyric:{lyric:trans}})};}});assert.deepEqual(parseDocument(out.bytes,type).words,words);assert.equal(out.calls.length,2);assert.ok(!out.bytes.includes(Buffer.from('BAD_SOURCE_FILLER')));assert.ok(out.bytes.includes(Buffer.from('我想你')));assert.ok(out.bytes.includes(Buffer.from('韩语')));check(out);
 });
 test(title+': an English label cannot restore a warm foreign vocal translation',async()=>{
  const store=seedStore(),words=['la','na'],body=official(format,words,'fr');
  await invoke(client,{format,store,status:200,responseBody:body,network:async()=>({body:JSON.stringify(['这里','在'])})});
  const en=await invoke(client,{format,store,status:200,responseBody:official(format,words,'en'),network:()=>{throw Error('English fillers');}});assert.equal(parseDocument(en.bytes,type).hasAlternatives,false);assert.equal(en.calls.length,0);check(en);
  const fr=await invoke(client,{format,store,status:200,responseBody:body,network:()=>{throw Error('Reuse foreign cache');}});assert.ok(fr.bytes.includes(Buffer.from('这里')));assert.ok(fr.bytes.includes(Buffer.from('在')));assert.equal(fr.calls.length,0);check(fr);
 });
 for(const useSource of [false,true])test(title+': static-source replacement retains the official foreign language for '+(useSource?'source':'network')+' translations',async()=>{
  const words=['la','na'],body=encodeDocument({lyrics:{syncType:'UNSYNCED',language:'fr',provider:'Spotify',providerDisplayName:'Spotify',lines:words.map(words=>({words,startTimeMs:'0'})),alternatives:[]},colors},format),store=seedStore();
  const out=await invoke(client,{format,store,status:200,responseBody:body,env:{SOURCE_TRANSLATIONS:useSource},network:async u=>{
   if(u.includes('/cloudsearch/'))return{body:JSON.stringify(sourceFixture('netease',u))};
   if(u.includes('/api/song/lyric'))return{body:JSON.stringify({code:200,lrc:{lyric:'[00:01]la\n[00:03]na'},tlyric:{lyric:'[00:01]那里\n[00:03]在'}})};
   const url=new URL(u);assert.equal(url.host,'translate.googleapis.com');assert.equal(url.searchParams.get('sl'),'fr');assert.deepEqual(url.searchParams.getAll('q'),words);return{body:JSON.stringify(['那里','在'])};
  }});assert.equal(parseDocument(out.bytes,type).unsynced,false);assert.deepEqual(parseDocument(out.bytes,type).words,words);assert.ok(out.bytes.includes(Buffer.from('那里')));assert.ok(out.bytes.includes(Buffer.from('在')));assert.equal(out.calls.length,useSource?2:3);check(out);
  const warm=await invoke(client,{format,store,status:200,responseBody:body,env:{SOURCE_TRANSLATIONS:useSource},network:()=>{throw Error('Warm source/translation cache');}});assert.deepEqual(warm.bytes,out.bytes);assert.equal(warm.calls.length,0);check(warm);
 });
}
