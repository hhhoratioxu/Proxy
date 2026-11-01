import test from 'node:test';
import assert from 'node:assert/strict';
import run,{sourceLyrics,backup,loadCache,sourceHintKey} from '../spotify-lyrics.js';
const id='0000000000000000000001',meta={id,title:'Paper Lantern',artists:['Ada North'],album:'',duration:180.4};
const verse='[00:01.20]My original lantern floats.\n[00:03.40]The evening brings it home.';
const record={trackName:meta.title,artistName:'Ada North',albumName:'Quiet Walk',duration:180,syncedLyrics:verse};
const plain={...record,syncedLyrics:null,plainLyrics:'My original lantern floats.\nThe evening brings it home.'};
const reply=x=>new Response(JSON.stringify(x));
function miss(u){if(u.includes('lrclib'))return [];if(u.includes('qq.com'))return {code:0,data:{song:{list:[]}}};if(u.includes('163.com'))return {code:200,result:{songs:[]}};if(u.includes('kugou'))return {status:200,candidates:[]};if(u.includes('kuwo'))return {abslist:[]};return {data:[]};}
function setup(network,provider='lrclib'){
 const calls=[],store=new Map();let active=0,peak=0;
 async function request(u,o){calls.push({u,o});active++;peak=Math.max(peak,active);try{return await network(u,o);}finally{active--;}}
 const ctx={env:{FALLBACK_PROVIDER:provider,TRANSLATION_ENABLED:false},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:'application/json'})},response:new Response('missing',{status:404}),storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:request,post:request}};
 return {ctx,calls,store,state:{settings:{provider},cache:loadCache(ctx),deadline:Date.now()+10000},get peak(){return peak;}};
}
for(const album of ['', 'Quiet Walk', 'Lantern - Single'])test('signature match accepts verified recording with album '+JSON.stringify(album)+' without bulk search',async()=>{
 const x=setup((u,o)=>{assert.equal(new URL(u).pathname,'/api/get');assert.equal(new URL(u).searchParams.has('album_name'),!!album);assert.ok(o.timeout<=2500);return reply(record);});
 const result=await sourceLyrics(x.ctx,'lrclib',{...meta,album},x.state);assert.equal(result.lyrics.syncType,'LINE_SYNCED');assert.deepEqual(result.lyrics.lines.map(l=>l.startTimeMs),['1200','3400']);assert.equal(x.calls.length,1);
});
for(const change of [{trackName:'Paper Lantern (Live)'},{artistName:'Other Artist'},{duration:181.401},{duration:178},{albumName:'Live at Home'},{albumName:'Remastered 2026'},{albumName:'Acoustic Collection'},{albumName:'伴奏版'},{instrumental:true}])test('direct missing-album lookup rejects unsafe record '+JSON.stringify(change),async()=>{
 const x=setup(u=>reply(u.includes('/get?')?{...record,...change}:[]));assert.equal(await sourceLyrics(x.ctx,'lrclib',meta,x.state),null);assert.equal(x.calls.length,2);
});
test('exact known album retains the original two-second tolerance, unknown album stays at one second',async()=>{
 const x=setup(u=>reply(u.includes('/get?')?{...record,duration:182}:[]));assert.ok(await sourceLyrics(x.ctx,'lrclib',{...meta,album:'Quiet Walk'},x.state));assert.equal(x.calls.length,1);
});
test('known live album cannot relax into a studio signature',async()=>{
 const x=setup(u=>reply(u.includes('/get?')?record:[]));assert.equal(await sourceLyrics(x.ctx,'lrclib',{...meta,album:'Live at Home'},x.state),null);
});
test('plain direct result narrows the only search to its verified album and prefers real timing',async()=>{
 const x=setup(u=>{if(u.includes('/get?'))return reply(plain);assert.equal(new URL(u).searchParams.get('album_name'),'Quiet Walk');return reply([record]);});
 assert.equal((await sourceLyrics(x.ctx,'lrclib',meta,x.state)).lyrics.syncType,'LINE_SYNCED');assert.equal(x.calls.length,2);assert.equal(x.peak,1);
});
test('search prefers a timed match even if an exact-album plain document comes first',async()=>{
 const x=setup(u=>u.includes('/get?')?new Response('{}',{status:404}):reply([plain,record]));assert.equal((await sourceLyrics(x.ctx,'lrclib',{...meta,album:'Quiet Walk'},x.state)).lyrics.syncType,'LINE_SYNCED');
});
for(const failure of ['http','oversized','malformed'])test('usable plain lyrics survive a '+failure+' search without widening limits',async()=>{
 const x=setup(u=>u.includes('/get?')?reply(plain):failure==='http'?new Response('',{status:503}):failure==='oversized'?new Response('x'.repeat(98305)):reply({broken:true}));
 const result=await sourceLyrics(x.ctx,'lrclib',meta,x.state);assert.equal(result.lyrics.syncType,'UNSYNCED');assert.ok(result.lyrics.lines.every(l=>l.startTimeMs==='0'));assert.equal(x.calls.length,2);
});
for(const word of ['test','probe','x'])test('tiny untimed placeholder on a full song is not published: '+word,async()=>{
 const x=setup(u=>reply(u.includes('/get?')?{...plain,plainLyrics:word}:[]));assert.equal(await sourceLyrics(x.ctx,'lrclib',meta,x.state),null);
});
test('a short piece may legitimately have a short plain lyric',async()=>{
 const x=setup(u=>reply(u.includes('/get?')?{...plain,duration:30,plainLyrics:'A light.'}:[]));assert.equal((await sourceLyrics(x.ctx,'lrclib',{...meta,duration:30},x.state)).lyrics.syncType,'UNSYNCED');
});
test('auto keeps one plain backup and selects later verified timed lyrics',async()=>{
 const x=setup(u=>{
  if(u.includes('/api/get?'))return reply(plain);if(u.includes('lrclib'))return reply([]);
  if(u.includes('/soso/'))return reply({code:0,data:{song:{list:[{songmid:'test42',songname:meta.title,singer:[{name:'Ada North'}],albumname:'Quiet Walk',interval:180}]}}});
  if(u.includes('/lyric/'))return reply({retcode:0,lyric:verse});throw Error('unexpected');
 },'auto');
 const doc=await backup(x.ctx,meta,x.state);assert.equal(doc.lyrics.provider,'qq');assert.equal(doc.lyrics.syncType,'LINE_SYNCED');assert.equal(x.state.cache.get(sourceHintKey(meta)),'qq');assert.equal(x.calls.length,4);assert.equal(x.peak,1);assert.equal(x.state.cache.get('lyrics:auto:'+id).p,'qq');
});
test('plain backup survives all later misses and is cached in compact form without a timed hint',async()=>{
 const x=setup(u=>reply(u.includes('/api/get?')?plain:miss(u)),'auto');const doc=await backup(x.ctx,meta,x.state);
 assert.equal(doc.lyrics.syncType,'UNSYNCED');assert.equal(doc.lyrics.provider,'lrclib');assert.equal(x.state.attempts.length,6);assert.equal(x.calls.length,7);assert.equal(x.state.cache.get(sourceHintKey(meta)),undefined);assert.equal(x.state.cache.get('lyrics:auto:'+id).t,false);
 await backup(x.ctx,meta,x.state);assert.equal(x.calls.length,7);assert.ok(x.state.sourceUsage.requests<=12);assert.ok(x.state.sourceUsage.bytes<=256*1024);assert.equal(x.peak,1);
});
test('a plain backup survives subsequent timeouts within the same total lookup deadline',async()=>{
 const clock=Date.now;let now=clock();Date.now=()=>now;
 try {const x=setup((u,o)=>{if(u.includes('/api/get?'))return reply(plain);if(u.includes('lrclib'))return reply([]);now+=o.timeout;throw Error('timeout');},'auto');const result=await backup(x.ctx,meta,x.state);assert.equal(result.lyrics.syncType,'UNSYNCED');assert.ok(now<=x.state.deadline-1200);assert.ok(x.calls.length<=12);}finally{Date.now=clock;}
});
test('pending native transport is never hidden by a plain document',async()=>{
 const x=setup(u=>{if(u.includes('/api/get?'))return reply(plain);throw Error('transport-pending');});await assert.rejects(sourceLyrics(x.ctx,'lrclib',meta,x.state),/transport-pending/);
});
test('old negative cache does not mask improved signature matching',async()=>{
 const x=setup(()=>reply(record),'auto');x.state.cache.put('lyrics:auto:'+id,{missing:true,sourceRevision:4,attempts:[]});assert.equal((await backup(x.ctx,meta,x.state)).lyrics.syncType,'LINE_SYNCED');assert.equal(x.calls.length,1);
});
test('missing-album native payload retains plugin translations, colors and original timing',async()=>{
 const x=setup(u=>reply(u.includes('translate.googleapis')?['自写译文一','自写译文二']:record));x.state.cache.put('meta:'+id,meta);x.state.cache.put('palette:v1:'+id,{colors:{background:0xff585f66|0,text:0xff000000|0,highlightText:-1},source:'test'});x.state.cache.save();x.ctx.env.TRANSLATION_ENABLED=true;
 const result=await run(x.ctx),doc=JSON.parse(Buffer.from(result.body));assert.equal(result.status,200);assert.equal(doc.lyrics.syncType,'LINE_SYNCED');assert.deepEqual(doc.lyrics.alternatives[0].lines,['自写译文一','自写译文二']);assert.deepEqual(doc.lyrics.lines.map(l=>l.startTimeMs),['1200','3400']);assert.equal(doc.colors.highlightText,-1);assert.equal(doc.colors.text,0xff000000|0);assert.equal(x.calls.length,2);
});
