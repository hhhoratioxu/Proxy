import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {invoke,sourceFixture,seedStore,colors} from './feature-host.mjs';
import {parseDocument,existingPalette} from './core/spotify-lyrics.js';
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const provider of ['qq','netease'])for(const format of ['json','protobuf'])test(`${client} ${provider} ${format}: same-response source translation, cached reuse and disable switch`,async()=>{
 const store=seedStore(),network=u=>({body:JSON.stringify(sourceFixture(provider,u,{lines:48}))}),a=await invoke(client,{provider,format,store,network});
 assert.equal(a.calls.length,2);assert.equal(a.maxActive,1);assert.equal(a.active,0);assert.equal(a.done,1);
 assert.ok(a.calls.every(u=>!u.includes('translate.googleapis')));assert.equal(a.timers.length,client==='QuantumultX'?1:0);
 const type=format==='json'?'application/json':'application/x-protobuf',doc=parseDocument(a.bytes,type);assert.equal(doc.words.length,48);assert.deepEqual(existingPalette(a.bytes,doc),colors);
 for(let i=0;i<48;i++)assert.ok(a.bytes.includes(Buffer.from('第'+i+'句译文')));
 const warm=await invoke(client,{provider,format,store,network});assert.equal(warm.calls.length,0);assert.deepEqual(warm.bytes,a.bytes);
 const disabled=await invoke(client,{provider,format,store,network,env:{SOURCE_TRANSLATIONS:false}});assert.equal(disabled.calls.length,1);assert.ok(disabled.calls[0].includes('translate.googleapis'));assert.deepEqual(disabled.bytes,a.bytes);
 assert.ok(store.get('VerseLyrics.v1.cache').length<=64000);assert.ok(JSON.parse(store.get('VerseLyrics.v1.cache')).entries.length<=128);
});
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])test(client+': partial source translations send only uncovered originals and keep exact output',async()=>{
 const network=u=>({body:JSON.stringify(sourceFixture('netease',u,{lines:48,partial:true}))}),a=await invoke(client,{network});
 assert.equal(a.calls.length,3);assert.deepEqual(new URL(a.calls[2]).searchParams.getAll('q'),Array.from({length:24},(_,i)=>'Original paper lantern '+(i*2+1)+'.'));
 for(let i=0;i<48;i++)assert.ok(a.bytes.includes(Buffer.from('第'+i+'句译文')));
 assert.equal(a.active,0);assert.equal(a.done,1);
});
test('five native install entries expose and forward the new translation source preference',()=>{
 for(const [client,ext] of Object.entries({Loon:'plugin',Surge:'sgmodule',Shadowrocket:'sgmodule',QuantumultX:'conf'})){
  const text=readFileSync(new URL('./publish/'+client+'/script/SpotifyLyrics.'+ext,import.meta.url),'utf8');
  if(client==='Loon'){assert.match(text,/SOURCE_TRANSLATIONS = switch,true,type=boolean/);assert.equal((text.match(/\$\{SOURCE_TRANSLATIONS\}/g)||[]).length,2);}
  else assert.equal((text.match(/SOURCE_TRANSLATIONS=true/g)||[]).length,3);
 }
 const text=readFileSync(new URL('./publish/Egern/script/SpotifyLyrics.yaml',import.meta.url),'utf8');assert.equal((text.match(/SOURCE_TRANSLATIONS:/g)||[]).length,4);
});
