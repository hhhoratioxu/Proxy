import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {invoke,meta,colors} from './feature-host.mjs';
import {encodeDocument,parseDocument,loadCache,existingPalette} from './core/spotify-lyrics.js';
if(process.argv[2]!=='child'){
 const results=[];
 for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const format of ['json','protobuf'])for(const mode of ['standard','compact']){
  const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',client,format,mode],{encoding:'utf8',timeout:60000,maxBuffer:8192});if(r.status!==0)throw Error(client+' '+format+' '+mode+': '+r.stderr);results.push({client,format,mode,...JSON.parse(r.stdout)});
 }
 for(const format of ['json','protobuf'])if(new Set(results.filter(r=>r.format===format).map(r=>r.outputSHA256)).size!==1)throw Error('native output differs '+format);
 const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'120 synthetic song IDs per client/representation/cache mode. Twenty fresh 32 MiB old-space processes. Each song alternates real mixed-fragment translation and no-op fragments, with 24 official timed rows and stale 3.1.1 identity/conversion pairs. Immediately reopen every song from cache with zero HTTP. Fresh native VM per response; Egern async module completion. Zero-latency HTTP mocks, GC every six songs. Samples include harness/VM/code caches and are not iPhone native buffers, every allocation or VPN acceptance.',results};writeFileSync('mixed-native-churn-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else{
 const client=process.argv[3],format=process.argv[4],mode=process.argv[5],store=new Map(),type=format==='json'?'application/json':'application/x-protobuf',digest=createHash('sha256'),env={MEMORY_MODE:mode};
 let httpCalls=0,peak=0,maxCacheCharacters=0,maxCacheEntries=0,active=0,maxActive=0,completions=0,translatedSongs=0;
 const sample=()=>peak=Math.max(peak,process.memoryUsage().heapUsed);global.gc();const before=process.memoryUsage().heapUsed,start=performance.now();
 for(let i=1;i<=120;i++){
  const track=String(i).padStart(22,'0'),noOp=i%3===0,words=Array.from({length:24},(_,j)=>noOp?'我愛你 WJK，第'+j+'句':'請說：hello，還有 goodbye！第'+j+'句'),body=encodeDocument({lyrics:{syncType:'LINE_SYNCED',language:'zh',provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,j)=>({words,startTimeMs:String(j*2000+1000)})),alternatives:[]},colors},format);
  const ctx={env,storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)}},cache=loadCache(ctx);cache.put('meta:'+track,{...meta,id:track});cache.put('palette:v1:'+track,{colors});cache.put('translations:v1:zh-CN:'+track,{pairs:words.map((s,j)=>[s,j%2?s:s.replace('請','请').replace('還','还').replace('愛','爱')])});cache.save();
  const network=async u=>{const q=new URL(u).searchParams.getAll('q');if(q.length!==1||q.some(s=>/\p{Script=Han}/u.test(s)))throw Error('query expansion or Chinese conversion');return {body:JSON.stringify(q.map(s=>[s.replaceAll('hello','你好').replaceAll('goodbye','再见'),'en']))};};
  const options={...(process.argv[6]?{root:process.argv[6]}:{}),format,store,track,env,status:200,responseBody:body,network,onSample:sample},out=await invoke(client,options),doc=parseDocument(out.bytes,type);
  if(JSON.stringify(doc.words)!==JSON.stringify(words)||JSON.stringify(existingPalette(out.bytes,doc))!==JSON.stringify(colors)||doc.hasAlternatives===noOp)throw Error('original or translation changed');
  if(!noOp&&!out.bytes.includes(Buffer.from('請說：你好，還有 再见！')))throw Error('lost mixed translation');if(!noOp)translatedSongs++;
  const warm=await invoke(client,{...options,network:async()=>{throw Error('warm reopen must not fetch');}});if(warm.calls.length||!warm.bytes.equals(out.bytes))throw Error('cache mismatch');
  digest.update(out.bytes);httpCalls+=out.calls.length;active+=out.active+warm.active;maxActive=Math.max(maxActive,out.maxActive,warm.maxActive);completions+=out.done+warm.done;
  const raw=store.get('VerseLyrics.v1.cache'),saved=JSON.parse(raw);maxCacheCharacters=Math.max(maxCacheCharacters,raw.length);maxCacheEntries=Math.max(maxCacheEntries,saved.entries.length);if(raw.length>(mode==='compact'?32000:64000)||saved.entries.length>(mode==='compact'?64:128))throw Error('cache overflow');sample();if(i%6===0){await new Promise(setImmediate);global.gc();}
 }
 if(httpCalls!==120||active!==0||maxActive!==1||completions!==240||translatedSongs!==80)throw Error('unfinished work or repeated HTTP');global.gc();console.log(JSON.stringify({songChanges:120,translatedSongs,noOpSongs:40,lyricResponses:240,httpCalls,warmHTTP:0,maxActiveHTTP:maxActive,activeHTTP:active,completedResponses:completions,maxCacheCharacters,maxCacheEntries,elapsedMs:performance.now()-start,baselineHeapBytes:before,sampledMaxHeapBytes:peak,retainedHeapBytes:process.memoryUsage().heapUsed,outputSHA256:digest.digest('hex')}));
}
