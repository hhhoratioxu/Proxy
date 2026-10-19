import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
export const here=fileURLToPath(new URL('.',import.meta.url));
export const id='0000000000000000000001',colors={background:-10985626,text:-16777216,highlightText:-1};
export const meta={id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:300};
export function seedStore(track=meta){return new Map([['VerseLyrics.v1.cache',JSON.stringify({entries:[{key:'meta:'+track.id,value:track,expires:Date.now()+600000},{key:'palette:v1:'+track.id,value:{colors},expires:Date.now()+600000}],cooldowns:{}})]]);}
export function sourceFixture(provider,u,{lines=48,partial=false}={}){
 if(u.includes('/soso/'))return {code:0,data:{song:{list:[{songmid:'TESTMID',songname:meta.title,singer:[{name:meta.artists[0]}],albumname:meta.album,interval:300}]}}};
 if(u.includes('/cloudsearch/'))return {code:200,result:{songs:[{id:9,name:meta.title,ar:[{name:meta.artists[0]}],al:{name:meta.album},dt:300000}]}};
 if(u.includes('translate.googleapis.com'))return new URL(u).searchParams.getAll('q').map(s=>'第'+s.match(/(\d+)/)[1]+'句译文');
 const stamp=i=>'['+String(Math.floor((i*2+1)/60)).padStart(2,'0')+':'+String((i*2+1)%60).padStart(2,'0')+']';
 const lyric=Array.from({length:lines},(_,i)=>stamp(i)+'Original paper lantern '+i+'.').join('\n');
 const translated=Array.from({length:lines},(_,i)=>partial&&i%2?'':stamp(i)+'第'+i+'句译文').filter(Boolean).join('\n');
 return provider==='qq'?{code:0,lyric,trans:translated}:{code:200,lrc:{lyric},tlyric:{lyric:translated}};
}
// This harness mirrors documented host interfaces; it is not an iOS memory
// measurement. Every invocation compiles a fresh native script/context.
export async function invoke(client,{root=here,provider='netease',env={},format='protobuf',store=seedStore(),network,onSample=()=>{},track=id,responseBody,status=404}={}){
 const qx=client==='QuantumultX',calls=[],timers=[],type=format==='json'?'application/json':'application/x-protobuf';
 const config={FALLBACK_PROVIDER:provider,TARGET_LANGUAGE:'zh-CN',TRANSLATION_ENABLED:true,...env};
 const url='https://spclient.wg.spotify.com/color-lyrics/v2/track/'+track,body=new Uint8Array(Buffer.from(responseBody ?? 'missing'));let active=0,maxActive=0,done=0;
 const request=async(u,o,method)=>{active++;maxActive=Math.max(active,maxActive);calls.push(u);onSample();try{return await network(u,o,method);}finally{active--;onSample();}};
 onSample();let result;
 if(client==='Egern'){
  const module=await import(pathToFileURL(root+'/runtime/Egern/script/SpotifyLyrics/spotify-lyrics.js'));
  const http=async(u,o,m)=>{const r=await request(u,o,m);return new Response(r.body,{status:r.status??200,headers:r.headers||{}});};
  result=await module.default({env:config,request:{url,headers:new Headers({Accept:type})},response:new Response(body,{status,headers:{'Content-Type':type}}),storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v),getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:(u,o)=>http(u,o,'GET'),post:(u,o)=>http(u,o,'POST')}});done++;
 }else{
  let complete;const completed=new Promise(r=>complete=r),ctx={$request:{url,headers:{Accept:type}},$response:qx?{statusCode:status,headers:{'Content-Type':type},bodyBytes:body.buffer}:{status,headers:{'Content-Type':type},body},setTimeout:(fn,ms)=>{timers.push(ms);return 1;},$done:r=>{done++;complete(r);}};
  if(qx){ctx.$environment={variables:config};ctx.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>store.set(k,v)};ctx.$task={fetch:async o=>{const r=await request(o.url,o,o.method);return{statusCode:r.status??200,headers:r.headers||{},bodyBytes:new Uint8Array(Buffer.from(r.body)).buffer};}};}
  else{ctx.$argument=config;ctx.$persistentStore={read:k=>store.get(k),write:(v,k)=>store.set(k,v)};ctx.$httpClient=Object.fromEntries(['get','post'].map(method=>[method,(o,cb)=>{request(o.url,o,method.toUpperCase()).then(r=>cb(null,{status:r.status??200,headers:r.headers||{}},o['binary-mode']===false?r.body:new Uint8Array(Buffer.from(r.body))),e=>cb(String(e)));}]));}
  const code=readFileSync(root+'/runtime/'+client+'/script/SpotifyLyrics.js','utf8');new vm.Script(code).runInNewContext(ctx,{timeout:1000});onSample();result=await completed;
 }
 onSample();await new Promise(setImmediate);
 return {bytes:Buffer.from((qx?result.bodyBytes:result.body)||body),result,calls,store,maxActive,active,done,timers};
}
