import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 3.1.4 stage');
const codec=await import(new URL('./core/spotify-lyrics.js',import.meta.url));
const fixture={lyrics:{syncType:'LINE_SYNCED',provider:'Spotify',providerDisplayName:'Spotify',lines:Array.from({length:600},(_,i)=>({startTimeMs:String(i*2000+1000),words:'自写的中文测试歌词 𳈆🎵'}))},colors:{background:-10985626,text:-16777216,highlightText:-1}},bytes=codec.encodeDocument(fixture,'protobuf');
const results=[];
for(const [version,root] of [['3.1.4',baseline],['3.1.5',new URL('.',import.meta.url).pathname]]){
 const allocations=[],context={__vints:0,__queries:0,__latin:new Set(),Response,URL,Uint16Array:new Proxy(Uint16Array,{construct(t,args){const a=Reflect.construct(t,args);allocations.push(a.byteLength);return a;}})};
 let source=readFileSync(root+'/core/spotify-lyrics.js','utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function main(ctx)');
 source=source.replace('function vint(bytes, at) {','function vint(bytes, at) { globalThis.__vints++;').replace('function latinQuery(s) {','function latinQuery(s) { globalThis.__queries++;').replace('function latinSpans() {','function rawLatinSpans() {');
 vm.runInNewContext(source+'\nfunction latinSpans(){const re=rawLatinSpans();globalThis.__latin.add(re);return re;}\nthis.api={parseDocument,translate,loadCache};',context);
 const doc=context.api.parseDocument(bytes,'application/x-protobuf');assert.deepEqual([...doc.words],fixture.lyrics.lines.map(l=>l.words));
 const parse={rows:600,genericVarintResults:context.__vints,typedScratchAllocations:allocations.length,totalTypedScratchBytes:allocations.reduce((a,b)=>a+b,0),largestScratchBytes:Math.max(...allocations)};
 const store=new Map(),calls=[],ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001'},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const q=new URL(u).searchParams.getAll('q');calls.push(q);return new Response(JSON.stringify(q.map(s=>s.replaceAll('hello','你好').replaceAll('goodbye','再见'))));}}};
 const rows=Array.from({length:48},(_,i)=>'第'+i+'句 hello，goodbye'),state={settings:{language:'zh-CN'},cache:context.api.loadCache(ctx),deadline:Date.now()+10000};
 const out=await context.api.translate(ctx,rows,state,'zh');assert.equal(out.changed,48);assert.deepEqual([...out.translations],rows.map(s=>s.replace('hello','你好').replace('goodbye','再见')));
 const cold={http:calls.length,actualQueries:calls.flat().length,queryStringsConstructed:context.__queries,latinScannerObjects:context.__latin.size};state.cache.save();context.__queries=0;context.__latin.clear();calls.length=0;
 const warm=await context.api.translate(ctx,rows,{...state,cache:context.api.loadCache(ctx)},'zh');assert.deepEqual(warm,out);
 results.push({version,parse,mixedCold:cold,mixedWarm:{http:calls.length,queryStringsConstructed:context.__queries,latinScannerObjects:context.__latin.size}});
}
const report={at:new Date().toISOString(),scope:'Actual baseline and candidate readable functions on identical deterministic data. Counted allocations/work only; instrumentation changes memory and is not a device footprint or latency benchmark.',results};writeFileSync(new URL('./work-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
