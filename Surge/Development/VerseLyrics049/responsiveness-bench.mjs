import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
if(!process.argv[2])throw Error('Pass unchanged 0.4.8 core file');
const baseline=await import(pathToFileURL(process.argv[2])),current=await import('./core/spotify-lyrics.js');
const KEY='VerseLyrics.v1.cache',id='0000000000000000000001',baseMeta={id,title:'Paper Lantern',album:'Quiet Walk',artists:['Ada North'],duration:180},colors={background:0xff4d545c|0,text:0xffc6ced7|0,highlightText:-1};
async function scenario(core,kind){
 const real=Date.now;let now=real(),calls=0;Date.now=()=>now;
 try{
  const chinese=kind==='chinese',meta=chinese?{...baseMeta,title:'自写灯笼',artists:['测试歌手']}:baseMeta,store=new Map();
  const reply=x=>new Response(JSON.stringify(x));
  async function get(u,o){calls++;
   const latency=kind==='translation'?1700:u.includes('lrclib')?800:u.includes('client_search')?1000:800;
   now+=Math.min(latency,o.timeout);if(latency>o.timeout||kind==='timeout'&&u.includes('lrclib'))throw Error('native http timeout');
   if(u.includes('translate.googleapis'))return reply(new URL(u).searchParams.getAll('q').map((s,i)=>'译文 '+i));
   if(u.includes('lrclib'))return new Response('[]',{status:u.includes('/get?')?404:200});
   if(u.includes('client_search'))return reply({code:0,data:{song:{list:[{songname:meta.title,albumname:meta.album,singer:[{name:meta.artists[0]}],interval:180,songmid:'test1'}]}}});
   if(u.includes('fcg_query_lyric'))return reply({code:0,lyric:'[00:01]Original test line.\n[00:03]Second original line.'});
   if(u.includes('163.com'))return reply({code:200,result:{songs:[]}});if(u.includes('kugou'))return reply({status:200,candidates:[]});if(u.includes('kuwo'))return reply({abslist:[]});return reply({data:[]});
  }
  const ctx={env:{TRANSLATION_ENABLED:kind==='translation',FALLBACK_PROVIDER:'auto'},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:'application/json'})},response:new Response('missing',{status:404}),storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get,post:get}};
  if(kind==='translation')ctx.response=reply({lyrics:{lines:Array.from({length:96},(_,i)=>({words:'Original phrase '+i,startTimeMs:'0'}))},colors});
  const cache=core.loadCache(ctx);cache.put('meta:'+id,meta);cache.put('palette:v1:'+id,{colors});cache.save();const start=now,out=await core.default(ctx),doc=out?.body?JSON.parse(Buffer.from(out.body).toString()==='missing'?'null':Buffer.from(out.body)):null;
  return {elapsedModelMs:Math.round(now-start),calls,lyricsAvailable:!!doc?.lyrics?.lines?.length,translatedLines:doc?.lyrics?.alternatives?.[0]?.lines.filter(Boolean).length||0,leasedSlots:JSON.parse(store.get('VerseLyrics.v1.network')||'[]').length,cacheCharacters:(store.get(KEY)||'').length};
 }finally{Date.now=real;}
}
const cases=[];for(const kind of ['timeout','chinese','translation'])cases.push({scenario:kind,baseline:await scenario(baseline,kind),current:await scenario(current,kind)});
const report={at:new Date().toISOString(),scope:'Deterministic network-latency fault model through complete core, not observed device speed or measured VPN memory. Same latency model and metadata for 0.4.8 and 0.4.9.',cases};writeFileSync(new URL('./responsiveness-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
