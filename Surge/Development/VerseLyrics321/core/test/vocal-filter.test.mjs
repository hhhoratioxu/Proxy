import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,loadCache} from '../spotify-lyrics.js';
const id='0000000000000000000001';
function setup(target='zh-CN',reply=s=>'译文 '+s) {
  const store=new Map(),calls=[],ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id},env:{},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const q=new URL(u).searchParams.getAll('q');calls.push(q);return new Response(JSON.stringify(q.map(reply)));}}};
  return {ctx,store,calls,state:{settings:{language:target},cache:loadCache(ctx),deadline:Date.now()+10000}};
}
const fillers=['Oh','OH-oh-oh!','Ooooh…','ah, ah','Aaahhh','uh','Hmm…','mmm','woo!','Woah','whoa','yeah!','hey','yo','ha-ha','la la la','na-na','🎵 oh ♪',''];
for (const target of ['zh-CN','zh-TW','ja','en']) {
  test(target+': filler-only rows avoid cache, source translations and HTTP',async()=>{
    const x=setup(target);x.state.cache={get(){throw Error('unnecessary cache read');}};
    const out=await translate(x.ctx,fillers,x.state,'en',fillers.map(()=> '不该显示'));
    assert.deepEqual(out,{translations:fillers.map(()=>''),changed:0});assert.equal(x.calls.length,0);
  });
  test(target+': complete words and meaningful phrases survive filler filtering',async()=>{
    const rows=['Oh my love','I miss you','Ohio','a','yes','no','baby','hello','haunted','Naomi','Oh 2026','oohbaby','oh là là'],x=setup(target);
    const out=await translate(x.ctx,rows,x.state,'en');assert.equal(out.changed,rows.length);assert.deepEqual(x.calls,[rows]);
  });
}
for (const target of ['zh-CN','zh-TW']) {
  test(target+': Chinese plus only filler retains literal words with no translation',async()=>{
    const rows=['我想你 oh','等你 ah ah','想你 Oh，等你 hmm','紙燈 ooh 🎵'],x=setup(target);
    x.state.cache={get(){throw Error('unnecessary cache read');}};
    assert.deepEqual(await translate(x.ctx,rows,x.state,'zh'),{translations:rows.map(()=>''),changed:0});assert.equal(x.calls.length,0);
  });
  test(target+': meaningful spans translate around literal fillers, including stale cache repair',async()=>{
    const rows=['我想你 oh','我想你 oh，在等你 I miss you','灯火 ooh / 海岸 stay with me','你说 oh my love'];
    const answers={'I miss you':'我想你','stay with me':'陪着我','oh my love':'哦我的爱'},x=setup(target,s=>{assert.ok(s in answers);return answers[s];});
    x.state.cache.put('translations:v1:'+target+':'+id,{pairs:rows.slice(0,3).map(s=>[s,s.replace('oh','哦').replace('ooh','哦').replace('I miss you','我想你').replace('stay with me','陪着我')])},60000);
    x.state.cache.put('translation:'+target+':'+rows[1],'我想你 哦，在等你 我想你',60000);
    const out=await translate(x.ctx,rows,x.state,'zh',rows.map((s,i)=>i<3?s.replace('oh','哦'):null));
    assert.deepEqual(x.calls,[['I miss you','stay with me','oh my love']]);
    assert.deepEqual(out.translations,['','我想你 oh，在等你 我想你','灯火 ooh / 海岸 陪着我','你说 哦我的爱']);
    x.state.cache.save();
    const warm=await translate(x.ctx,rows,{...x.state,cache:loadCache(x.ctx)},'zh');assert.deepEqual(warm,out);assert.equal(x.calls.length,1);
  });
  test(target+': single-query multi-span alignment ignores filler slots but rejects a mismatched reply',async()=>{
    const row='我 oh，你 hello，再 ah，說 goodbye',x=setup(target,s=>{assert.equal(s,'hello\ngoodbye');return '你好\n再见';});
    assert.deepEqual((await translate(x.ctx,[row],x.state,'zh')).translations,['我 oh，你 你好，再 ah，說 再见']);
    const bad=setup(target,()=> '哦\n你好\n再见');assert.equal((await translate(bad.ctx,[row],bad.state,'zh')).changed,0);
  });
  test(target+': cached/source translations of filler rows are rejected in mixed meaningful batches',async()=>{
    const rows=['oh','ah ah','中文 ooh','hello'],x=setup(target,()=> '你好');
    x.state.cache.put('translations:v1:'+target+':'+id,{pairs:rows.slice(0,3).map(s=>[s,'旧语气译文'])},60000);
    x.state.cache.put('translation:'+target+':oh','旧语气译文',60000);
    const out=await translate(x.ctx,rows,x.state,'en',rows.map(()=> '来源语气译文'));
    assert.deepEqual(out.translations,['','','',target==='zh-CN'?'来源语气译文':'你好']);
    assert.equal(x.calls.length,target==='zh-CN'?0:1);
  });
}
test('long repeated filler tokens are processed without query or retained translation cache',async()=>{
  const x=setup(),rows=Array.from({length:600},()=> 'oh '.repeat(999));
  const out=await translate(x.ctx,rows,x.state,'en');assert.equal(out.changed,0);assert.equal(x.calls.length,0);assert.equal(x.state.cache.entries.length,0);
});
