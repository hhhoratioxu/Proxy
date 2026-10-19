import {writeFileSync} from 'node:fs';
import {encodeDocument} from './core/spotify-lyrics.js';
const colors={background:-10985626,text:-16777216,highlightText:-1};
for(const foreign of [false,true]){
 const words=Array.from({length:600},(_,i)=>(foreign?['na','la','oh']:['ohohoh','hahaha','oh\u200b','o\u200bh','中文 lalala','哦 ah'])[i%(foreign?3:6)]),doc={lyrics:{syncType:'LINE_SYNCED',language:foreign?'fr':'en',provider:'Original',providerDisplayName:'Original',lines:words.map((words,i)=>({words,startTimeMs:String(i*2100)})),alternatives:[{language:'zh-CN',lines:words.map(()=> 'BAD_OFFICIAL')}]},colors},bytes=encodeDocument(doc,'protobuf');
 const source=`var __done=false,__queue=[],__output,calls=0,store=new Map();
var $argument={FALLBACK_PROVIDER:'off',TARGET_LANGUAGE:'zh-CN',TRANSLATION_ENABLED:true};
var $request={url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001',headers:{Accept:'application/x-protobuf'}};
var $response={status:200,headers:{'Content-Type':'application/x-protobuf'},body:new Uint8Array(${JSON.stringify([...bytes])})};
var $persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};
var $done=r=>{if(__done||__queue.length)throw Error('completion');__done=true;__output=r;};
function __http(o,cb){calls++;if(!${foreign})throw Error('English fillers requested translation');if(!o.url.includes('sl=fr'))throw Error('source');var q=o.url.split('&q=').slice(1).map(decodeURIComponent);if(JSON.stringify(q)!==JSON.stringify(['na','la','oh']))throw Error('queries');__queue.push(()=>cb(null,{status:200,headers:{}},JSON.stringify(['在','那里','哦'])));}
var $httpClient={get:__http,post:__http};function __step(){if(!__queue.length)throw Error('stalled');__queue.shift()();}
function __verify(){if(calls!==${foreign?1:0}||!__output.body)throw Error('output');var b=__output.body,h=2166136261;for(var i=0;i<b.length;i++){h=Math.imul(h^b[i],16777619);if(b[i]===66&&b[i+1]===65&&b[i+2]===68&&b[i+3]===95)throw Error('official translation');}var n=(store.get('VerseLyrics.v1.cache')||'').length;if(n>64000)throw Error('cache');return {calls,bytes:b.length,hash:h>>>0,cacheCharacters:n};}
`;
 writeFileSync(new URL('./jsc-fixtures/vocal-'+(foreign?'foreign':'english')+'-600.js',import.meta.url),source);
}
