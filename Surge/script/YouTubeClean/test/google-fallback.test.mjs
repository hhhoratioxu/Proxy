import test from 'node:test';
import assert from 'node:assert/strict';
import {Settings,utf8,fromUtf8} from '../src/data.mjs';
import {handle} from '../src/runtime.mjs';
const url='https://www.youtube.com/api/timedtext?v=PRIVATE_VIDEO&lang=ko&signature=PRIVATE_SIGNATURE&format=srv3';
const original='<timedtext format="3"><body><p t="1000" d="1500"><s>안녕하세요.</s></p><p t="3000" d="1200"><s>오늘 날씨가 좋아요.</s></p></body></timedtext>';
const replies=['你好。','今天天氣很好。'];
const settings=new Settings({TARGET_LANGUAGE:'zh-Hant'});
function context(cache={}){
 const reports=[],gets=[],posts=[];
 return {reports,gets,posts,cache,io:{url,phase:'response',status:200,body:utf8(original),requestHeaders:{Cookie:'PRIVATE_COOKIE',Authorization:'PRIVATE_AUTH'},responseHeaders:{},store:{read:k=>cache[k],write:(k,v)=>{cache[k]=v;return true;}},report:r=>reports.push(r),download:async(u)=>{gets.push(u);return{status:429,headers:{'Retry-After':'60'},body:utf8('rate limited')};},translate:async(request,timeout)=>{posts.push({request,timeout});return{status:200,headers:{},body:utf8(JSON.stringify(replies))};}}};
}
test('YouTube 429 invokes one Google batch and produces Traditional Chinese bilingual srv3 captions',async()=>{
 const c=context(),out=await handle(c.io,settings);assert.ok(out?.body);const text=fromUtf8(out.body);assert.ok(text.includes('안녕하세요.\n你好。'));assert.ok(text.includes('오늘 날씨가 좋아요.\n今天天氣很好。'));assert.ok(text.includes('t="3000" d="1200"'));
 assert.equal(c.gets.length,1);assert.equal(c.posts.length,1);assert.ok(c.posts[0].request.url.startsWith('https://translate.googleapis.com/translate_a/t?'));assert.ok(c.posts[0].request.url.includes('tl=zh-TW'));
 assert.deepEqual(new URLSearchParams(c.posts[0].request.body).getAll('q'),['안녕하세요.','오늘 날씨가 좋아요.']);assert.ok(!/PRIVATE_/.test(JSON.stringify(c.posts)));assert.ok(!/PRIVATE_|안녕하세요/.test(JSON.stringify(c.reports)));
 assert.equal(c.reports[0].captionProvider,'google');assert.equal(c.reports[0].captionDownloadStatus,429);assert.equal(c.reports[0].captionFallbackStatus,200);assert.ok(c.posts[0].timeout>0&&c.posts[0].timeout<=4000);
});
test('YouTube cooldown skips its endpoint but continues the usable Google translation path',async()=>{
 const first=context();assert.ok((await handle(first.io,settings))?.body);const second=context(first.cache);assert.ok((await handle(second.io,settings))?.body);assert.equal(second.gets.length,0);assert.equal(second.posts.length,1);
});
test('disabling fallback makes no Google request and preserves the native response',async()=>{
 const c=context();assert.equal(await handle(c.io,new Settings({TARGET_LANGUAGE:'zh-Hant',FALLBACK_TRANSLATION:false})),null);assert.equal(c.posts.length,0);
});
test('Google translation-only mode preserves native timing and excludes the original words',async()=>{
 const c=context(),out=await handle(c.io,new Settings({TARGET_LANGUAGE:'zh-Hant',BILINGUAL:false}));assert.ok(out?.body);const text=fromUtf8(out.body);assert.ok(text.includes('今天天氣很好。'));assert.ok(!text.includes('안녕하세요'));assert.ok(text.startsWith('<timedtext format="3">'));
});
for(const bad of [['only one result'],[42,'second'],[{text:'unrecognized'},'second'],'not an array'])test('invalid/misaligned Google batch retains all original bytes: '+JSON.stringify(bad),async()=>{
 const c=context();c.io.translate=async()=>({status:200,body:utf8(JSON.stringify(bad))});assert.equal(await handle(c.io,settings),null);
});
test('Google 429 creates its own cooldown and prevents repeated provider calls',async()=>{
 const c=context();c.io.translate=async(request)=>{c.posts.push(request);return{status:429,headers:{'Retry-After':'60'},body:utf8('limited')};};assert.equal(await handle(c.io,settings),null);assert.equal(c.posts.length,1);
 const next=context(c.cache);assert.equal(await handle(next.io,settings),null);assert.equal(next.posts.length,0);
});
test('successful YouTube translation never sends caption text to the fallback provider',async()=>{
 const c=context();c.io.download=async()=>({status:200,body:utf8('<timedtext><body><p t="1000" d="1500">你好。</p><p t="3000" d="1200">今天天氣很好。</p></body></timedtext>')});assert.ok((await handle(c.io,settings))?.body);assert.equal(c.posts.length,0);
});
