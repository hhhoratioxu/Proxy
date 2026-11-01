import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import egern from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics-entry.js';import {base62Hex,join,dataField,stringField,numberField} from './core/spotify-lyrics.js';
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])test(client+': compact entry metadata cache stays within both limits',async()=>{
 const qx=client==='QuantumultX',store=new Map(),type='application/x-protobuf';let writes=0;
 const save=(k,v)=>{store.set(k,v);writes++};
 for(let i=1;i<=40;i++){
  const id=String(i).padStart(22,'0'),hex=base62Hex(id),body=join([dataField(1,Buffer.from(hex,'hex')),stringField(2,'Paper Lantern '+i),dataField(3,stringField(2,'Quiet Walk')),dataField(4,stringField(2,'Ada North')),numberField(7,600000),numberField(18,1)]),url='https://spclient.wg.spotify.com/metadata/4/track/'+hex;
  if(client==='Egern')await egern({env:{MEMORY_MODE:'compact'},request:{url,headers:new Headers()},response:new Response(body,{headers:{'Content-Type':type}}),storage:{get:k=>store.get(k),set:save,getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>save(k,JSON.stringify(v))}});
  else await new Promise((resolve,reject)=>{const ctx={$request:{url,headers:{}},$response:qx?{statusCode:200,headers:{'Content-Type':type},bodyBytes:body.buffer}:{status:200,headers:{'Content-Type':type},body},$argument:{MEMORY_MODE:'compact'},$persistentStore:{read:k=>store.get(k),write:(v,k)=>{save(k,v);return true}},$prefs:{valueForKey:k=>store.get(k),setValueForKey:(v,k)=>{save(k,v);return true}},$done:resolve};try{vm.runInNewContext(readFileSync(new URL('./runtime/'+client+'/script/SpotifyLyrics.Entry.js',import.meta.url),'utf8'),ctx)}catch(e){reject(e)}});
 }
 const raw=store.get('VerseLyrics.v1.cache');assert.ok(raw.length<=32000);const entries=JSON.parse(raw).entries;assert.equal(entries.length,64);assert.ok(entries.some(e=>e.key==='meta:'+String(40).padStart(22,'0')));assert.ok(writes>0);
});
