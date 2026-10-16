// Copyright 2026 Horatio Xu. MIT. Egern native JavaScript interface.
import {Settings,route,asBytes,getHeader,finalizeHeaders,MAX_BODY,MAX_CAPTION} from './data.mjs';
import {handle,INTERNAL} from './runtime.mjs';
export default async function(context){
  if(!context.request)return;
  const target=route(context.request.url);if(!target||getHeader(context.request.headers,INTERNAL))return;
  let original;
  try{
    const settings=new Settings(context.env||{});if(!settings.active)return;
    if(context.response){
      if(context.response.status!==200||getHeader(context.response.headers,'X-YouTubeClean'))return;
      const announced=Number(getHeader(context.response.headers,'Content-Length'));
      if(announced>(target.kind==='caption'?MAX_CAPTION:MAX_BODY))return;
      original=new Uint8Array(await context.response.arrayBuffer());
    }
    const result=await handle({
      url:context.request.url,phase:context.response?'response':'request',status:context.response?.status,
      requestHeaders:context.request.headers,responseHeaders:context.response?.headers,body:original,
      store:{read:key=>context.storage.getJSON(key),write:(key,value)=>context.storage.setJSON(key,value)},
      download:async(url,headers)=>{
        const response=await context.http.get(url,{headers,timeout:4000,credentials:'omit',redirect:'error',insecureTls:false});
        if(response.status!==200)return{status:response.status,body:new Uint8Array()};
        const size=Number(getHeader(response.headers,'Content-Length'));if(size>MAX_CAPTION)throw Error('caption size');
        return{status:response.status,body:new Uint8Array(await response.arrayBuffer())};
      }
    },settings);
    if(result?.body)return{body:result.body,headers:finalizeHeaders(context.response.headers)};
    if(result?.headers)return{headers:result.headers};
  }catch{}
  // A Fetch body may be read once; return every byte if processing fails after reading it.
  if(original)return{body:asBytes(original)};
}
