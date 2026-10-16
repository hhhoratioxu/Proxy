import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import egern from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics.js';
import {parseDocument,existingPalette,encodeDocument} from './core/spotify-lyrics.js';
const id='0000000000000000000001',KEY='VerseLyrics.v1.cache',colors={background:-10985626,text:-16777216,highlightText:-1};
const words=['An original lantern line.','Another original test line.'];
const lyric={lyrics:{syncType:'LINE_SYNCED',provider:'Musixmatch',providerDisplayName:'Original',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000),endTimeMs:'0',syllables:[]})),alternatives:[{language:'zh-CN',lines:['official','official']}]},colors};
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const missing of [true,false])for(const type of ['application/json','application/x-protobuf'])test(`${client}: overlapping ${missing?'fallback':'official'} requests reuse source and translation work (${type})`,async()=>{
  const store=new Map(),calls=[],statusWrites=[],expires=Date.now()+60000;let release,active=0,maxActive=0,completions=0;
  store.set(KEY,JSON.stringify({entries:[{key:'meta:'+id,value:{id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:180},expires},{key:'palette:v1:'+id,value:{colors},expires}],cooldowns:{}}));
  async function network(url){
    calls.push(url);active++;maxActive=Math.max(maxActive,active);
    if(calls.length===1)await new Promise(r=>release=r);
    let data;
    if(url.includes('lrclib.net/api/get?'))data={trackName:'Paper Lantern',artistName:'Ada North',albumName:'Quiet Walk',duration:180,syncedLyrics:'[00:01]'+words[0]+'\n[00:03]'+words[1]};
    else if(url.includes('translate.googleapis.com'))data=new URL(url).searchParams.getAll('q').map((_,i)=>'插件译文 '+i);
    else throw Error('unexpected request '+url);
    active--;return JSON.stringify(data);
  }
  const write=(k,v)=>{if(/\.status$|\.events$/.test(k))statusWrites.push(k);store.set(k,v);return true;};
  const qx=client==='QuantumultX',code=client==='Egern'?null:new vm.Script(readFileSync(new URL('./runtime/'+client+'/script/SpotifyLyrics.js',import.meta.url),'utf8'));
  async function invoke(){
    const env={TRANSLATION_ENABLED:true,TARGET_LANGUAGE:'zh-CN',FALLBACK_PROVIDER:'lrclib'},url='https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,status=missing?404:200;
    const bytes=missing?new Uint8Array(Buffer.from('missing')):encodeDocument(lyric,type.includes('json')?'json':'protobuf');
    if(client==='Egern'){
      const result=await egern({env,request:{url,headers:new Headers({Accept:type})},response:new Response(bytes,{status,headers:{'Content-Type':type}}),storage:{get:k=>store.get(k),set:write,getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>write(k,JSON.stringify(v))},http:{get:async u=>new Response(await network(u),{headers:{'Content-Type':'application/json'}})}});
      completions++;return new Uint8Array(result.body);
    }
    let finish;const pending=new Promise(r=>finish=r),timers=[];
    const ctx={$request:{url,headers:{Accept:type}},$response:qx?{statusCode:status,headers:{'Content-Type':type},bodyBytes:bytes.buffer}:{status,headers:{'Content-Type':type},body:bytes},setTimeout:(fn,ms)=>{const t=setTimeout(fn,ms);timers.push(t);return t;},clearTimeout,$done:r=>{completions++;timers.forEach(clearTimeout);finish(r);}};
    if(qx){ctx.$environment={variables:env};ctx.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>write(k,v)};ctx.$task={fetch:async o=>({statusCode:200,headers:{},bodyBytes:new Uint8Array(Buffer.from(await network(o.url))).buffer})};}
    else{ctx.$argument=env;ctx.$persistentStore={read:k=>store.get(k),write:(v,k)=>write(k,v)};ctx.$httpClient={get:(o,cb)=>{network(o.url).then(s=>cb(null,{status:200,headers:{}},new Uint8Array(Buffer.from(s))),e=>cb(e.message));}};}
    code.runInNewContext(ctx);const r=await pending;return new Uint8Array(qx?r.bodyBytes:r.body);
  }
  const first=invoke();await new Promise(setImmediate);assert.equal(calls.length,1);
  const second=invoke();await new Promise(setImmediate);assert.equal(calls.length,1,'second response must not duplicate the active HTTP request');
  release();const [a,b]=await Promise.all([first,second]);assert.deepEqual(Buffer.from(a),Buffer.from(b));
  assert.equal(calls.length,missing?2:1);assert.equal(maxActive,1);assert.equal(active,0);assert.equal(completions,2);
  assert.deepEqual(parseDocument(a,type).words,words);assert.deepEqual(existingPalette(a,parseDocument(a,type)),colors);
  for(let i=0;i<2;i++)assert.ok(Buffer.from(a).includes(Buffer.from('插件译文 '+i)));assert.ok(!Buffer.from(a).includes(Buffer.from('official')));
  assert.deepEqual(JSON.parse(store.get('VerseLyrics.v1.network')),[]);assert.equal(statusWrites.length,0);
  assert.ok(store.get(KEY).length<=64000);
});
