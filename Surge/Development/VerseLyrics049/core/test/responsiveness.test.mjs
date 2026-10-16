import test from 'node:test';
import assert from 'node:assert/strict';
import run,{backup,loadCache,networkLease,sourceOrder,packLyrics} from '../spotify-lyrics.js';
const id='0000000000000000000001',KEY='VerseLyrics.v1.cache';
const meta={id,title:'Paper Lantern',album:'Quiet Walk',artists:['Ada North'],duration:180};
const colors={background:0xff4d545c|0,text:0xffc6ced7|0,highlightText:-1};
const reply=x=>new Response(JSON.stringify(x));
function setup(network,provider='auto'){
 const store=new Map(),calls=[];
 const ctx={env:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:provider},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:'application/json'})},response:new Response('missing',{status:404}),storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:async(u,o)=>{calls.push({u,o});return network(u,o);},post:async(u,o)=>{calls.push({u,o});return network(u,o);}}};
 const cache=loadCache(ctx);cache.put('meta:'+id,meta);cache.put('palette:v1:'+id,{colors});cache.save();
 return {ctx,store,calls,state:{settings:{provider,language:'zh-CN'},cache:loadCache(ctx),deadline:Date.now()+10000}};
}
function qq(u,metadata=meta,emptyFirst=false){
 if(u.includes('client_search'))return {code:0,data:{song:{list:(emptyFirst?[1,2]:[1]).map(n=>({songname:metadata.title,albumname:metadata.album,singer:[{name:metadata.artists[0]}],interval:180,songmid:'test'+n}))}}};
 return {code:0,lyric:emptyFirst&&u.includes('songmid=test1')?'':'[00:01]An original lyric line.\n[00:03]Another original line.'};
}
function missed(u){if(u.includes('lrclib'))return [];if(u.includes('qq.com'))return {code:0,data:{song:{list:[]}}};if(u.includes('163.com'))return {code:200,result:{songs:[]}};if(u.includes('kugou'))return {status:200,candidates:[]};if(u.includes('kuwo'))return {abslist:[]};return {data:[]};}
test('a settled timeout on the first source still returns later-source lyrics in the same native response',async()=>{
 const x=setup(u=>{if(u.includes('lrclib'))throw Error('native http timeout');return reply(qq(u));});
 const result=await run(x.ctx);assert.equal(result.status,200);assert.equal(JSON.parse(Buffer.from(result.body)).lyrics.provider,'qq');assert.equal(x.calls.length,3);assert.deepEqual(JSON.parse(x.store.get('VerseLyrics.v1.network')),[]);assert.ok(!JSON.parse(x.store.get(KEY)).entries.some(e=>e.value?.missing));
});
test('all earlier settled timeouts still leave a chance for the final source through the full processor',async()=>{
 const real=Date.now;let now=real();Date.now=()=>now;
 try{const x=setup((u,o)=>{if(!u.includes('lyrics.ovh')){now+=o.timeout;throw Error('timeout');}return reply(u.includes('/suggest/')?{data:[{title:meta.title,artist:{name:meta.artists[0]},album:{title:meta.album},duration:180}]}:{lyrics:'An original plain line.'});});const out=await run(x.ctx);assert.equal(out.status,200);assert.equal(JSON.parse(Buffer.from(out.body)).lyrics.provider,'lyricsovh');assert.ok(now<x.state.deadline);assert.equal(x.calls.length,7);assert.deepEqual(JSON.parse(x.store.get('VerseLyrics.v1.network')),[]);}finally{Date.now=real;}
});
test('a verified match receives a separate bounded download window instead of the search leftovers',async()=>{
 const real=Date.now;let now=real();Date.now=()=>now;
 try{const chinese={...meta,title:'自写灯笼',artists:['测试歌手']},x=setup((u,o)=>{assert.ok(u.includes('qq.com'));const elapsed=u.includes('client_search')?1000:800;assert.ok(o.timeout>=elapsed);now+=elapsed;return reply(qq(u,chinese));});const doc=await backup(x.ctx,chinese,x.state);assert.equal(doc.lyrics.provider,'qq');assert.equal(x.calls.length,2);assert.equal(now-real()<2500,true);}finally{Date.now=real;}
});
test('a second verified candidate can supply lyrics when the first candidate has an empty document',async()=>{
 const x=setup(u=>u.includes('lrclib')?new Response('[]',{status:u.includes('/get?')?404:200}):reply(qq(u,meta,true)));const out=await backup(x.ctx,meta,x.state);assert.equal(out.lyrics.provider,'qq');assert.equal(x.calls.length,5);assert.ok(x.state.sourceUsage.requests<=12);
});
test('Chinese ordering preserves all sources, while kana tracks retain the international default',()=>{
 const x=setup();assert.deepEqual(sourceOrder({...meta,title:'那頁夏天',artists:['王俊凱']},x.state),['qq','netease','kugou','kuwo','lrclib','lyricsovh']);assert.equal(sourceOrder({...meta,title:'世界の歌'},x.state)[0],'lrclib');
});
test('v3 negative cache is invalidated; successful compact lyric caches remain reusable',async()=>{
 const x=setup(u=>u.includes('lrclib')?new Response('[]',{status:u.includes('/get?')?404:200}):reply(qq(u)));x.state.cache.put('lyrics:auto:'+id,{missing:true,sourceRevision:3,attempts:[]});x.state.cache.save();assert.equal((await run(x.ctx)).status,200);const count=x.calls.length;x.ctx.response=new Response('missing',{status:404});assert.equal((await run(x.ctx)).status,200);assert.equal(x.calls.length,count);
});
test('a truncated or partially attempted source chain never writes a negative song result',async()=>{
 const x=setup(()=>new Response('x'.repeat(98305)));assert.equal(await backup(x.ctx,meta,x.state),null);assert.equal(x.state.cache.get('lyrics:auto:'+id),undefined);
});
test('native words wait at most the 2.5 second translation budget, and successful earlier batches are retained',async()=>{
 const real=Date.now;let now=real();Date.now=()=>now;
 try{const words=Array.from({length:96},(_,i)=>'Original phrase '+i),x=setup((u,o)=>{assert.ok(u.includes('translate.googleapis'));const elapsed=Math.min(1700,o.timeout);now+=elapsed;if(elapsed<1700)throw Error('timeout');return reply(new URL(u).searchParams.getAll('q').map((s,i)=>'译文 '+i));});x.ctx.env.TRANSLATION_ENABLED=true;x.ctx.response=reply({lyrics:{lines:words.map(words=>({words,startTimeMs:'0'})),alternatives:[{language:'zh-CN',lines:words.map(()=> 'Official translation')}]},colors});const start=now,result=await run(x.ctx),out=JSON.parse(Buffer.from(result.body));assert.equal(now-start,2500);assert.equal(x.calls.length,2);assert.equal(out.lyrics.lines.length,96);assert.equal(out.lyrics.alternatives[0].lines.filter(Boolean).length,32);assert.ok(!JSON.stringify(out).includes('Official translation'));assert.deepEqual(JSON.parse(x.store.get('VerseLyrics.v1.network')),[]);}finally{Date.now=real;}
});
test('no contention allocates no waiting timer, and two independent response jobs both keep their slots',async()=>{
 const x=setup(),a=networkLease(x.ctx,Date.now()+10000),b=networkLease(x.ctx,Date.now()+10000);await a.acquire();await b.acquire();a.enter();b.enter();assert.equal(x.store.has('VerseLyrics.v2.waiting'),false);a.release();b.release();
});
test('a waiter expires within its bound without extra HTTP, false misses or a retained pending marker',async()=>{
 const x=setup(),a=networkLease(x.ctx,Date.now()+10000),b=networkLease(x.ctx,Date.now()+10000);a.enter();b.enter();const c=networkLease(x.ctx,Date.now()+850),start=Date.now();await assert.rejects(c.acquire(),/network-busy/);assert.ok(Date.now()-start<400);assert.equal(x.calls.length,0);assert.equal(x.store.get('VerseLyrics.v2.waiting'),'null');a.release();b.release();
});
const entity={type:'track',id,uri:'spotify:track:'+id,title:meta.title,artists:[{name:meta.artists[0]}],duration:180000,visualIdentity:{backgroundBase:{alpha:255,red:77,green:84,blue:92},textBase:{alpha:255,red:255,green:255,blue:255},textSubdued:{alpha:255,red:198,green:206,blue:215}}};
const embed=e=>new Response('<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{state:{data:{entity:e}}}}})+'</script>');
test('uncached public metadata recovers missing Spotify metadata and supplies palette without another page request',async()=>{
 const x=setup((u,o)=>{assert.equal(o.headers?.Authorization,undefined);assert.equal(o.headers?.['client-token'],undefined);if(u.includes('open.spotify.com'))return embed(entity);return reply(u.includes('/get?')?{}:[{trackName:meta.title,artistName:meta.artists[0],albumName:meta.album,duration:180,syncedLyrics:'[00:01]Original public fallback line.'}]);});x.store.delete(KEY);const result=await run(x.ctx),out=JSON.parse(Buffer.from(result.body));assert.equal(result.status,200);assert.deepEqual(out.colors,colors);assert.equal(x.calls.filter(c=>c.u.includes('open.spotify.com')).length,1);const cache=loadCache(x.ctx);assert.equal(cache.get('meta:'+id).album,'');assert.equal(cache.get('palette:v1:'+id).source,'spotify-embed');assert.ok(!x.store.get(KEY).includes('visualIdentity'));
});
for(const delta of [{id:'0000000000000000000002'},{uri:'spotify:track:0000000000000000000002'},{artists:[]},{duration:'180000'},{duration:NaN},{type:'episode'},{title:'',name:''}])test('public metadata rejects incomplete or different-track identity '+JSON.stringify(delta),async()=>{
 const x=setup(()=>embed({...entity,...delta}));x.store.delete(KEY);assert.equal((await run(x.ctx)).status,undefined);assert.equal(x.calls.length,1);assert.equal(loadCache(x.ctx).get('meta:'+id),undefined);
});
test('public metadata cannot use an unknown album to accept a duration drift of more than one second',async()=>{
 const x=setup(u=>u.includes('open.spotify.com')?embed(entity):u.includes('lrclib')?reply(u.includes('/get?')?{}:[{trackName:meta.title,artistName:meta.artists[0],albumName:'',duration:181.5,syncedLyrics:'[00:01]Must not be accepted.'}]):reply(missed(u)));x.store.delete(KEY);assert.equal((await run(x.ctx)).status,undefined);
});
test('Egern-style host without a documented timer passes through busy admission without waiting or HTTP',async()=>{
 const x=setup(),a=networkLease(x.ctx,Date.now()+10000),b=networkLease(x.ctx,Date.now()+10000);a.enter();b.enter();const original=globalThis.setTimeout;
 try{globalThis.setTimeout=undefined;await assert.rejects(networkLease(x.ctx,Date.now()+10000).acquire(),/network-busy/);assert.equal(x.store.has('VerseLyrics.v2.waiting'),false);assert.equal(x.calls.length,0);}finally{globalThis.setTimeout=original;a.release();b.release();}
});
test('the newest waiting response reuses lyrics completed by another job without another source request',async()=>{
 const x=setup(()=>{throw Error('duplicate HTTP');}),a=networkLease(x.ctx,Date.now()+10000),b=networkLease(x.ctx,Date.now()+10000);a.enter();b.enter();const work=run(x.ctx);await new Promise(setImmediate);
 const c=loadCache(x.ctx);c.put('lyrics:auto:'+id,packLyrics({lyrics:{provider:'qq',syncType:'LINE_SYNCED',lines:[{words:'Original completed line.',startTimeMs:'1000',endTimeMs:'0',syllables:[]}]}}));c.save();a.release();const result=await work;assert.equal(result.status,200);assert.equal(x.calls.length,0);assert.equal(JSON.parse(Buffer.from(result.body)).lyrics.lines[0].startTimeMs,'1000');b.release();assert.deepEqual(JSON.parse(x.store.get('VerseLyrics.v1.network')),[]);
});
