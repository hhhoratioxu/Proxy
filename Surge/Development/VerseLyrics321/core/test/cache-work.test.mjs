import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadCache} from '../spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache',id=n=>String(n).padStart(22,'0');
function indexed(entries){const parts=entries.map(e=>JSON.stringify(e));return '{"sizes":'+JSON.stringify(parts.map(s=>s.length))+',"entries":['+parts.join(',')+'],"cooldowns":{}}';}
function setup(entries=[]){const store=new Map([[KEY,indexed(entries)]]),writes=[];return {store,writes,ctx:{storage:{get:k=>store.get(k),set:(k,v)=>{store.set(k,v);writes.push(v);}}}};}
const entry=(key,value)=>({key,value,expires:Date.now()+3600000});

test('unused lyric cache does not allocate Map/WeakMap storage containers or access persistent data',()=>{
 const allocations={map:0,weak:0},context={Map:new Proxy(Map,{construct(t,a){allocations.map++;return Reflect.construct(t,a);}}),WeakMap:new Proxy(WeakMap,{construct(t,a){allocations.weak++;return Reflect.construct(t,a);}})};
 const source=readFileSync(new URL('../spotify-lyrics.js',import.meta.url),'utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function main(ctx)');
 vm.runInNewContext(source+'\nthis.cache=loadCache;',context);let reads=0,writes=0;
 const c=context.cache({storage:{get(){reads++;return null;},set(){writes++;}}},{track:id(1),language:'zh-CN'});
 c.save();assert.deepEqual(allocations,{map:0,weak:0});assert.equal(reads,0);assert.equal(writes,0);
 c.get('missing');assert.deepEqual(allocations,{map:1,weak:1});assert.equal(reads,1);c.get('again');assert.equal(reads,1);c.save();assert.equal(writes,0);
});
test('ordinary scoped cache keys require no per-key JSON parse and no writes',()=>{
 const x=setup(Array.from({length:128},(_,i)=>entry('meta:'+id(i),{title:'Self-written '+i}))),parse=JSON.parse,reads=[];let value;
 try{JSON.parse=(s,...rest)=>{reads.push(String(s));return parse(s,...rest);};const c=loadCache(x.ctx,{track:id(57),language:'zh-CN'});value=c.get('meta:'+id(57));c.save();}finally{JSON.parse=parse;}
 assert.equal(value.title,'Self-written 57');assert.equal(x.writes.length,0);assert.equal(reads.length,3);assert.equal(reads.filter(s=>s[0]==='"').length,0);
});
test('escaped legacy keys still decode correctly without hiding the selected row',()=>{
 const keys=['quote "','backslash \\','line\nfeed','tab\t','unicode 𳈆','control\u0001'].map(s=>'translation:zh-CN:'+s),x=setup(keys.map(k=>entry(k,k)));
 const c=loadCache(x.ctx,{track:id(1),language:'zh-CN'});for(const k of keys)assert.equal(c.get(k),k);c.save();assert.equal(x.writes.length,0);
});
test('unescaped control characters in indexed keys cannot enter a rewritten cache',()=>{
 const bad=entry('translation:zh-CN:bad\nkey','old'),current='meta:'+id(1),x=setup([bad,entry(current,{title:'Previous'})]);
 const raw=x.store.get(KEY);x.store.set(KEY,raw.replaceAll('bad\\nkey','bad\nkey'));
 const c=loadCache(x.ctx,{track:id(1),language:'zh-CN'});assert.equal(c.get(current),undefined);c.put(current,{title:'New'});c.save();
 assert.deepEqual(JSON.parse(x.store.get(KEY)).entries.map(e=>e.value),[{title:'New'}]);
});
test('scope flags set after construction are honored by the first indexed read',()=>{
 const key='translations:v1:zh-CN:'+id(1),x=setup([entry('meta:'+id(1),{title:'Keep stored'}),entry(key,{pairs:[['Hello','你好']]}),entry('lyrics:auto:'+id(1),{words:'source'}),entry('translation:zh-CN:Other line','其他')]);
 const scope={track:id(1),language:'zh-CN'},c=loadCache(x.ctx,scope);scope.translations=true;
 assert.deepEqual(c.entries.map(e=>e.key),[key,'translation:zh-CN:Other line']);c.save();assert.equal(x.writes.length,0);
});
test('post-read translation scope keeps other stored values when a new pair is saved',()=>{
 const key='translations:v1:zh-CN:'+id(1),x=setup([entry('meta:'+id(1),{title:'Current'}),entry('lyrics:auto:'+id(1),{words:'source'}),entry('meta:'+id(2),{title:'Unrelated'})]);
 const scope={track:id(1),language:'zh-CN'},c=loadCache(x.ctx,scope);assert.equal(c.get('meta:'+id(1)).title,'Current');scope.translations=true;c.put(key,{pairs:[['Hello','你好']]});c.save();
 const all=JSON.parse(x.store.get(KEY)).entries;assert.equal(all.length,4);assert.deepEqual(c.entries.map(e=>e.key),[key]);assert.equal(all.find(e=>e.key==='meta:'+id(2)).value.title,'Unrelated');
});
test('translation-disabled scopes reject legacy and grouped translations but keep exact-track source state',()=>{
 const x=setup([entry('meta:'+id(1),{title:'Current'}),entry('lyrics:auto:'+id(1),{words:'source'}),entry('source-order:v1:[]','qq'),entry('translations:v1:zh-CN:'+id(1),{pairs:[]}),entry('translation:zh-CN:Hello','你好'),entry('meta:'+id(2),{title:'Other'})]);
 const c=loadCache(x.ctx,{track:id(1),language:'zh-CN',translate:false});assert.deepEqual(c.entries.map(e=>e.key),['meta:'+id(1),'lyrics:auto:'+id(1),'source-order:v1:[]']);c.save();assert.equal(x.writes.length,0);
});
