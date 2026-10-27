// Reproducible desktop cost check, not native Loon/iPhone memory measurement.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {combine,binary,string,homeFirstPage,homeSection} from '../test/fixtures.mjs';
const [baselineArg,candidateArg,outArg]=process.argv.slice(2);
if(!baselineArg||!candidateArg||!outArg)throw Error('node bench/feed-envelope.mjs <1.2.9 clients.js> <candidate clients.js> <output directory>');
const baseline=resolve(baselineArg),candidate=resolve(candidateArg),out=resolve(outArg),here=fileURLToPath(new URL('.',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const element=name=>binary(153515154,binary(172660663,binary(1,binary(168777401,binary(3,binary(172035250,string(1,name+'.eml-fe|independent')))))));
const normal=Array.from({length:120},(_,i)=>combine(element('video_lockup_with_attachment'),string(55,'ordinary-'+i+' '+'n'.repeat(8000)))),ad=element('full_width_square_image_layout');
const modern=items=>homeFirstPage([homeSection([binary(474376530,combine(...items.map(x=>binary(1,x))))])]);
const classic=items=>homeFirstPage(items.map(x=>homeSection([x])));
const cases=[{name:'existing-native-home',body:classic([...normal.slice(0,5),ad,...normal.slice(5)]),expected:classic(normal),baselineChanged:true},{name:'new-mixed-feed-envelope',body:modern([...normal.slice(0,5),ad,...normal.slice(5)]),expected:modern(normal),baselineChanged:false}];
await mkdir(out,{recursive:true});
for(const label of ['baseline','candidate']){
 const dir=join(out,label);await mkdir(dir,{recursive:true});
 const descriptors=[];for(const c of cases){await writeFile(join(dir,c.name+'.body'),c.body);descriptors.push({name:c.name,url:'https://youtubei.googleapis.com/youtubei/v1/browse',contentType:'application/x-protobuf',expectedChanged:label==='candidate'||c.baselineChanged});}
 await writeFile(join(dir,'cases.json'),JSON.stringify(descriptors));
}
const trials=[];
for(const c of cases)for(let run=0;run<3;run++)for(const label of run%2?['candidate','baseline']:['baseline','candidate']){
 const child=spawnSync(process.execPath,['--expose-gc',join(here,'worker.mjs'),label==='baseline'?baseline:candidate,join(out,label),c.name],{encoding:'utf8',maxBuffer:2*1048576});if(child.status!==0)throw Error(child.stderr||child.stdout);
 const result=JSON.parse(child.stdout);{
  const expected=label==='baseline'&&!c.baselineChanged?c.body:c.expected;
  if(result.sha256!==hash(expected)||result.requests!==0||result.completions!==1)throw Error('output/interface mismatch: '+c.name+' '+label);
 }
 trials.push({label,trial:run+1,...result});
}
const median=a=>a.slice().sort((x,y)=>x-y)[1];
const rows=cases.map(c=>{const b=trials.filter(t=>t.name===c.name&&t.label==='baseline'),a=trials.filter(t=>t.name===c.name&&t.label==='candidate');return{name:c.name,inputBytes:c.body.length,baselineMissesNewEnvelope:!c.baselineChanged,candidateMatchesExpectedBytes:true,baselinePeakMiB:median(b.map(t=>t.peakRss))/1048576,candidatePeakMiB:median(a.map(t=>t.peakRss))/1048576,baselineMs:median(b.map(t=>t.elapsedMs)),candidateMs:median(a.map(t=>t.elapsedMs))};});
const report={scope:'macOS/Node/V8 whole-process desktop Loon API simulation, not native host or iPhone memory',date:'2026-10-28',node:process.version,platform:process.platform,arch:process.arch,method:'2 self-written cases, 3 isolated processes per version and case, 12 interleaved trials; new-envelope baseline intentionally passes unchanged (the reproduced miss); candidate must exactly equal expected body with all ordinary entries preserved',baselineBundleSha256:hash(await readFile(baseline)),candidateBundleSha256:hash(await readFile(candidate)),rows,trials};
await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({trials:trials.length,rows}));
