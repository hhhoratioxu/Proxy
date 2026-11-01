// Run after run-loon-memory.mjs; cross-check output against its Node fixtures.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const [baselineArg,candidateArg,fixturesArg,workerArg,reportArg,runsArg='3']=process.argv.slice(2);
if(!reportArg)throw Error('baseline candidate-dist fixture-directory swift-worker report.json [runs=3]');
const baseline=resolve(baselineArg),candidate=resolve(candidateArg),fixtures=resolve(fixturesArg),worker=resolve(workerArg),runs=Number(runsArg);
if(!Number.isInteger(runs)||runs<1||runs>5)throw Error('runs 1..5');
const cases=JSON.parse(await readFile(join(fixtures,'cases.json'),'utf8')),node=JSON.parse(await readFile(join(dirname(fixtures),'report.json'),'utf8'));
const trials=[],setup=fileURLToPath(new URL('./loon-jsc-setup.js',import.meta.url));
for(const fixture of cases){
 const expected=node.trials.find(t=>t.name===fixture.name&&t.label==='baseline');
 for(let run=0;run<runs;run++)for(const label of run%2?['candidate','baseline']:['baseline','candidate']){
  const child=spawnSync(worker,[label==='baseline'?baseline:candidate,fixtures,fixture.name,setup],{encoding:'utf8',timeout:30000,maxBuffer:1048576});if(child.status!==0)throw Error(child.stderr||child.stdout);
  const result=JSON.parse(child.stdout);if(result.sha256!==expected.sha256||result.requests!==expected.requests||result.completions!==1)throw Error('JSC/Node output mismatch '+fixture.name+' '+label);
  if(fixture.phase==='request'&&result.requestHeaderSha256!==expected.requestHeaderSha256)throw Error('request header mismatch');
  trials.push({label,trial:run+1,...result});
 }
 console.log('Measured JSC '+fixture.name);
}
const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
const rows=cases.map(({name})=>{
 const b=trials.filter(t=>t.name===name&&t.label==='baseline'),a=trials.filter(t=>t.name===name&&t.label==='candidate'),bp=median(b.map(t=>t.peakRss)),ap=median(a.map(t=>t.peakRss));
 return{name,byteIdentical:true,matchesNodeOutput:true,requests:b[0].requests,completions:1,baselinePeakRss:bp,candidatePeakRss:ap,peakRssChangePercent:(ap/bp-1)*100,baselineMs:median(b.map(t=>t.elapsedMs)),candidateMs:median(a.map(t=>t.elapsedMs))};
});
const sha=b=>createHash('sha256').update(b).digest('hex');
const report={date:'2026-11-01',scope:'macOS JavaScriptCore whole-process fixture host; not Loon or iPhone process memory',macOS:spawnSync('/usr/bin/sw_vers',['-productVersion'],{encoding:'utf8'}).stdout.trim(),arch:process.arch,method:'Fresh Swift/JavaScriptCore process per trial; independent bytes prepared outside worker; GC after fixture setup; peak RSS in Darwin bytes and elapsed time captured before output hashing; interleaved baseline/candidate; immediate fixture HTTP replies, timers never fire; same outputs/request counts verified against Node run',runsPerCase:runs,baselineBundleSha256:sha(await readFile(baseline)),candidateBundles:JSON.parse(await readFile(join(candidate,'SHA256.json'),'utf8')),rows,trials};
await writeFile(resolve(reportArg),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:rows.length,trials:trials.length,byteIdentical:true}));
