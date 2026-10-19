// Copyright 2026 Horatio Xu. MIT. Platform-neutral processing contract.
import {asBytes,fromUtf8,utf8,safeJson,route,getHeader,b64,unb64,MAX_BODY,VERSION} from './data.mjs';
import {same} from './wire.mjs';
import {editBinary,editJson} from './edit.mjs';
import {editStream} from './stream.mjs';
import {handleCaption} from './captions.mjs';
import {unpackHttp} from './body.mjs';
export const STORE='Horatio.YouTubeClean.session.v1',INTERNAL='X-YouTubeClean-Internal';
function identity(io){return /music/i.test(getHeader(io.requestHeaders,'User-Agent'))?'music':'video';}
function sessions(io){try{const data=io.store.read(STORE);return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return{};}}
function sessionKey(io){
  const session=sessions(io)[identity(io)];if(!session)return{state:'missing',key:null};
  if(!Number.isFinite(session.until)||session.until<Date.now())return{state:'expired',key:null};
  try{const key=unb64(session.key);if(key.length===32)return{state:'available',key};}catch{}
  return{state:'invalid',key:null};
}
function current(io){return sessionKey(io).key;}
function save(io,value){
  try{let key=value.key,encrypted=value.encrypted;
    if(typeof value.clientKey==='string')key=unb64(value.clientKey);
    if(typeof value.encryptedClientKey==='string')encrypted=unb64(value.encryptedClientKey);
    if(typeof value.encryptKey==='string')encrypted=unb64(value.encryptKey);
    if(key?.length!==32||!encrypted?.length||encrypted.length>8192)return;
    const data=sessions(io),ttl=Number(value.ttl||value.keyExpiresInSeconds)||3600;
    data[identity(io)]={key:b64(key),encrypted:b64(encrypted),until:Date.now()+Math.max(30,Math.min(ttl,86400))*1000};return io.store.write(STORE,data)!==false;
  }catch{}return false;
}
function clear(io){try{const data=sessions(io);delete data[identity(io)];io.store.write(STORE,data);}catch{}}
function requestHeaders(io,settings,endpoint){
  const changes=[];
  // Startup browse/guide can supply the hot config before a log_event occurs.
  if(['log_event','browse','guide'].includes(endpoint)&&(settings.ads||settings.translate)&&!current(io))changes.push('x-youtube-hot-hash-data');
  const refresh=endpoint==='browse'&&settings.ads||endpoint==='guide'&&(settings.hideCreate||settings.hideShorts);
  if(refresh)changes.push('if-none-match','if-modified-since');
  if(!changes.length)return null;
  const headers=io.requestHeaders;
  if(typeof headers?.delete==='function'){for(const name of changes)headers.delete(name);if(refresh)headers.set('Cache-Control','no-cache');return{headers};}
  const out={};for(const [k,v]of Object.entries(headers||{}))if(!changes.includes(k.toLowerCase()))out[k]=v;if(refresh)out['Cache-Control']='no-cache';return{headers:out};
}
export async function handle(io,settings){
  const target=route(io.url);if(!target||getHeader(io.requestHeaders,INTERNAL))return null;
  const trace=settings.debug?{removed:0,templates:new Set(),matchedAdTemplates:new Set(),unknown:new Set(),feedCards:0}:null;
  const status=Number(io.status),session=sessionKey(io);
  const diagnostic={version:VERSION,profile:settings.profile,endpoint:target.name||(target.kind==='ump'?'initplayback':'timedtext'),phase:io.phase==='request'?'request':'response',adRemoval:settings.ads,deepFilter:settings.deep,format:target.kind==='ump'?'ump':'unknown',bytes:0,outputBytes:0,compression:'none',keyState:session.state,keySaved:false,changed:false,bypass:false,reason:'unchanged'};
  if(Number.isInteger(status)&&status>=100&&status<=599)diagnostic.status=status;
  const collect=value=>{if(save(io,value))diagnostic.keySaved=true;};
  try{
    if(!settings.active){diagnostic.reason='disabled';return null;}
    if(io.phase==='request'){
      const result=target.kind==='api'?requestHeaders(io,settings,target.name):null;
      diagnostic.changed=!!result;diagnostic.reason=result?'request-updated':'request-unchanged';return result;
    }
    if(getHeader(io.responseHeaders,'X-YouTubeClean')){diagnostic.reason='already-processed';return null;}
    if(target.kind==='caption')return await handleCaption(io,settings,diagnostic,INTERNAL);
    if(status!==200){diagnostic.bypass=true;diagnostic.reason='http-status';return null;}
    const bytes=asBytes(io.body),limit=MAX_BODY;
    diagnostic.bytes=bytes.length;diagnostic.outputBytes=bytes.length;
    if(!bytes.length){diagnostic.bypass=true;diagnostic.reason='empty-body';return null;}
    if(bytes.length>limit){diagnostic.bypass=true;diagnostic.reason='body-too-large';return null;}
    diagnostic.compression=bytes[0]===31&&bytes[1]===139?'gzip':'none';
    const unpacked=unpackHttp(bytes,limit),plain=unpacked.bytes;
    let output=plain;
    if(target.kind==='ump'){
      output=editStream(plain,session.key,settings,trace,collect);
      if(trace?.missingKey){diagnostic.reason='key-'+session.state;diagnostic.bypass=true;}
      else if(trace&&trace.metadataParts===0)diagnostic.reason='no-target-metadata';
    }else{
      const first=fromUtf8(plain.subarray(0,40));
      const isJson=/json/i.test(getHeader(io.responseHeaders,'Content-Type'))||/^\s*\{/.test(first);
      diagnostic.format=isJson?'json':'protobuf';
      if(isJson){
        const json=safeJson(fromUtf8(plain)),changes={changed:false};editJson(json,settings,collect,trace,changes);if(changes.changed)output=utf8(JSON.stringify(json));
      }else output=editBinary(plain,target.name,settings,collect,trace);
    }
    if(same(output,plain))return null;
    diagnostic.changed=true;diagnostic.bypass=false;diagnostic.reason='modified';diagnostic.outputBytes=output.length;
    return{body:output};
  }catch(error){
    diagnostic.bypass=true;
    const message=error?.message;
    if(message==='UMP authentication'||message==='UMP crypto dimensions'){clear(io);diagnostic.keyState='missing';diagnostic.reason='stream-auth-failed';}
    else if(message==='body too large')diagnostic.reason='body-too-large';
    else if(message==='body representation')diagnostic.reason='body-representation';
    else if(message==='UMP compression'||message==='UMP gzip marker')diagnostic.reason='stream-compression-unsupported';
    else if(diagnostic.reason!=='caption-download-failed')diagnostic.reason='decode-failed';
    return null;
  }finally{
    if(trace&&typeof io.report==='function')try{
      io.report({...diagnostic,removedParts:diagnostic.changed?trace.removed:0,feedCards:trace.feedCards,templates:[...trace.templates],matchedAdTemplates:[...trace.matchedAdTemplates],unknownRendererTags:[...trace.unknown],...(trace.rootFields?{rootFields:trace.rootFields}:{}),...(trace.umpFrames!==undefined?{umpFrames:trace.umpFrames,umpTypes:trace.umpTypes,umpHeaderTypes:trace.umpHeaderTypes,metadataParts:trace.metadataParts,changedMetadataParts:diagnostic.changed?trace.changedMetadataParts:0}:{})});
    }catch{}
  }
}
