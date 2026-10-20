import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {invoke,sourceFixture,seedStore,colors} from './feature-host.mjs';
import {encodeDocument,parseDocument} from './core/spotify-lyrics.js';
const clients=['Loon','Surge','Shadowrocket','QuantumultX','Egern'],results=[];
const official=(format,words,sync='UNSYNCED')=>encodeDocument({lyrics:{syncType:sync,language:'en',provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,i)=>({words,startTimeMs:sync==='UNSYNCED'?'0':String(i*2000+1000)})),alternatives:[{language:'zh-CN',lines:words.map(()=> 'OFFICIAL_TRANSLATION')}]},colors},format);
const source=async u=>({body:JSON.stringify(sourceFixture('netease',u,{lines:8}))});
for(const client of clients)for(const format of ['json','protobuf']) {
  const type=format==='json'?'application/json':'application/x-protobuf',words=['Original lantern 0.','Original lantern 1.'],body=official(format,words);
  const on=await invoke(client,{format,status:200,responseBody:body,network:source});assert.equal(parseDocument(on.bytes,type).unsynced,false);
  const off=await invoke(client,{format,status:200,responseBody:body,env:{REPLACE_UNSYNCED:false},network:async u=>{assert.ok(u.includes('translate.googleapis'));return{body:JSON.stringify(new URL(u).searchParams.getAll('q').map(()=> '有意义的译文'))};}});assert.deepEqual(parseDocument(off.bytes,type).words,words);assert.equal(parseDocument(off.bytes,type).unsynced,true);
  const missing=await invoke(client,{format,env:{REPLACE_UNSYNCED:false},network:source});assert.equal(parseDocument(missing.bytes,type).unsynced,false);
  const fillers=Array.from({length:600},(_,i)=>['Oh-oh!','Ooooh','Ah, ah','Hmm…','我想你 oh'][i%5]),filler=await invoke(client,{format,status:200,responseBody:official(format,fillers,'LINE_SYNCED'),network:()=>{throw Error('No filler request');}});assert.deepEqual(parseDocument(filler.bytes,type).words,fillers);assert.equal(parseDocument(filler.bytes,type).hasAlternatives,false);
  const mixedWords=['我想你 oh','我想你 oh，在等你 I miss you','纸灯 ooh / 海岸 stay with me'],mixedBody=official(format,mixedWords,'LINE_SYNCED'),store=seedStore();
  const mixed=await invoke(client,{format,store,status:200,responseBody:mixedBody,network:async u=>{const q=new URL(u).searchParams.getAll('q');assert.deepEqual(q,['I miss you','stay with me']);return{body:JSON.stringify(['我想你','陪着我'])};}});
  assert.ok(mixed.bytes.includes(Buffer.from('我想你 oh，在等你 我想你')));
  const warm=await invoke(client,{format,store,status:200,responseBody:mixedBody,network:()=>{throw Error('Warm mixed cache');}});assert.deepEqual(warm.bytes,mixed.bytes);
  for(const out of [on,off,missing,filler,mixed,warm]){assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);const raw=out.store.get('VerseLyrics.v1.cache');assert.ok(!raw||raw.length<=64000);assert.ok(!raw||JSON.parse(raw).entries.length<=128);if(client==='Loon')assert.equal(out.timers.length,0);}
  results.push({client,format,http:{staticOn:on.calls.length,staticOffTranslationsOnly:off.calls.length,missingWithStaticOff:missing.calls.length,filler600:filler.calls.length,mixed:mixed.calls.length,warmMixed:warm.calls.length},mixedQueries:2,completionOnce:true,maxActiveHTTP:Math.max(...[on,off,missing,filler,mixed,warm].map(x=>x.maxActive))});
}
const runtime=JSON.parse(readFileSync(new URL('./runtime-manifest.json',import.meta.url))),sha256={};
for(const row of runtime){const bytes=readFileSync(new URL('./runtime/'+row.path,import.meta.url)),sha=createHash('sha256').update(bytes).digest('hex');assert.equal(sha,row.sha256);sha256[row.path]=sha;}
const report={version:'3.1.7',adapter:15,scope:'Compiled native host mocks with deterministic service fixtures; not iPhone peak memory or VPN acceptance.',invocations:results.length*6,results,runtimeSHA256:sha256};
writeFileSync(new URL('./feature-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({version:report.version,nativeConfigurations:results.length,invocations:report.invocations,fillerHTTP:results.reduce((n,x)=>n+x.http.filler600,0),warmMixedHTTP:results.reduce((n,x)=>n+x.http.warmMixed,0),maxActiveHTTP:Math.max(...results.map(x=>x.maxActiveHTTP))}));
