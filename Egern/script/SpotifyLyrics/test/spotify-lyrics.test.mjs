import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import run, { loadCache, parseDocument, parseMetadata, extendedTracks, encodeDocument, base62Hex, hexBase62, matches, metadataNormal, lrc, settings, LYRIC_URL, META_URL, SCROLL_URL, EXTENDED_URL } from '../spotify-lyrics.js';
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

test('defaults: translation off, language zh-CN, missing-lyrics discovery on',()=>{assert.deepEqual(settings({}),{translate:false,language:'zh-CN',provider:'auto',discover:true});assert.equal(settings({DISCOVER_MISSING:'false'}).discover,false);});
test('translation opt-in: no lyric text sent with defaults',async()=>{const x=context();const r=await run(x.ctx);assert.equal(x.calls.length,0);assert.equal(Buffer.from(r.body).toString(),JSON.stringify(lyricJSON()));});
test('JSON native translation keeps original rows and adds a separate alternative',async()=>{
  const input=lyricJSON(),x=context({env:{TRANSLATION_ENABLED:'true'},network:translated});
  const r=await run(x.ctx),out=value(r);assert.deepEqual(out.lyrics.lines,input.lyrics.lines);assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['译文0','译文1']}]);
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
  assert.equal(newInner.length,oldInner.length+1);
  for(let i=0;i<oldInner.length;i++)assert.deepEqual(newInner[i].raw,oldInner[i].raw);
  const alternative=readFields(newInner.at(-1).payload);assert.equal(newInner.at(-1).no,9);assert.equal(alternative[0].payload.toString(),'zh-CN');assert.deepEqual(alternative.filter(f=>f.no===2).map(f=>f.payload.toString()),['译文0','译文1']);
});
test('duplicate lyric lines translated only once; blank/music lines not sent',async()=>{
  const x=context({body:JSON.stringify(lyricJSON(['Same phrase','Same phrase','♪',''])),env:{TRANSLATION_ENABLED:'true'},network:translated});
  const r=await run(x.ctx);assert.equal(new globalThis.URL(x.calls[0].url).searchParams.getAll('q').length,1);
  assert.equal(value(r).lyrics.lines[0].words,value(r).lyrics.lines[1].words);assert.equal(value(r).lyrics.lines[2].words,'♪');assert.deepEqual(value(r).lyrics.alternatives[0].lines,['译文0','译文0','','']);
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
test('wrong Spotify metadata GID never searches backup services',async()=>{const x=context({status:404,body:'no lyrics',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async()=>new Response(metadataBytes({hex:HEX.replace(/1$/,'2')}))});const r=await run(x.ctx);assert.equal(r.status,undefined);assert.equal(x.calls.length,2);assert.ok(x.calls.every(c=>c.url.startsWith('https://spclient.wg.spotify.com/')));});
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
test('metadata discovery off leaves no-lyrics flag untouched and sends no search',async()=>{const input=metadataBytes(),x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:input,type:'application/x-protobuf',env:{DISCOVER_MISSING:'false'}});const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);assert.equal(x.calls.length,0);});
test('metadata discovery only marks lyrics available AFTER successful backup lookup',async()=>{
  const input=metadataBytes(),store=new Map(),x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:input,type:'application/x-protobuf',store,env:{DISCOVER_MISSING:'true'},network:metaNetwork});
  const r=await run(x.ctx);assert.equal(parseMetadata(new Uint8Array(r.body),HEX).hasLyrics,true);
  const before=readFields(input).filter(f=>f.no!==18),after=readFields(r.body).filter(f=>f.no!==18);assert.deepEqual(after.map(f=>f.raw),before.map(f=>f.raw));
  const next=context({store,status:404,body:'not found',type:'application/x-protobuf'});const filled=await run(next.ctx);assert.equal(filled.status,200);assert.equal(next.calls.length,0);
});
test('omitted proto2 lyrics flag defaults to false and can be filled after verified backup',async()=>{const input=metadataBytes({flag:null}),x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:input,type:'application/x-protobuf',env:{DISCOVER_MISSING:'true'},network:metaNetwork});const parsed=parseMetadata(input,HEX);assert.equal(parsed.hasLyrics,false);assert.equal(parsed.hasLyricsField,false);const r=await run(x.ctx);assert.equal(parseMetadata(r.body,HEX).hasLyrics,true);assert.equal(x.calls.length,1);});
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
test('partial native translation retains empty placeholders without shifting line indices',async()=>{
  const lines=Array.from({length:40},(_,i)=>'Self written sentence '+i),x=context({body:JSON.stringify(lyricJSON(lines)),env:{TRANSLATION_ENABLED:'true'},network:async u=>new globalThis.URL(u).searchParams.getAll('q').length===32?translated(u):new Response('unavailable',{status:503})});
  const r=await run(x.ctx),out=value(r).lyrics;assert.deepEqual(out.lines.map(l=>l.words),lines);assert.equal(out.alternatives[0].lines.length,40);assert.ok(out.alternatives[0].lines[0]);assert.equal(out.alternatives[0].lines[39],'');
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

function protoAlternative(language,rows){return bin(9,cat(txt(1,language),...rows.map(row=>txt(2,row))));}
function withProtoAlternative(input,alternative){const f=readFields(input);return cat(bin(1,cat(f[0].payload,alternative)),...f.slice(1).map(x=>x.raw));}
test('Spotify official same-language JSON translation is replaced with plugin output',async()=>{
  const input=lyricJSON();input.lyrics.alternatives=[{language:'zh',lines:['官方甲','官方乙'],future:'preserve'}];
  const body=JSON.stringify(input,null,2),x=context({body,env:{TRANSLATION_ENABLED:'true'},network:translated}),out=value(await run(x.ctx));
  assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['译文0','译文1']}]);assert.deepEqual(out.lyrics.lines,input.lyrics.lines);assert.equal(x.calls.length,1);
});
test('official translations for other languages are removed from the native list',async()=>{
  const input=lyricJSON(),foreign={language:'fr',lines:['Une ligne','Autre ligne'],future:{keep:true}};input.lyrics.alternatives=[foreign];
  const x=context({body:JSON.stringify(input),env:{TRANSLATION_ENABLED:'true'},network:translated}),out=value(await run(x.ctx));
  assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['译文0','译文1']}]);assert.deepEqual(out.lyrics.lines,input.lyrics.lines);
});
test('unknown JSON alternative contents are replaced as a whole while original lyric rows are kept',async()=>{
  const input=lyricJSON();input.lyrics.alternatives=[{language:'zh',lines:[{words:'not the current native string schema'}]}];
  const body=JSON.stringify(input),x=context({body,env:{TRANSLATION_ENABLED:'true'},network:translated}),out=value(await run(x.ctx));
  assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['译文0','译文1']}]);assert.deepEqual(out.lyrics.lines,input.lyrics.lines);assert.equal(x.calls.length,1);
});
test('a misaligned official translation is replaced by correctly aligned plugin rows',async()=>{
  const input=lyricJSON();input.lyrics.alternatives=[{language:'zh-CN',lines:['only one row']}];const body=JSON.stringify(input),x=context({body,env:{TRANSLATION_ENABLED:'true'},network:translated});
  const out=value(await run(x.ctx));assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['译文0','译文1']}]);assert.equal(x.calls.length,1);
});
test('protobuf native translation stores repeated text strings, not nested lyric messages',async()=>{
  const input=withProtoAlternative(rawProto(),protoAlternative('fr',['Première ligne','Deuxième ligne'])),x=context({body:input,type:'application/vnd.google.protobuf',env:{TRANSLATION_ENABLED:'true'},network:translated});
  const r=await run(x.ctx),before=readFields(readFields(input)[0].payload),after=readFields(readFields(r.body)[0].payload);
  assert.deepEqual(after.filter(f=>f.no!==9).map(f=>f.raw),before.filter(f=>f.no!==9).map(f=>f.raw));const alts=after.filter(f=>f.no===9);assert.equal(alts.length,1);
  const newAlt=readFields(alts[0].payload);assert.deepEqual(newAlt.map(f=>[f.no,f.payload.toString()]),[[1,'zh-CN'],[2,'译文0'],[2,'译文1']]);
});
test('existing official protobuf translation is replaced and never reused as plugin output',async()=>{
  const input=withProtoAlternative(rawProto(),protoAlternative('zh',['官方甲','官方乙'])),x=context({body:input,type:'application/vnd.google.protobuf',env:{TRANSLATION_ENABLED:'true'},network:translated});
  const r=await run(x.ctx),alts=readFields(readFields(r.body)[0].payload).filter(f=>f.no===9);assert.equal(alts.length,1);assert.deepEqual(readFields(alts[0].payload).filter(f=>f.no===2).map(f=>f.payload.toString()),['译文0','译文1']);assert.equal(x.calls.length,1);assert.equal(Buffer.from(r.body).includes(Buffer.from('官方甲')),false);
});
test('unknown nested-message protobuf alternatives are removed without decoding their contents',async()=>{
  const oldSchema=bin(9,cat(txt(1,'zh'),bin(2,cat(int(1,1000),txt(2,'legacy row'))))),input=withProtoAlternative(rawProto(),oldSchema),x=context({body:input,type:'application/vnd.google.protobuf',env:{TRANSLATION_ENABLED:'true'},network:translated});
  const r=await run(x.ctx),alts=readFields(readFields(r.body)[0].payload).filter(f=>f.no===9);assert.equal(alts.length,1);assert.deepEqual(readFields(alts[0].payload).filter(f=>f.no===2).map(f=>f.payload.toString()),['译文0','译文1']);assert.equal(Buffer.from(r.body).includes(Buffer.from('legacy row')),false);assert.equal(x.calls.length,1);
});
test('original typography, RTL, preview rows and fullscreen action are unchanged',async()=>{
  const input=lyricJSON();Object.assign(input.lyrics,{isDenseTypeface:true,isRtlLanguage:true,fullscreenAction:'FULLSCREEN_LYRICS',previewLines:[{startTimeMs:'1000',words:fixtureLines[0],future:'keep'}]});
  const x=context({body:JSON.stringify(input),env:{TRANSLATION_ENABLED:'true'},network:translated}),out=value(await run(x.ctx));
  for(const key of Object.keys(input.lyrics))assert.deepEqual(out.lyrics[key],input.lyrics[key]);assert.deepEqual(out.colors,input.colors);
});
test('native alternative writer rejects a shifted line count',()=>{
  for(const [body,type] of [[Buffer.from(JSON.stringify(lyricJSON())),'application/json'],[rawProto(),'application/vnd.google.protobuf']]){const doc=parseDocument(new Uint8Array(body),type);assert.throws(()=>doc.writeNative('zh-CN',['only one row']));}
});
test('image-qualified lyric endpoint is intercepted without touching other endpoints',async()=>{
  const url=URL+'/image/https%3A%2F%2Fi.scdn.co%2Fimage%2Ftest?format=json';assert.ok(LYRIC_URL.test(url));
  const x=context({url,env:{TRANSLATION_ENABLED:'true'},network:translated}),out=value(await run(x.ctx));assert.equal(out.lyrics.alternatives[0].language,'zh-CN');assert.equal(LYRIC_URL.test(URL+'/image/space is invalid'),false);
});
test('native protobuf MIME is retained after adding a translation',async()=>{
  const x=context({body:rawProto(),type:'application/vnd.google.protobuf',env:{TRANSLATION_ENABLED:'true'},network:translated}),r=await run(x.ctx);assert.equal(new Headers(r.headers).get('Content-Type'),'application/vnd.google.protobuf');
});
test('fallback lyrics use native translation without adding words to the original rows',async()=>{
  const x=context({status:404,body:'{}',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},env:{TRANSLATION_ENABLED:'true'},network:metaNetwork}),r=await run(x.ctx),out=value(r);
  assert.equal(r.status,200);assert.equal(out.lyrics.provider,'lrclib');assert.deepEqual(out.lyrics.lines.map(l=>l.words),fixtureLines);assert.deepEqual(out.lyrics.alternatives[0].lines,['译文0','译文1']);
});

// Independent native card and batched metadata fixtures: no production encoder.
const SCROLL = `https://gew1-spclient.spotify.com/scrollsita/v1/scroll/spotify:track:${ID}`;
const EXTENDED = 'https://spclient.wg.spotify.com/extended-metadata/v0/extended-metadata';
function scrollBytes({lyrics=false}={}) {
  const sections=[bin(1,cat(bin(4,txt(1,'preserve credits')),txt(23,'opaque-section-info')))];
  if(lyrics)sections.push(bin(1,bin(5,txt(1,'spotify:track:'+ID))));
  return cat(bin(1,cat(...sections,txt(80,'structure-unknown'))),txt(2,'response-info-opaque'),txt(70,'root-unknown'));
}
function batchBytes({track=metadataBytes(),uri='spotify:track:'+ID,kind=10,type='type.googleapis.com/spotify.metadata.Track',status=200}={}) {
  const any=cat(txt(1,type),bin(2,track),txt(100,'any-unknown'));
  const entity=cat(bin(1,cat(int(1,status),txt(2,'old-etag'),int(4,86400),int(5,86400),txt(88,'header-unknown'))),txt(2,uri),bin(3,any),txt(90,'entity-unknown'));
  const group=cat(bin(1,cat(int(2,86400),int(3,86400),int(4,1))),int(2,kind),bin(3,entity),txt(91,'group-unknown'));
  return cat(bin(2,group),bin(2,cat(int(2,5),bin(3,txt(90,'opaque-audio-data')))),txt(92,'batch-unknown'));
}
test('missing native player card is added only after native 404 and exact backup, then the actual lyric request is fulfilled from cache',async()=>{
  const input=scrollBytes(),store=new Map(),x=context({store,url:SCROLL,body:input,type:'application/x-protobuf',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN','Client-Token':'TEST_ONLY_CLIENT',Cookie:'NEVER_FORWARD'},network:async(u,o)=>u.includes('/color-lyrics/')?new Response('no lyrics',{status:404}):metaNetwork(u,o)});
  const r=await run(x.ctx),root=readFields(r.body),old=readFields(input),inner=readFields(root[0].payload),prior=readFields(old[0].payload);
  assert.deepEqual(root.slice(1).map(f=>f.raw),old.slice(1).map(f=>f.raw));assert.deepEqual(inner.slice(1).map(f=>f.raw),prior.map(f=>f.raw));
  const lyricCard=readFields(readFields(inner[0].payload)[0].payload);assert.equal(lyricCard[0].payload.toString(),'spotify:track:'+ID);
  assert.equal(x.calls.length,3);assert.ok(x.calls[0].url.startsWith('https://gew1-spclient.spotify.com/color-lyrics/'));assert.ok(x.calls[0].options.headers['x-verselyrics-internal']);
  assert.equal(x.calls[2].options.headers.Authorization,undefined);assert.equal(x.calls[2].options.headers.Cookie,undefined);
  const next=context({store,status:404,body:'missing',type:'application/x-protobuf',env:{TRANSLATION_ENABLED:'true'},network:translated}),out=await run(next.ctx);
  assert.equal(out.status,200);assert.deepEqual(parseDocument(out.body,'application/x-protobuf').words,fixtureLines);assert.equal(next.calls.length,1);assert.ok(next.calls[0].url.startsWith('https://translate.googleapis.com/'));
});
test('an existing native lyrics card is kept byte-for-byte with no network calls',async()=>{
  const input=scrollBytes({lyrics:true}),x=context({url:SCROLL,body:input,type:'application/x-protobuf'});const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);assert.equal(x.calls.length,0);
});
test('discovery explicitly off preserves missing card and reports the disabled setting',async()=>{
  const input=scrollBytes(),x=context({url:SCROLL,body:input,type:'application/x-protobuf',env:{DISCOVER_MISSING:'false'}});const r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);assert.equal(x.calls.length,0);assert.match(x.store.get('VerseLyrics.v1.status'),/已关闭/);
});
test('a JSON card list keeps all prior sections, adds only the current track, and is not duplicated on reprocessing',async()=>{
  const input={structure:{sections:[{credits:{opaque:true}}],future:7},future:'keep'},store=new Map();
  const cache=loadCache(context({store}).ctx);cache.put('lyrics:auto:'+ID,{lyrics:{providerDisplayName:'LRCLIB',lines:[{words:'Self written line'}]}});cache.save();
  const x=context({url:SCROLL,body:JSON.stringify(input),store}),r=await run(x.ctx),out=value(r);assert.deepEqual(out.structure.sections,[{lyrics:{entityUri:'spotify:track:'+ID}},...input.structure.sections]);assert.equal(out.future,'keep');assert.equal(out.structure.future,7);assert.equal(x.calls.length,0);
  const second=context({url:SCROLL,body:JSON.stringify(out),store});assert.deepEqual(value(await run(second.ctx)),out);assert.equal(second.calls.length,0);
});
for(const httpStatus of [401,403,429,500])test(`native preflight ${httpStatus} does not trigger backup or a synthetic card`,async()=>{
  const input=scrollBytes(),x=context({url:SCROLL,body:input,type:'application/x-protobuf',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async()=>new Response('error',{status:httpStatus})}),r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),input);assert.equal(x.calls.length,1);
});
test('unknown or entitlement native preflight payload leaves missing card intact',async()=>{
  for(const body of ['{"error":"unknown"}','{"lyrics":{"lines":[],"showUpsell":true}}']){
    const input=scrollBytes(),x=context({url:SCROLL,body:input,type:'application/x-protobuf',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async()=>new Response(body,{headers:{'Content-Type':'application/json'}})});assert.deepEqual(Buffer.from((await run(x.ctx)).body),input);assert.equal(x.calls.length,1);
  }
});
test('native Spotify lyrics take priority when a missing card is found',async()=>{
  const x=context({url:SCROLL,body:scrollBytes(),type:'application/x-protobuf',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async()=>new Response(JSON.stringify(lyricJSON()),{headers:{'Content-Type':'application/json'}})});const r=await run(x.ctx);assert.ok(r.headers);assert.equal(x.calls.length,1);assert.match(x.store.get('VerseLyrics.v1.status'),/Spotify/);
});
test('no matching fallback means no new card, with provider-specific diagnostics',async()=>{
  const input=scrollBytes(),x=context({url:SCROLL,body:input,type:'application/x-protobuf',env:{FALLBACK_PROVIDER:'lrclib'},requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'},network:async(u,o)=>u.includes('/color-lyrics/')?new Response('missing',{status:404}):u.includes('/metadata/')?metaNetwork(u,o):new Response('[]')});
  assert.deepEqual(Buffer.from((await run(x.ctx)).body),input);assert.match(x.store.get('VerseLyrics.v1.status'),/LRCLIB：未找到同版本/);
});
test('batched TRACK_V4 discovery caches track identity and changes only the matched flag and its cache validators',async()=>{
  const input=batchBytes(),x=context({url:EXTENDED,body:input,type:'application/x-protobuf',network:metaNetwork}),r=await run(x.ctx),parsed=extendedTracks(r.body);
  assert.equal(parsed.records.length,1);assert.equal(parsed.records[0].hasLyrics,true);assert.equal(x.calls.length,1);assert.ok(x.calls[0].url.startsWith('https://lrclib.net/'));
  const before=readFields(input),after=readFields(r.body);assert.deepEqual(after.slice(1).map(f=>f.raw),before.slice(1).map(f=>f.raw));
  const old=extendedTracks(input).records[0],now=parsed.records[0];
  for(const key of ['fs','anyFields','entityFields','groupFields']){
    const excluded={fs:[18],anyFields:[2],entityFields:[1,3],groupFields:[1,3]}[key];
    assert.deepEqual(now[key].filter(f=>!excluded.includes(f.number)).map(f=>Buffer.from(f.raw)),old[key].filter(f=>!excluded.includes(f.number)).map(f=>Buffer.from(f.raw)));
  }
  const headerFields=readFields(now.entityFields.find(f=>f.number===1).payload);assert.equal(headerFields.some(f=>f.no===2),false);assert.ok(headerFields.some(f=>f.no===88));
});
test('batched metadata with discovery off still primes the cache for the actual lyric request',async()=>{
  const store=new Map(),input=batchBytes(),x=context({store,url:EXTENDED,body:input,type:'application/x-protobuf',env:{DISCOVER_MISSING:'false'}});assert.deepEqual(Buffer.from((await run(x.ctx)).body),input);assert.equal(x.calls.length,0);
  const next=context({store,status:404,body:'missing',network:metaNetwork}),r=await run(next.ctx);assert.equal(r.status,200);assert.equal(next.calls.length,1);assert.ok(next.calls[0].url.startsWith('https://lrclib.net/'));
});
for(const opts of [{kind:5},{type:'type.googleapis.com/spotify.unknown.Track'},{status:403},{uri:'spotify:episode:'+ID},{track:metadataBytes({hex:HEX.replace(/1$/,'2')})}])test('unknown, non-track, forbidden, or mismatched extended entity stays opaque: '+JSON.stringify(opts).slice(0,75),async()=>{
  const input=batchBytes(opts),x=context({url:EXTENDED,body:input,type:'application/x-protobuf'});assert.deepEqual(Buffer.from((await run(x.ctx)).body),input);assert.equal(x.calls.length,0);
});
test('retired metadata/4 can retrieve exactly the requested track through the native batched endpoint',async()=>{
  const x=context({status:404,body:'missing',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN',Cookie:'NEVER_FORWARD'},network:async(u,o)=>u.includes('/metadata/4/')?new Response('gone',{status:404}):u.includes('/extended-metadata/')?new Response(batchBytes(),{headers:{'Content-Type':'application/x-protobuf'}}):metaNetwork(u,o)});
  assert.equal((await run(x.ctx)).status,200);assert.equal(x.calls.length,3);assert.equal(x.calls[1].method,'POST');assert.equal(x.calls[1].options.headers.Cookie,undefined);assert.equal(x.calls[2].options.headers.Authorization,undefined);
  const request=readFields(x.calls[1].options.body),entity=readFields(request[0].payload);assert.equal(entity[0].payload.toString(),'spotify:track:'+ID);assert.equal(readFields(entity[1].payload)[0].raw.at(-1),10);
});
test('cached batch identity and backup allow a missing player card without any token or network',async()=>{
  const store=new Map();await run(context({store,url:EXTENDED,body:batchBytes(),type:'application/x-protobuf',network:metaNetwork}).ctx);
  const x=context({store,url:SCROLL,body:scrollBytes(),type:'application/x-protobuf'}),r=await run(x.ctx);assert.equal(x.calls.length,0);assert.ok(r.headers);assert.equal(readFields(readFields(readFields(r.body)[0].payload)[0].payload)[0].no,5);
});
test('route filters allow explicit TLS ports and encoded track URIs, reject spoofing and episode cards',()=>{
  assert.ok(SCROLL_URL.test(SCROLL));assert.ok(SCROLL_URL.test(SCROLL.replace('.com/','.com:443/').replaceAll(':track:','%3Atrack%3A')+'?platform=iphone'));assert.ok(EXTENDED_URL.test(EXTENDED+'?x=1'));assert.ok(LYRIC_URL.test(URL.replace('.com/','.com:443/')));
  for(const uri of [SCROLL.replace('spotify.com','spotify.com.evil.test'),SCROLL.replace(':track:',':episode:'),SCROLL+'/other',SCROLL.replace('https:','http:')])assert.equal(SCROLL_URL.test(uri),false);
});
test('diagnostic history keeps separate stages, is bounded, and never stores request tokens, cookies, or query strings',async()=>{
  const store=new Map();for(let i=0;i<12;i++)await run(context({store,url:SCROLL+'?private=SECRET_QUERY',body:scrollBytes({lyrics:true}),type:'application/x-protobuf',requestHeaders:{Authorization:'Bearer SECRET_BEARER',Cookie:'SECRET_COOKIE'}}).ctx);
  const events=JSON.parse(store.get('VerseLyrics.v1.events'));assert.equal(events.length,8);assert.ok(events.every(e=>e.route==='player-cards'&&e.trackId===ID));assert.doesNotMatch(JSON.stringify([...store]),/SECRET_/);
  const x=context({store});delete x.ctx.request;const widget=await run(x.ctx);assert.ok(widget.children.some(c=>c.text?.includes('无词发现：开')));assert.ok(widget.children.some(c=>c.text?.includes('player-cards')));
});
test('a batched response keeps another track without a matching source unchanged',async()=>{
  const first=batchBytes(),second=batchBytes({track:metadataBytes({hex:HEX.replace(/1$/,'2'),title:'Unmatched second title'}),uri:'spotify:track:0000000000000000000002'});
  const firstRoot=readFields(first),firstGroup=readFields(firstRoot[0].payload),secondEntity=readFields(readFields(second)[0].payload).find(f=>f.no===3);
  const input=cat(bin(2,cat(...firstGroup.map(f=>f.raw),secondEntity.raw)),...firstRoot.slice(1).map(f=>f.raw));
  const x=context({url:EXTENDED,body:input,type:'application/x-protobuf',env:{FALLBACK_PROVIDER:'lrclib'},network:metaNetwork}),r=await run(x.ctx),records=extendedTracks(r.body).records;
  assert.equal(records[0].hasLyrics,true);assert.equal(records[1].hasLyrics,false);assert.deepEqual(Buffer.from(records[1].entity.raw),secondEntity.raw);assert.equal(x.calls.length,2);
});
test('native has-lyrics batch stays unchanged and never queries fallback',async()=>{
  const input=batchBytes({track:metadataBytes({flag:1})}),x=context({url:EXTENDED,body:input,type:'application/x-protobuf'});assert.deepEqual(Buffer.from((await run(x.ctx)).body),input);assert.equal(x.calls.length,0);
});
test('no in-flight token or cached identity cannot manufacture a missing player card',async()=>{
  const input=scrollBytes(),x=context({url:SCROLL,body:input,type:'application/x-protobuf'});assert.deepEqual(Buffer.from((await run(x.ctx)).body),input);assert.equal(x.calls.length,0);
});
test('malformed discovery envelopes preserve every input byte and do not issue any lookup',async()=>{
  for(const url of [SCROLL,EXTENDED])for(const input of [Buffer.from([10,255]),Buffer.from([18,128]),Buffer.from([255,0]),Buffer.from([10,2,10])]){
    const x=context({url,body:input,type:'application/x-protobuf',requestHeaders:{Authorization:'Bearer TEST_ONLY_TOKEN'}});assert.deepEqual(Buffer.from((await run(x.ctx)).body),input);assert.equal(x.calls.length,0);
  }
});
const targetFixture=JSON.parse(readFileSync(new globalThis.URL('./fixtures/target-song.json',import.meta.url),'utf8'));
test('real user track metadata keeps its identity and recognizes its omitted proto2 false flag',()=>{
  const parsed=parseMetadata(Buffer.from(targetFixture.metadata_base64,'base64'),targetFixture.track_hex);
  assert.deepEqual(parsed.meta,{id:targetFixture.track_id,title:targetFixture.expected.title,album:targetFixture.expected.album,artists:targetFixture.expected.artists,duration:targetFixture.expected.duration});
  assert.equal(parsed.hasLyrics,false);assert.equal(parsed.hasLyricsField,false);assert.equal(matches(parsed.meta,targetFixture.qq_candidate),true);
});
test('traditional and simplified metadata match without accepting a wrong artist, edition, album, or duration',()=>{
  const meta={title:'晴天',album:'葉惠美',artists:['周杰倫'],duration:269.9};
  const candidate={title:'晴天',album:'叶惠美',artists:['周杰伦'],duration:270};assert.equal(matches(meta,candidate),true);
  for(const delta of [{title:'晴天 (Live)'},{album:'精选辑'},{artists:['另一个人']},{duration:280}])assert.equal(matches(meta,{...candidate,...delta}),false);
  assert.equal(metadataNormal('王俊凱'),metadataNormal('王俊凯'));assert.equal(metadataNormal('那頁夏天'),metadataNormal('那页夏天'));
});
test('target song with real metadata reaches QQ fallback, sets native availability, then serves native timed lyrics',async()=>{
  const store=new Map(),metaBytes=Buffer.from(targetFixture.metadata_base64,'base64'),qq=targetFixture.qq_candidate;
  const network=async u=>u.includes('/soso/')?new Response(JSON.stringify({code:0,data:{song:{list:[{songmid:qq.id,songname:qq.title,albumname:qq.album,singer:qq.artists.map(name=>({name})),interval:qq.duration}]}}})):u.includes('/lyric/')?new Response(JSON.stringify({retcode:0,lyric:'[00:12.34]Self written target regression line\n[00:20.00]Another original test line'})):new Response('unavailable',{status:429});
  const meta=context({store,url:'https://spclient.wg.spotify.com/metadata/4/track/'+targetFixture.track_hex,body:metaBytes,type:'application/x-protobuf',network}),r=await run(meta.ctx);
  assert.equal(parseMetadata(r.body,targetFixture.track_hex).hasLyrics,true);assert.ok(meta.calls.some(c=>c.url.includes('/lyric/')));
  const next=context({store,url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+targetFixture.track_id,status:404,body:'missing',type:'application/vnd.google.protobuf'}),filled=await run(next.ctx);
  assert.equal(filled.status,200);assert.equal(next.calls.length,0);const doc=parseDocument(filled.body,'application/vnd.google.protobuf');assert.equal(doc.words[0],'Self written target regression line');
  const raw=readFields(readFields(filled.body)[0].payload);assert.deepEqual(readFields(raw.find(f=>f.no===2).payload)[0].raw,int(1,12340));
});
test('batched metadata also handles an omitted has-lyrics flag instead of skipping the track',async()=>{
  const input=batchBytes({track:metadataBytes({flag:null})}),x=context({url:EXTENDED,body:input,type:'application/x-protobuf',network:metaNetwork});
  const r=await run(x.ctx);assert.equal(extendedTracks(r.body).records[0].hasLyrics,true);assert.equal(x.calls.length,1);
});
test('metadata Han folding does not suppress a simplified-to-traditional lyric translation',async()=>{
  const input=lyricJSON(['头发随风飘动']),x=context({body:JSON.stringify(input),env:{TRANSLATION_ENABLED:'true',TARGET_LANGUAGE:'zh-TW'},network:async()=>new Response(JSON.stringify([['頭髮隨風飄動','zh-CN']]))});
  const out=value(await run(x.ctx));assert.deepEqual(out.lyrics.lines,input.lyrics.lines);assert.equal(out.lyrics.alternatives[0].lines[0],'頭髮隨風飄動');
});
test('invalid bool wire values cannot be interpreted as missing lyrics or trigger a lookup',async()=>{
  for(const input of [metadataBytes({flag:2}),cat(metadataBytes({flag:null}),txt(18,'not a boolean'))]){
    const x=context({url:`https://spclient.wg.spotify.com/metadata/4/track/${HEX}`,body:input,type:'application/x-protobuf',network:metaNetwork});assert.deepEqual(Buffer.from((await run(x.ctx)).body),input);assert.equal(x.calls.length,0);
  }
});
test('complete translation failure removes every official JSON alternative and retains original lyrics',async()=>{
  const input=lyricJSON();input.lyrics.alternatives=[{language:'zh',lines:['OFFICIAL_A','OFFICIAL_B']},{language:'en',lines:['OFFICIAL_C','OFFICIAL_D']}];
  const x=context({body:JSON.stringify(input),env:{TRANSLATION_ENABLED:'true'},network:async()=>new Response('unavailable',{status:503})}),out=value(await run(x.ctx));
  assert.deepEqual(out.lyrics.alternatives,[]);assert.deepEqual(out.lyrics.lines,input.lyrics.lines);assert.deepEqual(out.colors,input.colors);assert.match(x.store.get('VerseLyrics.v1.status'),/官方译文已移除/);assert.equal(JSON.stringify(out).includes('OFFICIAL_'),false);
});
test('complete translation failure removes all protobuf alternatives and preserves every non-translation byte',async()=>{
  const input=withProtoAlternative(withProtoAlternative(rawProto(),protoAlternative('zh',['OFFICIAL_A','OFFICIAL_B'])),protoAlternative('fr',['OFFICIAL_C','OFFICIAL_D']));
  const x=context({body:input,type:'application/vnd.google.protobuf',env:{TRANSLATION_ENABLED:'true'},network:async()=>new Response('unavailable',{status:503})}),r=await run(x.ctx),before=readFields(input),after=readFields(r.body);
  assert.deepEqual(after.slice(1).map(f=>f.raw),before.slice(1).map(f=>f.raw));
  assert.deepEqual(readFields(after[0].payload).map(f=>f.raw),readFields(before[0].payload).filter(f=>f.no!==9).map(f=>f.raw));assert.equal(Buffer.from(r.body).includes(Buffer.from('OFFICIAL_')),false);
});
test('partial translation failure never fills remaining rows with official text',async()=>{
  const input=lyricJSON(Array.from({length:40},(_,i)=>'Self written line '+i));input.lyrics.alternatives=[{language:'zh-CN',lines:Array.from({length:40},(_,i)=>'OFFICIAL_'+i)}];
  const x=context({body:JSON.stringify(input),env:{TRANSLATION_ENABLED:'true'},network:async u=>new globalThis.URL(u).searchParams.getAll('q').length===32?translated(u):new Response('unavailable',{status:503})});
  const out=value(await run(x.ctx));assert.equal(out.lyrics.alternatives.length,1);assert.equal(out.lyrics.alternatives[0].lines.length,40);assert.ok(out.lyrics.alternatives[0].lines[0]);assert.equal(out.lyrics.alternatives[0].lines[39],'');assert.deepEqual(out.lyrics.lines,input.lyrics.lines);assert.equal(JSON.stringify(out).includes('OFFICIAL_'),false);
});
test('turning plugin translation off keeps official data unchanged and sends no translation request',async()=>{
  const input=lyricJSON();input.lyrics.alternatives=[{language:'zh',lines:['官方甲','官方乙']}];const body=JSON.stringify(input,null,2),x=context({body,env:{TRANSLATION_ENABLED:'false'}});
  assert.equal(Buffer.from((await run(x.ctx)).body).toString(),body);assert.equal(x.calls.length,0);
});
test('changing the plugin target removes old-language official entries and writes only the chosen language',async()=>{
  const input=lyricJSON();input.lyrics.alternatives=[{language:'zh',lines:['官方甲','官方乙']},{language:'en',lines:['Official A','Official B']}];
  const x=context({body:JSON.stringify(input),env:{TRANSLATION_ENABLED:'true',TARGET_LANGUAGE:'ja'},network:async()=>new Response(JSON.stringify([['訳文甲','en'],['訳文乙','en']]))});
  assert.deepEqual(value(await run(x.ctx)).lyrics.alternatives,[{language:'ja',lines:['訳文甲','訳文乙']}]);
});
test('official alternatives are replaced with cached plugin translations on every response',async()=>{
  const input=lyricJSON();input.lyrics.alternatives=[{language:'zh',lines:['官方甲','官方乙']}];const store=new Map();
  await run(context({store,body:JSON.stringify(input),env:{TRANSLATION_ENABLED:'true'},network:translated}).ctx);
  const second=context({store,body:JSON.stringify(input),env:{TRANSLATION_ENABLED:'true'}}),out=value(await run(second.ctx));assert.equal(second.calls.length,0);assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['译文0','译文1']}]);
});
test('multiple protobuf official languages and duplicate language entries collapse to one plugin alternative',async()=>{
  const input=withProtoAlternative(withProtoAlternative(withProtoAlternative(rawProto(),protoAlternative('zh',['OLD_A','OLD_B'])),protoAlternative('fr',['OLD_C','OLD_D'])),protoAlternative('zh-CN',['OLD_E','OLD_F']));
  const x=context({body:input,type:'application/vnd.google.protobuf',env:{TRANSLATION_ENABLED:'true'},network:translated}),r=await run(x.ctx),before=readFields(input),after=readFields(r.body),inner=readFields(after[0].payload),alts=inner.filter(f=>f.no===9);
  assert.equal(alts.length,1);assert.deepEqual(readFields(alts[0].payload).map(f=>[f.no,f.payload.toString()]),[[1,'zh-CN'],[2,'译文0'],[2,'译文1']]);assert.equal(Buffer.from(r.body).includes(Buffer.from('OLD_')),false);
  assert.deepEqual(inner.filter(f=>f.no!==9).map(f=>f.raw),readFields(before[0].payload).filter(f=>f.no!==9).map(f=>f.raw));assert.deepEqual(after.slice(1).map(f=>f.raw),before.slice(1).map(f=>f.raw));
});
test('a non-array official JSON alternative container is replaced without changing the original lyric payload',async()=>{
  const input=lyricJSON();input.lyrics.alternatives={official:['OLD_A','OLD_B']};const x=context({body:JSON.stringify(input),env:{TRANSLATION_ENABLED:'true'},network:translated}),out=value(await run(x.ctx));
  assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['译文0','译文1']}]);assert.deepEqual(out.lyrics.lines,input.lyrics.lines);assert.deepEqual(out.future,input.future);
});
