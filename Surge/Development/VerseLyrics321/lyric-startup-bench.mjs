import {spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {fixture,host,KEY} from './lyric-startup-fixture.mjs';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
if(process.argv[2]==='child'){
 const root=process.argv[3],client=process.argv[4],mode=process.argv[5],filled=process.argv[6]==='true',f=fixture(mode,'protobuf',filled);
 let peakHeap=0,peakRSS=0;const sample=()=>{const m=process.memoryUsage();peakHeap=Math.max(peakHeap,m.heapUsed);peakRSS=Math.max(peakRSS,m.rss);};
 const x=host(root,client,f,{sample});global.gc();const before=process.memoryUsage().heapUsed,start=performance.now();
 for(let i=0;i<72;i++)x.invoke();const pending=x.live;await x.drain();sample();
 const ms=performance.now()-start,sha=createHash('sha256');for(const b of x.outputs)sha.update(b);
 console.log(JSON.stringify({ms,heapGrowth:peakHeap-before,peakRSS,peakLive:x.peak,pending,synchronous:x.synchronous,calls:x.calls,peakHTTP:x.peakHTTP,timers:x.timers,peakInputBytes:x.peakRetained,done:x.done,cacheChars:f.store.get(KEY).length,outputSHA256:sha.digest('hex'),runtimeSHA256:createHash('sha256').update(readFileSync(root+'/runtime/'+client+'/script/SpotifyLyrics.js')).digest('hex')}));
}else{
 const baseline=process.argv[2],here=fileURLToPath(new URL('.',import.meta.url)),runs=[],trials=Number(process.env.BENCH_TRIALS)||4;
 for(let trial=0;trial<trials;trial++)for(const client of ['Loon','Surge','Shadowrocket','QuantumultX'])for(const filled of [false,true])for(const mode of ['english-cached','english-cold','missing-cached','missing-cold']){
  const versions=[['baseline',baseline],['candidate',here]];if(trial%2)versions.reverse();
  for(const [version,root]of versions){const p=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=64',fileURLToPath(import.meta.url),'child',root,client,mode,String(filled)],{encoding:'utf8',timeout:20000,maxBuffer:5000});if(p.status)throw Error(p.stderr);runs.push({trial,client,filled,mode,version,...JSON.parse(p.stdout)});}
 }
 const comparisons=[];
 for(const client of ['Loon','Surge','Shadowrocket','QuantumultX'])for(const filled of [false,true])for(const mode of ['english-cached','english-cold','missing-cached','missing-cold']){
  const group=runs.filter(r=>r.client===client&&r.filled===filled&&r.mode===mode);
  if(new Set(group.map(r=>r.outputSHA256)).size!==1)throw Error('changed output '+client+' '+mode);
  for(const version of ['baseline','candidate']){
   const rows=group.filter(r=>r.version===version),cached=mode.endsWith('cached');
   for(const r of rows){if(r.done!==72||r.peakHTTP>(cached?0:1)||r.cacheChars>64000)throw Error('boundary');if(version==='candidate'&&(r.peakLive!==(cached?1:2)||r.pending!==(cached?0:1)))throw Error('retention');if(version==='baseline'&&(r.peakLive!==72||r.pending!==72))throw Error('baseline');}
   comparisons.push({client,filled,mode,version,...Object.fromEntries(['ms','heapGrowth','peakRSS','peakLive','pending','synchronous','calls','peakHTTP','timers','peakInputBytes'].map(k=>[k,median(rows.map(r=>r[k]))]))});
  }
 }
 const report={scope:'Alternating fresh Node/V8 processes; 72 compiled native lyric invocations dispatched in one JS turn before microtask drain, four native clients, empty/populated caches, identical fixture/output bytes and HTTP counts. Host inputs are released at done. Mock callbacks are explicitly drained; no GC during bursts. Deliberate adverse scheduling model, not captured Loon/iOS scheduling, native buffering or total VPN memory.',trials,comparisons,runs};
 writeFileSync(new URL('lyric-startup-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(comparisons.filter(r=>r.client==='Loon')));
}
