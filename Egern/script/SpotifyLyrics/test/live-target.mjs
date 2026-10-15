// Real service verification for the user's reported song. No user credentials.
// Spotify metadata is a captured public native response in fixtures/target-song.json.
// Card and lyric-404 responses below are synthetic; this is not an iOS UI test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import run, {parseMetadata, parseDocument, matches} from '../spotify-lyrics.js';
const exec=promisify(execFile);
const fixture=JSON.parse(readFileSync(new URL('./fixtures/target-song.json',import.meta.url),'utf8'));
const bytes=Buffer.from(fixture.metadata_base64,'base64');
assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.metadata_sha256);
const parsed=parseMetadata(bytes,fixture.track_hex);
assert.equal(matches(parsed.meta,fixture.qq_candidate),true);
const calls=[];
async function request(url,options={},method='GET') {
  assert.ok(['lrclib.net','c.y.qq.com','music.163.com'].includes(new URL(url).hostname));
  assert.equal(options.headers?.Authorization,undefined);assert.equal(options.headers?.['Client-Token'],undefined);
  const args=['--silent','--show-error','--max-time',String(Math.max(1,Math.ceil((options.timeout||5500)/1000))),'--request',method];
  for(const [name,value] of Object.entries(options.headers||{}))args.push('--header',name+': '+value);
  if(options.body!==undefined)args.push('--data-raw',options.body);
  args.push('--write-out','\n__VERSE_STATUS__%{http_code}',url);
  const {stdout}=await exec('/usr/bin/curl',args,{maxBuffer:3*1024*1024});
  const marker=stdout.lastIndexOf('\n__VERSE_STATUS__'),status=Number(stdout.slice(marker+17));assert.ok(marker>=0&&status>=100);
  calls.push({host:new URL(url).hostname,status,method});return new Response(stdout.slice(0,marker),{status});
}
const map=new Map(),storage={getJSON:k=>map.has(k)?JSON.parse(map.get(k)):null,setJSON:(k,v)=>map.set(k,JSON.stringify(v))};
const ctx={env:{FALLBACK_PROVIDER:'auto',DISCOVER_MISSING:'true'},storage,http:{get:(u,o)=>request(u,o),post:(u,o)=>request(u,o,'POST')},
  request:{url:'https://spclient.wg.spotify.com/metadata/4/track/'+fixture.track_hex,headers:new Headers({Accept:'application/vnd.google.protobuf'})},
  response:new Response(bytes,{headers:{'Content-Type':'application/vnd.google.protobuf'}})};
const begin=Date.now();
const metadata=await run(ctx);assert.equal(parseMetadata(metadata.body,fixture.track_hex).hasLyrics,true);
ctx.request={url:'https://spclient.wg.spotify.com/scrollsita/v1/scroll/spotify:track:'+fixture.track_id,headers:new Headers()};
ctx.response=new Response(Uint8Array.from([10,0,18,3,97,98,99]),{headers:{'Content-Type':'application/vnd.google.protobuf'}});
const card=await run(ctx);assert.ok(card.headers);assert.ok(Buffer.from(card.body).includes(Buffer.from('spotify:track:'+fixture.track_id)));
ctx.request={url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+fixture.track_id,headers:new Headers({Accept:'application/vnd.google.protobuf'})};
ctx.response=new Response('missing',{status:404});const count=calls.length;
const result=await run(ctx);assert.equal(result.status,200);assert.equal(calls.length,count);
const doc=parseDocument(result.body,'application/vnd.google.protobuf');assert.ok(doc.words.length>0);
console.log(JSON.stringify({date:new Date().toISOString(),version:'0.3.1',track:parsed.meta,
  originalFlagPresent:parsed.hasLyricsField,proto2DefaultRecognized:parsed.hasLyrics===false,
  qq:fixture.qq_candidate,metadataMatch:true,provider:'QQ 音乐',lyricRows:doc.words.length,
  lyricResponseSha256:createHash('sha256').update(result.body).digest('hex'),metadataFlagSet:true,nativeCardAdded:true,
  syntheticLyric404Filled:true,cacheReused:true,elapsedMs:Date.now()-begin,calls,
  scope:'Captured real public Spotify metadata; live lyric providers; synthetic card and lyric-404 responses; no user session or iOS UI capture',deviceVerified:false,status:'passed'},null,2));
