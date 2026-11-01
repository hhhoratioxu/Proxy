import test from 'node:test';
import assert from 'node:assert/strict';
import {lrc} from '../spotify-lyrics.js';
// Independent fixed reference: the released 0.5.2 parser's split/match/sort
// semantics, without HTML entities (covered separately below).
function reference(source) {
 source=source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');if(source.length>60000)throw Error('lyrics-limit');
 let offset=0;for(const m of source.matchAll(/\[offset:\s*(-?\d+)\s*\]/gi))offset=Math.max(-600000,Math.min(600000,Number(m[1])));
 const rows=[];let count=0;
 for(const line of source.split('\n')){
  const tags=[];for(const tag of line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)){if(++count>1200)throw Error('line-limit');tags.push(tag);}
  if(!tags.length)continue;const words=line.slice(tags.at(-1).index+tags.at(-1)[0].length).replace(/<\d{1,3}:\d{2}(?:\.\d{1,3})?>/g,'');
  for(const t of tags){if(Number(t[2])>=60)continue;rows.push({startTimeMs:String(Math.max(0,Number(t[1])*60000+Number(t[2])*1000+Number((t[3]||'').padEnd(3,'0'))+offset)),words,syllables:[],endTimeMs:'0'});}
 }
 rows.sort((a,b)=>Number(a.startTimeMs)-Number(b.startTimeMs));const merged=[];
 for(const row of rows){const prev=merged.at(-1);if(prev&&prev.startTimeMs===row.startTimeMs){if(row.words&&row.words!==prev.words)prev.words+=(prev.words?'\n':'')+row.words;}else merged.push(row);}
 if(merged.length>600)throw Error('line-limit');return merged;
}
test('incremental LRC parser matches released semantics across 500 deterministic mixed cases',()=>{
 let seed=3917;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let n=0;n<500;n++){
  const rows=['\uFEFF[ar:Original Test]','[offset:'+(-1000+rand(2000))+']'];
  for(let i=0;i<1+rand(250);i++){
   let tags='';for(let j=0;j<rand(5);j++)tags+='['+rand(5)+':'+String(rand(85)).padStart(2,'0')+(rand(2)?'.'+String(rand(1000)):'')+']';
   rows.push(tags+['Original '+rand(8),'原创 '+rand(8),'','<00:12.5>A <00:13.05>test','♪'][rand(5)]);
  }
  rows.push('[offset:'+(-1000+rand(2000))+']');const source=rows.join(['\n','\r','\r\n'][rand(3)]);
  assert.deepEqual(lrc(source),reference(source),'case '+n);
 }
});
test('incremental parser retains entity decoding, repeated times and last-tag word slicing',()=>{
 assert.deepEqual(lrc('[00:01][00:99]A &amp; B\n[00:02]&#x1F3B5;'),[
  {startTimeMs:'1000',words:'A & B',syllables:[],endTimeMs:'0'},
  {startTimeMs:'2000',words:'🎵',syllables:[],endTimeMs:'0'}]);
 for(const source of ['', '\n', '[00:99]invalid', '[offset:-600000]\n[01:00]A\n[00:02]B', '[00:01]A\n[00:01]A\n[00:01]B\n[00:03]C', '[00:03][00:02][00:01]A'])assert.deepEqual(lrc(source),reference(source));
});
test('line, tag and character limits retain their released bounds',()=>{
 const rows=n=>Array.from({length:n},(_,i)=>`[${Math.floor(i/60)}:${String(i%60).padStart(2,'0')}]line`).join('\n');
 assert.equal(lrc(rows(600)).length,600);assert.throws(()=>lrc(rows(601)),/line-limit/);
 assert.throws(()=>lrc('[00:01]'.repeat(1201)),/line-limit/);assert.equal(lrc('[00:01]'.repeat(1200)).length,1);
 assert.throws(()=>lrc('a'.repeat(60001)),/lyrics-limit/);
});
