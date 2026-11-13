import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const code=readFileSync(new URL('./observe.js',import.meta.url),'utf8');
function run({url='https://spclient.wg.spotify.com/track-playback/v1/state?token=SECRET',body,format='application/json',failure=false}={}){
  const calls=[],done=[];
  const ctx={$request:{url,method:'GET',headers:{Authorization:'Bearer SECRET',Cookie:'SECRET'}},$done:r=>done.push(r),Uint8Array,
    $httpClient:{post:(r,cb)=>{calls.push(r);if(failure)throw Error('local service unavailable');cb(null,{status:204},'');cb('duplicate');}}};
  if(body!==undefined)ctx.$response={status:200,headers:{'Content-Type':format,'Set-Cookie':'SECRET'},body};
  vm.runInNewContext(code,ctx,{timeout:1000});
  assert.equal(done.length,1);assert.equal(JSON.stringify(done[0]),'{}');
  for(const c of calls){assert.equal(c.url,'http://127.0.0.1:18765/events');assert.equal(c.timeout,300);assert.equal(c['auto-cookie'],false);assert.equal(c['auto-redirect'],false);assert.equal(c.insecure,false);assert.ok(!JSON.stringify(c).includes('SECRET'));}
  return calls.map(c=>JSON.parse(c.body));
}
test('request route excludes query, token, cookies and authorization',()=>{assert.equal(run()[0].route,'/track-playback/v1/state');});
test('other hosts never observed',()=>{assert.deepEqual(run({url:'https://example.com/a'}),[]);});
test('binary identifiers are redacted',()=>{assert.equal(run({url:'https://spclient.wg.spotify.com/metadata/4/track/'+'a'.repeat(32)})[0].route,'/metadata/4/track/:id');});
test('user and device path values are redacted',()=>{assert.equal(run({url:'https://spclient.wg.spotify.com/users/private-name/profile/private-id'})[0].route,'/users/:id/profile/:id');});
test('track identifiers are redacted while endpoint names remain useful',()=>{assert.equal(run({url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo'})[0].route,'/color-lyrics/v2/track/:id');});
test('availability only; no lyrics, user data or arbitrary values',()=>{
  const body=JSON.stringify({data:{track:{metadata:{has_lyrics:'false'},hasLyrics:true,lyrics:'SECRET',account:{name:'SECRET'}}}});
  assert.deepEqual(run({body})[0].flags,[{path:'data.track.metadata.has_lyrics',value:'false'},{path:'data.track.hasLyrics',value:true}]);
});
test('binary JSON same result and immutable',()=>{const b=new Uint8Array(Buffer.from('{"hasLyrics":false,"words":"SECRET"}'));const before=b.slice();assert.equal(run({body:b})[0].flags[0].value,false);assert.deepEqual(b,before);});
test('oversize bodies are never parsed',()=>{assert.equal(run({body:'x'.repeat(131073)})[0].flags,undefined);});
test('malformed JSON preserves original response',()=>{assert.deepEqual(run({body:'{broken'}),[]);});
test('local service failure completes original response once',()=>{run({failure:true});});
test('nonboolean availability omitted',()=>{assert.deepEqual(run({body:'{"hasLyrics":"SECRET"}'})[0].flags,[]);});
test('binary payload only reports length and format',()=>{const e=run({body:new Uint8Array([255,0,20]),format:'application/x-protobuf'})[0];assert.equal(e.format,'binary');assert.equal(e.bytes,3);assert.equal(e.flags,undefined);});
test('diagnostic does not take normal production response routes',()=>{
  const plugin=readFileSync(new URL('./Observe.lpx',import.meta.url),'utf8');
  const line=plugin.split('\n').find(s=>s.startsWith('response if'));
  const pattern=line.match(/~= (\/.*?\/) &&/)[1];const re=vm.runInNewContext(pattern);
  for(const path of ['color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo','metadata/4/track/abcdef','extended-metadata/v0/extended-metadata','context-resolve/v1/spotify:track:foo','connect-state/v1/devices/device','bootstrap/v1/bootstrap']) assert.ok(!re.test('https://spclient.wg.spotify.com/'+path));
  assert.ok(re.test('https://spclient.wg.spotify.com/track-playback/v1/state'));
});
