import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
const baseline=process.argv[2],root=fileURLToPath(new URL('.',import.meta.url)),runs=[];
if(!baseline)throw Error('Pass unchanged 3.1.4 stage');
const median=xs=>[...xs].sort((a,b)=>a-b)[xs.length>>1];
for(let trial=0;trial<5;trial++)for(const kind of ['plain','mixed'])for(const format of ['json','protobuf']){
 const versions=[['baseline',baseline],['candidate',root]];if(trial%2)versions.reverse();
 for(const [version,path] of versions){
  const args=kind==='plain'?['native-playlist-bench.mjs','child',path,'Loon',version,format,'--churn']:['mixed-playlist-bench.mjs','child','Loon',format,'standard',path];
  const child=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',...args],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:65536});if(child.status!==0)throw Error(child.stderr.slice(0,2000));runs.push({trial,kind,format,version,...JSON.parse(child.stdout)});
 }
}
const comparisons=[];
for(const kind of ['plain','mixed'])for(const format of ['json','protobuf']){
 const rows=runs.filter(r=>r.kind===kind&&r.format===format);if(new Set(rows.map(r=>r.outputSHA256)).size!==1)throw Error('Output differs '+kind+' '+format);
 const row={kind,format};for(const version of ['baseline','candidate']){const group=rows.filter(r=>r.version===version);row[version]={elapsedMs:median(group.map(r=>r.elapsedMs)),sampledMaxHeapBytes:median(group.map(r=>r.sampledMaxHeapBytes)),retainedHeapBytes:median(group.map(r=>r.retainedHeapBytes)),httpCalls:group[0].httpCalls};}comparisons.push(row);
}
const report={at:new Date().toISOString(),baseline:'3.1.4',candidate:'3.1.5',scope:'Five alternating fresh 32 MiB old-space process pairs per case and format. Plain: 240 cold songs and metadata/lyric hooks. Mixed: 120 IDs with 240 lyric responses, meaningful/no-op mixed fragments and warm cache reopen. Same harness/codec/cache priming for both native runtimes, zero HTTP latency, explicit GC every six songs. Includes VM/code-cache/harness overhead and sampled boundaries, not iPhone native buffers or VPN acceptance.',comparisons,runs};writeFileSync(new URL('./paired-loon-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(comparisons));
