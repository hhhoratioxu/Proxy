import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,loadCache} from '../spotify-lyrics.js';
function setup(reply){
 const store=new Map(),calls=[],ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001'},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async(u,o)=>{const rows=new URL(u).searchParams.getAll('q');calls.push({rows,urlLength:u.length,limit:o.timeout});return reply?reply(rows,calls.length):new Response(JSON.stringify(rows.map(s=>'自写译文 '+s)));}}};
 const state={settings:{language:'zh-CN'},cache:loadCache(ctx),deadline:Date.now()+10000};
 return {ctx,state,calls};
}
test('64 short original lines translate in one request and preserve duplicates in output',async()=>{
 const x=setup(),words=Array.from({length:64},(_,i)=>'Original '+i),input=[...words,words[0]],r=await translate(x.ctx,input,x.state);
 assert.equal(r.changed,65);assert.equal(x.calls.length,1);assert.deepEqual(r.translations,input.map(s=>'自写译文 '+s));assert.equal(x.calls[0].rows.length,64);assert.ok(x.calls[0].urlLength<=6800);assert.ok(x.calls[0].limit<=2500);
});
test('long Unicode lines split by the unchanged encoded URL bound',async()=>{
 const x=setup(),words=Array.from({length:70},(_,i)=>'𳈆'.repeat(90)+' light '+i),r=await translate(x.ctx,words,x.state);
 assert.equal(r.changed,70);assert.ok(x.calls.length>2);assert.ok(x.calls.every(c=>c.urlLength<=6800&&c.rows.length<=64));
});
for(const reason of [400,413,414,'count','shape','size'])test('wide-batch rejection downgrades remaining work only once: '+reason,async()=>{
 const x=setup((rows,n)=>n===1?typeof reason==='number'?new Response('',{status:reason}):reason==='count'?new Response('[]'):reason==='shape'?new Response(JSON.stringify(rows.map(()=>null))):new Response('x'.repeat(100000)):new Response(JSON.stringify(rows.map(s=>'自写译文 '+s)))),words=Array.from({length:96},(_,i)=>'Original '+i);
 const r=await translate(x.ctx,words,x.state);assert.equal(r.changed,96);assert.deepEqual(x.calls.map(c=>c.rows.length),[64,32,32,32]);assert.deepEqual(r.translations,words.map(s=>'自写译文 '+s));
});
for(const status of [401,403,429,500])test('wide-batch HTTP '+status+' never starts a retry storm',async()=>{
 const x=setup(()=>new Response('',{status})),r=await translate(x.ctx,Array.from({length:64},(_,i)=>'Original '+i),x.state);
 assert.equal(x.calls.length,1);assert.equal(r.changed,0);
});
