import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {combine,binary,string,homeFirstPage,homeSection} from './fixtures.mjs';
const code=await readFile(new URL('../dist/clients.js',import.meta.url),'utf8');
const element=name=>binary(153515154,binary(172660663,binary(1,binary(168777401,binary(3,binary(172035250,string(1,name+'.eml-fe|fixture')))))));
const normal=element('video_lockup_with_attachment'),ad=element('full_width_square_image_layout');
const make=ads=>homeFirstPage([homeSection([binary(474376530,combine(binary(1,normal),...(ads?[binary(1,ad)]:[])))])]);
const before=make(true),expected=make(false),url='https://youtubei.googleapis.com/youtubei/v1/browse';
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX'])test(client+' bundled native adapter filters a mixed new feed envelope and completes once',async()=>{
 let finish,count=0;const done=new Promise(r=>finish=r),qx=client==='QuantumultX',logs=[];
 const context={Uint8Array,ArrayBuffer,DataView,TextEncoder:undefined,TextDecoder:undefined,$argument:{TRANSLATE_CAPTIONS:false},$request:{url,headers:{}},$response:{status:200,statusCode:200,headers:{},...(qx?{bodyBytes:before.buffer.slice(before.byteOffset,before.byteOffset+before.byteLength)}:{body:before})},$persistentStore:{read:()=>null,write:()=>true},$done:r=>{count++;finish(r);},console:{log:s=>logs.push(s)}};
 if(client==='Loon')context.$loon='3.5.3(1011) independent fixture';if(qx){context.$environment={variables:{TRANSLATE_CAPTIONS:false}};context.$prefs={valueForKey:()=>null,setValueForKey:()=>true};context.$task={fetch:()=>{throw Error('unexpected network');}};}
 vm.runInNewContext(code,context,{timeout:3000});const out=await done;assert.equal(count,1);assert.deepEqual(Buffer.from(qx?out.bodyBytes:out.body),expected);const report=JSON.parse(logs[0].slice(15));assert.equal(report.changed,true);assert.equal(report.removedParts,1);assert.deepEqual(report.feedEnvelopeFields,[474376530]);assert.equal(report.feedEnvelopeBypasses,0);
});
test('Egern native ESM adapter filters the same envelope without a network or storage write',async()=>{
 const run=(await import('../dist/egern.js')).default;
 const out=await run({env:{TRANSLATE_CAPTIONS:'false'},request:{url,headers:new Headers()},response:{status:200,headers:new Headers(),arrayBuffer:async()=>before.buffer.slice(before.byteOffset,before.byteOffset+before.byteLength)},storage:{getJSON:()=>null,setJSON:()=>{throw Error('unexpected write');}},http:{get:()=>{throw Error('unexpected network');}}});assert.deepEqual(Buffer.from(out.body),expected);
});
