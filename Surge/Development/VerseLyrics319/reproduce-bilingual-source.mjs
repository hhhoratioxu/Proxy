import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const baseline=await import(pathToFileURL(process.argv[2]+'/core/spotify-lyrics.js')),candidate=await import('./core/spotify-lyrics.js');
const folder=process.argv[3],raw=readFileSync(folder+'/qq.txt','utf8'),lyrics=readFileSync(folder+'/qq-lyrics.txt','utf8'),entity=JSON.parse(readFileSync(folder+'/metadata.json','utf8'));
const meta={id:entity.id,title:entity.title,artists:entity.artists.map(x=>x.name),album:'',duration:entity.duration/1000};
const candidateMetadata=JSON.parse(raw).data.song.list.map(s=>({title:s.songname,artists:s.singer.map(a=>a.name),album:s.albumname,duration:s.interval}));
const result={at:new Date().toISOString(),scope:'Real public Spotify metadata and QQ catalog/lyric response replayed through both shared cores. No protected Spotify lyric response or phone capture; raw song lyric text is not published.',meta,candidates:candidateMetadata,versions:[]};
for(const [version,core] of [['3.1.8',baseline],['3.1.9',candidate]]){
 const calls=[],store=new Map(),ctx={env:{},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{calls.push(u);return new Response(u.includes('/soso/')?raw:lyrics);}}};
 const state={settings:core.settings({FALLBACK_PROVIDER:'qq'}),cache:core.loadCache(ctx),deadline:Date.now()+10000};
 const doc=await core.sourceLyrics(ctx,'qq',meta,state),lines=doc?.lyrics?.lines||[];
 result.versions.push({version,matched:!!doc,calls:calls.length,syncType:doc?.lyrics?.syncType||null,lines:lines.length,nonempty:lines.filter(l=>l.words.trim()).length,firstMs:lines[0]?.startTimeMs,lastMs:lines.at(-1)?.startTimeMs,contentSha256:doc?createHash('sha256').update(JSON.stringify(lines)).digest('hex'):null});
}
if(result.versions[0].matched||!result.versions[1].matched||result.versions[1].syncType!=='LINE_SYNCED')throw Error('Expected concrete repair not reproduced');
writeFileSync(new URL('target-track-reproduction.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
