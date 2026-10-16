import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
if(process.argv[2]!=='child'){
  const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.4.10 workspace');
  const results=[];
  for(const [version,root] of [['0.4.10',baseline],['0.4.11',fileURLToPath(new URL('.',import.meta.url))]]){
    const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',root,version],{encoding:'utf8',timeout:30000,maxBuffer:8192});
    if(r.status!==0)throw Error(r.stderr);results.push({version,...JSON.parse(r.stdout)});
  }
  if(new Set(results.map(r=>r.outputSHA256)).size!==1)throw Error('Output changed');
  const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'Loon cold lyric processing: 20 fresh VM/empty lyric-cache sessions for official lyrics and 20 for fallback lyrics, 24 lines each. Metadata and palette are seeded as if obtained by the playback entry. Unique script text avoids V8 compilation-cache reuse. Includes compilation and mock network callbacks; zero real network latency. GC between sessions. Not iPhone startup time or VPN-process memory.',results};
  writeFileSync(new URL('./native-startup-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else{
  const root=process.argv[3],script=readFileSync(root+'/runtime/Loon/script/SpotifyLyrics.js','utf8'),id='0000000000000000000001',KEY='VerseLyrics.v1.cache',colors={background:-10985626,text:-16777216,highlightText:-1};
  const words=Array.from({length:24},(_,i)=>'Original lantern line '+i+'.'),digest=createHash('sha256'),stats=[];let sampledPeak=0;
  for(const fallback of [false,true]){
    const durations=[],compiles=[];let httpCalls=0,historyWrites=0;
    for(let run=0;run<20;run++){
      const expires=Date.now()+60000,store=new Map([[KEY,JSON.stringify({entries:[{key:'meta:'+id,value:{id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:180},expires},{key:'palette:v1:'+id,value:{colors},expires}],cooldowns:{}})]]);
      const payload={lyrics:{syncType:'LINE_SYNCED',provider:'Musixmatch',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000),endTimeMs:'0',syllables:[]})),alternatives:[]},colors};
      let finish;const done=new Promise(r=>finish=r);
      const ctx={$argument:{FALLBACK_PROVIDER:'lrclib'},$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:{Accept:'application/json'}},$response:{status:fallback?404:200,headers:{'Content-Type':'application/json'},body:Buffer.from(fallback?'missing':JSON.stringify(payload))},
        $persistentStore:{read:k=>store.get(k),write:(v,k)=>{if(/\.status$|\.events$/.test(k))historyWrites++;store.set(k,v);return true;}},
        $done:finish,$httpClient:{get:(o,cb)=>{
          httpCalls++;let data;
          if(o.url.includes('lrclib.net'))data={trackName:'Paper Lantern',artistName:'Ada North',albumName:'Quiet Walk',duration:180,syncedLyrics:words.map((s,i)=>'[00:'+String(i*2+1).padStart(2,'0')+']'+s).join('\n')};
          else if(o.url.includes('translate.googleapis.com'))data=new URL(o.url).searchParams.getAll('q').map((_,i)=>'自写译文 '+i);
          else throw Error('Unexpected host');
          queueMicrotask(()=>cb(null,{status:200,headers:{}},Buffer.from(JSON.stringify(data))));
        }}};
      global.gc();const start=performance.now(),compiled=new vm.Script(script+'\n// cold '+fallback+' '+run);compiles.push(performance.now()-start);
      compiled.runInNewContext(ctx);const result=await done;durations.push(performance.now()-start);sampledPeak=Math.max(sampledPeak,process.memoryUsage().heapUsed);
      const out=JSON.parse(Buffer.from(result.body));if(out.lyrics.lines.length!==24||out.lyrics.alternatives[0].lines[0]!=='自写译文 0')throw Error('Content lost');digest.update(JSON.stringify(out));
    }
    durations.sort((a,b)=>a-b);compiles.sort((a,b)=>a-b);
    if(httpCalls!==(fallback?40:20))throw Error('Extra network requests');
    stats.push({fallback,sessions:20,httpCalls,historyWrites,medianCompileMs:+compiles[10].toFixed(3),medianProcessingMs:+durations[10].toFixed(3)});
  }
  console.log(JSON.stringify({scriptBytes:Buffer.byteLength(script),sampledMaxHeapBytes:sampledPeak,outputSHA256:digest.digest('hex'),stats}));
}
