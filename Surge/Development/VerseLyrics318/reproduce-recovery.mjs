import {writeFileSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
const base=process.argv[2];if(!base)throw Error('Pass immutable 3.1.7 source workspace');
const roots={baseline:base,candidate:fileURLToPath(new URL('.',import.meta.url))};
const words=['오늘은 바람이 조용합니다','Please stay with me','다시 함께 걸어요'],answers=['今天的风很平静','请留在我身边','再次一起走吧'],id='6n7jFn3rgC6qWjsYaPJfB8',KEY='VerseLyrics.v1.cache',results=[];
for(const [version,root] of Object.entries(roots)){
 const {translate,loadCache}=await import(pathToFileURL(root+'/core/spotify-lyrics.js'));
 for(const mode of ['stale-identity','single-null','service-identity']){
  const store=new Map(),calls=[];const ctx={env:{},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const q=new URL(u).searchParams.getAll('q');calls.push(q);return new Response(JSON.stringify(mode==='single-null'?[answers[0],null,answers[2]]:mode==='service-identity'?q:answers));}}};
  const state={settings:{language:'zh-CN'},cache:loadCache(ctx),deadline:Date.now()+10000};if(mode==='stale-identity')state.cache.put('translations:v1:zh-CN:'+id,{pairs:words.map(s=>[s,s])});
  const cold=await translate(ctx,words,state,'ko'),coldHTTP=calls.length;state.cache.save();
  const warm=await translate(ctx,words,{...state,cache:loadCache(ctx),deadline:Date.now()+10000},'ko');
  results.push({version,mode,coldChanged:cold.changed,coldHTTP,warmChanged:warm.changed,warmHTTP:calls.length-coldHTTP,cacheCharacters:(store.get(KEY)||'').length});
 }
}
const report={at:new Date().toISOString(),scope:'Self-written Korean/English rows and explicitly seeded failure states, using the reported song ID solely as a cache key. No captured Spotify lyrics or user cache. Both readable cores use the same harness.',results};
writeFileSync('recovery-reproduction-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
const get=(v,m)=>results.find(r=>r.version===v&&r.mode===m);if(get('baseline','stale-identity').coldChanged!==0||get('candidate','stale-identity').coldChanged!==3||get('baseline','single-null').coldChanged!==0||get('candidate','single-null').coldChanged!==2||get('candidate','single-null').warmHTTP!==0)throw Error('Repair not reproduced');

