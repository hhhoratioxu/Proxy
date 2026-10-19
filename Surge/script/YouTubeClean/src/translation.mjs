// Copyright 2026 Horatio Xu. MIT. One bounded, position-checked fallback batch.
import {utf8,fromUtf8,asBytes,safeJson,MAX_CAPTION,getHeader} from './data.mjs';
import {unpackHttp} from './body.mjs';
export const TRANSLATION_BACKOFF='Horatio.YouTubeClean.translation.backoff.v1';
const compact=s=>s.replace(/\s+/g,' ').trim();
function language(value,target=false){
 const name=String(value||'').toLowerCase();if(['zh-hant','zh-tw','zh-hk'].includes(name))return'zh-TW';if(['zh-hans','zh-cn','zh-sg'].includes(name))return'zh-CN';
 return /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(name)?name.split('-')[0]:(target?'zh-CN':'auto');
}
export function translationBatch(timeline,source,target){
 const texts=[],indices=new Map();let total=0;
 for(const cue of timeline.cues){const text=compact(cue.words);if(!text||indices.has(text))continue;
  total+=utf8(text).length;if(text.length>4000||total>48000||texts.length>=2048)throw Error('translation input limit');indices.set(text,texts.length);texts.push(text);
 }
 if(!texts.length)throw Error('translation empty');
 const body=texts.map(text=>'q='+encodeURIComponent(text)).join('&');if(utf8(body).length>192000)throw Error('translation input limit');
 return {texts,indices,request:{url:'https://translate.googleapis.com/translate_a/t?client=gtx&format=text&sl='+language(source)+'&tl='+language(target,true),headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',Accept:'application/json'},body}};
}
function pause(io){try{const x=io.store?.read(TRANSLATION_BACKOFF),now=Date.now();return Number.isFinite(x?.until)&&x.until>now&&x.until<=now+301000?x.until:0;}catch{return 0;}}
function throttle(io,headers){
 const value=getHeader(headers,'Retry-After');let seconds=/^\d+$/.test(value)?Number(value):(Date.parse(value)-Date.now())/1000;if(!Number.isFinite(seconds))seconds=60;
 const until=Math.max(pause(io),Date.now()+Math.min(300,Math.max(30,seconds))*1000);try{io.store?.write(TRANSLATION_BACKOFF,{until});}catch{}return until;
}
export async function googleFallback(io,settings,timeline,source,diagnostic,deadline){
 const d=diagnostic;if(!settings.fallback||typeof io.translate!=='function')return null;
 const paused=pause(io);if(paused){d.captionFallbackReason='cooldown';d.captionFallbackRetryAfterSeconds=Math.ceil((paused-Date.now())/1000);return null;}
 if(deadline-Date.now()<250){d.captionFallbackReason='deadline';return null;}
 let batch;try{batch=translationBatch(timeline,source,settings.target);}catch{d.captionFallbackReason='input-limit';return null;}
 const timeout=Math.min(4000,deadline-Date.now());if(timeout<250){d.captionFallbackReason='deadline';return null;}
 let response;try{response=await io.translate(batch.request,timeout);}catch(error){d.captionFallbackReason=error?.message==='caption timeout'?'timeout':'connection';return null;}
 if(Date.now()>deadline){d.captionFallbackReason='deadline';return null;}
 const status=Number(response?.status);if(Number.isInteger(status)&&status>=100&&status<=599)d.captionFallbackStatus=status;
 if(status!==200){d.captionFallbackReason='http-status';if(status===429)d.captionFallbackRetryAfterSeconds=Math.ceil((throttle(io,response.headers)-Date.now())/1000);return null;}
 let answers;try{
  const raw=asBytes(response.body);if(raw.length>MAX_CAPTION)throw Error('large');answers=safeJson(fromUtf8(unpackHttp(raw,MAX_CAPTION).bytes));
  if(!Array.isArray(answers)||answers.length!==batch.texts.length)throw Error('mapping');
  answers=answers.map(x=>{if(Array.isArray(x)&&x.length===2&&typeof x[1]==='string'&&/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(x[1]))x=x[0];if(typeof x!=='string'||!compact(x)||x.length>16000)throw Error('mapping');return compact(x);});
 }catch{d.captionFallbackReason='invalid-batch';return null;}
 const replacements=new Map();
 for(const cue of timeline.cues){const original=compact(cue.words),translated=answers[batch.indices.get(original)];if(!translated||translated===original)continue;replacements.set(cue,settings.dual?cue.words.trim()+'\n'+translated:translated);}
 if(!replacements.size){d.captionFallbackReason='unchanged';return null;}
 const body=utf8(timeline.render(replacements));if(body.length>MAX_CAPTION){d.captionFallbackReason='output-limit';return null;}
 d.captionProvider='google';d.captionFallbackItems=batch.texts.length;d.captionFallbackReason='translated';return body;
}
