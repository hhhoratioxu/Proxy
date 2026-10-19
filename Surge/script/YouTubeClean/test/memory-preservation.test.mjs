import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,createHmac} from 'node:crypto';
import * as data from '../src/data.mjs';
import {editJson} from '../src/edit.mjs';
import {readTimeline} from '../src/timeline.mjs';
import {openMetadata} from '../src/stream.mjs';
for(const [name,text]of [['ASCII','self-written & text'],['wide','繁體中文 한국어 العربية'],['astral','🎬𝄞𠮷'],['surrogates','a\ud800b\udc00c'],['chunk boundaries',('ab繁體🎬\ud800').repeat(3000)]])test('UTF-8 bytes and byte count preserve '+name,()=>{
 const expected=Buffer.from(text);assert.deepEqual(Buffer.from(data.utf8(text)),expected);assert.equal(data.utf8Length(text),expected.length);
});
test('UTF-8 decoding preserves valid wide and astral text across repeated scratch-buffer use',()=>{
 const text=('a繁體🎬\n').repeat(12000),bytes=Buffer.from(text);
 assert.equal(data.fromUtf8(bytes,true),text);assert.equal(data.fromUtf8(Buffer.from('short')), 'short');assert.equal(data.fromUtf8(bytes,true),text);
});
test('long malformed UTF-8 stays bounded and produces one replacement per invalid byte',()=>{
 const bytes=new Uint8Array(200000).fill(255);assert.equal(data.fromUtf8(bytes), '\uFFFD'.repeat(bytes.length));assert.equal(data.fromUtf8(bytes,true),null);
});
test('malformed/truncated sequences keep the previous non-strict decoding behavior',()=>{
 for(const [bytes,text]of [[[0xe2,0x82],'\uFFFD\uFFFD'],[[0xf0,0x28,0x8c,0xbc],'\uFFFD(\uFFFD\uFFFD'],[[0xed,0xa0,0x80],'\uFFFD\uFFFD\uFFFD']]){assert.equal(data.fromUtf8(new Uint8Array(bytes)),text);assert.equal(data.fromUtf8(new Uint8Array(bytes),true),null);}
});
test('opaque-text classification matches a fatal native decoder without returning decoded strings',()=>{
 const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
 const samples=[Buffer.alloc(0),Buffer.from('title\t\n\r繁體🎬'),Buffer.from('a\0b'),Buffer.from('\uFEFF'),Buffer.from('normal'.repeat(12000))];
 for(let i=0;i<256;i++)samples.push(new Uint8Array([i,0x61]));
 let seed=7;for(let i=0;i<500;i++){const a=new Uint8Array(i%31);for(let j=0;j<a.length;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;a[j]=seed>>>24;}samples.push(a);}
 for(const bytes of samples){let expected=false;try{const text=decoder.decode(bytes);expected=!!text&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text);}catch{}assert.equal(data.isOpaqueText(bytes),expected);}
});
const cases=[
 ['ordinary JSON',{contents:{items:[{videoRenderer:{title:'ad words remain ordinary'}}]}},{}],
 ['empty ad list',{adPlacements:[],unknown:'retain'},{}],
 ['ad property',{adSlots:[{test:true}],playerAds:[{}]},{}],
 ['feed card',{contents:{items:[{adSlotRenderer:{test:true}},{videoRenderer:{title:'keep'}}]}},{}],
 ['navigation',{pivotBarRenderer:{items:[{pivotIdentifier:'FEuploads'},{pivotIdentifier:'FEshorts'}]}},{HIDE_UPLOAD:true,HIDE_SHORTS:true}],
 ['caption default',{captions:{playerCaptionsTracklistRenderer:{captionTracks:[{baseUrl:'https://www.youtube.com/api/timedtext?lang=en',isTranslatable:true}],audioTracks:[{captionTrackIndices:[0]}]}}},{}],
 ['disabled ads',{adSlots:[{test:true}]},{REMOVE_ADS:false}],
 ['global templates',{frameworkUpdates:{resources:[{adSlotRenderer:{test:true}}]}},{REMOVE_ADS:false}]
];
for(const [name,input,flags]of cases)test('JSON change tracking matches actual semantic edits: '+name,()=>{
 const before=JSON.stringify(input),changes={changed:false};editJson(input,new data.Settings(flags),()=>{},null,changes);assert.equal(changes.changed,JSON.stringify(input)!==before);
});
test('XML rendering preserves source order, unknown attributes and untouched gaps when timestamps are unordered',()=>{
 const source='<?xml version="1.0"?><timedtext><head><unknown/></head><body>\n<p t="3000" d="2000" custom="x"><s>A &amp; B</s></p>\n<p t="1000" d="500">unchanged</p>\n<p t="2000" d="1000">C</p></body></timedtext>';
 const timeline=readTimeline(source),map=new Map();for(const cue of timeline.cues)if(cue.words!=='unchanged')map.set(cue,'繁體 < > & 🎬');
 assert.equal(timeline.render(map),source.replace('<s>A &amp; B</s>','<s>繁體 &lt; &gt; &amp; 🎬</s>').replace('>C</p>','><s>繁體 &lt; &gt; &amp; 🎬</s></p>'));
 assert.equal(timeline.render(new Map()),source);
});
test('incremental authentication matches independent cryptography on a large metadata body',()=>{
 const key=Buffer.alloc(32,17),iv=Buffer.alloc(16,31),plain=Buffer.alloc(3*1024*1024,83),cipher=createCipheriv('aes-128-ctr',key.subarray(0,16),iv),sealed=Buffer.concat([cipher.update(plain),cipher.final()]),mac=createHmac('sha256',key.subarray(16)).update(sealed).update(iv).digest();
 assert.deepEqual(Buffer.from(openMetadata(sealed,mac,iv,key)),plain);
});
