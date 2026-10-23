import {writeFileSync,mkdirSync} from 'node:fs';
import {invoke,seedStore,colors} from './feature-host.mjs';
const dir=new URL('./jsc-artist-fixtures/',import.meta.url);mkdirSync(dir,{recursive:true});
const hash=bytes=>{let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;};
const cases=[['exact-artist-48',48,false,false],['bilingual-artist-48',48,true,false],['bilingual-artist-600',600,true,false],['bilingual-warm-48',48,true,true]];
const summaries=[];
for(const [name,count,bilingual,warm]of cases){
 const meta={id:'0000000000000000000001',title:'Paper Lantern',artists:['Hae Rin'],album:'Quiet Walk',duration:count>48?1300:300};
 const words=Array.from({length:count},(_,i)=>'Self written line '+i+'.'),translation=words.map((_,i)=>'自写译文 '+i);
 const stamp=i=>'['+String(Math.floor((i*2+1)/60)).padStart(2,'0')+':'+String((i*2+1)%60).padStart(2,'0')+']';
 const catalog=JSON.stringify({code:0,data:{song:{list:[{songmid:'TESTMID',songname:meta.title,singer:[{name:bilingual?'해린 (Hae Rin)':'Hae Rin'}],albumname:meta.album,interval:meta.duration}]}}});
 const lyric=JSON.stringify({code:0,lyric:words.map((s,i)=>stamp(i)+s).join('\n'),trans:translation.map((s,i)=>stamp(i)+s).join('\n')});
 let store=seedStore(meta);
 const out=await invoke('Loon',{format:'json',track:meta.id,provider:'qq',store,network:async u=>({body:u.includes('/soso/')?catalog:lyric})});
 const doc=JSON.parse(out.bytes);if(doc.lyrics.lines.length!==count||doc.lyrics.alternatives[0].lines.length!==count||out.calls.length!==2)throw Error('Fixture verification');
 if(!warm)store=seedStore(meta);
 const config={name,count,bilingual,warm,meta,catalog,lyric,cache:[...store],successHash:hash(out.bytes),missingHash:hash(Buffer.from('missing')),words,translation};
 const harness=[
 'var __done=false,__queue=[],__output,store=new Map(input.cache),calls=0,completions=0;',
 'function __hash(b){var h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return h>>>0;}',
 'var $argument={TRANSLATION_ENABLED:true,TARGET_LANGUAGE:"zh-CN",FALLBACK_PROVIDER:"qq"};',
 'var $request={url:"https://spclient.wg.spotify.com/color-lyrics/v2/track/"+input.meta.id,headers:{Accept:"application/json"}};',
 'var $response={status:404,headers:{"Content-Type":"application/json"},body:new Uint8Array([109,105,115,115,105,110,103])};',
 'var $persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};',
 'var $done=r=>{if(__queue.length||++completions!==1)throw Error("completion");__done=true;__output=r;};',
 'var $httpClient={get:(o,cb)=>{calls++;var b=o.url.includes("/soso/")?input.catalog:o.url.includes("/lyric/")?input.lyric:null;if(b===null)throw Error("unexpected request");__queue.push(()=>cb(null,{status:200,headers:{}},b));}};',
 'function __step(){if(!__queue.length)throw Error("stalled");__queue.shift()();}',
 'function __verify(){var body=__output.body||$response.body,hash=__hash(body);if(hash!==input.successHash&&hash!==input.missingHash)throw Error("unknown output");var raw=store.get("VerseLyrics.v1.cache")||"";if(raw.length>64000)throw Error("cache limit");return{calls,bytes:body.length,hash,rows:hash===input.successHash?input.count:0,cacheCharacters:raw.length};}'
 ].join('\n');
 writeFileSync(new URL(name+'.js',dir),'var input='+JSON.stringify(config)+';\n'+harness);
 summaries.push({name,count,bilingual,warm});
}
console.log(JSON.stringify(summaries));
