// Copyright 2026 Horatio Xu. MIT. Proxy clients with callback-style script interfaces.
import {Settings,asBytes,finalizeHeaders,MAX_CAPTION,VERSION,route} from './data.mjs';
import {handle} from './runtime.mjs';
const isQX=typeof $task!=='undefined';
const isLoon=typeof $loon!=='undefined';
const request=typeof $request==='undefined'?{}:$request,response=typeof $response==='undefined'?null:$response;
let diagnostics=true;
function report(data){try{if(typeof console!=='undefined'&&typeof console.log==='function')console.log('[YouTubeClean] '+JSON.stringify(data));}catch{}}
function read(key){const encoded=isQX?$prefs.valueForKey(key):$persistentStore.read(key);if(!encoded)return null;try{return JSON.parse(encoded);}catch{return null;}}
function write(key,value){const encoded=JSON.stringify(value);return isQX?$prefs.setValueForKey(encoded,key):$persistentStore.write(encoded,key);}
async function download(url,headers){
  let timer;
  const task=isQX?$task.fetch({url,method:'GET',headers,opts:{redirection:false,'auto-cookie':false,hints:false}}).then(r=>({status:r.statusCode,body:r.bodyBytes||r.body})):
    new Promise((resolve,reject)=>$httpClient.get({url,headers,timeout:isLoon?4000:4,'binary-mode':true,'auto-cookie':false,'auto-redirect':false},(error,result,body)=>{if(error||!result)reject(Error('caption connection'));else resolve({status:result.status||result.statusCode,body});}));
  const result=await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('caption timeout')),4000);})]).finally(()=>{if(typeof clearTimeout==='function')clearTimeout(timer);});
  if(result.status===200&&asBytes(result.body).length>MAX_CAPTION)throw Error('caption size');return result;
}
async function execute(){
  const input=isQX?(typeof $environment==='undefined'?{}:$environment.variables||{}):(typeof $argument==='undefined'?{}:$argument);
  const settings=new Settings(input);
  diagnostics=settings.debug;
  const result=await handle({
    url:request.url||'',phase:response?'response':'request',status:response?.statusCode??response?.status,
    requestHeaders:request.headers||{},responseHeaders:response?.headers||{},body:response?.bodyBytes??response?.body,
    store:{read,write},download,report
  },settings);
  if(!result)return{};
  if(result.body){const data=asBytes(result.body),headers=finalizeHeaders(response.headers);return isQX?{bodyBytes:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),headers}:{body:data,headers};}
  return result;
}
execute().then(result=>$done(result),()=>{
  const target=route(request.url||'');
  if(diagnostics&&target)report({version:VERSION,endpoint:target.name||(target.kind==='ump'?'initplayback':'timedtext'),phase:response?'response':'request',changed:false,bypass:true,reason:'adapter-error'});
  $done({});
});
