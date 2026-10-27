import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {startupFixture,kinds} from './startup-fixtures.mjs';
const clients=['Loon','Surge','Shadowrocket','QuantumultX'],trials=Number(process.env.BENCH_TRIALS)||6;
const median=rows=>[...rows].sort((a,b)=>a-b)[Math.floor(rows.length/2)];
if(process.argv[2]!=='child'){
 const baseline=process.argv[2],runs=[],here=fileURLToPath(new URL('.',import.meta.url));
 if(!baseline)throw Error('Pass baseline directory');
 for(let trial=0;trial<trials;trial++)for(const client of clients)for(const populated of [false,true]){
  const versions=[['baseline',baseline],['candidate',here]];if(trial%2)versions.reverse();
  for(const [version,root]of versions){
   const child=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=64',fileURLToPath(import.meta.url),'child',root,client,populated?'filled':'empty'],{encoding:'utf8',timeout:20000,maxBuffer:10000});
   if(child.status!==0)throw Error(version+' '+client+' '+child.stderr);
   runs.push({trial,version,client,populated,...JSON.parse(child.stdout)});
  }
 }
 const comparisons=[];
 for(const client of clients)for(const populated of [false,true]){
  const rows=runs.filter(r=>r.client===client&&r.populated===populated);
  if(new Set(rows.map(r=>r.outputSHA256)).size!==1)throw Error('Changed entry bytes '+client);
  for(const version of ['baseline','candidate']){
   const rs=rows.filter(r=>r.version===version),r=rs[0];
   if(rs.some(x=>x.completed!==72||x.http!==0||x.timers!==0))throw Error('Incomplete local entry');
   if(version==='candidate'&&rs.some(x=>x.peakLive!==1||x.pendingAfterDispatch!==0||x.synchronous!==72))throw Error('Entry retained asynchronous work');
   if(version==='baseline'&&rs.some(x=>x.peakLive!==72||x.pendingAfterDispatch!==72||x.synchronous!==0))throw Error('Baseline scheduling changed');
   comparisons.push({client,populated,version,...Object.fromEntries(['milliseconds','peakHeapGrowth','sampledPeakRSS','peakLive','pendingAfterDispatch','peakRetainedInputBytes','synchronous','cacheCharacters'].map(k=>[k,median(rs.map(r=>r[k]))]))});
  }
 }
 const report={at:new Date().toISOString(),scope:'96 fresh 64 MiB old-space Node/V8 processes (six alternating trials, four native clients, empty/populated cache). Each dispatches 72 compiled entry VMs in one JS turn before a microtask drain, mixing nine supported Spotify startup routes with 12/40/90 KiB self-written bodies. Original input ownership is released at done; the harness records pending invocations/input bytes and actual heap/RSS samples without forcing GC during a burst. This models a deliberately same-turn scheduler, not a captured Loon/iOS scheduling policy or total VPN memory. All output body hashes must match.',comparisons,runs};
 writeFileSync(new URL('startup-burst-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(comparisons));
}else{
 const root=process.argv[3],client=process.argv[4],populated=process.argv[5]==='filled',qx=client==='QuantumultX';
 const source=readFileSync(root+'/runtime/'+client+'/script/SpotifyLyrics.Entry.js','utf8'),store=new Map(),KEY='VerseLyrics.v1.cache';
 if(populated){
  const entries=[];for(let i=100;i<148;i++)entries.push({key:'lyrics:auto:'+String(i).padStart(22,'0'),value:{v:1,p:'qq',t:true,l:Array.from({length:32},(_,j)=>[j*2100,'Other self-written song '+i+' line '+j+'.'])},expires:Date.now()+600000});
  let raw;
  do{const parts=entries.map(e=>JSON.stringify(e));raw='{"sizes":'+JSON.stringify(parts.map(s=>s.length))+',"entries":['+parts.join(',')+'],"cooldowns":{}}';if(raw.length>60000)entries.pop();}while(raw.length>60000);
  if(raw.length<48000)throw Error('Filled fixture too small');store.set(KEY,raw);
 }
 let live=0,peakLive=0,retained=0,peakRetainedInputBytes=0,completed=0,synchronous=0,http=0,timers=0,peakHeap=0,sampledPeakRSS=0;
 const liveContexts=new Set(),hashes=[];
 const sample=()=>{const m=process.memoryUsage();peakHeap=Math.max(peakHeap,m.heapUsed);sampledPeakRSS=Math.max(sampledPeakRSS,m.rss);};
 function invoke(n){
  const f=startupFixture(kinds[n%kinds.length],[12288,40960,92160][n%3]),body=new Uint8Array(f.body);let returned=false,done=0;
  const ctx={$argument:{},$request:{url:f.url,headers:{}},$response:qx?{statusCode:200,headers:{'Content-Type':f.type},bodyBytes:body.buffer}:{status:200,headers:{'Content-Type':f.type},body},
   $persistentStore:{read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}},$prefs:{valueForKey:k=>store.get(k),setValueForKey:(v,k)=>{store.set(k,v);return true;}},
   setTimeout(){timers++;throw Error('Unexpected timer');},$httpClient:{get(){http++;throw Error('Entry HTTP');},post(){http++;throw Error('Entry HTTP');}},$task:{fetch(){http++;throw Error('Entry HTTP');}},
   $done:r=>{if(++done!==1)throw Error('duplicate done');if(!returned)synchronous++;completed++;live--;retained-=body.byteLength;hashes[n]=createHash('sha256').update(Buffer.from((qx?r.bodyBytes:r.body)||body)).digest('hex');liveContexts.delete(ctx);delete ctx.$response;sample();}};
  live++;retained+=body.byteLength;peakLive=Math.max(peakLive,live);peakRetainedInputBytes=Math.max(peakRetainedInputBytes,retained);liveContexts.add(ctx);
  new vm.Script(source).runInNewContext(ctx,{timeout:1000});returned=true;sample();
 }
 global.gc();const before=process.memoryUsage().heapUsed,start=performance.now();
 for(let n=0;n<72;n++)invoke(n);
 const pendingAfterDispatch=live;await new Promise(setImmediate);sample();
 if(completed!==72||liveContexts.size||retained)throw Error('Unsettled entry');
 const raw=store.get(KEY)||'';if(raw.length>64000)throw Error('Cache cap');
 console.log(JSON.stringify({milliseconds:performance.now()-start,peakHeapGrowth:peakHeap-before,sampledPeakRSS,peakLive,pendingAfterDispatch,peakRetainedInputBytes,synchronous,completed,http,timers,cacheCharacters:raw.length,outputSHA256:createHash('sha256').update(hashes.join('|')).digest('hex'),runtimeSHA256:createHash('sha256').update(source).digest('hex')}));
}
