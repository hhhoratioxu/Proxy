import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,loadCache} from '../spotify-lyrics.js';
const id='6n7jFn3rgC6qWjsYaPJfB8',KEY='VerseLyrics.v1.cache';
const words=['오늘은 바람이 조용합니다','Please stay with me','다시 함께 걸어요'],answers=['今天的风很平静','请留在我身边','再次一起走吧'];
function setup(reply=()=>answers,target='zh-CN',track=id){
 const calls=[],store=new Map(),ctx={env:{},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+track},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const q=new URL(u).searchParams.getAll('q');calls.push(q);return new Response(JSON.stringify(reply(q,calls.length)));}}};
 return {ctx,calls,store,state:{settings:{language:target},cache:loadCache(ctx),deadline:Date.now()+10000}};
}
const fresh=x=>({...x.state,cache:loadCache(x.ctx),deadline:Date.now()+10000});
const expire=x=>{const d=JSON.parse(x.store.get(KEY));for(const e of d.entries)for(const pair of e.value?.pairs||[])if(typeof pair[2]==='number')pair[2]=Date.now()-1;x.store.set(KEY,JSON.stringify({entries:d.entries,cooldowns:d.cooldowns||{}}));};
for(const target of ['zh-CN','zh-TW']){
 const key='translations:v1:'+target+':'+id;
 for(const location of ['track','legacy','source','tagged-source'])test(target+': stale '+location+' Korean/English identity rows cannot block a real translation',async()=>{
  const x=setup(()=>answers,target);
  if(location==='track'||location==='tagged-source')x.state.cache.put(key,{pairs:words.map(s=>[s,s,...(location==='tagged-source'?['source']:[])])});
  if(location==='legacy')for(const s of words)x.state.cache.put('translation:'+target+':'+s,s);
  const out=await translate(x.ctx,words,x.state,'ko',location==='source'?words:null);
  assert.deepEqual(out.translations,answers);assert.equal(out.changed,3);assert.equal(x.calls.length,1);
  x.state.cache.save();assert.deepEqual(await translate(x.ctx,words,fresh(x),'ko'),out);assert.equal(x.calls.length,1);
 });
 test(target+': cache-only suppresses stale identity, then online recovers without a cache purge',async()=>{
  const x=setup(()=>answers,target);x.state.cache.put(key,{pairs:words.map(s=>[s,s])});x.state.cache.save();x.ctx.env.NETWORK_MODE='cache-only';
  assert.equal((await translate(x.ctx,words,fresh(x),'ko')).changed,0);assert.equal(x.calls.length,0);x.ctx.env.NETWORK_MODE='online';
  assert.deepEqual((await translate(x.ctx,words,fresh(x),'ko')).translations,answers);assert.equal(x.calls.length,1);
 });
 for(const invalid of [null,'',{},[],42,'x'.repeat(6001),'one\rtwo'])test(target+': one invalid aligned answer retains good Korean/English rows: '+(typeof invalid)+' '+String(invalid).length,async()=>{
  const reply=()=>[answers[0],invalid,answers[2]],x=setup(reply,target),out=await translate(x.ctx,words,x.state,'ko');
  const bad=invalid==='one\rtwo'?false:true;
  // A plain string may retain its own line break, as existing whole-row
  // translations do. Empty/non-string/oversized answers alone are invalid.
  assert.equal(out.changed,bad?2:3);assert.deepEqual(out.translations,[answers[0],bad?'':invalid,answers[2]]);
  x.state.cache.save();assert.deepEqual(await translate(x.ctx,words,fresh(x),'ko'),out);assert.equal(x.calls.length,1);
  if(bad){expire(x);x.ctx.http.get=async u=>{const q=new URL(u).searchParams.getAll('q');x.calls.push(q);assert.deepEqual(q,[words[1]]);return new Response(JSON.stringify([answers[1]]));};assert.deepEqual((await translate(x.ctx,words,fresh(x),'ko')).translations,answers);assert.equal(x.calls.length,2);}
 });
 test(target+': unchanged successful service output has a short retry interval, never a seven-day success lock',async()=>{
  const x=setup(q=>q,target),out=await translate(x.ctx,words,x.state,'ko');assert.equal(out.changed,0);x.state.cache.save();
  assert.equal((await translate(x.ctx,words,fresh(x),'ko')).changed,0);assert.equal(x.calls.length,1);expire(x);
  x.ctx.http.get=async u=>{x.calls.push(new URL(u).searchParams.getAll('q'));return new Response(JSON.stringify(answers));};
  assert.deepEqual((await translate(x.ctx,words,fresh(x),'ko')).translations,answers);assert.equal(x.calls.length,2);
 });
 test(target+': cardinality mismatch never assigns guessed positions or stores a row retry proof',async()=>{
  const x=setup(()=>[answers[0]],target);assert.equal((await translate(x.ctx,words,x.state,'ko')).changed,0);assert.equal(x.state.cache.get(key),undefined);
 });
 for(const until of [0,-1,Date.now()+86400000])test(target+': invalid or excessive retry time cannot suppress a Korean translation '+until,async()=>{
  const x=setup(()=>answers,target);x.state.cache.put(key,{pairs:words.map(s=>[s,'',until])});assert.deepEqual((await translate(x.ctx,words,x.state,'ko')).translations,answers);assert.equal(x.calls.length,1);
 });
 test(target+': expired row proof and valid cache merge retain only one entry per original row',async()=>{
  const x=setup(()=>[answers[0],null,answers[2]],target);await translate(x.ctx,words,x.state,'ko');x.state.cache.save();expire(x);
  const state=fresh(x);x.ctx.http.get=async()=>new Response(JSON.stringify([answers[1]]));await translate(x.ctx,words,state,'ko');state.cache.save();
  const pairs=JSON.parse(x.store.get(KEY)).entries.find(e=>e.key===key).value.pairs;assert.equal(pairs.length,3);assert.equal(new Set(pairs.map(p=>p[0])).size,3);assert.ok(pairs.every(p=>p.length===2));assert.ok(x.store.get(KEY).length<=64000);
 });
}
test('legacy no-track callers retain bounded short retry proofs and expire them',async()=>{
 const x=setup(q=>q,'zh-CN','invalid');assert.equal((await translate(x.ctx,words,x.state,'ko')).changed,0);x.state.cache.save();
 assert.equal((await translate(x.ctx,words,fresh(x),'ko')).changed,0);assert.equal(x.calls.length,1);
 const d=JSON.parse(x.store.get(KEY));for(const e of d.entries)if(e.value?.retry)e.value.retry=Date.now()-1;x.store.set(KEY,JSON.stringify({entries:d.entries,cooldowns:{}}));
 x.ctx.http.get=async()=>new Response(JSON.stringify(answers));assert.deepEqual((await translate(x.ctx,words,fresh(x),'ko')).translations,answers);
});
test('mixed-fragment query aliases keep good positions when a different answer is null',async()=>{
 const rows=['我说 baby','我说 hello','你说 baby'],x=setup(()=>['宝贝',null]),out=await translate(x.ctx,rows,x.state,'zh');
 assert.deepEqual(out.translations,['我说 宝贝','','你说 宝贝']);assert.deepEqual(x.calls,[['baby','hello']]);x.state.cache.save();assert.deepEqual(await translate(x.ctx,rows,fresh(x),'zh'),out);assert.equal(x.calls.length,1);
});

