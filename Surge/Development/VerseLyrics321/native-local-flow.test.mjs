import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fixture,host,words,answers,KEY} from './lyric-startup-fixture.mjs';
import {parseDocument} from './core/spotify-lyrics.js';
const root=fileURLToPath(new URL('.',import.meta.url));
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX'])for(const format of ['json','protobuf'])for(const mode of ['english-cached','missing-cached','english-cold','missing-cold'])test(`${client} ${format}: same-turn 72 ${mode} responses retain only actual network work`,async()=>{
  const f=fixture(mode,format,true),x=host(root,client,f);
  for(let i=0;i<72;i++)x.invoke();
  const cached=mode.endsWith('cached');
  assert.equal(x.live,cached?0:1);assert.equal(x.peak,cached?1:2);assert.equal(x.synchronous,cached?72:71);
  assert.equal(x.active,cached?0:1);assert.equal(x.calls,cached?0:1);assert.equal(x.timers,client==='QuantumultX'&&!cached?1:0);
  await x.drain();assert.equal(x.done,72);assert.equal(x.peakHTTP,cached?0:1);
  const completed=x.outputs.at(-1),doc=parseDocument(completed,f.type);assert.deepEqual(doc.words,words);assert.equal(doc.unsynced,false);
  for(const answer of answers)assert.ok(completed.includes(Buffer.from(answer)));
  const calls=x.calls;x.invoke();assert.equal(x.live,0);assert.equal(x.calls,calls);assert.deepEqual(x.outputs.at(-1),completed);assert.ok(f.store.get(KEY).length<=64000);
});
for(const client of ['Surge','Shadowrocket','QuantumultX'])test(client+': request-only header hook finishes in the same evaluation',()=>{
 const qx=client==='QuantumultX';let done=0;
 new vm.Script(readFileSync(root+'/runtime/'+client+'/script/SpotifyLyrics.Request.js','utf8')).runInNewContext({$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001',headers:{}},$argument:{},$environment:{variables:{}},$done:r=>{done++;assert.equal(r.headers['Cache-Control'],'no-cache');}});
 assert.equal(done,1);
});
