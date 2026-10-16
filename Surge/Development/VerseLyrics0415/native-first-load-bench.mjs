import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const scenarios=[
  {name:'official-en-24',lines:24}, {name:'fallback-en-24',lines:24,fallback:true,seed:true},
  {name:'official-en-48',lines:48}, {name:'fallback-en-48',lines:48,fallback:true,seed:true},
  {name:'official-en-120',lines:120}, {name:'fallback-en-120',lines:120,fallback:true,seed:true},
  {name:'official-zh-48',lines:48,han:true}, {name:'fallback-zh-48',lines:48,fallback:true,seed:true,han:true},
  {name:'empty-fallback-en-48',lines:48,fallback:true}, {name:'empty-fallback-zh-48',lines:48,fallback:true,han:true}
];
const sequence=process.argv.includes('--sequence'),sessions=sequence?12:1,trials=sequence?3:12;
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
if(process.argv[2]!=='child'){
  const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.4.14 workspace');const runs=[];
  for(let trial=0;trial<trials;trial++)for(const scenario of scenarios){
    const versions=[['0.4.14',baseline],['0.4.15',fileURLToPath(new URL('.',import.meta.url))]];
    if(trial%2)versions.reverse(); // Alternate process order; retain every trial.
    for(const [version,root] of versions){
      const child=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',root,scenario.name,...(sequence?['--sequence']:[])],{encoding:'utf8',timeout:30000,maxBuffer:8192});
      if(child.status!==0)throw Error(version+' '+scenario.name+' '+child.stderr);
      runs.push({trial,version,scenario:scenario.name,...JSON.parse(child.stdout)});
    }
  }
  const comparisons=scenarios.map(s=>{
    const rows=runs.filter(r=>r.scenario===s.name);
    if(new Set(rows.map(r=>r.outputSHA256)).size!==1)throw Error('Output changed: '+s.name);
    return {scenario:s.name,...Object.fromEntries(['0.4.14','0.4.15'].map(v=>{
      const r=rows.filter(r=>r.version===v);
      return [v,{medianMs:median(r.map(x=>x.medianMs)),medianHeapGrowth:median(r.map(x=>x.medianHeapGrowth)),sampledMaxHeapBytes:median(r.map(x=>x.sampledMaxHeapBytes)),httpCalls:r[0].httpCalls,sessions:r[0].sessions}];
    }))};
  });
  const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:sequence?'Three trials per version/scenario in separate 32 MiB old-space processes, each containing twelve fresh script/VM invocations. Same empty lyric cache and native mocks as first-invocation mode; GC and callback drain between invocations. Whole-process sampling includes V8 code caches and multiple VM generations. Not phone or VPN memory.':'Twelve trials per version/scenario; each uses one fresh script/VM invocation in a fresh 32 MiB old-space process. Empty lyric/translation cache every session; seed=true supplies only playback metadata/palette. Empty-fallback scenarios start with no stored data and fetch public embed metadata. Native HTTP mocks return strings or binary according to requested mode; network latency is zero. Sample at invocation, HTTP and completion boundaries, drain callbacks after completion; no reuse of VM, compiled script or child process across trials. Process peaks include harness/core/VM/code-cache overhead; heap growth starts before fresh compilation. Not iPhone timings, native network buffering or VPN memory.',scenarios,comparisons,runs};
  writeFileSync(new URL(sequence?'./native-cold-sequence-results.json':'./native-first-load-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(comparisons));
}else{
  const root=process.argv[3],s=scenarios.find(x=>x.name===process.argv[4]);if(!s)throw Error('scenario');
  const m=await import(pathToFileURL(root+'/core/spotify-lyrics.js')),script=readFileSync(root+'/runtime/Loon/script/SpotifyLyrics.js','utf8');
  const id='0000000000000000000001',KEY='VerseLyrics.v1.cache',colors={background:-10985626,text:-16777216,highlightText:-1};
  const meta={id,title:s.han?'紙燈':'Paper Lantern',artists:[s.han?'王先生':'Ada North'],album:s.han?'清晨':'Quiet Walk',duration:300};
  const words=Array.from({length:s.lines},(_,i)=>s.han?'原創的紙燈歌詞 '+i:'Original lantern line '+i+'.');
  const expected=words.map((_,i)=>s.han?'Original translation '+i:'自写译文 '+i);
  const record={trackName:s.han?'纸灯':meta.title,artistName:meta.artists[0],albumName:meta.album,duration:meta.duration,syncedLyrics:words.map((w,i)=>'['+String(Math.floor((i*2+1)/60)).padStart(2,'0')+':'+String((i*2+1)%60).padStart(2,'0')+']'+w).join('\n')};
  const entity={type:'track',id,uri:'spotify:track:'+id,title:meta.title,artists:meta.artists.map(name=>({name})),duration:300000,visualIdentity:{backgroundBase:{alpha:255,red:77,green:84,blue:92}}};
  const embed='<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{state:{data:{entity}}}}})+'</script>';
  const original=m.encodeDocument({lyrics:{syncType:'LINE_SYNCED',provider:'Musixmatch',providerDisplayName:'Original',language:s.han?'zh':'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[]},colors},'protobuf');
  const times=[],growth=[],digest=createHash('sha256');let sampledMaxHeapBytes=0,httpCalls=0;
  for(let i=0;i<sessions;i++){
    const expires=Date.now()+60000,store=new Map();
    if(s.seed)store.set(KEY,JSON.stringify({entries:[{key:'meta:'+id,value:meta,expires},{key:'palette:v1:'+id,value:{colors},expires}],cooldowns:{}}));
    let complete,peak=0;const sample=()=>{peak=Math.max(peak,process.memoryUsage().heapUsed);},done=new Promise(r=>complete=r);
    const ctx={$argument:{FALLBACK_PROVIDER:'lrclib',TARGET_LANGUAGE:s.han?'en':'zh-CN'},$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:{Accept:'application/x-protobuf'}},$response:{status:s.fallback?404:200,headers:{'Content-Type':'application/x-protobuf'},body:s.fallback?Buffer.from('missing'):original},
      $persistentStore:{read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}},$done:r=>{sample();complete(r);},$httpClient:{get:(o,cb)=>{
        httpCalls++;sample();const u=new URL(o.url);let body;
        if(u.host==='open.spotify.com')body=embed;
        else if(u.host==='lrclib.net')body=JSON.stringify(u.pathname.includes('/search')?[record]:record);
        else if(u.host==='translate.googleapis.com')body=JSON.stringify(u.searchParams.getAll('q').map(w=>expected[words.indexOf(w)]));
        else throw Error('Unexpected host');
        queueMicrotask(()=>{sample();cb(null,{status:200,headers:{}},o['binary-mode']===false?body:Buffer.from(body));});
      }}};
    global.gc();const before=process.memoryUsage().heapUsed,start=performance.now();
    new vm.Script(script+'\n// cold '+i).runInNewContext(ctx);sample();const result=await done;sample();
    times.push(performance.now()-start);growth.push(peak-before);sampledMaxHeapBytes=Math.max(sampledMaxHeapBytes,peak);
    const out=new Uint8Array(result.body),p=m.parseDocument(out,'application/x-protobuf');
    if(p.words.length!==s.lines||p.words.some((w,i)=>w!==words[i])||!Buffer.from(out).includes(Buffer.from(expected.at(-1))))throw Error('lost content');
    if(s.fallback&&JSON.stringify(m.existingPalette(out,p))!==JSON.stringify(colors))throw Error('colors');
    if((store.get(KEY)?.length||0)>64000)throw Error('cache size');digest.update(out);
    await new Promise(setImmediate);
  }
  const version=JSON.parse(readFileSync(root+'/package.json','utf8')).version;
  const expectedCalls=sessions*((s.fallback?(s.seed?1:2):0)+Math.ceil(s.lines/64));
  if(httpCalls!==expectedCalls)throw Error('Unexpected calls '+httpCalls+' expected '+expectedCalls);
  console.log(JSON.stringify({sessions,httpCalls,medianMs:+median(times).toFixed(3),medianHeapGrowth:median(growth),maxHeapGrowth:Math.max(...growth),sampledMaxHeapBytes,outputSHA256:digest.digest('hex')}));
}
