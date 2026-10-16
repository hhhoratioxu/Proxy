import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
if(process.argv[2]==='child'){
 const m=await import(pathToFileURL(process.argv[3]));global.gc();const baseline=process.memoryUsage().heapUsed,start=performance.now();
 const folded=m.metadataNormal('那頁夏天 王俊凱 國語');const firstFoldMs=performance.now()-start,allocated=process.memoryUsage().heapUsed-baseline;global.gc();const retained=process.memoryUsage().heapUsed-baseline;
 const payload=Buffer.from(JSON.stringify({lyrics:{lines:[{words:'Original memory fixture.',startTimeMs:'1000'}]},padding:'x'.repeat(1572864)}));let reads=0;
 const store=new Map(),ctx={env:{TRANSLATION_ENABLED:true},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+'1'.padStart(22,'0'),headers:new Headers({Accept:'application/json'})},response:{status:200,headers:new Headers({'Content-Type':'application/json','Content-Length':String(payload.length)}),arrayBuffer:async()=>{reads++;return payload.buffer.slice(payload.byteOffset,payload.byteOffset+payload.byteLength);}},storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)},http:{get:async()=>new Response(JSON.stringify(['自写内存测试译文']))}};
 global.gc();const before=process.memoryUsage().heapUsed;const out=await m.default(ctx);const after=process.memoryUsage().heapUsed;
 console.log(JSON.stringify({folded,firstFoldMs,firstFoldAllocatedBytes:allocated,retainedFoldHeapDeltaBytes:retained,inputBytes:payload.length,bodyReads:reads,passthrough:out===undefined,outputBytes:out?.body?.length||0,processingHeapDeltaBytes:after-before,maxRSSKiB:process.resourceUsage().maxRSS}));
}else{
 const old=process.argv[2];if(!old)throw Error('Pass unmodified 0.4.5 core');const results=[];
 for(const [version,source]of [['0.4.5',old],['0.4.6',fileURLToPath(new URL('./core/spotify-lyrics.js',import.meta.url))]]){
  const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',source],{encoding:'utf8',timeout:30000,maxBuffer:16384});if(r.status!==0)throw Error(r.stderr.slice(-1000));results.push({version,...JSON.parse(r.stdout)});
 }
 if(results[0].folded!==results[1].folded||results[1].bodyReads!==0||!results[1].passthrough)throw Error('memory guard regression');
 const evidence={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'Separate Node processes with 32 MiB old-space. First Han normalization and a declared 1.5 MiB native body. Sampled heap deltas are not complete peaks or phone/VPN memory.',results};writeFileSync(new URL('./memory-results.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}
