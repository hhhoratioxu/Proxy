// Run interleaved isolated children, including bundle initialization each time.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';
const [beforeArg,afterArg,outArg,runsArg='3']=process.argv.slice(2);
if(!beforeArg||!afterArg||!outArg)throw Error('node bench/run-memory.mjs <baseline clients.js> <candidate clients.js> <output directory> [runs=3]');
const before=resolve(beforeArg),after=resolve(afterArg),out=resolve(outArg),runs=Number(runsArg);
if(!Number.isInteger(runs)||runs<1||runs>10)throw Error('runs 1..10');
await mkdir(out,{recursive:true});const directory=join(out,'fixtures'),here=fileURLToPath(new URL('.',import.meta.url));
function command(args){const p=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:8*1024*1024});if(p.status!==0)throw Error(p.stderr||p.stdout);return p.stdout.trim();}
command([join(here,'prepare.mjs'),directory]);const cases=JSON.parse(await readFile(join(directory,'cases.json'),'utf8')),trials=[];
for(const fixture of cases){
 for(let i=0;i<runs;i++)for(const label of i%2?['candidate','baseline']:['baseline','candidate'])trials.push({label,trial:i+1,...JSON.parse(command(['--expose-gc',join(here,'worker.mjs'),label==='baseline'?before:after,directory,fixture.name]))});
 console.log('Measured '+fixture.name);
}
const median=values=>{const a=values.slice().sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
const rows=cases.map(({name})=>{
 const b=trials.filter(t=>t.name===name&&t.label==='baseline'),a=trials.filter(t=>t.name===name&&t.label==='candidate');
 const outputs=new Set([...b,...a].map(t=>t.sha256));if(outputs.size!==1)throw Error('Output bytes differ: '+name);
 const baselinePeakRss=median(b.map(t=>t.peakRss)),candidatePeakRss=median(a.map(t=>t.peakRss));
 return{name,inputBytes:b[0].inputBytes,outputBytes:b[0].outputBytes,byteIdentical:true,baselinePeakRss,candidatePeakRss,peakRssChangePercent:(candidatePeakRss/baselinePeakRss-1)*100,baselineMs:median(b.map(t=>t.elapsedMs)),candidateMs:median(a.map(t=>t.elapsedMs))};
});
const sha=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const report={scope:'Node/V8 desktop Loon API simulation; not iPhone or native Loon memory',date:'2026-10-19',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,runsPerCase:runs,method:'fresh isolated process per trial; fixtures prepared by a separate process; GC before processing; OS process peak RSS includes bundle initialization and processing; interleaved baseline/candidate order; median reported; hashes cover output body bytes',baselineBundleSha256:await sha(before),candidateBundleSha256:await sha(after),rows,trials};
await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:rows.length,trials:trials.length,byteIdentical:true,report:join(out,'report.json')}));
