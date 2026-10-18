import test from 'node:test';
import assert from 'node:assert/strict';
import {Settings,route,VERSION} from '../src/data.mjs';
import {editBinary,editJson} from '../src/edit.mjs';
import {handle} from '../src/runtime.mjs';
import {templateName} from '../src/elements.mjs';
import {combine,binary,string,at,all,opaque,homeFirstPage,homeContinuationPage,homeSection,homeContents} from './fixtures.mjs';
const normal=new Settings({TRANSLATE_CAPTIONS:false,DEEP_FILTER:false}),strong=new Settings({TRANSLATE_CAPTIONS:false,DEEP_FILTER:true});
export function elementNode(name,children=[],model=null){
  const component=combine(binary(3,binary(172035250,string(1,name+'.eml-fe|self-written-fixture'))),...(model?[binary(5,model)]:[]),opaque);
  return combine(binary(1,binary(168777401,component)),...children.map(n=>binary(3,n)),opaque);
}
const renderer=node=>binary(153515154,combine(binary(172660663,node),opaque));
const card=name=>renderer(elementNode(name));
for(const [page,make]of [['first',homeFirstPage],['continuation',homeContinuationPage]])test('native '+page+' removes a new-element ad template and keeps ordinary card bytes',()=>{
  const keep=homeSection([card('video_with_context')]),body=make([homeSection([card('ads_video_with_context')]),keep]);
  const out=editBinary(body,'browse',normal);assert.deepEqual(homeContents(out,page).map(Buffer.from),[Buffer.from(keep)]);
});
test('known parent element retains its ordinary child and opaque properties when an advertising child is removed',()=>{
  const keep=elementNode('video_card'),node=elementNode('feed_row',[elementNode('ad_layout'),keep]),body=homeFirstPage([homeSection([renderer(node)])]);
  const out=editBinary(body,'browse',normal),r=at(at(homeContents(out,'first')[0],50195462),1),e=at(at(r,153515154),172660663);
  assert.deepEqual(all(e,3).map(Buffer.from),[Buffer.from(keep)]);assert.deepEqual(Buffer.from(at(e,499)),Buffer.from(at(node,499)));
});
test('ordinary title, signed URLs and arbitrary text mentioning ads do not identify a native advertisement',()=>{
  const body=homeFirstPage([homeSection([renderer(combine(elementNode('video_card'),string(55,'ads_video_with_context'),string(56,'https://example.test/ads?a=private-fixture')))])]);
  assert.deepEqual(Buffer.from(editBinary(body,'browse',strong)),body);
});
test('deep mode finds element ads inside a new feed-card wrapper; normal mode preserves that unknown wrapper',()=>{
  const unknown=binary(477777777,binary(1,card('ad_layout'))),body=homeFirstPage([homeSection([unknown]),homeSection([card('video_card')])]);
  assert.equal(homeContents(editBinary(body,'browse',normal),'first').length,2);assert.equal(homeContents(editBinary(body,'browse',strong),'first').length,1);
});
test('deep mode identifies the native advertising badge inside a component model',()=>{
  const model=binary(499999999,binary(1,binary(138592202,string(1,'Sponsored')))),body=homeFirstPage([homeSection([renderer(elementNode('video_lockup_with_attachment',[],model))])]);
  assert.equal(homeContents(editBinary(body,'browse',normal),'first').length,1);assert.equal(homeContents(editBinary(body,'browse',strong),'first').length,0);
});
test('deep promotion filtering is distinct from the elements profile',()=>{
  const body=homeFirstPage([homeSection([card('premium_upsell')]),homeSection([card('statement_banner')]),homeSection([card('video_card')])]);
  assert.equal(homeContents(editBinary(body,'browse',normal),'first').length,3);assert.equal(homeContents(editBinary(body,'browse',strong),'first').length,1);
});
test('ad removal off preserves native element and new-wrapper advertisements byte for byte',()=>{
  const body=homeFirstPage([homeSection([card('ads_video_with_context'),binary(477777777,card('ad_layout'))])]);
  assert.deepEqual(Buffer.from(editBinary(body,'browse',new Settings({REMOVE_ADS:false,TRANSLATE_CAPTIONS:false,DEEP_FILTER:true}))),body);
});
test('account/unknown response bytes and global template definitions are not deep-scanned as feed cards',()=>{
  const raw=combine(homeFirstPage([homeSection([card('video_card')])]),binary(499,card('ads_video_with_context')),binary(777,binary(499,card('ad_layout'))));
  assert.deepEqual(Buffer.from(editBinary(raw,'browse',strong)),raw);
});
test('native element edits are idempotent',()=>{
  const raw=homeFirstPage([homeSection([card('ad_layout')]),homeSection([card('video_card')])]),out=editBinary(raw,'browse',strong);
  assert.deepEqual(Buffer.from(editBinary(out,'browse',strong)),Buffer.from(out));
});
test('JSON element cards and nested element children are filtered without altering global resources',()=>{
  const jsonCard=name=>({elementRenderer:{newElement:{type:{componentType:{templateConfig:{uriTemplateConfig:{uri:name+'.eml-fe|fixture'}}}}}}});
  const catalog=jsonCard('ads_video_with_context'),doc={contents:{items:[jsonCard('ads_video_with_context'),jsonCard('video_card'),{unknownWrapper:{content:jsonCard('premium_upsell')}}]},frameworkUpdates:{resources:[catalog]}};
  editJson(doc,strong);assert.equal(doc.contents.items.length,1);assert.deepEqual(doc.frameworkUpdates.resources,[catalog]);
});
test('diagnostics contain only structural identifiers and never request tokens, titles, full URLs or account information',async()=>{
  const reports=[],body=homeFirstPage([homeSection([card('ads_video_with_context'),card('video_card')])]);
  const result=await handle({url:'https://youtubei.googleapis.com:443/youtubei/v1/browse?key=PRIVATE_KEY_FIXTURE',phase:'response',status:200,requestHeaders:{Authorization:'PRIVATE_AUTH_FIXTURE',Cookie:'PRIVATE_COOKIE_FIXTURE'},responseHeaders:{},body,report:r=>reports.push(r)},new Settings({TRANSLATE_CAPTIONS:false,DEEP_FILTER:true,DIAGNOSTICS:true,PROFILE:'tcp'}));
  assert.ok(result.body);assert.equal(reports.length,1);assert.equal(reports[0].version,VERSION);assert.equal(reports[0].profile,'tcp');assert.equal(reports[0].removedParts,1);
  const encoded=JSON.stringify(reports);assert.ok(!/PRIVATE_|https:|Cookie|Authorization/.test(encoded));assert.ok(encoded.includes('ads_video_with_context'));
});
test('diagnostic bypass is explicit for malformed native data and preserves the response',async()=>{
  const reports=[],result=await handle({url:'https://youtubei.googleapis.com/youtubei/v1/browse',phase:'response',status:200,requestHeaders:{},responseHeaders:{},body:new Uint8Array([0]),report:r=>reports.push(r)},new Settings({DIAGNOSTICS:true}));
  assert.equal(result,null);assert.equal(reports[0].bypass,true);assert.equal(reports[0].removedParts,0);
});
test('template IDs normalize camel-case and reject URL-shaped or overlong identifiers',()=>{
  assert.equal(templateName('promotedSparkles.eml-fe|hash'),'promoted_sparkles');assert.equal(templateName('https://example.test/ad.eml'),'');assert.equal(templateName('x'.repeat(300)),'');
});
test('explicit HTTPS port is supported, non-HTTPS and arbitrary ports remain excluded',()=>{
  assert.equal(route('https://youtubei.googleapis.com:443/youtubei/v1/browse').name,'browse');assert.equal(route('https://youtubei.googleapis.com:444/youtubei/v1/browse'),null);assert.equal(route('http://youtubei.googleapis.com:443/youtubei/v1/browse'),null);
});
test('protocol-declared promoted banner, legacy promoted text and companion cards are removed as complete feed cards',()=>{
  // Identifiers are independently declared in the MIT protocol reference.
  const ids=[93065129,137341759,137341794,150805198,150805689,55514441];
  const keep=homeSection([card('video_card')]),body=homeFirstPage([...ids.map(id=>homeSection([binary(id,string(999,'self-written ad data'))])),keep]);
  assert.deepEqual(homeContents(editBinary(body,'browse',normal),'first').map(Buffer.from),[Buffer.from(keep)]);
});
