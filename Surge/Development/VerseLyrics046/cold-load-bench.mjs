import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
if(process.argv[2]==='child'){
 const m=await import(pathToFileURL(process.argv[3])),store=new Map(),results=[];let requests=0,active=0,peak=0,current;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function http(u){requests++;active++;peak=Math.max(peak,active);await wait(12);let r;
  if(u.includes('lrclib'))r=new Response(u.includes('/get?')?'{}':'[]',{status:u.includes('/get?')?404:200});
  else if(u.includes('client_search_cp'))r=new Response(JSON.stringify({code:0,data:{song:{list:[{songname:current.title,albumname:current.album,singer:[{name:current.artists[0]}],interval:180,songmid:'TEST'}]}}}));
  else if(u.includes('fcg_query_lyric'))r=new Response(JSON.stringify({retcode:0,lyric:'[00:01]Original cold fixture line.\n[00:03]Another original fixture line.'}));
  else if(u.includes('open.spotify'))r=new Response('missing',{status:404});
  else r=new Response(JSON.stringify(new URL(u).searchParams.getAll('q').map(s=>'自写译文 '+s)));
  active--;return r;
 }
 for(let i=1;i<=12;i++){
  const id=String(i).padStart(22,'0');current={id,title:'Lantern '+i,artists:['Ada North'],album:'Quiet Walk',duration:180};
  const ctx={env:{TRANSLATION_ENABLED:true},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:'application/json'})},response:new Response('missing',{status:404}),storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:http,post:http}};
  const cache=m.loadCache(ctx);cache.put('meta:'+id,current);cache.save();const before=requests,start=performance.now(),out=await m.default(ctx);if(out?.status!==200)throw Error('no lyrics');const j=JSON.parse(Buffer.from(out.body));if(j.lyrics.lines.length!==2||j.lyrics.alternatives[0].lines.length!==2)throw Error('native output');results.push({song:i,httpCalls:requests-before,elapsedMs:Math.round(performance.now()-start)});
 }
 console.log(JSON.stringify({results,totalHTTPCalls:requests,maxInFlight:peak}));
}else{
 const baseline=process.argv[2];if(!baseline)throw Error('Pass unmodified 0.4.5 core');const results=[];for(const [version,source]of [['0.4.5',baseline],['0.4.6',fileURLToPath(new URL('./core/spotify-lyrics.js',import.meta.url))]]){const r=spawnSync(process.execPath,['--max-old-space-size=32',fileURLToPath(import.meta.url),'child',source],{encoding:'utf8',timeout:30000,maxBuffer:16384});if(r.status!==0)throw Error(r.stderr.slice(-800));results.push({version,...JSON.parse(r.stdout)});}
 const evidence={at:new Date().toISOString(),scope:'Twelve initially uncached songs by the same artist, native metadata already intercepted. Every fake HTTP call waits 12 ms. Not actual mobile latency. Every source result and native output is checked.',results};writeFileSync(new URL('./cold-load-results.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}
