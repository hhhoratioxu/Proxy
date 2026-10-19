import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,sourceFixture,seedStore,id,colors} from './feature-host.mjs';
import {parseDocument,encodeDocument,existingPalette} from './core/spotify-lyrics.js';
const clients=['Loon','Surge','Shadowrocket','QuantumultX','Egern'],KEY='VerseLyrics.v1.cache';
function official(format,{sync='UNSYNCED',words=['Original lantern 0.','Original lantern 1.'],language='en',alternatives=true}={}) {
 return encodeDocument({lyrics:{syncType:sync,language,provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,i)=>({words,startTimeMs:sync==='UNSYNCED'?'0':String(i*2000+1000)})),alternatives:alternatives?[{language:'zh-CN',lines:words.map((_,i)=>'OFFICIAL_'+i)}]:[]},colors},format);
}
function add(store,key,value,expires=Date.now()+60000){const data=JSON.parse(store.get(KEY)||'{"entries":[],"cooldowns":{}}');data.entries.push({key,value,expires});store.set(KEY,JSON.stringify(data));}
const timed=u=>({body:JSON.stringify(sourceFixture('netease',u,{lines:8}))});
const translator=u=>({body:JSON.stringify(new URL(u).searchParams.getAll('q').map((_,i)=>'PLUGIN_'+i))});
function check(out){assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);const raw=out.store.get(KEY);if(raw){assert.ok(raw.length<=64000);assert.ok(JSON.parse(raw).entries.length<=128);}}
for(const client of clients)for(const format of ['json','protobuf']) {
 const type=format==='json'?'application/json':'application/x-protobuf',title=client+' '+format;
 for(const target of ['zh-CN','zh-TW'])test(title+': preserve both Chinese variants, suppress official and cached cross-conversions to '+target,async()=>{
  const words=['头发随风飘动','頭髮隨風飄動','纸燈 2026！'],store=seedStore();
  add(store,'translations:v1:'+target+':'+id,{pairs:words.map(s=>[s,'CACHED_CONVERSION'])});
  add(store,'translation:'+target+':'+words[0],'LEGACY_CONVERSION');
  const out=await invoke(client,{format,store,status:200,responseBody:official(format,{sync:'LINE_SYNCED',words,language:'zh-Hant'}),env:{TARGET_LANGUAGE:target},network:async()=>{throw Error('Chinese must not be translated');}});
  const doc=parseDocument(out.bytes,type);assert.deepEqual(doc.words,words);assert.equal(doc.hasAlternatives,false);assert.equal(out.calls.length,0);assert.equal(out.bytes.includes(Buffer.from('CONVERSION')),false);assert.equal(out.bytes.includes(Buffer.from('OFFICIAL_')),false);assert.deepEqual(existingPalette(out.bytes,doc),colors);check(out);
 });
 test(title+': official static text upgrades to verified real timestamps and keeps translations/colors',async()=>{
  const store=seedStore(),body=official(format),out=await invoke(client,{format,store,status:200,responseBody:body,network:timed});
  const doc=parseDocument(out.bytes,type);assert.equal(doc.unsynced,false);assert.equal(doc.words.length,8);assert.equal(out.calls.length,2);assert.equal(out.bytes.includes(Buffer.from('OFFICIAL_')),false);assert.ok(out.bytes.includes(Buffer.from('第0句译文')));assert.deepEqual(existingPalette(out.bytes,doc),colors);check(out);
  const warm=await invoke(client,{format,store,status:200,responseBody:body,network:async()=>{throw Error('Warm upgrade must be cached');}});assert.equal(warm.calls.length,0);assert.deepEqual(warm.bytes,out.bytes);check(warm);
 });
 test(title+': static upgrade ignores fast plain cache and normal legacy plain cache',async()=>{
  for(const legacy of [false,true]){
   const store=seedStore(),plain={v:1,p:'netease',t:false,l:[[0,'Cached plain text without timestamps.']]};
   add(store,'lyrics:netease:'+id,legacy?{lyrics:{syncType:'UNSYNCED',provider:'netease',lines:[{startTimeMs:'0',words:plain.l[0][1],endTimeMs:'0'}]}}:plain);
   add(store,'lyrics-fast:netease:'+id,plain);
   const out=await invoke(client,{format,store,status:200,responseBody:official(format),env:{FALLBACK_MODE:'fast'},network:timed});
   assert.equal(parseDocument(out.bytes,type).unsynced,false);assert.equal(out.calls.length,2);assert.ok(!out.bytes.includes(Buffer.from('Cached plain')));check(out);
  }
 });
 test(title+': static source failure preserves official words and still applies plugin translation',async()=>{
  const body=official(format),out=await invoke(client,{format,status:200,responseBody:body,network:async u=>u.includes('translate.googleapis')?translator(u):{status:503,body:'unavailable'}});
  const doc=parseDocument(out.bytes,type);assert.equal(doc.unsynced,true);assert.deepEqual(doc.words,['Original lantern 0.','Original lantern 1.']);assert.ok(out.bytes.includes(Buffer.from('PLUGIN_0')));assert.equal(out.bytes.includes(Buffer.from('OFFICIAL_')),false);assert.equal(out.calls.length,2);
  assert.ok(!JSON.parse(out.store.get(KEY)).entries.some(e=>e.key.startsWith('synced-miss:')));check(out);
 });
 test(title+': plain-only source keeps official text and briefly reuses completed no-timeline search',async()=>{
  const store=seedStore(),body=official(format);let searches=0;
  const network=async u=>{if(u.includes('translate.googleapis'))return translator(u);if(u.includes('/cloudsearch/')){searches++;return timed(u);}return {body:JSON.stringify({code:200,lrc:{lyric:'[00:00]Other plain text one.\n[00:00]Other plain text two.'}})};};
  const a=await invoke(client,{format,store,status:200,responseBody:body,network});assert.equal(parseDocument(a.bytes,type).unsynced,true);assert.deepEqual(parseDocument(a.bytes,type).words,['Original lantern 0.','Original lantern 1.']);assert.equal(searches,1);check(a);
  const saved=JSON.parse(store.get(KEY));assert.ok(saved.entries.some(e=>e.key==='synced-miss:v1:netease:'+id));assert.ok(!saved.entries.some(e=>e.key==='lyrics:netease:'+id));
  const b=await invoke(client,{format,store,status:200,responseBody:body,network});assert.equal(b.calls.length,0);assert.deepEqual(b.bytes,a.bytes);check(b);
  saved.entries=saved.entries.filter(e=>!e.key.startsWith('synced-miss:'));store.set(KEY,JSON.stringify(saved));
  const c=await invoke(client,{format,store,status:200,responseBody:body,network:timed});assert.equal(parseDocument(c.bytes,type).unsynced,false);assert.equal(c.calls.length,2);check(c);
 });
 test(title+': cache-only upgrades only existing timed records, retaining static text on a miss',async()=>{
  const body=official(format,{words:['原創紙燈','纸灯照海面'],language:'zh'}),empty=seedStore();
  const a=await invoke(client,{format,store:empty,status:200,responseBody:body,env:{NETWORK_MODE:'cache-only'},network:async()=>{throw Error('No HTTP');}});
  assert.equal(parseDocument(a.bytes,type).unsynced,true);assert.equal(parseDocument(a.bytes,type).hasAlternatives,false);assert.equal(a.calls.length,0);assert.equal(empty.has('VerseLyrics.v1.network'),false);check(a);
  add(empty,'lyrics:netease:'+id,{v:1,p:'netease',t:true,l:[[1000,'原創紙燈'],[3000,'纸灯照海面']]});
  const b=await invoke(client,{format,store:empty,status:200,responseBody:body,env:{NETWORK_MODE:'cache-only'},network:async()=>{throw Error('No HTTP');}});assert.equal(parseDocument(b.bytes,type).unsynced,false);assert.equal(b.calls.length,0);assert.equal(empty.has('VerseLyrics.v1.network'),false);check(b);
 });
 test(title+': synchronized official lyrics never query fallback sources',async()=>{
  const body=official(format,{sync:'LINE_SYNCED'}),out=await invoke(client,{format,status:200,responseBody:body,network:async u=>{assert.ok(u.includes('translate.googleapis'));return translator(u);}});
  assert.equal(out.calls.length,1);assert.deepEqual(parseDocument(out.bytes,type).words,['Original lantern 0.','Original lantern 1.']);assert.equal(parseDocument(out.bytes,type).unsynced,false);check(out);
 });
 test(title+': untimed-only provider cannot improve static official lyrics and incurs no source requests',async()=>{
  const out=await invoke(client,{format,provider:'lyricsovh',status:200,responseBody:official(format),network:async u=>{assert.ok(u.includes('translate.googleapis'));return translator(u);}});assert.equal(out.calls.length,1);assert.equal(parseDocument(out.bytes,type).unsynced,true);check(out);
 });
 test(title+': Chinese fallback source translations are discarded without any Google request',async()=>{
  for(const provider of ['qq','netease']){
   const network=async u=>{
    if(u.includes('/soso/')||u.includes('/cloudsearch/'))return {body:JSON.stringify(sourceFixture(provider,u))};
    assert.ok(!u.includes('translate.googleapis'));
    const lyric='[00:01]头发随风飘动\n[00:03]頭髮隨風飄動',conversion='[00:01]頭髮隨風飄動\n[00:03]头发随风飘动';
    return {body:JSON.stringify(provider==='qq'?{code:0,lyric,trans:conversion}:{code:200,lrc:{lyric},tlyric:{lyric:conversion}})};
   };
   const out=await invoke(client,{format,provider,network}),doc=parseDocument(out.bytes,type);assert.deepEqual(doc.words,['头发随风飘动','頭髮隨風飄動']);assert.equal(doc.hasAlternatives,false);assert.equal(out.calls.length,2);assert.ok(!JSON.parse(out.store.get(KEY)).entries.some(e=>e.key.startsWith('translations:')));check(out);
  }
 });
}
