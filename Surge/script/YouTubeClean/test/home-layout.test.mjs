import test from 'node:test';
import assert from 'node:assert/strict';
import {Settings,b64} from '../src/data.mjs';
import {editBinary,editJson} from '../src/edit.mjs';
import {handle,STORE} from '../src/runtime.mjs';
import {combine,binary,string,opaque,homeFirstPage,homeContinuationPage,homeSection,homeContents} from './fixtures.mjs';

// These template identifiers were observed in a real Loon browse diagnostic.
// All protobuf/JSON payloads below are self-written; no user capture is stored.
function card(uri){
  const template=binary(172035250,string(1,uri+'.eml-fe|self-written-fixture'));
  const component=combine(binary(3,template),opaque);
  const element=combine(binary(1,binary(168777401,component)),opaque);
  return binary(153515154,combine(binary(172660663,element),opaque));
}
const settings=new Settings({TRANSLATE_CAPTIONS:false,DEEP_FILTER:true});
for(const [page,make]of [['first',homeFirstPage],['continuation',homeContinuationPage]])test('observed home '+page+' layout removes the buttoned video ad and preserves eleven ordinary/divider sections exactly',async()=>{
  const normal=[homeSection([card('cell_divider')]),...Array.from({length:10},()=>homeSection([card('video_lockup_with_attachment')]))];
  const ad=homeSection([card('video_display_full_buttoned_layout')]);
  const outside=combine(binary(1,opaque),string(16,'self-written tracking fixture'),binary(30,opaque),binary(30,opaque),binary(30,opaque),binary(777,opaque));
  const before=combine(make([...normal.slice(0,4),ad,...normal.slice(4)]),outside),expected=combine(make(normal),outside),reports=[];
  const cache={[STORE]:{video:{key:b64(Buffer.alloc(32,4)),until:Date.now()+60000}}};
  const result=await handle({url:'https://youtubei.googleapis.com/youtubei/v1/browse',phase:'response',status:200,requestHeaders:{},responseHeaders:{},body:before,store:{read:k=>cache[k],write:(k,v)=>cache[k]=v},report:r=>reports.push(r)},settings);
  assert.ok(result?.body,'the published 1.2.2 policy left this observed ad template unchanged');
  assert.deepEqual(Buffer.from(result.body),Buffer.from(expected));assert.equal(homeContents(result.body,page).length,11);
  assert.equal(reports.length,1);assert.equal(reports[0].feedCards,12);assert.equal(reports[0].keyState,'available');assert.equal(reports[0].reason,'modified');assert.equal(reports[0].removedParts,1);
  assert.deepEqual(reports[0].matchedAdTemplates,['video_display_full_buttoned_layout']);
});
for(const deep of [false,true])test('the independently confirmed full-video ad layout is removed from mixed sections, deep='+deep,()=>{
  const normal=card('video_lockup_with_attachment'),divider=card('cell_divider');
  const raw=homeFirstPage([homeSection([normal,card('video_display_full_layout'),divider])]);
  const expected=homeFirstPage([homeSection([normal,divider])]);
  assert.deepEqual(Buffer.from(editBinary(raw,'browse',new Settings({TRANSLATE_CAPTIONS:false,DEEP_FILTER:deep}))),Buffer.from(expected));
});
test('observed video-layout identifiers are filtered in JSON feed cards while the global template catalog stays intact',()=>{
  const item=name=>({elementRenderer:{newElement:{type:{componentType:{templateConfig:{uriTemplateConfig:{uri:name+'.eml-fe|fixture'}}}}}}});
  const normal=item('video_lockup_with_attachment'),divider=item('cell_divider'),ad=item('video_display_full_buttoned_layout');
  const doc={contents:{items:[normal,ad,divider]},frameworkUpdates:{resources:[ad]}};
  editJson(doc,settings);assert.deepEqual(doc.contents.items,[normal,divider]);assert.deepEqual(doc.frameworkUpdates.resources,[ad]);
});
test('disabling ad removal preserves both explicit video-ad layouts byte for byte',()=>{
  const raw=homeFirstPage([homeSection([card('video_display_full_buttoned_layout'),card('video_display_full_layout'),card('video_lockup_with_attachment')])]);
  assert.deepEqual(Buffer.from(editBinary(raw,'browse',new Settings({REMOVE_ADS:false,TRANSLATE_CAPTIONS:false}))),raw);
});
test('ordinary titles, layout lookalikes, unknown metadata and global template definitions are never treated as the explicit ad template',()=>{
  const normal=combine(card('video_lockup_with_attachment'),string(55,'video_display_full_buttoned_layout'));
  const raw=combine(homeFirstPage([homeSection([normal,card('cell_divider'),card('video_display_full_buttoned_layout_tutorial')])]),binary(499,card('video_display_full_buttoned_layout')),binary(777,binary(499,card('video_display_full_layout'))));
  assert.deepEqual(Buffer.from(editBinary(raw,'browse',settings)),raw);
});
