import {writeFileSync,mkdirSync} from 'node:fs';
import {encodeDocument} from './core/spotify-lyrics.js';
const dir=new URL('./jsc-recovery-fixtures/',import.meta.url);mkdirSync(dir,{recursive:true});
const colors={background:-10985626,text:-16777216,highlightText:-1},id='6n7jFn3rgC6qWjsYaPJfB8';
const hash=bytes=>{let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;};
const cases=[['korean-cold-48',48,'valid',false],['korean-stale-48',48,'valid',true],['korean-partial-600',600,'partial',false],['korean-identity-600',600,'identity',false]];
for(const [name,count,mode,stale] of cases){
 const words=Array.from({length:count},(_,i)=>(i%3===0?'오늘도 조용한 거리를 걸어요 ':i%3===1?'Please stay beside the quiet river ':'오늘은 한국어와 English words를 씁니다 ')+(count===600?i%12:i));
 const unique=[...new Set(words)],replies=Object.fromEntries(unique.map((s,i)=>[s,mode==='identity'?s:mode==='partial'&&i%12===1?null:'自写译文 '+i]));
 const translations=words.map(s=>{const t=replies[s];return typeof t==='string'&&t!==s?t:'';});
 const doc={lyrics:{syncType:'LINE_SYNCED',language:'ko',provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[{language:'zh-CN',lines:words.map(()=> 'OLD_OFFICIAL')}]},colors};
 const body=encodeDocument(doc,'protobuf'),expected=encodeDocument({...doc,lyrics:{...doc.lyrics,alternatives:translations.some(Boolean)?[{language:'zh-CN',lines:translations}]:[]}},'protobuf'),zero=encodeDocument({...doc,lyrics:{...doc.lyrics,alternatives:[]}},'protobuf');
 const config={name,body:[...body],words:unique,replies,stale,successHash:hash(expected),emptyHash:hash(zero),translatedRows:translations.filter(Boolean).length,id};
 const setup='var input='+JSON.stringify(config)+';\n';
 const harness=[
 'var __done=false,__queue=[],__output,store=new Map(),calls=0;',
 'function __hash(b){var h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return h>>>0;}',
 'if(input.stale)store.set("VerseLyrics.v1.cache",JSON.stringify({entries:[{key:"translations:v1:zh-CN:"+input.id,value:{pairs:input.words.map(s=>[s,s])},expires:Date.now()+60000}],cooldowns:{}}));',
 'var $argument={TRANSLATION_ENABLED:true,TARGET_LANGUAGE:"zh-CN",FALLBACK_PROVIDER:"off"};',
 'var $request={url:"https://spclient.wg.spotify.com/color-lyrics/v2/track/"+input.id,headers:{Accept:"application/x-protobuf"}};',
 'var $response={status:200,headers:{"Content-Type":"application/x-protobuf"},body:new Uint8Array(input.body)};',
 'var $persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};',
 'var $done=r=>{if(__queue.length)throw Error("early completion");__done=true;__output=r;};',
 'var $httpClient={get:(o,cb)=>{calls++;var q=o.url.split("&q=").slice(1).map(decodeURIComponent);if(!q.length)throw Error("unexpected request");var b=JSON.stringify(q.map(s=>input.replies[s]));__queue.push(()=>cb(null,{status:200,headers:{}},b));}};',
 'function __step(){if(!__queue.length)throw Error("stalled");__queue.shift()();}',
 'function __verify(){if(!__output.body)throw Error("missing rewrite");var hash=__hash(__output.body);if(hash!==input.successHash&&hash!==input.emptyHash)throw Error("unknown output hash");var raw=store.get("VerseLyrics.v1.cache")||"";if(raw.length>64000)throw Error("cache limit");return {calls,bytes:__output.body.length,hash,translatedRows:hash===input.successHash?input.translatedRows:0,cacheCharacters:raw.length};}'
 ].join('\n');
 writeFileSync(new URL(name+'.js',dir),setup+harness);
}
console.log(JSON.stringify(cases.map(([name,count,mode,stale])=>({name,count,mode,stale}))));

