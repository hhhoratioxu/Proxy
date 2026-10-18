import test from 'node:test';
import assert from 'node:assert/strict';
import {Settings} from '../src/data.mjs';
import {editBinary,editJson} from '../src/edit.mjs';
import {handle} from '../src/runtime.mjs';
import {combine,binary,string,opaque,homeFirstPage,homeContinuationPage,homeSection,homeContents} from './fixtures.mjs';

// The square image identifier was observed in the user's 1.2.3 Loon diagnostic.
// The related display-ad identifiers were independently checked in YouTube-X
// 48b901532f9e12152684f3326d4250efcdea61e5 (MIT). Fixtures are self-written.
const imageAds=['full_width_square_image_layout','full_width_portrait_image_layout','landscape_image_wide_button_layout','square_image_layout','text_image_button_layout','grid_ads_image_layout'];
const otherDisplayAds=['carousel_footered_layout','carousel_headered_layout','brand_video_shelf','video_display_full_layout','video_display_full_buttoned_layout'];
const displayAds=[...imageAds,...otherDisplayAds];
function node(uri,children=[]){
  const config=binary(172035250,string(1,uri+'.eml-fe|independent-fixture'));
  return combine(binary(1,binary(168777401,combine(binary(3,config),opaque))),...children.map(c=>binary(3,c)),opaque);
}
const renderer=n=>binary(153515154,combine(binary(172660663,n),opaque));
const card=uri=>renderer(node(uri));
const settings=deep=>new Settings({TRANSLATE_CAPTIONS:false,DEEP_FILTER:deep});
const pages=[['first',homeFirstPage],['continuation',homeContinuationPage]];
for(const [page,make]of pages)test('observed 11-card '+page+' feed removes the square image ad without a playback key',async()=>{
  const keep=[homeSection([card('cell_divider')]),...Array.from({length:9},()=>homeSection([card('video_lockup_with_attachment')]))];
  const outside=combine(binary(1,opaque),string(16,'independent tracking fixture'),binary(30,opaque),binary(30,opaque),binary(30,opaque),binary(777,opaque));
  const before=combine(make([...keep.slice(0,3),homeSection([card('full_width_square_image_layout')]),...keep.slice(3)]),outside),expected=combine(make(keep),outside),reports=[];
  const out=await handle({url:'https://youtubei.googleapis.com/youtubei/v1/browse',phase:'response',status:200,requestHeaders:{},responseHeaders:{},body:before,store:{read:()=>null,write:()=>true},report:r=>reports.push(r)},settings(true));
  assert.ok(out?.body,'1.2.3 missed the observed square image advertisement');
  assert.deepEqual(Buffer.from(out.body),Buffer.from(expected));assert.equal(homeContents(out.body,page).length,10);
  assert.equal(reports.length,1);assert.equal(reports[0].feedCards,11);assert.equal(reports[0].keyState,'missing');assert.equal(reports[0].reason,'modified');assert.equal(reports[0].removedParts,1);
  assert.deepEqual(reports[0].matchedAdTemplates,['full_width_square_image_layout']);
});
for(const [page,make]of pages)for(const deep of [false,true])test('confirmed display-ad family is removed from mixed '+page+' sections, deep='+deep,()=>{
  const keep=[card('video_lockup_with_attachment'),card('cell_divider')];
  const before=make([homeSection([keep[0],...displayAds.map(card),keep[1]])]),expected=make([homeSection(keep)]);
  const out=editBinary(before,'browse',settings(deep));assert.deepEqual(Buffer.from(out),Buffer.from(expected));
  assert.deepEqual(Buffer.from(editBinary(out,'browse',settings(deep))),Buffer.from(out));
});
test('nested image advertisement is removed while its ordinary parent, sibling and opaque properties survive exactly',()=>{
  const normal=node('video_lockup_with_attachment'),before=homeFirstPage([homeSection([renderer(node('feed_row',[node('full_width_square_image_layout'),normal]))])]);
  const expected=homeFirstPage([homeSection([renderer(node('feed_row',[normal]))])]);
  assert.deepEqual(Buffer.from(editBinary(before,'browse',settings(false))),Buffer.from(expected));
});
test('JSON display advertisements are filtered only in feed cards, preserving the global template catalog',()=>{
  const item=uri=>({elementRenderer:{newElement:{type:{componentType:{templateConfig:{uriTemplateConfig:{uri:uri+'.eml-fe|independent-fixture'}}}}}}});
  const ordinary=[item('video_lockup_with_attachment'),item('cell_divider')],ads=displayAds.map(item),doc={contents:{items:[ordinary[0],...ads,ordinary[1]]},frameworkUpdates:{resources:ads}};
  editJson(doc,settings(true));assert.deepEqual(doc.contents.items,ordinary);assert.deepEqual(doc.frameworkUpdates.resources,ads);
});
test('disabling ad removal preserves the whole display-ad family and unknown data byte for byte',()=>{
  const before=homeFirstPage([homeSection([...displayAds.map(card),card('video_lockup_with_attachment')])]);
  assert.deepEqual(Buffer.from(editBinary(before,'browse',new Settings({REMOVE_ADS:false,TRANSLATE_CAPTIONS:false,DEEP_FILTER:true}))),Buffer.from(before));
});
test('image words, titles, prefixes, community posts, shopping content and non-feed resources do not become display advertisements',()=>{
  const names=['video_lockup_with_attachment','cell_divider','image_post','post_shelf','product_carousel','shopping_carousel','full_width_square_image_layout_tutorial','custom_full_width_square_image_layout'];
  const ordinary=combine(card('video_lockup_with_attachment'),string(55,displayAds.join(' ')));
  const before=combine(homeFirstPage([homeSection([ordinary,...names.map(card)])]),binary(499,card('full_width_square_image_layout')),binary(777,binary(499,card('carousel_headered_layout'))));
  assert.deepEqual(Buffer.from(editBinary(before,'browse',settings(true))),Buffer.from(before));
});
