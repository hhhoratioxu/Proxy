import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translate,loadCache} from '../spotify-lyrics.js';
const id='0000000000000000000001',KEY='VerseLyrics.v1.cache';
function setup(target='zh-CN',reply){
 const store=new Map(),calls=[],ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const rows=new URL(u).searchParams.getAll('q');calls.push(rows);return new Response(JSON.stringify(rows.map((s,i)=>reply?reply(s,i):'译文 '+s)));}}};
 return {ctx,store,calls,state:{settings:{language:target},cache:loadCache(ctx),deadline:Date.now()+10000}};
}
const pairs=[['Hey，原創紙燈','Hey, 原创纸灯'],['WJK 你穿著白衣','WJK 你穿着白衣'],['妳好 WJK','你好 WJK'],['WJK 這裡','WJK 这里'],['WJK 紙\u200b燈','WJK 纸灯']];
for(const target of ['zh-CN','zh-TW']){
 const key='translations:v1:'+target+':'+id;
 for(const source of ['zh','zh-Hant','en','','ja','ko'])test(target+': translate English inside Chinese without skipping the whole row, source '+(source||'unknown'),async()=>{
  const rows=['我愛你 baby','你穿著白衣 Yeah','這裡 ㄅㄆㄇ 2026','🎵 原創 WJK'];
  const values=['我愛你 宝贝','你穿著白衣 是的',rows[2],'🎵 原創 王俊凯'];
  const copy=[...rows],x=setup(target,s=>[s==='baby'?'宝贝':s==='Yeah'?'是的':s==='WJK'?'王俊凯':s,'zh-CN']),r=await translate(x.ctx,rows,x.state,source);
  assert.equal(r.changed,3);assert.deepEqual(r.translations,[values[0],values[1],'',values[3]]);assert.deepEqual(x.calls,[source==='ja'||source==='ko'?['baby','Yeah',rows[2],'WJK']:['baby','Yeah','WJK']]);assert.deepEqual(rows,copy);
  x.state.cache.save();const warm=await translate(x.ctx,rows,{...x.state,cache:loadCache(x.ctx)},source);assert.deepEqual(warm,r);assert.equal(x.calls.length,1);assert.ok(x.store.get(KEY).length<=64000);
 });
 for(const source of ['zh','zh-Hant','en','','ja','ko'])test(target+': output gate rejects only conversion and caches an actual attempt, '+(source||'unknown'),async()=>{
  const rows=pairs.map(p=>p[target==='zh-CN'?0:1]),values=pairs.map(p=>p[target==='zh-CN'?1:0]),x=setup(target,s=>[s,'en']);
  const r=await translate(x.ctx,rows,x.state,source);assert.deepEqual(r.translations,rows.map(()=>''));assert.equal(r.changed,0);assert.equal(x.calls.length,1);
  assert.deepEqual(x.state.cache.get(key).pairs,rows.map(s=>[s,s,'checked']));
  x.state.cache.save();const warm=await translate(x.ctx,rows,{...x.state,cache:loadCache(x.ctx)},source);assert.deepEqual(warm,r);assert.equal(x.calls.length,1);
 });
 for(const location of ['track','legacy','source','tagged-source'])for(const identity of [true,false])test(target+': stale '+location+' '+(identity?'identity':'conversion')+' cannot block English translation',async()=>{
  const x=setup(target,()=>['宝贝','en']),row='我愛你 baby',old=identity?row:'我爱你 baby';
  if(location==='track'||location==='tagged-source')x.state.cache.put(key,{pairs:[[row,old,...(location==='tagged-source'?['source']:[])]]});
  if(location==='legacy')x.state.cache.put('translation:'+target+':'+row,old);
  const r=await translate(x.ctx,[row],x.state,'zh',location==='source'?[old]:null);assert.deepEqual(r.translations,['我愛你 宝贝']);assert.equal(x.calls.length,1);
  x.state.cache.save();assert.deepEqual((await translate(x.ctx,[row],{...x.state,cache:loadCache(x.ctx)},'zh')).translations,r.translations);assert.equal(x.calls.length,1);
 });
 for(const location of ['track','legacy'])for(const identity of [true,false])test(target+': cache-only suppresses stale '+location+' results without making requests',async()=>{
  const x=setup(target),row='我愛你 baby',old=identity?row:'我爱你 baby';x.ctx.env={NETWORK_MODE:'cache-only'};
  if(location==='track')x.state.cache.put(key,{pairs:[[row,old]]});else x.state.cache.put('translation:'+target+':'+row,old);
  const r=await translate(x.ctx,[row],x.state,'zh');assert.deepEqual(r.translations,['']);assert.equal(x.calls.length,0);
 });
 test(target+': service-detected zh preserves meaningful English translation despite stale metadata',async()=>{
  const x=setup(target,()=>['宝贝','zh-CN']),rows=['Baby，软件正在更新'];
  const r=await translate(x.ctx,rows,x.state,'ja');assert.equal(r.changed,1);assert.deepEqual(r.translations,['宝贝，软件正在更新']);x.state.cache.save();
  assert.equal((await translate(x.ctx,rows,{...x.state,cache:loadCache(x.ctx)},'ja')).changed,1);assert.equal(x.calls.length,1);
 });
 test(target+': pure Chinese detection still corrects stale foreign metadata',async()=>{
  const x=setup(target,()=>['軟體正在更新','zh-CN']),rows=['软件正在更新'];
  const r=await translate(x.ctx,rows,x.state,'ja');assert.equal(r.changed,0);assert.deepEqual(r.translations,['']);x.state.cache.save();
  assert.deepEqual(x.state.cache.get(key).pairs,[[rows[0],rows[0]]]);assert.equal((await translate(x.ctx,rows,{...x.state,cache:loadCache(x.ctx)},'ja')).changed,0);assert.equal(x.calls.length,1);
 });
 test(target+': layout variants of stale cache recheck English once and stay aligned',async()=>{
  const x=setup(target,()=>['宝贝','zh']),old='  我愛你\tbaby  ',rows=[old,'我愛你 baby','我愛你  baby'];x.state.cache.put('translation:'+target+':'+old,old);
  const r=await translate(x.ctx,rows,x.state,'zh');assert.deepEqual(x.calls,[['baby']]);assert.deepEqual(r.translations,rows.map(()=>'我愛你 宝贝'));assert.deepEqual(x.state.cache.get(key).pairs,[['我愛你 baby','我愛你 宝贝']]);
 });
 test(target+': useful mixed cache, including source provenance, stays warm',async()=>{
  const row='我愛你 baby',x=setup(target),pair=[row,'我爱你，宝贝'];x.state.cache.put(key,{pairs:[[...pair,...(target==='zh-CN'?['source']:[])]]});const r=await translate(x.ctx,[row],x.state,'zh');assert.deepEqual(r.translations,[pair[1]]);assert.equal(x.calls.length,0);
 });
 test(target+': checked no-op survives disabled source translations and scoped cache merge',async()=>{
  const x=setup(target,()=>['baby','en']),row='我愛你 baby';await translate(x.ctx,[row],x.state,'zh');x.state.cache.save();
  const c=loadCache(x.ctx,{track:id,language:target});c.put(key,{pairs:[['Another line','另一行']]});c.save();
  const r=await translate(x.ctx,[row],{...x.state,settings:{language:target,sourceTranslations:false},cache:loadCache(x.ctx)},'zh');assert.deepEqual(r.translations,['']);assert.equal(x.calls.length,1);assert.ok(loadCache(x.ctx).get(key).pairs.some(p=>p[0]===row&&p[2]==='checked'));
 });
 test(target+': no-track legacy no-op proves one attempt without repeated HTTP',async()=>{
  const x=setup(target,()=>['baby','en']),row='我愛你 baby';x.ctx.request.url='https://example.test/';
  const r=await translate(x.ctx,[row],x.state,'zh');assert.equal(r.changed,0);x.state.cache.save();const b=await translate(x.ctx,[row],{...x.state,cache:loadCache(x.ctx)},'zh');assert.deepEqual(b,r);assert.equal(x.calls.length,1);
 });
 test(target+': failed translation does not mark a stale identity as freshly checked',async()=>{
  const x=setup(target),row='我愛你 baby';x.state.cache.put(key,{pairs:[[row,row]]});x.ctx.http.get=async()=>{x.calls.push([]);return new Response('{}');};assert.equal((await translate(x.ctx,[row],x.state,'zh')).changed,0);x.state.cache.save();
  x.ctx.http.get=async()=>{x.calls.push([row]);return new Response(JSON.stringify([['宝贝','zh']]));};const r=await translate(x.ctx,[row],{...x.state,cache:loadCache(x.ctx)},'zh');assert.deepEqual(r.translations,['我愛你 宝贝']);assert.equal(x.calls.length,2);
 });
 test(target+': Japanese words and independently foreign rows still receive useful translation',async()=>{
  const rows=['手紙','東京の光','海 빛','The lantern is bright.'],values=['信件','东京的光','海上的光','纸灯很明亮'];const x=setup(target,(_,i)=>[values[i],i===1?'zh-CN':'ja']);
  const r=await translate(x.ctx,rows,x.state,'ja');assert.deepEqual(r.translations,values);assert.equal(r.changed,4);assert.equal(x.calls.length,1);
 });
}
test('Chinese text still translates to an explicitly selected foreign target',async()=>{
 const x=setup('en',()=>['An original paper lantern','zh-CN']),r=await translate(x.ctx,['原創紙燈'],x.state,'zh');assert.deepEqual(r.translations,['An original paper lantern']);assert.equal(r.changed,1);assert.equal(x.calls.length,1);
});
test('output comparison handles different UTF-16 widths without breaking supplementary Han names',async()=>{
 const chars=[...JSON.parse(readFileSync(new URL('./fixtures/han-reference.json',import.meta.url))).pairs],pairs=[];
 for(let i=0;i<chars.length&&pairs.length<12;i+=2)if(chars[i].length!==chars[i+1].length)pairs.push(['WJK '+chars[i],'WJK '+chars[i+1]]);
 assert.equal(pairs.length,12);const x=setup('zh-CN',s=>s);x.state.cache.put('translations:v1:zh-CN:'+id,{pairs});
 const r=await translate(x.ctx,pairs.map(p=>p[0]),x.state,'ja');assert.equal(r.changed,0);assert.deepEqual(r.translations,pairs.map(()=>''));assert.equal(x.calls.length,1);
});
