// Add cache reuse and metadata-batch cases to the cold JSC matrix.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,dataField,stringField,numberField,base62Hex} from './core/spotify-lyrics.js';
const dir=new URL('./jsc-fixtures/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir),'utf8'));
for(const count of [48,120])for(const official of [true,false]){
 const name=(official?'official':'fallback-disabled')+'-'+count+'-current-cache',template=(official?'official':'lrclib')+'-'+count+'-protobuf';
 let source=readFileSync(new URL(template+'.js',dir),'utf8');
 const seed=[
 "var entries=[],expires=Date.now()+60000,cacheKey='VerseLyrics.v1.cache',track='0000000000000000000001';",
 "function add(key,value){entries.push({key,value,expires});}",
 "add('lyrics:lrclib:'+track,{v:1,p:'lrclib',t:true,l:Array.from({length:"+(official?600:count)+"},(_,i)=>[i*2000+1000,'Original paper lantern '+i+'.'])});",
 "add('translations:v1:ja:'+track,{pairs:Array.from({length:400},(_,i)=>['Original paper lantern '+i+'.','日本語 '+i])});",
 "add('translations:v1:zh-CN:'+track,{pairs:Array.from({length:"+count+"},(_,i)=>['Original paper lantern '+i+'.','第'+i+'句译文'])});",
 "add('meta:'+track,{id:track,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:300});",
 "add('palette:v1:'+track,{colors:{background:-10985626,text:-16777216,highlightText:-1}});",
 "var parts=entries.map(e=>JSON.stringify(e));if(parts.some(s=>s.length>31990))throw Error('oversized fixture record');",
 "var raw='{\"sizes\":'+JSON.stringify(parts.map(s=>s.length))+',\"entries\":['+parts.join(',')+'],\"cooldowns\":{}}';",
 "if(raw.length>64000)throw Error('fixture exceeds cache cap');store.set(cacheKey,raw);entries=null;parts=null;raw=null;",
 "var decodedRecordCharacters=0,originalParse=JSON.parse;",
 "JSON.parse=function(value){if(typeof value==='string'&&value.startsWith('{\"key\":'))decodedRecordCharacters+=value.length;return originalParse(value);};"
 ].join('\n');
 source=source.replace('var $argument=',seed+'\nvar $argument=').replace('cacheCharacters:(store.get','decodedRecordCharacters,cacheCharacters:(store.get');
 if(!official)source=source.replace("var $response=","$argument.TRANSLATION_ENABLED=false;var $response=");
 source=source.replace('function __http(o,cb){','function __http(o,cb){throw Error("unexpected cache miss");');
 writeFileSync(new URL(name+'.js',dir),source);manifest.push({name,bytes:0,hook:'SpotifyLyrics.js',cacheReuse:true});
}
for(const count of [50,100]){
 const entities=Array.from({length:count},(_,i)=>{
  const track=String(i+1).padStart(22,'0'),hex=base62Hex(track);
  const bytes=join([dataField(1,Buffer.from(hex,'hex')),stringField(2,'Paper Lantern '+i),dataField(3,stringField(2,'Quiet Walk')),dataField(4,stringField(2,'Ada North')),numberField(7,600000),numberField(18,0)]);
  const any=join([stringField(1,'type.googleapis.com/spotify.metadata.Track'),dataField(2,bytes)]);
  return dataField(3,join([dataField(1,numberField(1,200)),stringField(2,'spotify:track:'+track),dataField(3,any)]));
 });
 const body=dataField(2,join([numberField(2,10),...entities])),name='metadata-batch-'+count;
 const source="var store=new Map(),__done=false,__output;var $argument={};var $request={url:'https://spclient.wg.spotify.com/extended-metadata/v0/extended-metadata',headers:{}};var $response={status:200,headers:{'Content-Type':'application/x-protobuf'},body:new Uint8Array("+JSON.stringify([...body])+")};var $persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true}};var $done=r=>{__done=true;__output=r};function __step(){throw Error('unexpected wait')}function __verify(){if(!__output.body)throw Error('missing metadata');var b=__output.body,h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);var cache=JSON.parse(store.get('VerseLyrics.v1.cache'));if(cache.entries.length!=="+Math.min(128,count*2)+")throw Error('metadata lost');return {hash:h>>>0,bytes:b.length,calls:0,cacheRecords:cache.entries.length};}";
 writeFileSync(new URL(name+'.js',dir),source);manifest.push({name,bytes:body.length,hook:'SpotifyLyrics.Entry.js'});
}
writeFileSync(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');
