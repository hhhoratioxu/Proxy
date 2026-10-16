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
