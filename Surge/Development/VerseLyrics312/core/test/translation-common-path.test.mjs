import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translate,loadCache} from '../spotify-lyrics.js';
const id='0000000000000000000001',key='translations:v1:zh-CN:'+id;
function setup(language='zh-CN') {
 const store=new Map(),calls=[],ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{const rows=new URL(u).searchParams.getAll('q');calls.push(rows);return new Response(JSON.stringify(rows.map(s=>'译文 '+s)));}}};
 return {ctx,calls,store,state:{settings:{language},cache:loadCache(ctx),deadline:Date.now()+10000}};
}
for(const [source,target,line,requests] of [
 ['zh','zh-CN','原创的纸灯照着海面',0],['zh-CN','zh-CN','纸灯与海风',0],['zh-Hans','zh-CN','灯光 2026',0],
 ['zh_TW','zh-TW','原創的紙燈',0],['zh-Hant','zh-TW','燈光照海面',0],
 ['zh','zh-CN','原創的紙燈',0],['zh-Hant','zh-CN','海面',0],['zh','zh-TW','纸灯',0],['zh-CN','zh-TW','纸灯',0],
 ['ja','ja','海の灯りがゆれる',0],['ja-JP','ja','オリジナルのメロディー',0],['ko','ko','바다 위의 빛',0],['ko-KR','ko','가벼운 바람',0],
 ['','zh-CN','海面',0],['ja','zh-CN','海面',1],['en','zh-CN','海面',0],['zh','ja','海面',1],
 ['zh','zh-CN','纸灯 says hello',1],['zh','zh-CN','灯り',1],['zh','zh-CN','灯 빛',1],['zh','zh-CN','灯 Ω',1],
 ['ja','ja','海の light',1],['ko','ko','빛 hello',1],['en','en','Hola amigo',1],['fr','fr','Hello friends',1]
]) test(`explicit source and compatible letters only: ${source || 'unknown'} -> ${target}, ${line}`,async()=>{
 const x=setup(target),r=await translate(x.ctx,[line],x.state,source);
 assert.equal(x.calls.length,requests);assert.equal(r.changed,requests);assert.equal(r.translations.length,1);
 if(!requests){assert.deepEqual(r.translations,['']);x.state.cache.save();assert.equal(x.store.size,0);}
});
test('mixed-language document skips only target-language rows and preserves alignment',async()=>{
 const x=setup(),input=['原创纸灯','The sea is quiet.','纸灯 says hello','又见灯光','The sea is quiet.'];
 const r=await translate(x.ctx,input,x.state,'zh');assert.deepEqual(x.calls,[['The sea is quiet.','says hello']]);
 assert.deepEqual(r.translations,['','译文 The sea is quiet.','纸灯 译文 says hello','','译文 The sea is quiet.']);
});
test('layout variants use one batch and one compact cache pair per sentence',async()=>{
 const x=setup(),input=Array.from({length:48},(_,i)=>'Original line '+i).flatMap(s=>[s,s.replaceAll(' ','  '),'\t'+s+'\t']);
 const copy=[...input],r=await translate(x.ctx,input,x.state);assert.equal(r.changed,144);assert.equal(x.calls.length,1);assert.equal(x.calls[0].length,48);assert.deepEqual(input,copy);
 assert.deepEqual(r.translations,input.map(s=>'译文 '+s.trim().replace(/ +/g,' ')));
 assert.equal(x.state.cache.get(key).pairs.length,48);x.state.cache.save();assert.ok(x.store.get('VerseLyrics.v1.cache').length<=64000);
 x.calls.length=0;const warm=await translate(x.ctx,input,{...x.state,cache:loadCache(x.ctx)});assert.deepEqual(warm,r);assert.equal(x.calls.length,0);
});
test('punctuation, accents, case and line breaks stay significant',async()=>{
 const x=setup(),input=['Sea','sea','séa','sea!',' sea ','two\nlines','two\rlines','two lines'];
 const r=await translate(x.ctx,input,x.state);assert.deepEqual(x.calls,[['Sea','sea','séa','sea!','two lines']]);assert.equal(r.translations[5],'');assert.equal(r.translations[6],'');assert.equal(r.changed,6);
});
test('legacy track pairs with layout variants are read without HTTP',async()=>{
 const x=setup();x.state.cache.put(key,{pairs:[['  Quiet\tsea  ','旧缓存译文']]},60000);
 const r=await translate(x.ctx,['Quiet sea','Quiet  sea'],x.state);assert.deepEqual(r.translations,['旧缓存译文','旧缓存译文']);assert.equal(x.calls.length,0);
});
test('legacy per-line cache with layout variants migrates without HTTP',async()=>{
 const x=setup();x.state.cache.put('translation:zh-CN:  Quiet\tsea  ','旧缓存译文',60000);
 const r=await translate(x.ctx,['  Quiet\tsea  ','Quiet sea'],x.state);assert.deepEqual(r.translations,['旧缓存译文','旧缓存译文']);assert.equal(x.calls.length,0);assert.deepEqual(x.state.cache.get(key).pairs,[['Quiet sea','旧缓存译文']]);
});
test('old cached Simplified/Traditional conversions are suppressed',async()=>{
 const x=setup();x.state.cache.put(key,{pairs:[['紙燈','纸灯']]},60000);
 const r=await translate(x.ctx,['紙燈'],x.state,'zh');assert.deepEqual(r.translations,['']);assert.equal(x.calls.length,0);
});
test('unknown-source fallback text still gets plugin translation',async()=>{
 const x=setup(),r=await translate(x.ctx,['原創紙燈','海の灯り','The sea is quiet.'],x.state);
 assert.equal(r.changed,2);assert.equal(x.calls.length,1);assert.equal(x.calls[0].length,2);assert.equal(r.translations[0],'');
});
test('every independent Han variant, including supplementary planes, is preserved without conversion',async()=>{
 const chars=[...JSON.parse(readFileSync(new URL('./fixtures/han-reference.json',import.meta.url))).pairs],input=[];
 for(let i=0;i<chars.length;i+=2)if(chars[i]!==chars[i+1])input.push(chars[i]);
 assert.equal(input.length,6447);
 for(let at=0;at<input.length;at+=100){const rows=input.slice(at,at+100),x=setup(),r=await translate(x.ctx,rows,x.state,'zh');assert.equal(r.changed,0);assert.equal(x.calls.length,0);}
});
