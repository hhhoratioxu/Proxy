import test from 'node:test';
import assert from 'node:assert/strict';
import {Settings,utf8} from '../src/data.mjs';
import {editBinary} from '../src/edit.mjs';
import {handle} from '../src/runtime.mjs';
import {combine,binary,string,opaque,homeFirstPage,homeContinuationPage,homeSection} from './fixtures.mjs';

// Only this field number and the reported root-field layout come from the Loon
// diagnostic. Inner envelopes are independent fixtures, not a user capture.
const ENVELOPE=474376530,URI=172035250,COMPONENT=168777401;
const element=name=>binary(1,binary(COMPONENT,binary(3,binary(URI,string(1,name+'.eml-fe|self-written')))));
const renderer=name=>binary(153515154,binary(172660663,element(name)));
const list=entries=>combine(string(2,'self-written metadata'),...entries.map(entry=>binary(1,entry)),binary(9,opaque));
const card=entries=>binary(ENVELOPE,list(entries));
const settings=new Settings({TRANSLATE_CAPTIONS:false,DEEP_FILTER:true});
for(const [page,make]of [['first',homeFirstPage],['continuation',homeContinuationPage]]){
 for(const [kind,entry]of [['renderer',renderer],['direct element',element],['nested envelope',name=>binary(7,binary(12,renderer(name)))]])test(page+' new feed envelope filters individual '+kind+' entries and preserves normal neighbors byte for byte',()=>{
  const a=entry('video_lockup_with_attachment'),b=entry('cell_divider'),ad=entry('full_width_square_image_layout');
  const before=make([homeSection([card([a,ad,b])])]),expected=make([homeSection([card([a,b])])]);
  assert.deepEqual(Buffer.from(editBinary(before,'browse',settings)),expected);
 });
 test(page+' container larger than the old 512 KiB card scan is processed without dropping its normal entries',()=>{
  const a=combine(renderer('video_lockup_with_attachment'),string(55,'n'.repeat(540000))),b=renderer('cell_divider');
  const before=make([homeSection([card([a,renderer('video_display_full_buttoned_layout'),b])])]);
  const expected=make([homeSection([card([a,b])])]);assert.ok(before.length>524288);
  assert.deepEqual(Buffer.from(editBinary(before,'browse',settings)),expected);
 });
}
test('diagnostic reports the observed new envelope without logging any payload text',async()=>{
 const body=combine(homeFirstPage([homeSection([card([renderer('video_lockup_with_attachment'),renderer('full_width_square_image_layout')])])]),binary(13,opaque),binary(31,opaque),binary(40,opaque),binary(53,opaque),binary(777,opaque)),logs=[];
 const out=await handle({url:'https://youtubei.googleapis.com/youtubei/v1/browse',phase:'response',status:200,body,requestHeaders:{Cookie:'PRIVATE_COOKIE'},responseHeaders:{},report:d=>logs.push(d)},settings);
 assert.ok(out?.body);assert.equal(logs[0].changed,true);assert.equal(logs[0].feedCards,1);assert.ok(logs[0].feedEnvelopeFields.includes(ENVELOPE));assert.ok(logs[0].feedEnvelopeNodes>0);assert.ok(logs[0].feedEnvelopeElements>=2);assert.deepEqual(logs[0].matchedAdTemplates,['full_width_square_image_layout']);assert.ok(!JSON.stringify(logs).includes('self-written'));assert.ok(!JSON.stringify(logs).includes('PRIVATE_'));
});
test('ad-removal off and deep-filter off preserve the entire new envelope',()=>{
 const before=homeFirstPage([homeSection([card([renderer('video_lockup_with_attachment'),renderer('full_width_square_image_layout')])])]);
 for(const flags of [{REMOVE_ADS:false},{DEEP_FILTER:false}])assert.deepEqual(Buffer.from(editBinary(before,'browse',new Settings({TRANSLATE_CAPTIONS:false,...flags}))),before);
});
test('normal titles, URLs and JSON-like text inside the new envelope remain opaque',()=>{
 const a=combine(renderer('video_lockup_with_attachment'),string(55,'full_width_square_image_layout'),string(56,'https://example.test/ads'),string(57,'{"elementRenderer":"full_width_square_image_layout"}')),before=homeFirstPage([homeSection([card([a])])]);assert.deepEqual(Buffer.from(editBinary(before,'browse',settings)),before);
});
test('global catalogs and unknown fields outside the observed feed-card boundary are preserved',()=>{
 const ordinary=homeFirstPage([homeSection([card([renderer('video_lockup_with_attachment')])])]);
 const body=combine(ordinary,binary(499,card([renderer('full_width_square_image_layout')])),binary(777,binary(1,card([renderer('video_display_full_layout')]))));assert.deepEqual(Buffer.from(editBinary(body,'browse',settings)),body);
});
test('an in-envelope framework resource is not traversed as visible feed content',()=>{
 const inside=combine(list([renderer('video_lockup_with_attachment')]),binary(777,renderer('full_width_square_image_layout'))),body=homeFirstPage([homeSection([binary(ENVELOPE,inside)])]);assert.deepEqual(Buffer.from(editBinary(body,'browse',settings)),body);
});
test('malformed and over-deep new envelopes are retained while a valid sibling is still filtered',()=>{
 let deep=renderer('full_width_square_image_layout');for(let i=0;i<30;i++)deep=binary(1,deep);
 for(const payload of [new Uint8Array([0]),deep]){
  const malformed=binary(ENVELOPE,payload),valid=card([renderer('full_width_square_image_layout'),renderer('cell_divider')]);
  const before=homeFirstPage([homeSection([malformed]),homeSection([valid])]),expected=homeFirstPage([homeSection([malformed]),homeSection([card([renderer('cell_divider')])])]);
  assert.deepEqual(Buffer.from(editBinary(before,'browse',settings)),expected);
 }
});
test('new-envelope filtering is idempotent and works with diagnostics disabled',async()=>{
 const before=homeFirstPage([homeSection([card([renderer('full_width_square_image_layout'),renderer('video_lockup_with_attachment')])])]);const s=new Settings({TRANSLATE_CAPTIONS:false,DIAGNOSTICS:false}),after=editBinary(before,'browse',s);assert.notDeepEqual(Buffer.from(after),before);assert.deepEqual(Buffer.from(editBinary(after,'browse',s)),Buffer.from(after));
});
test('protocol-declared ad renderers inside a new container are removed without deleting the container',()=>{
 const normal=renderer('video_lockup_with_attachment'),ads=[424701016,194442374,175333548].map(no=>binary(no,string(99,'self-written ad content')));
 const body=homeFirstPage([homeSection([card([normal,...ads])])]),expected=homeFirstPage([homeSection([card([normal])])]);assert.deepEqual(Buffer.from(editBinary(body,'browse',settings)),expected);
});
test('exhausting the node budget rolls back this container and does not count uncommitted removals',async()=>{
 const entries=[renderer('full_width_square_image_layout'),...Array.from({length:1000},()=>binary(1,binary(1,binary(1,binary(1,binary(1,binary(1,binary(1,binary(1,binary(1,string(1,'plain')))))))))))];
 const body=homeFirstPage([homeSection([card(entries)])]),logs=[];
 assert.equal(await handle({url:'https://youtubei.googleapis.com/youtubei/v1/browse',phase:'response',status:200,body,requestHeaders:{},responseHeaders:{},report:d=>logs.push(d)},settings),null);
 assert.equal(logs[0].changed,false);assert.equal(logs[0].removedParts,0);assert.deepEqual(logs[0].matchedAdTemplates,[]);assert.ok(logs[0].feedEnvelopeBypasses>0);
});
test('all new feed containers share one traversal budget for the entire response',async()=>{
 const leaf=binary(1,binary(1,binary(1,binary(1,binary(1,binary(1,binary(1,binary(1,binary(1,string(1,'plain')))))))))),ordinary=Array.from({length:450},()=>leaf),ad=renderer('full_width_square_image_layout');
 const originalSection=homeSection([card([ad,...ordinary])]),filteredSection=homeSection([card(ordinary)]),body=homeFirstPage([originalSection,originalSection]),logs=[];
 const out=await handle({url:'https://youtubei.googleapis.com/youtubei/v1/browse',phase:'response',status:200,body,requestHeaders:{},responseHeaders:{},report:d=>logs.push(d)},settings);
 assert.ok(out?.body);assert.deepEqual(Buffer.from(out.body),homeFirstPage([filteredSection,originalSection]));assert.equal(logs[0].removedParts,1);assert.equal(logs[0].feedEnvelopeNodes,8192);assert.equal(logs[0].feedEnvelopeBypasses,1);
});
