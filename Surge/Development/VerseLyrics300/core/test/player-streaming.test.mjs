import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerEntryJSON,playerEntryWire,utf8,text,stringField,dataField,numberField,join} from '../spotify-lyrics.js';
const uri=n=>'spotify:track:'+String(n).padStart(22,'0');
// Frozen pre-change algorithms serve only as a differential oracle. Native
// tests separately assert expected bytes, preserved unknown fields and flags.
const reference=readFileSync(new URL('./fixtures/player-entry-052-reference.js',import.meta.url),'utf8');
const support=await import('../spotify-lyrics.js');
const old=Function('fields','text','utf8','join','dataField','stringField','str','goodObject','word','replaceField',reference+';return {playerEntryJSON,playerEntryWire}')(support.fields,text,utf8,join,dataField,stringField,x=>x==null?'':String(x),v=>v!==null&&typeof v==='object'&&!Array.isArray(v),(fs,n)=>{const f=fs.filter(f=>f.number===n&&f.wire===2).at(-1);return f?text(f.payload):''},(fs,n,r)=>{let seen=false;const parts=[];for(const f of fs)if(f.number===n){if(!seen)parts.push(r);seen=true;}else parts.push(f.raw);if(!seen)parts.push(r);return join(parts);});
let seed=23151;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const variants=[undefined,{},null,[],true,{has_lyrics:'false'},{has_lyrics:false},{has_lyrics:'true'},{has_lyrics:'unknown'},{has_lyrics:3}];
test('one-pass JSON player rewrite matches 500 prior valid context/connect responses byte for byte',()=>{
 for(let k=0;k<500;k++){
  const tracks=Array.from({length:1+random(30)},(_,i)=>{const t={uri:random(5)?uri(i+1):'spotify:episode:'+String(i).padStart(22,'0'),unknown:{list:[null,true,false,'\\" 中文 🎵',-1.2e10,{'very large':'untouched'}]}};const m=variants[random(variants.length)];if(m!==undefined)t.metadata=m;return random(2)?t:Object.fromEntries(Object.entries(t).reverse());});
  const connect=!!random(2),obj=connect?{player_state:{track:tracks[0],prev_tracks:tracks.slice(1,3),next_tracks:tracks.slice(3),position_ms:999}}:{uri:'spotify:playlist:example',pages:[{tracks}],opaque:{a:[1,2,3]}};
  const bytes=utf8(JSON.stringify(obj,null,random(2)?2:0)),before=old.playerEntryJSON(bytes,connect),after=playerEntryJSON(bytes,connect);
  assert.equal(text(after.body),text(before.body));assert.equal(after.changed,before.changed);assert.equal(after.visited,before.visited);
 }
});
for(const tail of ['01','1.','1e','--1','NaN','truex','"bad\\x"','"bad\\u0z00"','"raw\nline"','[1,]','{"a":1,}'])test('invalid unrelated JSON is never rewritten: '+JSON.stringify(tail),()=>{
 const input='{"player_state":{"track":{"uri":"'+uri(1)+'","metadata":{"has_lyrics":false}}},"unknown":'+tail+'}';
 assert.throws(()=>playerEntryJSON(utf8(input),true));
});
test('duplicate control keys are ambiguous and fail closed; escaped keys remain recognized',()=>{
 assert.throws(()=>playerEntryJSON(utf8('{"player_state":{"track":{"uri":"'+uri(1)+'","metadata":{},"metadata":{}}}}'),true),/duplicate/);
 const source='{"player_state":{"track":{"u\\u0072i":"'+uri(1)+'","metadata":{"has_lyri\\u0063s":false}}},"big":18446744073709551615}';
 const out=text(playerEntryJSON(utf8(source),true).body);assert.equal(out,source.replace('false','true'));
});
test('entry scan rejects excessive nesting and track counts',()=>{
 const deep='{"player_state":{},"unknown":'+'['.repeat(66)+'0'+']'.repeat(66)+'}';assert.throws(()=>playerEntryJSON(utf8(deep),true),/limit/);
 const tracks=Array.from({length:301},(_,i)=>({uri:uri(i+1)}));assert.throws(()=>playerEntryJSON(utf8(JSON.stringify({player_state:{next_tracks:tracks}})),true),/track-limit/);
});
test('Protobuf range rewrite matches 200 contexts with large unknown maps and duplicate native fields',()=>{
 for(let k=0;k<200;k++){
  const connect=!!random(2),mapNo=connect?3:4,tracks=Array.from({length:1+random(20)},(_,i)=>{
   const value=['false','true','unknown'][random(3)],maps=[dataField(mapNo,join([stringField(1,'has_lyrics'),stringField(2,value),numberField(80,9)]))];
   for(let j=0;j<random(12);j++)maps.push(dataField(mapNo,join([stringField(1,'opaque'+j),stringField(2,'keep me')])))
   return join([stringField(1,uri(i+1)),...maps,stringField(99,'unknown'),numberField(100,987)]);
  });
  const body=connect?dataField(3,join(tracks.map((t,i)=>dataField(i===0?7:20,t)))):join([stringField(1,'spotify:album:example'),dataField(5,join(tracks.map(t=>dataField(4,t)))),stringField(99,'keep-root')]);
  const a=old.playerEntryWire(body,connect),b=playerEntryWire(body,connect);assert.deepEqual(b.body,a.body);assert.equal(b.changed,a.changed);assert.equal(b.visited,a.visited);
 }
});
