import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCache} from '../spotify-lyrics.js';

const KEY='VerseLyrics.v1.cache',id=n=>String(n).padStart(22,'0');
function setup(entries=[],cooldowns={}){
  const parts=entries.map(e=>JSON.stringify(e));
  const raw='{"sizes":'+JSON.stringify(parts.map(s=>s.length))+',"entries":['+parts.join(',')+'],"cooldowns":'+JSON.stringify(cooldowns)+'}';
  const store=new Map([[KEY,raw]]),writes=[];
  const ctx={storage:{get:k=>store.get(k),set:(k,v)=>{writes.push(k);store.set(k,v);},getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>store.set(k,JSON.stringify(v))}};
  return {ctx,store,writes};
}
const entry=(key,value,expires=Date.now()+3600000)=>({key,value,expires});
function catalog(){return Array.from({length:12},(_,n)=>entry('lyrics:auto:'+id(n+1),{v:1,p:'qq',t:true,l:Array.from({length:24},(_,i)=>[i*2100,'Other song '+n+' original lyric '+i+' 🎵'])}));}
function all(x){return JSON.parse(x.store.get(KEY));}

test('saving a new song validates individual records without parsing or serializing the full existing lyric catalog',()=>{
  const originals=catalog(),x=setup(originals),before=x.store.get(KEY),c=loadCache(x.ctx,{track:id(50),language:'zh-CN'});
  c.put('meta:'+id(50),{title:'New song'});
  const parse=JSON.parse,stringify=JSON.stringify;let maxParsed=0;
  try{
    JSON.parse=(s,...args)=>{maxParsed=Math.max(maxParsed,String(s).length);return parse(s,...args);};
    JSON.stringify=(value,...args)=>{if(value?.key?.startsWith('lyrics:auto:'))throw Error('Unrelated lyric entry was reserialized');return stringify(value,...args);};
    c.save();
  }finally{JSON.parse=parse;JSON.stringify=stringify;}
  assert.equal(x.writes.length,1);assert.ok(maxParsed<before.length/4);
  for(const e of originals)assert.deepEqual(all(x).entries.find(a=>a.key===e.key),e);
  assert.deepEqual(c.entries.map(e=>e.key),['meta:'+id(50)]);
});

test('translation update inflates only the conflicting record and merges independent successful rows',()=>{
  const key='translations:v1:zh-CN:'+id(1),x=setup([...catalog(),entry(key,{pairs:[['First','第一']]})]);
  const a=loadCache(x.ctx,{track:id(1),language:'zh-CN'}),b=loadCache(x.ctx,{track:id(1),language:'zh-CN'});
  a.get(key);b.get(key);a.put(key,{pairs:[['Second','第二']]});b.put(key,{pairs:[['Third','第三']]});a.save();b.save();
  const saved=new Map(all(x).entries.find(e=>e.key===key).value.pairs);
  assert.deepEqual(new Map([...saved].sort()),new Map([['First','第一'],['Second','第二'],['Third','第三']].sort()));
  assert.equal(all(x).entries.filter(e=>e.key.startsWith('lyrics:')).length,12);
});

test('stale scoped writers keep newer entries, other songs and live host cooldowns',()=>{
  const now=Date.now(),key='meta:'+id(1),x=setup([entry(key,{title:'Old'},now+100000),...catalog()],{'lrclib.net':now+15000});
  const stale=loadCache(x.ctx,{metadata:true});stale.get(key);
  const fresh=loadCache(x.ctx,{metadata:true});fresh.put(key,{title:'New'},0,now+200000);fresh.cooldowns['music.163.com']=now+30000;fresh.save();
  stale.put(key,{title:'Stale'},0,now+120000);stale.put('meta:'+id(2),{title:'Second'});stale.save();
  const saved=all(x);assert.equal(saved.entries.find(e=>e.key===key).value.title,'New');assert.ok(saved.cooldowns['lrclib.net']>now);assert.ok(saved.cooldowns['music.163.com']>now);assert.equal(saved.entries.filter(e=>e.key.startsWith('lyrics:')).length,12);
});

for(const [name,mutation] of [
  ['wrong-size',o=>o.sizes[0]++],['missing-size',o=>o.sizes.pop()],['extra-field',o=>o.extra=true],
  ['negative-size',o=>o.sizes[0]=-1],['legacy',o=>delete o.sizes],['missing-value',o=>delete o.entries[0].value]
])test('write safely normalizes an unsupported cache layout: '+name,()=>{
  const x=setup(catalog()),data=all(x);mutation(data);x.store.set(KEY,JSON.stringify(data));
  const c=loadCache(x.ctx,{track:id(50),language:'zh-CN'});c.put('meta:'+id(50),{title:'Current'});c.save();
  const saved=all(x);assert.equal(saved.entries.find(e=>e.key==='meta:'+id(50)).value.title,'Current');assert.ok(saved.entries.some(e=>e.key==='lyrics:auto:'+id(12)));assert.ok(x.store.get(KEY).length<=64000);
});

test('malformed JSON in an unrelated indexed value is never copied into a new cache',()=>{
  const x=setup(catalog());x.store.set(KEY,x.store.get(KEY).replace('"Other song 5 original lyric 0 🎵"','!Other song 5 original lyric 0 🎵!'));
  const c=loadCache(x.ctx,{track:id(50),language:'zh-CN'});c.put('meta:'+id(50),{title:'Survives'});c.save();
  assert.deepEqual(all(x).entries.map(e=>e.key),['meta:'+id(50)]);
});

test('range writes preserve escaping, nested values and supplementary characters',()=>{
  const value={pairs:[['"}],"cooldowns":{','漢字 𳈆 \\ \n \t']],nested:{items:[null,false,1e-5,{quote:'"'}]}},key='translations:v1:zh-CN:'+id(1),x=setup([entry(key,value)]);
  const c=loadCache(x.ctx,{metadata:true});c.put('meta:'+id(2),{title:'Next'});c.save();assert.deepEqual(all(x).entries[0].value,value);
});

test('range writes enforce both cache limits through repeated eviction and TTL cleanup',()=>{
  const x=setup([entry('expired','old',Date.now()-1),...catalog()]);
  for(let n=50;n<290;n++){
    const c=loadCache(x.ctx,{track:id(n),language:'zh-CN'});c.put('lyrics:auto:'+id(n),{v:1,p:'qq',t:true,l:Array.from({length:24},(_,i)=>[i*2100,'新歌 '+n+' '+i+'x'.repeat(55)])});c.save();
    const saved=all(x);assert.ok(saved.entries.length<=128);assert.ok(x.store.get(KEY).length<=64000);assert.equal(saved.sizes.length,saved.entries.length);assert.ok(saved.entries.some(e=>e.key==='lyrics:auto:'+id(n)));assert.ok(!saved.entries.some(e=>e.key==='expired'));
  }
});

test('a failed write remains retryable with pending translations intact',()=>{
  const x=setup(catalog()),write=x.ctx.storage.set;let fail=true;
  x.ctx.storage.set=(k,v)=>{if(fail)throw Error('storage unavailable');write(k,v);};
  const c=loadCache(x.ctx,{track:id(50),language:'zh-CN'}),key='translations:v1:zh-CN:'+id(50);c.put(key,{pairs:[['Original','译文']]});c.save();assert.equal(x.writes.length,0);
  fail=false;c.save();assert.deepEqual(all(x).entries.find(e=>e.key===key).value.pairs,[['Original','译文']]);
});

test('unscoped legacy records without a value are normalized without being treated as serialized ranges',()=>{
  const x=setup();x.store.set(KEY,JSON.stringify({entries:[{key:'legacy',expires:Date.now()+100000,saved:'not JSON'}],cooldowns:{}}));
  const c=loadCache(x.ctx);c.put('meta:'+id(1),{title:'Current'});c.save();
  assert.equal(all(x).entries.find(e=>e.key==='meta:'+id(1)).value.title,'Current');const count=x.writes.length;c.save();assert.equal(x.writes.length,count);
});
