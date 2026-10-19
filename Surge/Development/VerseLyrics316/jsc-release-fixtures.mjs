import {readFileSync,writeFileSync} from 'node:fs';
import {join,dataField,stringField,numberField,base62Hex} from './core/spotify-lyrics.js';
const dir=new URL('./jsc-fixtures/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const id='0000000000000000000001',meta={id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:300};
function save(name,source,bytes){writeFileSync(new URL(name+'.js',dir),source);manifest.push({name,bytes,hook:'SpotifyLyrics.js'});}
const base=readFileSync(new URL('lrclib-48-protobuf.js',dir),'utf8');
for(const count of [10,50,100]){
 const entities=Array.from({length:count},(_,i)=>{
  const track=String(i+1).padStart(22,'0'),hex=base62Hex(track);
  const payload=join([dataField(1,Buffer.from(hex,'hex')),stringField(2,i?'Unrelated '+i:meta.title),dataField(3,stringField(2,meta.album)),dataField(4,stringField(2,meta.artists[0])),numberField(7,600000),numberField(18,0),...Array.from({length:12},(_,j)=>stringField(100+j,'opaque catalog metadata '.repeat(2)))]);
  return dataField(3,join([stringField(2,'spotify:track:'+track),dataField(3,join([stringField(1,'type.googleapis.com/spotify.metadata.Track'),dataField(2,payload)]))]));
 });
 const bytes=join([dataField(2,join([numberField(2,10),...entities]))]);
 if(bytes.length>98304)throw Error('fixture over service cap');
 save('extended-lookup-'+count,base+`\n$request.headers.Authorization='Bearer fixture-only';var __oldHTTP=__http;var extended=new Uint8Array(${JSON.stringify([...bytes])});
__http=function(o,cb){if(o.url.includes('/metadata/4/track/')){calls++;__queue.push(()=>cb(null,{status:404,headers:{}},new Uint8Array()));return;}if(o.url.includes('/extended-metadata/')){calls++;__queue.push(()=>cb(null,{status:200,headers:{}},extended));return;}__oldHTTP(o,cb);};$httpClient={get:__http,post:__http};`,bytes.length);
}
// A successful old callback has settled but its owner was retired during the
// wait. The response is intentionally irrelevant catalog text, not song lyrics.
save('retired-catalog-90000',base+`\nvar originalParse=JSON.parse,decodedCatalogCharacters=0;JSON.parse=function(s){if(typeof s==='string'&&s.startsWith('{"retiredCatalog":'))decodedCatalogCharacters+=s.length;return originalParse(s);};
store.set('VerseLyrics.v1.cache',JSON.stringify({entries:[{key:'meta:'+${JSON.stringify(id)},value:${JSON.stringify(meta)},expires:Date.now()+600000}],cooldowns:{}}));
var retiredCatalog=JSON.stringify({retiredCatalog:'x'.repeat(90000)});__http=function(o,cb){calls++;__queue.push(()=>{var key='VerseLyrics.v1.network',owners=JSON.parse(store.get(key));owners.forEach(r=>r.retired=true);store.set(key,JSON.stringify(owners));cb(null,{status:200,headers:{}},retiredCatalog);});};$httpClient={get:__http,post:__http};
__verify=function(){if(calls!==1)throw Error('stale owner started extra HTTP');return {calls,bytes:0,hash:0,decodedCatalogCharacters};};`,90021);
for(const provider of ['kugou','kuwo','lyricsovh'])for(const count of [48,120]){
 const seed=readFileSync(new URL('lrclib-'+count+'-protobuf.js',dir),'utf8');
 const stamp=i=>'['+String(Math.floor((i*2+1)/60)).padStart(2,'0')+':'+String((i*2+1)%60).padStart(2,'0')+']';
 const words=Array.from({length:count},(_,i)=>'Original paper lantern '+i+'.'),lyric=words.map((s,i)=>stamp(i)+s).join('\n');
 const extra='x'.repeat(60000);let search,result;
 if(provider==='kugou'){search={status:200,candidates:[{id:9,accesskey:'fixture-only',song:meta.title,singer:meta.artists[0],duration:300000,extra}]};result={status:200,id:9,fmt:'lrc',charset:'utf8',content:Buffer.from(lyric).toString('base64')};}
 if(provider==='kuwo'){search={abslist:[{MUSICRID:'MUSIC_9',SONGNAME:meta.title,ARTIST:meta.artists[0],ALBUM:meta.album,DURATION:'300',extra}]};result={code:200,success:true,data:{lrclist:words.map((s,i)=>({time:String(i*2+1),lineLyric:s}))}};}
 if(provider==='lyricsovh'){search={data:[{title:meta.title,artist:{name:meta.artists[0]},album:{title:meta.album},duration:300,extra}]};result={lyrics:words.join('\n')};}
 save(provider+'-catalog-'+count,seed+`\n$argument.FALLBACK_PROVIDER=${JSON.stringify(provider)};var catalog=${JSON.stringify(JSON.stringify(search))},catalogLyrics=${JSON.stringify(JSON.stringify(result))};var __oldHTTP=__http;
__http=function(o,cb){if(/lyrics\\.kugou\\.com|kuwo\\.cn|lyrics\\.ovh/.test(o.url)){calls++;__queue.push(()=>cb(null,{status:200,headers:{}},/search|suggest|r\\.s\\?/.test(o.url)?catalog:catalogLyrics));return;}__oldHTTP(o,cb);};$httpClient={get:__http,post:__http};`,Buffer.byteLength(JSON.stringify(search)));
}
writeFileSync(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({coldCases:manifest.length,newCases:10}));
