import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {utf8,Settings} from '../src/data.mjs';
import {readTimeline} from '../src/timeline.mjs';
import {translationBatch,googleFallback} from '../src/translation.mjs';
const code=await readFile(new URL('../dist/clients.js',import.meta.url),'utf8');
const url='https://www.youtube.com/api/timedtext?v=PRIVATE_VIDEO&lang=ko&signature=PRIVATE_SIGNATURE&format=srv3';
const source='<timedtext format="3"><body><p t="1000" d="2000"><s>안녕하세요.</s></p></body></timedtext>',reply='["你好。"]';
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX'])test(client+' published adapter performs one backup POST with no request credentials and preserves the native envelope',async()=>{
 const calls=[],logs=[],storage=new Map();let finish,count=0;const done=new Promise(r=>finish=r),qx=client==='QuantumultX';
 const context={Uint8Array,ArrayBuffer,DataView,TextEncoder:undefined,TextDecoder:undefined,setTimeout:(fn,ms)=>setTimeout(fn,ms).unref(),$request:{url,headers:{Cookie:'PRIVATE_COOKIE',Authorization:'PRIVATE_AUTH'}},$response:{status:200,statusCode:200,headers:{'Content-Type':'application/xml'},...(qx?{bodyBytes:utf8(source).buffer}:{body:utf8(source)})},$argument:{TARGET_LANGUAGE:'zh-Hant'},$persistentStore:{read:k=>storage.get(k),write:(v,k)=>{storage.set(k,v);return true;}},$httpClient:{get:(r,cb)=>{calls.push({method:'GET',r});cb(null,{status:429},utf8('limited'));},post:(r,cb)=>{calls.push({method:'POST',r});cb(null,{status:200},utf8(reply));}},$done:r=>{count++;finish(r);},console:{log:s=>logs.push(s)}};
 if(client==='Loon')context.$loon='self-written native fixture';
 if(qx){context.$environment={variables:{TARGET_LANGUAGE:'zh-Hant'}};context.$prefs={valueForKey:k=>storage.get(k),setValueForKey:(v,k)=>{storage.set(k,v);return true;}};context.$task={fetch:async r=>{calls.push({method:r.method,r});return{statusCode:r.method==='POST'?200:429,bodyBytes:utf8(r.method==='POST'?reply:'limited').buffer};}};}
 vm.runInNewContext(code,context,{timeout:3000});const out=await done;assert.equal(count,1);assert.ok(Buffer.from(qx?out.bodyBytes:out.body).toString().includes('안녕하세요.\n你好。'));assert.deepEqual(calls.map(x=>x.method),['GET','POST']);assert.ok(!JSON.stringify(calls[1]).includes('PRIVATE_'));assert.ok(calls[1].r.body.startsWith('q='));assert.equal(logs.length,1);const d=JSON.parse(logs[0].slice(15));assert.equal(d.captionProvider,'google');assert.equal(d.captionFallbackStatus,200);
 if(client==='Loon'){assert.ok(calls[1].r.timeout<=4000);assert.equal(calls[1].r.insecure,false);assert.equal(calls[1].r['auto-cookie'],false);}
});
test('Egern backup POST uses its native millisecond timeout and omitted credentials',async()=>{
 const run=(await import('../dist/egern.js')).default,calls=[];
 const out=await run({env:{TARGET_LANGUAGE:'zh-Hant'},request:{url,headers:new Headers({'Cookie':'PRIVATE_COOKIE'})},response:{status:200,headers:new Headers({'Content-Type':'application/xml'}),arrayBuffer:async()=>utf8(source).buffer},storage:{getJSON:()=>null,setJSON:()=>true},http:{get:async()=>({status:429,headers:new Headers()}),post:async(url,options)=>{calls.push({url,options});return{status:200,headers:new Headers(),arrayBuffer:async()=>utf8(reply).buffer};}}});
 assert.ok(Buffer.from(out.body).toString().includes('你好。'));assert.equal(calls.length,1);assert.equal(calls[0].options.credentials,'omit');assert.ok(calls[0].options.timeout<=4000);assert.ok(!JSON.stringify(calls).includes('PRIVATE_'));
});
test('batch deduplicates repeated text and keeps literal punctuation and emoji in form fields',()=>{
 const timeline=readTimeline(JSON.stringify({events:[{tStartMs:0,dDurationMs:1000,segs:[{utf8:'A & B 🎬'}]},{tStartMs:2000,dDurationMs:1000,segs:[{utf8:'A & B 🎬'}]}]}));
 const batch=translationBatch(timeline,'en','zh-Hant');assert.equal(batch.texts.length,1);assert.deepEqual(new URLSearchParams(batch.request.body).getAll('q'),['A & B 🎬']);assert.ok(batch.request.url.includes('format=text'));
});
test('expired total deadline does not start a fallback network request',async()=>{
 let calls=0;const diagnostic={};assert.equal(await googleFallback({translate:async()=>{calls++;}},new Settings(),readTimeline(source),'ko',diagnostic,Date.now()-1),null);assert.equal(calls,0);assert.equal(diagnostic.captionFallbackReason,'deadline');
});
test('oversized fallback input is rejected before any additional network call',async()=>{
 const timeline=readTimeline('<transcript><text start="0" dur="1">'+'a'.repeat(4001)+'</text></transcript>');let calls=0;const d={};assert.equal(await googleFallback({translate:async()=>{calls++;}},new Settings(),timeline,'en',d,Date.now()+6500),null);assert.equal(calls,0);assert.equal(d.captionFallbackReason,'input-limit');
});
