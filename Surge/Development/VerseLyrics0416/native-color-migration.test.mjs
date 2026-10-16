import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import egern from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics.js';
import {parseDocument,existingPalette} from './core/spotify-lyrics.js';
const id='76XUZSb13QUuj1HECY4Hvo',KEY='VerseLyrics.v1.cache';
const legacy={background:-11709348,text:-3748137,highlightText:-1};
const expected={background:-10985626,text:-16777216,highlightText:-1};
const rows=[[1000,'Our original first line.'],[3100,'The current lantern line.'],[6400,'Another original line.']];
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const type of ['application/json','application/x-protobuf'])test(client+': cached pre-fix colors migrate offline with unchanged timing and translations ('+type+')',async()=>{
  const expires=Date.now()+60000,store=new Map([[KEY,JSON.stringify({entries:[
    {key:'lyrics:auto:'+id,value:{v:1,p:'qq',t:true,l:rows},expires},
    {key:'palette:v1:'+id,value:{colors:legacy,source:'spotify-embed'},expires},
    {key:'translations:v1:zh-CN:'+id,value:{pairs:rows.map(([,s],i)=>[s,'自写译文 '+i])},expires}
  ],cooldowns:{}})]]),before=store.get(KEY);
  const env={TRANSLATION_ENABLED:true,FALLBACK_PROVIDER:'auto',TARGET_LANGUAGE:'zh-CN'},url='https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id;
  let http=0,timers=0,completed=0,cacheWrites=0;
  const forbidden=()=>{http++;throw Error('cached migration started HTTP');};
  const write=(k,v)=>{if(k===KEY)cacheWrites++;store.set(k,v);return true;};
  let body;
  if(client==='Egern'){
    const out=await egern({env,request:{url,headers:new Headers({Accept:type})},response:new Response('missing',{status:404}),storage:{get:k=>store.get(k),getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>write(k,JSON.stringify(v))},http:{get:forbidden,post:forbidden}});
    body=out.body;completed++;
  }else{
    const qx=client==='QuantumultX',input=new Uint8Array(Buffer.from('missing'));let finish;
    const result=new Promise(r=>finish=r),ctx={$request:{url,headers:{Accept:type}},$response:qx?{statusCode:404,headers:{},bodyBytes:input.buffer}:{status:404,headers:{},body:input},setTimeout:()=>{timers++;return 1;},clearTimeout(){},$done:r=>{completed++;finish(r);}};
    if(qx){ctx.$environment={variables:env};ctx.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>write(k,v)};ctx.$task={fetch:forbidden};}
    else{ctx.$argument=env;ctx.$persistentStore={read:k=>store.get(k),write:(v,k)=>write(k,v)};ctx.$httpClient={get:forbidden,post:forbidden};}
    new vm.Script(readFileSync(new URL('./runtime/'+client+'/script/SpotifyLyrics.js',import.meta.url),'utf8')).runInNewContext(ctx);
    const out=await result;body=qx?out.bodyBytes:out.body;
  }
  const bytes=new Uint8Array(body),doc=parseDocument(bytes,type);
  assert.deepEqual(existingPalette(bytes,doc),expected);assert.deepEqual(doc.words,rows.map(([,s])=>s));
  // JSON fields and native protobuf bytes both carry the plugin translation.
  if(type==='application/json'){
    const value=JSON.parse(Buffer.from(bytes));assert.deepEqual(value.lyrics.lines.map(l=>[Number(l.startTimeMs),l.words]),rows);
    assert.deepEqual(value.lyrics.alternatives,[{language:'zh-CN',lines:rows.map((_,i)=>'自写译文 '+i)}]);
  }else{
    // Native protobuf contains the cached plugin translations as UTF-8 rows.
    for(let i=0;i<rows.length;i++)assert.ok(Buffer.from(bytes).includes(Buffer.from('自写译文 '+i)));
  }
  assert.equal(http,0);assert.equal(completed,1);assert.equal(timers,0);
  assert.equal(cacheWrites,0);assert.equal(store.get(KEY),before);
});
