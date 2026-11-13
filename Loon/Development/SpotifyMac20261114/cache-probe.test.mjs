import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const code=readFileSync(new URL('./runtime/SpotifyLyrics.CacheProbe2.js',import.meta.url),'utf8');
const vi=v=>{const a=[];do{a.push((v&127)|(v>127?128:0));v=Math.floor(v/128);}while(v);return Buffer.from(a);};
const cat=(...v)=>Buffer.concat(v),bin=(n,b)=>cat(vi(n*8+2),vi(b.length),b),txt=(n,s)=>bin(n,Buffer.from(s)),num=(n,v)=>cat(vi(n*8),vi(v));
const uri='spotify:track:76XUZSb13QUuj1HECY4Hvo',tag=txt(2,'SECRET-ETAG'),other=bin(2,cat(num(1,178),txt(2,'keep-other-query'))),unknown=txt(91,'unknown-keep');
const make=(query=cat(num(1,10),tag,unknown),id=uri)=>cat(bin(1,txt(1,'opaque-header-SECRET')),bin(2,cat(txt(1,id),bin(2,query),other,unknown)),unknown);
const expected=make(cat(num(1,10),unknown));
function run({body=make(),method='POST',args={},extraHeaders={}}={}){
  const done=[],events=[],input=new Uint8Array(body),before=input.slice();
  vm.runInNewContext(code,{$request:{url:'https://spclient.wg.spotify.com/extended-metadata/v0/extended-metadata',method,headers:{Authorization:'Bearer SECRET','Content-Type':'application/protobuf','Content-Length':String(body.length),...extraHeaders},body:input},$argument:args,
    $done:o=>done.push(o),$httpClient:{post:(options,cb)=>{assert.ok(!options.body.includes('SECRET'));events.push(JSON.parse(options.body));cb();cb();}},console:{log(){throw Error('no logs');}}},{timeout:1000});
  assert.equal(done.length,1);assert.deepEqual(input,before);assert.equal(events.length,1);return {out:done[0],event:events[0]};
}
test('actual built cache probe strips only target TRACK_V4 conditional etag',()=>{
  const {out,event}=run();assert.deepEqual(Buffer.from(out.body),expected);assert.equal(out.headers.Authorization,'Bearer SECRET');assert.equal(out.headers['Content-Length'],undefined);assert.equal(out.headers['Content-Type'],'application/protobuf');
  assert.equal(event.flags.find(f=>f.path==='queries').value,1);assert.equal(event.flags.find(f=>f.path==='removed').value,1);
});
test('a query without etag stays header-only',()=>assert.equal(run({body:make(num(1,10))}).out.body,undefined));
test('another song is never cache-refreshed by this controlled probe',()=>assert.equal(run({body:make(undefined,'spotify:track:0000000000000000000000')}).out.body,undefined));
test('other extension kind stays untouched',()=>assert.equal(run({body:make(cat(num(1,178),tag))}).out.body,undefined));
test('duplicate kind is ambiguous and remains untouched',()=>assert.equal(run({body:make(cat(num(1,10),num(1,10),tag))}).out.body,undefined));
test('malformed and oversize body passes through',()=>{for(const body of [new Uint8Array([255]),new Uint8Array(65537)])assert.equal(run({body}).out.body,undefined);});
test('off settings do not refresh body',()=>{for(const args of [{FALLBACK_PROVIDER:'off'},{DISCOVER_MISSING:false},{TARGET_LANGUAGE:'invalid'}])assert.equal(run({args}).out.body,undefined);});
test('integrity headers prevent body rewriting',()=>{for(const key of ['Signature','Signature-Input','Content-Digest','Digest','Content-MD5'])assert.equal(run({extraHeaders:{[key]:'SECRET'}}).out.body,undefined);});
test('compressed request is not decoded or changed',()=>assert.equal(run({extraHeaders:{'Content-Encoding':'gzip'}}).out.body,undefined));
test('OPTIONS remains unchanged',()=>assert.equal(run({method:'OPTIONS'}).out.body,undefined));
test('controlled profile puts body hook first and retains all response guards',()=>{
  const p=readFileSync(new URL('./CacheProbe.lpx',import.meta.url),'utf8'),rules=p.split('\n').filter(x=>x.startsWith('request if'));
  assert.equal(rules.length,2);assert.ok(rules[0].includes('CacheProbe2.js'));assert.ok(rules[0].includes('requires_body=true, binary_body_mode=true'));assert.ok(rules[0].includes('${request.method} == "POST"'));
  assert.equal(p.split('\n').filter(x=>x.startsWith('response if')).length,2);
});
