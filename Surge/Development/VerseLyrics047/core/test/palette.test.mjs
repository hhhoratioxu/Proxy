import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import run, {paletteFromEmbed, fallbackPalette, paletteContrast, validPalette, loadCache, parseDocument, encodeDocument} from '../spotify-lyrics.js';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/target-palette.json', import.meta.url)));
const id = fixture.entity.id, key = 'VerseLyrics.v1.cache', endpoint = 'https://open.spotify.com/embed/track/' + id;
const expected = {background:0xff4d545c|0, text:0xffc6ced7|0, highlightText:-1};
const neutral = {background:0xff535353|0, text:0xffc7c7c7|0, highlightText:-1};
const html = (entity=fixture.entity) => '<script type="application/json" id="__NEXT_DATA__">' + JSON.stringify({props:{pageProps:{state:{data:{entity}}}}}) + '</script>';
const color = n => ({alpha:255,red:n,green:n,blue:n});
const meta = {id,title:'Original Test Song',album:'Original Test Album',artists:['Test Artist'],duration:180};
// Self-written content; no real lyric text is retained in this fixture.
const old = {lyrics:{syncType:'LINE_SYNCED',language:'en',provider:'lrclib',providerDisplayName:'LRCLIB',lines:[{words:'A lantern floats above the sea.',startTimeMs:'1000',endTimeMs:'0',syllables:[]},{words:'The evening brings it back to me.',startTimeMs:'3100',endTimeMs:'0',syllables:[]}]},colors:{background:-15656936,text:-1,highlightText:-1}};
function context({store=new Map(),network=async()=>new Response(html()),status=404,type='application/json',body='missing'}={}) {
  const calls=[];
  const ctx={env:{TRANSLATION_ENABLED:'false',FALLBACK_PROVIDER:'auto'},request:{url:`https://spclient.wg.spotify.com/color-lyrics/v2/track/${id}`,headers:new Headers({Accept:type,Authorization:'Bearer fake-local-test-only',Cookie:'fake-cookie','Client-Token':'fake-client'})},response:new Response(body,{status,headers:{'Content-Type':type}}),storage:{getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:async(url,options)=>{calls.push({url,options});return network(url,options);}}};
  const state={deadline:Date.now()+20000,cache:loadCache(ctx)};
  return {ctx,state,calls,store};
}
function seed(x) {x.state.cache.put('meta:'+id,meta);x.state.cache.put('lyrics:auto:'+id,old);x.state.cache.save();}
// Independent uint32 wire reader checks the actual outgoing native color fields.
function readFields(input) {
  const b=Buffer.from(input),out=[];let i=0;
  const uint=()=>{let n=0,m=1,v;do{v=b[i++];assert.notEqual(v,undefined);n+=(v&127)*m;m*=128;}while(v&128);return n;};
  while(i<b.length){const tag=uint(),number=tag>>>3,wire=tag&7;assert.ok(wire===0||wire===2);if(wire===0)out.push({number,wire,value:uint()});else{const n=uint();out.push({number,wire,bytes:b.subarray(i,i+n)});i+=n;}}
  return out;
}
function nativeColors(bytes) {return Object.fromEntries(readFields(readFields(bytes).find(f=>f.number===2).bytes).map(f=>[['background','text','highlightText'][f.number-1],f.value]));}
test('target song takes its Spotify slate palette and distinct text roles',()=>{
  assert.deepEqual(paletteFromEmbed(html(),id),expected);
  assert.ok(paletteContrast(expected.background,expected.text)>=3);
  assert.ok(paletteContrast(expected.background,expected.highlightText)>=4.5);
});
for (const change of [{id:'0000000000000000000001'},{uri:'spotify:track:0000000000000000000001'},{type:'episode'}]) test('a mismatched public page cannot color another track '+JSON.stringify(change),()=>{assert.equal(paletteFromEmbed(html({...fixture.entity,...change}),id),null);});
for(const bad of ['', '<script id="__NEXT_DATA__">broken</script>', html().repeat(3000), '<script id="something_else">{}</script>']) test('invalid or oversized embed data is rejected '+bad.length,()=>assert.equal(paletteFromEmbed(bad,id),null));
for (const bad of [{alpha:254,red:20,green:30,blue:40},{alpha:255,red:256,green:0,blue:0},{alpha:255,red:'40',green:0,blue:0}]) test('invalid background channels are rejected '+JSON.stringify(bad),()=>assert.equal(paletteFromEmbed(html({...fixture.entity,visualIdentity:{backgroundBase:bad}}),id),null));
for(const n of [0,77,128,200,255]) test('missing or illegible text colors are readable on background '+n,()=>{
  const visualIdentity={backgroundBase:color(n),textBase:color(n),textSubdued:color(n)};
  const p=paletteFromEmbed(html({...fixture.entity,visualIdentity}),id);
  assert.ok(paletteContrast(p.background,p.highlightText)>=4.5);
  assert.ok(paletteContrast(p.background,p.text)>=3);
  assert.notEqual(p.text,p.highlightText);
});
test('signed and unsigned opaque ARGB are accepted; transparent, fractional and absent values are rejected',()=>{
  assert.deepEqual(validPalette({background:0xff4d545c,text:0xffc6ced7,highlightText:0xffffffff}),expected);
  for(const value of [1.5,NaN,0x004d545c,-2147483649,4294967296,undefined])assert.equal(validPalette({...expected,background:value}),null);
});
test('public palette lookup omits every Spotify credential, bounds time, and caches only colors',async()=>{
  const x=context();assert.deepEqual(await fallbackPalette(x.ctx,id,x.state),expected);
  const {url,options}=x.calls[0];assert.equal(url,endpoint);assert.deepEqual(Object.keys(options.headers).sort(),['Accept','User-Agent']);assert.equal(options.headers['User-Agent'],'VerseLyrics/0.4.7');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.insecureTls,false);assert.ok(options.timeout>0&&options.timeout<=1500);
  x.state.cache.save();const entry=JSON.parse(x.store.get(key)).entries.find(e=>e.key==='palette:v1:'+id);assert.deepEqual(entry.value,{colors:expected,source:'spotify-embed'});assert.ok(entry.expires>Date.now()+86000000);
  const second=context({store:x.store,network:async()=>{throw Error('cache should avoid network');}});assert.deepEqual(await fallbackPalette(second.ctx,id,second.state),expected);assert.equal(second.calls.length,0);
  assert.doesNotMatch(x.store.get(key),/fake-|__NEXT_DATA__|visualIdentity|accessToken/);
});
test('offline color service still returns fallback lyrics and retries only after its short negative cache expires',async()=>{
  const x=context({network:async()=>{throw Error('timeout');}});seed(x);const out=JSON.parse(Buffer.from((await run(x.ctx)).body));assert.deepEqual(out.colors,neutral);assert.deepEqual(out.lyrics.lines,old.lyrics.lines);
  const cache=JSON.parse(x.store.get(key)),entry=cache.entries.find(e=>e.key==='palette:v1:'+id);assert.ok(entry.expires<=Date.now()+300000);assert.ok(entry.expires>Date.now()+290000);
  const next=context({store:x.store});assert.deepEqual(await fallbackPalette(next.ctx,id,next.state),neutral);assert.equal(next.calls.length,0);
  entry.expires=Date.now()-1;cache.cooldowns["open.spotify.com"]=Date.now()-1;x.store.set(key,JSON.stringify(cache));const later=context({store:x.store});assert.deepEqual(await fallbackPalette(later.ctx,id,later.state),expected);assert.equal(later.calls.length,1);
});
test('near overall deadline returns a safe palette without starting another request',async()=>{const x=context();x.state.deadline=Date.now()+100;assert.deepEqual(await fallbackPalette(x.ctx,id,x.state),neutral);assert.equal(x.calls.length,0);});
test('HTTP 429 honors Retry-After without stopping cached fallback lyrics',async()=>{const x=context({network:async()=>new Response('',{status:429,headers:{'Retry-After':'600'}})});seed(x);assert.equal((await run(x.ctx)).status,200);assert.ok(JSON.parse(x.store.get(key)).cooldowns['open.spotify.com']>Date.now()+590000);});
for(const type of ['application/json','application/x-protobuf']) test('old fallback cache gets fresh colors without changing lines or timing: '+type,async()=>{
  const x=context({type});seed(x);const r=await run(x.ctx);assert.equal(r.status,200);assert.equal(x.calls.length,1);assert.equal(x.calls[0].url,endpoint);
  if(type==='application/json'){const out=JSON.parse(Buffer.from(r.body));assert.deepEqual(out.colors,expected);assert.deepEqual(out.lyrics.lines,old.lyrics.lines);}
  else {assert.deepEqual(nativeColors(r.body),Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,v>>>0])));const lyr=readFields(readFields(r.body)[0].bytes);assert.deepEqual(lyr.filter(f=>f.number===2).map(f=>readFields(f.bytes).find(q=>q.number===1).value),[1000,3100]);assert.deepEqual(parseDocument(r.body,type).words,old.lyrics.lines.map(l=>l.words));}
});
for(const type of ['application/json','application/x-protobuf']) test('an official palette on an empty lyric response is kept: '+type,async()=>{
  const colors={background:0xff315d70|0,text:0xffeeeeee|0,highlightText:-1},empty={...old,lyrics:{...old.lyrics,lines:[]},colors};
  const x=context({status:200,type,body:encodeDocument(empty,type.includes('json')?'json':'protobuf')});seed(x);const r=await run(x.ctx);assert.equal(x.calls.length,0);assert.equal(r.status,200);
  assert.deepEqual(type.includes('json')?JSON.parse(Buffer.from(r.body)).colors:Object.fromEntries(Object.entries(nativeColors(r.body)).map(([k,v])=>[k,v|0])),colors);
});
test('existing Spotify lyrics and palette remain byte-for-byte when no translation is requested',async()=>{
  const bytes=encodeDocument(old,'protobuf'),x=context({status:200,body:bytes,type:'application/x-protobuf'}),r=await run(x.ctx);assert.deepEqual(Buffer.from(r.body),Buffer.from(bytes));assert.equal(x.calls.length,0);
});
