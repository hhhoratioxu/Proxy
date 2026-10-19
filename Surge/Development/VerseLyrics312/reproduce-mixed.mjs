import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const rows=['我愛你 baby','請說：hello，還有 goodbye！','原創紙燈'],id='0000000000000000000001',results=[];
for(const [version,root]of [['3.1.1',process.argv[2]],['3.1.2',new URL('.',import.meta.url).pathname]]){
 const {translate,loadCache}=await import(pathToFileURL(root+'/core/spotify-lyrics.js'));
 for(const cache of ['empty','identity','conversion']){
  const store=new Map(),calls=[],ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const q=new URL(u).searchParams.getAll('q');calls.push(q);return new Response(JSON.stringify(q.map(s=>[s==='baby'?'宝贝':s==='hello\ngoodbye'?'你好\n再见':s,'en'])));}}};const state={settings:{language:'zh-CN'},cache:loadCache(ctx),deadline:Date.now()+10000};
  if(cache!=='empty')state.cache.put('translations:v1:zh-CN:'+id,{pairs:rows.slice(0,2).map(s=>[s,cache==='identity'?s:s.replace('愛','爱').replace('請','请').replace('還','还')])});
  const r=await translate(ctx,rows,state,'zh');assert.equal(r.changed,version==='3.1.1'?0:2);assert.equal(calls.length,version==='3.1.1'?0:1);if(version==='3.1.2')assert.deepEqual(r.translations,['我愛你 宝贝','請說：你好，還有 再见！','']);results.push({version,cache,inputs:rows,calls,...r});
 }
}
writeFileSync('regression-reproduction.json',JSON.stringify({at:new Date().toISOString(),scope:'Actual 3.1.1 and 3.1.2 source run locally against deterministic fragment replies; no phone credentials.',results},null,2)+'\n');console.log(JSON.stringify(results));
