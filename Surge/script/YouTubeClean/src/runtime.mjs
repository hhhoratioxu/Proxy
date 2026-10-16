// Copyright 2026 Horatio Xu. MIT. Platform-neutral processing contract.
import {asBytes,fromUtf8,utf8,safeJson,route,param,changeParam,getHeader,b64,unb64,MAX_BODY,MAX_CAPTION,VERSION} from './data.mjs';
import {same} from './wire.mjs';
import {editBinary,editJson} from './edit.mjs';
import {editStream} from './stream.mjs';
import {bilingual} from './timeline.mjs';
export const STORE='Horatio.YouTubeClean.session.v1',INTERNAL='X-YouTubeClean-Internal';
function identity(io){return /music/i.test(getHeader(io.requestHeaders,'User-Agent'))?'music':'video';}
function sessions(io){try{const data=io.store.read(STORE);return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return{};}}
function current(io){const session=sessions(io)[identity(io)];if(!session||session.until<Date.now())return null;try{const key=unb64(session.key);return key.length===32?key:null;}catch{return null;}}
function save(io,value){
  try{let key=value.key,encrypted=value.encrypted;
    if(typeof value.clientKey==='string')key=unb64(value.clientKey);
    if(typeof value.encryptedClientKey==='string')encrypted=unb64(value.encryptedClientKey);
    if(typeof value.encryptKey==='string')encrypted=unb64(value.encryptKey);
    if(key?.length!==32||!encrypted?.length||encrypted.length>8192)return;
    const data=sessions(io),ttl=Number(value.ttl||value.keyExpiresInSeconds)||3600;
    data[identity(io)]={key:b64(key),encrypted:b64(encrypted),until:Date.now()+Math.max(30,Math.min(ttl,86400))*1000};io.store.write(STORE,data);
  }catch{}
}
function clear(io){try{const data=sessions(io);delete data[identity(io)];io.store.write(STORE,data);}catch{}}
function requestHeaders(io,settings,endpoint){
  const changes=[];
  if(endpoint==='log_event'&&(settings.ads||settings.translate)&&!current(io))changes.push('x-youtube-hot-hash-data');
  const refresh=endpoint==='browse'&&settings.ads||endpoint==='guide'&&(settings.hideCreate||settings.hideShorts);
  if(refresh)changes.push('if-none-match','if-modified-since');
  if(!changes.length)return null;
  const headers=io.requestHeaders;
  if(typeof headers?.delete==='function'){for(const name of changes)headers.delete(name);if(refresh)headers.set('Cache-Control','no-cache');return{headers};}
  const out={};for(const [k,v]of Object.entries(headers||{}))if(!changes.includes(k.toLowerCase()))out[k]=v;if(refresh)out['Cache-Control']='no-cache';return{headers:out};
}
export async function handle(io,settings){
  const target=route(io.url);if(!target||!settings.active||getHeader(io.requestHeaders,INTERNAL))return null;
  if(io.phase==='request')return target.kind==='api'?requestHeaders(io,settings,target.name):null;
  if(io.status!==200||getHeader(io.responseHeaders,'X-YouTubeClean'))return null;
  const bytes=asBytes(io.body),limit=target.kind==='caption'?MAX_CAPTION:MAX_BODY;if(!bytes.length||bytes.length>limit)return null;
  let output=bytes;
  if(target.kind==='caption'){
    if(!settings.translate||!settings.dual||param(io.url,'tlang').toLowerCase()!==settings.target.toLowerCase())return null;
    const url=changeParam(io.url,'tlang',null);if(route(url)?.kind!=='caption')return null;
    const original=await io.download(url,{[INTERNAL]:'1',Accept:getHeader(io.responseHeaders,'Content-Type')||'*/*'});
    if(original.status!==200||asBytes(original.body).length>MAX_CAPTION)return null;
    const merged=bilingual(fromUtf8(bytes),fromUtf8(original.body));if(merged)output=utf8(merged);
  }else if(target.kind==='ump'){
    const key=current(io);if(!key)return null;
    try{output=editStream(bytes,key,settings);}catch{clear(io);return null;}
  }else{
    const collect=value=>save(io,value),first=fromUtf8(bytes.subarray(0,40));
    const isJson=/json/i.test(getHeader(io.responseHeaders,'Content-Type'))||/^\s*\{/.test(first);
    const trace=settings.debug&&target.name==='browse'?{removed:0,templates:new Set(),unknown:new Set()}:null;
    let bypass=false;
    try{
      if(isJson){
        const json=safeJson(fromUtf8(bytes)),before=JSON.stringify(json);editJson(json,settings,collect,trace);const after=JSON.stringify(json);if(after!==before)output=utf8(after);
      }else output=editBinary(bytes,target.name,settings,collect,trace);
    }catch{bypass=true;output=bytes;}
    if(trace&&typeof io.report==='function')try{io.report({version:VERSION,profile:settings.profile,adRemoval:settings.ads,deepFilter:settings.deep,format:isJson?'json':'protobuf',bytes:bytes.length,removedParts:same(output,bytes)?0:trace.removed,templates:[...trace.templates],unknownRendererTags:[...trace.unknown],bypass});}catch{}
  }
  return same(output,bytes)?null:{body:output};
}
