import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)],cases=[24,48,120,600,'reverse','multi'];
if(process.argv[2]!=='child'){
 const baseline=process.argv[2];if(!baseline)throw Error('Pass released 0.5.1 workspace');const runs=[];
 for(let trial=0;trial<4;trial++)for(const root of (trial%2?[fileURLToPath(new URL('.',import.meta.url)),baseline]:[baseline,fileURLToPath(new URL('.',import.meta.url))])){
  const p=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',root],{encoding:'utf8',timeout:30000,maxBuffer:8192});
  if(p.status!==0)throw Error(p.stderr);for(const row of JSON.parse(p.stdout))runs.push({trial,...row});
 }
 const comparisons=cases.map(name=>{const rows=runs.filter(r=>r.name===name);if(new Set(rows.map(r=>r.sha256)).size!==1)throw Error('Parser changed');return{name,...Object.fromEntries(['0.5.1','0.5.2'].map(v=>{const x=rows.filter(r=>r.version===v);return[v,{medianHeapDelta:median(x.map(r=>r.medianHeapDelta)),medianMsPerParse:median(x.map(r=>r.msPerParse))}];}))};});
 writeFileSync(new URL('./lrc-parser-bench-results.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),scope:'Four separate 32 MiB Node old-space processes per version. Per case: thirty single parses sampled immediately before/after with explicit GC outside each sample; time is a separate 500-parse loop after warmup. Heap delta includes temporary garbage still present after parsing, not retained memory, allocator peak or iPhone memory. Inputs/output hashes identical.',environment:process.version+' '+process.platform+' '+process.arch,comparisons,runs},null,2)+'\n');console.log(JSON.stringify(comparisons));
}else{
 const root=process.argv[3],version=JSON.parse(readFileSync(root+'/package.json')).version,{lrc}=await import(pathToFileURL(root+'/core/spotify-lyrics.js')),out=[];
 for(const name of cases){
  const n=typeof name==='number'?name:120,stamp=i=>'['+String(Math.floor(i/60)).padStart(2,'0')+':'+String(i%60).padStart(2,'0')+']';
  const lines=Array.from({length:n},(_,i)=>(name==='multi'?stamp(i+200):'')+stamp(name==='reverse'?n-i:i)+'Original paper lantern '+i+'.');
  const input=lines.join('\n'),hash=createHash('sha256').update(JSON.stringify(lrc(input))).digest('hex'),deltas=[];
  for(let i=0;i<30;i++){global.gc();const before=process.memoryUsage().heapUsed;const rows=lrc(input);deltas.push(process.memoryUsage().heapUsed-before);if(!rows.length)throw Error('empty');}
  const start=performance.now();for(let i=0;i<500;i++)lrc(input);const elapsed=performance.now()-start;
  out.push({name,version,medianHeapDelta:median(deltas),msPerParse:+(elapsed/500).toFixed(4),sha256:hash});
 }
 console.log(JSON.stringify(out));
}
