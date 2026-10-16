import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {invoke,sourceFixture,here,seedStore} from './feature-host.mjs';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
if(process.argv[2]!=='child'){
 const baseline=process.argv[2];if(!baseline)throw Error('Pass released 0.5.1 workspace');const runs=[];
 for(let trial=0;trial<6;trial++)for(const count of [48,120])for(const partial of [false,true]){
  const roots=trial%2?[here,baseline]:[baseline,here];
  for(const root of roots){
   const p=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',root,String(count),String(partial)],{encoding:'utf8',timeout:15000,maxBuffer:8192});
   if(p.status!==0)throw Error(p.stderr);runs.push({trial,count,partial,...JSON.parse(p.stdout)});
  }
 }
 const comparisons=[];
 for(const count of [48,120])for(const partial of [false,true]){
  const rows=runs.filter(r=>r.count===count&&r.partial===partial);if(new Set(rows.map(r=>r.sha256)).size!==1)throw Error('Native output changed');
  comparisons.push({count,partial,...Object.fromEntries(['0.5.1','0.5.2'].map(v=>{const x=rows.filter(r=>r.version===v);return[v,{medianMs:median(x.map(r=>r.ms)),medianSampledHeapGrowth:median(x.map(r=>r.heapGrowth)),httpCalls:x[0].calls,translationRows:x[0].translationRows,warmCalls:x[0].warmCalls}];}))});
 }
 const report={at:new Date().toISOString(),scope:'Six fresh 32 MiB old-space Node processes per version/scenario. Each compiles a fresh Loon native hook with empty lyric/translation cache and seeded metadata/palette. Same synthetic NetEase response and translator output in both versions, fixed 120 ms mock latency per HTTP. Samples at native invocation, HTTP and completion boundaries; not iPhone memory or real provider latency. Full native Protobuf output hashes must match; a warm revisit must make no HTTP.',environment:process.version+' '+process.platform+' '+process.arch,comparisons,runs};
 writeFileSync(new URL('./source-translation-bench-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(comparisons));
}else{
 const root=process.argv[3],count=Number(process.argv[4]),partial=process.argv[5]==='true',store=seedStore();let peak=0,translationRows=0;
 const network=async u=>{if(u.includes('translate.googleapis'))translationRows+=new URL(u).searchParams.getAll('q').length;await new Promise(r=>setTimeout(r,120));return{body:JSON.stringify(sourceFixture('netease',u,{lines:count,partial}))};};
 global.gc();const before=process.memoryUsage().heapUsed,start=performance.now();
 const result=await invoke('Loon',{root,store,network,onSample:()=>{peak=Math.max(peak,process.memoryUsage().heapUsed);}}),ms=performance.now()-start;
 if(result.active!==0||result.done!==1||result.timers.length)throw Error('unfinished invocation');
 const warm=await invoke('Loon',{root,store,network});if(warm.calls.length||!result.bytes.equals(warm.bytes))throw Error('warm cache changed');
 console.log(JSON.stringify({version:JSON.parse(readFileSync(root+'/package.json')).version,ms:+ms.toFixed(3),heapGrowth:peak-before,calls:result.calls.length,translationRows,warmCalls:warm.calls.length,sha256:createHash('sha256').update(result.bytes).digest('hex')}));
}
