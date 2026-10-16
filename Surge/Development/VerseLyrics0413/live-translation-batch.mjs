import run from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics.js';
import {writeFileSync} from 'node:fs';
const words=Array.from({length:64},(_,i)=>'My original paper lantern number '+i+' floats home.');
const store=new Map(),calls=[],ctx={env:{TRANSLATION_ENABLED:true,FALLBACK_PROVIDER:'off'},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001',headers:new Headers({Accept:'application/json'})},response:new Response(JSON.stringify({lyrics:{language:'en',lines:words.map(words=>({words,startTimeMs:'0'})),alternatives:[]},colors:{background:-10985626,text:-16777216,highlightText:-1}}),{headers:{'Content-Type':'application/json'}}),storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v),getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:async(u,o)=>{
 const start=Date.now(),r=await fetch(u,{headers:o.headers,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(Math.ceil(o.timeout))});
 calls.push({host:new URL(u).host,status:r.status,queries:new URL(u).searchParams.getAll('q').length,urlLength:u.length,elapsedMs:Date.now()-start});return r;
}}};
const start=Date.now(),result=await run(ctx),output=result?.body?JSON.parse(Buffer.from(result.body)):null,count=output?.lyrics.alternatives?.[0]?.lines.filter(Boolean).length||0;
const report={at:new Date().toISOString(),scope:'Real existing public translation endpoint, compiled Egern module, 64 synthetic original sentences. No private account headers or copyrighted lyric text. This endpoint is not the documented paid Cloud Translation API; acceptance here is a snapshot, not a service contract.',inputRows:64,translatedRows:count,elapsedMs:Date.now()-start,calls,persistentCharacters:store.get('VerseLyrics.v1.cache')?.length||0};
writeFileSync(new URL('./live-translation-batch-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
if(count!==64||calls.length!==1||calls[0].queries!==64)process.exitCode=1;
