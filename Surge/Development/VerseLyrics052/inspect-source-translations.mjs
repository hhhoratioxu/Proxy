import {writeFileSync} from 'node:fs';
const query=o=>new URLSearchParams(o),results=[];
async function get(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(8000)});const b=await r.text();if(b.length>98304)throw Error('oversize '+b.length);return {status:r.status,bytes:Buffer.byteLength(b),data:JSON.parse(b)};}
for(const title of ['Shape of You Ed Sheeran','Blinding Lights The Weeknd','Counting Stars OneRepublic']){
 try{const search=await get('https://c.y.qq.com/soso/fcgi-bin/client_search_cp?'+query({w:title,format:'json',n:5,p:1,t:0}),{headers:{Referer:'https://y.qq.com/'}});const song=search.data.data?.song?.list?.[0];if(!song)throw Error('search '+search.data.code);
 const reply=await get('https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?'+query({songmid:song.songmid,format:'json',nobase64:1,g_tk:5381}),{headers:{Referer:'https://y.qq.com/'}}),d=reply.data;
 results.push({provider:'qq',query:title,id:song.songmid,title:song.songname,artists:song.singer?.map(x=>x.name),duration:song.interval,album:song.albumname,status:reply.status,code:d.retcode??d.code,responseBytes:reply.bytes,keys:Object.keys(d),lyricCharacters:d.lyric?.length||0,translationCharacters:d.trans?.length||0,lyricTimestampTags:(d.lyric?.match(/\[\d+:\d+/g)||[]).length,translationTimestampTags:(d.trans?.match(/\[\d+:\d+/g)||[]).length});
 }catch(e){results.push({provider:'qq',query:title,error:e.message});}
}
try{const search=await get('https://music.163.com/api/cloudsearch/pc',{method:'POST',headers:{Referer:'https://music.163.com/','Content-Type':'application/x-www-form-urlencoded'},body:query({s:'Shape of You Ed Sheeran',type:1,limit:5,offset:0})});const song=search.data.result?.songs?.[0];if(!song)throw Error('search '+search.data.code);
 const reply=await get('https://music.163.com/api/song/lyric?'+query({id:song.id,lv:-1,kv:-1,tv:-1}),{headers:{Referer:'https://music.163.com/'}}),d=reply.data;
 results.push({provider:'netease',id:song.id,title:song.name,artists:song.ar?.map(a=>a.name),duration:song.dt/1000,album:song.al?.name,status:reply.status,code:d.code,responseBytes:reply.bytes,keys:Object.keys(d),lyricCharacters:d.lrc?.lyric?.length||0,translationCharacters:d.tlyric?.lyric?.length||0});
}catch(e){results.push({provider:'netease',error:e.message});}
const report={at:new Date().toISOString(),scope:'Observed public provider response schemas, no credentials, lyric text or translation text retained. First search result is inspected only for schema, not accepted as a Spotify match.',results};writeFileSync('source-schema-observations.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
