// Optional live tests. Uses original test sentences and public service searches.
// This is not an Egern device test or a Spotify account/lyrics capture.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import run, { sourceLyrics, loadCache, parseDocument } from '../spotify-lyrics.js';
const exec = promisify(execFile);
const results = [];
const missingOnly = process.argv.includes('--missing-only');
async function request(url, options={}, method='GET') {
  const args=['-sS','--max-time',String(Math.max(1,Math.ceil((options.timeout||5500)/1000))),'--request',method];
  for(const [name,value] of Object.entries(options.headers||{}))args.push('--header',name+': '+value);
  if(options.body!==undefined)args.push('--data-raw',options.body);
  args.push('--write-out','\n__VERSE_STATUS__%{http_code}',url);
  const {stdout}=await exec('/usr/bin/curl',args,{maxBuffer:3*1024*1024});
  const marker=stdout.lastIndexOf('\n__VERSE_STATUS__'),status=Number(stdout.slice(marker+17));
  if(marker<0||status<100)throw Error('invalid HTTP response');
  return new Response(stdout.slice(0,marker),{status});
}
const http={get:(u,o)=>request(u,o),post:(u,o)=>request(u,o,'POST')};
function storage(){const map=new Map();return{getJSON:k=>map.has(k)?JSON.parse(map.get(k)):null,setJSON:(k,v)=>map.set(k,JSON.stringify(v))};}
async function check(name,fn){const at=Date.now();try{const info=await fn();results.push({name,ok:true,elapsedMs:Date.now()-at,...info});}catch(e){results.push({name,ok:false,elapsedMs:Date.now()-at,error:e instanceof assert.AssertionError?'assertion failed':String(e.message).slice(0,150)});}}
if (!missingOnly) {
await check('google-single-phrase',async()=>{
  const resp=await request('https://translate.googleapis.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=zh-CN&q='+encodeURIComponent('The blue kite follows the wind.'));
  const data=await resp.json();assert.equal(data.length,1);assert.equal(typeof data[0][0],'string');return{status:resp.status,alignedRows:data.length};
});
for(const target of ['zh-CN','ja','ar','fr'])await check('handler-live-translation-'+target,async()=>{
  const words=['The blue kite follows the wind.','My quiet garden is awake.'];
  const body=JSON.stringify({lyrics:{lines:words.map((words,i)=>({words,startTimeMs:String(i*2000),endTimeMs:'0',syllables:[]})),language:'en',syncType:'LINE_SYNCED',provider:'Self-written test text'},colors:{background:-1}});
  const ctx={env:{TRANSLATION_ENABLED:'true',TARGET_LANGUAGE:target},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001',headers:new Headers({Accept:'application/json'})},response:new Response(body,{headers:{'Content-Type':'application/json'}}),http,storage:storage()};
  const result=await run(ctx),out=JSON.parse(Buffer.from(result.body).toString());
  assert.equal(out.lyrics.lines.length,2);out.lyrics.lines.forEach((l,i)=>{assert.equal(l.words,words[i]);assert.equal(l.startTimeMs,String(i*2000));});
  const alternative=out.lyrics.alternatives.find(a=>a.language===target);assert.equal(alternative.lines.length,words.length);assert.ok(alternative.lines.every(s=>typeof s==='string'&&s.length>0));
  return{translatedRows:alternative.lines.length,originalRowsUnchanged:true,originalTimingsPreserved:true,nativeAlternatives:true};
});
}
if(!process.argv.includes('--translations-only') && !missingOnly) {
await check('lrclib-live-search-and-retrieval',async()=>{
  const resp=await request('https://lrclib.net/api/search?track_name='+encodeURIComponent('Never Gonna Give You Up')+'&artist_name=Rick%20Astley',{headers:{'User-Agent':'VerseLyrics/0.3.0 (Egern module verification)'}});
  assert.equal(resp.status,200);const records=await resp.json(),record=records.find(r=>r.syncedLyrics&&r.albumName&&r.duration>0);assert.ok(record);
  const meta={id:'live-source-check',title:record.trackName,album:record.albumName,artists:[record.artistName],duration:record.duration};
  const ctx={http,storage:storage()},state={cache:loadCache(ctx),deadline:Date.now()+18000};
  const doc=await sourceLyrics(ctx,'lrclib',meta,state);assert.ok(doc?.lyrics.lines.length>0);
  return{searchStatus:resp.status,lyricRows:doc.lyrics.lines.length,syncType:doc.lyrics.syncType,usesProviderMetadata:true};
});
await check('qq-live-search-and-retrieval',async()=>{
  const headers={Referer:'https://y.qq.com/'},url='https://c.y.qq.com/soso/fcgi-bin/client_search_cp?format=json&n=5&p=1&t=0&w='+encodeURIComponent('晴天 周杰伦');
  const resp=await request(url,{headers}),data=await resp.json();assert.equal(data.code,0);const r=data.data.song.list.find(s=>s.albumname&&s.interval>0);assert.ok(r);
  const meta={id:'live-qq-check',title:r.songname,album:r.albumname,artists:r.singer.map(a=>a.name),duration:r.interval},ctx={http,storage:storage()};
  const doc=await sourceLyrics(ctx,'qq',meta,{cache:loadCache(ctx),deadline:Date.now()+18000});assert.ok(doc?.lyrics.lines.length>0);
  return{searchStatus:resp.status,lyricRows:doc.lyrics.lines.length,syncType:doc.lyrics.syncType,usesProviderMetadata:true};
});
await check('netease-live-search-and-retrieval',async()=>{
  const resp=await request('https://music.163.com/api/cloudsearch/pc',{headers:{Referer:'https://music.163.com/','Content-Type':'application/x-www-form-urlencoded'},body:'s='+encodeURIComponent('晴天 周杰伦')+'&type=1&limit=5&offset=0'},'POST');
  const data=await resp.json();assert.equal(data.code,200);const r=data.result.songs.find(s=>s.al?.name&&s.dt>0);assert.ok(r);
  const meta={id:'live-netease-check',title:r.name,album:r.al.name,artists:r.ar.map(a=>a.name),duration:r.dt/1000},ctx={http,storage:storage()};
  const doc=await sourceLyrics(ctx,'netease',meta,{cache:loadCache(ctx),deadline:Date.now()+18000});assert.ok(doc?.lyrics.lines.length>0);
  return{searchStatus:resp.status,lyricRows:doc.lyrics.lines.length,syncType:doc.lyrics.syncType,usesProviderMetadata:true};
});
}
if (!process.argv.includes('--translations-only')) await check('real-qq-backup-through-synthetic-missing-card-and-lyric-404',async()=>{
  const headers={Referer:'https://y.qq.com/'},url='https://c.y.qq.com/soso/fcgi-bin/client_search_cp?format=json&n=5&p=1&t=0&w='+encodeURIComponent('晴天 周杰伦');
  const response=await request(url,{headers}),data=await response.json();assert.equal(data.code,0);
  const song=data.data.song.list.find(s=>s.albumname&&s.interval>0);assert.ok(song);
  const id='0000000000000000000001',store=storage(),ctx={env:{FALLBACK_PROVIDER:'qq'},http,storage:store};
  const cache=loadCache(ctx);cache.put('meta:'+id,{id,title:song.songname,album:song.albumname,artists:song.singer.map(a=>a.name),duration:song.interval});cache.put('availability:'+id,false,300000);cache.save();
  // Independent protobuf fixture: response.structure(1), empty sections;
  // response info (2) must survive. No captured Spotify/device data is used.
  const input=Uint8Array.from([10,0,18,3,97,98,99]);
  ctx.request={url:'https://spclient.wg.spotify.com/scrollsita/v1/scroll/spotify:track:'+id,headers:new Headers()};
  ctx.response=new Response(input,{headers:{'Content-Type':'application/vnd.google.protobuf'}});
  const card=await run(ctx);assert.ok(card?.headers);assert.ok(Buffer.from(card.body).includes(Buffer.from('spotify:track:'+id)));assert.deepEqual(Buffer.from(card.body).subarray(-5),Buffer.from(input).subarray(-5));
  ctx.request={url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:'application/vnd.google.protobuf'})};
  ctx.response=new Response('missing',{status:404});
  const filled=await run(ctx);assert.equal(filled.status,200);const doc=parseDocument(filled.body,'application/vnd.google.protobuf');assert.ok(doc.words.length>0);
  return{searchStatus:response.status,lyricRows:doc.words.length,nativeCardAdded:true,lyric404ReplacedWith200:true,usesProviderMetadata:true,spotifyTraffic:'synthetic',deviceVerified:false};
});
console.log(JSON.stringify({date:new Date().toISOString(),runtime:process.version,scope:'real upstream services; synthetic Spotify responses and metadata; not Spotify account or device validation',results},null,2));
if(results.some(x=>!x.ok))process.exitCode=1;
