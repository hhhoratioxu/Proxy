import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
if(process.argv[2]!=='child'){
 const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.5.1 workspace');const runs=[];
 for(let trial=0;trial<4;trial++)for(const same of [false,true])for(const root of trial%2?[fileURLToPath(new URL('.',import.meta.url)),baseline]:[baseline,fileURLToPath(new URL('.',import.meta.url))]){
  const r=spawnSync(process.execPath,['--expose-gc',fileURLToPath(import.meta.url),'child',root,String(same)],{encoding:'utf8',timeout:15000,maxBuffer:8000});if(r.status!==0)throw Error(r.stderr||r.stdout);runs.push({trial,...JSON.parse(r.stdout)});
 }
 const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)],comparisons=[];
 for(const same of [false,true])for(const version of [...new Set(runs.map(r=>r.version))]){const rows=runs.filter(r=>r.same===same&&r.version===version);comparisons.push({same,version,...Object.fromEntries(['peakLiveInvocations','peakHTTP','admissionTimers','liveAfterBurst','busyResponseMedianMs','liveInvocationMs','heapGrowth','totalCalls','firstPassTranslated','retryTranslated'].map(k=>[k,median(rows.map(r=>r[k]))]))});}
 const report={at:new Date().toISOString(),scope:'Compiled Loon scripts, independent fresh VM/context on each response, 60 requests spaced 2 ms, native HTTP callbacks delayed 400 ms. Four fresh-process trials for repeated-song and distinct-song bursts. No forced GC during the burst; a single GC precedes it. Script completions count VM invocation lifetime, not native JSC resources or OS reclamation. Heap sampling includes V8, code compilation and the harness; not iPhone/VPN memory. New overload behavior intentionally returns cached/original lyrics on a busy response; the settled song is explicitly requested again after callbacks drain. Same shared synchronous storage mock, no native atomic-storage guarantee.',comparisons,runs};writeFileSync(new URL('./native-pressure-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(comparisons));
}else{
 const root=process.argv[3],same=process.argv[4]==='true',source=readFileSync(root+'/runtime/Loon/script/SpotifyLyrics.js','utf8'),version=JSON.parse(readFileSync(root+'/package.json')).version,store=new Map(),words=['Original pressure test line.','Another original test line.'];
 const input=Buffer.from(JSON.stringify({lyrics:{syncType:'LINE_SYNCED',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[]}}));
 let live=0,peakLiveInvocations=0,active=0,peakHTTP=0,admissionTimers=0,heap=0,liveInvocationMs=0,totalCalls=0,firstPassTranslated=0;const latencies=[];
 const sample=()=>heap=Math.max(heap,process.memoryUsage().heapUsed);
 function invoke(n,retry=false){const started=performance.now();live++;peakLiveInvocations=Math.max(peakLiveInvocations,live);let finish;const result=new Promise(r=>finish=r),id=String(same?1:n).padStart(22,'0');
  const ctx={$argument:{TRANSLATION_ENABLED:true,FALLBACK_PROVIDER:'auto',TARGET_LANGUAGE:'zh-CN'},$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:{Accept:'application/json'}},$response:{status:200,headers:{'Content-Type':'application/json'},body:input},$persistentStore:{read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}},setTimeout:(f,ms)=>{admissionTimers++;return setTimeout(f,ms);},$httpClient:{get:(o,cb)=>{totalCalls++;active++;peakHTTP=Math.max(peakHTTP,active);sample();setTimeout(()=>{active--;cb(null,{status:200,headers:{}},JSON.stringify(['插件译文一','插件译文二']));},400);}},$done:r=>{live--;const elapsed=performance.now()-started;liveInvocationMs+=elapsed;if(n>2&&!retry)latencies.push(elapsed);const out=JSON.parse(Buffer.from(r.body||input));if(out.lyrics.lines.some((l,i)=>l.words!==words[i]||l.startTimeMs!==String(i*2000+1000)))throw Error('lost original');const translated=out.lyrics.alternatives?.[0]?.lines.length===2;if(!retry&&translated)firstPassTranslated++;sample();finish(translated);}};
  new vm.Script(source).runInNewContext(ctx);sample();return result;
 }
 global.gc();const before=process.memoryUsage().heapUsed;const work=[];
 for(let n=1;n<=60;n++){work.push(invoke(n));await new Promise(r=>setTimeout(r,2));}
 const liveAfterBurst=live;await Promise.all(work);if(live||active)throw Error('undrained');const retryTranslated=+(await invoke(60,true));await new Promise(setImmediate);if(!retryTranslated)throw Error('retry lost translation');if(store.get('VerseLyrics.v1.cache').length>64000)throw Error('cache overflow');
 latencies.sort((a,b)=>a-b);console.log(JSON.stringify({version,same,runtimeSHA256:createHash('sha256').update(source).digest('hex'),peakLiveInvocations,peakHTTP,admissionTimers,liveAfterBurst,busyResponseMedianMs:+latencies[Math.floor(latencies.length/2)].toFixed(3),liveInvocationMs:Math.round(liveInvocationMs),heapGrowth:heap-before,totalCalls,firstPassTranslated,retryTranslated}));
}
