// Optional live check. No Spotify login, user credentials, or real lyric text.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {paletteFromEmbed,parseDocument,parseMetadata,existingPalette} from './core/spotify-lyrics.js';
const id='76XUZSb13QUuj1HECY4Hvo', expected={background:0xff4d545c|0,text:0xffc6ced7|0,highlightText:-1};
const results=[];
for(const track of [id,'4uLU6hMCjMI75M1A2tKUQC','0VjIjW4GlUZAMYd2vXMi3b']) {
  const start=Date.now(),url='https://open.spotify.com/embed/track/'+track;
  const r=await fetch(url,{headers:{Accept:'text/html','User-Agent':'VerseLyrics/0.4.2'},redirect:'error',credentials:'omit',signal:AbortSignal.timeout(10000)});
  assert.equal(r.status,200);
  const colors=paletteFromEmbed(await r.text(),track);assert.ok(colors);
  if(track===id)assert.deepEqual(colors,expected);
  results.push({track,url,status:r.status,elapsed_ms:Date.now()-start,colors});
}
assert.ok(new Set(results.map(r=>r.colors.background)).size>1,'per-track colors, not fixed');
const fixture=JSON.parse(readFileSync(new URL('./core/test/fixtures/target-song.json',import.meta.url)));
const meta=parseMetadata(Buffer.from(fixture.metadata_base64,'base64'),fixture.track_hex).meta;
const words=['A lantern floats above the sea.','The evening brings it back to me.'];
const doc={lyrics:{syncType:'LINE_SYNCED',provider:'lrclib',providerDisplayName:'LRCLIB',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(1000+2100*i),syllables:[],endTimeMs:'0'}))},colors:{background:-15656936,text:-1,highlightText:-1}};
const entries=[['meta:'+id,{id:meta.id,title:meta.title,album:meta.album,artists:meta.artists,duration:meta.duration}],['lyrics:auto:'+id,doc]].map(([key,value])=>({key,value,expires:Date.now()+600000}));
const store=new Map([['VerseLyrics.v1.cache',JSON.stringify({entries,cooldowns:{}})]]),timers=[],calls=[];
let doneCount=0,resolveDone;const done=new Promise(r=>resolveDone=r);
const context={
  $request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,method:'GET',headers:{Accept:'application/x-protobuf',Authorization:'Bearer fake-test-only','Client-Token':'fake-client',Cookie:'fake-cookie'}},
  $response:{status:404,headers:{'Content-Type':'application/json'},body:new Uint8Array(Buffer.from('{}'))},
  $argument:{TRANSLATION_ENABLED:false,FALLBACK_PROVIDER:'auto'},
  $persistentStore:{read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}},
  setTimeout:(fn,ms)=>{const t=setTimeout(fn,ms);timers.push(t);return t;},
  console:{log:()=>{throw Error('unexpected runtime log');}},
  $httpClient:{get:(o,cb)=>{
    assert.equal(o.url,'https://open.spotify.com/embed/track/'+id);
    assert.ok(o.timeout<=1500);assert.equal(o['auto-cookie'],false);assert.equal(o['auto-redirect'],false);assert.equal(o['binary-mode'],true);
    assert.deepEqual(Object.keys(o.headers).sort(),['Accept','User-Agent']);
    calls.push({url:o.url,timeout_ms:o.timeout});
    fetch(o.url,{headers:o.headers,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(o.timeout)}).then(async r=>cb(null,{status:r.status,headers:{}},new Uint8Array(await r.arrayBuffer()))).catch(()=>cb('live fetch failed'));
  }},
  $done:r=>{doneCount++;resolveDone(r);}
};
const start=Date.now();
try {
  vm.runInNewContext(readFileSync(new URL('./runtime/Loon/script/SpotifyLyrics.js',import.meta.url),'utf8'),context,{timeout:1000});
  const out=await done;assert.equal(doneCount,1);assert.equal(out.status,200);assert.equal(calls.length,1);
  const bytes=new Uint8Array(out.body),parsed=parseDocument(bytes,'application/x-protobuf');
  assert.deepEqual(parsed.words,words);assert.deepEqual(existingPalette(bytes,parsed),expected);
  results.push({client:'Loon',scenario:'0.4.1 cached self-written lyrics plus real public track palette',status:200,elapsed_ms:Date.now()-start,colors:existingPalette(bytes,parsed),native_format:'protobuf',network_calls:calls});
} finally {for(const t of timers)clearTimeout(t);}
const evidence={checked_at:new Date().toISOString(),version:'0.4.2',scope:'Actual unauthenticated Spotify public palette requests and simulated Loon native callback runtime. No iPhone visual acceptance.',results};
writeFileSync(new URL('./live-palette-results.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
