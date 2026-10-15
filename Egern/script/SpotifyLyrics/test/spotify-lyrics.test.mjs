import test from 'node:test';
import assert from 'node:assert/strict';
import run, { loadCache, parseDocument, parseMetadata, encodeDocument, base62Hex, hexBase62, matches, lrc, settings, LYRIC_URL, META_URL } from '../spotify-lyrics.js';
const ID = '0000000000000000000001';
const HEX = '00000000000000000000000000000001';
const URL = `https://spclient.wg.spotify.com/color-lyrics/v2/track/${ID}`;
const enc = s => Buffer.from(s, 'utf8');
const cat = (...xs) => Buffer.concat(xs);
// Independent fixture encoder. Production parser/encoder are not used to create these inputs.
function vi(n) { let b = BigInt(n); if (b < 0) b = BigInt.asUintN(64, b); const out = []; do { let x = Number(b & 127n); b >>= 7n; out.push(x | (b ? 128 : 0)); } while (b); return Buffer.from(out); }
const int = (n, v) => cat(vi(n * 8), vi(v));
const bin = (n, b) => cat(vi(n * 8 + 2), vi(b.length), b);
const txt = (n, s) => bin(n, enc(s));
const fixtureLines = ['The blue kite follows the wind.', 'My quiet garden is awake.'];
function rawProto() {
  const lines = fixtureLines.map((s, i) => bin(2, cat(int(1, 1000 + i * 2000), txt(2, s), bin(3, cat(int(1, 1000 + i * 2000), int(2, 3))), txt(71, 'line-unknown'))));
  const palette = bin(2, cat(int(1, -15656936), int(2, -1), int(3, -1)));
  const lyrics = bin(1, cat(int(1, 2), ...lines, txt(3, 'Musixmatch'), txt(5, 'Original credits'), txt(10, 'en'), bin(90, Buffer.from([0xff, 0x00]))));
  return cat(lyrics, palette, int(3, 1), txt(101, 'outer-unknown'), cat(vi(102 * 8 + 1), Buffer.alloc(8, 0xff)), cat(vi(103 * 8 + 5), Buffer.alloc(4, 0xfe)));
}
function readFields(bytes) {
  const b = Buffer.from(bytes); let at = 0; const out = [];
  function v() { let n = 0n, shift = 0n, x; do { x = b[at++]; n |= BigInt(x & 127) << shift; shift += 7n; } while (x & 128); return n; }
  while (at < b.length) {
    const begin = at, tag = Number(v()), no = tag >>> 3, wire = tag & 7; let payload;
    if (wire === 0) v(); else if (wire === 2) { const len = Number(v()); payload = b.subarray(at, at + len); at += len; } else at += wire === 1 ? 8 : 4;
    out.push({ no, wire, payload, raw: b.subarray(begin, at) });
  }
  return out;
}
function metadataBytes({ title='The Blue Kite', album='Quiet Garden', artist='Ada North', duration=180, flag=0, hex=HEX }={}) {
  return cat(bin(1, Buffer.from(hex, 'hex')), txt(2, title), bin(3, txt(2, album)), bin(4, txt(2, artist)), int(7, duration * 2000), ...(flag === null ? [] : [int(18, flag)]), txt(40, 'keep-metadata-field'));
}
function lyricJSON(lines=fixtureLines) { return { lyrics: { syncType:'LINE_SYNCED', language:'en', provider:'Musixmatch', providerDisplayName:'Original credits', lines:lines.map((words,i)=>({startTimeMs:String(1000+i*2000),endTimeMs:'0',words,syllables:[],future:'keep'})), future:'keep' }, colors:{background:-1,text:-1,highlightText:-1}, hasVocalRemoval:true, future:{x:1} }; }
function context({ body=JSON.stringify(lyricJSON()), status=200, type='application/json', env={}, url=URL, requestHeaders={}, responseHeaders={}, store=new Map(), network=async()=>{throw Error('unexpected HTTP')} }={}) {
  const calls = [], storage = { getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null, setJSON:(k,v)=>store.set(k,JSON.stringify(v)) };
  const ctx = { env, request:{url,headers:new Headers({Accept:type,...requestHeaders})}, response:new Response(body,{status,headers:{'Content-Type':type,...responseHeaders}}), storage,
    http:{get:async(u,o)=>{calls.push({url:u,options:o,method:'GET'});return network(u,o,'GET');},post:async(u,o)=>{calls.push({url:u,options:o,method:'POST'});return network(u,o,'POST');}} };
  return {ctx,calls,store};
}
const translated = (u) => new Response(JSON.stringify(new globalThis.URL(u).searchParams.getAll('q').map((s,i)=>['译文'+i,'en'])),{status:200});
const value = result => JSON.parse(Buffer.from(result.body).toString('utf8'));
const basicMeta = {id:ID,title:'The Blue Kite',album:'Quiet Garden',artists:['Ada North'],duration:180};
const record = {trackName:basicMeta.title,albumName:basicMeta.album,artistName:'Ada North',duration:180,syncedLyrics:'[00:01.00]The blue kite follows the wind.\n[00:03.00]My quiet garden is awake.',plainLyrics:null};
const metaNetwork = async(u,o) => {
  if (u.includes('/metadata/4/track/')) return new Response(metadataBytes(),{headers:{'Content-Type':'application/x-protobuf'}});
  if (u.startsWith('https://lrclib.net/')) return new Response(JSON.stringify([record]));
  if (u.startsWith('https://translate.googleapis.com/')) return translated(u);
  throw new Error('unexpected endpoint');
};

test('defaults: translation off, language zh-CN, optional discovery off',()=>{assert.deepEqual(settings({}),{translate:false,language:'zh-CN',provider:'auto',discover:false});});
test('translation opt-in: no lyric text sent with defaults',async()=>{const x=context();const r=await run(x.ctx);assert.equal(x.calls.length,0);assert.equal(Buffer.from(r.body).toString(),JSON.stringify(lyricJSON()));});
test('JSON keeps original text above translation and preserves timestamps and credits',async()=>{
  const input=lyricJSON(),x=context({env:{TRANSLATION_ENABLED:'true'},network:translated});
  const r=await run(x.ctx),out=value(r);assert.equal(out.lyrics.lines[0].words,fixtureLines[0]+'\n译文0');
  assert.equal(out.lyrics.lines[0].startTimeMs,input.lyrics.lines[0].startTimeMs);assert.equal(out.lyrics.lines[0].future,'keep');
  assert.equal(out.lyrics.provider,input.lyrics.provider);assert.deepEqual(out.colors,input.colors);assert.deepEqual(out.future,input.future);
});
test('protobuf keeps all unknown outer/lyrics/line bytes and syllable timing',async()=>{
  const input=rawProto(),x=context({body:input,type:'application/x-protobuf',env:{TRANSLATION_ENABLED:'true'},network:translated});
  const r=await run(x.ctx),a=readFields(input),b=readFields(r.body);
  assert.equal(b.length,a.length);for(let i=1;i<a.length;i++)assert.deepEqual(b[i].raw,a[i].raw);
  const oldInner=readFields(a[0].payload),newInner=readFields(b[0].payload);
  for(let i=0;i<oldInner.length;i++){
    if(oldInner[i].no!==2) assert.deepEqual(newInner[i].raw,oldInner[i].raw);
    else { const before=readFields(oldInner[i].payload),after=readFields(newInner[i].payload);for(let j=0;j<before.length;j++)if(before[j].no!==2)assert.deepEqual(after[j].raw,before[j].raw); }
  }
  assert.match(readFields(newInner.find(f=>f.no===2).payload).find(f=>f.no===2).payload.toString(),/\n译文0$/);
});
test('duplicate lyric lines translated only once; blank/music lines not sent',async()=>{
  const x=context({body:JSON.stringify(lyricJSON(['Same phrase','Same phrase','♪',''])),env:{TRANSLATION_ENABLED:'true'},network:translated});
  const r=await run(x.ctx);assert.equal(new globalThis.URL(x.calls[0].url).searchParams.getAll('q').length,1);
  assert.equal(value(r).lyrics.lines[0].words,value(r).lyrics.lines[1].words);assert.equal(value(r).lyrics.lines[2].words,'♪');
});
test('already bilingual lines are left intact',async()=>{const x=context({body:JSON.stringify(lyricJSON(['Original\n译文'])),env:{TRANSLATION_ENABLED:'true'}});const r=await run(x.ctx);assert.equal(x.calls.length,0);assert.equal(value(r).lyrics.lines[0].words,'Original\n译文');});
test('translation cache is reused; changing target requests fresh translation',async()=>{
  const store=new Map();await run(context({store,env:{TRANSLATION_ENABLED:'true'},network:translated}).ctx);
  const second=context({store,env:{TRANSLATION_ENABLED:'true'}});await run(second.ctx);assert.equal(second.calls.length,0);
  const third=context({store,env:{TRANSLATION_ENABLED:'true',TARGET_LANGUAGE:'ja'},network:translated});await run(third.ctx);assert.equal(third.calls.length,1);
});
test('wrong translation count never shifts translations onto another line',async()=>{const input=JSON.stringify(lyricJSON()),x=context({body:input,env:{TRANSLATION_ENABLED:'true'},network:async()=>new Response(JSON.stringify([['single','en']]))});const r=await run(x.ctx);assert.equal(Buffer.from(r.body).toString(),input);});
test('one invalid translation invalidates entire batch',async()=>{const input=JSON.stringify(lyricJSON()),x=context({body:input,env:{TRANSLATION_ENABLED:'true'},network:async()=>new Response(JSON.stringify([['ok','en'],null]))});const r=await run(x.ctx);assert.equal(Buffer.from(r.body).toString(),input);});
test('network timeout retains exact original bytes and upstream headers',async()=>{const input=rawProto(),x=context({body:input,type:'application/x-protobuf',env:{TRANSLATION_ENABLED:'true'}});const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);assert.equal(r.headers,undefined);});
for(const status of [401,403,429,500,503])test(`Spotify HTTP ${status} never treated as missing lyrics`,async()=>{const x=context({status,body:'server error',env:{TRANSLATION_ENABLED:'true',DISCOVER_MISSING:'true'},network:metaNetwork});const r=await run(x.ctx);assert.equal(r,undefined);assert.equal(x.calls.length,0);assert.equal(x.ctx.response.bodyUsed,false);});
test('404 fallback uses validated metadata and exact-version matching',async()=>{
  const x=context({body:'no lyrics',status:404,type:'application/x-protobuf',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN','Client-Token':'TEST_ONLY_CLIENT',Cookie:'NEVER_FORWARD'},network:metaNetwork});
  const r=await run(x.ctx);assert.equal(r.status,200);assert.equal(parseDocument(new Uint8Array(r.body),'application/x-protobuf').words[0],fixtureLines[0]);
  assert.equal(x.calls.length,2);assert.equal(x.calls[0].options.headers.Authorization,'Bearer TEST_ONLY_TOKEN');assert.equal(x.calls[0].options.headers.Cookie,undefined);
  for(const c of x.calls){assert.equal(c.options.credentials,'omit');assert.equal(c.options.redirect,'error');if(!c.url.includes('spotify.com')){assert.equal(c.options.headers.Authorization,undefined);assert.equal(c.options.headers['Client-Token'],undefined);}}
  assert.ok(!JSON.stringify([...x.store.values()]).includes('TEST_ONLY_TOKEN'));
});
test('native Accept protobuf wins over JSON error response type on 404',async()=>{const x=context({body:'{}',status:404,type:'application/json',requestHeaders:{Accept:'application/x-protobuf',Authorization:'Bearer TEST_ONLY_TOKEN'},network:metaNetwork});const r=await run(x.ctx);assert.equal(new Headers(r.headers).get('Content-Type'),'application/x-protobuf');assert.equal(parseDocument(new Uint8Array(r.body),'application/x-protobuf').words.length,2);});
test('404 JSON web client gets JSON fallback with truthful source',async()=>{const x=context({body:'{}',status:404,requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:metaNetwork});const out=value(await run(x.ctx));assert.equal(out.lyrics.providerDisplayName,'LRCLIB');assert.equal(out.lyrics.syncType,'LINE_SYNCED');});
test('200 explicit empty lyrics still uses fallback when translation is off',async()=>{const x=context({body:'{"lyrics":{"lines":[]}}',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:metaNetwork});const r=await run(x.ctx);assert.equal(value(r).lyrics.providerDisplayName,'LRCLIB');});
test('no bearer and no cached metadata leaves 404 intact',async()=>{const x=context({status:404,body:'no lyrics',network:metaNetwork});const r=await run(x.ctx);assert.equal(r.status,undefined);assert.equal(Buffer.from(r.body).toString(),'no lyrics');assert.equal(x.calls.length,0);});
test('wrong Spotify metadata GID never searches backup services',async()=>{const x=context({status:404,body:'no lyrics',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async()=>new Response(metadataBytes({hex:HEX.replace(/1$/,'2')}))});const r=await run(x.ctx);assert.equal(r.status,undefined);assert.equal(x.calls.length,1);});
test('strict match rejects covers, live/remastered titles, album mismatch, length drift, missing artists',()=>{
  const base={title:basicMeta.title,album:basicMeta.album,artists:basicMeta.artists,duration:180};assert.ok(matches(basicMeta,base));
  for(const delta of [{title:'The Blue Kite (Live)'},{title:'The Blue Kite (Remastered)'},{album:'Greatest Hits'},{artists:['Another singer']},{duration:183},{artists:[]}])assert.equal(matches(basicMeta,{...base,...delta}),false);
});
test('mismatched source records leave missing-lyrics response intact',async()=>{
  const x=context({status:404,body:'not found',env:{FALLBACK_PROVIDER:'lrclib'},requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async(u,o)=>u.includes('/metadata/')?metaNetwork(u,o):new Response(JSON.stringify([{...record,albumName:'Another Edition'}]))});
  const r=await run(x.ctx);assert.equal(r.status,undefined);assert.equal(Buffer.from(r.body).toString(),'not found');
});
test('LRC keeps real timings, repeated timestamps, offsets and same-time bilingual rows',()=>{
  const rows=lrc('[offset:-100]\n[00:01.50][00:03.5]A\n[00:01.50]甲\n[00:99.00]INVALID');
  assert.equal(rows.length,2);assert.equal(rows[0].startTimeMs,'1400');assert.equal(rows[0].words,'A\n甲');assert.equal(rows[1].startTimeMs,'3400');
});
test('plain lyrics remain UNSYNCED with zero timestamps',async()=>{
  const x=context({status:404,body:'{}',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async(u,o)=>u.includes('/metadata/')?metaNetwork(u,o):new Response(JSON.stringify([{...record,syncedLyrics:null,plainLyrics:'My original line\nAnother original line'}]))});
  const out=value(await run(x.ctx));assert.equal(out.lyrics.syncType,'UNSYNCED');assert.ok(out.lyrics.lines.every(l=>l.startTimeMs==='0'));
});
test('QQ selection only used after Spotify missing, with exact metadata',async()=>{
  const x=context({status:404,body:'{}',env:{FALLBACK_PROVIDER:'qq'},requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async(u,o)=>{
    if(u.includes('/metadata/'))return metaNetwork(u,o);if(u.includes('/soso/'))return new Response(JSON.stringify({code:0,data:{song:{list:[{songmid:'TESTMID',songname:basicMeta.title,albumname:basicMeta.album,interval:180,singer:[{name:'Ada North'}]}]}}}));
    return new Response(JSON.stringify({retcode:0,lyric:'[00:01.00]Self written line'}));
  }});const r=await run(x.ctx);assert.equal(value(r).lyrics.providerDisplayName,'QQ 音乐');assert.ok(x.calls[1].url.includes('c.y.qq.com'));assert.equal(x.calls[2].options.headers.Referer,'https://y.qq.com/');
});
test('NetEase POST search and synced-lyrics retrieval',async()=>{
  const x=context({status:404,body:'{}',env:{FALLBACK_PROVIDER:'netease'},requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async(u,o)=>{
    if(u.includes('/metadata/'))return metaNetwork(u,o);if(u.includes('/cloudsearch/'))return new Response(JSON.stringify({code:200,result:{songs:[{id:9,name:basicMeta.title,dt:180000,al:{name:basicMeta.album},ar:[{name:'Ada North'}]}]}}));
    return new Response(JSON.stringify({code:200,lrc:{lyric:'[00:01.00]Self written line'}}));
  }});assert.equal(value(await run(x.ctx)).lyrics.providerDisplayName,'网易云音乐');assert.equal(x.calls[1].method,'POST');assert.match(x.calls[1].options.body,/type=1/);
});
test('metadata has_lyrics=true is unchanged, even with discovery enabled',async()=>{const input=metadataBytes({flag:1}),x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:input,type:'application/x-protobuf',env:{DISCOVER_MISSING:'true'}});const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);assert.equal(x.calls.length,0);});
test('metadata discovery off leaves no-lyrics flag untouched and sends no search',async()=>{const input=metadataBytes(),x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:input,type:'application/x-protobuf'});const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);assert.equal(x.calls.length,0);});
test('metadata discovery only marks lyrics available AFTER successful backup lookup',async()=>{
  const input=metadataBytes(),store=new Map(),x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:input,type:'application/x-protobuf',store,env:{DISCOVER_MISSING:'true'},network:metaNetwork});
  const r=await run(x.ctx);assert.equal(parseMetadata(new Uint8Array(r.body),HEX).hasLyrics,true);
  const before=readFields(input).filter(f=>f.no!==18),after=readFields(r.body).filter(f=>f.no!==18);assert.deepEqual(after.map(f=>f.raw),before.map(f=>f.raw));
  const next=context({store,status:404,body:'not found',type:'application/x-protobuf'});const filled=await run(next.ctx);assert.equal(filled.status,200);assert.equal(next.calls.length,0);
});
test('missing metadata flag is not classified as an explicit no-lyrics flag',async()=>{const input=metadataBytes({flag:null}),x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:input,type:'application/x-protobuf',env:{DISCOVER_MISSING:'true'}});const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);assert.equal(x.calls.length,0);});
test('failed discovery leaves original has_lyrics=false unchanged',async()=>{const input=metadataBytes(),x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:input,type:'application/x-protobuf',env:{DISCOVER_MISSING:'true',FALLBACK_PROVIDER:'lrclib'},network:async()=>new Response('[]')});const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);});
test('request cache rewrite is restricted to lyric URL and keeps authorization',async()=>{
  const x=context({requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN','If-None-Match':'old','Accept-Encoding':'gzip'}});delete x.ctx.response;const r=await run(x.ctx);
  const hs=new Headers(r.headers);assert.equal(hs.get('If-None-Match'),null);assert.equal(hs.get('Accept-Encoding'),'identity');assert.equal(hs.get('Authorization'),'Bearer TEST_ONLY_TOKEN');
});
test('module fully disabled at environment level passes request through',async()=>{const x=context({env:{TRANSLATION_ENABLED:'false',FALLBACK_PROVIDER:'off'}});delete x.ctx.response;assert.equal(await run(x.ctx),undefined);});
test('internal metadata requests are never processed recursively',async()=>{const x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:metadataBytes(),requestHeaders:{'x-verselyrics-internal':'1'},type:'application/x-protobuf',env:{DISCOVER_MISSING:'true'}});assert.equal(await run(x.ctx),undefined);assert.equal(x.calls.length,0);});
test('rewritten response strips stale length, encoding and etag; keeps unrelated headers',async()=>{
  const x=context({env:{TRANSLATION_ENABLED:'true'},responseHeaders:{'Content-Length':'1','Content-Encoding':'gzip',ETag:'old','X-Keep':'yes'},network:translated});const r=await run(x.ctx),hs=new Headers(r.headers);
  assert.equal(hs.get('Content-Length'),null);assert.equal(hs.get('Content-Encoding'),null);assert.equal(hs.get('ETag'),null);assert.equal(hs.get('X-Keep'),'yes');assert.equal(hs.get('Cache-Control'),'no-store');
});
test('marked response is not translated twice',async()=>{const x=context({env:{TRANSLATION_ENABLED:'true'},responseHeaders:{'X-VerseLyrics':'0.1.0'}});assert.equal(await run(x.ctx),undefined);assert.equal(x.calls.length,0);});
test('429 Retry-After is honored across repeated translation requests',async()=>{
  const store=new Map(),first=context({store,env:{TRANSLATION_ENABLED:'true'},network:async()=>new Response('rate limited',{status:429,headers:{'Retry-After':'120'}})});await run(first.ctx);
  const second=context({store,env:{TRANSLATION_ENABLED:'true'},network:translated});const r=await run(second.ctx);assert.equal(second.calls.length,0);assert.deepEqual(value(r),lyricJSON());
});
for(const [type,input] of [['application/json','{bad json'],['application/x-protobuf',Buffer.from([10,255])],['application/x-protobuf',Buffer.from([8,128])],['text/html','<html>login</html>'],['application/x-protobuf',bin(2,enc('unknown response'))]])test(`malformed/unknown response passes through: ${type} ${String(input).slice(0,15)}`,async()=>{const x=context({type,body:input,env:{TRANSLATION_ENABLED:'true'}}),r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),Buffer.from(input));assert.equal(x.calls.length,0);});
test('invalid settings pass through without reading or sending body',async()=>{const x=context({env:{TRANSLATION_ENABLED:'true',TARGET_LANGUAGE:'invalid'}});assert.equal(await run(x.ctx),undefined);assert.equal(x.ctx.response.bodyUsed,false);assert.equal(x.calls.length,0);});
test('unknown successful JSON is not reclassified as no lyrics',async()=>{const x=context({body:'{"error":"unrecognized"}',env:{TRANSLATION_ENABLED:'true'},network:metaNetwork});const r=await run(x.ctx);assert.equal(Buffer.from(r.body).toString(),'{"error":"unrecognized"}');assert.equal(x.calls.length,0);});
test('base62 conversion matches independent 128-bit oracle',()=>{
  for(const id of [ID,'4uLU6hMCjMI75M1A2tKUQC','0000000000000000000000','7aaaaaaaaaaaaaaaaaaaaa']){let n=0n;for(const c of id)n=n*62n+BigInt('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c));const expected=n.toString(16).padStart(32,'0');assert.equal(base62Hex(id),expected);assert.equal(hexBase62(expected),id);}
  assert.throws(()=>base62Hex('ZZZZZZZZZZZZZZZZZZZZZZ'));
});
test('URL filters exclude auth, audio, ads, lookalike domains and unrelated APIs',()=>{
  assert.ok(LYRIC_URL.test(URL));assert.ok(LYRIC_URL.test(URL.replace('spclient.wg','gew1-spclient')+'?vocalRemoval=false'));
  for(const url of ['https://accounts.spotify.com/login',URL.replace('spotify.com','spotify.com.evil.test'),URL.replace('/color-lyrics/v2/','/audio/v2/'),URL.replace('https:','http:'),URL+'/other'])assert.equal(LYRIC_URL.test(url),false);
  assert.ok(META_URL.test(`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`));
});
test('fallback protobuf decodes with independent reader and proper signed colors',()=>{
  const doc={lyrics:{syncType:'UNSYNCED',lines:[{startTimeMs:'0',words:'Plain original'}],provider:'lrclib',providerDisplayName:'LRCLIB',language:''},colors:{background:-15656936,text:-1,highlightText:-1}};
  const bytes=encodeDocument(doc,'protobuf'),outer=readFields(bytes),inner=readFields(outer[0].payload);assert.equal(inner.find(f=>f.no===3).payload.toString(),'lrclib');assert.equal(outer[1].payload.length,33);assert.equal(parseDocument(bytes,'application/x-protobuf').words[0],'Plain original');
});
test('malformed wire fuzz always returns original bytes without throwing',async()=>{
  let seed=42;
  for(let i=0;i<180;i++){const input=Buffer.alloc(1+i%40);for(let j=0;j<input.length;j++){seed=(seed*1664525+1013904223)>>>0;input[j]=seed>>>24;}const x=context({body:input,type:'application/x-protobuf',env:{TRANSLATION_ENABLED:'true'}});const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);}
});
test('manual status uses documented generic widget return format',async()=>{const x=context();delete x.ctx.request;const r=await run(x.ctx);assert.equal(r.type,'widget');assert.ok(r.children.some(n=>n.text.includes('等待 Spotify')));});

test('account upsell payload is never replaced with a synthetic successful response',async()=>{
  const input=JSON.stringify({lyrics:{lines:[],showUpsell:true}}),x=context({body:input,env:{TRANSLATION_ENABLED:'true'},requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:metaNetwork});
  const r=await run(x.ctx);assert.equal(Buffer.from(r.body).toString(),input);assert.equal(x.calls.length,0);
});
test('partial successful translation leaves other groups in original text',async()=>{
  const lines=Array.from({length:40},(_,i)=>'Self written sentence '+i),x=context({body:JSON.stringify(lyricJSON(lines)),env:{TRANSLATION_ENABLED:'true'},network:async u=>new globalThis.URL(u).searchParams.getAll('q').length===32?translated(u):new Response('unavailable',{status:503})});
  const r=await run(x.ctx),out=value(r).lyrics.lines;assert.ok(out[0].words.includes('\n'));assert.equal(out[39].words,lines[39]);
});

test('multiple Set-Cookie fields survive header editing',async()=>{
  const x=context({env:{TRANSLATION_ENABLED:'true'},network:translated});x.ctx.response.headers.append('Set-Cookie','one=1; Secure');x.ctx.response.headers.append('Set-Cookie','two=2; Secure');
  const before=x.ctx.response.headers.getSetCookie(),r=await run(x.ctx);assert.deepEqual(r.headers.getSetCookie(),before);
});
test('automatic fallback continues to QQ when LRCLIB is rate limited',async()=>{
  const x=context({body:'{}',status:404,requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async(u,o)=>{
    if(u.includes('/metadata/'))return metaNetwork(u,o);
    if(u.includes('lrclib.net'))return new Response('rate limit',{status:429,headers:{'Retry-After':'120'}});
    if(u.includes('/soso/'))return new Response(JSON.stringify({code:0,data:{song:{list:[{songmid:'TESTMID',songname:basicMeta.title,albumname:basicMeta.album,interval:180,singer:[{name:'Ada North'}]}]}}}));
    return new Response(JSON.stringify({retcode:0,lyric:'[00:01.00]Self written line'}));
  }});assert.equal(value(await run(x.ctx)).lyrics.providerDisplayName,'QQ 音乐');
  const cache=JSON.parse(x.store.get('VerseLyrics.v1.cache'));assert.ok(cache.cooldowns['lrclib.net']>Date.now()+90000);
});
test('protobuf account upsell field is preserved without provider requests',async()=>{
  const input=bin(1,cat(int(1,0),int(13,1))),x=context({body:input,type:'application/x-protobuf',env:{TRANSLATION_ENABLED:'true'},requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:metaNetwork});
  const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);assert.equal(x.calls.length,0);
});

test('overlapping invocations retain newer cache entries and Retry-After deadlines',()=>{
  const {ctx}=context(),a=loadCache(ctx),b=loadCache(ctx),until=Date.now()+120000;
  a.put('first','A');a.cooldowns['lrclib.net']=until;a.save();b.put('second','B');b.save();
  const c=loadCache(ctx);assert.equal(c.get('first'),'A');assert.equal(c.get('second'),'B');assert.equal(c.cooldowns['lrclib.net'],until);
});
