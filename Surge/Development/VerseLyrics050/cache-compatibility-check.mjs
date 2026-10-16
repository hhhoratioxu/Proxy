import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const base=process.argv[2];if(!base)throw Error('Pass unchanged 0.4.16 workspace');
const old=await import(pathToFileURL(base+'/core/spotify-lyrics.js')),next=await import('./core/spotify-lyrics.js');
const KEY='VerseLyrics.v1.cache',id=n=>String(n).padStart(22,'0'),now=2000000000000;
Date.now=()=>now;let random=7319;const pick=n=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random%n;};
const results=[];
for(let caseIndex=0;caseIndex<300;caseIndex++){
  const commands=Array.from({length:70},(_,i)=>{
    const track=pick(25)+1,kind=pick(3),words=Array.from({length:pick(28)+1},(_,j)=>'Original '+caseIndex+' '+i+' '+j+' 🎵 " \\ 中');
    return {track,key:(kind===0?'meta:':kind===1?'lyrics:auto:':'translations:v1:zh-CN:')+id(track),value:kind===0?{title:'Song '+track,album:'Morning',artists:['Ada'],duration:180}:kind===1?{v:1,p:'qq',t:true,l:words.map((s,j)=>[j*2100,s])}:{pairs:words.map(s=>[s,'译文 '+s])},expires:now+pick(5)*1000-1000,metadata:pick(2)===0,cooldown:pick(8)===0};
  });
  function run(m){
    const store=new Map(),ctx={storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v),getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>store.set(k,JSON.stringify(v))}};
    for(let i=0;i<commands.length;i+=2){
      const pending=commands.slice(i,i+2).map(op=>{const c=m.loadCache(ctx,op.metadata?{metadata:true}:{track:id(op.track),language:'zh-CN'});c.get(op.key);c.put(op.key,op.value,0,op.expires);if(op.cooldown)c.cooldowns['lrclib.net']=now+15000;return c;});
      for(const c of pending)c.save();
      if(i===30&&caseIndex%3===0&&store.has(KEY)){const v=JSON.parse(store.get(KEY));delete v.sizes;store.set(KEY,JSON.stringify(v));}
      if(i===40&&caseIndex%3===1&&store.has(KEY)){const v=JSON.parse(store.get(KEY));if(v.sizes?.length)v.sizes[0]++;store.set(KEY,JSON.stringify(v));}
      const raw=store.get(KEY);if(raw){assert.ok(raw.length<=64000);assert.ok(JSON.parse(raw).entries.length<=128);}
    }
    return store.get(KEY);
  }
  assert.equal(run(next),run(old),'Complete serialized store changed in case '+caseIndex);results.push({case:caseIndex,equal:true});
}
const report={at:new Date().toISOString(),scope:'300 deterministic generated scenarios against unchanged 0.4.16, 70 writes each, overlapping scoped snapshots, expiry conflicts, Unicode/escaping, cooldowns, legacy and invalid-offset migration. Complete serialized cache must match byte for byte. Semantic comparison, not performance or device acceptance.',cases:300,writesPerCase:70,allEqual:true};
writeFileSync(new URL('./cache-compatibility-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
