import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {encodeDocument,stringField,dataField,join,numberField,base62Hex} from './core/spotify-lyrics.js';
const directory=new URL('./jsc-fixtures/',import.meta.url);mkdirSync(directory,{recursive:true});
const id='0000000000000000000001',meta={id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:300};
const colors={background:-10985626,text:-16777216,highlightText:-1};
const word=i=>'Original paper lantern '+i+'.',translation=i=>'第'+i+'句译文';
const stamp=i=>'['+String(Math.floor((i*2+1)/60)).padStart(2,'0')+':'+String((i*2+1)%60).padStart(2,'0')+']';
const cases=[];
for(const type of ['official','lrclib','netease','netease-half'])for(const count of [24,48,120])for(const format of ['json','protobuf']){
 const original={lyrics:{syncType:'LINE_SYNCED',language:'en',provider:'original',providerDisplayName:'Original',lines:Array.from({length:count},(_,i)=>({startTimeMs:String(i*2000+1000),words:word(i),endTimeMs:'0',syllables:[]})),alternatives:[]},colors};
 const body=type==='official'?[...encodeDocument(original,format)]:[109,105,115,115,105,110,103];
 const context={name:`${type}-${count}-${format}`,type,count,format,body,url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id};
 const responses={
 embed:'<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{state:{data:{entity:{...meta,type:'track',uri:'spotify:track:'+id,duration:300000,artists:meta.artists.map(name=>({name})),visualIdentity:{backgroundBase:{alpha:255,red:77,green:84,blue:92}}}}}}}})+'</script>',
 lrclib:JSON.stringify({trackName:meta.title,artistName:meta.artists[0],albumName:meta.album,duration:300,syncedLyrics:Array.from({length:count},(_,i)=>stamp(i)+word(i)).join('\n')}),
 search:JSON.stringify({code:200,result:{songs:[{id:9,name:meta.title,ar:[{name:meta.artists[0]}],al:{name:meta.album},dt:300000,extra:'x'.repeat(45000)}]}}),
 lyric:JSON.stringify({code:200,lrc:{lyric:Array.from({length:count},(_,i)=>stamp(i)+word(i)).join('\n')},tlyric:{lyric:Array.from({length:count},(_,i)=>type==='netease-half'&&i%2?'':stamp(i)+translation(i)).filter(Boolean).join('\n')}})
 };
 cases.push({...context,bytes:body.length,hook:'SpotifyLyrics.js'});
 writeFileSync(new URL(context.name+'.js',directory),`var input=${JSON.stringify(context)},responses=${JSON.stringify(responses)};\n`+`
function __hash(b){var h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return h>>>0;}
var __done=false,__queue=[],__output,store=new Map(),calls=0;
var $argument={TRANSLATION_ENABLED:true,TARGET_LANGUAGE:'zh-CN',FALLBACK_PROVIDER:input.type.startsWith('netease')?'netease':'lrclib',SOURCE_TRANSLATIONS:true};
var $request={url:input.url,headers:{Accept:input.format==='json'?'application/json':'application/x-protobuf'}};
var $response={status:input.type==='official'?200:404,headers:{'Content-Type':$request.headers.Accept},body:new Uint8Array(input.body)};
var $persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};
var $done=r=>{if(__queue.length)throw Error('early done');__done=true;__output=r;};
function __http(o,cb){calls++;var u=o.url;__queue.push(()=>{var b=u.includes('/embed/')?responses.embed:u.includes('/cloudsearch/')?responses.search:u.includes('/api/song/lyric')?responses.lyric:u.includes('lrclib.net')?responses.lrclib:JSON.stringify(u.split('&q=').slice(1).map(q=>'第'+decodeURIComponent(q).match(/(\\d+)/)[1]+'句译文'));cb(null,{status:200,headers:{}},b);});}
var $httpClient={get:__http,post:__http};
function __step(){if(!__queue.length)throw Error('stalled');__queue.shift()();}
function __verify(){if(!__output.body)throw Error('missing replacement');return {calls,bytes:__output.body.length,hash:__hash(__output.body),cacheCharacters:(store.get('VerseLyrics.v1.cache')||'').length};}
`);
}
// All entry responses are under the existing 128 KiB input cap. Unknown data
// represents ordinary unrelated player/device/context fields, not lyric data.
for(const count of [1,50,200])for(const connect of [false,true]){
 const tracks=Array.from({length:count},(_,i)=>({uri:'spotify:track:'+String(i+1).padStart(22,'0'),metadata:{has_lyrics:'false',artist:'unchanged'},unknown:{items:Array.from({length:8},(_,j)=>({id:j,name:'private-unrelated-field'}))}}));
 const body=JSON.stringify(connect?{player_state:{track:tracks[0],next_tracks:tracks.slice(1),position:1234},devices:{extra:Array.from({length:100},(_,i)=>({name:'device-'+i,ids:[1,2,3,4]}))}}:{uri:'spotify:playlist:'+id,pages:[{tracks}],unknown:18446744073709551615});
 const name=`entry-${connect?'connect':'context'}-${count}`;cases.push({name,count,connect,bytes:Buffer.byteLength(body),hook:'SpotifyLyrics.Entry.js'});
 writeFileSync(new URL(name+'.js',directory),`function __hash(b){var h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return h>>>0;}var input=${JSON.stringify(body)},__done=false,__output;var $argument={};var $request={url:'https://spclient.wg.spotify.com/${connect?'connect-state/v1/devices/':'context-resolve/v1/spotify:playlist:'}'+${JSON.stringify(id)},headers:{}};var $response={status:200,headers:{'Content-Type':'application/json'},body:input};var $persistentStore={read:()=>null,write:()=>true};var $done=r=>{__done=true;__output=r};function __step(){throw Error('unexpected async wait')}function __verify(){if(!__output.body)throw Error('missing entry');return {calls:0,bytes:__output.body.length,hash:__hash(__output.body)}};`);
}
for(const count of [1,50,200])for(const connect of [false,true]){
 const tracks=Array.from({length:count},(_,i)=>join([stringField(1,'spotify:track:'+String(i+1).padStart(22,'0')),...Array.from({length:12},(_,j)=>dataField(connect?3:4,join([stringField(1,j?'opaque'+j:'has_lyrics'),stringField(2,j?'unchanged field':'false')]))),stringField(99,'unrelated')]));
 const body=connect?dataField(3,join(tracks.map((t,i)=>dataField(i?20:7,t)))):join([stringField(1,'spotify:playlist:'+id),dataField(5,join(tracks.map(t=>dataField(4,t))))]);
 const name=`wire-${connect?'connect':'context'}-${count}`;cases.push({name,count,connect,bytes:body.length,hook:'SpotifyLyrics.Entry.js'});
 writeFileSync(new URL(name+'.js',directory),`function __hash(b){var h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return h>>>0;}var __done=false,__output;var $argument={};var $request={url:'https://spclient.wg.spotify.com/${connect?'connect-state/v1/devices/':'context-resolve/v1/spotify:playlist:'}'+${JSON.stringify(id)},headers:{}};var $response={status:200,headers:{'Content-Type':'application/x-protobuf'},body:new Uint8Array(${JSON.stringify([...body])})};var $persistentStore={read:()=>null,write:()=>true};var $done=r=>{__done=true;__output=r};function __step(){throw Error('unexpected async wait')}function __verify(){if(!__output.body)throw Error('missing entry');return {calls:0,bytes:__output.body.length,hash:__hash(__output.body)}};`);
}
// Whole cold lyric loads through the authenticated metadata decoder.
for (const extra of [0,100,1000]) {
 const hex=base62Hex(id),bytes=join([dataField(1,Buffer.from(hex,'hex')),stringField(2,meta.title),dataField(3,stringField(2,meta.album)),dataField(4,stringField(2,meta.artists[0])),numberField(7,600000),numberField(18,0),...Array.from({length:extra},(_,i)=>stringField(100+i%5,'opaque '+i+' '.repeat(80)))]);
 const name='metadata-'+extra,source=readFileSync(new URL('lrclib-48-protobuf.js',directory),'utf8').replace("var $response=", "$request.headers.Authorization='Bearer fixture-only';var $response=").replace("var b=u.includes('/embed/')?", "if(u.includes('/metadata/4/track/')){cb(null,{status:200,headers:{}},new Uint8Array("+JSON.stringify([...bytes])+"));return;}var b=u.includes('/embed/')?");
 writeFileSync(new URL(name+'.js',directory),source);cases.push({name,bytes:bytes.length,hook:'SpotifyLyrics.js'});
}
writeFileSync(new URL('manifest.json',directory),JSON.stringify(cases.map(({body,...rest})=>rest),null,2)+'\n');
