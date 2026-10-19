import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'fflate';
import {googleFallback,translationBatch} from '../src/translation.mjs';
import {readTimeline} from '../src/timeline.mjs';
import {Settings,utf8,fromUtf8} from '../src/data.mjs';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source='<timedtext format="3"><body><p t="1000" d="2000">안녕하세요.</p><p t="4000" d="500">♪</p><p t="6000" d="2000">오늘 날씨가 좋아요.</p></body></timedtext>';
const answers=['你好。','♪','今天天氣很好。'];
async function run(body,headers={}){
 const d={},timeline=readTimeline(source);
 const out=await googleFallback({translate:async()=>({status:200,headers,body:typeof body==='string'?utf8(body):body})},new Settings({TARGET_LANGUAGE:'zh-Hant'}),timeline,'ko',d,Date.now()+6500);
 return{out,d,text:out?fromUtf8(out):''};
}
for(const prefix of ['\uFEFF',")]}'\n",")]}'\r\n",'\uFEFF'+")]}'\n"])
 test('Google JSON envelope accepts an explicit protection prefix '+JSON.stringify(prefix),async()=>{
  const {out,text,d}=await run(prefix+JSON.stringify(answers));assert.ok(out);assert.ok(text.includes('안녕하세요.\n你好。'));assert.ok(text.includes('t="6000" d="2000"'));assert.equal(d.captionFallbackResponseItems,3);
 });
test('an empty translation slot preserves that cue and still translates its neighbors without shifting',async()=>{
 const {out,text,d}=await run(JSON.stringify([answers[0],'',answers[2]]));assert.ok(out);assert.ok(text.includes('t="4000" d="500">♪</p>'));assert.ok(text.includes('오늘 날씨가 좋아요.\n今天天氣很好。'));assert.equal(d.captionFallbackTranslatedItems,2);assert.equal(d.captionFallbackEmptyItems,1);
});
test('an explicit null slot is kept in position as untranslated text',async()=>{
 const {out,text,d}=await run(JSON.stringify([answers[0],null,answers[2]]));assert.ok(out);assert.ok(text.includes('t="4000" d="500">♪</p>'));assert.ok(text.includes('오늘 날씨가 좋아요.\n今天天氣很好。'));assert.equal(d.captionFallbackEmptyItems,1);
});
test('fallback transport asks for identity encoding and receives only form fields and language',()=>{
 const batch=translationBatch(readTimeline(source),'ko','zh-Hant');assert.equal(batch.request.headers['Accept-Encoding'],'identity');assert.equal(new URLSearchParams(batch.request.body).getAll('q').length,3);
});
test('raw gzip replies are bounded and decoded before JSON parsing',async()=>{
 const {out,d}=await run(gzipSync(utf8(JSON.stringify(answers))),{'Content-Encoding':'gzip'});assert.ok(out);assert.equal(d.captionFallbackEncoding,'gzip');assert.equal(d.captionFallbackResponseItems,3);
});
test('decoded JSON with a stale compression header remains usable',async()=>{
 const {out,d}=await run(JSON.stringify(answers),{'Content-Encoding':'br'});assert.ok(out);assert.equal(d.captionFallbackEncoding,'br');
});
for(const [body,headers,expected]of [
 ['<html>PRIVATE_TEXT</html>',{'Content-Type':'text/html'},'html-response'],
 ['{"sentences":"PRIVATE_TEXT"}',{},'unexpected-shape'],
 [JSON.stringify(['私人文字']),{},'item-count'],
 [JSON.stringify([answers[0],{text:'PRIVATE_TEXT'},answers[2]]),{},'invalid-entry'],
 ['not JSON PRIVATE_TEXT',{},'invalid-json'],
 [new Uint8Array([0xff,0xfe,0xfd]),{},'invalid-utf8'],
 [new Uint8Array([0x81,0x01,0x08]),{'Content-Encoding':'br'},'unsupported-encoding'],
 [new Uint8Array([31,139,8,0]),{'Content-Encoding':'gzip'},'invalid-compression']
])test('privacy-safe fallback diagnostics distinguish '+expected,async()=>{
 const {out,d}=await run(body,headers);assert.equal(out,null);assert.equal(d.captionFallbackReason,expected);assert.equal(d.captionFallbackRequestItems,3);assert.ok(Number.isInteger(d.captionFallbackResponseBytes));assert.ok(!/PRIVATE|私人|안녕하세요|<html|sentences/.test(JSON.stringify(d)));
});
test('Google source-language tuples retain exact positions',async()=>{
 const {out,text}=await run(JSON.stringify(answers.map(x=>[x,'ko'])));assert.ok(out);assert.ok(text.includes('你好。'));assert.ok(text.includes('今天天氣很好。'));
});
test('built Loon adapter combines binary gzip, protected JSON and an empty slot with one completion',async()=>{
 const code=await readFile(new URL('../dist/clients.js',import.meta.url),'utf8');
 const reply=gzipSync(utf8('\uFEFF'+")]}'\n"+JSON.stringify([answers[0],'',answers[2]])));
 let finish,count=0;const done=new Promise(resolve=>finish=resolve),logs=[],calls=[];
 vm.runInNewContext(code,{Uint8Array,ArrayBuffer,DataView,TextEncoder:undefined,TextDecoder:undefined,setTimeout:(fn,ms)=>setTimeout(fn,ms).unref(),$loon:'self-written Loon API fixture',$argument:{TARGET_LANGUAGE:'zh-Hant'},$request:{url:'https://www.youtube.com/api/timedtext?lang=ko&format=srv3',headers:{}},$response:{status:200,headers:{'Content-Type':'application/xml'},body:utf8(source)},$persistentStore:{read:()=>null,write:()=>true},$httpClient:{get:(r,cb)=>cb(null,{status:429},utf8('limited')),post:(r,cb)=>{calls.push(r);cb(null,{status:200,headers:{'Content-Encoding':'gzip'}},reply);cb(null,{status:200},utf8('duplicate callback'));}},$done:out=>{count++;finish(out);},console:{log:s=>logs.push(s)}},{timeout:3000});
 const out=await done;assert.equal(count,1);assert.equal(calls.length,1);assert.equal(calls[0].headers['Accept-Encoding'],'identity');assert.equal(calls[0]['binary-mode'],true);assert.ok(fromUtf8(out.body).includes('안녕하세요.\n你好。'));assert.ok(fromUtf8(out.body).includes('t="4000" d="500">♪</p>'));assert.equal(JSON.parse(logs[0].slice(15)).captionFallbackTranslatedItems,2);
});
