import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./native-adapter.js',import.meta.url),'utf8').replace('nativeMain().catch(() => nativeDone({}));','');
function host(client,run,timerReturnsId=true){
 const done=[],calls=[],timers=[],values=new Map();let nativePending=0,maxPending=0;
 const context={LIMIT:524288,utf8:s=>new TextEncoder().encode(s),$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001',headers:{}},$response:client==='QuantumultX'?{statusCode:200,headers:{'content-LENGTH':'7','CONTENT-type':'application/x-protobuf','Content-encoding':'gzip','X-Other':'keep'},bodyBytes:new Uint8Array([1,2]).buffer}:{status:200,headers:{},body:new Uint8Array([1,2])},$done:r=>{if(client!=='QuantumultX')assert.equal(nativePending,0,'finish only after native callback');done.push(r);},setTimeout:(fn,ms)=>{assert.equal(client,'QuantumultX','no competing JS timers on callback hosts');timers.push({fn,ms});return timerReturnsId?timers.length:undefined;},verseLyricsCore:run};
 context.$persistentStore={read:k=>values.get(k),write:(v,k)=>{values.set(k,v);return true;}};
 context.$prefs={valueForKey:k=>values.get(k),setValueForKey:(v,k)=>{values.set(k,v);return true;}};
 context.$httpClient={get:(options,callback)=>{nativePending++;maxPending=Math.max(maxPending,nativePending);let settled=false;calls.push({options,finish(error=null,body=new Uint8Array([1])){if(!settled){settled=true;nativePending--;}callback(error,{status:200,headers:{}},body);}});}};
 context.$task={fetch:options=>new Promise((resolve,reject)=>{nativePending++;maxPending=Math.max(maxPending,nativePending);calls.push({options,finish(response){nativePending--;resolve(response);},fail(reason){nativePending--;reject(reason);}});})};
 vm.runInNewContext(source.replace('__CLIENT__',client)+'\nthis.main=nativeMain;',context);
 return {context,done,calls,timers,values,run:()=>context.main(),max:()=>maxPending};
}
for(const client of ['Loon','Surge','Shadowrocket'])test(client+': waits for transport, uses native timeout units, and finishes once without timers',async()=>{
 const x=host(client,async ctx=>{await ctx.http.get('https://example.invalid/one',{timeout:1234});await ctx.http.get('https://example.invalid/two',{timeout:800});});
 const work=x.run();assert.equal(x.calls.length,1);assert.equal(x.done.length,0);assert.equal(x.timers.length,0);
 assert.equal(x.calls[0].options.timeout,client==='Loon'?1234:1.234);
 assert.deepEqual(Object.keys(x.calls[0].options).sort(),['auto-cookie','auto-redirect','binary-mode','headers','insecure','timeout','url']);
 x.calls[0].finish();await new Promise(setImmediate);assert.equal(x.calls.length,2);assert.equal(x.done.length,0);assert.equal(x.calls[1].options.timeout,client==='Loon'?800:0.8);
 x.calls[1].finish();await work;assert.equal(x.done.length,1);assert.equal(x.max(),1);x.calls[1].finish();await new Promise(setImmediate);assert.equal(x.done.length,1);
});
for(const timerReturnsId of [true,false])test('Quantumult X uses one script timer across multiple fetches without invented fetch options; timer ID '+timerReturnsId,async()=>{
 const x=host('QuantumultX',async ctx=>{await ctx.http.get('https://example.invalid/one',{timeout:1234});await ctx.http.get('https://example.invalid/two',{timeout:800});},timerReturnsId);
 const work=x.run();assert.equal(x.calls.length,1);assert.equal(x.timers.length,1);assert.ok(x.timers[0].ms>11000&&x.timers[0].ms<=12000);
 assert.deepEqual(Object.keys(x.calls[0].options).sort(),['headers','method','opts','url']);assert.deepEqual(JSON.parse(JSON.stringify(x.calls[0].options.opts)),{redirection:false,'auto-cookie':false,'skip-cert-verify':false});
 x.calls[0].finish({statusCode:200,headers:{},bodyBytes:new Uint8Array([1]).buffer});await new Promise(setImmediate);assert.equal(x.calls.length,2);assert.equal(x.timers.length,1);
 x.calls[1].finish({statusCode:200,headers:{},bodyBytes:new Uint8Array([2]).buffer});await work;assert.equal(x.max(),1);assert.equal(x.done.length,1);x.timers[0].fn();assert.equal(x.done.length,1);
});
test('Quantumult X exits once and never materializes a late fetch body',async()=>{
 let bodyReads=0;const x=host('QuantumultX',async ctx=>{try{await ctx.http.get('https://example.invalid/one',{});}catch{};});
 const work=x.run();assert.equal(x.timers.length,1);x.timers[0].fn();assert.equal(x.done.length,1);
 const late={statusCode:200,headers:{},get bodyBytes(){bodyReads++;throw Error('late bytes must stay unmaterialized');},get body(){bodyReads++;throw Error('late text must stay unmaterialized');}};
 x.calls[0].finish(late);await work;assert.equal(bodyReads,0);assert.equal(x.done.length,1);assert.equal(x.calls.length,1);
});
test('Quantumult X body rewrite keeps all protected headers exactly as supplied',async()=>{
 const x=host('QuantumultX',async ctx=>{for(const name of ['Content-Type','Content-Length','Content-Encoding'])ctx.response.headers.delete(name);ctx.response.headers.set('Content-Type','text/changed');ctx.response.headers.set('X-Own','yes');return{headers:ctx.response.headers,status:200,body:new Uint8Array([5,6,7])};});
 await x.run();assert.equal(x.timers.length,0);const r=x.done[0];assert.equal(r.status,'HTTP/1.1 200 OK');assert.deepEqual([...new Uint8Array(r.bodyBytes)],[5,6,7]);
 assert.equal(r.headers['content-LENGTH'],'7');assert.equal(r.headers['CONTENT-type'],'application/x-protobuf');assert.equal(r.headers['Content-encoding'],'gzip');assert.equal(r.headers['Content-Type'],undefined);assert.equal(r.headers['X-Own'],'yes');assert.equal(r.headers['X-Other'],'keep');
});
test('Quantumult X never emits an invalid headers-only response-body result',async()=>{
 const x=host('QuantumultX',async ctx=>({headers:ctx.response.headers,status:200}));await x.run();assert.equal(Object.keys(x.done[0]).length,0);assert.equal(x.timers.length,0);
});
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX'])test(client+': cached response requires neither HTTP nor a timer',async()=>{
 const x=host(client,async()=>({body:new Uint8Array([8,9])}));await x.run();assert.equal(x.calls.length,0);assert.equal(x.timers.length,0);assert.equal(x.done.length,1);
});
