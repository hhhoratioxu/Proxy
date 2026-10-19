import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const baseline=process.argv[2],pilots=process.argv[3],here=fileURLToPath(new URL('.',import.meta.url));
if(!baseline||!pilots)throw Error('Pass unchanged baseline and constructed pilot directories');
const versions=[['baseline',baseline],...['full','range','cache','lazy','cache-lazy'].map(n=>[n,pilots+'/'+n])],runs=[];
for(let trial=0;trial<6;trial++){
 const ordered=[...versions.slice(trial%versions.length),...versions.slice(0,trial%versions.length)];
 for(const [version,root] of ordered)for(const kind of ['node-filled-mixed-600','jsc-cold-en-600']){
  const args=kind.startsWith('node')?['--expose-gc','--max-old-space-size=32','native-first-load-bench.mjs','child',root,'official-mixed-600','--populated']:['jsc-fixtures/range-en-600.js',root+'/runtime/Loon/script/SpotifyLyrics.js','1'];
  const child=spawnSync(kind.startsWith('node')?process.execPath:here+'/jsc-memory-runner',args,{cwd:here,encoding:'utf8',timeout:30000,maxBuffer:8192});
  if(child.status!==0)throw Error(kind+' '+version+' '+child.stderr);
  runs.push({trial,version,kind,runtimeSHA256:createHash('sha256').update(readFileSync(root+'/runtime/Loon/script/SpotifyLyrics.js')).digest('hex'),...JSON.parse(child.stdout)});
 }
}
const median=a=>[...a].sort((x,y)=>x-y)[a.length>>1],comparisons=[];
for(const kind of ['node-filled-mixed-600','jsc-cold-en-600']){
 const rows=runs.filter(r=>r.kind===kind),hashes=new Set(rows.map(r=>kind.startsWith('node')?r.outputSHA256:JSON.stringify(r.result)));if(hashes.size!==1)throw Error('Changed fixture outputs');
 for(const [version] of versions){const group=rows.filter(r=>r.version===version),keys=kind.startsWith('node')?['medianMs','sampledMaxHeapBytes','medianHeapGrowth']:['milliseconds','sampledPeakFootprint','maxRSS'];comparisons.push({kind,version,...Object.fromEntries(keys.map(k=>[k,median(group.map(r=>r[k]))]))});}
}
const report={at:new Date().toISOString(),scope:'Six fresh-process trials per runtime/case with rotated version order. Same fixture/codec/HTTP replies, full outputs equal. Ablation of the original combined candidate, not a phone test. Pilot runtimes are excluded from published consumer entries.',comparisons,runs};writeFileSync(new URL('./pilot-ablation-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(comparisons));
