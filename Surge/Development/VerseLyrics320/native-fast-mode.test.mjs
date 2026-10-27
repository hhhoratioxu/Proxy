import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {invoke,seedStore,meta,id} from './feature-host.mjs';import {parseDocument} from './core/spotify-lyrics.js';
const words=['An original paper lantern.','Across the quiet water.'];
const record={trackName:meta.title,artistName:meta.artists[0],albumName:meta.album,duration:meta.duration,plainLyrics:words.join('\n')};
const timed={...record,syncedLyrics:'[00:01]'+words[0]+'\n[00:03]'+words[1]};
const network=async u=>({body:JSON.stringify(u.includes('/get?')?record:u.includes('/search?')?[timed]:new URL(u).searchParams.getAll('q').map((s,i)=>'插件译文 '+i))});
for(const [client,ext] of [['Loon','lpx'],['Egern','yaml'],['Surge','sgmodule'],['Shadowrocket','sgmodule'],['QuantumultX','conf']])for(const format of ['json','protobuf']){
 test(`${client} ${format}: fast mode returns verified plain lyrics with translation; default can upgrade timing`,async()=>{
  const config=readFileSync(new URL(`./publish/${client}/script/SpotifyLyrics.${ext}`,import.meta.url),'utf8');assert.match(config,/FALLBACK_MODE/);
  if(client==='Loon'){
   assert.ok(config.includes('FALLBACK_MODE = select,"synced","fast",type=string'));
   assert.ok(config.split('\n').filter(s=>s.startsWith('response if ')).every(s=>s.includes('${FALLBACK_MODE}')));
  }else if(client!=='Egern'){
   const hooks=config.split('\n').filter(s=>s.startsWith('VerseLyrics-')||s.startsWith('^https:'));
   assert.equal(hooks.length,3);assert.ok(hooks.every(s=>s.includes('FALLBACK_MODE=synced')));
  }
  const store=seedStore(),a=await invoke(client,{provider:'auto',format,store,env:{FALLBACK_MODE:'fast'},network});
  const out=parseDocument(a.bytes,format==='json'?'application/json':'application/x-protobuf');assert.deepEqual(out.words,words);assert.ok(a.bytes.includes(Buffer.from('插件译文')));assert.equal(a.calls.length,2);assert.ok(a.calls.every(u=>!u.includes('/search?')));
  const saved=JSON.parse(store.get('VerseLyrics.v1.cache')).entries;assert.ok(saved.some(e=>e.key==='lyrics-fast:auto:'+id));assert.ok(!saved.some(e=>e.key==='lyrics:auto:'+id));
  const b=await invoke(client,{provider:'auto',format,store,env:{FALLBACK_MODE:'fast'},network:()=>{throw Error('cached repeat');}});assert.equal(b.calls.length,0);assert.deepEqual(b.bytes,a.bytes);
  const c=await invoke(client,{provider:'auto',format,store,env:{FALLBACK_MODE:'synced'},network});assert.equal(c.calls.length,2);assert.ok(c.calls[1].includes('/search?'));assert.deepEqual(parseDocument(c.bytes,format==='json'?'application/json':'application/x-protobuf').words,words);assert.notDeepEqual(c.bytes,a.bytes);
  const d=await invoke(client,{provider:'auto',format,store,env:{FALLBACK_MODE:'fast'},network:()=>{throw Error('upgraded repeat');}});assert.deepEqual(d.bytes,c.bytes);assert.equal(d.calls.length,0);assert.ok(store.get('VerseLyrics.v1.cache').length<=64000);
 });
 test(`${client} ${format}: unknown mode keeps synchronized default`,async()=>{const r=await invoke(client,{provider:'auto',format,env:{FALLBACK_MODE:'unknown'},network});assert.ok(r.calls.some(u=>u.includes('/search?')));assert.equal(r.done,1);assert.equal(r.active,0);});
}
