import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,createDecipheriv,createHmac} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Settings,b64,utf8,VERSION} from '../src/data.mjs';
import {handle,STORE} from '../src/runtime.mjs';
import {umpInteger,umpFrame,umpFrames,openMetadata,editStream} from '../src/stream.mjs';
import {combine,binary,integer,string,inspect,at,all,opaque,player,guide,ids,captionUrl,translatedCaptions,originalCaptions,homeFirstPage,homeContinuationPage,homeSection,homeAdCard,homeVideoCard,homeContents} from './fixtures.mjs';

const key=Buffer.from(Array.from({length:32},(_,i)=>i)),iv=Buffer.from(Array.from({length:16},(_,i)=>i+32));
const settings=new Settings();
function nodeSeal(plain){const c=createCipheriv('aes-128-ctr',key.subarray(0,16),iv),cipher=Buffer.concat([c.update(plain),c.final()]);return{cipher,mac:createHmac('sha256',key.subarray(16)).update(cipher).update(iv).digest()};}
function nodeOpen(cipher,mac){assert.deepEqual(Buffer.from(mac),createHmac('sha256',key.subarray(16)).update(cipher).update(iv).digest());const d=createDecipheriv('aes-128-ctr',key.subarray(0,16),iv);return Buffer.concat([d.update(cipher),d.final()]);}
function stream25(gzip=false){
  const plain=combine(binary(4,combine(binary(2,player()),opaque)),opaque),sealed=nodeSeal(gzip?gzipSync(plain):plain);
  const payload=combine(binary(1,sealed.cipher),binary(2,sealed.mac),binary(3,iv),integer(4,gzip?1:0),opaque);
  return combine(umpFrame(10,integer(1,25)),umpFrame(11,payload),umpFrame(21,Buffer.from('media data must stay byte-identical')));
}
test('metadata authentication and AES-CTR match independent Node cryptography',()=>{
  const plain=Buffer.from('independent AES and HMAC fixture 中文'),sealed=nodeSeal(plain);assert.deepEqual(Buffer.from(openMetadata(sealed.cipher,sealed.mac,iv,key)),plain);
  const bad=Buffer.from(sealed.mac);bad[0]^=1;assert.throws(()=>openMetadata(sealed.cipher,bad,iv,key),/authentication/);
});
test('UMP framing covers every compact integer boundary and rejects truncation',()=>{
  for(const id of [0,127,128,16383,16384,2097151,2097152,268435455,268435456,4294967295]){const frame=umpFrame(id,Buffer.from('fixture'));assert.equal(umpFrames(frame)[0].type,id);}
  assert.throws(()=>umpFrames(new Uint8Array([128])));assert.throws(()=>umpFrames(new Uint8Array([1,100,2])));assert.throws(()=>umpInteger(-1));
});
for(const gzip of [false,true])test('authenticated watch metadata gzip='+gzip+' removes ads and keeps video frame bytes',()=>{
  const raw=stream25(gzip),fresh=editStream(raw,key,settings),before=umpFrames(raw),after=umpFrames(fresh),payload=after[1].payload;
  const opened=nodeOpen(at(payload,1),at(payload,2)),plain=gzip?gunzipSync(opened):opened,watch=at(plain,4),p=at(watch,2);
  assert.equal(inspect(p).some(f=>[7,45,68].includes(f.id)),false);assert.equal(all(at(at(p,10),51621377),1).length,2);
  assert.deepEqual(Buffer.from(after[2].raw),Buffer.from(before[2].raw));assert.deepEqual(Buffer.from(at(payload,499)),Buffer.from(at(before[1].payload,499)));
});
test('authenticated legacy player envelope is re-signed and preserves unrelated header fields',()=>{
  const plain=combine(integer(1,1),integer(2,200),binary(4,player()),opaque),sealed=nodeSeal(plain),params=combine(binary(4,sealed.mac),binary(5,iv),integer(6,0),opaque);
  const header=combine(integer(1,0),binary(4,params),opaque),raw=combine(umpFrame(10,header),umpFrame(11,sealed.cipher));
  const fresh=umpFrames(editStream(raw,key,settings)),opened=nodeOpen(fresh[1].payload,at(at(fresh[0].payload,4),4));
  assert.equal(inspect(at(opened,4)).some(f=>f.id===45),false);assert.deepEqual(Buffer.from(at(fresh[0].payload,499)),Buffer.from(at(header,499)));
});
test('invalid metadata authentication passes through and clears only this session',async()=>{
  const raw=stream25(),frames=umpFrames(raw),payload=Buffer.from(frames[1].payload);payload[10]^=1;
  const bad=combine(frames[0].raw,umpFrame(11,payload),frames[2].raw),cache={[STORE]:{video:{key:b64(key),encrypted:b64(key),until:Date.now()+60000},music:{key:b64(key),encrypted:b64(key),until:Date.now()+60000}}};
  const result=await handle({url:'https://rr1.googlevideo.com/initplayback?fixture=1',phase:'response',status:200,requestHeaders:{},responseHeaders:{},body:bad,store:{read:k=>cache[k],write:(k,v)=>cache[k]=v}},settings);
  assert.equal(result,null);assert.equal(cache[STORE].video,undefined);assert.ok(cache[STORE].music);assert.deepEqual(bad,combine(frames[0].raw,umpFrame(11,payload),frames[2].raw));
});
test('no key and unsupported ordinary media produce no body or network change',async()=>{
  for(const url of ['https://rr1.googlevideo.com/initplayback?x=1','https://rr1.googlevideo.com/videoplayback?x=1'])assert.equal(await handle({url,phase:'response',status:200,body:stream25(),store:{read:()=>null},download:()=>{throw Error('no request allowed');}},settings),null);
});

const callbackCode=await readFile(new URL('../dist/clients.js',import.meta.url),'utf8');
async function callbackClient(client,body,options={}){
  const qx=client==='QuantumultX',requests=[],completed=[],storage=new Map();
  const context={Uint8Array,ArrayBuffer,DataView,setTimeout,clearTimeout,TextEncoder:undefined,TextDecoder:undefined,
    $request:{url:options.url||'https://youtubei.googleapis.com/youtubei/v1/player',headers:{'User-Agent':'fixture'}},
    $response:options.requestOnly?undefined:{status:200,statusCode:200,headers:{'Content-Type':'application/x-protobuf','Content-Length':'999','Content-Encoding':'gzip',ETag:'old'},...(qx?{bodyBytes:body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength)}:{body})},
    $done:result=>completed.push(result),
    $persistentStore:{read:k=>storage.get(k),write:(v,k)=>storage.set(k,v)},
    $httpClient:{get:(request,done)=>{requests.push(request);done(null,{status:options.downloadStatus||200},utf8(originalCaptions));}},
    $argument:'HIDE_SHORTS=true',
  };
  if(qx){context.$environment={variables:{HIDE_SHORTS:'true'}};context.$task={fetch:async request=>{requests.push(request);return{statusCode:options.downloadStatus||200,bodyBytes:utf8(originalCaptions)};}};context.$prefs={valueForKey:k=>storage.get(k),setValueForKey:(v,k)=>storage.set(k,v)};}
  if(options.argument)context.$argument=options.argument;
  if(options.noClearTimeout){delete context.clearTimeout;context.setTimeout=(fn,ms)=>setTimeout(fn,ms).unref();}
  vm.runInNewContext(callbackCode,context,{timeout:3000});
  for(let i=0;i<30&&!completed.length;i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(completed.length,1);return{result:completed[0],requests};
}
for(const client of ['Surge','Loon','Shadowrocket','QuantumultX'])test(client+' bundled adapter handles binary arrays without host text codecs',async()=>{
  const {result}=await callbackClient(client,player()),body=client==='QuantumultX'?new Uint8Array(result.bodyBytes):result.body;
  assert.equal(inspect(body).some(f=>f.id===45),false);assert.equal(result.headers['Content-Length'],undefined);assert.equal(result.headers['Content-Encoding'],undefined);assert.equal(result.headers.ETag,undefined);assert.equal(result.headers['X-YouTubeClean'],VERSION);
});
for(const client of ['Surge','QuantumultX'])test(client+' bundled adapter returns malformed response without edits',async()=>{
  const {result}=await callbackClient(client,new Uint8Array([0,0,0]));assert.deepEqual(Object.keys(result),[]);
});
test('Quantumult X variables hide both bottom buttons even with binary bodyBytes',async()=>{
  const {result}=await callbackClient('QuantumultX',guide(),{url:'https://youtubei.googleapis.com/youtubei/v1/guide'});assert.deepEqual(ids(new Uint8Array(result.bodyBytes)),['FEwhat_to_watch','FEsubscriptions','FElibrary']);
});
for(const client of ['Surge','QuantumultX'])test(client+' subtitle download failure retains the translated response',async()=>{
  const {result,requests}=await callbackClient(client,utf8(translatedCaptions),{url:captionUrl+'&tlang=zh-Hans',downloadStatus:429});assert.deepEqual(Object.keys(result),[]);assert.equal(requests.length,1);assert.equal(requests[0].url,captionUrl);
});
const egern=(await import('../dist/egern.js')).default;
function egernContext(body,extra={}){let consumed=0;return{env:{HIDE_SHORTS:'true'},request:{url:'https://youtubei.googleapis.com/youtubei/v1/player',headers:new Headers()},response:{status:200,headers:new Headers({'Content-Type':'application/x-protobuf'}),arrayBuffer:async()=>{assert.equal(consumed++,0);return body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength);}},storage:{getJSON:()=>null,setJSON:()=>{}},http:{get:()=>{throw Error('unexpected connection');}},...extra};}
test('Egern ESM bundle consumes the Fetch response once and returns Uint8Array',async()=>{
  const result=await egern(egernContext(player()));assert.ok(result.body instanceof Uint8Array);assert.equal(inspect(result.body).some(f=>f.id===45),false);assert.equal(result.headers.get('X-YouTubeClean'),VERSION);
});
test('Egern restores every original byte when body parsing fails after Fetch consumption',async()=>{
  const body=new Uint8Array([0,0,0]),result=await egern(egernContext(body));assert.deepEqual(result.body,body);assert.equal(result.headers,undefined);
});
test('Egern subtitle request omits cookies and rejects redirects with TLS validation on',async()=>{
  const requests=[],context=egernContext(utf8(translatedCaptions));context.request.url=captionUrl+'&tlang=zh-Hans';context.http.get=async(url,options)=>{requests.push({url,options});return{status:200,headers:new Headers(),arrayBuffer:async()=>utf8(originalCaptions).buffer};};
  const result=await egern(context);assert.match(Buffer.from(result.body).toString(),/An original/);assert.equal(requests[0].options.credentials,'omit');assert.equal(requests[0].options.redirect,'error');assert.equal(requests[0].options.insecureTls,false);
});
for(const [kind,make]of [['first',homeFirstPage],['continuation',homeContinuationPage]])test('Loon deployed bundle removes '+kind+' home ad cards with native object arguments',async()=>{
  const normal=homeSection([homeVideoCard('keep real video')]),body=make([homeSection([homeAdCard()]),normal]);
  const {result}=await callbackClient('Loon',body,{url:'https://youtubei.googleapis.com/youtubei/v1/browse?prettyPrint=false',argument:{REMOVE_ADS:true,TRANSLATE_CAPTIONS:false,HIDE_UPLOAD:false,HIDE_SHORTS:false},noClearTimeout:true});
  assert.deepEqual(homeContents(result.body,kind).map(Buffer.from),[Buffer.from(normal)]);
});
test('Loon caption completion does not require an unavailable clearTimeout API',async()=>{
  const {result}=await callbackClient('Loon',utf8(translatedCaptions),{url:captionUrl+'&tlang=zh-Hans',noClearTimeout:true});assert.match(Buffer.from(result.body).toString(),/An original/);
});
