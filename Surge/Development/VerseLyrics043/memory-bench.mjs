import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
if(process.argv[2]==='child'){
 const {parseDocument}=await import(pathToFileURL(process.argv[3]));
 const input=JSON.stringify({lyrics:{lines:[{words:'This is an original stress-test line.',startTimeMs:'1000'}]},padding:'x'.repeat(1572864)}),bytes=new Uint8Array(Buffer.from(input));
 global.gc?.();const before=process.memoryUsage().heapUsed,start=performance.now();
 const doc=parseDocument(bytes,'application/json');const decoded=process.memoryUsage().heapUsed;
 const output=doc.writeNative('zh-CN',['自写压力测试文本']);const rewritten=process.memoryUsage().heapUsed;
 const parsed=JSON.parse(Buffer.from(output).toString());if(parsed.padding.length!==1572864||parsed.lyrics.alternatives[0].lines[0]!=='自写压力测试文本')throw Error('corruption');
 console.log(JSON.stringify({inputBytes:bytes.length,outputBytes:output.length,elapsedMs:Math.round(performance.now()-start),baselineHeapBytes:before,afterDecodeHeapBytes:decoded,afterRewriteHeapBytes:rewritten,maxRSSKiB:process.resourceUsage().maxRSS}));
}else{
 const old=process.argv[2];if(!old)throw Error('Pass the unmodified 0.4.2 core path');
 const current=fileURLToPath(new URL('./core/spotify-lyrics.js',import.meta.url)),results=[];
 for(const [version,source,heapMiB]of [['0.4.2',old,256],['0.4.3',current,256],['0.4.3',current,32]]){
  const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size='+heapMiB,fileURLToPath(import.meta.url),'child',source],{encoding:'utf8',timeout:30000,maxBuffer:16384});
  if(r.status!==0)throw Error(version+' benchmark failed: '+r.signal+' '+r.stderr.slice(-600));
  results.push({version,heapMiB,...JSON.parse(r.stdout)});
 }
 writeFileSync(new URL('./memory-results.json',import.meta.url),JSON.stringify({environment:process.version+' '+process.platform+' '+process.arch,note:'Synthetic Node.js JSON decode and native translation rewrite. RSS includes the Node process; not an iPhone RAM measurement.',results},null,2)+'\n');
 console.log(JSON.stringify(results));
}
