import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
if(process.argv[2]!=='child'){
 const baseline=process.argv[2];if(!baseline)throw Error('Pass unmodified 0.4.5 core');
 const results=[];
 for(const [version,path] of [['0.4.5',baseline],['0.4.6',fileURLToPath(new URL('./core/spotify-lyrics.js',import.meta.url))]]){
  const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',path,version],{encoding:'utf8',timeout:30000,maxBuffer:16384});if(r.status!==0)throw Error(version+' failed: '+r.stderr.slice(-1000));results.push({version,...JSON.parse(r.stdout)});
 }
 const evidence={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:'Synthetic 12-song playlist, 40 unique original lines per song, two rounds through the whole processor. Fake deterministic HTTP with no real network. Node old-space limit 32 MiB. Elapsed CPU time is not network latency or iPhone responsiveness.',results};
 writeFileSync(new URL('./playlist-results.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}else{
 const m=await import(pathToFileURL(process.argv[3])),store=new Map(),rounds=[];
 const fixture=JSON.parse(readFileSync(new URL('./core/test/fixtures/target-palette.json',import.meta.url))).entity;
 let peak=0;global.gc();const baseline=process.memoryUsage().heapUsed;
 for(let round=0;round<2;round++){
  let calls=0;const byHost={},start=performance.now();
  for(let song=1;song<=12;song++){
   const id=String(song).padStart(22,'0'),hex=m.base62Hex(id),title='Lantern Song '+song,artist='Ada North',album='Quiet Walk',duration=180;
   const words=Array.from({length:40},(_,i)=>`Song ${song} original lantern line ${i+1}.`);
   const timed=words.map((w,i)=>{const s=i*2+1;return `[${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}.00]${w}`;}).join('\n');
   async function request(u){calls++;const host=new URL(u).host;byHost[host]=(byHost[host]||0)+1;peak=Math.max(peak,process.memoryUsage().heapUsed);
    if(u.includes('/metadata/4/track/'))return new Response(m.join([m.dataField(1,Buffer.from(hex,'hex')),m.stringField(2,title),m.dataField(3,m.stringField(2,album)),m.dataField(4,m.stringField(2,artist)),m.numberField(7,duration*2000),m.numberField(18,0)]));
    if(host==='lrclib.net')return new Response(JSON.stringify({trackName:title,artistName:artist,albumName:album,duration,syncedLyrics:timed}));
    if(host==='translate.googleapis.com')return new Response(JSON.stringify(new URL(u).searchParams.getAll('q').map(s=>'自写译文 '+s.match(/\d+/g).join('/'))));
    if(host==='open.spotify.com')return new Response('<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{state:{data:{entity:{...fixture,id,uri:'spotify:track:'+id}}}}}})+'</script>');
    throw Error('unexpected host');
   }
   const ctx={env:{TRANSLATION_ENABLED:true,FALLBACK_PROVIDER:'lrclib'},request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:new Headers({Accept:'application/json',Authorization:'Bearer TEST_ONLY_TOKEN'})},response:new Response('missing',{status:404}),storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:request,post:request}};
   const out=await m.default(ctx);if(out?.status!==200)throw Error('missing response');const value=JSON.parse(Buffer.from(out.body));if(value.lyrics.lines.length!==40||value.lyrics.lines[0].words!==words[0]||value.lyrics.alternatives[0].lines[0]!==`自写译文 ${song}/1`)throw Error('native output mismatch');peak=Math.max(peak,process.memoryUsage().heapUsed);
  }
  const raw=store.get('VerseLyrics.v1.cache'),cache=JSON.parse(raw),current=process.argv[4]==='0.4.6';if(raw.length>(current?64000:96000)||cache.entries.length>(current?128:192))throw Error('cache bound');
  rounds.push({round:round+1,httpCalls:calls,byHost,elapsedMs:Math.round(performance.now()-start),cacheCharacters:raw.length,cacheEntries:cache.entries.length,lyricEntries:cache.entries.filter(e=>e.key.startsWith('lyrics:')).length,translationEntries:cache.entries.filter(e=>e.key.startsWith('translation')).length});
 }
 console.log(JSON.stringify({rounds,baselineHeapBytes:baseline,sampledMaxHeapBytes:peak,maxRSSKiB:process.resourceUsage().maxRSS}));
}
