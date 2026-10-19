import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {encodeDocument} from './core/spotify-lyrics.js';
const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 3.1.5 source/runtime stage');
const id=n=>String(n).padStart(22,'0'),KEY='VerseLyrics.v1.cache',results=[];
const colors={background:-10985626,text:-16777216,highlightText:-1};
for(const [version,root] of [['3.1.5',baseline],['3.1.6',fileURLToPath(new URL('.',import.meta.url))]]){
 const counts={map:0,weak:0,parses:0},context={JSON:{parse(s,...args){counts.parses++;return JSON.parse(s,...args);},stringify:JSON.stringify},Map:new Proxy(Map,{construct(t,args){counts.map++;return Reflect.construct(t,args);}}),WeakMap:new Proxy(WeakMap,{construct(t,args){counts.weak++;return Reflect.construct(t,args);}})};
 const source=readFileSync(root+'/core/spotify-lyrics.js','utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function main(ctx)');
 vm.runInNewContext(source+'\nthis.api={parseDocument,loadCache};',context);
 const parse=[];
 for(const kind of ['han','ascii']){
  const words=kind==='han'?'自写中文歌词 🎵 𳈆':'Self-written lyric words';
  const doc={lyrics:{syncType:'LINE_SYNCED',provider:'Original',providerDisplayName:'Original',language:'zh',lines:Array.from({length:600},(_,i)=>({words,startTimeMs:String(i*2100)}))},colors};
  const bytes=encodeDocument(doc,'protobuf'),subarray=Uint8Array.prototype.subarray;let views=0,parsed;
  try{Uint8Array.prototype.subarray=function(...args){if(this.buffer===bytes.buffer)views++;return subarray.apply(this,args);};parsed=context.api.parseDocument(bytes,'application/x-protobuf');}finally{Uint8Array.prototype.subarray=subarray;}
  assert.deepEqual([...parsed.words],doc.lyrics.lines.map(l=>l.words));
  parse.push({kind,rows:600,inputByteViews:views,wordsSHA256:createHash('sha256').update(JSON.stringify([...parsed.words])).digest('hex')});
 }
 counts.map=0;counts.weak=0;let reads=0,writes=0;
 const unused=context.api.loadCache({storage:{get(){reads++;},set(){writes++;}}},{track:id(1),language:'zh-CN'});unused.save();
 const unloaded={mapContainers:counts.map,weakMapContainers:counts.weak,persistentReads:reads,persistentWrites:writes};
 const entries=Array.from({length:128},(_,i)=>({key:'meta:'+id(i),value:{title:'Self-written '+i},expires:Date.now()+3600000})),parts=entries.map(e=>JSON.stringify(e));
 const raw='{"sizes":'+JSON.stringify(parts.map(s=>s.length))+',"entries":['+parts.join(',')+'],"cooldowns":{}}';counts.parses=0;
 const cache=context.api.loadCache({storage:{get:k=>raw,set(){throw Error('Unchanged cache must not write');}}},{track:id(57),language:'zh-CN'});
 assert.equal(cache.get('meta:'+id(57)).title,'Self-written 57');cache.save();
 results.push({version,parse,unusedCache:unloaded,indexedRead:{records:128,selectedValues:1,jsonParseCalls:counts.parses,cacheCharacters:raw.length}});
}
assert.deepEqual(results[0].parse.map(r=>r.wordsSHA256),results[1].parse.map(r=>r.wordsSHA256));
const report={at:new Date().toISOString(),scope:'Actual baseline/candidate readable functions on identical self-written inputs. Counted input views, JSON.parse calls and bookkeeping allocations only. Instrumentation is separate from uninstrumented timing/heap runs; these are not whole-process memory or device/VPN measurements.',results};
writeFileSync(new URL('./work-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
