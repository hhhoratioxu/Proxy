import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url)));
const release=read('./release-state.json'),production=read('./production-manifest.json'),runtime=read('./runtime-manifest.json');
const targets=[...production.map(x=>({...x,ref:'main'})),...runtime.map(x=>({...x,ref:release.runtime}))];
const results=[];
for(let i=0;i<targets.length;i+=5){
 const group=await Promise.allSettled(targets.slice(i,i+5).map(async x=>{
  const url='https://raw.githubusercontent.com/hhhoratioxu/Proxy/'+x.ref+'/'+x.path+(x.ref==='main'?'?v='+release.commit:'');
  let error;
  for(let attempt=0;attempt<3;attempt++){
   try{const r=await fetch(url,{headers:{'Cache-Control':'no-cache'},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer()),sha=createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),sha256=createHash('sha256').update(b).digest('hex');if(sha!==x.sha||sha256!==x.sha256)throw Error('hash mismatch');return {path:x.path,ref:x.ref,url,bytes:b.length,sha,sha256,status:r.status};}catch(e){error=e;if(attempt<2)await new Promise(r=>setTimeout(r,2000*(attempt+1)));}
  }
  throw Error(x.path+': '+error.message);
 }));
 for(const r of group){if(r.status==='rejected')throw r.reason;results.push(r.value);}
}
writeFileSync(new URL('./public-verification.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),commit:release.commit,runtime:release.runtime,all_match:true,results},null,2)+'\n');console.log(JSON.stringify({public_resources:results.length,all_hashes_match:true,commit:release.commit,runtime:release.runtime}));
