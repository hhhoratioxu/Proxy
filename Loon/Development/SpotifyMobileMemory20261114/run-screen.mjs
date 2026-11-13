import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir,platform,arch,release} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {makeFixtures,makeHarness,oracle} from './fixtures.mjs';
import {assessDesktopScreen,policy} from './budget.mjs';

const here=fileURLToPath(new URL('.',import.meta.url));
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const pin='10049053ce86bd992e3ebb6511ffb28312ba86fb';
const source='Surge/Development/VerseLyrics322/';
if(platform()!=='darwin')throw Error('This screen measures macOS JavaScriptCore; an iOS run requires native device evidence.');
const temp=mkdtempSync(join(tmpdir(),'verselyrics-mobile-memory-'));
const hashes={},scripts={};
function readGit(path){const b=execFileSync('git',['show',pin+':'+path],{cwd:repo,maxBuffer:4*1024*1024});hashes[path]=createHash('sha256').update(b).digest('hex');return b;}
try {
  writeFileSync(join(temp,'package.json'),'{"type":"module"}');
  for(const path of ['core/spotify-lyrics.js','lyric-startup-fixture.mjs','startup-fixtures.mjs']){
    const dest=join(temp,path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,readGit(source+path));
  }
  for(const client of ['Loon','Surge'])for(const entry of [false,true]){
    const name='SpotifyLyrics'+(entry?'.Entry':'')+'.js',path=client+'/script/'+name,b=readGit(path),dest=join(temp,client+'-'+name);
    writeFileSync(dest,b);scripts[client+(entry?'-entry':'')]={path:dest,text:b.toString('utf8')};
  }
  const binary=join(temp,'footprint-runner');
  execFileSync('clang',['-isysroot','/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk','-O2','-Wall','-Wextra','-framework','JavaScriptCore',join(here,'footprint-runner.c'),'-o',binary],{stdio:'pipe'});
  const fixtureSet=await makeFixtures(pathToFileURL(temp+'/'));
  const report={schema:1,date:new Date().toISOString(),scope:'macOS-JSC-mobile-runtime-screen',host:{platform:platform(),arch:arch(),release:release()},policy,provenance:{gitCommit:pin,sha256:hashes},method:{trials:2,repeats:[1,20],metrics:'kernel ledger_phys_footprint_peak and resident_size_peak, whole own process; bytes',network:'synthetic callbacks; no external HTTP; no music playback',repetition:'fresh JSC context/group per invocation; does not model native iOS scheduling or concurrency',limitations:['not an iOS proxy extension','host buffers, TLS, native transport and other scripts are not present','desktop below-limit does not establish mobile acceptance']},runs:[]};
  for(const client of ['Loon','Surge'])for(const memoryMode of ['standard','compact'])for(const f of fixtureSet.cases){
    const script=scripts[client+(f.entry?'-entry':'')];
    const expected=await oracle(makeHarness(f,memoryMode,fixtureSet),script.text,f,fixtureSet);
    const harness=join(temp,'host.js');writeFileSync(harness,makeHarness(f,memoryMode,fixtureSet,expected));
    for(const repeats of [1,20])for(let trial=1;trial<=2;trial++){
      const measurement=JSON.parse(execFileSync(binary,[harness,script.path,String(repeats)],{encoding:'utf8',timeout:30000,maxBuffer:20000}));
      report.runs.push({client,memoryMode,scenario:f.name,inputBytes:f.body.length,trial,measurement});
    }
    process.stdout.write(client+' '+memoryMode+' '+f.name+' complete\n');
  }
  report.summary={processes:report.runs.length,invocations:report.runs.reduce((s,r)=>s+r.measurement.repeats,0),maxFootprintBytes:Math.max(...report.runs.map(r=>r.measurement.peakFootprintBytes)),maxResidentBytes:Math.max(...report.runs.map(r=>r.measurement.peakResidentBytes)),assessment:assessDesktopScreen(report)};
  mkdirSync(join(here,'evidence'),{recursive:true});writeFileSync(join(here,'evidence/memory-screen.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.summary));
  if(report.summary.assessment.screen!=='below-mobile-reference')process.exitCode=1;
}finally{rmSync(temp,{recursive:true,force:true});}
