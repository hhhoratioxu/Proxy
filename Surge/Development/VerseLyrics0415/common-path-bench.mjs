import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const scenarios=[
 {name:'target-zh-48',source:'zh',target:'zh-CN',kind:'zh',same:true},
 {name:'target-ja-48',source:'ja',target:'ja',kind:'ja',same:true},
 {name:'target-ko-48',source:'ko',target:'ko',kind:'ko',same:true},
 {name:'mixed-zh-en-96',source:'zh',target:'zh-CN',kind:'mixed'},
 {name:'layout-en-144',source:'en',target:'zh-CN',kind:'layout'},
 {name:'fallback-layout-en-144',source:'',target:'zh-CN',kind:'layout',fallback:true},
 {name:'foreign-en-48',source:'en',target:'zh-CN',kind:'en'},
 {name:'traditional-to-simplified-48',source:'zh',target:'zh-CN',kind:'traditional'},
 {name:'unknown-han-48',source:'',target:'zh-CN',kind:'zh'},
 {name:'fallback-en-48',source:'',target:'zh-CN',kind:'en',fallback:true}
];
const median=v=>[...v].sort((a,b)=>a-b)[v.length>>1];
if(process.argv[2]!=='child') {
 const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.4.14 workspace');const runs=[];
 for(let trial=0;trial<3;trial++)for(const s of scenarios){
  const versions=[['0.4.14',baseline],['0.4.15',fileURLToPath(new URL('.',import.meta.url))]];if(trial%2)versions.reverse();
  for(const [version,root] of versions){
   const c=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',root,s.name],{encoding:'utf8',timeout:10000,maxBuffer:8192});if(c.status!==0)throw Error(version+' '+s.name+' '+c.stderr);runs.push({trial,version,scenario:s.name,...JSON.parse(c.stdout)});
  }
 }
 const comparisons=scenarios.map(s=>{
  const r=runs.filter(x=>x.scenario===s.name);if(new Set(r.map(x=>x.outputSHA256)).size!==1)throw Error('Native output mismatch: '+s.name);
  return {scenario:s.name,...Object.fromEntries(['0.4.14','0.4.15'].map(v=>{const xs=r.filter(x=>x.version===v);return[v,{coldRequests:xs[0].coldRequests,translatedQueries:xs[0].translatedQueries,warmRequests:xs[0].warmRequests,medianColdMs:median(xs.map(x=>x.coldMs)),medianWarmMs:median(xs.map(x=>x.warmMs)),medianColdHeapGrowth:median(xs.map(x=>x.coldHeapGrowth)),cacheCharacters:xs[0].cacheCharacters}];}))};
 });
 const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'Ten synthetic song/artist identities across Chinese, Japanese, Korean, English, mixed and unknown-language lyrics. Three alternating trials per version/scenario in independent 32 MiB old-space processes. Compiled Loon runtime, 40 ms deterministic mock HTTP latency per request, one fresh cold VM followed by a fresh warm VM. Fallback cases start with metadata/palette only, no lyrics or translations. Native output bytes must match the previous release. Heap sampled at API boundaries; neither latency nor memory represents a phone, provider benchmark or VPN stability.',comparisons,runs};
 writeFileSync(new URL('./common-path-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(comparisons));
} else {
 const root=process.argv[3],s=scenarios.find(x=>x.name===process.argv[4]),m=await import(pathToFileURL(root+'/core/spotify-lyrics.js')),script=readFileSync(root+'/runtime/Loon/script/SpotifyLyrics.js','utf8'),id=String(scenarios.indexOf(s)+1).padStart(22,'0'),store=new Map(),colors={background:-10985626,text:-16777216,highlightText:-1};
 const base=Array.from({length:48},(_,i)=>s.kind==='ja'?'海の灯りがゆれる '+i:s.kind==='ko'?'바다 위의 빛 '+i:s.kind==='traditional'?'原創的紙燈照著海面 '+i:s.kind==='zh'?'原创的纸灯照着海面 '+i:'Original quiet sea '+i);
 const words=s.kind==='layout'?base.flatMap(w=>[w,w.replaceAll(' ','  '),w.replaceAll(' ','\t')]):s.kind==='mixed'?[...Array.from({length:48},(_,i)=>'原创的纸灯照着海面 '+i),...base]:base;
 const canonical=s=>s.replace(/[ \t\f\v]+/g,' ').trim(),translation=w=>s.same||(s.kind==='mixed'&&w.startsWith('原创'))?w:'自写译文 '+canonical(w);
 const meta={id,title:'Original song '+scenarios.indexOf(s),artists:['Original artist '+scenarios.indexOf(s)],album:'Original album',duration:180},expires=Date.now()+60000;
 if(s.fallback)store.set('VerseLyrics.v1.cache',JSON.stringify({entries:[{key:'meta:'+id,value:meta,expires},{key:'palette:v1:'+id,value:{colors},expires}],cooldowns:{}}));
 const original=m.encodeDocument({lyrics:{language:s.source,syncType:'LINE_SYNCED',provider:'Original',providerDisplayName:'Original',lines:words.map((words,i)=>({words,startTimeMs:String(i*1000+1000)})),alternatives:[{language:s.target,lines:words.map(()=> 'old-official-translation')}]},colors},'protobuf');
 const record={trackName:meta.title,artistName:meta.artists[0],albumName:meta.album,duration:meta.duration,syncedLyrics:words.map((w,i)=>'['+String(Math.floor((i+1)/60)).padStart(2,'0')+':'+String((i+1)%60).padStart(2,'0')+']'+w).join('\n')};
 const results=[];let totalRequests=0,translatedQueries=0;
 for(let turn=0;turn<2;turn++){
  let finish,doneCount=0,active=0,peak=0;const done=new Promise(r=>finish=r),sample=()=>{peak=Math.max(peak,process.memoryUsage().heapUsed);};
  const ctx={$argument:{TARGET_LANGUAGE:s.target,FALLBACK_PROVIDER:'lrclib'},$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:{Accept:'application/x-protobuf'}},$response:{status:s.fallback?404:200,headers:{'Content-Type':'application/x-protobuf'},body:s.fallback?Buffer.from('missing'):original},$persistentStore:{read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}},setTimeout:()=>{throw Error('Unexpected plugin timer');},$done:r=>{doneCount++;if(active)throw Error('Completion before transport callback');sample();finish(r);},$httpClient:{get:(o,cb)=>{
   totalRequests++;active++;if(active!==1)throw Error('Overlapping transports');sample();const u=new URL(o.url);let body;
   if(u.host==='lrclib.net')body=JSON.stringify(record);
   else if(u.host==='translate.googleapis.com'){const rows=u.searchParams.getAll('q');translatedQueries+=rows.length;if(rows.length>64||o.url.length>6800)throw Error('Batch cap');body=JSON.stringify(rows.map(translation));}
   else throw Error('Unexpected host');
   setTimeout(()=>{active--;sample();cb(null,{status:200,headers:{}},o['binary-mode']===false?body:Buffer.from(body));},40);
  }}};
  global.gc();const before=process.memoryUsage().heapUsed,start=performance.now(),callsBefore=totalRequests;
  new vm.Script(script).runInNewContext(ctx);sample();const result=await done;sample();if(doneCount!==1)throw Error('done count');
  const bytes=Buffer.from(result.body),parsed=m.parseDocument(bytes,'application/x-protobuf');if(JSON.stringify(parsed.words)!==JSON.stringify(words))throw Error('Changed native lyrics');
  const cacheCharacters=store.get('VerseLyrics.v1.cache')?.length||0;if(cacheCharacters>64000)throw Error('Cache cap');
  results.push({ms:+(performance.now()-start).toFixed(3),requests:totalRequests-callsBefore,heapGrowth:peak-before,cacheCharacters,outputSHA256:createHash('sha256').update(bytes).digest('hex')});await new Promise(setImmediate);
 }
 if(results[0].outputSHA256!==results[1].outputSHA256||results[1].requests!==0)throw Error('Warm output/cache mismatch');
 console.log(JSON.stringify({coldRequests:results[0].requests,translatedQueries,warmRequests:results[1].requests,coldMs:results[0].ms,warmMs:results[1].ms,coldHeapGrowth:results[0].heapGrowth,cacheCharacters:results[0].cacheCharacters,outputSHA256:results[0].outputSHA256}));
}
