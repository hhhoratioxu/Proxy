import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {sourceFixture} from './core/test/fixtures/source-services.mjs';
import {parseDocument,existingPalette,encodeDocument} from './core/spotify-lyrics.js';
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
async function host(client,{url=lyricURL,stage='response',status=200,body=JSON.stringify(lyrics()),type='application/json',headers={},requestHeaders={},args,store=new Map(),network,paletteBody,bodyOffset=false,clearTimers=false}={}) {
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
  const context = {...req,console:{log:()=>{throw Error('unexpected log');}},setTimeout:(fn,ms)=>{const t={fn,ms};timers.push(t);if(ms<=75){setTimeout(()=>{t.fired=true;fn();},ms);}else if(client!=='QuantumultX')throw Error('HTTP must use native timeouts');return timers.length;},$done:v=>{done.push(v);resolveDone(v);}};
  if(clearTimers)context.clearTimeout=id=>{timers[id-1].cleared=true;};
  if(args!==undefined){if(client==='QuantumultX')context.$environment={variables:typeof args==='object'?args:undefined,sourcePath:'https://example.invalid/script.js#'+(typeof args==='string'?args:'')};else context.$argument=args;}
  function fetchFixture(options,method) {
    calls.push({options,method});
    // The independent palette suite covers color responses. Legacy bridge cases use an unavailable palette.
    if(options.url.startsWith('https://open.spotify.com/embed/')) return paletteBody ? {status:200,body:paletteBody} : {status:404,body:''};
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
      Promise.resolve().then(()=>fetchFixture(o,method.toUpperCase())).then(r=>cb(null,{status:r.status,headers:r.headers??{}},(o['binary-mode']===false && typeof r.body==='string') ? r.body : new Uint8Array(Buffer.from(r.body??''))),error=>cb(error?.message||error?.error||'fixture error'));
    }]));
  }
  const code=readFileSync(new URL(`./runtime/${client}/script/SpotifyLyrics${stage==='request'?'.Request':stage==='response'&&!url.includes('/color-lyrics/')?'.Entry':''}.js`,import.meta.url),'utf8');
  vm.runInNewContext(code,context,{timeout:1000});
  const result=await Promise.race([completed,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('missing $done')),1500);t.unref();})]);
  // All outstanding timers must be harmless after completion.
  for(const t of timers)if(!t.fired)t.fn();
  await Promise.resolve();
  assert.equal(done.length,1,'exactly one $done');
  return {result,calls,store,input,timers,context};
}
const outputBytes = (client,r) => Buffer.from(client==='QuantumultX'?r.bodyBytes:r.body);
const publicPalette=JSON.parse(readFileSync(new URL('./core/test/fixtures/target-palette.json',import.meta.url))).entity;
const paletteBody='<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{state:{data:{entity:{...publicPalette,id,uri:'spotify:track:'+id}}}}}})+'</script>';
const expectedColors={background:0xff585f66|0,text:0xff000000|0,highlightText:-1};
for(const client of clients)for(const format of ['json','protobuf'])test(`${client}: common mixed-language path preserves native rows, colors and warm cache (${format})`,async()=>{
 const type=format==='json'?'application/json':'application/x-protobuf',store=new Map(),original=lyrics();
 original.lyrics.language='zh';original.lyrics.lines=['原创纸灯','Quiet sea','Quiet  sea','纸灯 says hello'].map((words,i)=>({words,startTimeMs:String(1000+i*2000),endTimeMs:'0',syllables:[]}));
 original.lyrics.alternatives=[{language:'zh-CN',lines:['official','official','official','official']}];
 const body=encodeDocument(original,format),network=url=>{const rows=new URL(url).searchParams.getAll('q');assert.deepEqual(rows,['Quiet sea','says hello']);return {status:200,body:JSON.stringify(rows.map(s=>'译文 '+s))};};
 const x=await host(client,{type,body,store,network}),bytes=outputBytes(client,x.result),doc=parseDocument(bytes,type);
 assert.deepEqual(doc.words,original.lyrics.lines.map(l=>l.words));assert.equal(x.calls.length,1);assert.ok(bytes.includes(Buffer.from('译文 Quiet sea')));assert.equal(bytes.includes(Buffer.from('纸灯 译文 says hello')),true);assert.equal(bytes.includes(Buffer.from('official')),false);assert.deepEqual(existingPalette(bytes,doc),original.colors);
 const again=await host(client,{type,body,store,network});assert.equal(again.calls.length,0);assert.deepEqual(outputBytes(client,again.result),bytes);assert.ok(store.get('VerseLyrics.v1.cache').length<=64000);
});
for(const client of clients)for(const type of ['application/json','application/x-protobuf'])test(`${client}: packaged missing-album signature preserves translation and avoids bulk search (${type})`,async()=>{
 const entries=[['meta:'+id,{id,title:'Paper Lantern',artists:['Ada North'],album:'',duration:180.4}],['palette:v1:'+id,{colors:expectedColors}]].map(([key,value])=>({key,value,expires:Date.now()+600000}));
 const store=new Map([['VerseLyrics.v1.cache',JSON.stringify({entries,cooldowns:{}})]]);
 const x=await host(client,{type,status:404,body:'missing',store,args:{FALLBACK_PROVIDER:'auto',TRANSLATION_ENABLED:'true',TARGET_LANGUAGE:'zh-CN'},network:url=>{
  if(url.includes('translate.googleapis'))return {status:200,body:translated(url)};
  assert.equal(new URL(url).pathname,'/api/get');return {status:200,body:JSON.stringify(record)};
 }});
 const bytes=outputBytes(client,x.result),doc=parseDocument(bytes,type);assert.deepEqual(doc.words,words);assert.deepEqual(existingPalette(bytes,doc),expectedColors);assert.ok(bytes.includes(Buffer.from('自有译文0')));assert.equal(x.calls.length,2);assert.ok(store.get('VerseLyrics.v1.cache').length<=64000);
});
for(const body of ['中'.repeat(32769),'["\ud800","value"]',Buffer.from([91,34,255,34,93])])test('Loon text-service oversized or malformed callback preserves words and removes official translations '+Buffer.byteLength(body),async()=>{
 const x=await host('Loon',{network:()=>({status:200,body})});
 const out=JSON.parse(outputBytes('Loon',x.result));assert.deepEqual(out.lyrics.lines,lyrics().lyrics.lines);assert.deepEqual(out.lyrics.alternatives,[]);
 assert.equal(x.calls.length,1);assert.equal(x.calls[0].options['binary-mode'],false);assert.equal(x.timers.length,0);
});
test('Loon binary callback remains compatible when a text endpoint returns Uint8Array',async()=>{
 const x=await host('Loon',{network:url=>({status:200,body:Buffer.from(translated(url))})});
 assert.deepEqual(JSON.parse(outputBytes('Loon',x.result)).lyrics.alternatives[0].lines,['自有译文0','自有译文1']);assert.equal(x.calls.length,1);
});
for(const client of clients){
  for(const type of ['application/json','application/x-protobuf'])test(`${client}: album palette crosses the native HTTP and binary bridge (${type})`,async()=>{
    const store=new Map();await host(client,{url:`https://spclient.wg.spotify.com/metadata/4/track/${hex}`,body:meta,type:'application/x-protobuf',store});
    const x=await host(client,{status:404,body:'missing',type,store,paletteBody,args:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:'lrclib'},network:url=>{assert.ok(url.startsWith('https://lrclib.net/'));return {status:200,body:JSON.stringify(new URL(url).pathname === '/api/get' ? record : [record])};}});
    const out=outputBytes(client,x.result),doc=parseDocument(out,type);assert.deepEqual(doc.words,words);assert.deepEqual(existingPalette(out,doc),expectedColors);
    const opt=x.calls.find(c=>c.options.url.startsWith('https://open.spotify.com/')).options;
    assert.deepEqual(Object.keys(opt.headers).sort(),['Accept','User-Agent']);assert.equal(opt.headers['User-Agent'],'VerseLyrics/3.1.7');
    if(client==='QuantumultX'){assert.equal(opt.opts.redirection,false);assert.equal(opt.opts['auto-cookie'],false);}
    else{assert.ok(opt.timeout>0&&opt.timeout<=(client==='Loon'?1500:1.5));assert.equal(opt['auto-cookie'],false);assert.equal(opt['auto-redirect'],false);}
    const again=await host(client,{status:404,body:'missing',type,store,args:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:'lrclib'}});
    assert.equal(again.calls.length,0);assert.deepEqual(existingPalette(outputBytes(client,again.result),parseDocument(outputBytes(client,again.result),type)),expectedColors);
  });
  if(client !== "Loon") test(`${client}: request cache headers and binary accept`,async()=>{
    const x=await host(client,{stage:'request',type:'*/*',requestHeaders:{'if-none-match':'tag','If-Modified-Since':'yesterday','accept-encoding':'gzip'}});
    const h=Object.fromEntries(Object.entries(x.result.headers).map(([k,v])=>[k.toLowerCase(),v]));
    assert.equal(h.accept,'application/x-protobuf');assert.equal(h['accept-encoding'],'identity');assert.equal(h['cache-control'],'no-cache');assert.equal(h['if-none-match'],undefined);assert.equal(h.authorization,'Bearer fake-test-only');assert.equal(x.calls.length,0);
  });
  test(`${client}: native JSON translations replace every official alternative`,async()=>{
    const x=await host(client,{headers:{'Content-Length':'1','Content-Encoding':'gzip',ETag:'old','Set-Cookie':['a=1','b=2']}});
    const out=JSON.parse(outputBytes(client,x.result));
    assert.deepEqual(out.lyrics.lines,lyrics().lyrics.lines);assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['自有译文0','自有译文1']}]);assert.equal(out.extra,'keep');
    assert.deepEqual([...x.result.headers['Set-Cookie']],['a=1','b=2']);assert.equal(x.result.headers['Content-Length'],client==='QuantumultX'?'1':undefined);assert.equal(x.result.headers['Content-Encoding'],client==='QuantumultX'?'gzip':undefined);if(client==='QuantumultX')assert.equal(x.result.headers['Content-Type'],'application/json');
    assert.equal(x.calls.length,1);assert.equal(x.calls[0].options.headers.authorization,undefined);assert.equal(x.calls[0].options.headers['client-token'],undefined);
    const opt=x.calls[0].options;
    if(client==='QuantumultX')assert.deepEqual(JSON.parse(JSON.stringify(opt.opts)),{redirection:false,'auto-cookie':false,'skip-cert-verify':false});
    else {assert.equal(opt['binary-mode'],client!=='Loon');assert.equal(opt['auto-redirect'],false);assert.equal(opt['auto-cookie'],false);assert.equal(opt.insecure,false);assert.ok(opt.timeout>0&&opt.timeout<=(client==='Loon'?2500:2.5));}
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
    const x=await host(client,{status:404,body:'missing',type:'*/*',store,args:'TRANSLATION_ENABLED=false&FALLBACK_PROVIDER=lrclib',network:(url)=>{assert.ok(url.startsWith('https://lrclib.net/'));return {status:200,body:JSON.stringify(new URL(url).pathname === '/api/get' ? record : [record])};}});
    assert.equal(x.result.status,client==='QuantumultX'?'HTTP/1.1 200 OK':200);assert.deepEqual(parseDocument(outputBytes(client,x.result),'application/x-protobuf').words,words);assert.equal(x.calls.length,2);
  });
  test(`${client}: uncached metadata HTTP stays binary and credentials stay on Spotify`,async()=>{
    const x=await host(client,{status:404,body:'{}',args:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:'lrclib'},network:(url,o)=>{
      if(url.includes('/metadata/4/track/')){assert.equal(o.headers.authorization??o.headers.Authorization,'Bearer fake-test-only');return {status:200,headers:{'Content-Type':'application/x-protobuf'},body:meta};}
      assert.ok(url.startsWith('https://lrclib.net/'));assert.equal(Object.keys(o.headers).some(k=>/authorization|client-token|cookie/i.test(k)),false);return {status:200,body:JSON.stringify(new URL(url).pathname === '/api/get' ? record : [record])};
    }});
    assert.equal(x.calls.length,3);assert.equal(x.result.status,client==='QuantumultX'?'HTTP/1.1 200 OK':200);
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
for(const client of clients){
 test(`${client}: full-span binary buffers are reused and offset views remain isolated`,()=>{
  // Unit-check bridge ownership on readable source; all response cases above run compiled bundles.
  const code=readFileSync(new URL('./native-adapter.js',import.meta.url),'utf8').replace('__CLIENT__',client).replace('nativeMain().catch(() => nativeDone({}));','globalThis.testBuffer = nativeBuffer;');const c={};vm.runInNewContext(code,c);const full=new Uint8Array([1,2,3]);assert.equal(c.testBuffer(full),full.buffer);const partial=new Uint8Array([99,1,2,3,98]).subarray(1,4);assert.deepEqual([...new Uint8Array(c.testBuffer(partial))],[1,2,3]);
 });
 test(`${client}: repeated missing lyrics reuse the short miss cache`,async()=>{
  const store=new Map();await host(client,{url:`https://spclient.wg.spotify.com/metadata/4/track/${hex}`,body:meta,type:'application/x-protobuf',store});
  const first=await host(client,{status:404,body:'missing',store,args:'FALLBACK_PROVIDER=lrclib',network:url=>url.includes('/api/get?')?{status:404,body:'{}'}:{status:200,body:'[]'}});assert.equal(first.calls.length,2);assert.equal(Object.keys(first.result).length,0);
  const second=await host(client,{status:404,body:'missing',store,args:'FALLBACK_PROVIDER=lrclib'});assert.equal(second.calls.length,0);assert.equal(Object.keys(second.result).length,0);
 });
}

for(const client of clients)for(const provider of ['kugou','kuwo','lyricsovh'])for(const type of ['application/json','application/x-protobuf'])test(`${client}: ${provider} native output and released HTTP timers (${type})`,async()=>{
 const store=new Map();await host(client,{url:`https://spclient.wg.spotify.com/metadata/4/track/${hex}`,body:meta,type:'application/x-protobuf',store});
 const x=await host(client,{status:404,body:'missing',type,store,paletteBody,clearTimers:true,args:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:provider},network:u=>({status:200,body:JSON.stringify(sourceFixture(provider,u))})});
 const output=outputBytes(client,x.result),doc=parseDocument(output,type);assert.deepEqual(doc.words,['A paper lantern floats.','Our evening light returns.']);assert.deepEqual(existingPalette(output,doc),expectedColors);assert.equal(x.calls.length,3);
 const raw=type==='application/json'?JSON.parse(output).lyrics:null;if(raw){assert.equal(raw.syncType,provider==='lyricsovh'?'UNSYNCED':'LINE_SYNCED');assert.deepEqual(raw.lines.map(l=>l.startTimeMs),provider==='lyricsovh'?['0','0']:['1200','3400']);}
 assert.equal(x.timers.filter(t=>t.cleared).length,client==='QuantumultX'?1:0);assert.equal(JSON.stringify([...store]).includes('public-test-key'),false);
});
for(const client of clients)for(const type of ['application/json','application/x-protobuf'])test(`${client}: revisiting a cached song after metadata eviction performs zero HTTP (${type})`,async()=>{
 const store=new Map();await host(client,{url:`https://spclient.wg.spotify.com/metadata/4/track/${hex}`,body:meta,type:'application/x-protobuf',store});
 const first=await host(client,{status:404,body:'missing',type,store,paletteBody,args:{TRANSLATION_ENABLED:true,FALLBACK_PROVIDER:'lrclib'},network:u=>u.includes('translate.googleapis')?{status:200,body:translated(u)}:{status:200,body:JSON.stringify(record)}});
 const cached=JSON.parse(store.get('VerseLyrics.v1.cache'));cached.entries=cached.entries.filter(e=>!e.key.startsWith('meta:')&&!e.key.startsWith('availability:'));store.set('VerseLyrics.v1.cache',JSON.stringify(cached));
 const second=await host(client,{status:404,body:'missing',type,store,args:{TRANSLATION_ENABLED:true,FALLBACK_PROVIDER:'lrclib'},network:()=>{throw Error('cached response must not request network');}});
 assert.equal(second.calls.length,0);assert.deepEqual(outputBytes(client,second.result),outputBytes(client,first.result));
});

for(const client of clients)test(client+': concurrent native lyric scripts share admission and drain every completed timer',async()=>{
 const store=new Map(),releases=[];let active=0,peak=0;
 const jobs=Array.from({length:10},(_,i)=>host(client,{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+String(i+1).padStart(22,'0'),store,clearTimers:true,network:u=>releases.length>=2?{status:200,body:translated(u)}:new Promise(resolve=>{active++;peak=Math.max(peak,active);releases.push(()=>{active--;resolve({status:200,body:translated(u)});});})}));
 await new Promise(setImmediate);assert.equal(releases.length,1);releases.forEach(f=>f());const results=await Promise.all(jobs);assert.equal(peak,1);assert.equal(active,0);assert.deepEqual(JSON.parse(store.get('VerseLyrics.v1.network')),[]);for(const x of results)assert.ok(x.timers.every(t=>t.cleared||t.fired));
});

for(const client of clients)for(const provider of ['auto','lrclib'])test(client+': native '+provider+' settled timeout releases admission and retains eligible fallback sources',async()=>{
 const store=new Map();await host(client,{url:`https://spclient.wg.spotify.com/metadata/4/track/${hex}`,body:meta,type:'application/x-protobuf',store});
 const x=await host(client,{status:404,body:'missing',store,clearTimers:true,args:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:provider},network:async()=>{throw Error('request timed out');}});
 assert.equal(x.calls.length,provider==='auto'?6:1);assert.equal(Object.keys(x.result).length,0);assert.equal(JSON.parse(store.get('VerseLyrics.v1.network')).length,0);assert.ok(!JSON.parse(store.get('VerseLyrics.v1.cache')).entries.some(e=>e.key.startsWith('lyrics:')&&e.value?.missing));assert.equal(x.timers.length,client==='QuantumultX'?1:0);
});
