// Copyright 2026 Horatio Xu. MIT. Native feed-element policy, written independently.
import {decodeMessage,findField,join,withPayload,same} from './wire.mjs';
import {fromUtf8} from './data.mjs';
import {rendererAds} from './protocol.mjs';
const ELEMENT_RENDERER=153515154,NEW_ELEMENT=172660663,COMPONENT_TYPE=168777401,URI_CONFIG=172035250;
const AD_BADGE=138592202;
// Observed on a real iOS home feed; advertising use independently confirmed in
// PoomSmart/YouTube-X 48b901532f9e12152684f3326d4250efcdea61e5 (MIT).
// Match complete normalized identifiers, never a visible title or arbitrary bytes.
const VIDEO_AD_TEMPLATES=new Set(['video_display_full_buttoned_layout','video_display_full_layout']);
const fields=raw=>decodeMessage(raw,256);
function child(raw,no){const f=findField(fields(raw),no);return f?.wire===2?f.payload:null;}

export function templateName(uri){
  if(typeof uri!=='string'||uri.length>240)return '';
  const name=uri.split('|')[0].replace(/\.eml(?:-[a-z0-9-]+)?$/i,'').replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
  // Only static template identifiers, never URLs, query strings or visible titles.
  return /^[a-z][a-z0-9_./-]{0,100}$/.test(name)?name:'';
}
function remember(trace,name){if(name&&trace?.templates&&trace.templates.size<16)trace.templates.add(name);}
function matched(trace,name){if(name&&trace?.matchedAdTemplates&&trace.matchedAdTemplates.size<16)trace.matchedAdTemplates.add(name);}
export function promotionalTemplate(name,deep=false){
  if(!name)return false;
  if(VIDEO_AD_TEMPLATES.has(name))return true;
  const ad=/(?:^|[_./-])(?:ad|ads|advertisement|advertising|promoted|sponsored)(?:$|[_./-])/;
  if(ad.test(name))return true;
  return deep&&(/(?:^|[_./-])(?:promo|promotion|upsell)(?:$|[_./-])/.test(name)||/^(?:statement_banner|brand_banner|premium_offer)(?:$|[_./-])/.test(name));
}
function component(raw){const type=child(raw,1);return type?child(type,COMPONENT_TYPE):null;}
function inspectNode(raw,settings,trace){
  const c=component(raw);if(!c)return false;
  const config=child(c,3),uri=config&&child(config,URI_CONFIG),label=uri&&child(uri,1);
  const name=label?templateName(fromUtf8(label,true)):'';remember(trace,name);
  const blocked=promotionalTemplate(name,settings.deep);if(blocked)matched(trace,name);return blocked;
}
function markerInModel(raw,state,depth=0){
  if(depth>12||state.left--<=0)return false;
  let fs;try{fs=fields(raw);}catch{return false;}
  for(const f of fs){if(f.wire!==2)continue;
    if(f.no===AD_BADGE||rendererAds[f.no])return true;
    // Text, links and signatures stay opaque. Recurse only into binary-shaped data.
    const text=fromUtf8(f.payload,true);
    if(text&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))continue;
    if(markerInModel(f.payload,state,depth+1))return true;
  }return false;
}
function nodeAd(raw,settings,trace){
  if(inspectNode(raw,settings,trace))return true;
  if(settings.deep){const c=component(raw),model=c&&child(c,5);if(model&&markerInModel(model,{left:256}))return true;}
  return false;
}
function editNode(raw,settings,trace,state,depth=0){
  if(depth>24||state.left--<=0)throw Error('element budget');
  if(nodeAd(raw,settings,trace)){if(trace)trace.removed++;return new Uint8Array();}
  const out=[];let changed=false;
  for(const f of fields(raw)){
    if(f.no===3&&f.wire===2){
      let fresh=f.payload;try{fresh=editNode(f.payload,settings,trace,state,depth+1);}catch{}
      if(!same(fresh,f.payload)){changed=true;if(fresh.length)out.push(withPayload(f,fresh));continue;}
    }out.push(f.raw);
  }return changed?join(out):raw;
}
export function editElementRenderer(raw,settings,trace){
  if(!settings.ads)return raw;
  const out=[];let changed=false;
  for(const f of fields(raw)){
    if(f.no===NEW_ELEMENT&&f.wire===2){
      const fresh=editNode(f.payload,settings,trace,{left:512});
      if(!fresh.length)return fresh;
      if(!same(fresh,f.payload)){out.push(withPayload(f,fresh));changed=true;continue;}
    }out.push(f.raw);
  }return changed?join(out):raw;
}

// Strong mode is confined to one already identified feed card, never response context,
// account data, global template resources, or a whole section containing normal videos.
export function deepCardAd(raw,settings,trace){
  if(!settings.ads||!settings.deep||raw.length>524288)return false;
  const state={left:512};
  function scan(bytes,depth=0){
    if(depth>12||state.left--<=0)return false;
    let fs;try{fs=fields(bytes);}catch{return false;}
    for(const f of fs){if(f.wire!==2)continue;
      if(rendererAds[f.no]||f.no===AD_BADGE)return true;
      if(f.no===ELEMENT_RENDERER){try{
        for(const e of fields(f.payload))if(e.no===NEW_ELEMENT&&e.wire===2&&nodeAd(e.payload,settings,trace))return true;
      }catch{} }
      const text=fromUtf8(f.payload,true);
      if(text&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))continue;
      if(scan(f.payload,depth+1))return true;
    }return false;
  }
  return scan(raw);
}
export function jsonElementAd(node,settings,trace){
  if(!node||typeof node!=='object')return false;
  const root=node.elementRenderer?.newElement||node.newElement;
  if(!root)return false;
  const name=templateName(root.type?.componentType?.templateConfig?.uriTemplateConfig?.uri);remember(trace,name);
  const blocked=promotionalTemplate(name,settings.deep);if(blocked)matched(trace,name);return blocked;
}
