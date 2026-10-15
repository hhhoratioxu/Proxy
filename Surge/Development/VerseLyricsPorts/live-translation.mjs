import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const results=[];
for(const client of ['Surge','Loon','Shadowrocket','QuantumultX']){
  const timers=[],store=new Map(),start=Date.now();
  let finish;
  const completed=new Promise(resolve=>finish=resolve);
  const data=JSON.stringify({lyrics:{syncType:'UNSYNCED',provider:'test',language:'en',lines:[{startTimeMs:'0',endTimeMs:'0',words:'A tiny paper boat rests beside my window.',syllables:[]}],alternatives:[{language:'ja',lines:['official-fixture']}]}});
  const req={url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001?format=json',headers:{Accept:'application/json'}};
  const qx=client==='QuantumultX';let calls=0;
  const context={$request:req,$response:{headers:{'Content-Type':'application/json'},...(qx?{statusCode:200,bodyBytes:Uint8Array.from(Buffer.from(data)).buffer}:{status:200,body:new Uint8Array(Buffer.from(data))})},
    setTimeout:(fn,ms)=>{const timer=setTimeout(fn,ms);timers.push(timer);return timer;},$done:r=>finish(r),console:{log:()=>{}},
    $persistentStore:{read:k=>store.get(k),write:(v,k)=>store.set(k,v)},$prefs:{valueForKey:k=>store.get(k),setValueForKey:(v,k)=>store.set(k,v)}};
  async function service(o){
    assert.ok(o.url.startsWith('https://translate.googleapis.com/'));calls++;
    const r=await fetch(o.url,{headers:o.headers,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(5500)});
    return {status:r.status,headers:Object.fromEntries(r.headers),bytes:await r.arrayBuffer()};
  }
  if(qx)context.$task={fetch:async o=>{const r=await service(o);return {statusCode:r.status,headers:r.headers,bodyBytes:r.bytes};}};
  else context.$httpClient={get:(o,cb)=>{service(o).then(r=>cb(null,{status:r.status,headers:r.headers},new Uint8Array(r.bytes)),()=>cb('HTTP failure'));}};
  try{
    vm.runInNewContext(readFileSync(new URL(`./runtime/${client}/script/SpotifyLyrics.js`,import.meta.url),'utf8'),context,{timeout:1000});
    const result=await completed;
    const out=JSON.parse(Buffer.from(qx?result.bodyBytes:result.body));
    assert.equal(out.lyrics.lines[0].words,JSON.parse(data).lyrics.lines[0].words);
    assert.equal(out.lyrics.alternatives[0].language,'zh-CN');assert.ok(out.lyrics.alternatives[0].lines[0]);assert.notEqual(out.lyrics.alternatives[0].lines[0],'official-fixture');assert.equal(calls,1);
    const item={client,ms:Date.now()-start,requests:calls,translatedRows:out.lyrics.alternatives[0].lines.length,status:'PASS',scope:'Node native-interface harness + real translation service; no phone UI'};results.push(item);console.log(JSON.stringify(item));
  }finally{for(const t of timers)clearTimeout(t);}
}
writeFileSync(new URL('./live-translation-result.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
