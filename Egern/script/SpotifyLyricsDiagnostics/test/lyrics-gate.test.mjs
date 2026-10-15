import test from 'node:test';
import assert from 'node:assert/strict';
import diagnose,{nativeLyricGate,LYRICS_GATE_URL,batchKinds} from '../spotify-lyrics-diagnostics-2.js';
const gate='enable_has_lyrics_check_bypass',scope='ios-feature-lyrics';
const cat=(...xs)=>Buffer.concat(xs);
// Independent test encoder and reader; do not generate inputs with production helpers.
function vi(n){let v=BigInt(n),out=[];do{const x=Number(v&127n);v>>=7n;out.push(x|(v?128:0));}while(v);return Buffer.from(out);}
const num=(n,v)=>cat(vi(n*8),vi(v));
const bin=(n,b)=>cat(vi(n*8+2),vi(b.length),b);
const str=(n,s)=>bin(n,Buffer.from(s));
function read(bytes){const b=Buffer.from(bytes),out=[];let at=0;function v(){let n=0n,s=0n,x;do{x=b[at++];n|=BigInt(x&127)<<s;s+=7n;}while(x&128);return Number(n);}while(at<b.length){const begin=at,k=v(),no=k>>3,wire=k&7;let value,payload;if(wire===0)value=v();else if(wire===2){const len=v();payload=b.subarray(at,at+len);at+=len;}else at+=wire===1?8:4;out.push({no,wire,value,payload,raw:b.subarray(begin,at)});}return out;}
function assignment(name, value=0, namespace=scope, other=Buffer.alloc(0)){
  return bin(3,cat(bin(1,cat(str(1,namespace),str(2,name))),bin(2,cat(num(1,77),str(2,'keep-realm'))),bin(3,cat(...(value===0?[]:[num(1,value)]),str(78,'keep-bool-unknown'))),str(90,'keep-assignment-unknown'),other));
}
function configuration({targets=[assignment(gate)],namespace=scope}={}){
  return cat(str(1,'self-written-assignment-id'),num(2,1000),assignment('enable_lyrics',1,namespace),assignment('keep_other_flag',0,'some-other-scope'),...targets,str(91,'keep-configuration-unknown'));
}
function wrap(bytes,depth){let b=bytes;for(let i=0;i<depth;i++)b=cat(bin(1,b),...(i===1?[bin(3,cat(str(1,'opaque-account-attributes'),str(2,'keep-existing-values')))]:[]),str(90+i,'keep-wrapper-'+i));return b;}
function unwrap(bytes,depth){let b=bytes;for(let i=0;i<depth;i++)b=read(b).find(f=>f.no===1).payload;return b;}
function targetEntries(bytes){return read(bytes).filter(f=>f.no===3).filter(f=>{const id=read(read(f.payload).find(v=>v.no===1).payload);return id.find(v=>v.no===1).payload.toString()===scope&&id.find(v=>v.no===2).payload.toString()===gate;});}
function value(entry){const b=read(entry.payload).find(f=>f.no===3);return read(b.payload).find(f=>f.no===1)?.value??0;}
function ctx(body,{status=200,env={},headers={},type='application/x-protobuf',url='https://spclient.wg.spotify.com/v1/customize'}={}){
  const store=new Map(),notifications=[];
  return {notifications,store,env:{TRANSLATION_ENABLED:'false',...env},request:{url,headers:new Headers(headers)},response:new Response(body,{status,headers:{'Content-Type':type}}),
    storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},notify:n=>notifications.push(n),http:{get(){throw Error('no network expected');}}};
}
for(const depth of [0,1,2,3])test('exact lyric boolean is enabled at supported configuration depth '+depth+' with all other bytes preserved',()=>{
  const input=wrap(configuration(),depth),result=nativeLyricGate(input);assert.equal(result.changed,true);assert.equal(result.updated,1);assert.equal(result.added,0);assert.equal(result.depth,depth);
  const before=read(unwrap(input,depth)),after=read(unwrap(result.body,depth)),oldTarget=targetEntries(unwrap(input,depth))[0],newTarget=targetEntries(unwrap(result.body,depth))[0];
  assert.equal(value(newTarget),1);
  assert.deepEqual(before.filter(f=>!f.raw.equals(oldTarget.raw)).map(f=>f.raw),after.filter(f=>!f.raw.equals(newTarget.raw)).map(f=>f.raw));
  assert.deepEqual(read(oldTarget.payload).filter(f=>f.no!==3).map(f=>f.raw),read(newTarget.payload).filter(f=>f.no!==3).map(f=>f.raw));
  let a=input,b=Buffer.from(result.body);for(let i=0;i<depth;i++){const aa=read(a),bb=read(b);assert.deepEqual(aa.filter(f=>f.no!==1).map(f=>f.raw),bb.filter(f=>f.no!==1).map(f=>f.raw));a=aa.find(f=>f.no===1).payload;b=bb.find(f=>f.no===1).payload;}
});
test('known compiled iOS lyric property can be added when omitted, without changing any prior assignment',()=>{
  const input=configuration({targets:[]}),result=nativeLyricGate(input);assert.equal(result.added,1);assert.equal(result.updated,0);assert.equal(targetEntries(result.body).length,1);assert.equal(value(targetEntries(result.body)[0]),1);
  assert.deepEqual(read(result.body).slice(0,-1).map(f=>f.raw),read(input).map(f=>f.raw));
});
test('already enabled configuration is retained byte-for-byte and not marked changed',()=>{
  const input=wrap(configuration({targets:[assignment(gate,1)]}),3),result=nativeLyricGate(input);assert.equal(result.changed,false);assert.deepEqual(Buffer.from(result.body),input);
});
test('all valid duplicate target assignments agree after the change',()=>{
  const result=nativeLyricGate(configuration({targets:[assignment(gate),assignment(gate,1),assignment(gate)]}));assert.equal(result.updated,2);assert.equal(result.matched,3);assert.deepEqual(targetEntries(result.body).map(value),[1,1,1]);
});
test('a lookalike namespace never enables the gate for web or another platform',()=>{
  for(const namespace of ['web-feature-lyrics','ios-feature-lyrics-copy','android-feature-lyrics']){
    const input=configuration({namespace,targets:[assignment(gate,0,namespace)]}),r=nativeLyricGate(input);assert.equal(r.changed,false);assert.equal(r.unsupported,true);assert.deepEqual(Buffer.from(r.body),input);
  }
});
for(const target of [assignment(gate,2),assignment(gate,0,scope,num(4,1)),bin(3,cat(bin(1,cat(str(1,scope),str(2,gate))),bin(3,str(1,'wrong wire'))))])test('malformed target values cannot be rewritten: '+target.toString('hex').slice(-20),()=>{
  assert.throws(()=>nativeLyricGate(configuration({targets:[target]})),/lyrics-gate-/);
});
test('error envelopes and unknown data are preserved without scanning or modifying arbitrary payloads',()=>{
  for(const input of [bin(2,cat(num(1,403),str(2,'error'))),cat(bin(1,wrap(configuration(),2)),bin(2,str(1,'error-oneof'))),str(88,gate)]){
    const r=nativeLyricGate(input);assert.equal(r.changed,false);assert.deepEqual(Buffer.from(r.body),input);
  }
});
test('request cache handling includes only the exact Spotify configuration endpoint and retains credentials',async()=>{
  const c=ctx('unused',{headers:{Authorization:'Bearer TEST_ONLY','If-None-Match':'old','If-Modified-Since':'old','Accept-Encoding':'br'}});delete c.response;
  const r=await diagnose(c);assert.equal(r.headers.get('If-None-Match'),null);assert.equal(r.headers.get('If-Modified-Since'),null);assert.equal(r.headers.get('Accept-Encoding'),'identity');assert.equal(r.headers.get('Authorization'),'Bearer TEST_ONLY');
  assert.ok(LYRICS_GATE_URL.test(c.request.url+'?platform=iphone'));assert.ok(LYRICS_GATE_URL.test(c.request.url.replace('.com/','.com:443/')));
  for(const url of [c.request.url+'/other',c.request.url.replace('spotify.com','spotify.com.evil.test'),c.request.url.replace('https:','http:'),'https://accounts.spotify.com/v1/customize'])assert.equal(LYRICS_GATE_URL.test(url),false);
});
test('a configuration hit yields a copyable gate result and strips obsolete cache validators',async()=>{
  const c=ctx(wrap(configuration({targets:[]}),3));c.response.headers.set('ETag','old');c.response.headers.set('Content-Length','123');
  const r=await diagnose(c);assert.equal(r.headers.get('ETag'),null);assert.equal(r.headers.get('Content-Length'),null);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(value(targetEntries(unwrap(r.body,3))[0]),1);
  assert.equal(c.notifications.length,1);assert.match(c.notifications[0].action.text,/lyrics-gate/);assert.match(c.notifications[0].body,/新增 1/);assert.doesNotMatch(c.notifications[0].action.text,/opaque-account-attributes|self-written-assignment-id/);
});
for(const status of [304,401,403,429,500])test('configuration HTTP '+status+' is left unchanged and reported',async()=>{
  const c=ctx(status===304?null:'upstream error',{status});const r=await diagnose(c);assert.equal(r,undefined);assert.equal(c.response.bodyUsed,false);assert.ok(c.notifications[0].action.text.includes(String(status)));
});
test('disabled discovery or provider leaves the native gate and request validators alone',async()=>{
  for(const env of [{DISCOVER_MISSING:'false'},{FALLBACK_PROVIDER:'off'}]){
    const input=configuration(),c=ctx(input,{env});assert.equal(await diagnose(c),undefined);assert.equal(c.response.bodyUsed,false);
    delete c.response;c.request.headers.set('If-None-Match','keep');assert.equal(await diagnose(c),undefined);assert.equal(c.request.headers.get('If-None-Match'),'keep');
  }
});
test('unadapted JSON configuration passes through without changing feature or account fields',async()=>{
  const input=JSON.stringify({configuration:{scope,property:gate,value:false},account:{opaque:'keep'}}),c=ctx(input,{type:'application/json'}),r=await diagnose(c);assert.equal(Buffer.from(r.body).toString(),input);assert.equal(r.headers,undefined);assert.match(c.notifications[0].body,/JSON/);
});
test('zero track records can describe non-track extension kinds, and diagnostics reports the kinds without another body read',async()=>{
  const input=cat(bin(2,cat(num(2,5),bin(3,str(99,'opaque-audio-data')))),bin(2,num(2,23)));assert.deepEqual(batchKinds(input),[5,23]);
  const c=ctx(input,{url:'https://spclient.wg.spotify.com/extended-metadata/v0/extended-metadata'}),readOnce=c.response.arrayBuffer.bind(c.response);let reads=0;c.response.arrayBuffer=()=>{reads++;return readOnce();};
  const r=await diagnose(c);assert.deepEqual(Buffer.from(r.body),input);assert.equal(reads,1);assert.match(c.notifications[0].action.text,/扩展类型 5,23/);assert.match(c.notifications[0].action.text,/缓存 0/);assert.doesNotMatch(c.notifications[0].action.text,/opaque-audio-data/);
});
