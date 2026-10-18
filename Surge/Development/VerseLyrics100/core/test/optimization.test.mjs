import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import run,{utf8,text,loadCache,sourceCandidates,sourceLyrics,backup,encodeDocument,parseDocument,fields} from '../spotify-lyrics.js';
import request from '../../request-core.js';
const KEY='VerseLyrics.v1.cache',id='0000000000000000000001';
const meta={id,title:'Paper Lantern',album:'Quiet Walk',artists:['Ada North'],duration:180};
const record={trackName:meta.title,artistName:'Ada North',albumName:meta.album,duration:180,syncedLyrics:'[00:01.00]My paper lantern floats.\n[00:03.00]The evening brings it home.'};
const shape=r=>({title:r.trackName,artists:[r.artistName],album:r.albumName,duration:r.duration});
function setup(network=async()=>new Response('[]')){
 const store=new Map(),calls=[],reads=[],writes=[];
 const ctx={env:{TRANSLATION_ENABLED:false},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:'application/x-protobuf'})},response:new Response('missing',{status:404}),storage:{getJSON:k=>{reads.push(k);return store.has(k)?JSON.parse(store.get(k)):null;},setJSON:(k,v)=>{writes.push(k);store.set(k,JSON.stringify(v));}},http:{get:async(u,o)=>{calls.push({u,o});return network(u,o);},post:async(u,o)=>{calls.push({u,o});return network(u,o);}}};
 const state={cache:loadCache(ctx),settings:{provider:'lrclib',language:'zh-CN',translate:false,discover:true},deadline:Date.now()+20000};
 return {ctx,state,store,calls,reads,writes};
}
test('bounded UTF-8 codecs agree with independent platform encoders across the full Unicode range',()=>{
 let seed=42;const chars=[];for(let i=0;i<20000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const c=seed%0x110000;if(c<0xd800||c>0xdfff)chars.push(String.fromCodePoint(c));}
 for(const s of ['', '\uFEFFHello\0中文𳈆👨‍👩‍👧‍👦',chars.join(''),'\u007f\u0080\u07ff\u0800\uffff\u{10000}\u{10ffff}','中文🎵'.repeat(150000)]){
  assert.deepEqual(Buffer.from(utf8(s,2*1024*1024)),Buffer.from(s));assert.equal(text(Buffer.from(s)),s);
 }
});
for(const bytes of [[0xc0,0x80],[0xc1,0xbf],[0xe0,0x80,0x80],[0xed,0xa0,0x80],[0xf0,0x80,0x80,0x80],[0xf4,0x90,0x80,0x80],[0xf5,0x80,0x80,0x80],[0x80],[0xff],[0xe2,0x82],[0xc2,0x41]])test('invalid UTF-8 fails closed '+bytes,()=>{assert.throws(()=>new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes)));assert.throws(()=>text(new Uint8Array(bytes)));});
for(const s of ['\ud800','\udfff','A\ud800Z'])test('unpaired surrogate still fails closed '+JSON.stringify(s),()=>{assert.throws(()=>utf8(s));});
test('Han matching does not construct a variant Map; uncommon Unicode 17 variants still fold',()=>{
 const source=readFileSync(new URL('../spotify-lyrics.js',import.meta.url),'utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function entry(ctx)');
 const c={Map:class{constructor(){throw Error('variant Map allocated');}}};vm.runInNewContext(source+'\nthis.a=metadataNormal("English");this.b=metadataNormal("𳈆");this.c=metadataNormal("𮸧");',c);assert.equal(c.a,'english');assert.equal(c.b,c.c);
});
test('cache is lazy and read-only hits do not rewrite it',()=>{const x=setup();x.state.cache.save();assert.equal(x.reads.length,0);x.state.cache.put('a','b');x.state.cache.save();const count=x.writes.length;const c=loadCache(x.ctx);assert.equal(c.get('a'),'b');c.save();assert.equal(x.writes.length,count);});
test('legacy cache is compacted once; large records and repeated inserts stay bounded',()=>{
 const x=setup();x.store.set(KEY,JSON.stringify({entries:Array.from({length:700},(_,i)=>({key:'old'+i,value:'x'.repeat(450),expires:Date.now()+600000})),cooldowns:{}}));
 const c=x.state.cache;assert.ok(c.entries.length<=192);for(let i=0;i<2000;i++)c.put('new'+i,'值'.repeat(700));c.put('huge','x'.repeat(100000));c.save();
 const data=JSON.parse(x.store.get(KEY));assert.ok(data.entries.length<=192);assert.ok(x.store.get(KEY).length<=96000);assert.equal(c.get('huge'),undefined);assert.equal(c.get('new1999'),'值'.repeat(700));assert.ok(!data.entries.some(e=>e.key==='new0'));
});
test('concurrent cache writers preserve entries that were not in their initial snapshots',()=>{const x=setup(),a=loadCache(x.ctx),b=loadCache(x.ctx);a.get('empty');b.get('empty');a.put('a',1);b.put('b',2);a.save();b.save();const c=loadCache(x.ctx);assert.equal(c.get('a'),1);assert.equal(c.get('b'),2);});
test('a unique same-recording candidate can differ by single/album name',()=>{const r={...record,albumName:'Paper Lantern - Single'};assert.deepEqual(sourceCandidates(meta,[r],shape),[r]);});
test('exact album outranks equivalent album; null and malformed records are ignored',()=>{assert.deepEqual(sourceCandidates(meta,[null,{},record,{...record,albumName:'Compilation'}],shape),[record]);});
for(const delta of [{trackName:'Paper Lantern (Live)'},{artistName:'Another Artist'},{duration:182},{albumName:'Concert 2026'},{albumName:'Live at Home'},{albumName:'Remix Collection'},{albumName:'Remastered 2026'},{albumName:'Acoustic Collection'},{albumName:'伴奏版'}])test('relaxed album matching rejects wrong recording '+JSON.stringify(delta),()=>{const r={...record,albumName:'Another Edition',...delta};assert.deepEqual(sourceCandidates(meta,[r],shape),[]);});
test('two otherwise equivalent album candidates remain ambiguous',()=>{assert.deepEqual(sourceCandidates(meta,[{...record,albumName:'Single A'},{...record,albumName:'Single B'}],shape),[]);});
test('LRCLIB exact GET avoids the bulk search response',async()=>{const x=setup(async(u,o)=>{assert.ok(u.startsWith('https://lrclib.net/api/get?'));assert.match(o.headers['User-Agent'],/^VerseLyrics\/1.0.0 /);return new Response(JSON.stringify(record));});const d=await sourceLyrics(x.ctx,'lrclib',meta,x.state);assert.equal(d.lyrics.lines.length,2);assert.equal(x.calls.length,1);});
test('LRCLIB 404 searches without album filter, then validates the unique equivalent',async()=>{const x=setup(async u=>{if(u.includes('/api/get?'))return new Response('{}',{status:404});assert.equal(new URL(u).searchParams.has('album_name'),false);return new Response(JSON.stringify([{...record,albumName:'Paper Lantern - Single'}]));});assert.ok(await sourceLyrics(x.ctx,'lrclib',meta,x.state));assert.equal(x.calls.length,2);});
test('empty source results are negatively cached briefly and retried after expiry',async()=>{const x=setup();assert.equal(await backup(x.ctx,meta,x.state),null);const n=x.calls.length;assert.equal(n,2);assert.equal(await backup(x.ctx,meta,x.state),null);assert.equal(x.calls.length,n);x.state.cache.save();const data=JSON.parse(x.store.get(KEY));const e=data.entries.find(e=>e.key==='lyrics:lrclib:'+id);assert.ok(e.expires<=Date.now()+90000);e.expires=Date.now()-1;x.store.set(KEY,JSON.stringify(data));x.state.cache=loadCache(x.ctx);await backup(x.ctx,meta,x.state);assert.equal(x.calls.length,n*2);});
test('transient source errors stay retryable and retain Retry-After',async()=>{const x=setup(async()=>new Response('',{status:429,headers:{'Retry-After':'120'}}));await backup(x.ctx,meta,x.state);x.state.cache.save();const data=JSON.parse(x.store.get(KEY));assert.equal(data.entries.length,0);assert.ok(data.cooldowns['lrclib.net']>=Date.now()+119000);});
test('each source gets a chance when preceding sources time out',async()=>{
 const now=Date.now;let time=now();Date.now=()=>time;
 try{const x=setup(async(u,o)=>{if(!u.includes('music.163.com')){time+=o.timeout;throw Error('simulated timeout');}if(u.includes('search'))return new Response(JSON.stringify({code:200,result:{songs:[{id:42,name:meta.title,ar:[{name:'Ada North'}],al:{name:meta.album},dt:180000}]}}));return new Response(JSON.stringify({code:200,lrc:{lyric:record.syncedLyrics}}));});x.state.settings.provider='auto';const d=await backup(x.ctx,meta,x.state);assert.equal(d.lyrics.provider,'netease');assert.ok(x.calls.some(c=>c.u.includes('c.y.qq.com')));assert.ok(x.calls.every(c=>c.o.timeout<=6500));assert.ok(time<x.state.deadline);}finally{Date.now=now;}
});
test('oversized service body is rejected before reading it when length is known',async()=>{let read=false;const x=setup(async()=>({status:200,headers:new Headers({'Content-Length':400000}),arrayBuffer:async()=>{read=true;return new ArrayBuffer(400000);}}));await assert.rejects(sourceLyrics(x.ctx,'lrclib',meta,x.state),/service-body-limit/);assert.equal(read,false);});
test('oversized service body without a length is not decoded or parsed',async()=>{const x=setup(async()=>new Response('x'.repeat(400000)));await assert.rejects(sourceLyrics(x.ctx,'lrclib',meta,x.state),/service-body-limit/);});
test('missing lyrics do not trigger needless palette retrieval',async()=>{const x=setup();x.state.cache.put('meta:'+id,meta);x.state.cache.save();x.ctx.env.FALLBACK_PROVIDER='lrclib';const r=await run(x.ctx);assert.equal(r.status,undefined);assert.ok(x.calls.every(c=>c.u.startsWith('https://lrclib.net/')));const n=x.calls.length;x.ctx.response=new Response('missing',{status:404});await run(x.ctx);assert.equal(x.calls.length,n);});
test('new fallback protobuf encodes own translations in one pass',async()=>{const x=setup(async u=>u.includes('lrclib.net')?new Response(JSON.stringify(record)):u.includes('translate.googleapis')?new Response(JSON.stringify(['自写译文一','自写译文二'])):new Response('',{status:404}));x.state.cache.put('meta:'+id,meta);x.state.cache.save();x.ctx.env.TRANSLATION_ENABLED=true;const r=await run(x.ctx);const inner=fields(fields(r.body).find(f=>f.number===1).payload);const a=fields(inner.find(f=>f.number===9).payload);assert.deepEqual(a.filter(f=>f.number===2).map(f=>text(f.payload)),['自写译文一','自写译文二']);assert.deepEqual(parseDocument(r.body,'application/x-protobuf').words,['My paper lantern floats.','The evening brings it home.']);});
const routes=['color-lyrics/v2/track/'+id,'metadata/4/track/'+'0'.repeat(31)+'1','extended-metadata/v0/extended-metadata','scrollsita/v1/scroll/spotify:track:'+id,'user-customization-service/v1/customize','bootstrap/v1/bootstrap','context-resolve/v1/spotify:playlist:abcdef','connect-state/v1/devices/abcdefghijklmnop'];
for(const path of routes)test('lightweight request hook matches full processor: '+path,async()=>{
 for(const env of [{},{DISCOVER_MISSING:false},{FALLBACK_PROVIDER:'off',TRANSLATION_ENABLED:false},{TARGET_LANGUAGE:'bad'}])for(const accept of ['*/*','application/json','application/x-protobuf'])for(const internal of [false,true]){
  const mk=()=>({env,request:{url:'https://spclient.wg.spotify.com/'+path,headers:new Headers({'Accept':accept,'Accept-Encoding':'gzip','If-None-Match':'old','Cache-Control':'cached',Authorization:'Bearer fake-test-only',...(internal?{'x-verselyrics-internal':'1'}:{})})},storage:{getJSON:()=>null,setJSON:()=>{}}});
  const a=await run(mk()),b=await request(mk());assert.deepEqual(a?.headers&&[...a.headers].sort(),b?.headers&&[...b.headers].sort());
 }
});
test('large unrelated player data is skipped before body allocation',async()=>{let read=false;const x=setup();x.ctx.request.url='https://spclient.wg.spotify.com/context-resolve/v1/spotify:playlist:abcdef';x.ctx.response={status:200,headers:new Headers({'Content-Type':'application/json','Content-Length':600000}),arrayBuffer:async()=>{read=true;return new ArrayBuffer(600000);}};assert.equal(await run(x.ctx),undefined);assert.equal(read,false);});

test('empty LRCLIB records do not mask an available equivalent recording',async()=>{const x=setup(async u=>u.includes('/api/get?')?new Response('{}',{status:404}):new Response(JSON.stringify([{...record,syncedLyrics:null},{...record,albumName:'Paper Lantern - Single'}])));assert.ok(await sourceLyrics(x.ctx,'lrclib',meta,x.state));});
test('cross-album uniqueness considers the entire bounded service response',()=>{const records=[{...record,albumName:'Single A'},...Array.from({length:30},()=>({...record,trackName:'Other Song'})),{...record,albumName:'Single B'}];assert.deepEqual(sourceCandidates(meta,records,shape),[]);});
