import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const scenarios=['english','simplified','traditional','japanese'];
const median=a=>[...a].sort((a,b)=>a-b)[a.length>>1];
if(process.argv[2]!=='child'){
 const baseline=process.argv[2];if(!baseline)throw Error('Pass 0.4.16 core path');const runs=[];
 for(let trial=0;trial<12;trial++)for(const scenario of scenarios){
  const versions=[['0.4.16',baseline],['0.5.0',fileURLToPath(new URL('./core/spotify-lyrics.js',import.meta.url))]];if(trial%2)versions.reverse();
  for(const [version,path] of versions){const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',path,scenario],{encoding:'utf8',timeout:15000,maxBuffer:8192});if(r.status!==0)throw Error(r.stderr);runs.push({trial,version,scenario,...JSON.parse(r.stdout)});}
 }
 const comparisons=scenarios.map(s=>{const rows=runs.filter(x=>x.scenario===s);if(new Set(rows.map(x=>x.outputSHA256)).size!==1)throw Error('Selection changed '+s);return{scenario:s,...Object.fromEntries(['0.4.16','0.5.0'].map(v=>{const r=rows.filter(x=>x.version===v);return[v,{coldMs:median(r.map(x=>x.coldMs)),coldHeapGrowth:median(r.map(x=>x.coldHeapGrowth)),repeated100Ms:median(r.map(x=>x.repeated100Ms))}];}))};});
 const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'20 synthetic lyric catalog candidates, exact full title/artist/album/duration checks. Twelve fresh-process trials per version/language, 32 MiB old-space. Cold measurement starts after module import and fixture creation/GC; repeat loop checks 100 selections. Isolates source matching, not a native app, network latency or VPN peak. Every selection hash matches the baseline.',comparisons,runs};writeFileSync(new URL('./matching-memory-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(comparisons));
}else{
 const m=await import(pathToFileURL(process.argv[3])),s=process.argv[4];
 const names={english:['Original Lantern','Quiet Sea','Original Artist'],simplified:['原创的纸灯','风与海','乐手王一'],traditional:['原創的紙燈','風與海','樂手王一'],japanese:['海の灯り','静かな海','オリジナル歌手']};
 const [title,album,artist]=names[s],meta={title,album,artists:[artist],duration:180},records=Array.from({length:20},(_,i)=>({id:i,title,album,artists:[i===17?artist:artist+' '+i],duration:180}));
 global.gc();const before=process.memoryUsage().heapUsed,start=performance.now();const first=m.sourceCandidates(meta,records,x=>x);const coldMs=performance.now()-start,coldHeapGrowth=process.memoryUsage().heapUsed-before;
 if(first.length!==1||first[0].id!==17)throw Error('Match');const digest=createHash('sha256').update(JSON.stringify(first));
 const again=performance.now();for(let i=0;i<100;i++){const r=m.sourceCandidates(meta,records,x=>x);if(r.length!==1||r[0].id!==17)throw Error('Repeated match');digest.update(JSON.stringify(r));}
 console.log(JSON.stringify({coldMs:+coldMs.toFixed(4),coldHeapGrowth,repeated100Ms:+(performance.now()-again).toFixed(4),outputSHA256:digest.digest('hex')}));
}
