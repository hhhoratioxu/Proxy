import {writeFileSync,mkdirSync} from 'node:fs';
import {startupFixture} from './startup-fixtures.mjs';
import entry from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics-entry.js';
const dir=new URL('./jsc-startup-fixtures/',import.meta.url);mkdirSync(dir,{recursive:true});
const hash=b=>{let h=2166136261;for(const x of b)h=Math.imul(h^x,16777619);return h>>>0;};
const cases=[['metadata',12288],['extended',92160],['bootstrap',40960],['context-json',92160]];
for(const[kind,padding]of cases){
 const f=startupFixture(kind,padding),store=new Map(),result=await entry({env:{},request:{url:f.url,headers:new Headers()},response:new Response(f.body,{headers:{'Content-Type':f.type}}),storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v),getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))}});
 if(!result.body)throw Error('Fixture failed '+kind);
 const config={kind,url:f.url,type:f.type,body:[...f.body],expected:hash(result.body)};
 const harness=[
 'var __done=false,__hostReturned=false,__output,__synchronous=false,completions=0,store=new Map();',
 'function __hash(b){var h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return h>>>0;}',
 'var $argument={},$request={url:input.url,headers:{}},$response={status:200,headers:{"Content-Type":input.type},body:new Uint8Array(input.body)};',
 'var $persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};',
 'var $done=r=>{if(++completions!==1)throw Error("duplicate");__synchronous=!__hostReturned;__output=r;__done=true;};',
 'function __step(){throw Error("No entry transport or timer may be pending");}',
 'function __verify(){var h=__hash(__output.body||$response.body);if(h!==input.expected)throw Error("changed output");var raw=store.get("VerseLyrics.v1.cache")||"";if(raw.length>64000)throw Error("cache cap");return{hash:h,bytes:(__output.body||$response.body).length,synchronous:__synchronous,completions,cacheCharacters:raw.length};}'
 ].join('\n');
 writeFileSync(new URL(kind+'.js',dir),'var input='+JSON.stringify(config)+';\n'+harness);
}
console.log(JSON.stringify(cases));
