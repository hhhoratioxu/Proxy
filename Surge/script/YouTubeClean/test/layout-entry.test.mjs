import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {utf8,VERSION} from '../src/data.mjs';
import {readTimeline} from '../src/timeline.mjs';
const code=await readFile(new URL('../dist/clients.js',import.meta.url),'utf8');
const text='我們今天先一起把字幕的內容確認清楚。明天再繼續討論後面的安排。';
const original='<timedtext><body><p t="1500" d="5000" w="2"><s>원문은 그대로 둡니다.</s></p></body></timedtext>';
const translated='<timedtext><body><p t="1500" d="5000"><s>'+text+'</s></p></body></timedtext>';
const url='https://www.youtube.com/api/timedtext?v=INDEPENDENT&lang=ko&format=srv3';
const params={TARGET_LANGUAGE:'zh-Hant',BILINGUAL:false,CAPTION_LAYOUT:true};
function verify(out){const cue=readTimeline(Buffer.from(out).toString()).cues[0];assert.ok(cue.words.includes('\n'));assert.equal(cue.words.replace('\n',''),text);assert.ok(!cue.words.includes('원문'));assert.equal(cue.start,1500);assert.equal(cue.end,6500);}
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX'])for(const fallback of [false,true])test(client+' compiled '+(fallback?'Google':'YouTube')+' translation uses balanced text with native completion',async()=>{
  let finish,count=0;const done=new Promise(resolve=>finish=resolve),calls=[],logs=[],qx=client==='QuantumultX';
  const source={Uint8Array,ArrayBuffer,DataView,TextEncoder:undefined,TextDecoder:undefined,setTimeout:(fn,ms)=>setTimeout(fn,ms).unref(),$request:{url,headers:{}},$response:{status:200,statusCode:200,headers:{'Content-Type':'application/xml'},...(qx?{bodyBytes:utf8(original).buffer}:{body:utf8(original)})},$argument:params,$persistentStore:{read:()=>null,write:()=>true},$httpClient:{get:(r,cb)=>{calls.push('GET');cb(null,{status:fallback?429:200},utf8(fallback?'limited':translated));},post:(r,cb)=>{calls.push('POST');cb(null,{status:200},utf8(JSON.stringify([text])));}},$done:r=>{count++;finish(r);},console:{log:s=>logs.push(s)}};
  if(client==='Loon')source.$loon='3.5.3(1008) fixture';
  if(qx){source.$environment={variables:params};source.$prefs={valueForKey:()=>null,setValueForKey:()=>true};source.$task={fetch:async r=>{calls.push(r.method);return{statusCode:r.method==='POST'||!fallback?200:429,headers:{},bodyBytes:utf8(r.method==='POST'?JSON.stringify([text]):fallback?'limited':translated).buffer};}};}
  vm.runInNewContext(code,source,{timeout:3000});const out=await done;verify(qx?out.bodyBytes:out.body);assert.equal(count,1);assert.deepEqual(calls,fallback?['GET','POST']:['GET']);const d=JSON.parse(logs[0].slice(15));assert.equal(d.version,VERSION);assert.equal(d.captionLayout,'balanced');assert.equal(d.captionMode,'translation');
});
for(const fallback of [false,true])test('Egern compiled '+(fallback?'Google':'YouTube')+' translation keeps its native ESM body contract',async()=>{
  const run=(await import('../dist/egern.js')).default,calls=[];
  const out=await run({env:params,request:{url,headers:new Headers()},response:{status:200,headers:new Headers({'Content-Type':'application/xml'}),arrayBuffer:async()=>utf8(original).buffer},storage:{getJSON:()=>null,setJSON:()=>true},http:{get:async()=>{calls.push('GET');return{status:fallback?429:200,headers:new Headers(),arrayBuffer:async()=>utf8(fallback?'limited':translated).buffer};},post:async()=>{calls.push('POST');return{status:200,headers:new Headers(),arrayBuffer:async()=>utf8(JSON.stringify([text])).buffer};}}});
  verify(out.body);assert.deepEqual(calls,fallback?['GET','POST']:['GET']);
});
