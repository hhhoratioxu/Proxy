import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,seedStore,id,colors} from './feature-host.mjs';
import {encodeDocument,parseDocument} from './core/spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache';
function body(format,language,words){return encodeDocument({lyrics:{syncType:'LINE_SYNCED',language,provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,i)=>({words,startTimeMs:String(i*2100+1000)})),alternatives:[{language:'zh-CN',lines:words.map(()=> 'OLD_OFFICIAL')}]},colors},format);}
for(const client of ['Loon','Egern','Surge','Shadowrocket','QuantumultX'])for(const format of ['json','protobuf']){
 const type=format==='json'?'application/json':'application/x-protobuf';
 for(const language of ['fr','ko-KR','jpn','es','de','zh'])test(`${client} ${format}: ${language} songs do not translate an English chorus or old cached translations`,async()=>{
  const words=['I miss you','hello','oh'],store=seedStore(),d=JSON.parse(store.get(KEY));d.entries.push({key:'translations:v1:zh-CN:'+id,value:{pairs:words.map(s=>[s,'STALE_TRANSLATION'])},expires:Date.now()+60000});store.set(KEY,JSON.stringify(d));
  const out=await invoke(client,{format,store,status:200,responseBody:body(format,language,words),network:()=>{throw Error('No non-English translation');}});const doc=parseDocument(out.bytes,type);assert.deepEqual(doc.words,words);assert.equal(doc.hasAlternatives,false);assert.equal(out.calls.length,0);assert.ok(!out.bytes.includes(Buffer.from('STALE_TRANSLATION')));assert.ok(!out.bytes.includes(Buffer.from('OLD_OFFICIAL')));
 });
 test(`${client} ${format}: English song still translates useful lines while filtering fillers`,async()=>{
  const words=['ohohoh','hahaha','woooow','o\u200bh','I miss you','The night is quiet'],answers=['','','','','我想你','夜晚安静'],store=seedStore();
  const out=await invoke(client,{format,store,status:200,responseBody:body(format,'en-US',words),network:async u=>{assert.deepEqual(new URL(u).searchParams.getAll('q'),words.slice(4));return{body:JSON.stringify(answers.slice(4))};}});
  assert.equal(out.calls.length,1);assert.deepEqual(parseDocument(out.bytes,type).words,words);assert.ok(out.bytes.includes(Buffer.from('我想你')));assert.ok(out.bytes.includes(Buffer.from('夜晚安静')));
  const warm=await invoke(client,{format,store,status:200,responseBody:body(format,'en-US',words),network:()=>{throw Error('English cache');}});assert.equal(warm.calls.length,0);assert.deepEqual(warm.bytes,out.bytes);
 });
 test(`${client} ${format}: untagged ambiguous Latin words remain original`,async()=>{
  const words=['bonjour','amour','corazón','na'],out=await invoke(client,{format,status:200,responseBody:body(format,'',words),network:()=>{throw Error('Ambiguous language');}});assert.equal(out.calls.length,0);assert.equal(parseDocument(out.bytes,type).hasAlternatives,false);
 });
}
