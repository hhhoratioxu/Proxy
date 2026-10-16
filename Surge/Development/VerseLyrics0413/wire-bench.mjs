import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
if(process.argv[2]!=='child'){
 const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.4.12 core');const results=[];
 for(const [version,path] of [['0.4.12',baseline],['0.4.13',fileURLToPath(new URL('./core/spotify-lyrics.js',import.meta.url))]]){
  const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',path],{encoding:'utf8',timeout:30000,maxBuffer:8192});
  if(r.status!==0)throw Error(r.stderr);results.push({version,...JSON.parse(r.stdout)});
 }
 if(new Set(results.map(r=>r.outputSHA256)).size!==1)throw Error('wire output changed');
 const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'200 encode/parse cycles of a 120-line original synthetic bilingual protobuf document. Separate Node VM processes, 32 MiB old-space, GC every 20 cycles. Typed-array constructor counts and requested bytes cover explicit constructors (including Uint8Array.from), not engine-internal views or total native allocations. No network, Spotify UI or phone/VPN process measurement.',results};
 writeFileSync(new URL('./wire-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else{
 const source=readFileSync(process.argv[3],'utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function entry(ctx)');
 let count=0,bytes=0;
 const tracked=C=>new Proxy(C,{construct(t,args){const out=Reflect.construct(t,args);count++;bytes+=out.byteLength;return out;}});
 const context={Uint8Array:tracked(Uint8Array),Uint32Array:tracked(Uint32Array)};
 vm.runInNewContext(source+'\nthis.api={encodeDocument,parseDocument};',context);
 const words=Array.from({length:120},(_,i)=>'Original paper lantern '+i+' 中文𳈆🎵'),doc={lyrics:{syncType:'LINE_SYNCED',provider:'qq',providerDisplayName:'QQ 音乐',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[{language:'zh-CN',lines:words.map((_,i)=>'原创测试译文 '+i)}]},colors:{background:-10985626,text:-16777216,highlightText:-1}};
 let output=context.api.encodeDocument(doc,'protobuf');const single={constructors:count,requestedBytes:bytes,outputBytes:output.length};count=bytes=0;
 global.gc();const before=process.memoryUsage().heapUsed,start=performance.now(),hash=createHash('sha256');let peak=before;
 for(let i=0;i<200;i++){
  output=context.api.encodeDocument(doc,'protobuf');const p=context.api.parseDocument(output,'application/x-protobuf');
  if(p.words.length!==120||p.words[119]!==words[119])throw Error('words changed');hash.update(output);peak=Math.max(peak,process.memoryUsage().heapUsed);
  if(i%20===19){await new Promise(setImmediate);global.gc();}
 }
 const elapsed=performance.now()-start;global.gc();
 console.log(JSON.stringify({cycles:200,singleFallbackEncode:single,elapsedMs:+elapsed.toFixed(2),sampledMaxHeapBytes:peak,retainedHeapBytes:process.memoryUsage().heapUsed,outputSHA256:hash.digest('hex')}));
}
