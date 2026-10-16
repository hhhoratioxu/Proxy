import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {parseDocument,fields,text} from './core/spotify-lyrics.js';
const roots=[['0.4.13',process.argv[2]],['0.4.14',new URL('.',import.meta.url).pathname]];
const ids=['76XUZSb13QUuj1HECY4Hvo','0VjIjW4GlUZAMYd2vXMi3b','4uLU6hMCjMI75M1A2tKUQC','7qiZfU4dY1lWllzX7mPBI3','0tgVpDi06FyKpA1z0VMD4v','4u7Ene7wjrC6dGE9rGQeFJ','2WfaOiMkCvy7F5fcp2zZ8L','2Fxmhks0bxGSBdJ92vM42m'];
const results=[];
for(const [index,id] of ids.entries())for(const [version,root] of index%2?[...roots].reverse():roots){
 const script=readFileSync(root+'/runtime/Loon/script/SpotifyLyrics.js','utf8'),store=new Map(),calls=[];let active=0,peak=0,doneCalls=0;
 async function invoke(){let finish;const done=new Promise(r=>finish=r);
  function request(method){return(o,cb)=>{active++;peak=Math.max(peak,active);const start=Date.now(),r={host:new URL(o.url).host,path:new URL(o.url).pathname,method};calls.push(r);
   fetch(o.url,{method,headers:o.headers,body:o.body,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(Math.ceil(o.timeout))}).then(async response=>{const bytes=new Uint8Array(await response.arrayBuffer());r.status=response.status;r.bytes=bytes.length;r.elapsedMs=Date.now()-start;let body=bytes;if(!o['binary-mode'])try{body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{}active--;cb(null,{status:response.status,headers:Object.fromEntries(response.headers)},body);}).catch(error=>{active--;r.error=error.name;r.elapsedMs=Date.now()-start;cb(error.message);});
  };}
  const ctx={$argument:{FALLBACK_PROVIDER:'auto',TARGET_LANGUAGE:'zh-CN'},$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:{Accept:'application/x-protobuf'}},$response:{status:404,headers:{},body:Buffer.from('missing')},$persistentStore:{read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}},$done:r=>{if(active)throw Error('pending callback');doneCalls++;finish(r);},$httpClient:{get:request('GET'),post:request('POST')}};
  new vm.Script(script).runInNewContext(ctx);return done;
 }
 const start=Date.now(),out=await invoke(),elapsedMs=Date.now()-start,bytes=out.status===200?new Uint8Array(out.body):null,doc=bytes?parseDocument(bytes,'application/x-protobuf'):null;
 let provider=null,translationLines=0,synced=false;if(bytes){const lyrics=fields(fields(bytes).find(f=>f.number===1).payload),p=lyrics.find(f=>f.number===3),alt=lyrics.find(f=>f.number===9);provider=p?text(p.payload):null;synced=lyrics.find(f=>f.number===1)?.value===1;if(alt)translationLines=fields(alt.payload).filter(f=>f.number===2&&text(f.payload).trim()).length;}
 const firstCalls=calls.length,repeat=Date.now();await invoke();
 const cache=JSON.parse(store.get('VerseLyrics.v1.cache')||'{}');
 const item={id,version,runtimeSHA256:createHash('sha256').update(script).digest('hex'),title:cache.entries?.find(e=>e.key==='meta:'+id)?.value?.title,matched:!!doc,provider,lineCount:doc?.words.length||0,translationLines,synced,elapsedMs,calls:calls.slice(0,firstCalls),responseBytes:calls.slice(0,firstCalls).reduce((a,r)=>a+(r.bytes||0),0),repeatElapsedMs:Date.now()-repeat,repeatHTTP:calls.length-firstCalls,maxActive:peak,doneCalls,persistentCharacters:store.get('VerseLyrics.v1.cache')?.length||0};
 results.push(item);console.log(JSON.stringify({id,version,title:item.title,matched:item.matched,provider,lineCount:item.lineCount,translationLines,elapsedMs,requests:firstCalls,bytes:item.responseBytes}));
}
const report={at:new Date().toISOString(),scope:'Alternating versions of actual compiled Loon runtime under a Node VM mock host, simulated Spotify 404, empty cache, real public HTTP including POST. No tokens, lyric text or page session fields saved. Songs are samples, not a representative catalog or a claim that Spotify lacks their official lyrics. This is not phone/VPN validation. Sequential runs and network fluctuations preclude controlled latency conclusions.',results};
writeFileSync(new URL('./live-coverage-comparison.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
