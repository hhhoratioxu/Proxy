import {readFileSync,writeFileSync} from 'node:fs';
import {parseMetadata,backup,loadCache} from './core/spotify-lyrics.js';
const f=JSON.parse(readFileSync(new URL('./core/test/fixtures/target-song.json',import.meta.url))),meta=parseMetadata(Buffer.from(f.metadata_base64,'base64'),f.track_hex).meta;
const calls=[],store=new Map();
async function request(url,o){const started=Date.now(),r=await fetch(url,{method:o.body===undefined?'GET':'POST',headers:o.headers,body:o.body,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(Math.ceil(o.timeout))});const bytes=new Uint8Array(await r.arrayBuffer());calls.push({host:new URL(url).host,path:new URL(url).pathname,status:r.status,bytes:bytes.length,elapsedMs:Date.now()-started});return new Response(bytes,{status:r.status,headers:r.headers});}
const ctx={storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)},http:{get:request,post:request}};
const state={settings:{provider:'auto'},cache:loadCache(ctx),deadline:Date.now()+10000},start=Date.now();
const doc=await backup(ctx,meta,state);
const evidence={at:new Date().toISOString(),core:'0.4.8',scope:'Real unauthenticated lyric-source HTTP using public fixture metadata; no Spotify client or UI. No lyrics retained in evidence.',track:meta.id,title:meta.title,artist:meta.artists,matched:!!doc,provider:doc?.lyrics.provider,lineCount:doc?.lyrics.lines.length,syncType:doc?.lyrics.syncType,elapsedMs:Date.now()-start,attempts:state.attempts,calls};
writeFileSync(new URL('./live-source-results.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
