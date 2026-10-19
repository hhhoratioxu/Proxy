import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {utf8,VERSION} from '../src/data.mjs';
const code=await readFile(new URL('../dist/clients.js',import.meta.url),'utf8');
const url='https://www.youtube.com/api/timedtext?v=SELF-WRITTEN&lang=ko&tlang=zh-Hant&format=srv3';
const source='<timedtext format="3"><body><p t="1000" d="2000"><s>한국어 원문</s></p></body></timedtext>';
async function callback(client,options={}){
  const requests=[],completed=[],logs=[],storage=new Map();let finish;const done=new Promise(resolve=>finish=resolve),qx=client==='QuantumultX';
  const context={Uint8Array,ArrayBuffer,DataView,setTimeout:fn=>{const timer=setTimeout(fn,options.timeout?0:4000);timer.unref();return timer;},TextEncoder:undefined,TextDecoder:undefined,$argument:{TARGET_LANGUAGE:'zh-Hant'},$request:{url:options.original?url.replace('&tlang=zh-Hant',''):url,headers:{'User-Agent':'native fixture',Cookie:'PRIVATE_COOKIE'}},$response:{status:options.original?200:429,statusCode:options.original?200:429,headers:{'Content-Type':options.original?'application/xml':'text/html','Content-Length':'1103','Content-Encoding':'gzip','Retry-After':'60'},...(qx?{bodyBytes:utf8(options.original?source:'<html>rate limited</html>').buffer}:{body:utf8(options.original?source:'<html>rate limited</html>')})},$persistentStore:{read:k=>storage.get(k),write:(v,k)=>{storage.set(k,v);return true;}},$done:r=>{completed.push(r);finish(r);},console:{log:s=>logs.push(s)}};
  context.$httpClient={get:(request,complete)=>{requests.push(request);if(options.timeout)setTimeout(()=>complete(null,{status:200},utf8(source)),15);else complete(null,{status:options.downloadStatus||200,headers:{'Content-Type':'application/xml'}},utf8(source));}};
  if(client==='Loon')context.$loon='self-written Loon 3.5.3(1008) fixture';
  if(qx){context.$environment={variables:{TARGET_LANGUAGE:'zh-Hant'}};context.$task={fetch:async request=>{requests.push(request);return{statusCode:options.downloadStatus||200,bodyBytes:utf8(source).buffer,headers:{}};}};context.$prefs={valueForKey:k=>storage.get(k),setValueForKey:(v,k)=>{storage.set(k,v);return true;}};}
  vm.runInNewContext(code,context,{timeout:3000});const result=await done;if(options.timeout)await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(completed.length,1);assert.equal(logs.length,1);return{result,requests,report:JSON.parse(logs[0].slice(15)),storage};
}
for(const client of ['Loon','Surge','Shadowrocket'])test(client+' bundled adapter changes 429 to 200 only after receiving a real original transcript',async()=>{
  const {result,requests,report}=await callback(client);assert.equal(result.status,200);assert.equal(Buffer.from(result.body).toString(),source);assert.ok(result.headers['Content-Type'].startsWith('application/xml'));assert.equal(result.headers['Retry-After'],undefined);assert.equal(result.headers['Content-Encoding'],undefined);assert.equal(result.headers['Content-Length'],undefined);
  assert.equal(requests.length,1);assert.ok(!requests[0].url.includes('tlang'));assert.equal(requests[0].headers.Cookie,undefined);assert.equal(report.version,VERSION);assert.equal(report.captionOutputStatus,200);assert.equal(report.reason,'caption-fallback-original');
  if(client==='Loon'){assert.equal(requests[0].timeout,4000);assert.equal(requests[0].insecure,false);}
});
test('Loon late HTTP callback after a caption timeout never completes the script twice',async()=>{
  const {result,requests,report}=await callback('Loon',{timeout:true});assert.deepEqual(Object.keys(result),[]);assert.equal(requests.length,1);assert.equal(report.reason,'caption-timeout');
});
test('Loon translation rate limiting preserves native original bytes and the original response status',async()=>{
  const {result,requests,report,storage}=await callback('Loon',{original:true,downloadStatus:429});assert.deepEqual(Object.keys(result),[]);assert.equal(requests.length,1);assert.equal(report.reason,'caption-rate-limited');assert.equal(storage.size,1);
});
test('Quantumult X keeps a failed legacy response intact and records backoff without changing managed MIME headers',async()=>{
  const {result,requests,report}=await callback('QuantumultX');assert.deepEqual(Object.keys(result),[]);assert.equal(requests.length,0);assert.equal(report.status,429);
});
test('Egern native response adapter recovers 429 with a single Fetch-body consumption and numeric status',async()=>{
  const run=(await import('../dist/egern.js')).default,requests=[];let reads=0;
  const result=await run({env:{TARGET_LANGUAGE:'zh-Hant'},request:{url,headers:new Headers()},response:{status:429,headers:new Headers({'Content-Type':'text/html','Retry-After':'60'}),arrayBuffer:async()=>{assert.equal(reads++,0);return utf8('<html>rate limited</html>').buffer;}},storage:{getJSON:()=>null,setJSON:()=>true},http:{get:async(url,options)=>{requests.push({url,options});return{status:200,headers:new Headers({'Content-Type':'application/xml'}),arrayBuffer:async()=>utf8(source).buffer};}}});
  assert.equal(result.status,200);assert.equal(Buffer.from(result.body).toString(),source);assert.ok(result.headers.get('Content-Type').startsWith('application/xml'));assert.equal(result.headers.get('Retry-After'),null);assert.equal(requests.length,1);
});
