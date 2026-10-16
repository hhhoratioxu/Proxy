import test from 'node:test';
import assert from 'node:assert/strict';
import {Settings,utf8,fromUtf8,safeJson,changeParam,route,b64,unb64} from '../src/data.mjs';
import {decodeMessage} from '../src/wire.mjs';
import {editBinary,editJson} from '../src/edit.mjs';
import {handle,STORE} from '../src/runtime.mjs';
import {bilingual,readTimeline} from '../src/timeline.mjs';
import {combine,binary,integer,string,inspect,at,all,opaque,player,guide,ids,captionUrl,originalCaptions,translatedCaptions} from './fixtures.mjs';
const settings=new Settings();
const api=name=>'https://youtubei.googleapis.com/youtubei/v1/'+name;
function io(url,body,extra={}){const cache=new Map();return{url,body,phase:'response',status:200,requestHeaders:{'User-Agent':'fixture-video'},responseHeaders:{'Content-Type':'application/x-protobuf'},store:{read:k=>cache.get(k),write:(k,v)=>cache.set(k,v)},download:async()=>{throw Error('unexpected connection');},...extra};}
test('new wire policy clears small legacy and modern player ads and preserves every other raw field',()=>{
  const raw=player(),out=editBinary(raw,'player',settings),keep=f=>![7,45,68,10].includes(f.id);
  assert.deepEqual(inspect(out).filter(keep).map(f=>f.raw),inspect(raw).filter(keep).map(f=>f.raw));
  assert.equal(inspect(out).some(f=>[7,45,68].includes(f.id)),false);
  const list=at(at(out,10),51621377),tracks=all(list,1);assert.equal(tracks.length,2);assert.deepEqual(Buffer.from(tracks[0]),Buffer.from(all(at(at(raw,10),51621377),1)[0]));
  assert.equal(Buffer.from(at(tracks[1],3)).toString(),'.ytclean.zh-Hans');assert.match(Buffer.from(at(tracks[1],1)).toString(),/signature=AB%2BC%2FD&tlang=zh-Hans$/);
  assert.deepEqual(editBinary(out,'player',settings),out);
});
for(const ads of [false,true])for(const translation of [false,true])test('player independent switches ads='+ads+' translation='+translation,()=>{
  const s=new Settings({REMOVE_ADS:ads,TRANSLATE_CAPTIONS:translation}),out=editBinary(player(),'player',s);
  assert.equal(inspect(out).some(f=>f.id===45),!ads);assert.equal(all(at(at(out,10),51621377),1).length,translation?2:1);
});
for(const upload of [false,true])for(const shorts of [false,true])test('independent bottom switches upload='+upload+' shorts='+shorts+' apply to online and offline bars',()=>{
  const s=new Settings({REMOVE_ADS:false,TRANSLATE_CAPTIONS:false,HIDE_UPLOAD:upload,HIDE_SHORTS:shorts}),raw=guide(),out=editBinary(raw,'guide',s);
  for(const n of [4,6])assert.deepEqual(ids(out,n),['FEwhat_to_watch',...(!shorts?['FEshorts']:[]),...(!upload?['FEuploads']:[]),'FEsubscriptions','FElibrary']);
  assert.deepEqual(inspect(out).filter(f=>![4,6].includes(f.id)).map(f=>f.raw),inspect(raw).filter(f=>![4,6].includes(f.id)).map(f=>f.raw));
});
test('UI controls work when both ad removal and translation are disabled',async()=>{
  const result=await handle(io(api('guide'),guide()),new Settings({REMOVE_ADS:false,TRANSLATE_CAPTIONS:false,HIDE_UPLOAD:true,HIDE_SHORTS:true}));assert.deepEqual(ids(result.body),['FEwhat_to_watch','FEsubscriptions','FElibrary']);
});
test('unknown protobuf bytes remain opaque even when they contain an ad renderer tag',()=>{
  const unknown=binary(999,binary(424701016,string(1,'this is opaque account data'))),raw=combine(player(),unknown),out=editBinary(raw,'player',settings);
  assert.deepEqual(inspect(out).find(f=>f.id===999).raw,unknown);
});
test('ad-break response clears its defined ad fields but keeps response context and unknown data',()=>{
  const raw=combine(binary(2,string(1,'ad')),string(3,'ad parameters'),string(6,'next parameters'),binary(9,new Uint8Array([0])),binary(10,new Uint8Array([0])),opaque),out=editBinary(raw,'player/ad_break',settings);
  assert.deepEqual(out,new Uint8Array(opaque));
});
test('native direct get_watch preserves its context and clears its player',()=>{
  const context=string(2,'public-fixture-visitor'),raw=combine(binary(1,context),binary(2,player()),opaque),out=editBinary(raw,'get_watch',settings);
  assert.deepEqual(at(out,1),new Uint8Array(context));assert.equal(inspect(at(out,2)).some(f=>f.id===45),false);
});
test('native batched get_watch edits the inner player and retains batch metadata',()=>{
  const raw=combine(binary(1,combine(binary(2,player()),opaque)),opaque),out=editBinary(raw,'get_watch',settings);
  assert.equal(inspect(at(at(out,1),2)).some(f=>f.id===45),false);assert.deepEqual(inspect(out).filter(f=>f.id!==1).map(f=>f.raw),inspect(raw).filter(f=>f.id!==1).map(f=>f.raw));
});
test('all native player ad fields are processed without a minimum payload length',()=>{
  for(const id of [7,23,25,27,38,44,45,48,68,69]){const raw=combine(string(id,'x'),opaque);assert.deepEqual(editBinary(raw,'player',new Settings({TRANSLATE_CAPTIONS:false})),new Uint8Array(opaque));}
});
test('known compact feed AdSlot renderer is removed while other content and opaque bytes stay intact',()=>{
  // Documented SectionListSupportedRenderers tag; browse footer is a Renderer field 39.
  const ad=binary(39,binary(424701016,new Uint8Array([0]))),keep=binary(40,string(777,'ordinary unknown renderer'));
  const raw=combine(ad,keep,opaque),out=editBinary(raw,'browse',new Settings({TRANSLATE_CAPTIONS:false}));
  assert.deepEqual(out,new Uint8Array(combine(keep,opaque)));
});
test('JSON policy removes wrapped feed ads and Shorts ad entries, and retains normal Shorts content',()=>{
  const document={adPlacements:[{x:1}],items:[{richItemRenderer:{content:{adSlotRenderer:{x:1}}}},{richItemRenderer:{content:{videoRenderer:{videoId:'normal'}}}},{reelShelfRenderer:{title:'normal Shorts'}},{command:{reelWatchEndpoint:{adClientParams:{isAd:true}}}},{command:{reelWatchEndpoint:{adClientParams:{isAd:false}}}}]};
  editJson(document,new Settings({HIDE_SHORTS:true}));assert.deepEqual(document.adPlacements,[]);assert.equal(document.items.length,3);assert.equal(document.items[1].reelShelfRenderer.title,'normal Shorts');
});
test('JSON bottom controls act only inside navigation renderers',()=>{
  const bar={items:['FEwhat_to_watch','FEshorts','FEuploads','FEsubscriptions','FElibrary'].map(pivotIdentifier=>({pivotBarItemRenderer:{pivotIdentifier}}))};
  const doc={items:[{pivotBarRenderer:bar}],outside:[{browseId:'FEshorts',title:'this is content'}]};editJson(doc,new Settings({HIDE_UPLOAD:true,HIDE_SHORTS:true}));
  assert.equal(bar.items.length,3);assert.equal(doc.outside.length,1);
});
test('JSON native creation command without a browse ID is recognized within a pivot bar',()=>{
  const doc={pivotBarRenderer:{items:[{pivotBarItemRenderer:{navigationEndpoint:{uploadEndpoint:{}}}},{pivotBarItemRenderer:{pivotIdentifier:'FEwhat_to_watch'}}]}};
  editJson(doc,settings);assert.equal(doc.pivotBarRenderer.items.length,1);
});
test('UTF-8 codec needs no host TextEncoder/TextDecoder and supports Chinese, emoji and supplementary planes',()=>{
  for(const s of ['text','双语字幕','quote " \'','🎬 🐈‍⬛','𝄞','x\u0000y']){assert.deepEqual(Buffer.from(utf8(s)),Buffer.from(s));assert.equal(fromUtf8(utf8(s),true),s);}assert.equal(fromUtf8(new Uint8Array([0xff]),true),null);
});
test('base64 round-trips key bytes and signed caption queries retain all unrelated bytes',()=>{
  const raw=Uint8Array.from({length:32},(_,i)=>i);assert.deepEqual(unb64(b64(raw)),raw);assert.equal(b64(raw),Buffer.from(raw).toString('base64'));assert.equal(changeParam(changeParam(captionUrl,'tlang','zh-Hans'),'tlang',null),captionUrl);
});
test('unsafe JSON integers are bypassed rather than rounded',()=>{
  assert.throws(()=>safeJson('{"id":18446744073709551615}'));assert.equal(safeJson('{"id":"18446744073709551615"}').id,'18446744073709551615');
});
for(const url of ['https://youtubei.googleapis.com.evil.test/youtubei/v1/player','http://youtubei.googleapis.com/youtubei/v1/player','https://youtubei.googleapis.com/youtubei/v1/player/extra','https://rr1.googlevideo.com/videoplayback?itag=137','https://www.youtube.com/watch?v=x','https://www.youtube.com/api/timedtext/extra'])test('URL excludes '+url,()=>assert.equal(route(url),null));
for(const name of ['guide','player/ad_break','reel/reel_item_watch','reel/reel_watch_sequence','navigation/resolve_url','get_watch'])test('new required endpoint is matched: '+name,()=>assert.equal(route(api(name)).name,name));
test('native hot config can be raw or base64url in the documented serialized field',()=>{
  const key=Uint8Array.from({length:32},(_,i)=>i),onesie=combine(binary(1,key),string(2,'encrypted-key-fixture'),integer(3,300));
  const hot=binary(138536474,binary(146311580,onesie));
  for(const bytes of [hot,Buffer.from(hot.toString('base64url'))]){
    const config=binary(1,binary(16,binary(3,bytes))),captures=[];editBinary(config,'config',settings,value=>captures.push(value));assert.equal(captures.length,1);assert.deepEqual(Buffer.from(captures[0].key),Buffer.from(key));
  }
});
test('JSON3 composition preserves target time and original text above translation',()=>{
  const result=JSON.parse(bilingual(translatedCaptions,originalCaptions));assert.equal(result.wireMagic,'pb3');assert.equal(result.events[0].tStartMs,1000);assert.equal(result.events[0].segs[0].utf8,'An original "line"\n一行中文');
});
test('ASR append fragments are grouped by their own window',()=>{
  const original=JSON.stringify({events:[{tStartMs:1000,dDurationMs:1500,wWinId:1,segs:[{utf8:'hello '}]},{tStartMs:1200,dDurationMs:1000,wWinId:2,segs:[{utf8:'separate'}]},{tStartMs:1500,dDurationMs:1500,wWinId:1,aAppend:1,segs:[{utf8:'world'}]}]});
  const doc=readTimeline(original);assert.equal(doc.cues[0].words,'hello world');assert.equal(doc.cues[1].words,'separate');
});
for(const format of ['srv3','xml','vtt'])test(format+' subtitle composition retains format/times and escapes cue text',()=>{
  let original,target;if(format==='srv3'){original='<timedtext format="3"><body><p t="1000" d="2000"><s>Hello &amp; &lt;world&gt;</s></p></body></timedtext>';target=original.replace('Hello &amp; &lt;world&gt;','中文');}
  else if(format==='xml'){original='<transcript><text start="1" dur="2">Hello &amp; &lt;world&gt;</text></transcript>';target=original.replace('Hello &amp; &lt;world&gt;','中文');}
  else{original='WEBVTT\r\n\r\nSTYLE\r\n::cue {color:white}\r\n\r\nid\r\n00:01.000 --> 00:03.000 align:start\r\nHello &amp; &lt;world&gt; "quotes"\r\n\r\n';target=original.replace('Hello &amp; &lt;world&gt; "quotes"','中文');}
  const result=bilingual(target,original);assert.ok(result.includes('Hello &amp; &lt;world&gt;'));assert.ok(result.includes('中文'));if(format==='vtt'){assert.ok(result.includes('"quotes"'));assert.ok(result.includes('STYLE\r\n'));}
});
test('subtitles with unrelated intervals or identical words are unchanged',()=>{
  assert.equal(bilingual(originalCaptions,originalCaptions),null);assert.equal(bilingual(translatedCaptions,originalCaptions.replaceAll('1000','100000').replaceAll('3000','300000')),null);
});
test('bilingual download goes only to the original YouTube track and sends no account credentials',async()=>{
  const requests=[],context=io(captionUrl+'&tlang=zh-Hans',utf8(translatedCaptions),{requestHeaders:{Authorization:'PRIVATE_FIXTURE',Cookie:'PRIVATE_FIXTURE'},download:async(url,headers)=>{requests.push({url,headers});return{status:200,body:utf8(originalCaptions)};}});
  const result=await handle(context,settings);assert.equal(requests.length,1);assert.equal(requests[0].url,captionUrl);assert.equal(requests[0].headers.Authorization,undefined);assert.equal(requests[0].headers.Cookie,undefined);assert.match(fromUtf8(result.body),/An original/);
});
