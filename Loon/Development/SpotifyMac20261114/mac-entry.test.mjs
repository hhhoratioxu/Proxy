import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const code=readFileSync(new URL('./runtime/SpotifyLyrics.Entry.Mac.js',import.meta.url),'utf8');
const vi=v=>{const a=[];do{a.push((v&127)|(v>127?128:0));v=Math.floor(v/128);}while(v);return Buffer.from(a);};
const bin=(n,b)=>Buffer.concat([vi(n*8+2),vi(b.length),b]);
const txt=(n,s)=>bin(n,Buffer.from(s));
const uri='spotify:track:76XUZSb13QUuj1HECY4Hvo';
const marker=txt(91,'independent-unknown-field');
const track=Buffer.concat([txt(1,uri),marker]);
const flag=bin(3,Buffer.concat([txt(1,'has_lyrics'),txt(2,'true')]));
const body=Buffer.concat([bin(3,bin(7,track)),marker]);
const expected=Buffer.concat([bin(3,bin(7,Buffer.concat([track,flag]))),marker]);
function run({input=body,type,route='connect-state/v1/devices/local_test_device_123456',args={},status=200}={}){
  const done=[],store=new Map();const headers={'X-Unknown':'keep','Access-Control-Allow-Origin':'https://xpui.app.spotify.com'};
  if(type!==undefined)headers['Content-Type']=type;
  const original=new Uint8Array(input),before=original.slice();
  vm.runInNewContext(code,{$request:{url:'https://spclient.wg.spotify.com/'+route,method:'PUT',headers:{Accept:'application/x-protobuf'}},
    $response:{status,headers,body:original},$argument:args,$done:r=>done.push(r),$persistentStore:{read:k=>store.get(k),write:(v,k)=>store.set(k,v)},
    $httpClient:new Proxy({},{get(){throw Error('entry must stay local');}}),console:{log(){throw Error('no logs');}}},{timeout:1000});
  assert.equal(done.length,1);assert.deepEqual(original,before);return done[0];
}
test('observed no-MIME ConnectState structure uses existing strict track parser',()=>{const out=run();assert.deepEqual(Buffer.from(out.body),expected);assert.equal(out.headers['X-Unknown'],'keep');assert.equal(out.headers['Access-Control-Allow-Origin'],'https://xpui.app.spotify.com');});
test('known protobuf MIME continues to work',()=>assert.deepEqual(Buffer.from(run({type:'application/protobuf'}).body),expected));
test('nonempty unsupported content type stays unchanged',()=>assert.equal(run({type:'text/html'}).body,undefined));
test('only ConnectState accepts missing MIME, context route does not',()=>assert.equal(run({route:'context-resolve/v1/spotify:track:76XUZSb13QUuj1HECY4Hvo'}).body,undefined));
test('unknown or malformed protobuf is passed without a fabricated flag',()=>{for(const input of [new Uint8Array([255]),txt(7,'unrelated'),txt(1,uri)])assert.equal(run({input}).body,undefined);});
test('existing true flag needs no output mutation',()=>assert.equal(run({input:expected}).body,undefined));
test('discovery off or sources off preserves response',()=>{for(const args of [{DISCOVER_MISSING:false},{FALLBACK_PROVIDER:'off'}])assert.equal(run({args}).body,undefined);});
test('permission and upstream errors are not rewritten',()=>{for(const status of [401,403,429,500])assert.equal(run({status}).body,undefined);});
test('oversize entry fails open',()=>assert.equal(run({input:new Uint8Array(131073)}).body,undefined));
