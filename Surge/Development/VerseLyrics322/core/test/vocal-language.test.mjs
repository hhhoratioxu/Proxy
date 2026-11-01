import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,loadCache} from '../spotify-lyrics.js';
const id='0000000000000000000001',KEY='VerseLyrics.v1.cache';
const fillers=['ohohoh','OhOhOh!','ohyeah','hahaha','lalala','nananana','wowo','wo','woooow','huh','eh','whooo','oh\u200b','\ufeffah\u2060','o\u200bh','\u200dooh\u200d','🎵 oh\ufe0f ♪'];
function setup(target='zh-CN',reply=s=>'有意义的译文 '+s){
 const calls=[],store=new Map(),ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id},env:{},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const url=new URL(u),q=url.searchParams.getAll('q');calls.push({q,source:url.searchParams.get('sl')});return new Response(JSON.stringify(q.map(reply)));}}};
 return {ctx,calls,store,state:{settings:{language:target},cache:loadCache(ctx),deadline:Date.now()+10000}};
}
for(const target of ['zh-CN','zh-TW']){
 for(const source of ['en','EN_us','eng','zh-Hant','cmn','yue','','und'])test(target+' '+(source||'unknown')+': joined or invisibly formatted vocal rows need no cache or HTTP',async()=>{
  const x=setup(target);x.state.cache={get(){throw Error('No cache required');}};
  assert.deepEqual(await translate(x.ctx,fillers,x.state,source),{changed:0,translations:fillers.map(()=> '')});assert.equal(x.calls.length,0);
 });
 for(const source of ['ja','jpn','ko-KR','kor','fr','pt-BR','es','pl','id','de','vi','ar'])test(target+' '+source+': foreign short words and vocals remain eligible for translation',async()=>{
  const rows=['na','la','yo','ha','oh'],x=setup(target),out=await translate(x.ctx,rows,x.state,source);
  assert.equal(out.changed,rows.length);assert.deepEqual(x.calls[0].q,rows);assert.equal(x.calls.length,1);assert.notEqual(x.calls[0].source,'auto');
  x.state.cache.save();const warm=await translate(x.ctx,rows,{...x.state,cache:loadCache(x.ctx)},source);assert.deepEqual(warm,out);assert.equal(x.calls.length,1);
 });
 test(target+': foreign script words with English-looking short words are not swallowed',async()=>{
  const rows=['나','아','오','手紙','ラララ','الله','na','la'],x=setup(target),out=await translate(x.ctx,rows,x.state,'ko');assert.equal(out.changed,rows.length);assert.deepEqual(x.calls[0].q,rows);
 });
 test(target+': meaningful English and Chinese fragments survive the expanded filter',async()=>{
  const rows=['hello','Oh my love','who','no','a','Ohio','我说 ohohoh，再说 I miss you','我说 o\u200bh，你说 hello'],answers=['你好','哦我的爱','谁','不','一个','俄亥俄','我想你','你好'],x=setup(target,s=>answers[['hello','Oh my love','who','no','a','Ohio','I miss you','hello'].indexOf(s)]);
  const out=await translate(x.ctx,rows,x.state,'en');assert.equal(out.changed,rows.length);assert.deepEqual(out.translations,['你好','哦我的爱','谁','不','一个','俄亥俄','我说 ohohoh，再说 我想你','我说 o\u200bh，你说 你好']);
 });
 for(const location of ['track','legacy','source'])test(target+' '+location+': old filler translations cannot reappear beside a useful foreign sentence',async()=>{
  const rows=['ohohoh','oh\u200b','中文 lalala','I miss you'],x=setup(target,()=> '我想你'),old=rows.map(()=> '旧语气词译文');
  if(location==='track')x.state.cache.put('translations:v1:'+target+':'+id,{pairs:rows.slice(0,3).map((s,i)=>[s,old[i]])});
  if(location==='legacy')for(const s of rows.slice(0,3))x.state.cache.put('translation:'+target+':'+s,'旧语气词译文');
  const out=await translate(x.ctx,rows,x.state,'en',location==='source'?old:null);assert.deepEqual(out.translations.slice(0,3),['','','']);assert.ok(out.translations[3]);assert.ok(x.calls.every(r=>r.q.every(s=>s==='I miss you')));
 });
 test(target+': an explicit foreign source can use old valid translations of short words',async()=>{
  const rows=['na','la'],x=setup(target);x.state.cache.put('translations:v1:'+target+':'+id,{pairs:[['na','在'],['la','这里']]});
  const out=await translate(x.ctx,rows,x.state,'pl');assert.deepEqual(out.translations,['在','这里']);assert.equal(x.calls.length,0);
 });
 test(target+': plain Chinese still never converts simplified/traditional forms',async()=>{
  const rows=['原創紙燈','原创纸灯','我想你 啊'],x=setup(target);x.state.cache={get(){throw Error('Pure Chinese must not read cache');}};assert.equal((await translate(x.ctx,rows,x.state,'zh-Hans')).changed,0);assert.equal(x.calls.length,0);
 });
 test(target+': foreign mixed fragments do not reuse English filler suppression',async()=>{
  const x=setup(target,()=> '在'),out=await translate(x.ctx,['街角 na'],x.state,'pl');assert.deepEqual(x.calls[0].q,['na']);assert.deepEqual(out.translations,['街角 在']);
 });
}
test('600 long joined vocal rows stay bounded and issue no requests',async()=>{
 const x=setup(),rows=Array.from({length:600},()=> 'oh'.repeat(1400));const out=await translate(x.ctx,rows,x.state,'en');assert.equal(out.changed,0);assert.equal(x.calls.length,0);assert.equal(x.state.cache.entries.length,0);
});
for(const target of ['en','ja','zh-CN','zh-TW'])test(target+': Chinese vocal-only rows do not translate when the source is Chinese',async()=>{
 const x=setup(target),rows=['啊啊啊','嗯 哼','嘿，哈哈','哦 ah','哎呀','\u200b嗚嗚\u2060'];x.state.cache={get(){throw Error('No cache');}};assert.deepEqual(await translate(x.ctx,rows,x.state,'zh'),{changed:0,translations:rows.map(()=> '')});assert.equal(x.calls.length,0);
});
