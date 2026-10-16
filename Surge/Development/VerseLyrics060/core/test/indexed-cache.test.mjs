import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCache} from '../spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache',id=n=>String(n).padStart(22,'0');
function setup(){
  const store=new Map(),writes=[];
  const ctx={storage:{get:k=>store.get(k),set:(k,v)=>{writes.push(k);store.set(k,v);},getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>{writes.push(k);store.set(k,JSON.stringify(v));}}};
  return {ctx,store,writes};
}
function seed(x){const c=loadCache(x.ctx);for(let n=1;n<=12;n++){
  const words=Array.from({length:24},(_,i)=>'Original lantern '+n+' line '+i);
  c.put('meta:'+id(n),{id:id(n),title:'Lantern '+n,album:'Quiet Walk',artists:['Ada'],duration:180});
  c.put('lyrics:auto:'+id(n),{v:1,p:'qq',t:true,l:words.map((s,i)=>[i*2100,s])});
  c.put('translations:v1:zh-CN:'+id(n),{pairs:words.map(s=>[s,'自写译文 '+s])});
  c.put('palette:v1:'+id(n),{colors:{background:-10985626,text:-16777216,highlightText:-1}});
}c.save();}
test('indexed scoped hits parse only selected entry values, preserve the old JSON schema and perform no writes',()=>{
  const x=setup();seed(x);const raw=x.store.get(KEY),all=JSON.parse(raw);assert.equal(all.entries.length,48);assert.equal(all.sizes.length,48);assert.ok(raw.length<=64000);
  const parse=JSON.parse,reads=[];let c;
  try{JSON.parse=(s,...args)=>{reads.push(String(s).length);return parse(s,...args);};c=loadCache(x.ctx,{track:id(5),language:'zh-CN'});assert.equal(c.get('lyrics:auto:'+id(5)).l.length,24);assert.equal(c.entries.length,4);c.save();}finally{JSON.parse=parse;}
  assert.ok(reads.reduce((a,b)=>a+b,0)<raw.length/5,'other song values must not be parsed');assert.equal(x.writes.length,1);assert.equal(x.store.get(KEY),raw);
  assert.equal(all.entries.find(e=>e.key==='lyrics:auto:'+id(5)).value.l.length,24,'old versions still see standard entry values');
});
test('legacy caches migrate on a write without losing lyrics, translations or concurrent updates',()=>{
  const x=setup();seed(x);const old=JSON.parse(x.store.get(KEY));delete old.sizes;x.store.set(KEY,JSON.stringify(old));
  const a=loadCache(x.ctx,{track:id(1),language:'zh-CN'}),b=loadCache(x.ctx,{track:id(2),language:'zh-CN'});a.get('none');b.get('none');a.put('availability:'+id(1),true);b.put('availability:'+id(2),true);a.save();b.save();
  const next=JSON.parse(x.store.get(KEY));assert.equal(next.entries.length,50);assert.equal(next.sizes.length,50);for(const e of old.entries)assert.deepEqual(next.entries.find(n=>n.key===e.key),e);
});
for(const mutation of [o=>o.sizes[0]++,o=>o.sizes.pop(),o=>o.sizes[0]=-1,o=>o.sizes[0]='20',o=>o.sizes=[],o=>o.extra=true])test('invalid or noncanonical index falls back to the full bounded reader '+String(mutation),()=>{
  const x=setup();seed(x);const data=JSON.parse(x.store.get(KEY));mutation(data);x.store.set(KEY,JSON.stringify(data));const c=loadCache(x.ctx,{track:id(1),language:'zh-CN'});assert.equal(c.get('lyrics:auto:'+id(1)).l.length,24);assert.equal(c.entries.length,4);
});
test('JSON escaping, supplementary Unicode and delimiter-like text cannot shift an indexed entry',()=>{
  const x=setup(),c=loadCache(x.ctx),value='引号 " \\ \n 𳈆 ,"entries":[ {"key":"meta:'+id(2)+'","value":';
  c.put('translation:zh-CN:'+value,value);c.put('meta:'+id(1),{title:value});c.put('meta:'+id(2),{title:'Correct second song'});c.save();
  const read=loadCache(x.ctx,{track:id(2),language:'zh-CN'});assert.equal(read.get('meta:'+id(1)),undefined);assert.equal(read.get('meta:'+id(2)).title,'Correct second song');assert.equal(read.get('translation:zh-CN:'+value),value);
});
test('indexed metadata views avoid lyrics and translation values while keeping the same cache cap',()=>{
  const x=setup();seed(x);const c=loadCache(x.ctx,{metadata:true});assert.equal(c.entries.length,12);assert.ok(c.entries.every(e=>e.key.startsWith('meta:')));
  for(let i=0;i<500;i++)c.put('meta:'+id(i+1),{title:'x'.repeat(800)});c.save();const raw=x.store.get(KEY),next=JSON.parse(raw);assert.ok(raw.length<=64000);assert.ok(next.entries.length<=128);assert.equal(next.sizes.length,next.entries.length);
});
