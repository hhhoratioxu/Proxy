import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import native from '../dist/youtube-egern.js';
import { fields, player, translatedJSON, originalJSON, subtitleURL } from './fixtures.mjs';
const source=await readFile(new URL('../dist/youtube-proxy.js',import.meta.url),'utf8');
const api='https://youtubei.googleapis.com/youtubei/v1/player';
function invoke(client, raw, {url=api,status=200,args={},network='ok',store=new Map(),response=true}={}) {
  const calls=[],logs=[],done=[];let resolve;
  const finished=new Promise(r=>{resolve=r;});
  const req={url,headers:{'User-Agent':'YouTube/self-written','Authorization':'PRIVATE_FIXTURE','Cookie':'PRIVATE_FIXTURE'}};
  const res={headers:{'Content-Type':url.includes('timedtext')?'application/json':'application/x-protobuf','Content-Length':String(raw.length),ETag:'old'},status,statusCode:status};
  if(client==='QuantumultX')res.bodyBytes=new Uint8Array(raw).buffer;else res.body=new Uint8Array(raw);
  const env={Uint8Array,ArrayBuffer,DataView,TextDecoder,TextEncoder,setTimeout,clearTimeout,console:{log:(...xs)=>logs.push(xs)},$request:req,$argument:client==='Loon'?args:Object.entries(args).map(([k,v])=>k+'='+v).join('&'),$done:r=>{done.push(r);resolve(r);},$persistentStore:{read:k=>store.get(k),write:(v,k)=>store.set(k,v)}};
  if(response)env.$response=res;
  if(client==='Loon')env.$loon={};
  if(client==='QuantumultX'){
    env.$environment={variables:args};env.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>store.set(k,v)};
    env.$task={fetch:async o=>{calls.push(o);if(network==='throw')throw Error('failure');return{statusCode:network==='error'?429:200,bodyBytes:new TextEncoder().encode(network==='html'?'<html>blocked</html>':originalJSON).buffer};}};
  }else env.$httpClient={get:(o,cb)=>{calls.push(o);if(network==='throw')cb('failure');else cb(null,{status:network==='error'?429:200},new TextEncoder().encode(network==='html'?'<html>blocked</html>':originalJSON));}};
  vm.runInNewContext(source,env,{timeout:2000});
  return finished.then(result=>({result,calls,logs,done}));
}
for(const client of ['Surge','Loon','Shadowrocket','QuantumultX']){
  test(client+' production bundle processes native protobuf and finishes once silently',async()=>{
    const x=await invoke(client,player());const raw=x.result.bodyBytes||x.result.body;assert.ok(raw);assert.equal(fields(new Uint8Array(raw)).some(f=>f.no===7||f.no===68),false);assert.equal(x.done.length,1);assert.equal(x.logs.length,0);assert.equal(x.calls.length,0);assert.equal(x.result.headers.ETag,undefined);if(client==='QuantumultX')assert.ok(raw instanceof ArrayBuffer);else assert.ok(raw instanceof Uint8Array);
  });
  test(client+' production subtitle composition omits credentials and disables redirect/cookies',async()=>{
    const x=await invoke(client,new TextEncoder().encode(translatedJSON),{url:subtitleURL+'&tlang=zh-Hans'});assert.equal(x.calls.length,1);assert.match(new TextDecoder().decode(x.result.bodyBytes||x.result.body),/A self-written line/);assert.equal(x.calls[0].headers.Authorization,undefined);assert.equal(x.calls[0].headers.Cookie,undefined);if(client==='QuantumultX'){assert.equal(x.calls[0].opts['auto-cookie'],false);assert.equal(x.calls[0].opts.redirection,false);}else{assert.equal(x.calls[0]['auto-cookie'],false);assert.equal(x.calls[0]['auto-redirect'],false);}assert.equal(x.done.length,1);assert.equal(x.logs.length,0);
  });
  test(client+' native argument form can disable both features',async()=>{
    const x=await invoke(client,player(),{args:{ADBLOCK_ENABLED:false,TRANSLATION_ENABLED:false}});assert.equal(Object.keys(x.result).length,0);assert.equal(x.calls.length,0);
  });
  for(const network of ['throw','error','html'])test(client+' failed subtitle service '+network+' preserves original response',async()=>{
    const x=await invoke(client,new TextEncoder().encode(translatedJSON),{url:subtitleURL+'&tlang=zh-Hans',network});assert.equal(Object.keys(x.result).length,0);assert.equal(x.done.length,1);assert.equal(x.logs.length,0);
  });
  test(client+' corrupt binary and HTTP errors leave playback unchanged',async()=>{
    for(const [body,status] of [[new Uint8Array([255]),200],[player(),500]]){const x=await invoke(client,body,{status});assert.equal(Object.keys(x.result).length,0);assert.equal(x.done.length,1);}
  });
}
function context(raw,{url=api,status=200,args={},network='ok',store=new Map()}={}){
  const calls=[];
  const ctx={env:args,request:{url,headers:new Headers({'User-Agent':'YouTube/self-written',Authorization:'PRIVATE_FIXTURE',Cookie:'PRIVATE_FIXTURE'})},response:new Response(raw,{status,headers:{'Content-Type':url.includes('timedtext')?'application/json':'application/x-protobuf',ETag:'old','Content-Length':String(raw?.length||0)}}),storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)},http:{get:async(url,options)=>{calls.push({url,options});if(network==='throw')throw Error('failure');return new Response(network==='html'?'<html>blocked</html>':originalJSON,{status:network==='error'?429:200});}}};
  return{ctx,calls};
}
test('Egern native production module processes Fetch streams and Headers without compat globals',async()=>{
  const x=context(player()),result=await native(x.ctx);assert.ok(result.body instanceof Uint8Array);assert.equal(fields(result.body).some(f=>f.no===7),false);assert.equal(result.headers.get('ETag'),null);assert.equal(x.calls.length,0);
});
test('Egern native bilingual composition uses only ctx.http with no cookies or redirects',async()=>{
  const x=context(translatedJSON,{url:subtitleURL+'&tlang=zh-Hans'}),result=await native(x.ctx);assert.match(new TextDecoder().decode(result.body),/A self-written line/);assert.equal(x.calls.length,1);assert.equal(x.calls[0].url,subtitleURL);assert.equal(x.calls[0].options.credentials,'omit');assert.equal(x.calls[0].options.redirect,'error');assert.equal(x.calls[0].options.insecureTls,false);assert.equal(x.calls[0].options.headers.Authorization,undefined);
});
for(const network of ['throw','error','html'])test('Egern returns the consumed original stream after subtitle '+network,async()=>{
  const x=context(translatedJSON,{url:subtitleURL+'&tlang=zh-Hans',network}),result=await native(x.ctx);assert.equal(new TextDecoder().decode(result.body),translatedJSON);assert.equal(result.headers,undefined);
});
test('Egern disabled settings and HTTP errors do not consume the stream',async()=>{
  for(const extra of [{args:{ADBLOCK_ENABLED:false,TRANSLATION_ENABLED:false}},{status:500}]){const x=context(player(),extra);assert.equal(await native(x.ctx),undefined);assert.equal(x.ctx.response.bodyUsed,false);}
});
test('Egern malformed protobuf and unknown layouts preserve exact bytes after stream consumption',async()=>{
  const raw=new Uint8Array([255]),x=context(raw),result=await native(x.ctx);assert.deepEqual(result.body,raw);assert.equal(result.headers,undefined);
});
test('both production distributions have all licenses and no imports, worker URLs or dynamic evaluation',async()=>{
  for(const name of ['youtube-proxy.js','youtube-egern.js']){const s=await readFile(new URL('../dist/'+name,import.meta.url),'utf8');assert.match(s,/Apache License/);assert.match(s,/Copyright \(c\) 2024 LuanRT/);assert.match(s,/Paul Miller/);assert.match(s,/Arjun Barrett/);assert.doesNotMatch(s,/workers\.dev|new Function\(|\beval\(|^import\s/m);}
});
