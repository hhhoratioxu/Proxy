import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import run,{backup,loadCache,cacheMetadata,sourceHintKey,sourceOrder,packLyrics,metadataNormal,base62Hex,stringField,numberField,dataField,join} from '../spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache',id='0000000000000000000001',meta={id,title:'Paper Lantern',album:'Quiet Walk',artists:['Ada North'],duration:180};
const colors={background:0xff4d545c|0,text:0xffc6ced7|0,highlightText:-1};
const entity=JSON.parse(readFileSync(new URL('./fixtures/target-palette.json',import.meta.url))).entity;
const html='<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{state:{data:{entity:{...entity,id,uri:'spotify:track:'+id}}}}}})+'</script>';
const words=['Our original lantern song.','A quiet light returns.'];
const doc={lyrics:{provider:'qq',syncType:'LINE_SYNCED',lines:words.map((words,i)=>({words,startTimeMs:String(i*2100+1000),endTimeMs:'0',syllables:[]}))}};
const reply=value=>new Response(JSON.stringify(value));
const later=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function setup(network=async()=>{throw Error('unexpected network');},store=new Map()){
 const calls=[],writes=[];const ctx={env:{TRANSLATION_ENABLED:true,FALLBACK_PROVIDER:'auto'},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:'application/json'})},response:new Response('missing',{status:404}),storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>{writes.push(k);store.set(k,JSON.stringify(v));}},http:{get:async(u,o)=>{calls.push(u);return network(u,o);},post:async(u,o)=>{calls.push(u);return network(u,o);}}};
 return {ctx,calls,writes,store,state:{cache:loadCache(ctx),settings:{provider:'auto',language:'zh-CN'},deadline:Date.now()+20000}};
}
function seed(x,value=doc){x.state.cache.put('lyrics:auto:'+id,packLyrics(value));x.state.cache.save();}
function catalogs(u,which,otherArtist=false){
 if(u.includes('lrclib'))return u.includes('/get?')?new Response('{}',{status:404}):reply([]);
 if(u.includes('client_search_cp'))return reply({code:0,data:{song:{list:[{songname:which.title,albumname:which.album,singer:[{name:otherArtist?'Other Artist':which.artists[0]}],interval:which.duration,songmid:'test42'}]}}});
 if(u.includes('fcg_query_lyric'))return reply({retcode:0,lyric:'[00:01.00]Our original lantern song.\n[00:03.10]A quiet light returns.'});
 throw Error('unexpected service');
}
test('verified timed source is tried first for the next song by the same artists',async()=>{
 let current=meta;const x=setup(u=>catalogs(u,current));assert.equal((await backup(x.ctx,current,x.state)).lyrics.provider,'qq');assert.equal(x.calls.length,4);x.state.cache.save();
 current={...meta,id:'0000000000000000000002',title:'Second Lantern'};const y=setup(u=>catalogs(u,current),x.store);assert.equal((await backup(y.ctx,current,y.state)).lyrics.provider,'qq');assert.equal(y.calls.length,2);assert.ok(y.calls.every(u=>u.includes('qq.com')));assert.equal(y.state.sourceUsage.requests,2);
});
test('source hint changes order only and does not accept wrong-artist lyrics',async()=>{
 const x=setup(u=>u.includes('qq.com')?catalogs(u,meta,true):reply({trackName:meta.title,artistName:meta.artists[0],albumName:meta.album,duration:meta.duration,syncedLyrics:'[00:01]Independent original line.'}));x.state.cache.put(sourceHintKey(meta),'qq');const out=await backup(x.ctx,meta,x.state);assert.equal(out.lyrics.provider,'lrclib');assert.deepEqual(x.state.attempts,[{provider:'qq',result:'no-match'},{provider:'lrclib',result:'matched'}]);assert.equal(x.calls.length,2);
});
for(const hint of ['lyricsovh','invalid',{provider:'qq'}])test('unusable hint retains the complete default order '+JSON.stringify(hint),()=>{const x=setup();x.state.cache.put(sourceHintKey(meta),hint);assert.deepEqual(sourceOrder(meta,x.state),['lrclib','qq','netease','kugou','kuwo','lyricsovh']);});
test('explicit provider and different artists ignore a prior artist hint',()=>{const x=setup();x.state.cache.put(sourceHintKey(meta),'qq');x.state.settings.provider='kugou';assert.deepEqual(sourceOrder(meta,x.state),['kugou']);x.state.settings.provider='auto';assert.equal(sourceOrder({...meta,artists:['Different Artist']},x.state)[0],'lrclib');});
test('artist hints are order independent, bounded and expire without extending on reads',()=>{const x=setup();assert.equal(sourceHintKey({...meta,artists:['Ada North','Bea West']}),sourceHintKey({...meta,artists:['Bea West','Ada North']}));assert.equal(sourceHintKey({...meta,artists:['x'.repeat(600)]}),null);x.state.cache.put(sourceHintKey(meta),'qq',-1);assert.equal(sourceOrder(meta,x.state)[0],'lrclib');});
test('plain lyrics never promote a source ahead of timed sources',async()=>{const x=setup(()=>reply({trackName:meta.title,artistName:meta.artists[0],albumName:meta.album,duration:180,plainLyrics:'Original words.'}));assert.equal((await backup(x.ctx,meta,x.state)).lyrics.syncType,'UNSYNCED');assert.equal(x.state.cache.get(sourceHintKey(meta)),undefined);});
test('identical metadata notifications do not rewrite cache or duplicate status entries',async()=>{
 const x=setup(),hex=base62Hex(id),wire=join([dataField(1,Buffer.from(hex,'hex')),stringField(2,meta.title),dataField(3,stringField(2,meta.album)),dataField(4,stringField(2,meta.artists[0])),numberField(7,360000),numberField(18,0)]);
 x.ctx.request.url='https://spclient.wg.spotify.com/metadata/4/track/'+hex;
 for(let i=0;i<50;i++){x.ctx.response=new Response(wire,{headers:{'Content-Type':'application/x-protobuf'}});const r=await run(x.ctx);assert.ok(r.body.length);}
 assert.equal(x.writes.filter(k=>k===KEY).length,1);assert.equal(x.writes.filter(k=>k==='VerseLyrics.v1.events').length,1);assert.equal(x.writes.filter(k=>k==='VerseLyrics.v1.status').length,1);assert.equal(x.calls.length,0);
});
for(const change of [{title:'New name'},{album:'New album'},{artists:['Changed Artist']},{duration:181}])test('changed metadata is saved '+JSON.stringify(change),()=>{const x=setup();cacheMetadata(x.state,{meta,hasLyrics:false});x.state.cache.save();cacheMetadata(x.state,{meta:{...meta,...change},hasLyrics:true});x.state.cache.save();assert.deepEqual(x.state.cache.get('meta:'+id),{...meta,...change});assert.equal(x.state.cache.get('availability:'+id),true);assert.equal(x.writes.filter(k=>k===KEY).length,2);});
test('expired metadata is refreshed when it arrives again',()=>{const x=setup();x.state.cache.put('meta:'+id,meta,-1);cacheMetadata(x.state,{meta,hasLyrics:false});x.state.cache.save();assert.deepEqual(x.state.cache.get('meta:'+id),meta);});
test('all 6447 Han mappings and mixed-script names match the previous normalization',()=>{
 const chars=[...JSON.parse(readFileSync(new URL('./fixtures/han-reference.json',import.meta.url))).pairs],map=new Map();for(let i=0;i<chars.length;i+=2)map.set(chars[i],chars[i+1]);assert.equal(map.size,6447);
 const normal=s=>s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');const old=s=>normal([...s.normalize('NFKC')].map(c=>map.get(c)||c).join(''));
 for(let i=0;i<chars.length;i+=2)assert.equal(metadataNormal(chars[i]),old(chars[i]),'mapping '+i/2);
 for(const s of ['王俊凱 那頁夏天 (Live)','Ada North — 𳈆 𮸧','ＡＢＣ，國語 2026','日本語 カタカナ','한글 한국어'])assert.equal(metadataNormal(s),old(s));
});

import {networkLease,readBody} from '../spotify-lyrics.js';
test('a burst of 20 new songs admits two network jobs, queues none, and does not cache busy as missing',async()=>{
 const store=new Map(),pending=[];let active=0,maxActive=0;
 const x=setup(undefined,store);for(let i=1;i<=20;i++)x.state.cache.put('meta:'+String(i).padStart(22,'0'),{...meta,id:String(i).padStart(22,'0'),title:'Lantern '+i});x.state.cache.save();
 const requests=Array.from({length:20},(_,i)=>{const track=String(i+1).padStart(22,'0'),y=setup(async u=>{
  active++;maxActive=Math.max(maxActive,active);const wait=later();pending.push(()=>{active--;wait.resolve(reply({trackName:'Lantern '+(i+1),artistName:meta.artists[0],albumName:meta.album,duration:180,syncedLyrics:'[00:01]Original burst test line.'}));});return wait.promise;
 },store);y.ctx.env.TRANSLATION_ENABLED=false;y.ctx.request.url='https://spclient.wg.spotify.com/color-lyrics/v2/track/'+track;
 y.state.cache.put('palette:v1:'+track,{colors});y.state.cache.save();return run(y.ctx);});
 await new Promise(setImmediate);assert.equal(pending.length,2);assert.equal(maxActive,2);pending.forEach(f=>f());const results=await Promise.all(requests);
 assert.equal(results.filter(r=>r?.status===200).length,2);assert.equal(active,0);assert.deepEqual(JSON.parse(store.get('VerseLyrics.v1.network')),[]);
 const cache=JSON.parse(store.get(KEY));assert.ok(!cache.entries.some(e=>e.key.startsWith('lyrics:')&&e.value?.missing));assert.ok(store.get(KEY).length<=64000);assert.ok(cache.entries.length<=128);
});
test('network admission releases only its own slot and handles stale, failed and unavailable storage',()=>{
 const x=setup(),a=networkLease(x.ctx,Date.now()+10000),b=networkLease(x.ctx,Date.now()+10000),c=networkLease(x.ctx,Date.now()+10000);a.enter();b.enter();assert.throws(()=>c.enter(),/network-busy/);a.release();c.enter();assert.equal(JSON.parse(x.store.get('VerseLyrics.v1.network')).length,2);b.defer();b.release();assert.throws(()=>b.enter(),/transport-pending/);c.release();assert.equal(JSON.parse(x.store.get('VerseLyrics.v1.network')).length,1);
 x.store.set('VerseLyrics.v1.network',JSON.stringify([{owner:'old',expires:Date.now()-1}]));const d=networkLease(x.ctx,Date.now()+10000);d.enter();d.release();assert.deepEqual(JSON.parse(x.store.get('VerseLyrics.v1.network')),[]);
 assert.throws(()=>networkLease({storage:{getJSON:()=>{throw Error('unavailable');}}},Date.now()+10000).enter(),/network-busy/);
});
test('fully cached lyrics remain available even when network admission is full',async()=>{
 const x=setup();seed(x);x.state.cache.put('palette:v1:'+id,{colors});x.state.cache.put('translations:v1:zh-CN:'+id,{pairs:words.map(s=>[s,'自写译文'])});x.state.cache.save();x.store.set('VerseLyrics.v1.network',JSON.stringify([{owner:'a',expires:Date.now()+12000},{owner:'b',expires:Date.now()+12000}]));const result=await run(x.ctx);assert.equal(result.status,200);assert.equal(x.calls.length,0);assert.deepEqual(JSON.parse(Buffer.from(result.body)).lyrics.lines,doc.lyrics.lines);
});
test('each lyric task remains strictly sequential through palette and translation',async()=>{
 const palette=later();let active=0,peak=0;const x=setup(async u=>{active++;peak=Math.max(peak,active);if(u.includes('open.spotify')){await palette.promise;active--;return new Response(html);}active--;return reply(['自写译文一','自写译文二']);});seed(x);const work=run(x.ctx);await new Promise(setImmediate);assert.equal(x.calls.length,1);palette.resolve();const out=JSON.parse(Buffer.from((await work).body));assert.equal(peak,1);assert.deepEqual(out.colors,colors);assert.deepEqual(out.lyrics.alternatives[0].lines,['自写译文一','自写译文二']);
});
test('256 KiB native response limit passes through without reading a declared oversized body',async()=>{let read=false;const x=setup();x.ctx.response={status:200,headers:new Headers({'Content-Length':String(256*1024+1),'Content-Type':'application/json'}),arrayBuffer:async()=>{read=true;return new ArrayBuffer(256*1024+1);}};assert.equal(await run(x.ctx),undefined);assert.equal(read,false);});
test('streamed service responses stop at the byte budget and release the reader',async()=>{
 let cancelled=false,released=false,reads=0;const response={headers:{},body:{getReader:()=>({read:async()=>{reads++;return{value:new Uint8Array(20000),done:false};},cancel:async()=>{cancelled=true;},releaseLock:()=>{released=true;}})}};await assert.rejects(readBody(response,32000),/body-limit/);assert.equal(reads,2);assert.equal(cancelled,true);assert.equal(released,true);
});
test('tiny stream chunks cannot accumulate an unbounded array of references',async()=>{
 let n=0,cancelled=false;await assert.rejects(readBody({headers:{},body:{getReader:()=>({read:async()=>{n++;return{value:new Uint8Array(1),done:false};},cancel:async()=>{cancelled=true;},releaseLock(){}})}},100000),/body-limit/);assert.equal(n,129);assert.equal(cancelled,true);
});
test('retained cache and expanded translation text obey the tighter memory limits',async()=>{
 const x=setup();for(let i=0;i<500;i++)x.state.cache.put('long:'+i,'字'.repeat(1000));x.state.cache.save();assert.ok(x.store.get(KEY).length<=64000);assert.ok(JSON.parse(x.store.get(KEY)).entries.length<=128);
});
test('raw persistent storage is bounded before parsing an oversized legacy cache',()=>{let parsed=false;const x=setup();x.ctx.storage.get=()=>'x'.repeat(128001);x.ctx.storage.getJSON=()=>{parsed=true;throw Error('should not parse');};assert.equal(loadCache(x.ctx).get('anything'),undefined);assert.equal(parsed,false);});
test('distinct response statuses retain a bounded eight-event history',async()=>{const x=setup();for(let i=0;i<12;i++){x.ctx.response=new Response('temporary',{status:500+i});await run(x.ctx);}const events=JSON.parse(x.store.get('VerseLyrics.v1.events'));assert.equal(events.length,8);assert.equal(events[7].httpStatus,511);});
import {fields} from '../spotify-lyrics.js';
test('compact protobuf data cannot expand to tens of thousands of field objects',()=>{const b=Buffer.alloc(2*4097);for(let i=0;i<b.length;i+=2){b[i]=8;b[i+1]=1;}assert.throws(()=>fields(b),/field-limit/);});

test('an Egern-style timeout on an explicit source is deferred instead of stored as missing',async()=>{
 const x=setup(async()=>{throw Error('request timed out');});x.ctx.env.FALLBACK_PROVIDER='lrclib';x.ctx.env.TRANSLATION_ENABLED=false;x.state.cache.put('meta:'+id,meta);x.state.cache.save();
 const result=await run(x.ctx);assert.equal(result?.status,undefined);assert.equal(x.calls.length,1);assert.equal(JSON.parse(x.store.get('VerseLyrics.v1.network')).length,1);assert.ok(!JSON.parse(x.store.get(KEY)).entries.some(e=>e.key.startsWith('lyrics:')&&e.value?.missing));
});

