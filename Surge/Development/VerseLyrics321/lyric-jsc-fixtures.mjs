import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {fixture,host,words,answers} from './lyric-startup-fixture.mjs';
const root=fileURLToPath(new URL('.',import.meta.url)),dir=new URL('./jsc-lyric-fixtures/',import.meta.url);mkdirSync(dir,{recursive:true});
const hash=b=>{let h=2166136261;for(const x of b)h=Math.imul(h^x,16777619);return h>>>0;};
for(const mode of ['english-cached','english-cold','missing-cached','missing-cold'])for(const filled of [false,true]){
 const f=fixture(mode,'protobuf',filled),input={mode,type:f.type,status:f.status,body:[...f.body],store:[...f.store],answers,words};
 const x=host(root,'Loon',f);x.invoke();await x.drain();input.expected=hash(x.outputs[0]);input.calls=x.calls;
 const lrc=words.map((w,i)=>{const t=i*2100+1000;return '['+String(Math.floor(t/60000)).padStart(2,'0')+':'+(t%60000/1000).toFixed(2).padStart(5,'0')+']'+w;}).join('\n');
 input.source={trackName:'Paper Lantern',artistName:'Ada North',albumName:'Quiet Walk',duration:180,syncedLyrics:lrc};
 const harness=`
var __done=false,__hostReturned=false,__synchronous=false,__output,completions=0,calls=0,active=0,jobs=[],store=new Map(input.store);
function __hash(b){var h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return h>>>0;}
var $argument={FALLBACK_PROVIDER:'lrclib',FETCH_ARTWORK_COLOR:false},$request={url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001',headers:{Accept:input.type}},$response={status:input.status,headers:{'Content-Type':input.type},body:new Uint8Array(input.body)};
var $persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};
var $httpClient={get:(o,cb)=>{calls++;active++;if(active!==1)throw Error('parallel HTTP');jobs.push(()=>{active--;cb(null,{status:200,headers:{}},JSON.stringify(o.url.includes('lrclib.net')?input.source:input.answers));});}};
var $done=r=>{if(++completions!==1||active)throw Error('premature/duplicate done');__synchronous=!__hostReturned;__output=r;__done=true;};
function __step(){if(jobs.length)jobs.shift()();}
function __verify(){var h=__hash(__output.body||$response.body);if(h!==input.expected||calls!==input.calls)throw Error('changed bytes or HTTP count');var raw=store.get('VerseLyrics.v1.cache')||'';if(raw.length>64000)throw Error('cache cap');return{hash:h,bytes:(__output.body||$response.body).length,synchronous:__synchronous,completions,calls,cacheCharacters:raw.length};}
`;
 writeFileSync(new URL(mode+(filled?'-filled':'-empty')+'.js',dir),'var input='+JSON.stringify(input)+';\n'+harness);
}
