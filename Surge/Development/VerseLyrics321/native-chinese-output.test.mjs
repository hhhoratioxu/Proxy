import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,seedStore,id,colors,sourceFixture} from './feature-host.mjs';
import {parseDocument,encodeDocument,existingPalette} from './core/spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache',words=['原創紙燈','我愛你 baby','WJK 妳穿著白衣','I miss you'];
const official=(format,language)=>encodeDocument({lyrics:{syncType:'LINE_SYNCED',language,provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[{language:'zh-CN',lines:words.map(()=> 'OLD_OFFICIAL')}]},colors},format);
function check(out,format){const doc=parseDocument(out.bytes,format==='json'?'application/json':'application/x-protobuf');assert.deepEqual(doc.words,words);assert.equal(doc.hasAlternatives,false);assert.deepEqual(existingPalette(out.bytes,doc),colors);assert.ok(!out.bytes.includes(Buffer.from('OLD_OFFICIAL')));assert.ok(!out.bytes.includes(Buffer.from('STALE_TRANSLATION')));assert.equal(out.done,1);assert.equal(out.active,0);assert.ok((out.store.get(KEY)||'').length<=64000);}
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const format of ['json','protobuf'])for(const target of ['zh-CN','zh-TW']){
 for(const cache of ['none','identity','conversion','source','checked','legacy','cache-only'])test(`${client} ${format} ${target}: Chinese-song English stays literal with ${cache} cache`,async()=>{
  const store=seedStore(),d=JSON.parse(store.get(KEY));
  if(cache!=='none')d.entries.push({key:cache==='legacy'?'translation:'+target+':'+words[1]:'translations:v1:'+target+':'+id,value:cache==='legacy'?'STALE_TRANSLATION':{pairs:words.map(s=>[s,cache==='identity'?s:cache==='conversion'?'原创纸灯':'STALE_TRANSLATION',...(['source','checked'].includes(cache)?[cache]:[])])},expires:Date.now()+600000});
  store.set(KEY,JSON.stringify(d));const before=store.get(KEY);
  for(const language of ['zh','zh-Hant','cmn','yue','ja','ko','','en']){
   const out=await invoke(client,{format,store,status:200,responseBody:official(format,language),env:{TARGET_LANGUAGE:target,...(cache==='cache-only'?{NETWORK_MODE:'cache-only'}:{})},network:()=>{throw Error('Non-English song must not invoke translator');}});
   check(out,format);assert.equal(out.calls.length,0);assert.equal(store.get(KEY),before,'policy must gate before cache migration');
  }
 });
 test(`${client} ${format} ${target}: Chinese fallback retains synced words and ignores source translations`,async()=>{
  const lyric=words.map((s,i)=>'[00:0'+(i*2+1)+']'+s).join('\n'),trans=words.map((s,i)=>'[00:0'+(i*2+1)+']错误来源译文').join('\n'),store=seedStore();
  const out=await invoke(client,{format,store,env:{TARGET_LANGUAGE:target},network:async u=>{
   assert.ok(!u.includes('translate.googleapis'));return {body:JSON.stringify(u.includes('/cloudsearch/')?sourceFixture('netease',u):{code:200,lrc:{lyric},tlyric:{lyric:trans}})};
  }});check(out,format);assert.equal(out.calls.length,2);assert.equal(parseDocument(out.bytes,format==='json'?'application/json':'application/x-protobuf').unsynced,false);
  const warm=await invoke(client,{format,store,env:{TARGET_LANGUAGE:target},network:()=>{throw Error('Cached fallback');}});check(warm,format);assert.equal(warm.calls.length,0);assert.deepEqual(warm.bytes,out.bytes);
 });
}
