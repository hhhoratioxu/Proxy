import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const code=readFileSync(new URL('./runtime/SpotifyLyrics.Request.js',import.meta.url),'utf8');
const id='76XUZSb13QUuj1HECY4Hvo';
const url='https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id+'/image/ab67616d0000b273example?format=json&vocalRemoval=false';
const original={Authorization:'Bearer test-only-secret',Cookie:'test-only-cookie',Origin:'https://xpui.app.spotify.com',Accept:'application/json','If-None-Match':'test-etag','Accept-Encoding':'gzip, br'};
function request({method='GET',target=url,headers=original,args={},response}={}){
  const done=[];const input={...headers};
  const context={$request:{url:target,method,headers:input},$argument:args,$done:v=>done.push(v)};
  if(response)context.$response=response;
  vm.runInNewContext(code,context,{timeout:1000});
  assert.equal(done.length,1);assert.deepEqual(input,headers);
  return JSON.parse(JSON.stringify(done[0]));
}
test('desktop JSON format and auth/origin/cookies are retained in flight only',()=>{
  const h=request().headers;for(const key of ['Authorization','Cookie','Origin','Accept']) assert.equal(h[key],original[key]);
  assert.equal(h['If-None-Match'],undefined);assert.equal(h['Accept-Encoding'],'identity');assert.equal(h['Cache-Control'],'no-cache');
});
for(const method of ['OPTIONS','HEAD','DELETE','PATCH',''])test(method+' passes without header mutation or async work',()=>assert.deepEqual(request({method}),{}));
test('internal lyric fetch is not recursively rewritten',()=>assert.deepEqual(request({headers:{...original,'X-VerseLyrics-Internal':'1'}}),{}));
test('translation and fallback off preserve native cache behavior',()=>assert.deepEqual(request({args:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:'off'}}),{}));
test('invalid settings fail open',()=>assert.deepEqual(request({args:{TARGET_LANGUAGE:'invalid-test-language'}}),{}));
test('unknown domain passes',()=>assert.deepEqual(request({target:'https://example.com/color-lyrics/v2/track/'+id}),{}));
test('regional spclient and explicit :443 accepted',()=>assert.ok(request({target:url.replace('spclient.wg.spotify.com','gew1-spclient.spotify.com:443')}).headers));
test('response invocation cannot mutate request',()=>assert.deepEqual(request({response:{status:200}}),{}));
test('metadata entry request retains protobuf representation',()=>{
  const h=request({method:'POST',target:'https://spclient.wg.spotify.com/extended-metadata/v0/extended-metadata',headers:{...original,Accept:'application/x-protobuf'}}).headers;
  assert.equal(h.Accept,'application/x-protobuf');assert.equal(h.Authorization,original.Authorization);
});
test('discovery off preserves metadata request',()=>assert.deepEqual(request({method:'POST',target:'https://spclient.wg.spotify.com/extended-metadata/v0/extended-metadata',args:{DISCOVER_MISSING:false}}),{}));
test('actual response runtimes equal the published 3.2.2 bytes',()=>{
  for(const name of ['SpotifyLyrics.js','SpotifyLyrics.Entry.js']) assert.deepEqual(readFileSync(new URL('./runtime/'+name,import.meta.url)),execFileSync('git',['show','10049053ce86bd992e3ebb6511ffb28312ba86fb:Loon/script/'+name]));
});
test('manifest matches every actual install artifact',()=>{
  const manifest=JSON.parse(readFileSync(new URL('./build-manifest.json',import.meta.url),'utf8'));
  for(const item of manifest.artifacts){const bytes=readFileSync(new URL('./'+item.file,import.meta.url));assert.equal(bytes.length,item.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);}
});
test('Mac profile keeps all normal defaults, no Rewrite and bounded native scripts',()=>{
  const candidate=readFileSync(new URL('./Mac.lpx',import.meta.url),'utf8');
  const formal=execFileSync('git',['show','10049053ce86bd992e3ebb6511ffb28312ba86fb:Loon/script/SpotifyLyrics.lpx'],{encoding:'utf8'});
  const section=s=>s.match(/\[Argument\]([^]*?)(?=\[)/)[1].trim();assert.equal(section(candidate),section(formal));
  assert.ok(!candidate.includes('[Rewrite]'));assert.equal(candidate.split('\n').filter(s=>s.startsWith('response if ')).length,2);
  for(const line of candidate.split('\n').filter(s=>/^(request|response) if /.test(s))){assert.ok(line.includes('${url} ~= /^https:'));assert.ok(line.includes('${request.method} == "GET"'));assert.ok(!line.includes('"OPTIONS"'));}
  assert.match(candidate,/timeout=12, requires_body=true, binary_body_mode=true/);assert.match(candidate,/timeout=3, requires_body=true, binary_body_mode=true/);
});
