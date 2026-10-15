import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseDocument} from './core/spotify-lyrics.js';
const clients = ['Surge','Loon','Shadowrocket','QuantumultX'];
const id = '0000000000000000000001', hex = '00000000000000000000000000000001';
const lyricURL = `https://spclient.wg.spotify.com/color-lyrics/v2/track/${id}`;
const vi = n => {const b=[];do {b.push((n&127)|(n>127?128:0));n=Math.floor(n/128);} while(n);return Buffer.from(b);};
const cat = (...v) => Buffer.concat(v);
const num = (n,v) => cat(vi(n*8),vi(v));
const bin = (n,v) => cat(vi(n*8+2),vi(v.length),v);
const txt = (n,v) => bin(n,Buffer.from(v));
const meta = cat(bin(1,Buffer.from(hex,'hex')),txt(2,'Paper Lantern'),bin(3,txt(2,'Quiet Walk')),bin(4,txt(2,'Ada North')),num(7,360000),num(18,0),txt(101,'unknown-metadata'));
const words = ['The paper lantern floats away.', 'A quiet light above the bay.'];
const lyrics = () => ({lyrics:{syncType:'LINE_SYNCED',provider:'Musixmatch',providerDisplayName:'Original',language:'en',lines:words.map((words,i)=>({startTimeMs:String(1000+i*2000),endTimeMs:'0',words,syllables:[]})),alternatives:[{language:'zh-CN',lines:['official-one','official-two']},{language:'ja',lines:['official-three','official-four']}]},colors:{background:-1,text:-1,highlightText:-1},extra:'keep'});
// Independent protobuf fixture, including original timing and unknown bytes.
const proto = cat(bin(1,cat(num(1,2),...words.map((w,i)=>bin(2,cat(num(1,1000+i*2000),txt(2,w)))),txt(3,'Musixmatch'),txt(10,'en'),bin(9,cat(txt(1,'ja'),txt(2,'official-one'),txt(2,'official-two'))),bin(91,Buffer.from([255,0,254])))),num(3,1),txt(101,'outer-unknown'));
const record = {trackName:'Paper Lantern',albumName:'Quiet Walk',artistName:'Ada North',duration:180,syncedLyrics:'[00:01.00]The paper lantern floats away.\n[00:03.00]A quiet light above the bay.'};
const translated = url => JSON.stringify(new URL(url).searchParams.getAll('q').map((s,i)=>['自有译文'+i,'en']));
async function host(client,{url=lyricURL,stage='response',status=200,body=JSON.stringify(lyrics()),type='application/json',headers={},requestHeaders={},args,store=new Map(),network,bodyOffset=false}={}) {
  const calls=[], done=[], timers=[];
  let resolveDone;
  const completed = new Promise(r=>resolveDone=r);
  const input = typeof body === 'string'?Buffer.from(body):Buffer.from(body);
  const slab = cat(Buffer.from([255,254]),input,Buffer.from([253]));
  const inputBytes = bodyOffset?new Uint8Array(slab.buffer,slab.byteOffset+2,input.length):new Uint8Array(input);
  function rawHeaders(value) {return value;}
  const req={$request:{url,method:'GET',headers:rawHeaders({Accept:type,'authorization':'Bearer fake-test-only',...requestHeaders})}};
  if (stage==='response') req.$response=client==='QuantumultX'?{statusCode:status,headers:{'Content-Type':type,...headers},bodyBytes:inputBytes.buffer.slice(inputBytes.byteOffset,inputBytes.byteOffset+inputBytes.byteLength)}:{status,headers:{'Content-Type':type,...headers},body:inputBytes};
  if (stage==='none') delete req.$request;
  const context = {...req,console:{log:()=>{throw Error('unexpected log');}},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},$done:v=>{done.push(v);resolveDone(v);}};
  if(args!==undefined){if(client==='QuantumultX')context.$environment={variables:typeof args==='object'?args:undefined,sourcePath:'https://example.invalid/script.js#'+(typeof args==='string'?args:'')};else context.$argument=args;}
  function fetchFixture(options,method) {
    calls.push({options,method});
    if(network) return network(options.url,options,method);
    if(options.url.startsWith('https://translate.googleapis.com/'))return {status:200,body:translated(options.url)};
    throw Error('unexpected endpoint');
  }
  if(client==='QuantumultX') {
    context.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>{store.set(k,v);return true;}};
    context.$task={fetch:async o=>{const r=await fetchFixture(o,o.method);const b=Buffer.from(r.body??'');return {statusCode:r.status,headers:r.headers??{},bodyBytes:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};}};
  } else {
    context.$persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};
    context.$httpClient=Object.fromEntries(['get','post'].map(method=>[method,(o,cb)=>{
      Promise.resolve().then(()=>fetchFixture(o,method.toUpperCase())).then(r=>cb(null,{status:r.status,headers:r.headers??{}},new Uint8Array(Buffer.from(r.body??''))),()=>cb('fixture error'));
    }]));
  }
  const code=readFileSync(new URL(`./runtime/${client}/script/SpotifyLyrics.js`,import.meta.url),'utf8');
  vm.runInNewContext(code,context,{timeout:1000});
  const result=await Promise.race([completed,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('missing $done')),1500);t.unref();})]);
  // All outstanding timers must be harmless after completion.
  for(const t of timers)t.fn();
  await Promise.resolve();
  assert.equal(done.length,1,'exactly one $done');
  return {result,calls,store,input,timers,context};
}
const outputBytes = (client,r) => Buffer.from(client==='QuantumultX'?r.bodyBytes:r.body);
for(const client of clients){
  test(`${client}: request cache headers and binary accept`,async()=>{
    const x=await host(client,{stage:'request',type:'*/*',requestHeaders:{'if-none-match':'tag','If-Modified-Since':'yesterday','accept-encoding':'gzip'}});
    const h=Object.fromEntries(Object.entries(x.result.headers).map(([k,v])=>[k.toLowerCase(),v]));
    assert.equal(h.accept,'application/x-protobuf');assert.equal(h['accept-encoding'],'identity');assert.equal(h['cache-control'],'no-cache');assert.equal(h['if-none-match'],undefined);assert.equal(h.authorization,'Bearer fake-test-only');assert.equal(x.calls.length,0);
  });
  test(`${client}: native JSON translations replace every official alternative`,async()=>{
    const x=await host(client,{headers:{'Content-Length':'1','Content-Encoding':'gzip',ETag:'old','Set-Cookie':['a=1','b=2']}});
    const out=JSON.parse(outputBytes(client,x.result));
    assert.deepEqual(out.lyrics.lines,lyrics().lyrics.lines);assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['自有译文0','自有译文1']}]);assert.equal(out.extra,'keep');
    assert.deepEqual([...x.result.headers['Set-Cookie']],['a=1','b=2']);assert.equal(x.result.headers['Content-Length'],undefined);assert.equal(x.result.headers['Content-Encoding'],undefined);
    assert.equal(x.calls.length,1);assert.equal(x.calls[0].options.headers.authorization,undefined);assert.equal(x.calls[0].options.headers['client-token'],undefined);
    const opt=x.calls[0].options;
    if(client==='QuantumultX')assert.deepEqual(JSON.parse(JSON.stringify(opt.opts)),{redirection:false,'auto-cookie':false,'skip-cert-verify':false});
    else {assert.equal(opt['binary-mode'],true);assert.equal(opt['auto-redirect'],false);assert.equal(opt['auto-cookie'],false);assert.equal(opt.insecure,false);assert.equal(opt.timeout,client==='Loon'?5500:5.5);}
    assert.equal(JSON.stringify([...x.store]).includes('Bearer fake-test-only'),false);
  });
  test(`${client}: protobuf and nonzero buffer offset preserve original words`,async()=>{
    const x=await host(client,{type:'application/x-protobuf',body:proto,bodyOffset:true,args:{TARGET_LANGUAGE:'zh-TW'}});
    const out=outputBytes(client,x.result),doc=parseDocument(out,'application/x-protobuf');
    assert.deepEqual(doc.words,words);assert.ok(out.includes(Buffer.from('outer-unknown')));assert.ok(out.includes(Buffer.from([255,0,254])));assert.ok(out.includes(Buffer.from('zh-TW')));assert.ok(out.includes(Buffer.from('自有译文0')));assert.ok(!out.includes(Buffer.from('official-one')));
  });
  test(`${client}: metadata response cache is shared with a later 404`,async()=>{
    const store=new Map();
    const a=await host(client,{url:`https://spclient.wg.spotify.com/metadata/4/track/${hex}`,body:meta,type:'application/x-protobuf',store});
    assert.equal(a.calls.length,0);assert.ok(outputBytes(client,a.result).includes(txt(101,'unknown-metadata')));
    const x=await host(client,{status:404,body:'missing',type:'*/*',store,args:'TRANSLATION_ENABLED=false&FALLBACK_PROVIDER=lrclib',network:(url)=>{assert.ok(url.startsWith('https://lrclib.net/'));return {status:200,body:JSON.stringify([record])};}});
    assert.equal(x.result.status,client==='QuantumultX'?'HTTP/1.1 200 OK':200);assert.deepEqual(parseDocument(outputBytes(client,x.result),'application/x-protobuf').words,words);assert.equal(x.calls.length,1);
  });
  test(`${client}: uncached metadata HTTP stays binary and credentials stay on Spotify`,async()=>{
    const x=await host(client,{status:404,body:'{}',args:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:'lrclib'},network:(url,o)=>{
      if(url.includes('/metadata/4/track/')){assert.equal(o.headers.authorization??o.headers.Authorization,'Bearer fake-test-only');return {status:200,headers:{'Content-Type':'application/x-protobuf'},body:meta};}
      assert.ok(url.startsWith('https://lrclib.net/'));assert.equal(Object.keys(o.headers).some(k=>/authorization|client-token|cookie/i.test(k)),false);return {status:200,body:JSON.stringify([record])};
    }});
    assert.equal(x.calls.length,2);assert.equal(x.result.status,client==='QuantumultX'?'HTTP/1.1 200 OK':200);
  });
  test(`${client}: all processing disabled preserves bytes and makes no calls`,async()=>{
    const x=await host(client,{args:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:'off',DISCOVER_MISSING:false}});assert.equal(Object.keys(x.result).length,0);assert.equal(x.calls.length,0);
  });
  test(`${client}: failing translator removes official alternatives`,async()=>{
    const x=await host(client,{network:()=>{throw Error('offline');}});const out=JSON.parse(outputBytes(client,x.result));assert.deepEqual(out.lyrics.lines,lyrics().lyrics.lines);assert.deepEqual(out.lyrics.alternatives,[]);
  });
  for(const status of [401,403,429,500,503])test(`${client}: preserves HTTP ${status}`,async()=>{
    const x=await host(client,{status,body:'server error'});assert.equal(Object.keys(x.result).length,0);assert.equal(x.calls.length,0);
  });
  for(const variation of [{url:'https://example.com/color-lyrics/v2/track/'+id},{body:'bad protobuf',type:'application/x-protobuf'},{requestHeaders:{'x-verselyrics-internal':'1'}},{args:'TARGET_LANGUAGE=invalid'},{stage:'none'},{args:'TARGET_LANGUAGE=%broken'}])test(`${client}: invalid/unrelated input passes through ${JSON.stringify(variation)}`,async()=>{
    const x=await host(client,variation);assert.equal(Object.keys(x.result).length,0);assert.equal(x.calls.length,0);
  });
  test(`${client}: empty 404 with source off passes through`,async()=>{
    const x=await host(client,{status:404,body:'',args:'FALLBACK_PROVIDER=off'});assert.equal(Object.keys(x.result).length,0);
  });
  test(`${client}: cached translation avoids a second service request`,async()=>{
    const store=new Map();await host(client,{store});const x=await host(client,{store});assert.equal(x.calls.length,0);assert.ok(outputBytes(client,x.result).includes(Buffer.from('自有译文0')));
  });
}
