import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
if(process.argv[2]!=='child'){
  const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.4.16 workspace');
  const results=[];
  for(const [version,root] of [['0.4.16',baseline],['0.5.0',fileURLToPath(new URL('.',import.meta.url))]]){
    const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',root,version],{encoding:'utf8',timeout:30000,maxBuffer:8192});
    if(r.status!==0)throw Error(version+' '+r.stderr);results.push({version,...JSON.parse(r.stdout)});
  }
  if(new Set(results.map(r=>r.outputSHA256)).size!==1)throw Error('Output changed');
  const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'Loon cold protobuf lyric processing: 20 fresh VM/empty lyric-cache sessions per scenario: official and fallback lyrics, 24 and 48 lines. Metadata and palette are seeded as if obtained by the playback entry. Unique script text avoids V8 compilation-cache reuse. Includes compilation and mock network callbacks; zero real network latency. Event-loop drain and GC between sessions so completed VM callbacks can release their contexts. Not iPhone startup time or VPN-process memory.',results};
  writeFileSync(new URL('./native-startup-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else{
  const root=process.argv[3],version=process.argv[4],m=await import(pathToFileURL(root+'/core/spotify-lyrics.js')),script=readFileSync(root+'/runtime/Loon/script/SpotifyLyrics.js','utf8'),id='0000000000000000000001',KEY='VerseLyrics.v1.cache',colors={background:-10985626,text:-16777216,highlightText:-1};
  const digest=createHash('sha256'),stats=[];let sampledPeak=0;
  for(const lineCount of [24,48])for(const fallback of [false,true]){
    const words=Array.from({length:lineCount},(_,i)=>'Original lantern line '+i+'.');
    const durations=[],compiles=[],allocations=[],initialHeaps=[];let httpCalls=0,historyWrites=0;
    for(let run=0;run<20;run++){
      const expires=Date.now()+60000,store=new Map([[KEY,JSON.stringify({entries:[{key:'meta:'+id,value:{id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:180},expires},{key:'palette:v1:'+id,value:{colors},expires}],cooldowns:{}})]]);
      const payload={lyrics:{syncType:'LINE_SYNCED',provider:'Musixmatch',providerDisplayName:'Original',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000),endTimeMs:'0',syllables:[]})),alternatives:[]},colors};
      let finish,localPeak=0;const sample=()=>{localPeak=Math.max(localPeak,process.memoryUsage().heapUsed);};const done=new Promise(r=>finish=r);
      const ctx={$argument:{FALLBACK_PROVIDER:'lrclib'},$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:{Accept:'application/x-protobuf'}},$response:{status:fallback?404:200,headers:{'Content-Type':'application/x-protobuf'},body:fallback?Buffer.from('missing'):m.encodeDocument(payload,'protobuf')},
        $persistentStore:{read:k=>store.get(k),write:(v,k)=>{if(/\.status$|\.events$/.test(k))historyWrites++;store.set(k,v);return true;}},
        $done:r=>{sample();finish(r);},$httpClient:{get:(o,cb)=>{
          sample();httpCalls++;let data;
          if(o.url.includes('lrclib.net'))data={trackName:'Paper Lantern',artistName:'Ada North',albumName:'Quiet Walk',duration:180,syncedLyrics:words.map((s,i)=>{const t=i*2+1;return '['+String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')+']'+s;}).join('\n')};
          else if(o.url.includes('translate.googleapis.com'))data=new URL(o.url).searchParams.getAll('q').map(s=>'自写译文 '+s.match(/line (\d+)/)[1]);
          else throw Error('Unexpected host');
          queueMicrotask(()=>cb(null,{status:200,headers:{}},o["binary-mode"] === false ? JSON.stringify(data) : Buffer.from(JSON.stringify(data))));
        }}};
      global.gc();const initialHeap=process.memoryUsage().heapUsed;initialHeaps.push(initialHeap);const start=performance.now(),compiled=new vm.Script(script+'\n// cold '+fallback+' '+lineCount+' '+run);compiles.push(performance.now()-start);
      compiled.runInNewContext(ctx);sample();const result=await done;durations.push(performance.now()-start);sample();sampledPeak=Math.max(sampledPeak,localPeak);allocations.push(localPeak-initialHeap);
      const out=new Uint8Array(result.body),p=m.parseDocument(out,'application/x-protobuf');if(p.words.length!==lineCount||!Buffer.from(out).includes(Buffer.from('自写译文 0')))throw Error('Content lost');digest.update(out);
      await new Promise(setImmediate); // Drain each native completion chain before the next cold VM.
    }
    durations.sort((a,b)=>a-b);compiles.sort((a,b)=>a-b);allocations.sort((a,b)=>a-b);
    if(httpCalls!==20*((fallback?1:0)+Math.ceil(lineCount/64)))throw Error('Extra network requests');
    stats.push({lineCount,fallback,sessions:20,httpCalls,historyWrites,medianHeapGrowth:allocations[10],maxHeapGrowth:allocations.at(-1),firstInitialHeap:initialHeaps[0],lastInitialHeap:initialHeaps.at(-1),medianCompileMs:+compiles[10].toFixed(3),medianProcessingMs:+durations[10].toFixed(3)});
  }
  console.log(JSON.stringify({scriptBytes:Buffer.byteLength(script),sampledMaxHeapBytes:sampledPeak,outputSHA256:digest.digest('hex'),stats}));
}
