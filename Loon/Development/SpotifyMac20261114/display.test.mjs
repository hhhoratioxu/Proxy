import {macDisplay} from './mac-display.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const codec={text:b=>new TextDecoder('utf-8',{fatal:true}).decode(b),utf8:(s,n)=>{const b=new TextEncoder().encode(s);if(b.length>n)throw Error('limit');return b;}};
function fixture(){return {lyrics:{syncType:'LINE_SYNCED',lines:[{words:'Our test lantern',startTimeMs:'1234',endTimeMs:'2500',syllables:[],extra:91},{words:'',startTimeMs:'2501',endTimeMs:'0',syllables:[]}],alternatives:[{language:'zh-CN',lines:['自写测试译文','']}],provider:'test-only'},colors:{background:9},unknown:{keep:true}};}
function output(doc){return {headers:{'Content-Type':'application/json','x-verselyrics':'3.2.2'},body:codec.utf8(JSON.stringify(doc),262144)};}
const response={status:200};
test('bilingual text retains native timing, provider, colors and unknown fields',()=>{
  const input=fixture(),out=output(input),before=out.body.slice(),result=macDisplay(response,out,{},codec),doc=JSON.parse(codec.text(result.body));
  assert.equal(doc.lyrics.lines[0].words,'Our test lantern\n自写测试译文');
  const restored=structuredClone(doc);restored.lyrics.lines[0].words=input.lyrics.lines[0].words;assert.deepEqual(restored,input);assert.deepEqual(out.body,before);
});
for(const mode of ['SYLLABLE_SYNCED','WORD_SYNCED','unknown'])test(mode+' unchanged, no word timing fabrication',()=>{const d=fixture();d.lyrics.syncType=mode;const o=output(d);assert.equal(macDisplay(response,o,{},codec),o);});
test('existing syllables are preserved byte for byte',()=>{const d=fixture();d.lyrics.lines[0].syllables=[{startTimeMs:'1234',numChars:3}];const o=output(d);assert.equal(macDisplay(response,o,{},codec),o);});
test('translation off preserves bytes',()=>{const o=output(fixture());assert.equal(macDisplay(response,o,{TRANSLATION_ENABLED:false},codec),o);});
test('language and row counts must match exactly',()=>{for(const mutate of [d=>d.lyrics.alternatives[0].language='ja',d=>d.lyrics.alternatives[0].lines.pop(),d=>d.lyrics.alternatives.push(d.lyrics.alternatives[0])]){const d=fixture();mutate(d);const o=output(d);assert.equal(macDisplay(response,o,{},codec),o);}});
test('unprocessed Spotify native response is not changed',()=>{const o=output(fixture());delete o.headers['x-verselyrics'];assert.equal(macDisplay(response,o,{},codec),o);});
test('malformed JSON and invalid UTF-8 fail open',()=>{for(const b of [new Uint8Array([255]),new TextEncoder().encode('{')]){const o={...output(fixture()),body:b};assert.equal(macDisplay(response,o,{},codec),o);}});
test('instrumental/blank lines never receive fabricated text',()=>{const d=fixture();d.lyrics.lines[1].words='';d.lyrics.alternatives[0].lines[1]='do not inject';const doc=JSON.parse(codec.text(macDisplay(response,output(d),{},codec).body));assert.equal(doc.lyrics.lines[1].words,'');});
test('display transformation is idempotent',()=>{const first=macDisplay(response,output(fixture()),{},codec);assert.equal(macDisplay(response,first,{},codec),first);});
test('protobuf passes through untouched',()=>{const o=output(fixture());o.headers['Content-Type']='application/x-protobuf';assert.equal(macDisplay(response,o,{},codec),o);});
test('oversize reconstruction keeps original bytes',()=>{const d=fixture();d.lyrics.lines=Array.from({length:600},(_,i)=>({words:'A'.repeat(100),startTimeMs:String(i),syllables:[]}));d.lyrics.alternatives[0].lines=Array(600).fill('字'.repeat(70));const o=output(d);assert.equal(macDisplay(response,o,{},codec),o);});
test('actual generated Mac runtime translates using the original core and retains timestamp',async()=>{
  const input=fixture();input.lyrics.language='en';input.lyrics.lines=input.lyrics.lines.slice(0,1);input.lyrics.alternatives=[];
  const store=new Map(),done=[],calls=[];let resolve;const completed=new Promise(r=>resolve=r);
  const context={$request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo?format=json',method:'GET',headers:{Accept:'application/json'}},
    $response:{status:200,headers:{'Content-Type':'application/json'},body:new Uint8Array(Buffer.from(JSON.stringify(input)))},
    $argument:{FALLBACK_PROVIDER:'off',SOURCE_TRANSLATIONS:false,FETCH_ARTWORK_COLOR:false},
    $persistentStore:{read:k=>store.get(k),write:(v,k)=>store.set(k,v)},$done:o=>{done.push(o);resolve();},
    $httpClient:{get:(options,cb)=>{calls.push(options.url);assert.ok(options.url.startsWith('https://translate.googleapis.com/'));cb(null,{status:200,headers:{'Content-Type':'application/json'}},new Uint8Array(Buffer.from(JSON.stringify([['自写的译文','en']]))));}},console:{log:()=>{throw Error('unexpected log');}}};
  vm.runInNewContext(readFileSync(new URL('./runtime/SpotifyLyrics.Mac.js',import.meta.url),'utf8'),context,{timeout:1000});
  await Promise.race([completed,new Promise((_,reject)=>setTimeout(()=>reject(Error('runtime did not finish')),1000))]);
  assert.equal(done.length,1);assert.equal(calls.length,1);const doc=JSON.parse(codec.text(done[0].body));
  assert.equal(doc.lyrics.lines[0].words,'Our test lantern\n自写的译文');assert.equal(doc.lyrics.lines[0].startTimeMs,'1234');
});
