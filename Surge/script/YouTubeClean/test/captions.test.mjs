import test from 'node:test';
import assert from 'node:assert/strict';
import {Settings,utf8,fromUtf8,changeParam} from '../src/data.mjs';
import {handle} from '../src/runtime.mjs';
import {editBinary,editJson} from '../src/edit.mjs';
import {CAPTION_BACKOFF} from '../src/captions.mjs';
import {gzipSync} from 'node:zlib';
import {combine,binary,integer,string,at,all,opaque} from './fixtures.mjs';

// Only the HTTP status, languages and format come from the user's diagnostic.
// This signature, video ID, transcript and all payloads are independent fixtures.
const originalUrl='https://www.youtube.com/api/timedtext?v=SELF-WRITTEN&lang=ko&signature=PRIVATE_SIGNATURE%2BKEEP&sparams=ip%2Cexpire%2Cv&format=srv3';
const targetUrl=changeParam(originalUrl,'tlang','zh-Hant');
const original='<timedtext format="3"><body><p t="1000" d="2000"><s>한국어 원문</s></p></body></timedtext>';
const translated='<timedtext format="3"><body><p t="1000" d="2000"><s>繁體中文譯文</s></p></body></timedtext>';
const settings=new Settings({TARGET_LANGUAGE:'zh-Hant'});
function context(url=originalUrl,status=200,body=original,cache={}){
  const reports=[],requests=[];
  const io={url,phase:'response',status,requestHeaders:{'User-Agent':'fixture iOS client',Cookie:'PRIVATE_COOKIE',Authorization:'PRIVATE_AUTH'},responseHeaders:{'Content-Type':'application/xml','Retry-After':'60'},body:utf8(body),store:{read:k=>cache[k],write:(k,v)=>{cache[k]=v;return true;}},report:r=>reports.push(r),download:async(url,headers)=>{requests.push({url,headers});return {status:200,headers:{'Content-Type':'application/xml'},body:utf8(translated)};}};
  return {io,reports,requests,cache};
}
test('native Korean original requests can produce Traditional Chinese bilingual captions without cloning a track',async()=>{
  const c=context(),out=await handle(c.io,settings);assert.ok(out?.body);const text=fromUtf8(out.body);
  assert.ok(text.includes('한국어 원문\n繁體中文譯文'));assert.ok(text.includes('<p t="1000" d="2000">'));
  assert.equal(c.requests.length,1);assert.equal(c.requests[0].url,targetUrl);assert.equal(c.requests[0].headers['User-Agent'],'fixture iOS client');assert.equal(c.requests[0].headers.Cookie,undefined);assert.equal(c.requests[0].headers.Authorization,undefined);
  assert.equal(c.reports[0].captionDownloadStatus,200);assert.equal(c.reports[0].captionMode,'bilingual');assert.ok(!/PRIVATE_|https:/.test(JSON.stringify(c.reports)));
});
test('the observed translated HTTP 429 can recover a real original transcript with HTTP 200',async()=>{
  const c=context(targetUrl,429,'<html>self-written rate-limit fixture</html>');
  c.io.download=async(url,headers)=>{c.requests.push({url,headers});return{status:200,headers:{'Content-Type':'application/xml'},body:utf8(original)};};
  const out=await handle(c.io,settings);assert.ok(out?.body);assert.equal(out.status,200);assert.equal(fromUtf8(out.body),original);assert.equal(c.requests.length,1);assert.equal(c.requests[0].url,originalUrl);
  assert.equal(c.reports[0].status,429);assert.equal(c.reports[0].reason,'caption-fallback-original');assert.equal(c.reports[0].captionDownloadStatus,200);
  assert.ok(Object.keys(c.cache).length===1);assert.ok(!/PRIVATE_|https:|한국어/.test(JSON.stringify(c.cache)));
});
test('translation HTTP 429 preserves the native response and suppresses further translation calls during cooldown',async()=>{
  const cache={},c=context(originalUrl,200,original,cache);
  c.io.download=async(url,headers)=>{c.requests.push({url,headers});return{status:429,headers:{'Retry-After':'60'},body:utf8('<html>rate limited</html>')};};
  assert.equal(await handle(c.io,settings),null);assert.equal(c.requests.length,1);assert.equal(c.reports[0].reason,'caption-rate-limited');assert.equal(c.reports[0].captionDownloadStatus,429);
  const next=context(originalUrl,200,original,cache);assert.equal(await handle(next.io,settings),null);assert.equal(next.requests.length,0);assert.equal(next.reports[0].reason,'caption-cooldown');
  assert.equal(fromUtf8(c.io.body),original);assert.ok(!/PRIVATE_|https:|한국어/.test(JSON.stringify(cache)));
});
test('a failed original fallback never relabels an HTTP error or HTML page as valid subtitles',async()=>{
  const c=context(targetUrl,429,'<html>rate limited</html>');c.io.download=async()=>({status:403,body:utf8('<html>denied</html>')});
  assert.equal(await handle(c.io,settings),null);assert.equal(c.reports[0].captionDownloadStatus,403);assert.equal(c.reports[0].reason,'caption-fallback-failed');
});
for(const body of ['', '<html>not captions</html>', 'binary-shaped-unknown'])test('invalid 200 companion subtitles preserve the native transcript: '+(body||'empty'),async()=>{
  const c=context();c.io.download=async()=>({status:200,body:utf8(body)});assert.equal(await handle(c.io,settings),null);assert.equal(c.reports[0].reason,body?'caption-download-invalid':'caption-download-empty');
});
test('unsupported native data is kept without making a translation request',async()=>{
  const c=context(originalUrl,200,'unrecognized binary format');assert.equal(await handle(c.io,settings),null);assert.equal(c.requests.length,0);assert.equal(c.reports[0].reason,'caption-format-unsupported');
});
test('translation-only mode keeps the native XML envelope and timing',async()=>{
  const c=context(),out=await handle(c.io,new Settings({TARGET_LANGUAGE:'zh-Hant',BILINGUAL:false}));assert.ok(out?.body);const text=fromUtf8(out.body);assert.ok(text.includes('繁體中文譯文'));assert.ok(!text.includes('한국어'));assert.ok(text.startsWith('<timedtext format="3">'));
});
test('a different downloaded format is rendered into the original format rather than returned to the native decoder',async()=>{
  const c=context();c.io.download=async()=>({status:200,body:utf8(JSON.stringify({events:[{tStartMs:1000,dDurationMs:2000,segs:[{utf8:'繁體中文譯文'}]}]}))});
  const out=await handle(c.io,settings);assert.ok(fromUtf8(out.body).startsWith('<timedtext'));assert.ok(fromUtf8(out.body).includes('한국어 원문\n繁體中文譯文'));
});
for(const lang of ['zh-Hant','zh-TW'])test('already selected native target language does not cause self-translation: '+lang,async()=>{
  const c=context(changeParam(originalUrl,'lang',lang));assert.equal(await handle(c.io,settings),null);assert.equal(c.requests.length,0);assert.equal(c.reports[0].reason,'caption-already-target');
});
test('a target query protected by the signature is never changed or removed',async()=>{
  const c=context(changeParam(originalUrl,'sparams','v,tlang'));assert.equal(await handle(c.io,settings),null);assert.equal(c.requests.length,0);assert.equal(c.reports[0].reason,'caption-signed-target');
});
test('manually selected translation into another language is preserved',async()=>{
  const c=context(changeParam(originalUrl,'tlang','ja'));assert.equal(await handle(c.io,settings),null);assert.equal(c.requests.length,0);assert.equal(c.reports[0].reason,'caption-other-target');
});
test('native player metadata retains every track URL, identity, language, availability and count',()=>{
  const track=translatable=>combine(string(1,originalUrl),string(3,'.ko'),string(4,'ko'),integer(7,translatable?1:0),opaque);
  for(const translatable of [false,true]){
    const list=combine(binary(1,track(translatable)),binary(2,combine(integer(2,0),integer(3,0),opaque)),opaque),raw=binary(10,binary(51621377,list));
    const out=editBinary(raw,'player',settings);assert.deepEqual(Buffer.from(out),raw);assert.equal(all(at(at(out,10),51621377),1).length,1);
    const json={captions:{playerCaptionsTracklistRenderer:{captionTracks:[{baseUrl:originalUrl,vssId:'.ko',languageCode:'ko',isTranslatable:translatable}],audioTracks:[{captionTrackIndices:[0],defaultCaptionTrackIndex:0}]}}},before=JSON.stringify(json);
    editJson(json,settings);assert.equal(JSON.stringify(json),before);
  }
});
test('an original HTTP 429 prevents extra requests even when a subsequent translated URL also fails',async()=>{
  const cache={},first=context(originalUrl,429,'<html>rate limited</html>',cache);assert.equal(await handle(first.io,settings),null);assert.equal(first.requests.length,0);assert.equal(first.reports[0].status,429);
  const second=context(targetUrl,429,'<html>rate limited</html>',cache);assert.equal(await handle(second.io,settings),null);assert.equal(second.requests.length,0);assert.equal(second.reports[0].reason,'caption-cooldown');
});
test('expired backoff permits a single new translation attempt',async()=>{
  const c=context(originalUrl,200,original,{[CAPTION_BACKOFF]:{until:Date.now()-1000,sourceBlocked:true}});
  assert.ok((await handle(c.io,settings))?.body);assert.equal(c.requests.length,1);
});
for(const retry of ['0','999999','not a valid retry date'])test('Retry-After creates a bounded cooldown without retaining a URL: '+retry,async()=>{
  const c=context();c.io.download=async()=>({status:429,headers:{'Retry-After':retry},body:utf8('not a subtitle')});
  assert.equal(await handle(c.io,settings),null);const pause=c.cache[CAPTION_BACKOFF];assert.ok(pause.until>=Date.now()+29000);assert.ok(pause.until<=Date.now()+300000);assert.ok(c.reports[0].captionRetryAfterSeconds<=300);
});
test('unavailable persistent storage does not discard a valid native transcript',async()=>{
  const c=context();c.io.store={read:()=>{throw Error('storage unavailable');},write:()=>{throw Error('storage unavailable');}};c.io.download=async()=>({status:429,body:utf8('rate limited')});
  assert.equal(await handle(c.io,settings),null);assert.equal(c.reports[0].reason,'caption-rate-limited');
});
test('gzip companion captions are validated before being merged into the native XML',async()=>{
  const c=context();c.io.download=async()=>({status:200,body:gzipSync(utf8(translated))});const out=await handle(c.io,settings);assert.ok(fromUtf8(out.body).includes('한국어 원문\n繁體中文譯文'));
});
test('an oversized merged transcript is rejected while the original stays intact',async()=>{
  const source='<transcript><text start="1" dur="2">'+'a'.repeat(600000)+'</text></transcript>',target='<transcript><text start="1" dur="2">'+'b'.repeat(600000)+'</text></transcript>';
  const c=context(originalUrl,200,source);c.io.download=async()=>({status:200,body:utf8(target)});assert.equal(await handle(c.io,settings),null);assert.equal(c.reports[0].reason,'caption-output-too-large');assert.equal(fromUtf8(c.io.body),source);
});
test('AUTO_CAPTIONS fills only a missing audio default using an existing translatable track in that group',()=>{
  const tracks=[false,true].map((enabled,i)=>combine(string(1,changeParam(originalUrl,'lang',i?'en':'ko')),string(3,i?'.en':'.ko'),string(4,i?'en':'ko'),integer(7,enabled?1:0),opaque));
  const list=combine(...tracks.map(t=>binary(1,t)),binary(2,combine(integer(2,0),integer(2,1),opaque)),opaque),raw=binary(10,binary(51621377,list));
  const out=editBinary(raw,'player',settings),after=at(at(out,10),51621377);assert.deepEqual(all(after,1).map(Buffer.from),tracks.map(Buffer.from));assert.equal(at(all(after,2)[0],3),'1');
  assert.deepEqual(Buffer.from(editBinary(raw,'player',new Settings({AUTO_CAPTIONS:false}))),raw);
  const json={captionTracks:[{baseUrl:originalUrl,isTranslatable:false},{baseUrl:originalUrl,isTranslatable:true}],audioTracks:[{captionTrackIndices:[0,1]},{captionTrackIndices:[0]}]};editJson(json,settings);
  assert.equal(json.audioTracks[0].defaultCaptionTrackIndex,1);assert.equal(json.audioTracks[1].defaultCaptionTrackIndex,undefined);assert.equal(json.captionTracks.length,2);
});
test('already processed or internal caption requests do not recurse or make extra downloads',async()=>{
  for(const internal of [false,true]){const c=context();if(internal)c.io.requestHeaders['X-YouTubeClean-Internal']='1';else c.io.responseHeaders['X-YouTubeClean']='self-written';assert.equal(await handle(c.io,settings),null);assert.equal(c.requests.length,0);}
});
