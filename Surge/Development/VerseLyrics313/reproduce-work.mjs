import {pathToFileURL} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const results=[],id='0000000000000000000001',KEY='VerseLyrics.v1.cache';
for(const [version,root]of [['3.1.2',process.argv[2]],['3.1.3',new URL('.',import.meta.url).pathname]]){
 const {translate,loadCache}=await import(pathToFileURL(root+'/core/spotify-lyrics.js'));const item={version};
 for(const kind of ['mixed','chorus']){
  const rows=kind==='mixed'?Array.from({length:48},(_,i)=>'第'+i+'句 hello，還有 goodbye'):Array.from({length:120},(_,i)=>'Original '+i%8),store=new Map(),calls=[];let normalizations=0;
  const ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const q=new URL(u).searchParams.getAll('q');calls.push(q);return new Response(JSON.stringify(q.map(s=>kind==='mixed'?s.replace('hello','你好').replace('goodbye','再见'):'译文 '+s)));}}},state={settings:{language:'zh-CN'},cache:loadCache(ctx),deadline:Date.now()+10000};
  const normalize=String.prototype.normalize;let out;
  try{String.prototype.normalize=function(...args){normalizations++;return normalize.apply(this,args);};out=await translate(ctx,rows,state,'zh');}finally{String.prototype.normalize=normalize;}
  assert.equal(out.changed,rows.length);assert.deepEqual(out.translations,rows.map(s=>kind==='mixed'?s.replace('hello','你好').replace('goodbye','再见'):'译文 '+s));state.cache.save();assert.ok(store.get(KEY).length<=64000);
  item[kind]={rows:rows.length,httpCalls:calls.length,qCount:calls.reduce((n,q)=>n+q.length,0),urlRows:calls[0].length,normalizations,changed:out.changed};
 }
 const rawParts=Array.from({length:24},(_,i)=>JSON.stringify({key:'meta:'+i,value:{title:'Old '+i,padding:'x'.repeat(400)},expires:Date.now()+3600000})),store=new Map([[KEY,'{"sizes":'+JSON.stringify(rawParts.map(s=>s.length))+',"entries":['+rawParts.join(',')+'],"cooldowns":{}}']]);
 const ctx={storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)}},cache=loadCache(ctx,{metadata:true});cache.put('meta:current',{title:'Current'});let entryParses=0;const parse=JSON.parse;
 try{JSON.parse=(s,...args)=>{if(String(s).startsWith('{"key":"meta:'))entryParses++;return parse(s,...args);};cache.save();}finally{JSON.parse=parse;}
 assert.equal(cache.get('meta:current').title,'Current');item.cache={oldMetadata:24,entryParsesDuringSave:entryParses,characters:store.get(KEY).length};results.push(item);
}
assert.equal(results[0].mixed.qCount,48);assert.equal(results[1].mixed.qCount,1);assert.equal(results[0].chorus.normalizations,240);assert.equal(results[1].chorus.normalizations,16);assert.equal(results[0].cache.entryParsesDuringSave,48);assert.equal(results[1].cache.entryParsesDuringSave,24);
const report={at:new Date().toISOString(),scope:'Actual published baseline and candidate readable sources run on the same deterministic input/tooling. Counts are work/resource evidence, not latency, iPhone memory or VPN acceptance.',results};writeFileSync('work-reproduction.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
