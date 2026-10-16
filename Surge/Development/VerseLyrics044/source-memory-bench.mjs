import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
if(process.argv[2]!=='child'){
 const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child'],{encoding:'utf8',timeout:30000,maxBuffer:16384});
 if(r.status!==0)throw Error('Memory benchmark failed: '+r.signal+' '+r.stderr.slice(-600));
 const result={at:new Date().toISOString(),core:'0.4.4',environment:process.version+' '+process.platform+' '+process.arch,scope:'Synthetic sequential fallback traversal, 200 unique tracks, Node old-space limit 32 MiB. Sampled heap is not a complete peak or proxy-process RAM measurement.',...JSON.parse(r.stdout)};
 writeFileSync(new URL('./source-memory-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}else{
 const {backup,loadCache}=await import('./core/spotify-lyrics.js');
 const store=new Map();let calls=0,active=0,maxActive=0,maxHeap=0,maxBytes=0,maxRequests=0;
 const sample=()=>maxHeap=Math.max(maxHeap,process.memoryUsage().heapUsed);
 const pad='x'.repeat(60000);
 async function request(url){calls++;active++;maxActive=Math.max(maxActive,active);try{sample();let j;
  if(url.includes('lrclib'))j=url.includes('/get?')?{}:[{trackName:'Other recording',plainLyrics:pad}];
  else if(url.includes('qq.com'))j={code:0,data:{song:{list:[]}}};
  else if(url.includes('163.com'))j={code:200,result:{songs:[]}};
  else if(url.includes('kugou'))j={status:200,candidates:[]};
  else if(url.includes('kuwo'))j={abslist:[]};
  else j=url.includes('/suggest/')?{data:[{title:'Paper Lantern',artist:{name:'Ada North'},album:{title:'Quiet Walk'},duration:180}]}:{lyrics:'A paper lantern floats.\nOur evening light returns.'};
  if(!Array.isArray(j))j.padding=pad;
  const r=new Response(JSON.stringify(j));sample();return r;
 }finally{active--;}}
 const ctx={storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:request,post:request}};
 global.gc();const baseline=process.memoryUsage().heapUsed,start=performance.now();
 for(let i=0;i<200;i++){
  const state={settings:{provider:'auto'},cache:loadCache(ctx),deadline:Date.now()+20000};
  const doc=await backup(ctx,{id:String(i+1).padStart(22,'0'),title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:180},state);sample();
  if(doc?.lyrics.provider!=='lyricsovh'||state.attempts.length!==6||state.sourceUsage.requests!==8||state.sourceUsage.bytes>512*1024)throw Error('Traversal or budget regression');
  maxBytes=Math.max(maxBytes,state.sourceUsage.bytes);maxRequests=Math.max(maxRequests,state.sourceUsage.requests);state.cache.save();
 }
 const raw=store.get('VerseLyrics.v1.cache'),cache=JSON.parse(raw);if(raw.length>96000||cache.entries.length>192||maxActive!==1)throw Error('Resource bound regression');
 console.log(JSON.stringify({tracks:200,totalHTTPCalls:calls,maxInFlight:maxActive,maxCallsPerTrack:maxRequests,maxResponseBytesPerTrack:maxBytes,cacheCharacters:raw.length,cacheEntries:cache.entries.length,baselineHeapBytes:baseline,sampledMaxHeapBytes:maxHeap,maxRSSKiB:process.resourceUsage().maxRSS,elapsedMs:Math.round(performance.now()-start)}));
}
