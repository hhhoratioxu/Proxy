import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import {invoke,sourceFixture,seedStore,id,meta,colors} from './feature-host.mjs';
import {parseDocument,encodeDocument} from './core/spotify-lyrics.js';
const clients=['Loon','Surge','Shadowrocket','QuantumultX','Egern'],KEY='VerseLyrics.v1.cache';
for(const client of clients)for(const format of ['json','protobuf']){
 test(client+' '+format+': cache-only retains warm fallback, translations and native colors with zero HTTP',async()=>{
  const store=seedStore(),network=async u=>({body:JSON.stringify(sourceFixture('netease',u,{lines:48}))});
  const warm=await invoke(client,{format,store,network});
  const offline=await invoke(client,{format,store,env:{NETWORK_MODE:'cache-only'},network:async()=>{throw Error('No network allowed');}});
  assert.deepEqual(offline.bytes,warm.bytes);assert.equal(offline.calls.length,0);assert.equal(offline.done,1);assert.equal(offline.active,0);assert.equal(offline.timers.length,0);
 });
 test(client+' '+format+': cache-only cold misses never fetch metadata, sources, colors or translation',async()=>{
  const store=new Map(),out=await invoke(client,{format,store,env:{NETWORK_MODE:'cache-only'},network:async()=>{throw Error('No network allowed');}});
  assert.equal(out.bytes.toString(),'missing');assert.equal(out.calls.length,0);assert.equal(store.has('VerseLyrics.v1.network'),false);assert.equal(out.timers.length,0);
 });
 test(client+' '+format+': official cache-only response uses cached plugin rows and removes official alternatives',async()=>{
  const words=['Original lantern 0.','Original lantern 1.'],pairs=[[words[0],'第一句自写译文']];
  const store=new Map([[KEY,JSON.stringify({entries:[{key:'translations:v1:zh-CN:'+id,value:{pairs},expires:Date.now()+60000}],cooldowns:{}})]]);
  const body=encodeDocument({lyrics:{syncType:'LINE_SYNCED',provider:'Original',providerDisplayName:'Original',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2100+1000)})),alternatives:[{language:'zh-CN',lines:['OFFICIAL_FIRST','OFFICIAL_SECOND']}]},colors},format);
  const out=await invoke(client,{format,store,status:200,responseBody:body,env:{NETWORK_MODE:'cache-only'},network:async()=>{throw Error('No network allowed');}});
  assert.deepEqual(parseDocument(out.bytes,format==='json'?'application/json':'application/x-protobuf').words,words);
  assert.ok(out.bytes.includes(Buffer.from('第一句自写译文')));assert.equal(out.bytes.includes(Buffer.from('OFFICIAL_')),false);assert.equal(out.calls.length,0);assert.equal(store.has('VerseLyrics.v1.network'),false);
 });
 test(client+' '+format+': cache-only does not store a false palette failure and can resume online translation',async()=>{
  const store=seedStore(),warm=await invoke(client,{format,store,env:{TRANSLATION_ENABLED:false},network:async u=>({body:JSON.stringify(sourceFixture('netease',u,{lines:24}))})});
  const data=JSON.parse(store.get(KEY));data.entries=data.entries.filter(e=>!e.key.startsWith('palette:'));store.set(KEY,JSON.stringify(data));
  const offline=await invoke(client,{format,store,env:{NETWORK_MODE:'cache-only'},network:async()=>{throw Error('No network allowed');}});
  assert.equal(offline.calls.length,0);assert.ok(!JSON.parse(store.get(KEY)).entries.some(e=>e.key.startsWith('palette:')));
  const online=await invoke(client,{format,store,env:{NETWORK_MODE:'unknown',FETCH_ARTWORK_COLOR:false},network:async u=>({body:JSON.stringify(sourceFixture('netease',u,{lines:24}))})});
  assert.ok(online.calls.some(u=>u.includes('translate.googleapis')));assert.ok(online.bytes.includes(Buffer.from('句译文')));
 });
}
test('five import files expose the opt-in native network setting',()=>{
 for(const [client,ext]of [['Loon','lpx'],['Egern','yaml'],['Surge','sgmodule'],['Shadowrocket','sgmodule'],['QuantumultX','conf']]){
  const cfg=readFileSync(new URL('./publish/'+client+'/script/SpotifyLyrics.'+ext,import.meta.url),'utf8');assert.match(cfg,/NETWORK_MODE/);
  if(client==='Loon'){assert.match(cfg,/NETWORK_MODE = select,"online","cache-only",type=string/);assert.equal((cfg.match(/\$\{NETWORK_MODE\}/g)||[]).length,2);}
  else if(client==='Egern'){assert.match(cfg,/default_value: "online"/);assert.equal((cfg.match(/NETWORK_MODE: "online"/g)||[]).length,3);}
  else assert.equal((cfg.match(/NETWORK_MODE=online/g)||[]).length,3);
 }
});
for(const array of [false,true])test('native headers copy only on mutation and preserve input '+array,()=>{
 const code=readFileSync(new URL('./native-adapter.js',import.meta.url),'utf8').split('function nativeBytes(')[0].replace('__CLIENT__','Loon')+'\nthis.Headers=NativeHeaders;',ctx={};vm.runInNewContext(code,ctx);
 const object=Object.assign(Object.create({'Inherited':'ignore'}),{'X-Test':'one','Set-Cookie':['a','b']});
 const input=array?[{field:'X-Test',value:'one'},{field:'Set-Cookie',value:'a'},{field:'Set-Cookie',value:'b'}]:object;
 const h=new ctx.Headers(input);assert.equal(h.get('x-TEST'),'one');assert.equal(h.get('Inherited'),null);assert.equal(h.pairs,null);assert.equal(h.native(),input);
 h.set('X-New','two');h.delete('x-test');assert.notEqual(h.native(),input);assert.equal(h.get('x-test'),null);assert.equal(h.get('X-New'),'two');
 assert.equal(array?input[0].value:input['X-Test'],'one');if(array)assert.equal(h.native().filter(x=>x.field==='Set-Cookie').length,2);else assert.deepEqual([...h.native()['Set-Cookie']],['a','b']);
});
test('production no longer ships the legacy manual widget or unused Loon request runtime',()=>{
 assert.equal(existsSync(new URL('./runtime/Loon/script/SpotifyLyrics.Request.js',import.meta.url)),false);
 for(const client of clients){
  const path=client==='Egern'?'Egern/script/SpotifyLyrics/spotify-lyrics-entry.js':client+'/script/SpotifyLyrics.Entry.js';
  const code=readFileSync(new URL('./runtime/'+path,import.meta.url),'utf8');
  assert.doesNotMatch(code,/VerseLyrics\.v1\.events|VerseLyrics\.v1\.status|type:"widget"|source-miss:|translate\.googleapis/);
 }
});

