import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
if(process.argv[2]==='child'){
 const m=await import(pathToFileURL(process.argv[3])),id=n=>String(n).padStart(22,'0'),store=new Map(),ctx={storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))}};
 const seed=m.loadCache(ctx);
 for(let n=1;n<=12;n++){
  const words=Array.from({length:24},(_,i)=>`Original lantern song ${n}, line ${i}.`);
  seed.put('meta:'+id(n),{id:id(n),title:'Lantern '+n,artists:['Ada North'],album:'Quiet Walk',duration:180});
  seed.put('lyrics:auto:'+id(n),{v:1,p:'qq',t:true,l:words.map((s,i)=>[i*2000+1000,s])});
  seed.put('translations:v1:zh-CN:'+id(n),{pairs:words.map((s,i)=>[s,`自写译文 ${n} ${i}。`])});
  seed.put('palette:v1:'+id(n),{colors:{background:-11709348,text:-3748137,highlightText:-1}});
 }
 seed.save();global.gc();const before=process.memoryUsage().heapUsed,caches=[],start=performance.now();
 for(let i=0;i<32;i++){const cache=m.loadCache(ctx,{track:id(i%12+1),language:'zh-CN'});if(!cache.get('lyrics:auto:'+id(i%12+1)))throw Error('missing cached lyrics');caches.push(cache);}
 const loadMs=performance.now()-start,allocated=process.memoryUsage().heapUsed-before;global.gc();const retained=process.memoryUsage().heapUsed-before;
 const sizes=caches.map(c=>({entries:c.entries.length,characters:JSON.stringify(c.entries).length}));
 console.log(JSON.stringify({instances:caches.length,persistentCacheCharacters:store.get('VerseLyrics.v1.cache').length,meanLiveEntries:sizes.reduce((n,x)=>n+x.entries,0)/sizes.length,meanLiveEntryCharacters:sizes.reduce((n,x)=>n+x.characters,0)/sizes.length,allocatedHeapDeltaBytes:allocated,retainedHeapDeltaBytes:retained,loadMs:Math.round(loadMs*100)/100}));
}else{
 const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.4.8 core');const results=[];
 for(const [version,source] of [['0.4.8',baseline],['0.4.9',fileURLToPath(new URL('./core/spotify-lyrics.js',import.meta.url))]]){
  const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',source],{encoding:'utf8',timeout:30000,maxBuffer:8192});if(r.status!==0)throw Error(r.stderr);results.push({version,...JSON.parse(r.stdout)});
 }
 if(results[0].persistentCacheCharacters!==results[1].persistentCacheCharacters||results[1].meanLiveEntryCharacters!==results[0].meanLiveEntryCharacters)throw Error('live cache scope regressed');
 const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'32 independently retained cache objects over the same 12-song store, separate Node processes with 32 MiB old-space. This isolates cache object retention, not allowed native concurrency or phone/VPN memory. All bytes are synthetic original fixtures.',results};writeFileSync(new URL('./cache-scope-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
