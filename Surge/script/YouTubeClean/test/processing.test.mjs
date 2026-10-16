import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createCipheriv,createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Settings,b64,MAX_BODY,VERSION} from '../src/data.mjs';
import {handle,STORE} from '../src/runtime.mjs';
import {umpFrame,umpFrames} from '../src/stream.mjs';
import {unpackHttp} from '../src/body.mjs';
import {combine,binary,integer,string,player,at,inspect,opaque,homeFirstPage,homeContinuationPage,homeSection,homeAdCard,homeVideoCard,homeContents} from './fixtures.mjs';

const key=Buffer.from(Array.from({length:32},(_,i)=>i+1)),iv=Buffer.alloc(16,7);
const settings=new Settings({TRANSLATE_CAPTIONS:false,DEEP_FILTER:true,PROFILE:'deep'});
function encrypted(){
  const plain=binary(4,binary(2,player())),cipher=createCipheriv('aes-128-ctr',key.subarray(0,16),iv);
  const data=Buffer.concat([cipher.update(plain),cipher.final()]),mac=createHmac('sha256',key.subarray(16)).update(data).update(iv).digest();
  return combine(umpFrame(10,integer(1,25)),umpFrame(11,combine(binary(1,data),binary(2,mac),binary(3,iv))));
}
function context(body,extra={}){
  const reports=[],cache={};
  return {reports,cache,io:{phase:'response',status:200,url:'https://youtubei.googleapis.com/youtubei/v1/browse?key=PRIVATE_QUERY',requestHeaders:{Authorization:'PRIVATE_AUTH',Cookie:'PRIVATE_COOKIE'},responseHeaders:{},body,store:{read:k=>cache[k],write:(k,v)=>cache[k]=v},report:r=>reports.push(r),...extra}};
}
for(const [page,make]of [['first',homeFirstPage],['continuation',homeContinuationPage]])test('raw HTTP gzip '+page+' filters home ads while preserving ordinary protobuf content',async()=>{
  const keep=homeSection([homeVideoCard('ordinary fixture')]),plain=make([homeSection([homeAdCard()]),keep]),packed=gzipSync(plain),c=context(packed,{responseHeaders:{'Content-Encoding':'gzip'}});
  const result=await handle(c.io,settings);assert.ok(result?.body);assert.deepEqual(homeContents(result.body,page).map(Buffer.from),[keep]);
  assert.equal(c.reports.length,1);assert.equal(c.reports[0].compression,'gzip');assert.equal(c.reports[0].reason,'modified');assert.equal(c.reports[0].feedCards,2);
});
test('an already decoded response with a stale gzip header is processed directly',async()=>{
  const c=context(homeFirstPage([homeSection([homeAdCard()])]),{responseHeaders:{'Content-Encoding':'gzip'}}),r=await handle(c.io,settings);
  assert.ok(r?.body);assert.equal(c.reports[0].compression,'none');assert.equal(homeContents(r.body,'first').length,0);
});
test('unchanged gzip remains byte-identical, and corrupt/truncated gzip is bypassed',async()=>{
  const normal=gzipSync(homeFirstPage([homeSection([homeVideoCard('normal')])])),c=context(normal);
  assert.equal(await handle(c.io,settings),null);assert.equal(c.reports[0].reason,'unchanged');
  const badCrc=Buffer.from(normal),badSize=Buffer.from(normal);badCrc[badCrc.length-8]^=1;badSize[badSize.length-4]^=1;
  for(const broken of [normal.subarray(0,12),badCrc,badSize]){
    const failed=context(broken);assert.equal(await handle(failed.io,settings),null);assert.equal(failed.reports[0].reason,'decode-failed');assert.equal(failed.reports[0].removedParts,0);
  }
});
test('gzip expansion limit and unsupported concatenated members preserve input',()=>{
  assert.throws(()=>unpackHttp(gzipSync(Buffer.alloc(2048)),1024),/body too large/);
  const a=gzipSync(Buffer.from('first member')),b=gzipSync(Buffer.from('second member'));
  assert.throws(()=>unpackHttp(combine(a,b),1024),/gzip/);
  // A false ISIZE cannot bypass the streaming expansion budget.
  const falseSize=gzipSync(Buffer.alloc(1024*1024));falseSize.writeUInt32LE(1,falseSize.length-4);
  assert.throws(()=>unpackHttp(falseSize,1024),/body too large/);
});
test('clear UMP player metadata removes ads without requiring a session key and preserves media bytes',async()=>{
  const envelope=combine(integer(1,1),integer(2,200),binary(4,player()),opaque),media=umpFrame(21,Buffer.alloc(1497000,87));
  const raw=combine(umpFrame(10,integer(1,0)),umpFrame(11,envelope),media),c=context(raw,{url:'https://rr3---sn-fixture.googlevideo.com/initplayback?cpn=PRIVATE_CPN&id=PRIVATE_ID'});
  const r=await handle(c.io,settings);assert.ok(r?.body);const frames=umpFrames(r.body);
  assert.equal(inspect(at(frames[1].payload,4)).some(f=>[7,45,68].includes(f.id)),false);assert.deepEqual(Buffer.from(frames[2].raw),Buffer.from(media));
  assert.equal(c.reports.length,1);assert.equal(c.reports[0].endpoint,'initplayback');assert.equal(c.reports[0].reason,'modified');assert.equal(c.reports[0].keyState,'missing');assert.equal(c.reports[0].changedMetadataParts,1);
  assert.ok(!/PRIVATE_|https:|Authorization|Cookie/.test(JSON.stringify(c.reports)));
});
for(const state of ['missing','expired','invalid'])test('encrypted UMP produces an explicit '+state+' key diagnostic without rewriting the data',async()=>{
  const raw=encrypted(),c=context(raw,{url:'https://rr3.googlevideo.com/initplayback?private=PRIVATE_STREAM'});
  if(state!=='missing')c.cache[STORE]={video:{key:state==='invalid'?'invalid':b64(key),until:Date.now()+(state==='expired'?-1:60000)}};
  assert.equal(await handle(c.io,settings),null);assert.equal(c.reports.length,1);assert.equal(c.reports[0].reason,'key-'+state);assert.equal(c.reports[0].metadataParts,1);assert.equal(c.reports[0].changed,false);
});
test('framing errors keep a valid session while an authentication failure invalidates only that session',async()=>{
  const c=context(new Uint8Array([10,255]),{url:'https://rr3.googlevideo.com/initplayback'});
  c.cache[STORE]={video:{key:b64(key),until:Date.now()+60000},music:{key:b64(key),until:Date.now()+60000}};
  assert.equal(await handle(c.io,settings),null);assert.equal(c.reports[0].reason,'decode-failed');assert.ok(c.cache[STORE].video);
  const raw=encrypted(),frames=umpFrames(raw),payload=Buffer.from(frames[1].payload);payload[payload.length-2]^=1;
  c.io.body=combine(frames[0].raw,umpFrame(11,payload));c.reports.length=0;
  assert.equal(await handle(c.io,settings),null);assert.equal(c.reports[0].reason,'stream-auth-failed');assert.equal(c.reports[0].removedParts,0);assert.equal(c.cache[STORE].video,undefined);assert.ok(c.cache[STORE].music);
});
test('a media-only UMP response reports no target metadata and ordinary videoplayback is excluded',async()=>{
  const body=combine(umpFrame(20,binary(1,opaque)),umpFrame(21,Buffer.from('media fixture'))),c=context(body,{url:'https://rr3.googlevideo.com/initplayback'});
  assert.equal(await handle(c.io,settings),null);assert.equal(c.reports[0].reason,'no-target-metadata');
  c.io.url='https://rr3.googlevideo.com/videoplayback';c.reports.length=0;
  assert.equal(await handle(c.io,settings),null);assert.equal(c.reports.length,0);
});
test('startup browse and guide refresh missing hot config while keeping valid sessions and account headers',async()=>{
  for(const endpoint of ['browse','guide']){
    const c=context(undefined,{phase:'request',url:'https://youtubei.googleapis.com/youtubei/v1/'+endpoint,requestHeaders:{'X-YouTube-Hot-Hash-Data':'PRIVATE_HASH',Authorization:'PRIVATE_AUTH'}});
    const r=await handle(c.io,settings);assert.equal(r.headers['X-YouTube-Hot-Hash-Data'],undefined);assert.equal(r.headers.Authorization,'PRIVATE_AUTH');assert.equal(c.reports[0].reason,'request-updated');
    c.cache[STORE]={video:{key:b64(key),until:Date.now()+60000}};
    const cached=await handle(c.io,settings);assert.equal(cached.headers['X-YouTube-Hot-Hash-Data'],'PRIVATE_HASH');
  }
});
test('raw gzip hot config populates the local key cache and enables authenticated UMP editing',async()=>{
  const hot=binary(138536474,binary(146311580,combine(binary(1,key),binary(2,Buffer.from('encrypted-fixture')),integer(3,3600))));
  const c=context(gzipSync(binary(1,binary(16,binary(7,hot)))));
  assert.equal(await handle(c.io,settings),null);assert.equal(c.reports[0].keySaved,true);assert.equal(c.cache[STORE].video.key,b64(key));
  c.io.url='https://rr3.googlevideo.com/initplayback';c.io.body=encrypted();c.reports.length=0;
  assert.ok((await handle(c.io,settings))?.body);assert.equal(c.reports[0].keyState,'available');assert.equal(c.reports[0].reason,'modified');assert.ok(!JSON.stringify(c.reports).includes(b64(key)));
});
for(const [label,body,extra,reason]of [['HTTP error',opaque,{status:503},'http-status'],['missing body',undefined,{},'body-representation'],['empty',new Uint8Array(),{},'empty-body'],['oversize',new Uint8Array(MAX_BODY+1),{},'body-too-large']])test('diagnostics identify '+label+' with one sanitized result',async()=>{
  const c=context(body,extra);assert.equal(await handle(c.io,settings),null);assert.equal(c.reports.length,1);assert.equal(c.reports[0].reason,reason);assert.equal(c.reports[0].version,VERSION);
});
test('diagnostics can be disabled and a null Loon argument uses normal defaults',async()=>{
  const c=context(new Uint8Array([0]));await handle(c.io,new Settings({DIAGNOSTICS:false}));assert.equal(c.reports.length,0);assert.equal(new Settings(null).ads,true);
});
const bundle=await readFile(new URL('../dist/clients.js',import.meta.url),'utf8');
test('deployed Loon bundle reports encrypted no-key initplayback instead of a silent completion',async()=>{
  const logs=[];let finish,calls=0;const done=new Promise(resolve=>finish=resolve),body=encrypted();
  vm.runInNewContext(bundle,{Uint8Array,Uint32Array,ArrayBuffer,DataView,setTimeout,$argument:{PROFILE:'deep',DEEP_FILTER:true},$request:{url:'https://rr3.googlevideo.com/initplayback?private=PRIVATE_QUERY',headers:{}},$response:{status:200,headers:{},body},$persistentStore:{read:()=>null,write:()=>true},console:{log:s=>logs.push(s)},$done:r=>{calls++;finish(r);}},{timeout:3000});
  const result=await done;assert.equal(calls,1);assert.equal(Object.keys(result).length,0);assert.equal(logs.length,1);assert.ok(logs[0].startsWith('[YouTubeClean] '));const report=JSON.parse(logs[0].slice(15));assert.equal(report.endpoint,'initplayback');assert.equal(report.reason,'key-missing');assert.equal(report.profile,'deep');
});
test('a malformed script argument produces a sanitized adapter failure without exposing its input',async()=>{
  const logs=[];let finish,calls=0;const done=new Promise(resolve=>finish=resolve);
  vm.runInNewContext(bundle,{Uint8Array,Uint32Array,ArrayBuffer,DataView,setTimeout,$argument:'{"PRIVATE_INPUT":',$request:{url:'https://youtubei.googleapis.com/youtubei/v1/browse?private=PRIVATE_QUERY',headers:{}},$response:{status:200,headers:{},body:opaque},console:{log:s=>logs.push(s)},$done:r=>{calls++;finish(r);}},{timeout:3000});
  await done;assert.equal(calls,1);assert.equal(logs.length,1);assert.ok(logs[0].includes('adapter-error'));assert.ok(!logs[0].includes('PRIVATE_'));
});
