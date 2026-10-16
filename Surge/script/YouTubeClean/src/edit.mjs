// Copyright 2026 Horatio Xu. MIT. YouTube policies and edits are implemented here.
import {decodeMessage,nested,findField,join,withPayload,makeBytes,makeInt,replaceAll,readPacked,same} from './wire.mjs';
import {utf8,fromUtf8,changeParam,CAPTION_REGEX,unb64} from './data.mjs';
import {graph,rendererAds} from './protocol.mjs';
const NS='.youtube.api.innertube.';
const ROOT={player:'PlayerResponse',browse:'BrowseResponse',next:'WatchNextResponse',search:'SearchResponse',guide:'GuideResponse',get_watch:'WatchBatch',config:'ConfigResponse',log_event:'ConfigResponse','player/ad_break':'AdBreakResponse','navigation/resolve_url':'ResolveUrlResponse','reel/reel_item_watch':'ReelItemWatchResponse','reel/reel_watch_sequence':'ReelSequenceResponse'};
const extra={
  [NS+'PlayerResponse']:{...graph[NS+'PlayerResponse'],10:NS+'Captions'},
  [NS+'Captions']:{51621377:NS+'CaptionList'},
  [NS+'GuideResponse']:{1:NS+'ResponseContext',4:NS+'Renderer',6:NS+'Renderer'},
  [NS+'Renderer']:{...graph[NS+'Renderer'],117866661:NS+'PivotBar'},
  [NS+'PivotBar']:{1:NS+'PivotItemWrapper'},
  [NS+'WatchBatch']:{1:NS+'GetWatchResponse',2:NS+'PlayerResponse',3:NS+'WatchNextResponse'},
  [NS+'AdBreakResponse']:{1:NS+'ResponseContext',777:NS+'FrameworkUpdateTransport'},
  [NS+'ReelSequenceResponse']:{1:NS+'ReelEntry'},
  [NS+'ReelEntry']:{1:NS+'Command'}
};
const PLAYER_ADS=new Set([7,23,25,27,38,44,45,48,68,69]);
const BREAK_ADS=new Set([2,3,6,9,10]);
const creation=new Set(['FEuploads','FEupload','FEcreate','creation_entry']);
const shortNav=new Set(['FEshorts']);
export function navIdentity(raw,depth=0){
  if(depth>7)return '';
  for(const f of decodeMessage(raw)){
    if(f.wire!==2)continue;
    const word=fromUtf8(f.payload,true);
    if(word&&(creation.has(word)||shortNav.has(word)))return word;
    // Navigation endpoint/renderer messages; never inspect arbitrary strings or tracking blobs.
    if(word&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(word))continue;
    try{const id=navIdentity(f.payload,depth+1);if(id)return id;}catch{}
  }return '';
}
function hidden(id,settings){return settings.hideCreate&&creation.has(id)||settings.hideShorts&&shortNav.has(id);}
function label(target,dual){const name=target==='zh-Hans'?'简体中文':target==='zh-Hant'?'繁體中文':target;return(dual?'双语字幕 · ':'翻译字幕 · ')+name;}
function replaceText(raw,no,value){return replaceAll(decodeMessage(raw),no,[makeBytes(no,utf8(value))]);}
function captionList(raw,s){
  if(!s.translate)return raw;
  const fields=decodeMessage(raw),tracks=fields.filter(f=>f.no===1&&f.wire===2);
  if(!tracks.length||tracks.length>128)return raw;
  const entries=tracks.map(f=>({field:f,fields:decodeMessage(f.payload)}));
  const word=(entry,n)=>fromUtf8(findField(entry.fields,n)?.payload||new Uint8Array(),true)||'';
  if(entries.some(e=>word(e,3)==='.ytclean.'+s.target))return raw;
  const valid=entries.filter(e=>word(e,4)!==s.target&&new RegExp(CAPTION_REGEX).test(word(e,1)));
  const chosen=valid.find(e=>word(e,4)==='en')||valid[0];if(!chosen)return raw;
  let track=chosen.field.payload;
  track=replaceText(track,1,changeParam(word(chosen,1),'tlang',s.target));
  track=replaceText(track,3,'.ytclean.'+s.target);track=replaceText(track,4,s.target);
  const title=makeBytes(1,makeBytes(1,utf8(label(s.target,s.dual))));
  track=replaceAll(decodeMessage(track),2,[makeBytes(2,title)]);
  track=replaceAll(decodeMessage(track),7,[makeInt(7,1)]);
  const index=tracks.length,out=[];
  for(const f of fields){
    if(f.no===2&&f.wire===2){
      let audio=f.payload;const af=decodeMessage(audio),ids=af.filter(x=>x.no===2).flatMap(readPacked);
      if(!ids.some(x=>x===BigInt(index)))audio=join([audio,makeInt(2,index)]);
      if(s.auto){audio=replaceAll(decodeMessage(audio),3,[makeInt(3,index)]);audio=replaceAll(decodeMessage(audio),11,[makeInt(11,3)]);}
      out.push(withPayload(f,audio));
    }else if(f.no===6&&s.auto)continue;else out.push(f.raw);
  }
  out.push(makeBytes(1,track));if(s.auto)out.push(makeInt(6,index));return join(out);
}
export function editBinary(raw,endpoint,settings,onKeys){
  let type=ROOT[endpoint];if(!type)return raw;
  if(endpoint==='get_watch'){
    const direct=decodeMessage(raw).some(f=>(f.no===2||f.no===3)&&f.wire===2);
    if(direct)type='GetWatchResponse';
  }
  const state={remaining:70000,depth:0,onKeys};
  return visit(raw,NS+type,settings,state);
}
export function editWatchPart(raw,settings){return visit(raw,NS+'GetWatchResponse',settings,{remaining:70000,depth:0});}
function visit(raw,type,s,state){
  if(state.depth>48)throw Error('message depth');
  const fields=decodeMessage(raw);state.remaining-=fields.length;if(state.remaining<0)throw Error('message count');
  if(type===NS+'OnesieHotConfig'&&state.onKeys){
    const key=findField(fields,1),encrypted=findField(fields,2),expiry=findField(fields,3);
    if(key?.payload?.length===32&&encrypted?.payload?.length)state.onKeys({key:key.payload,encrypted:encrypted.payload,ttl:Number(expiry?.value||3600n)});
  }
  if(type===NS+'CaptionList')return captionList(raw,s);
  const edges=extra[type]||graph[type]||{},output=[];let modified=false;
  for(const f of fields){
    if(type===NS+'GlobalConfigGroup'&&state.onKeys&&(f.no===3||f.no===7)&&f.wire===2){
      // The documented hot-config field can contain either serialized base64url or raw protobuf.
      try{
        const value=fromUtf8(f.payload,true);let hot=f.payload;
        if(value&&/^[A-Za-z0-9_+/=-]+$/.test(value)){let encoded=value.replace(/-/g,'+').replace(/_/g,'/');while(encoded.length%4)encoded+='=';hot=unb64(encoded);}
        state.depth++;try{visit(hot,NS+'HotConfigGroup',s,state);}finally{state.depth--;}
      }catch{}
    }
    if(s.ads&&((type===NS+'PlayerResponse'&&PLAYER_ADS.has(f.no))||(type===NS+'AdBreakResponse'&&BREAK_ADS.has(f.no)))){modified=true;continue;}
    if(s.ads&&f.wire===2&&rendererAds[f.no]&&(edges[f.no]||/Renderer(?:s)?$/.test(type))){modified=true;continue;}
    if(type===NS+'PivotBar'&&f.no===1&&f.wire===2&&(s.hideCreate||s.hideShorts)){
      if(hidden(navIdentity(f.payload),s)){modified=true;continue;}
    }
    let payload=f.payload;
    if(f.wire===2&&edges[f.no]){
      state.depth++;try{payload=visit(f.payload,edges[f.no],s,state);}finally{state.depth--;}
      if(!same(payload,f.payload)){modified=true;if(!payload.length)continue;output.push(withPayload(f,payload));continue;}
    }
    output.push(f.raw);
  }
  return modified?join(output):raw;
}

function camel(s){return s.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());}
const AD_NAMES=new Set([...Object.values(rendererAds).map(camel),'adSlotRenderer','displayAdRenderer','inFeedAdLayoutRenderer','promotedSparklesWebRenderer','searchPyvRenderer','promotedVideoRenderer','compactPromotedVideoRenderer','compactPromotedItemRenderer','carouselAdRenderer','videoMastheadAdV3Renderer','videoMastheadAdRenderer','adPlacementRenderer','playerLegacyDesktopWatchAdsRenderer','adBreakServiceRenderer']);
const SLOT_ARRAYS=new Set(['adPlacements','adSlots','playerAds']);
const PLAYER_SIGNALS=new Set(['adParams','adNextParams','adBreakParams','adBreakHeartbeatParams','prefetchedPrerollAdBreakResponse','playerCompanionAd','instreamPlayerCtaAd','ssdaiAdsConfig']);
const NAV_CONTAINERS=new Set(['pivotBarRenderer','pivotBarViewModel','miniGuideRenderer','guideSectionRenderer']);
function jsonNavId(item){
  const stack=[item];let budget=120;
  while(stack.length&&budget-->0){const node=stack.pop();if(!node||typeof node!=='object')continue;
    for(const key of ['pivotIdentifier','browseId','identifier']){const v=node[key];if(typeof v==='string'&&(creation.has(v)||shortNav.has(v)))return v;}
    if(node.uploadEndpoint||node.creationEntryPoint||node.creationEndpoint)return 'FEuploads';
    const icon=node.icon?.iconType;if(['CREATION_ENTRY','UPLOAD','VIDEO_CALL'].includes(icon))return 'FEuploads';if(icon==='SHORTS')return 'FEshorts';
    for(const v of Object.values(node))if(v&&typeof v==='object')stack.push(v);
  }return '';
}
function adCard(item,depth=0){
  if(!item||typeof item!=='object'||Array.isArray(item)||depth>4)return false;
  if(Object.keys(item).some(k=>AD_NAMES.has(k)))return true;
  for(const key of ['richItemRenderer','richSectionRenderer','content','contentViewModel'])if(adCard(item[key],depth+1))return true;
  return false;
}
function jsonCaptionList(list,s){
  const tracks=list.captionTracks;if(!s.translate||!Array.isArray(tracks)||!tracks.length||tracks.length>128||tracks.some(t=>t.vssId==='.ytclean.'+s.target))return;
  const source=tracks.find(t=>t.languageCode==='en'&&t.languageCode!==s.target&&new RegExp(CAPTION_REGEX).test(t.baseUrl||''))||tracks.find(t=>t.languageCode!==s.target&&new RegExp(CAPTION_REGEX).test(t.baseUrl||''));
  if(!source)return;
  const track={...source,baseUrl:changeParam(source.baseUrl,'tlang',s.target),vssId:'.ytclean.'+s.target,languageCode:s.target,name:{runs:[{text:label(s.target,s.dual)}]},isTranslatable:true};
  const index=tracks.push(track)-1;if(s.auto)list.defaultCaptionTrackIndex=index;
  for(const audio of list.audioTracks||[]){const old=Array.isArray(audio.captionTrackIndices)?audio.captionTrackIndices:[];if(!old.includes(index))audio.captionTrackIndices=[...old,index];if(s.auto){audio.defaultCaptionTrackIndex=index;audio.captionsInitialState=3;}}
}
export function editJson(document,s,onKeys){
  let budget=70000;
  function traverse(node,nav=false){
    if(--budget<0)throw Error('JSON item count');if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){for(let i=node.length-1;i>=0;i--){const item=node[i];if(nav&&hidden(jsonNavId(item),s)){node.splice(i,1);continue;}
      const adReel=item?.command?.reelWatchEndpoint?.adClientParams?.isAd===true||item?.reelWatchEndpoint?.adClientParams?.isAd===true;
      if(s.ads&&(adCard(item)||adReel)){node.splice(i,1);continue;}traverse(item,nav);
    }return;}
    jsonCaptionList(node,s);
    if(onKeys&&node.onesieHotConfig)onKeys(node.onesieHotConfig);
    for(const key of Object.keys(node)){
      if(s.ads&&AD_NAMES.has(key)){delete node[key];continue;}
      if(s.ads&&SLOT_ARRAYS.has(key)&&Array.isArray(node[key])){node[key]=[];continue;}
      if(s.ads&&PLAYER_SIGNALS.has(key)){delete node[key];continue;}
      traverse(node[key],nav||NAV_CONTAINERS.has(key));
    }
  }
  traverse(document);return document;
}
