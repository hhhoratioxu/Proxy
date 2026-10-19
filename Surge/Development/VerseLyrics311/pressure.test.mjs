import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import egern from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics.js';
import {networkLease} from './core/spotify-lyrics.js';
const id=n=>String(n).padStart(22,'0'),networkKey='VerseLyrics.v1.network';
const words=['Original pressure test phrase.','The second original test phrase.'];
const official=JSON.stringify({lyrics:{syncType:'LINE_SYNCED',language:'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[{language:'zh-CN',lines:['Official one','Official two']}]}});
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const mode of ['different-success','same-success','different-timeout'])test(`${client}: 80 overlapping ${mode} requests release busy invocations before a stalled callback`,{timeout:5000},async()=>{
 const store=new Map(),script=client==='Egern'?null:new vm.Script(readFileSync(new URL('./runtime/'+client+'/script/SpotifyLyrics.js',import.meta.url),'utf8'));
 let calls=0,done=0,active=0,peak=0,timers=0,finish;
 const qx=client==='QuantumultX',waiting=new Promise(r=>finish=r);
 async function http(){calls++;active++;peak=Math.max(peak,active);if(calls===1)await waiting;active--;if(mode.endsWith('timeout')&&calls===1)throw Error('request timed out');return JSON.stringify(['插件译文一','插件译文二']);}
 function invoke(n){
  const env={FALLBACK_PROVIDER:'auto',TRANSLATION_ENABLED:true,TARGET_LANGUAGE:'zh-CN'},url='https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id(mode.startsWith('same')?1:n);
  if(client==='Egern')return egern({env,request:{url,headers:new Headers({Accept:'application/json'})},response:new Response(official,{headers:{'Content-Type':'application/json'}}),storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v),getJSON:k=>JSON.parse(store.get(k)||'null'),setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:async()=>new Response(await http())}}).then(r=>{done++;return JSON.parse(Buffer.from(r.body));});
  let resolve;const result=new Promise(r=>resolve=r),input=Buffer.from(official);const ctx={$argument:env,$request:{url,headers:{Accept:'application/json'}},$response:qx?{statusCode:200,headers:{'Content-Type':'application/json'},bodyBytes:new Uint8Array(input).buffer}:{status:200,headers:{'Content-Type':'application/json'},body:input},setTimeout:(fn,ms)=>{timers++;assert.equal(qx,true,'Loon/Surge/Shadowrocket must not allocate admission timers');assert.ok(ms>10000,'only the QX overall watchdog is allowed');return 1;},clearTimeout(){},$done:r=>{assert.equal(active===0 || n!==1,true,'owner must wait for its native callback');done++;resolve(JSON.parse(Buffer.from((qx?r.bodyBytes:r.body)||input)));}};
  if(qx){ctx.$environment={variables:env};ctx.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>store.set(k,v)};ctx.$task={fetch:async()=>({statusCode:200,headers:{},bodyBytes:new Uint8Array(Buffer.from(await http())).buffer})};}
  else{ctx.$persistentStore={read:k=>store.get(k),write:(v,k)=>store.set(k,v)};ctx.$httpClient={get:(o,cb)=>{http().then(body=>cb(null,{status:200,headers:{}},o['binary-mode']===false?body:Buffer.from(body)),e=>cb(e.message));}};}
  script.runInNewContext(ctx);return result;
 }
 const first=invoke(1);await new Promise(setImmediate);assert.equal(calls,1);
 const busy=await Promise.all(Array.from({length:79},(_,i)=>invoke(i+2)));
 assert.equal(done,79);assert.equal(calls,1);assert.equal(active,1);assert.equal(peak,1);assert.equal(timers,qx?1:0);assert.equal(store.has('VerseLyrics.v2.waiting'),false);
 for(const output of busy){assert.deepEqual(output.lyrics.lines.map(l=>l.words),words);assert.deepEqual(output.lyrics.alternatives,[]);}
 finish();const out=await first;assert.equal(done,80);assert.equal(active,0);assert.deepEqual(JSON.parse(store.get(networkKey)),[]);
 if(mode==='same-success')assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['插件译文一','插件译文二']}]);
 else assert.deepEqual(out.lyrics.alternatives,[]); // Retired callbacks now stop before decoding.
 const cache=JSON.parse(store.get('VerseLyrics.v1.cache')||'{"entries":[]}');assert.ok(!cache.entries.some(e=>e.value?.missing));
 if(mode.endsWith('timeout')){cache.cooldowns={};store.set('VerseLyrics.v1.cache',JSON.stringify(cache));} // Explicitly expire host cooldown in fixture.
 const retry=await invoke(80);assert.deepEqual(retry.lyrics.alternatives,[{language:'zh-CN',lines:['插件译文一','插件译文二']}]);assert.equal(calls,mode==='same-success'?1:2);assert.equal(peak,1);
});
for(const count of [1,2])test(`upgrade respects ${count} active legacy owners without allocating a third slot`,()=>{
 const original=Array.from({length:count},(_,i)=>({owner:'legacy'+i,track:id(i+1),expires:Date.now()+12000})),store=new Map([[networkKey,original]]),ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id(3)},storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)}};
 const lease=networkLease(ctx,Date.now()+10000,true);assert.throws(()=>lease.enter(),/network-busy/);lease.release();assert.equal(store.get(networkKey).length,count);assert.ok(store.get(networkKey).every(r=>r.retired));
});
test('an expired/deleted owner cannot release or reuse a replacement owner slot',()=>{
 const store=new Map(),ctx={storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)}};
 const a=networkLease(ctx,Date.now()+10000);a.enter();store.set(networkKey,[{owner:'replacement',expires:Date.now()+12000}]);assert.throws(()=>a.enter(),/network-busy/);a.release();assert.equal(store.get(networkKey)[0].owner,'replacement');
});
test('a rejected admission write fails closed without starting a queue',()=>{
 const ctx={storage:{getJSON:()=>null,setJSON:()=>false}},a=networkLease(ctx,Date.now()+10000);assert.throws(()=>a.enter(),/network-busy/);a.release();
});
