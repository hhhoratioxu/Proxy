// Real public Spotify palette requests through simulated client contracts.
// No account session and no real lyric text is used.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import egern from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics.js';
import {parseDocument,existingPalette,parseMetadata} from './core/spotify-lyrics.js';
const fixture=JSON.parse(readFileSync(new URL('./core/test/fixtures/target-song.json',import.meta.url)));
const meta=parseMetadata(Buffer.from(fixture.metadata_base64,'base64'),fixture.track_hex).meta,id=meta.id;
const url='https://open.spotify.com/embed/track/'+id,expected={background:0xff4d545c|0,text:0xffc6ced7|0,highlightText:-1};
const words=['A lantern floats above the sea.','The evening brings it back to me.'];
const doc={lyrics:{syncType:'LINE_SYNCED',provider:'lrclib',providerDisplayName:'LRCLIB',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(1000+i*2100),endTimeMs:'0',syllables:[]}))},colors:{background:-15656936,text:-1,highlightText:-1}};
async function check(client){
  const entries=[['meta:'+id,meta],['lyrics:auto:'+id,doc]].map(([key,value])=>({key,value,expires:Date.now()+600000}));
  const store=new Map([['VerseLyrics.v1.cache',JSON.stringify({entries,cooldowns:{}})]]),calls=[],timers=[];
  const start=Date.now(),request={url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,method:'GET',headers:{Accept:'application/x-protobuf',Authorization:'Bearer fake-test-only',Cookie:'fake-cookie','Client-Token':'fake-client'}};
  async function requestPalette(target,headers){
    assert.equal(target,url);assert.deepEqual(Object.keys(headers).sort(),['Accept','User-Agent']);assert.equal(headers['User-Agent'],'VerseLyrics/0.4.2');
    calls.push({url:target});
    const r=await fetch(target,{headers,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(1500)});assert.equal(r.status,200);
    return new Uint8Array(await r.arrayBuffer());
  }
  let out,doneCount=0;
  try {
    if(client==='Egern'){
      out=await egern({env:{TRANSLATION_ENABLED:'false'},request:{...request,headers:new Headers(request.headers)},response:new Response('{}',{status:404,headers:{'Content-Type':'application/json'}}),storage:{getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:async(target,o)=>{
        assert.ok(o.timeout<=1500);assert.equal(o.credentials,'omit');assert.equal(o.redirect,'error');assert.equal(o.insecureTls,false);
        return new Response(await requestPalette(target,o.headers));
      }}});
    }else{
      const qx=client==='QuantumultX';let resolveDone;const done=new Promise(r=>resolveDone=r);
      const context={console:{log:()=>{throw Error('Unexpected runtime log');}},$request:request,$response:qx?{statusCode:404,headers:{'Content-Type':'application/json'},bodyBytes:new Uint8Array([123,125]).buffer}:{status:404,headers:{'Content-Type':'application/json'},body:new Uint8Array([123,125])},setTimeout:(fn,ms)=>{const t=setTimeout(fn,ms);timers.push(t);return t;},$done:r=>{doneCount++;resolveDone(r);}};
      if(qx){
        context.$environment={variables:{TRANSLATION_ENABLED:false},sourcePath:'https://example.invalid/runtime.js'};
        context.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>{store.set(k,v);return true;}};
        context.$task={fetch:async o=>{assert.equal(o.opts['auto-cookie'],false);assert.equal(o.opts.redirection,false);assert.equal(o.opts['skip-cert-verify'],false);const bytes=await requestPalette(o.url,o.headers);return {statusCode:200,headers:{},bodyBytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}};
      }else{
        context.$argument={TRANSLATION_ENABLED:false};context.$persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};
        context.$httpClient={get:(o,cb)=>{assert.ok(o.timeout<=(client==='Loon'?1500:1.5));assert.equal(o['auto-cookie'],false);assert.equal(o['auto-redirect'],false);assert.equal(o.insecure,false);requestPalette(o.url,o.headers).then(bytes=>cb(null,{status:200,headers:{}},bytes),()=>cb('live request failed'));}};
      }
      vm.runInNewContext(readFileSync(new URL('./runtime/'+client+'/script/SpotifyLyrics.js',import.meta.url),'utf8'),context,{timeout:1000});
      out=await done;assert.equal(doneCount,1);if(qx){assert.equal(out.status,'HTTP/1.1 200 OK');out={status:200,body:out.bodyBytes};}
    }
    assert.equal(out.status,200);assert.equal(calls.length,1);
    const bytes=new Uint8Array(out.body),parsed=parseDocument(bytes,'application/x-protobuf');assert.deepEqual(parsed.words,words);assert.deepEqual(existingPalette(bytes,parsed),expected);
    return {client,pass:true,http_status:200,elapsed_ms:Date.now()-start,colors:expected,format:'protobuf',public_requests:calls};
  }finally{timers.forEach(clearTimeout);}
}
const results=[];
for(const client of ['Egern','Surge','Loon','Shadowrocket','QuantumultX'])results.push(await check(client));
const evidence={checked_at:new Date().toISOString(),core:'0.4.2',scope:'Real unauthenticated Spotify palette HTTP; simulated Egern ctx and native callback hosts; self-written cached lyrics. This does not verify app import, iPhone UI or missing-lyric discovery.',results};
writeFileSync(new URL('./live-palettes-results.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
