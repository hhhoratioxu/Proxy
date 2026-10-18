import test from 'node:test';
import assert from 'node:assert/strict';
import run,{loadCache,networkLease,packLyrics,translate} from '../spotify-lyrics.js';
const KEY='VerseLyrics.v1.cache',id=n=>String(n).padStart(22,'0'),url=n=>'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id(n);
const meta=n=>({id:id(n),title:'Lantern '+n,album:'Quiet Walk',artists:['Ada North'],duration:180});
const colors={background:0xff585f66|0,text:0xff000000|0,highlightText:-1};
const words=n=>['Original lantern '+n+'.','A quiet test line '+n+'.'];
const doc=n=>({lyrics:{provider:'lrclib',providerDisplayName:'LRCLIB',syncType:'LINE_SYNCED',lines:words(n).map((words,i)=>({words,startTimeMs:String(1000+i*2000),endTimeMs:'0',syllables:[]}))}});
const source=n=>({trackName:meta(n).title,albumName:meta(n).album,artistName:'Ada North',duration:180,syncedLyrics:words(n).map((w,i)=>`[00:0${i*2+1}]${w}`).join('\n')});
const reply=x=>new Response(JSON.stringify(x));
function setup(n=1,store=new Map(),network=async()=>{throw Error('unexpected HTTP');}){
 const calls=[],writes=[];
 const ctx={env:{TRANSLATION_ENABLED:true,FALLBACK_PROVIDER:'lrclib'},request:{url:url(n),headers:new Headers({Accept:'application/json'})},response:new Response('missing',{status:404}),storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>{writes.push(k);store.set(k,JSON.stringify(v));}},http:{get:async(u,o)=>{calls.push(u);return network(u,o);}}};
 return {ctx,store,calls,writes};
}
function seed(x,n,{complete=false}={}){const c=loadCache(x.ctx);c.put('meta:'+id(n),meta(n));c.put('palette:v1:'+id(n),{colors});if(complete){c.put('lyrics:lrclib:'+id(n),packLyrics(doc(n)));c.put('translations:v1:zh-CN:'+id(n),{pairs:words(n).map(s=>[s,'译文 '+s])});}c.save();}
test('a scoped lyric cache retains only the requested song plus source hints and legacy target-language lines',()=>{
 const x=setup();for(let n=1;n<=8;n++)seed(x,n,{complete:true});const full=loadCache(x.ctx);full.put('source-order:v1:["adanorth"]','qq');full.put('translation:zh-CN:Legacy','旧缓存');full.put('translation:ja:Legacy','古い');full.save();
 const scoped=loadCache(x.ctx,{track:id(1),language:'zh-CN'});assert.ok(scoped.get('lyrics:lrclib:'+id(1)));assert.equal(scoped.get('lyrics:lrclib:'+id(2)),undefined);assert.ok(scoped.entries.every(e=>e.key.endsWith(':'+id(1))||e.key.startsWith('source-order:')||e.key==='translation:zh-CN:Legacy'));assert.equal(scoped.entries.length,6);
 const saved=x.store.get(KEY),writes=x.writes.length;scoped.save();assert.equal(x.writes.length,writes);assert.equal(x.store.get(KEY),saved);
});
test('metadata-only views retain neither lyric rows nor translations and preserve them when saving',()=>{
 const x=setup();seed(x,1,{complete:true});seed(x,2,{complete:true});const before=JSON.parse(x.store.get(KEY)),c=loadCache(x.ctx,{metadata:true});assert.equal(c.entries.length,2);assert.ok(c.entries.every(e=>e.key.startsWith('meta:')));c.put('meta:'+id(3),meta(3));c.save();
 const after=JSON.parse(x.store.get(KEY));for(const e of before.entries)assert.deepEqual(after.entries.find(a=>a.key===e.key),e);assert.ok(c.entries.every(e=>e.key.startsWith('meta:')));assert.equal(after.entries.length,before.entries.length+1);
});
test('overlapping scoped writers merge complete stores without losing other songs or successful translations',()=>{
 const x=setup();seed(x,1,{complete:true});seed(x,2,{complete:true});const a=loadCache(x.ctx,{track:id(1),language:'zh-CN'}),b=loadCache(x.ctx,{track:id(2),language:'zh-CN'});a.get('meta:'+id(1));b.get('meta:'+id(2));a.put('availability:'+id(1),true);b.put('availability:'+id(2),false);a.save();b.save();
 const all=loadCache(x.ctx);for(const n of [1,2]){assert.ok(all.get('lyrics:lrclib:'+id(n)));assert.ok(all.get('translations:v1:zh-CN:'+id(n)));}assert.equal(all.get('availability:'+id(1)),true);assert.equal(all.get('availability:'+id(2)),false);assert.ok(x.store.get(KEY).length<=64000);
});
test('scoped translation writers still merge separate rows for the same song',async()=>{
 const x=setup(1,new Map(),u=>reply(new URL(u).searchParams.getAll('q').map(s=>'译文 '+s))),a=loadCache(x.ctx,{track:id(1),language:'zh-CN'}),b=loadCache(x.ctx,{track:id(1),language:'zh-CN'});
 a.get('nothing');b.get('nothing');const state=c=>({cache:c,settings:{language:'zh-CN'},deadline:Date.now()+10000});await translate(x.ctx,['First'],state(a));await translate(x.ctx,['Second'],state(b));a.save();b.save();const c=loadCache(x.ctx,{track:id(1),language:'zh-CN'});assert.deepEqual(new Map(c.get('translations:v1:zh-CN:'+id(1)).pairs),new Map([['First','译文 First'],['Second','译文 Second']]));
});
test('changing songs repeatedly preserves cached native words, timing, colors and plugin translations without HTTP',async()=>{
 const store=new Map(),x=setup(1,store);for(let n=1;n<=12;n++)seed(x,n,{complete:true});
 for(let i=0;i<120;i++){const n=i%12+1,y=setup(n,store),r=await run(y.ctx);assert.equal(r.status,200);const value=JSON.parse(Buffer.from(r.body));assert.deepEqual(value.lyrics.lines,doc(n).lyrics.lines);assert.deepEqual(value.colors,colors);assert.deepEqual(value.lyrics.alternatives[0].lines,words(n).map(s=>'译文 '+s));assert.equal(y.calls.length,0);assert.equal(y.writes.filter(k=>k===KEY).length,0);}
});
test('only actual different-track contention retires the active owner',()=>{
 const x=setup(),a=networkLease(x.ctx,Date.now()+10000,true);a.enter();
 const same=networkLease(x.ctx,Date.now()+10000,true);assert.throws(()=>same.enter(),/network-busy/);a.enter();
 const other=setup(2,x.store),b=networkLease(other.ctx,Date.now()+10000,true);assert.throws(()=>b.enter(),/network-busy/);assert.throws(()=>a.enter(),/work-superseded/);a.release();b.enter();b.release();
});
function retire(store) {const x=setup(2,store);assert.throws(()=>networkLease(x.ctx,Date.now()+10000,true).enter(),/network-busy/);}
test('superseded jobs await their outstanding native callback and never cache deferred source searches as missing',async()=>{
 const store=new Map(),seedContext=setup(1,store);seed(seedContext,1);seed(seedContext,2,{complete:true});let finish;
 const old=setup(1,store,()=>new Promise(resolve=>{finish=resolve;}));let completed=false;const pending=run(old.ctx).then(r=>{completed=true;return r;});await new Promise(setImmediate);assert.equal(old.calls.length,1);
 const current=setup(2,store),fresh=await run(current.ctx);assert.equal(fresh.status,200);assert.equal(completed,false);retire(store);finish(new Response('{}',{status:404}));await pending;assert.equal(old.calls.length,1);
 assert.equal(loadCache(old.ctx).get('lyrics:lrclib:'+id(1)),undefined);assert.equal(loadCache(old.ctx).cooldowns['lrclib.net'],undefined);assert.deepEqual(JSON.parse(store.get('VerseLyrics.v1.network')),[]);
});
test('a retired source response skips decoding and remains retryable with translation after switching',async()=>{
 const store=new Map(),x=setup(1,store);seed(x,1);seed(x,2,{complete:true});let finish;const old=setup(1,store,()=>new Promise(r=>{finish=r;})),pending=run(old.ctx);await new Promise(setImmediate);await run(setup(2,store).ctx);retire(store);finish(reply(source(1)));const r=await pending;assert.equal(r.status,undefined);assert.equal(old.calls.length,1);assert.equal(loadCache(old.ctx).get('lyrics:lrclib:'+id(1)),undefined);
 const settled=setup(1,store,u=>reply(u.includes('lrclib.net')?source(1):new URL(u).searchParams.getAll('q').map(s=>'译文 '+s))),out=JSON.parse(Buffer.from((await run(settled.ctx)).body));assert.deepEqual(out.lyrics.alternatives[0].lines,words(1).map(s=>'译文 '+s));assert.equal(settled.calls.length,2);assert.ok(settled.calls[1].includes('translate.googleapis.com'));
});
test('a superseded palette attempt does not poison its future color cache',async()=>{
 const store=new Map(),x=setup(1,store);seed(x,1);seed(x,2,{complete:true});const c=loadCache(x.ctx);c.put('palette:v1:'+id(1),null);c.save();let finish;const old=setup(1,store,()=>new Promise(r=>{finish=r;})),pending=run(old.ctx);await new Promise(setImmediate);await run(setup(2,store).ctx);retire(store);finish(reply(source(1)));await pending;assert.equal(loadCache(old.ctx).get('palette:v1:'+id(1)),null);assert.equal(old.calls.length,1);
});
test('expired owner records do not block a fresh network owner; unavailable storage fails closed',()=>{
 const x=setup();x.store.set('VerseLyrics.v1.network',JSON.stringify([{owner:'old',expires:Date.now()-1,retired:true,track:id(1)}]));const a=networkLease(x.ctx,Date.now()+10000,true);a.enter();a.release();assert.throws(()=>networkLease({storage:{getJSON(){throw Error('unavailable');}}},Date.now()+10000).enter(),/network-busy/);
});
