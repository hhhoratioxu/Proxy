import {readFileSync,writeFileSync} from 'node:fs';
import {encodeDocument} from './core/spotify-lyrics.js';
const dir=new URL('./jsc-fixtures/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const id='0000000000000000000001',colors={background:-10985626,text:-16777216,highlightText:-1},meta={id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:300};
const word=i=>'Original paper lantern '+i+'.';
for(const format of ['json','protobuf'])for(const variant of ['static-cold','static-cached','chinese-conversion']){
 const chinese=variant==='chinese-conversion',count=48,words=Array.from({length:count},(_,i)=>chinese?'原創的紙燈歌詞 '+i:word(i));
 const body=encodeDocument({lyrics:{syncType:chinese?'LINE_SYNCED':'UNSYNCED',provider:'original',providerDisplayName:'Original',language:chinese?'zh':'en',lines:words.map((words,i)=>({words,startTimeMs:chinese?String(i*2000+1000):'0'})),alternatives:[]},colors},format);
 let source=readFileSync(new URL('official-48-'+format+'.js',dir),'utf8');
 const at=source.indexOf(',responses=');if(at<0)throw Error('fixture input');
 source='var input='+JSON.stringify({name:variant,type:'official',format,count,body:[...body],url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id})+source.slice(at);
 const entries=[{key:'meta:'+id,value:meta},{key:'palette:v1:'+id,value:{colors}}];
 if(variant==='static-cached')entries.push({key:'lyrics:netease:'+id,value:{v:1,p:'netease',t:true,l:words.map((w,i)=>[i*2000+1000,w])}},{key:'translations:v1:zh-CN:'+id,value:{pairs:words.map((s,i)=>[s,'第'+i+'句译文'])}});
 source+='\n$argument.FALLBACK_PROVIDER="netease";var seeds='+JSON.stringify(entries)+';seeds.forEach(e=>e.expires=Date.now()+600000);store.set("VerseLyrics.v1.cache",JSON.stringify({entries:seeds,cooldowns:{}}));seeds=null;\n';
 if(chinese)source+='\n__verify=function(){var body=__output.body||new Uint8Array(input.body);return {calls,bytes:body.length,hash:__hash(body),cacheCharacters:(store.get("VerseLyrics.v1.cache")||"").length};};\n';
 const name='policy-'+variant+'-'+format;writeFileSync(new URL(name+'.js',dir),source);manifest.push({name,bytes:body.length,hook:'SpotifyLyrics.js',policy:variant});
}
writeFileSync(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');
