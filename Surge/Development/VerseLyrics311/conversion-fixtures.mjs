import {readFileSync,writeFileSync} from 'node:fs';
import {encodeDocument} from './core/spotify-lyrics.js';
const dir=new URL('./jsc-fixtures/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const id='0000000000000000000001',colors={background:-10985626,text:-16777216,highlightText:-1};
for(const format of ['json','protobuf'])for(const variant of ['mixed-zh','stale-cache','detected-zh']){
 const words=Array.from({length:48},(_,i)=>variant==='detected-zh'?'WJK 软件正在更新 '+i:'Hey，原創紙燈 '+i),values=words.map((s,i)=>variant==='detected-zh'?'WJK 軟體正在更新 '+i:'Hey, 原创纸灯 '+i);
 const body=encodeDocument({lyrics:{syncType:'LINE_SYNCED',provider:'Original',providerDisplayName:'Original',language:variant==='mixed-zh'?'zh':'ja',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[]},colors},format);
 let source=readFileSync(new URL('official-48-'+format+'.js',dir),'utf8'),at=source.indexOf(',responses=');
 if(at<0)throw Error('input fixture');source='var input='+JSON.stringify({name:variant,type:'official',format,count:48,body:[...body],url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id})+source.slice(at);
 source+='\nvar conversionRows='+JSON.stringify(values)+';__http=function(o,cb){calls++;var rows=o.url.split("&q=").slice(1).map(q=>decodeURIComponent(q));__queue.push(()=>cb(null,{status:200,headers:{}},JSON.stringify(rows.map(s=>[conversionRows[Number(s.match(/(\\d+)$/)[1])],'+JSON.stringify(variant==='detected-zh'?'zh-CN':'en')+']))));};$httpClient={get:__http,post:__http};\n';
 if(variant==='stale-cache')source+='store.set("VerseLyrics.v1.cache",JSON.stringify({entries:[{key:"translations:v1:zh-CN:'+id+'",value:{pairs:'+JSON.stringify(words.map((s,i)=>[s,values[i]]))+'},expires:Date.now()+600000}],cooldowns:{}}));\n';
 source+='__verify=function(){var body=__output.body||new Uint8Array(input.body),same=body.length===input.body.length;for(var i=0;same&&i<body.length;i++)if(body[i]!==input.body[i])same=false;return {calls,bytes:body.length,hash:__hash(body),sameAsOriginal:same,cacheCharacters:(store.get("VerseLyrics.v1.cache")||"").length};};\n';
 const name='conversion-'+variant+'-'+format;writeFileSync(new URL(name+'.js',dir),source);manifest.push({name,bytes:body.length,hook:'SpotifyLyrics.js',conversionPolicy:variant});
}
writeFileSync(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');
