import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {invoke,sourceFixture,meta,colors} from './feature-host.mjs';
import {encodeDocument,parseDocument,loadCache,existingPalette} from './core/spotify-lyrics.js';
if(process.argv[2]!=='child'){
 const results=[];
 for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const format of ['json','protobuf'])for(const mode of ['standard','compact']){
  const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',client,format,mode],{encoding:'utf8',timeout:60000,maxBuffer:8192});if(r.status!==0)throw Error(client+' '+format+' '+mode+': '+r.stderr);
  results.push({client,format,mode,...JSON.parse(r.stdout)});
 }
 for(const format of ['json','protobuf'])if(new Set(results.filter(r=>r.format===format).map(r=>r.outputSHA256)).size!==1)throw Error('native output differs '+format);
 const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'120 different synthetic static official song IDs per client/representation/cache mode. Each response runs a fresh compiled native script/VM (Egern uses its async native module), obtains 24 timed rows and same-response provider translations, and is immediately reopened from cache with no extra HTTP. Metadata and palette are staged in the bounded store, not reset between songs. Twenty separate 32 MiB old-space processes, native HTTP mocks with zero latency, GC every six songs. Samples include harness/VM/code caches and are not every allocation, iPhone host buffers or VPN acceptance.',results};
 writeFileSync(new URL('./policy-native-churn-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else{
 const client=process.argv[3],format=process.argv[4],mode=process.argv[5],store=new Map(),type=format==='json'?'application/json':'application/x-protobuf';
 const original=encodeDocument({lyrics:{syncType:'UNSYNCED',language:'en',provider:'Spotify',providerDisplayName:'Spotify',lines:Array.from({length:24},(_,i)=>({words:'Original paper lantern '+i+'.',startTimeMs:'0'})),alternatives:[]},colors},format);
 const digest=createHash('sha256'),env={MEMORY_MODE:mode},network=async u=>({body:JSON.stringify(sourceFixture('netease',u,{lines:24}))});
 let httpCalls=0,peak=0,cacheCharacters=0,cacheEntries=0,active=0,maxActive=0,completions=0;
 const sample=()=>peak=Math.max(peak,process.memoryUsage().heapUsed);global.gc();const before=process.memoryUsage().heapUsed,start=performance.now();
 for(let i=1;i<=120;i++){
  const track=String(i).padStart(22,'0'),ctx={env,storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)}},cache=loadCache(ctx);
  cache.put('meta:'+track,{...meta,id:track});cache.put('palette:v1:'+track,{colors});cache.save();
  const options={format,store,track,env,status:200,responseBody:original,network,onSample:sample},out=await invoke(client,options);
  const doc=parseDocument(out.bytes,type);if(doc.unsynced||doc.words.length!==24||!out.bytes.includes(Buffer.from('第23句译文'))||JSON.stringify(existingPalette(out.bytes,doc))!==JSON.stringify(colors))throw Error('lost timed content');
  const warm=await invoke(client,{...options,network:async()=>{throw Error('cached reopen must not fetch');}});if(warm.calls.length||!warm.bytes.equals(out.bytes))throw Error('cache mismatch');
  digest.update(out.bytes);httpCalls+=out.calls.length;active+=out.active+warm.active;maxActive=Math.max(maxActive,out.maxActive,warm.maxActive);completions+=out.done+warm.done;
  const raw=store.get('VerseLyrics.v1.cache'),saved=JSON.parse(raw);cacheCharacters=Math.max(cacheCharacters,raw.length);cacheEntries=Math.max(cacheEntries,saved.entries.length);
  if(raw.length>(mode==='compact'?32000:64000)||saved.entries.length>(mode==='compact'?64:128))throw Error('cache overflow');sample();if(i%6===0){await new Promise(setImmediate);global.gc();}
 }
 if(httpCalls!==240||active!==0||maxActive!==1||completions!==240)throw Error('unfinished work or repeated HTTP');global.gc();
 console.log(JSON.stringify({songChanges:120,lyricResponses:240,httpCalls,maxActiveHTTP:maxActive,activeHTTP:active,completedResponses:completions,maxCacheCharacters:cacheCharacters,maxCacheEntries:cacheEntries,elapsedMs:performance.now()-start,baselineHeapBytes:before,sampledMaxHeapBytes:peak,retainedHeapBytes:process.memoryUsage().heapUsed,outputSHA256:digest.digest('hex')}));
}
