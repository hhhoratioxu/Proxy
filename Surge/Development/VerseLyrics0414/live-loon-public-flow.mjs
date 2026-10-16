import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseDocument,fields,text,existingPalette} from './core/spotify-lyrics.js';
const script=readFileSync(new URL('./runtime/Loon/script/SpotifyLyrics.js',import.meta.url),'utf8'),results=[];
for(const id of ['76XUZSb13QUuj1HECY4Hvo','0VjIjW4GlUZAMYd2vXMi3b']){
  const store=new Map(),calls=[];let active=0,maxActive=0,doneCalls=0;
  async function invoke(){
    let finish;const done=new Promise(r=>finish=r);
    const ctx={$argument:{FALLBACK_PROVIDER:'auto',TARGET_LANGUAGE:'zh-CN'},$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:{Accept:'application/x-protobuf'}},$response:{status:404,headers:{},body:Buffer.from('missing')},
      $persistentStore:{read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}},$done:r=>{if(active)throw Error('pending native callback');doneCalls++;finish(r);},$httpClient:{get:(o,cb)=>{
        active++;maxActive=Math.max(maxActive,active);const start=Date.now(),record={host:new URL(o.url).host,path:new URL(o.url).pathname,binary:o['binary-mode']};calls.push(record);
        fetch(o.url,{headers:o.headers,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(Math.ceil(o.timeout))}).then(async r=>{
          const bytes=new Uint8Array(await r.arrayBuffer());record.status=r.status;record.responseBytes=bytes.length;record.elapsedMs=Date.now()-start;
          let body=bytes;if(!o['binary-mode'])try{body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{}
          active--;cb(null,{status:r.status,headers:Object.fromEntries(r.headers)},body);
        }).catch(error=>{active--;record.error=error.name;record.elapsedMs=Date.now()-start;cb(error.message);});
      }}};
    new vm.Script(script).runInNewContext(ctx);return done;
  }
  const start=Date.now(),result=await invoke(),elapsedMs=Date.now()-start,matched=result.status===200,bytes=matched?new Uint8Array(result.body):null,p=matched?parseDocument(bytes,'application/x-protobuf'):null;
  let translated=0;if(matched){const inner=fields(fields(bytes).find(f=>f.number===1).payload),alt=inner.find(f=>f.number===9);if(alt)translated=fields(alt.payload).filter(f=>f.number===2&&text(f.payload).trim()).length;}
  const count=calls.length,again=Date.now();await invoke();
  results.push({id,matched,lineCount:p?.words.length||0,translationLines:translated,colors:p?existingPalette(bytes,p):null,elapsedMs,calls:calls.slice(0,count),repeatElapsedMs:Date.now()-again,repeatHTTP:calls.length-count,maxActiveHTTP:maxActive,doneCalls,persistentCharacters:store.get('VerseLyrics.v1.cache')?.length||0});
}
const report={at:new Date().toISOString(),scope:'Actual compiled Loon script under Node VM with mocked Loon storage/HTTP bridge, simulated Spotify 404, empty cache and real public metadata/source/translation requests. HTTP bridge emulates documented UTF-8 string/binary fallback. No user credentials, lyrics or embedded page/session data retained. Not on-device API or VPN verification.',results};
writeFileSync(new URL('./live-loon-public-flow-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
