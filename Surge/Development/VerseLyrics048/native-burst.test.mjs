import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import egern from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics.js';
const id=n=>String(n).padStart(22,'0'),KEY='VerseLyrics.v1.cache',colors={background:-11709348,text:-3748137,highlightText:-1};
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])test(client+': overlapping switches wait for callbacks, retire older work, and retain fallback plus translation on the settled song',async()=>{
 const qx=client==='QuantumultX',store=new Map(),records=[],gates=[],calls=[];let active=0,maxActive=0,done=0;
 for(let n=1;n<=20;n++){records.push({key:'meta:'+id(n),value:{id:id(n),title:'Lantern '+n,artists:['Ada North'],album:'Quiet Walk',duration:180},expires:Date.now()+600000},{key:'palette:v1:'+id(n),value:{colors},expires:Date.now()+600000});}
 store.set(KEY,JSON.stringify({entries:records,cooldowns:{}}));
 const code=client==='Egern'?null:new vm.Script(readFileSync(new URL('./runtime/'+client+'/script/SpotifyLyrics.js',import.meta.url),'utf8'));
 async function network(url){calls.push(url);active++;maxActive=Math.max(maxActive,active);let value;
  if(calls.length<=2){value=await new Promise(r=>gates.push(()=>{r({status:404,body:'{}'});}));}
  else if(url.includes('lrclib.net/api/get?'))value={status:200,body:JSON.stringify({trackName:'Lantern 20',artistName:'Ada North',albumName:'Quiet Walk',duration:180,syncedLyrics:'[00:01]Original final line.\n[00:03]Another final line.'})};
  else if(url.includes('translate.googleapis.com'))value={status:200,body:JSON.stringify(new URL(url).searchParams.getAll('q').map((_,i)=>'插件译文 '+i))};
  else throw Error('obsolete job added HTTP '+url);
  active--;return value;
 }
 function invoke(n){
  const url='https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id(n),env={TRANSLATION_ENABLED:true,TARGET_LANGUAGE:'zh-CN',FALLBACK_PROVIDER:'lrclib',DISCOVER_MISSING:true};
  if(client==='Egern')return egern({env,request:{url,headers:new Headers({Accept:'application/json'})},response:new Response('missing',{status:404}),storage:{get:k=>store.get(k),getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:async u=>{const r=await network(u);return new Response(r.body,{status:r.status});}}}).then(r=>{done++;return r;});
  let complete;const work=new Promise(r=>complete=r),input=new Uint8Array(Buffer.from('missing')),ctx={$request:{url,headers:{Accept:'application/json'}},$response:qx?{statusCode:404,headers:{},bodyBytes:input.buffer}:{status:404,headers:{},body:input},setTimeout:()=>{assert.equal(qx,true);return 1;},clearTimeout(){},$done:r=>{done++;complete(r);}};
  if(qx){ctx.$environment={variables:env};ctx.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>store.set(k,v)};ctx.$task={fetch:async o=>{const r=await network(o.url);return{statusCode:r.status,headers:{},bodyBytes:new Uint8Array(Buffer.from(r.body)).buffer};}};}
  else{ctx.$argument=env;ctx.$persistentStore={read:k=>store.get(k),write:(v,k)=>store.set(k,v)};ctx.$httpClient={get:(o,cb)=>{network(o.url).then(r=>cb(null,{status:r.status,headers:{}},new Uint8Array(Buffer.from(r.body))),e=>cb(e));}};}
  code.runInNewContext(ctx);return work;
 }
 const first=invoke(1);await new Promise(setImmediate);assert.equal(gates.length,1);const second=invoke(2);await new Promise(setImmediate);assert.equal(gates.length,2);
 const rest=Array.from({length:18},(_,i)=>invoke(i+3));await new Promise(setImmediate);assert.equal(calls.length,2);assert.equal(active,2);assert.equal(done,18);assert.equal(maxActive,2);
 gates.forEach(f=>f());await Promise.all([first,second,...rest]);assert.equal(calls.length,2);assert.equal(done,20);assert.equal(active,0);assert.deepEqual(JSON.parse(store.get('VerseLyrics.v1.network')),[]);assert.ok(!JSON.parse(store.get(KEY)).entries.some(e=>e.value?.missing));
 const settled=await invoke(20),output=JSON.parse(Buffer.from(qx?settled.bodyBytes:settled.body));assert.deepEqual(output.lyrics.lines.map(l=>[l.startTimeMs,l.words]),[['1000','Original final line.'],['3000','Another final line.']]);assert.deepEqual(output.lyrics.alternatives,[{language:'zh-CN',lines:['插件译文 0','插件译文 1']}]);assert.deepEqual(output.colors,colors);assert.equal(calls.length,4);
 await invoke(20);assert.equal(calls.length,4);assert.equal(done,22);assert.ok(store.get(KEY).length<=64000);
});
