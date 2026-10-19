import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,loadCache} from '../spotify-lyrics.js';
const id='0000000000000000000001',KEY='VerseLyrics.v1.cache';
function setup(target='zh-CN',reply=s=>s){
 const store=new Map(),calls=[],ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const q=new URL(u).searchParams.getAll('q');calls.push({q,url:u});return new Response(JSON.stringify(q.map(reply)));}}};
 return {ctx,store,calls,state:{settings:{language:target},cache:loadCache(ctx),deadline:Date.now()+10000}};
}
for(const target of ['zh-CN','zh-TW']){
 test(target+': literal Chinese and punctuation survive several English spans in one query',async()=>{
  const x=setup(target,s=>{assert.equal(s,"Don't leave me\nI need you");return ['别离开我\n我需要你','en'];}),rows=["請說：Don't leave me，還有 I need you！"],copy=[...rows];
  const r=await translate(x.ctx,rows,x.state,'zh');assert.deepEqual(r.translations,['請說：别离开我，還有 我需要你！']);assert.deepEqual(rows,copy);assert.equal(x.calls.length,1);x.state.cache.save();
  assert.deepEqual((await translate(x.ctx,rows,{...x.state,cache:loadCache(x.ctx)},'zh')).translations,r.translations);assert.equal(x.calls.length,1);
 });
 for(const [row,q,value,expected] of [
  ['我愛你baby','baby','宝贝','我愛你宝贝'],
  ['說 don’t give up！','don’t give up','别放弃','說 别放弃！'],
  ['這是café au lait的香味','café au lait','牛奶咖啡','這是牛奶咖啡的香味'],
  ['我們有24-hour love','24-hour love','24小时的爱','我們有24小时的爱'],
  ['🎵 輕聲 hello，hello！','hello\nhello','你好\n你好','🎵 輕聲 你好，你好！'],
  ['你是my one-and-only','my one-and-only','我的唯一','你是我的唯一'],
  ['這句cafe\u0301是名字','cafe\u0301','咖啡','這句咖啡是名字']
 ])test(target+': fragment extraction '+row,async()=>{
  const x=setup(target,s=>{assert.equal(s,q);return [value,'en'];});const r=await translate(x.ctx,[row],x.state);assert.deepEqual(r.translations,[expected]);assert.equal(x.calls.length,1);
 });
 for(const reply of ['合并的一句','太\n多\n片段','第一句\n','\n第二句','第一句\r第二句'])test(target+': mismatched fragment alignment is never guessed '+JSON.stringify(reply),async()=>{
  const x=setup(target,()=>reply),r=await translate(x.ctx,['說 hello，還有 goodbye'],x.state,'zh');assert.deepEqual(r.translations,['']);assert.equal(r.changed,0);assert.equal(x.state.cache.get('translations:v1:'+target+':'+id),undefined);assert.equal(x.calls.length,1);
 });
 test(target+': many spans still consume one q per row inside existing batch and URL bounds',async()=>{
  const rows=Array.from({length:130},(_,i)=>'說 hello，還有 goodbye '+i),x=setup(target,s=>[s.replace('hello','你好').replace('goodbye','再见'),'en']);
  const r=await translate(x.ctx,rows,x.state,'zh');assert.equal(r.changed,130);assert.equal(x.calls.length,3);assert.deepEqual(x.calls.map(c=>c.q.length),[64,64,2]);assert.ok(x.calls.every(c=>c.url.length<=6800));assert.deepEqual(r.translations,rows.map((s,i)=>'說 你好，還有 再见 '+i));x.state.cache.save();assert.ok(x.store.get(KEY).length<=64000);
 });
 test(target+': long mixed row preserves all Chinese without a fragment array or extra requests',async()=>{
  const row=Array.from({length:400},()=> '我A').join(''),x=setup(target,s=>[s.replaceAll('A','爱'),'en']),r=await translate(x.ctx,[row],x.state,'zh');assert.deepEqual(r.translations,[row.replaceAll('A','爱')]);assert.equal(x.calls.length,1);assert.equal(x.calls[0].q.length,1);
 });
 test(target+': unaltered fragments create no Chinese conversion and a reusable bounded proof',async()=>{
  const row='我愛你 Hello，這裡 Goodbye',x=setup(target,s=>[s,'en']);const a=await translate(x.ctx,[row],x.state,'zh');assert.deepEqual(a.translations,['']);assert.deepEqual(x.state.cache.get('translations:v1:'+target+':'+id).pairs,[[row,row,'checked']]);x.state.cache.save();const b=await translate(x.ctx,[row],{...x.state,cache:loadCache(x.ctx)},'zh');assert.deepEqual(a,b);assert.equal(x.calls.length,1);
 });
 test(target+': Japanese/Korean mixed scripts retain automatic whole-row translation',async()=>{
  const rows=['海の hello','海 빛 hello'],x=setup(target,s=>['有意义的译文 '+s,'ja']);await translate(x.ctx,rows,x.state,'ja');assert.deepEqual(x.calls[0].q,rows);
 });
}
for(const target of ['zh-CN','zh-TW']){
 test(target+': repeated English shares one query but keeps separate literal Chinese and row positions',async()=>{
  const x=setup(target,s=>s==='hello world'?'你好世界':s==='hello'?'你好':s==='goodbye'?'再见':s),rows=['hello world','甲hello','乙hello','丙goodbye','丁hello'];
  const r=await translate(x.ctx,rows,x.state,'zh');assert.deepEqual(x.calls[0].q,['hello world','hello','goodbye']);assert.deepEqual(r.translations,['你好世界','甲你好','乙你好','丙再见','丁你好']);x.state.cache.save();const b=await translate(x.ctx,rows,{...x.state,cache:loadCache(x.ctx)},'zh');assert.deepEqual(b,r);assert.equal(x.calls.length,1);
 });
 test(target+': shared mixed query can reuse an earlier independent English query',async()=>{
  const x=setup(target,s=>s==='hello'?'你好':s),rows=['hello','甲hello','乙hello'];const r=await translate(x.ctx,rows,x.state,'zh');assert.deepEqual(x.calls[0].q,['hello']);assert.deepEqual(r.translations,['你好','甲你好','乙你好']);
 });
 test(target+': query aliases stay bounded to 64 original rows and retain all 130 outputs',async()=>{
  const x=setup(target,()=>['你好','en']),rows=Array.from({length:130},(_,i)=>'第'+i+'句 hello');const r=await translate(x.ctx,rows,x.state,'zh');assert.equal(r.changed,130);assert.deepEqual(x.calls.map(c=>c.q),[['hello'],['hello'],['hello']]);assert.deepEqual(r.translations,rows.map(s=>s.replace('hello','你好')));
 });
 test(target+': aliased results still obey the combined output cap',async()=>{
  const x=setup(target,()=>['文'.repeat(2000),'en']),rows=Array.from({length:64},(_,i)=>'第'+i+'句 hello'),r=await translate(x.ctx,rows,x.state,'zh');assert.equal(x.calls.length,1);assert.deepEqual(x.calls[0].q,['hello']);assert.equal(r.changed,0);assert.equal(x.state.cache.get('translations:v1:'+target+':'+id),undefined);
 });
 test(target+': invalid aliased reply is not cached or retried as a wide batch',async()=>{
  const x=setup(target,()=>''),rows=Array.from({length:64},(_,i)=>'第'+i+'句 hello'),r=await translate(x.ctx,rows,x.state,'zh');assert.equal(x.calls.length,1);assert.equal(r.changed,0);assert.equal(x.state.cache.get('translations:v1:'+target+':'+id),undefined);
 });
 test(target+': pure Chinese fast path touches neither cache nor HTTP',async()=>{
  const x=setup(target);x.state.cache={get(){throw Error('unnecessary cache read');}};const rows=['原創紙燈','纸灯','這裡 ㄅㄆㄇ',''],r=await translate(x.ctx,rows,x.state,'zh');assert.deepEqual(r.translations,['','','','']);assert.equal(r.changed,0);assert.equal(x.calls.length,0);
 });
}
