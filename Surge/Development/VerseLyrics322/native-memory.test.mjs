import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {utf8,utf8Size,readBody} from './core/spotify-lyrics.js';
const adapter=readFileSync(new URL('./native-adapter.js',import.meta.url),'utf8').replace('nativeMain().catch(() => nativeDone({}));','');
function bridge(client='Loon'){
 const encodes=[],out=[],context={LIMIT:2*1024*1024,utf8Size,utf8:(s,n)=>{encodes.push({characters:s.length,limit:n});return utf8(s,n);},$done:r=>out.push(r),setTimeout:()=>1};
 vm.runInNewContext(adapter.replace('__CLIENT__',client)+'\nthis.api={nativeResponse,nativeBytes,nativeMain};',context);
 return {context,encodes,out,api:context.api};
}
for(const s of ['', 'Original text', '中文', '𳈆🎵', '\u0000\n\r', '中'.repeat(32768)])test('native text avoids UTF-8 allocation at the exact byte limit: '+s.length,()=>{
 const x=bridge(),r=x.api.nativeResponse(200,{},s),size=Buffer.byteLength(s),value=r.boundedText(size);
 assert.equal(value.text,s);assert.equal(value.byteLength,size);assert.equal(x.encodes.length,0);
 if(size)assert.throws(()=>r.boundedText(size-1),/body-limit/);
 assert.equal(x.encodes.length,0);
});
for(const s of ['\ud800','x\udc00','\ud800x'])test('native text rejects malformed UTF-16 without encoding '+JSON.stringify(s),()=>{
 const x=bridge();assert.throws(()=>x.api.nativeResponse(200,{},s).boundedText(98304),/invalid-utf16/);assert.equal(x.encodes.length,0);
});
test('non-text native callbacks keep the bounded binary fallback',async()=>{
 const x=bridge(),r=x.api.nativeResponse(200,{},new Uint8Array([255,254]));assert.equal(r.boundedText(2),null);assert.deepEqual([...await readBody(r,2)],[255,254]);
});
for(const client of ['Surge','Loon','Shadowrocket','QuantumultX']){
 test(client+': constructing a string response does not encode its body',async()=>{const x=bridge(client),r=x.api.nativeResponse(200,{'Content-Length':'200000'},'中'.repeat(100000));assert.equal(x.encodes.length,0);await assert.rejects(readBody(r,98304),/body-limit/);assert.equal(x.encodes.length,0);});
 test(client+': unknown-length strings use the source limit before allocating UTF-8',async()=>{const x=bridge(client),r=x.api.nativeResponse(200,{},'中'.repeat(100000));await assert.rejects(readBody(r,98304),/body-limit/);assert.deepEqual(x.encodes,[{characters:100000,limit:98304}]);});
 test(client+': native no-op response path never materializes a body',async()=>{const x=bridge(client);x.context.$request={url:'https://example.invalid/skip',headers:{}};x.context.$response={status:200,headers:{},body:'中'.repeat(100000)};x.context.verseLyricsCore=async()=>undefined;await x.api.nativeMain();assert.equal(x.encodes.length,0);assert.equal(x.out.length,1);});
 test(client+': bounded nonzero-offset view reuses the original bytes',async()=>{const x=bridge(client),b=new Uint8Array([9,1,2,3,9]),r=x.api.nativeResponse(200,{},b.subarray(1,4));const out=await readBody(r,4);assert.equal(out.buffer,b.buffer);assert.equal(out.byteOffset,1);assert.deepEqual([...out],[1,2,3]);});
}

for(const client of ['Surge','Loon','Shadowrocket','QuantumultX'])test(client+': passthrough views skip a byte scan without scheduling a watchdog',async()=>{
 const x=bridge(client),cleared=[];x.context.clearTimeout=id=>cleared.push(id);x.context.$request={url:'https://example.invalid/skip',headers:{}};x.context.$response={status:200,headers:{},body:new Uint8Array(1024*1024),bodyBytes:new Uint8Array(1024*1024)};
 x.context.verseLyricsCore=async ctx=>{const body=ctx.response.boundedBytes();body.every=()=>{throw Error('unnecessary byte scan');};return{body};};await x.api.nativeMain();assert.deepEqual(cleared,[]);assert.equal(x.out.length,1);assert.equal(Object.keys(x.out[0]).length,0);
});
