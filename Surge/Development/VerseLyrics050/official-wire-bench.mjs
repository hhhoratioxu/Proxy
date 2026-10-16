import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
if(process.argv[2]!=='child'){
  const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.4.16 core');const results=[];
  for(const [version,path] of [['0.4.16',baseline],['0.5.0',fileURLToPath(new URL('./core/spotify-lyrics.js',import.meta.url))]]){
    const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',path],{encoding:'utf8',timeout:30000,maxBuffer:8192});if(r.status!==0)throw Error(r.stderr);results.push({version,...JSON.parse(r.stdout)});
  }
  if(new Set(results.map(r=>r.outputSHA256)).size!==1)throw Error('Output changed');
  const report={at:new Date().toISOString(),scope:'200 official Protobuf parse/translation replacement cycles, 120 original synthetic rows. Separate Node VM processes under 32 MiB old-space, GC every 20 cycles. Counts cover explicit typed-array constructors, including from, not implicit views or host buffering. No network or phone memory measurement.',results};
  writeFileSync(new URL('./official-wire-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else{
  const source=readFileSync(process.argv[3],'utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function entry(ctx)');
  let count=0,bytes=0;const tracked=new Proxy(Uint8Array,{construct(t,args){const out=Reflect.construct(t,args);count++;bytes+=out.byteLength;return out;}}),ctx={Uint8Array:tracked};
  vm.runInNewContext(source+'\nthis.api={encodeDocument,parseDocument};',ctx);
  const words=Array.from({length:120},(_,i)=>'Original lantern '+i+' 中文𳈆🎵'),rows=words.map((_,i)=>'原创测试译文 '+i),doc={lyrics:{syncType:'LINE_SYNCED',provider:'Musixmatch',providerDisplayName:'Original',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[{language:'ja',lines:words.map(()=> 'old')} ]},colors:{background:-10985626,text:-16777216,highlightText:-1}};
  const input=ctx.api.encodeDocument(doc,'protobuf');count=bytes=0;
  let out=ctx.api.parseDocument(input,'application/x-protobuf').writeNative('zh-CN',rows);
  const single={constructors:count,requestedBytes:bytes,outputBytes:out.length};
  global.gc();const start=performance.now(),hash=createHash('sha256');let peak=process.memoryUsage().heapUsed;
  for(let i=0;i<200;i++){
    const p=ctx.api.parseDocument(input,'application/x-protobuf');if(p.words.length!==120)throw Error('lost words');out=p.writeNative('zh-CN',rows);hash.update(out);peak=Math.max(peak,process.memoryUsage().heapUsed);
    if(i%20===19){await new Promise(setImmediate);global.gc();}
  }
  console.log(JSON.stringify({cycles:200,singleReplacement:single,elapsedMs:+(performance.now()-start).toFixed(2),sampledMaxHeapBytes:peak,outputSHA256:hash.digest('hex')}));
}
