import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import run from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics.js';
import {parseDocument,existingPalette} from './core/spotify-lyrics.js';
const entity=JSON.parse(readFileSync(new URL('./core/test/fixtures/target-palette.json',import.meta.url))).entity;
const id=entity.id, colors={background:0xff4d545c|0,text:0xffc6ced7|0,highlightText:-1};
const page='<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{state:{data:{entity}}}}})+'</script>';
const words=['A lantern floats above the sea.','The evening brings it back to me.'];
const lyrics={lyrics:{syncType:'LINE_SYNCED',provider:'lrclib',providerDisplayName:'LRCLIB',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(1000+i*2100),endTimeMs:'0',syllables:[]}))},colors:{background:-15656936,text:-1,highlightText:-1}};
for(const type of ['application/json','application/x-protobuf'])for(const offline of [false,true])test(`Egern packaged native ctx: ${type}, palette offline=${offline}`,async()=>{
  const entries=[['meta:'+id,{id,title:'Original Test Song',album:'Original Test Album',artists:['Test Artist'],duration:180}],['lyrics:auto:'+id,lyrics]].map(([key,value])=>({key,value,expires:Date.now()+600000}));
  const store=new Map([['VerseLyrics.v1.cache',{entries,cooldowns:{}}]]),calls=[];
  const ctx={env:{TRANSLATION_ENABLED:'false'},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:type,Authorization:'Bearer fake-test-only'})},response:new Response('missing',{status:404,headers:{'Content-Type':type}}),storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)},http:{get:async(url,options)=>{
    calls.push({url,options});assert.equal(url,'https://open.spotify.com/embed/track/'+id);assert.deepEqual(Object.keys(options.headers).sort(),['Accept','User-Agent']);assert.ok(options.timeout>0&&options.timeout<=1500);assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');if(offline)throw Error('fixture offline');return new Response(page);
  }}};
  const out=await run(ctx);assert.equal(out.status,200);assert.equal(calls.length,1);
  const doc=parseDocument(out.body,type);assert.deepEqual(doc.words,words);
  assert.deepEqual(existingPalette(out.body,doc),offline?{background:0xff535353|0,text:0xffc7c7c7|0,highlightText:-1}:colors);
  assert.equal(JSON.stringify(store.get('VerseLyrics.v1.cache')).includes('fake-test-only'),false);
});

import {sourceFixture} from './core/test/fixtures/source-services.mjs';
for(const provider of ['kugou','kuwo','lyricsovh'])for(const type of ['application/json','application/x-protobuf'])test(`Egern packaged ${provider}: native ${type}`,async()=>{
 const track='0000000000000000000001',meta={id:track,title:'Paper Lantern',album:'Quiet Walk',artists:['Ada North'],duration:180},store=new Map([['VerseLyrics.v1.cache',{entries:[{key:'meta:'+track,value:meta,expires:Date.now()+600000},{key:'palette:v1:'+track,value:{colors,source:'fixture'},expires:Date.now()+600000}],cooldowns:{}}]]),calls=[];
 const ctx={env:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:provider},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+track,headers:new Headers({Accept:type})},response:new Response('missing',{status:404,headers:{'Content-Type':type}}),storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)},http:{get:async u=>{calls.push(u);return new Response(JSON.stringify(sourceFixture(provider,u)));}}};
 const out=await run(ctx);assert.equal(out.status,200);assert.deepEqual(parseDocument(out.body,type).words,['A paper lantern floats.','Our evening light returns.']);assert.equal(calls.length,2);assert.deepEqual(existingPalette(out.body,parseDocument(out.body,type)),colors);
 if(type==='application/json')assert.equal(JSON.parse(Buffer.from(out.body)).lyrics.syncType,provider==='lyricsovh'?'UNSYNCED':'LINE_SYNCED');
});
for(const type of ['application/json','application/x-protobuf'])test(`Egern packaged cached response without metadata: ${type}`,async()=>{
 const entries=[{key:'lyrics:auto:'+id,value:{v:1,p:'lrclib',t:true,l:words.map((w,i)=>[1000+i*2100,w])},expires:Date.now()+600000},{key:'palette:v1:'+id,value:{colors},expires:Date.now()+600000},{key:'translations:v1:zh-CN:'+id,value:{pairs:words.map((w,i)=>[w,'自写译文'+i])},expires:Date.now()+600000}],store=new Map([['VerseLyrics.v1.cache',{entries,cooldowns:{}}]]);let calls=0;
 const ctx={env:{TRANSLATION_ENABLED:true},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:type})},response:new Response('missing',{status:404}),storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)},http:{get:async()=>{calls++;throw Error('cache should avoid HTTP');}}};
 const out=await run(ctx);assert.equal(out.status,200);assert.equal(calls,0);assert.deepEqual(parseDocument(out.body,type).words,words);assert.deepEqual(existingPalette(out.body,parseDocument(out.body,type)),colors);assert.ok(Buffer.from(out.body).includes(Buffer.from('自写译文0')));
});
