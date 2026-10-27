// Copyright 2026 Horatio Xu. MIT. Bounded, loss-preserving feed-envelope editing.
import {decodeMessage,join,withPayload,same} from './wire.mjs';
import {isOpaqueText} from './data.mjs';
import {embeddedElementAd} from './elements.mjs';
import {rendererAds} from './protocol.mjs';
// Observed in a real 1.2.9 iOS browse diagnostic on 2026-10-28. Its inner
// schema is not assumed: only validated native Elements and declared ad
// renderer fields can be removed, never an entire mixed wrapper by association.
export const FEED_ENVELOPE=474376530;
const MAX_NODES=8192,MAX_DEPTH=24,MAX_SCANNED=24*1048576;
export function editFeedEnvelope(raw,settings,trace,shared={nodes:0,bytes:0}){
  if(!settings.ads||!settings.deep)return raw;
  const state={nodes:0,elements:0},previousRemoved=trace?.removed||0,previousMatches=trace?.matchedAdTemplates?new Set(trace.matchedAdTemplates):null;
  if(trace){trace.feedEnvelopeFields??=new Set();trace.feedEnvelopeFields.add(FEED_ENVELOPE);}
  let bypass=false;
  function walk(bytes,depth=0,skipElement=false){
    if(depth>MAX_DEPTH||shared.nodes>=MAX_NODES||shared.bytes+bytes.length>MAX_SCANNED)throw Error('feed envelope budget');
    shared.nodes++;shared.bytes+=bytes.length;state.nodes++;
    let fs;try{fs=decodeMessage(bytes,2048);}catch{return bytes;}
    if(depth===0&&trace){trace.feedEnvelopeShapes??=[];if(trace.feedEnvelopeShapes.length<3)trace.feedEnvelopeShapes.push({field:FEED_ENVELOPE,bytes:bytes.length,fields:fs.slice(0,12).map(f=>[f.no,f.wire,f.payload?.length||0])});}
    const advertisement=skipElement?null:embeddedElementAd(fs,settings,trace);
    if(advertisement!==null)state.elements++;
    if(advertisement){if(trace)trace.removed++;return new Uint8Array();}
    let changed=false;const out=[];
    for(const f of fs){
      if(f.wire===2&&rendererAds[f.no]){changed=true;if(trace)trace.removed++;continue;}
      // Framework resources are definitions, not visible feed entries. Text,
      // titles, signed URLs and arbitrary opaque bytes retain their exact form.
      if(f.wire===2&&f.no!==777&&!isOpaqueText(f.payload)){
        const fresh=walk(f.payload,depth+1,advertisement===false&&f.no===172660663);
        if(!same(fresh,f.payload)){changed=true;if(fresh.length)out.push(withPayload(f,fresh));continue;}
      }
      out.push(f.raw);
    }
    return changed?join(out):bytes;
  }
  try{return walk(raw);}catch{
    bypass=true;if(trace){trace.removed=previousRemoved;if(previousMatches)trace.matchedAdTemplates=previousMatches;}return raw;
  }finally{if(trace){trace.feedEnvelopeNodes=(trace.feedEnvelopeNodes||0)+state.nodes;trace.feedEnvelopeElements=(trace.feedEnvelopeElements||0)+state.elements;trace.feedEnvelopeBypasses=(trace.feedEnvelopeBypasses||0)+(bypass?1:0);}}
}
