import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {combine,binary,string,homeFirstPage,homeSection,originalCaptions,translatedCaptions,captionUrl} from './fixtures.mjs';
const code=new vm.Script(await readFile(new URL('../dist/clients.js',import.meta.url),'utf8'));
const loonCode=Object.fromEntries(await Promise.all(['request','api','caption'].map(async lane=>[lane,new vm.Script(await readFile(new URL('../dist/loon-'+lane+'.js',import.meta.url),'utf8'))])));
const element=name=>binary(153515154,binary(172660663,binary(1,binary(168777401,binary(3,binary(172035250,string(1,name+'.eml-fe|fixture')))))));
const normal=element('video_lockup_with_attachment'),ad=element('full_width_square_image_layout');
const make=ads=>homeFirstPage([homeSection([binary(474376530,combine(binary(1,normal),...(ads?[binary(1,ad)]:[])))])]);
const url='https://youtubei.googleapis.com/youtubei/v1/browse',before=make(true),expected=make(false);
function environment(client,options={}){
  let calls=0,result,callback,resolveFetch,requests=0;const logs=[],qx=client==='QuantumultX',settings=options.settings||{};
  const body=options.body||before,response={status:options.status||200,statusCode:options.status||200,headers:{},...(qx?{bodyBytes:body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength)}:{body})};
  const ctx={Uint8Array,ArrayBuffer,DataView,setTimeout:(fn,ms)=>setTimeout(fn,ms).unref(),$argument:settings,$request:{url:options.url||url,headers:{}},...(!options.request?{$response:response}:{}),$persistentStore:{read:()=>null,write:()=>true},$done:r=>{calls++;result=r;},$httpClient:{get:(req,cb)=>{requests++;callback=cb;},post:()=>{throw Error('unexpected fallback');}},console:{log:s=>logs.push(JSON.parse(s.slice(15)))}};
  if(client==='Loon')ctx.$loon='independent desktop fixture';
  if(qx){ctx.$environment={variables:settings};ctx.$prefs={valueForKey:()=>null,setValueForKey:()=>true};ctx.$task={fetch:()=>{requests++;return new Promise(resolve=>resolveFetch=resolve);}};}
  return{run:()=>(client==='Loon'?loonCode[options.request?'request':(options.url||url).includes('/api/timedtext')?'caption':'api']:code).runInNewContext(ctx),get calls(){return calls;},get requests(){return requests;},get result(){return result;},logs,reply:(data,status=200)=>qx?resolveFetch({statusCode:status,headers:{},bodyBytes:data}):callback(null,{status,headers:{}},data),output:()=>Buffer.from(qx?result.bodyBytes:result.body)};
}
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX']){
  test(client+' finishes local success, pass-through and failure before returning to the host',()=>{
    for(const options of [{},{body:Buffer.from([0])},{body:Buffer.alloc(8388609)},{status:503},{request:true},{url:'https://example.test/unrelated'},{settings:{REMOVE_ADS:false,TRANSLATE_CAPTIONS:false,HIDE_UPLOAD:false,HIDE_SHORTS:false}}]){
      const env=environment(client,options);env.run();assert.equal(env.calls,1);assert.equal(env.requests,0);
      if(Object.keys(options).length===0)assert.deepEqual(env.output(),expected);
    }
  });
  test(client+' completes each local response in a 32-entry host-turn burst',()=>{
    for(let i=0;i<32;i++){const env=environment(client);env.run();assert.equal(env.calls,1);assert.equal(env.requests,0);assert.deepEqual(env.output(),expected);}
  });
  test(client+' waits for caption network completion and reports its final state only once',async()=>{
    const env=environment(client,{url:captionUrl,body:Buffer.from(originalCaptions),settings:{BILINGUAL:false,TARGET_LANGUAGE:'zh-Hant'}});env.run();assert.equal(env.calls,0);assert.equal(env.logs.length,0);assert.equal(env.requests,1);
    env.reply(Buffer.from(translatedCaptions));await new Promise(setImmediate);
    assert.equal(env.calls,1);assert.equal(env.logs.length,1);assert.equal(env.logs[0].captionProvider,'youtube');assert.ok(env.output().toString().includes('一行中文'));assert.ok(!env.output().toString().includes('An original'));
    env.reply(Buffer.from(translatedCaptions));await new Promise(setImmediate);assert.equal(env.calls,1);assert.equal(env.logs.length,1);
  });
}
