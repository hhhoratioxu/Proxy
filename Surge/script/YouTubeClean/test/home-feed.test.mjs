import test from 'node:test';
import assert from 'node:assert/strict';
import {Settings} from '../src/data.mjs';
import {editBinary} from '../src/edit.mjs';
import {handle} from '../src/runtime.mjs';
import {combine,binary,inspect,at,all,homeVideoCard as normal,homeAdCard as advertisement,homeSection as section,homeFirstPage as first,homeContinuationPage as continuation,homeListFrom as listFrom,homeContents as contentsFrom} from './fixtures.mjs';

// Paths observed in anonymous native iOS browse responses on 2026-10-17.
// The advertising payload is self-written; no visitor/tracking captures are committed.
const s=new Settings({TRANSLATE_CAPTIONS:false});
for(const [kind,make]of [['first',first],['continuation',continuation]]){
  test('native home '+kind+' removes an entire ad-only section and keeps adjacent cards and pagination byte-identical',()=>{
    const keepA=section([normal('ordinary video whose title mentions ads')]),keepB=section([normal('ordinary Shorts')]);
    const before=make([keepA,section([advertisement()]),keepB]),after=editBinary(before,'browse',s);
    assert.deepEqual(contentsFrom(after,kind).map(Buffer.from),[keepA,keepB].map(Buffer.from));
    assert.deepEqual(Buffer.from(at(listFrom(after,kind),2)),Buffer.from(at(listFrom(before,kind),2)));
    assert.deepEqual(inspect(after).filter(f=>![9,10].includes(f.id)).map(f=>f.raw),inspect(before).filter(f=>![9,10].includes(f.id)).map(f=>f.raw));
  });
  test('native home '+kind+' retains ordinary children of a mixed section',()=>{
    const keep=normal('keep mixed ordinary card'),before=make([section([advertisement(),keep])]),after=editBinary(before,'browse',s);
    const contents=all(at(contentsFrom(after,kind)[0],50195462),1);
    assert.deepEqual(contents.map(Buffer.from),[Buffer.from(keep)]);
  });
  test('native home '+kind+' ad-removal switch off keeps every original byte',()=>{
    const body=make([section([advertisement(),normal('normal')])]);
    assert.deepEqual(Buffer.from(editBinary(body,'browse',new Settings({REMOVE_ADS:false,TRANSLATE_CAPTIONS:false}))),body);
  });
}
test('unrelated malformed known sibling cannot cancel removal in the valid homepage feed',()=>{
  const raw=combine(first([section([advertisement()]),section([normal('keep')])]),binary(44,binary(49399797,new Uint8Array([0]))));
  const out=editBinary(raw,'browse',s);assert.equal(contentsFrom(out,'first').length,1);
  assert.deepEqual(Buffer.from(at(out,44)),Buffer.from(at(raw,44)));
});
test('homepage requests invalidate only HTTP cache validators when ad removal is enabled',async()=>{
  const request={phase:'request',url:'https://youtubei.googleapis.com/youtubei/v1/browse?prettyPrint=false',requestHeaders:{'If-None-Match':'old','If-Modified-Since':'old',Authorization:'private-test-fixture','User-Agent':'fixture'}};
  const result=await handle(request,s);assert.equal(result.headers['If-None-Match'],undefined);assert.equal(result.headers['If-Modified-Since'],undefined);assert.equal(result.headers['Cache-Control'],'no-cache');assert.equal(result.headers.Authorization,'private-test-fixture');
  assert.equal(await handle(request,new Settings({REMOVE_ADS:false,TRANSLATE_CAPTIONS:false})),null);
});
