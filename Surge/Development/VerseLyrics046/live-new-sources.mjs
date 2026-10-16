import {writeFileSync} from 'node:fs';
import {sourceLyrics,loadCache} from './core/spotify-lyrics.js';
const results=[];
for(const [provider,meta] of [
 ['kugou',{title:'小幸运',artists:['田馥甄'],album:'我的少女时代 电影原声带',duration:263.862}],
 ['kuwo',{title:'我的祖国-《我和我的家乡》电影青春推广曲',artists:['韩昊霖','小辣李嘉琦','王俊凯','王源','杨紫','合唱团'],album:'我和我的家乡 电影原声大碟',duration:300}],
 ['lyricsovh',{title:'Never Gonna Give You Up',artists:['Rick Astley'],album:'Reeling In The Decades',duration:211}]
]){
 const calls=[],start=Date.now();
 async function request(url,o){const at=Date.now();try {const r=await fetch(url,{method:o.body?'POST':'GET',body:o.body,headers:o.headers,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(Math.ceil(o.timeout))}),bytes=new Uint8Array(await r.arrayBuffer());calls.push({host:new URL(url).host,path:new URL(url).pathname,status:r.status,bytes:bytes.length,elapsedMs:Date.now()-at});return new Response(bytes,{status:r.status,headers:r.headers});}catch(e){calls.push({host:new URL(url).host,path:new URL(url).pathname,error:e.name,elapsedMs:Date.now()-at});throw e;}}
 const ctx={storage:{getJSON:()=>null,setJSON:()=>{}},http:{get:request,post:request}},state={cache:loadCache(ctx),deadline:Date.now()+6500,sourceBudget:{requests:0,bytes:0},attemptBudget:{requests:0,limit:3}};
 let doc,error;try{doc=await sourceLyrics(ctx,provider,meta,state);}catch(e){error=e.message;}
 const row={provider,title:meta.title,artists:meta.artists,matched:!!doc,error,lineCount:doc?.lyrics.lines.length,syncType:doc?.lyrics.syncType,elapsedMs:Date.now()-start,usage:state.sourceBudget,calls};results.push(row);console.log(JSON.stringify(row));
}
writeFileSync(new URL('./live-new-sources-results.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),core:'0.4.6',scope:'Real public service HTTP. Metadata cases selected from service catalogs, not Spotify device acceptance. No lyric text, access keys or user credentials retained.',results},null,2)+'\n');
