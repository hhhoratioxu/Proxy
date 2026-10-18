import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 1.0.0 baseline');
const originalNow=Date.now,report={version:'3.0.0',baseline:'1.0.0',scope:'Synthetic source responses, no real HTTP latency. Compare first search with one transiently unavailable source, then an explicit retry after its 60-second server cooldown. This measures request counts, not real load times.',runs:[]};
for(const [version,root]of [['baseline',baseline],['candidate',new URL('.',import.meta.url).pathname]]){
 let now=originalNow(),recovered=false;Date.now=()=>now;
 try{
  const module=await import(pathToFileURL(root+'/core/spotify-lyrics.js')),id='0000000000000000000001',meta={id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:300},KEY='VerseLyrics.v1.cache',store=new Map();
  const reply=x=>new Response(JSON.stringify(x));let calls=[];
  function network(u){
   calls.push(u);
   if(u.includes('lrclib'))return u.includes('/get?')?new Response('{}',{status:404}):reply([]);
   if(u.includes('/soso/'))return reply({code:0,data:{song:{list:[]}}});
   if(u.includes('/cloudsearch/'))return recovered?reply({code:200,result:{songs:[{id:9,name:meta.title,ar:[{name:meta.artists[0]}],al:{name:meta.album},dt:300000}]}}):new Response('busy',{status:503});
   if(u.includes('/api/song/lyric'))return reply({code:200,lrc:{lyric:'[00:01]Original lantern one.\n[00:03]Original lantern two.'}});
   if(u.includes('kugou'))return reply({status:200,candidates:[]});
   if(u.includes('kuwo'))return reply({abslist:[]});
   if(u.includes('/suggest/'))return reply({data:[]});
   throw Error('Unexpected service');
  }
  const ctx={env:{},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>network(u),post:async u=>network(u)}};
  const state=()=>({cache:module.loadCache(ctx,{track:id,language:'zh-CN'}),settings:module.settings({FALLBACK_PROVIDER:'auto'}),deadline:Date.now()+10000});
  const first=state();if(await module.backup(ctx,meta,first)!==null)throw Error('Unexpected first lyrics');first.cache.save();const firstCalls=calls.length,firstBytes=(store.get(KEY)||'').length;
  now+=61000;recovered=true;calls=[];const second=state(),doc=await module.backup(ctx,meta,second);if(!doc)throw Error('Retry lost lyrics');second.cache.save();
  const packed=module.packLyrics(doc),sha256=createHash('sha256').update(JSON.stringify(packed)).digest('hex');
  report.runs.push({version,firstCalls,retryCalls:calls.length,retryProviders:calls.map(u=>new URL(u).hostname),firstCacheCharacters:firstBytes,finalCacheCharacters:(store.get(KEY)||'').length,outputSHA256:sha256});
 }finally{Date.now=originalNow;}
}
if(new Set(report.runs.map(x=>x.outputSHA256)).size!==1)throw Error('Retry output differs');
if(report.runs[0].retryCalls!==5||report.runs[1].retryCalls!==2)throw Error('Unexpected source progression');
writeFileSync(new URL('./source-progress-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

