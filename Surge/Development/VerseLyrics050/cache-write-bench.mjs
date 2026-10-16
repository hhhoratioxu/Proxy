import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const scenarios=['metadata-new','translation-merge','fallback-new'],median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
if(process.argv[2]!=='child'){
  const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.4.16 workspace');const runs=[];
  for(let trial=0;trial<12;trial++)for(const scenario of scenarios){
    const versions=[['0.4.16',baseline],['0.5.0',fileURLToPath(new URL('.',import.meta.url))]];if(trial%2)versions.reverse();
    for(const [version,root]of versions){
      const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',root,scenario],{encoding:'utf8',timeout:30000,maxBuffer:8192});
      if(r.status!==0)throw Error(version+' '+scenario+' '+r.stderr);runs.push({trial,version,scenario,...JSON.parse(r.stdout)});
    }
  }
  const comparisons=scenarios.map(s=>{
    const rows=runs.filter(r=>r.scenario===s);if(new Set(rows.map(r=>r.outputSHA256)).size!==1)throw Error('Cache semantics changed '+s);
    return {scenario:s,...Object.fromEntries(['0.4.16','0.5.0'].map(v=>{const rs=rows.filter(r=>r.version===v);return [v,Object.fromEntries(['saveMs','sampledHeapGrowth','serializedCharacters','maxParsedCharacters','inputCharacters','outputCharacters'].map(k=>[k,median(rs.map(r=>r[k]))]))];}))};
  });
  const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'Twelve fresh processes per version/scenario, 32 MiB old-space, identical synthetic indexed cache. Import, fixture construction, scoped read and pending writes precede GC/measurement. Samples instrument JSON parse/stringify return boundaries and storage write. Measures save work only; instrumentation adds CPU overhead. No network or native app/VPN peak. All complete cache output hashes match the baseline.',comparisons,runs};
  writeFileSync(new URL('./cache-write-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(comparisons));
}else{
  const m=await import(pathToFileURL(process.argv[3]+'/core/spotify-lyrics.js')),scenario=process.argv[4],id=n=>String(n).padStart(22,'0'),KEY='VerseLyrics.v1.cache',stamp=2000000000000,expires=stamp+86400000;
  Date.now=()=>stamp;const entries=[],add=(key,value)=>entries.push({key,value,expires});
  for(let n=1;n<=20;n++){
    const words=Array.from({length:24},(_,i)=>'Original lantern '+n+' line '+i);
    add('meta:'+id(n),{id:id(n),title:'Lantern '+n,artists:['Ada'],album:'Quiet Walk',duration:180});
    add('lyrics:auto:'+id(n),{v:1,p:'qq',t:true,l:words.map((s,i)=>[i*2100,s])});
    add('translations:v1:zh-CN:'+id(n),{pairs:words.map(s=>[s,'自写译文 '+s])});
    add('palette:v1:'+id(n),{colors:{background:-10985626,text:-16777216,highlightText:-1}});
  }
  const parts=entries.map(e=>JSON.stringify(e)),raw='{"sizes":'+JSON.stringify(parts.map(s=>s.length))+',"entries":['+parts.join(',')+'],"cooldowns":{}}';if(raw.length>64000)throw Error('seed size');
  const store=new Map([[KEY,raw]]);let peak=0;const sample=()=>peak=Math.max(peak,process.memoryUsage().heapUsed);
  const ctx={storage:{get:k=>store.get(k),set:(k,v)=>{store.set(k,v);sample();},getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>store.set(k,JSON.stringify(v))}};
  const c=m.loadCache(ctx,scenario==='metadata-new'?{metadata:true}:{track:id(scenario==='translation-merge'?10:50),language:'zh-CN'});
  if(scenario==='metadata-new')c.put('meta:'+id(50),{id:id(50),title:'New Lantern',artists:['Ada'],album:'Quiet Walk',duration:180});
  else if(scenario==='translation-merge')c.put('translations:v1:zh-CN:'+id(10),{pairs:[['A new verse','新的诗句']]});
  else {c.put('lyrics:auto:'+id(50),{v:1,p:'qq',t:true,l:Array.from({length:48},(_,i)=>[i*2100,'New lantern original '+i])});c.put('translations:v1:zh-CN:'+id(50),{pairs:Array.from({length:48},(_,i)=>['New lantern original '+i,'新歌译文 '+i])});}
  const parse=JSON.parse,stringify=JSON.stringify;let maxParsedCharacters=0,serializedCharacters=0;
  JSON.parse=(s,...args)=>{const r=parse(s,...args);maxParsedCharacters=Math.max(maxParsedCharacters,String(s).length);sample();return r;};
  JSON.stringify=(value,...args)=>{const r=stringify(value,...args);serializedCharacters+=r?.length||0;sample();return r;};
  global.gc();const before=process.memoryUsage().heapUsed;peak=before;const start=performance.now();c.save();const saveMs=performance.now()-start;sample();JSON.parse=parse;JSON.stringify=stringify;
  const output=store.get(KEY);if(output===raw||output.length>64000||JSON.parse(output).entries.length>128)throw Error('invalid output');
  console.log(JSON.stringify({saveMs:+saveMs.toFixed(4),sampledHeapGrowth:peak-before,serializedCharacters,maxParsedCharacters,inputCharacters:raw.length,outputCharacters:output.length,outputSHA256:createHash('sha256').update(output).digest('hex')}));
}
