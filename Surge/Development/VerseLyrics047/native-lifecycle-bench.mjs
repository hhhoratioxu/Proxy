import vm from 'node:vm';
import {readFileSync,writeFileSync} from 'node:fs';
const baseline=process.argv[2];if(!baseline)throw Error('Pass the unmodified 0.4.6 native-adapter.js');
const adapters=[['0.4.6',readFileSync(baseline,'utf8')],['0.4.7',readFileSync(new URL('./native-adapter.js',import.meta.url),'utf8')]];
const results=[];
for(const [version,adapter] of adapters)for(const client of ['Loon','Surge','Shadowrocket','QuantumultX']){
 let scheduled=0,calls=0,active=0,maxActive=0,completions=0,outputSize=0;const store=new Map();
 const fixture=new Uint8Array(96*1024);
 const context={LIMIT:524288,utf8:s=>new TextEncoder().encode(s),$request:{url:'https://example.invalid/fixture',headers:{}},$response:client==='QuantumultX'?{statusCode:200,headers:{},bodyBytes:new Uint8Array([0]).buffer}:{status:200,headers:{},body:new Uint8Array([0])},setTimeout:()=>{scheduled++;return undefined;},$done:r=>{completions++;outputSize=r.body?.byteLength||r.bodyBytes?.byteLength||0;},verseLyricsCore:async ctx=>{for(let i=0;i<12;i++){const r=await ctx.http.get('https://example.invalid/fixture/'+i,{timeout:2500});const view=r.boundedBytes(96*1024);if(view.byteLength!==fixture.byteLength)throw Error('fixture bytes');}return{body:new Uint8Array([7,8])};}};
 const request=()=>{calls++;active++;maxActive=Math.max(maxActive,active);};const finish=()=>{active--;};
 context.$persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};context.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>{store.set(k,v);return true;}};
 context.$httpClient={get:(o,cb)=>{request();queueMicrotask(()=>{finish();cb(null,{status:200,headers:{}},fixture);});}};
 context.$task={fetch:async()=>{request();await Promise.resolve();finish();return{statusCode:200,headers:{},bodyBytes:fixture.buffer};}};
 vm.runInNewContext(adapter.replace('__CLIENT__',client).replace('nativeMain().catch(() => nativeDone({}));','')+'\nthis.run=nativeMain;',context);
 await context.run();if(calls!==12||maxActive!==1||completions!==1||outputSize!==2)throw Error('bridge behavior');
 if(version==='0.4.7'&&scheduled!==(client==='QuantumultX'?1:0))throw Error('timer regression');
 results.push({version,client,nativeRequests:calls,maxInFlight:maxActive,jsTimersScheduled:scheduled,completionCalls:completions,outputBytes:outputSize});
}
const evidence={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'Native adapter VM fixture: twelve sequential 96 KiB mock responses, no clearTimeout and a timer API returning no handle. Counts timer creation, not host cancellation, phone RAM or full lyrics latency.',results};
writeFileSync(new URL('./native-lifecycle-results.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
