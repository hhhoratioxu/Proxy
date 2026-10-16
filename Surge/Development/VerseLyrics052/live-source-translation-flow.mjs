import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {invoke,seedStore,id as fixtureId} from './feature-host.mjs';
import {parseDocument,existingPalette} from './core/spotify-lyrics.js';
const track='7qiZfU4dY1lWllzX7mPBI3',store=new Map(),requests=[];let candidate=null;
async function network(url,options,method){
 const u=new URL(url),start=performance.now(),record={host:u.host,path:u.pathname,method};requests.push(record);
 try{
  const response=await fetch(url,{method,headers:options.headers,body:method==='POST'?options.body:undefined,redirect:'error',signal:AbortSignal.timeout(Math.min(8000,options.timeout||2500))});
  const reader=response.body.getReader(),limit=u.host==='open.spotify.com'?262144:98304,chunks=[];let size=0;
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit){await reader.cancel();throw Error('probe body limit');}chunks.push(part.value);}
  const bytes=Buffer.concat(chunks),body=bytes.toString('utf8');record.status=response.status;record.bytes=bytes.length;record.sha256=createHash('sha256').update(bytes).digest('hex');
  if(u.pathname==='/api/song/lyric'){const data=JSON.parse(body);record.sourceFields={originalCharacters:data.lrc?.lyric?.length||0,translationCharacters:data.tlyric?.lyric?.length||0};}
  if(u.pathname==='/api/cloudsearch/pc')candidate=JSON.parse(body).result?.songs?.find(s=>s.id===451703096)||candidate;
  if(u.host==='translate.googleapis.com')record.originalRows=u.searchParams.getAll('q').length;
  return{status:response.status,headers:Object.fromEntries(response.headers),body};
 }catch(e){record.error=e.name+': '+e.message;throw e;}finally{record.ms=+(performance.now()-start).toFixed(1);}
}
const start=performance.now(),first=await invoke('Loon',{track,store,network,provider:'netease'}),firstMs=performance.now()-start;
let output;
try{
 const doc=parseDocument(first.bytes,'application/x-protobuf'),cache=JSON.parse(store.get('VerseLyrics.v1.cache')||'{}'),pairs=cache.entries?.find(e=>e.key==='translations:v1:zh-CN:'+track)?.value?.pairs||[],meta=cache.entries?.find(e=>e.key==='meta:'+track)?.value;
 const warm=await invoke('Loon',{track,store,network,provider:'netease'});
 output={matched:doc.words.length>0,spotifyMetadata:meta,nativeLines:doc.words.length,sourceTranslatedUniquePairs:pairs.filter(p=>p[2]==='source').length,engineTranslatedUniquePairs:pairs.filter(p=>p.length===2).length,colors:existingPalette(first.bytes,doc),firstMs:+firstMs.toFixed(1),firstHTTP:first.calls.length,warmHTTP:warm.calls.length,warmOutputEqual:first.bytes.equals(warm.bytes),outputSHA256:createHash('sha256').update(first.bytes).digest('hex'),cacheCharacters:(store.get('VerseLyrics.v1.cache')||'').length};
}catch(e){output={matched:false,error:e.message,firstHTTP:first.calls.length,firstMs:+firstMs.toFixed(1)};}
let providerSignatureCase={available:false};
if(candidate){
 const signature={id:fixtureId,title:candidate.name,artists:candidate.ar.map(a=>a.name),album:candidate.al.name,duration:candidate.dt/1000},seed=seedStore(signature),at=requests.length;
 const response=await invoke('Loon',{store:seed,network,provider:'netease'});
 try{
  const parsed=parseDocument(response.bytes,'application/x-protobuf'),entries=JSON.parse(seed.get('VerseLyrics.v1.cache')).entries,pairs=entries.find(e=>e.key==='translations:v1:zh-CN:'+fixtureId)?.value?.pairs||[];
  const revisit=await invoke('Loon',{store:seed,network,provider:'netease'});
  providerSignatureCase={available:true,scope:'Metadata signature seeded from an actual NetEase search candidate, using a synthetic Spotify track ID and preseeded palette. Public search/lyric/translator HTTP and compiled Loon bridge are real; Spotify album identity and Spotify UI are not verified by this case.',signature,nativeLines:parsed.words.length,sourceTranslatedUniquePairs:pairs.filter(p=>p[2]==='source').length,engineTranslatedUniquePairs:pairs.filter(p=>p.length===2).length,firstHTTP:response.calls.length,warmHTTP:revisit.calls.length,warmOutputEqual:revisit.bytes.equals(response.bytes),cacheCharacters:seed.get('VerseLyrics.v1.cache').length,requestStartIndex:at};
 }catch(e){providerSignatureCase={available:false,error:e.message,requestStartIndex:at};}
}
const report={at:new Date().toISOString(),version:'0.5.2',scope:'Compiled Loon native hook in a Node host mock with actual public HTTP. First case starts with an empty cache and real Spotify embed metadata; a separate provider-signature case explicitly seeds provider metadata if available. No Spotify token or saved lyric text. Not an iPhone VPN or UI test.',track:'https://open.spotify.com/track/'+track,output,providerSignatureCase,requests};
writeFileSync(new URL('./live-source-translation-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
