import {readFileSync,writeFileSync} from 'node:fs';
import {encodeDocument} from './core/spotify-lyrics.js';
const dir=new URL('./jsc-fixtures/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir))),colors={background:-10985626,text:-16777216,highlightText:-1};
for(const han of [false,true]){
 const name='range-'+(han?'han':'en')+'-600',words=Array.from({length:600},(_,i)=>han?'自写中文原词与繁體 🎵 '+i:'Self-written lyric words '+i);
 const doc={lyrics:{syncType:'LINE_SYNCED',provider:'Original',providerDisplayName:'Original',language:han?'zh':'en',lines:words.map((words,i)=>({words,startTimeMs:String(i*2100)})),alternatives:han?[{language:'zh-CN',lines:words.map(()=> 'OLD_OFFICIAL')}]:[]},colors},bytes=encodeDocument(doc,'protobuf');
 const source=`var __done=false,__queue=[],__output,calls=0,store=new Map();
var original=new Uint8Array(${JSON.stringify([...bytes])});
var $argument={FALLBACK_PROVIDER:'off',TARGET_LANGUAGE:'zh-CN',TRANSLATION_ENABLED:true};
var $request={url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001',headers:{Accept:'application/x-protobuf'}};
var $response={status:200,headers:{'Content-Type':'application/x-protobuf'},body:original};
var $persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};
var $done=r=>{if(__done||__queue.length)throw Error('completion');__done=true;__output=r;};
function __http(o,cb){calls++;__queue.push(()=>{var q=o.url.split('&q=').slice(1);cb(null,{status:200,headers:{}},JSON.stringify(q.map(s=>'自写译文 '+decodeURIComponent(s).match(/(\\d+)/)[1])));});}
var $httpClient={get:__http,post:__http};
function __step(){if(!__queue.length)throw Error('stalled');__queue.shift()();}
function __verify(){if(calls!==${han?0:10})throw Error('requests');var b=__output.body||original,h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);var n=(store.get('VerseLyrics.v1.cache')||'').length;if(n>64000)throw Error('cache cap');return {calls,bytes:b.length,hash:h>>>0,cacheCharacters:n};}
`;
 writeFileSync(new URL(name+'.js',dir),source);manifest.push({name,bytes:bytes.length,count:600,hook:'SpotifyLyrics.js',rangePolicy:true});
}
writeFileSync(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');
