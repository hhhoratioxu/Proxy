import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createHmac, randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { options, bytes, text, equal, concat, query, KEY, INTERNAL, LIMIT, cleanHeaders, base64 } from '../src/common.mjs';
import { transformProto, core, captions } from '../src/player.mjs';
import { run, scope } from '../src/engine.mjs';
import { frame, frames, packInt, readInt, Header, Envelope, encrypt, decrypt, transformUmp } from '../src/ump.mjs';
import { mergeSubtitles } from '../src/subtitles.mjs';
import { cat, field, number, string, fields, player, unknown, subtitleURL, translatedJSON, originalJSON } from './fixtures.mjs';
const cfg = options();
const api = path => 'https://youtubei.googleapis.com/youtubei/v1/' + path;
const ua = { 'User-Agent': 'com.google.ios.youtube/99.0 SELF_WRITTEN' };
function io(url, body, extra = {}) {
  const store = new Map();
  return { url, body, phase: 'response', status: 200, requestHeaders: ua, responseHeaders: { 'Content-Type': 'application/x-protobuf' }, storage: { get:k=>store.get(k), set:(k,v)=>store.set(k,v) }, fetch:async()=>{ throw Error('unexpected network'); }, ...extra };
}
test('native player fixture loses only ad fields, gains one bilingual caption and keeps 64-bit unknown data', () => {
  const raw = player(), output = transformProto('player', raw, cfg), old = fields(raw), fresh = fields(output);
  assert.ok(output); assert.equal(fresh.some(x => x.no === 7 || x.no === 68), false);
  assert.deepEqual(fresh.filter(x => x.no >= 777).map(x => x.raw), old.filter(x => x.no >= 777).map(x => x.raw));
  const list = core.schemas.player.fromBinary(output).captions.playerCaptionsTrackListRenderer;
  assert.equal(list.captionTracks.length, 2); assert.equal(list.captionTracks[0].baseUrl, subtitleURL);
  assert.match(list.captionTracks[1].baseUrl, /signature=A%2BB%2FC&tlang=zh-Hans$/);
  assert.equal(list.captionTracks[1].name.runs[0].text, '双语字幕 · 简体中文');
  assert.equal(list.audioTracks[0].defaultCaptionTrackIndex, 1);
  assert.equal(transformProto('player', output, cfg), null);
});
test('ad and translation switches independently preserve native behavior', () => {
  const raw = player();
  const adsOnly = fields(transformProto('player', raw, options({ TRANSLATION_ENABLED: false })));
  assert.equal(adsOnly.some(x => x.no === 7), false);
  assert.deepEqual(adsOnly.find(x=>x.no===10).raw, fields(raw).find(x=>x.no===10).raw);
  const subtitlesOnly = fields(transformProto('player', raw, options({ ADBLOCK_ENABLED: false })));
  assert.deepEqual(subtitlesOnly.filter(x=>x.no===7 || x.no===68).map(x=>x.raw), fields(raw).filter(x=>x.no===7 || x.no===68).map(x=>x.raw));
  assert.equal(transformProto('player', raw, options({ ADBLOCK_ENABLED: false, TRANSLATION_ENABLED: false })), null);
});
test('get_watch patches its player and preserves other contents and unknown fields', () => {
  const content = cat(field(2, player()), string(902, 'keep-content'));
  const raw = cat(field(1, content), unknown), output = transformProto('get_watch', raw, cfg);
  assert.deepEqual(fields(output).filter(x=>x.no!==1).map(x=>x.raw), fields(raw).filter(x=>x.no!==1).map(x=>x.raw));
  const nested = fields(fields(output).find(x=>x.no===1).payload);
  assert.deepEqual(nested.find(x=>x.no===902).raw, fields(content).find(x=>x.no===902).raw);
  assert.equal(fields(nested.find(x=>x.no===2).payload).some(x=>x.no===7), false);
});
test('unknown native layouts and empty caption lists are exact pass-through', () => {
  assert.equal(transformProto('player', unknown, cfg), null);
  assert.equal(transformProto('not-an-endpoint', unknown, cfg), null);
  const empty = core.schemas.player.create({ captions: { playerCaptionsTrackListRenderer: { captionTracks: [], audioTracks: [], translationLanguages: [] } } });
  assert.equal(transformProto('player', core.schemas.player.toBinary(empty), cfg), null);
});
test('native Shorts only drops entries with the explicit isAd flag', () => {
  const codec = core.schemas.reel_watch_sequence;
  const input = codec.create({ entries: [{ command: { reelWatchEndpoint: { adClientParams: { isAd: false } } } }, { command: { reelWatchEndpoint: { adClientParams: { isAd: true } } } }] });
  const out = codec.fromBinary(transformProto('reel_watch_sequence', codec.toBinary(input), cfg));
  assert.equal(out.entries.length, 1); assert.equal(out.entries[0].command.reelWatchEndpoint.adClientParams.isAd, false);
});
test('web JSON removes known ads, retains videos/Shorts and gains bilingual track', async () => {
  const json = { adPlacements:[{ad:'fixture'}], title:'keep', items:[{videoRenderer:{videoId:'keep'}},{promotedVideoRenderer:{videoId:'ad'}},{reelShelfRenderer:{title:'Shorts retained'}}], captions:{playerCaptionsTracklistRenderer:{captionTracks:[{baseUrl:subtitleURL,languageCode:'en',name:{simpleText:'English'}}],audioTracks:[]}} };
  const out = await run(io('https://www.youtube.com/youtubei/v1/player', bytes(JSON.stringify(json)), { responseHeaders: {'Content-Type':'application/json'} }), cfg);
  const result=JSON.parse(text(out.body));assert.deepEqual(result.adPlacements,[]);assert.equal(result.items.length,2);assert.equal(result.items[1].reelShelfRenderer.title,'Shorts retained');assert.equal(result.captions.playerCaptionsTracklistRenderer.captionTracks.length,2);
});
test('unknown JSON, large numeric IDs and malformed responses are preserved', async () => {
  assert.equal(await run(io(api('player'), bytes('{ "unknown": true }'), {responseHeaders:{'Content-Type':'application/json'}}),cfg), null);
  await assert.rejects(run(io(api('player'),bytes('{"adSlots":[{}],"id":18446744073709551615}'),{responseHeaders:{'Content-Type':'application/json'}}),cfg));
  await assert.rejects(run(io(api('player'),bytes('malformed')),cfg));
});
for(const bad of ['https://youtubei.googleapis.com.evil.test/youtubei/v1/player','http://youtubei.googleapis.com/youtubei/v1/player','https://youtubei.googleapis.com/youtubei/v1/player/other','https://x.googlevideo.com/videoplayback?id=1','https://evil.test/api/timedtext?tlang=zh-Hans','https://www.youtube.com/watch?v=1']) test('URL scope excludes '+bad,()=>assert.equal(scope(bad),null));
test('att host is supported and unrelated signed query data is preserved',()=>{
  assert.equal(scope('https://youtubei-att.googleapis.com/youtubei/v1/player'), 'api');
  assert.equal(query(subtitleURL,'tlang','zh-Hans'),subtitleURL+'&tlang=zh-Hans');
  assert.equal(query(subtitleURL+'&tlang=zh-Hans','tlang',null),subtitleURL);
});
for(const status of [204,304,401,403,429,500])test('HTTP '+status+' is untouched without network',async()=>assert.equal(await run(io(api('player'),player(),{status}),cfg),null));
test('internal fetch, marked responses, disabled features and oversize bodies pass through',async()=>{
  assert.equal(await run(io(api('player'),player(),{requestHeaders:{[INTERNAL]:'1'}}),cfg),null);
  assert.equal(await run(io(api('player'),player(),{responseHeaders:{'X-Horatio-YouTube':'0.1.0'}}),cfg),null);
  assert.equal(await run(io(api('player'),player()),options({ADBLOCK_ENABLED:false,TRANSLATION_ENABLED:false})),null);
  assert.equal(await run(io(api('player'),new Uint8Array(LIMIT+1)),cfg),null);
});
for(const n of [0,127,128,16383,16384,2097151,2097152,268435455,268435456,0xffffffff])test('UMP integer independently encoded boundary '+n,()=>{
  const b=packInt(n);const [decoded,end]=readInt(b,0);assert.equal(decoded,n);assert.equal(end,b.length);
  const vectors={128:[128,2],16384:[192,0,2],2097152:[224,0,0,2],268435456:[240,0,0,0,16]};if(vectors[n])assert.deepEqual([...b],vectors[n]);
});
const key = new Uint8Array(Array.from({length:32},(_,i)=>i));
const iv = new Uint8Array(Array.from({length:16},(_,i)=>32+i));
function independentEncrypt(plain) {
  const cipher=createCipheriv('aes-128-ctr',key.slice(0,16),iv);const encryptedContent=Buffer.concat([cipher.update(plain),cipher.final()]);
  return {encryptedContent,iv,hmac:createHmac('sha256',key.slice(16)).update(encryptedContent).update(iv).digest()};
}
test('local crypto matches Node AES-CTR and HMAC implementations',()=>{
  const plain=bytes('self-written plaintext — not a user video'),part=independentEncrypt(plain);
  assert.deepEqual(decrypt(part,key),plain);assert.deepEqual(encrypt(plain,iv,key).encryptedContent,new Uint8Array(part.encryptedContent));
  assert.deepEqual(encrypt(plain,iv,key).hmac,new Uint8Array(part.hmac));
  const tampered={...part,hmac:new Uint8Array(part.hmac)};tampered.hmac[0]^=1;assert.throws(()=>decrypt(tampered,key),/HMAC/);
});
for(const zipped of [false,true])test('authenticated UMP type 25 '+(zipped?'gzip':'plain')+' edits metadata, preserves media and opaque frames',()=>{
  const payload=cat(field(4,cat(field(2,player()),string(901,'preserve-content'))),unknown);
  const encrypted={...independentEncrypt(zipped?gzipSync(payload):payload),compressionAlgorithm:zipped?1:0};
  const header=Header.toBinary(Header.create({type:25}));const media=frame(21,bytes('MEDIA_BYTES_UNCHANGED')),opaque=frame(888,bytes('OPAQUE'));
  const raw=concat(frame(10,header),frame(11,core.encrypted.toBinary(core.encrypted.create(encrypted))),media,opaque);
  const out=transformUmp(raw,key,cfg),fresh=frames(out);assert.deepEqual(fresh[2].raw,media);assert.deepEqual(fresh[3].raw,opaque);
  const part=core.encrypted.fromBinary(fresh[1].data),clear=decrypt(part,key),decoded=zipped?gunzipSync(clear):clear;
  const message=core.stream.fromBinary(decoded);assert.equal(message.contents[0].player.adPlacements.length,0);assert.equal(message.contents[0].player.captions.playerCaptionsTrackListRenderer.captionTracks.length,2);
  assert.deepEqual(fields(decoded).filter(x=>x.no>=777).map(x=>x.raw),fields(payload).filter(x=>x.no>=777).map(x=>x.raw));
  assert.equal(transformUmp(out,key,cfg),null);
});
test('UMP type 0 updates the header HMAC and retains legacy envelope fields',()=>{
  const envelope=Envelope.toBinary(Envelope.create({status:1,httpStatus:200,body:player()}));const part=independentEncrypt(envelope);
  const head=Header.create({type:0,cryptoParams:{iv,hmac:part.hmac,compressionType:0}});
  const raw=concat(frame(10,Header.toBinary(head)),frame(11,part.encryptedContent),frame(21,bytes('media')));
  const out=frames(transformUmp(raw,key,cfg)),h=Header.fromBinary(out[0].data);
  const decoded=Envelope.fromBinary(decrypt({encryptedContent:out[1].data,...h.cryptoParams},key));
  assert.equal(decoded.httpStatus,200);assert.equal(core.schemas.player.fromBinary(decoded.body).adPlacements.length,0);assert.equal(text(out[2].data),'media');
});
test('malformed UMP, invalid HMAC and unsupported compression fail without producing partial output',()=>{
  assert.throws(()=>transformUmp(new Uint8Array([10,100,1]),key,cfg));
  const plain=cat(field(4,field(2,player()))),part=independentEncrypt(plain);part.hmac[1]^=1;
  const raw=concat(frame(10,Header.toBinary(Header.create({type:25}))),frame(11,core.encrypted.toBinary(core.encrypted.create({...part,compressionAlgorithm:0}))));
  assert.throws(()=>transformUmp(raw,key,cfg),/HMAC/);
  const unsupported=concat(frame(10,Header.toBinary(Header.create({type:25}))),frame(11,core.encrypted.toBinary(core.encrypted.create({...independentEncrypt(plain),compressionAlgorithm:2}))));
  assert.throws(()=>transformUmp(unsupported,key,cfg),/compression/);
});
test('JSON3 subtitles align timing, retain metadata and use original above translation',()=>{
  const out=JSON.parse(mergeSubtitles(translatedJSON,originalJSON));assert.equal(out.wireMagic,'pb3');assert.equal(out.events[0].tStartMs,1000);assert.equal(out.events[0].segs[0].utf8,'A self-written line\n一行自写字幕');assert.equal(out.events[1].segs[0].utf8,'Another self-written line\n另一行自写字幕');
});
test('XML srv3 composition escapes content and preserves cue attributes',()=>{
  const source='<timedtext format="3"><body><p t="1000" d="1200" w="1"><s>Hello &amp; &lt;world&gt;</s></p></body></timedtext>';
  const target='<timedtext format="3"><body><p t="1000" d="1200" w="1"><s>你好</s></p></body></timedtext>';
  const output=mergeSubtitles(target,source);assert.match(output,/<p t="1000" d="1200" w="1">/);assert.match(output,/Hello &amp; &lt;world&gt;\n你好/);
});
test('legacy XML and VTT preserve headers, timestamps, identifiers and styles',()=>{
  assert.match(mergeSubtitles('<transcript><text start="1" dur="2">译文</text></transcript>','<transcript><text start="1" dur="2">Original</text></transcript>'),/Original\n译文/);
  const target='WEBVTT\n\nSTYLE\n::cue {color:white}\n\nid1\n00:01.000 --> 00:03.000 align:start\n译文\n\n';const source=target.replace('译文','Original "quotes"');
  const out=mergeSubtitles(target,source);assert.match(out,/STYLE\n::cue/);assert.match(out,/id1\n00:01.000 --> 00:03.000 align:start\nOriginal "quotes"\n译文/);
});
test('ASR fragments are merged once and unrelated cue times never get paired',()=>{
  const original=JSON.stringify({events:[{tStartMs:1000,dDurationMs:1000,segs:[{utf8:'Hello '}]},{tStartMs:1500,dDurationMs:1500,aAppend:1,segs:[{utf8:'world'}]}]});
  const target=JSON.stringify({events:[{tStartMs:1000,dDurationMs:2000,segs:[{utf8:'你好世界'}]}]});
  assert.equal(JSON.parse(mergeSubtitles(target,original)).events[0].segs[0].utf8,'Hello world\n你好世界');
  assert.equal(mergeSubtitles(target,original.replaceAll('1000','10000').replaceAll('1500','15000')),null);
});
test('bilingual request only reaches YouTube and never forwards account credentials',async()=>{
  const calls=[];const result=await run(io(subtitleURL+'&tlang=zh-Hans',bytes(translatedJSON),{requestHeaders:{...ua,Authorization:'PRIVATE_FIXTURE',Cookie:'PRIVATE_FIXTURE'},responseHeaders:{'Content-Type':'application/json'},fetch:async(url,headers)=>{calls.push({url,headers});return{status:200,body:bytes(originalJSON)};}}),cfg);
  assert.equal(calls.length,1);assert.equal(calls[0].url,subtitleURL);assert.equal(calls[0].headers.Authorization,undefined);assert.equal(calls[0].headers.Cookie,undefined);assert.equal(calls[0].headers[INTERNAL],'1');assert.match(text(result.body),/A self-written line/);
});
test('single-language mode, original captions and other target languages require no extra request',async()=>{
  for(const [url,config] of [[subtitleURL,cfg],[subtitleURL+'&tlang=ja',cfg],[subtitleURL+'&tlang=zh-Hans',options({BILINGUAL:false})]])assert.equal(await run(io(url,bytes(translatedJSON)),config),null);
});
test('native config caches local keys without changing body and triggers refresh only when missing',async()=>{
  const x=io(api('config'),null);const config=core.schemas.config.create({responseContext:{globalConfigGroup:{hotConfigGroup:{mediaHotConfig:{onesieHotConfig:{clientKey:key,encryptKey:bytes('encrypted-public-key-fixture'),keyExpiresInSeconds:'300'}}}}}});x.body=core.schemas.config.toBinary(config);
  assert.equal(await run(x,cfg),null);assert.equal(x.storage.get(KEY).video.clientKey,base64(key));
  const request={...x,url:api('log_event'),phase:'request',body:null,requestHeaders:{...ua,'X-YouTube-Hot-Hash-Data':'keep-with-keys',Authorization:'PRIVATE_FIXTURE'}};
  assert.equal(await run(request,cfg),null);x.storage.set(KEY,{});const result=await run(request,cfg);assert.equal(result.headers['X-YouTube-Hot-Hash-Data'],undefined);assert.equal(result.headers.Authorization,'PRIVATE_FIXTURE');assert.doesNotMatch(JSON.stringify(x.storage.get(KEY)),/PRIVATE_FIXTURE/);
});
test('changed response headers discard stale encoding, size and validators, keeping cookies',()=>{
  const input={'Content-Type':'application/protobuf','Content-Length':'123','Content-Encoding':'gzip',ETag:'old','Set-Cookie':['a=1','b=2']};const out=cleanHeaders(input);assert.equal(out.ETag,undefined);assert.equal(out['Content-Encoding'],undefined);assert.deepEqual(out['Set-Cookie'],input['Set-Cookie']);assert.equal(input.ETag,'old');
});
