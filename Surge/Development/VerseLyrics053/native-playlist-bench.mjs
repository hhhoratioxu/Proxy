import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const churn=process.argv.includes('--churn');
if(process.argv[2]!=='child'){
 const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 0.5.2 workspace');const results=[];
 for(const format of ['json','protobuf'])for(const [version,root,client] of [['0.5.2',baseline,'Loon'],...['Loon','Surge','Shadowrocket','QuantumultX','Egern'].map(c=>['0.5.3',fileURLToPath(new URL('.',import.meta.url)),c])]){
  const r=spawnSync(process.execPath,['--expose-gc','--max-old-space-size=32',fileURLToPath(import.meta.url),'child',root,client,version,format,...(churn?['--churn']:[])],{encoding:'utf8',timeout:60000,maxBuffer:65536});if(r.status!==0){writeFileSync(new URL('./native-playlist-failure.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),version,client,format,status:r.status,signal:r.signal,error:r.error?.message,stdout:r.stdout,stderr:r.stderr,completed:results},null,2));throw Error(client+' '+r.stderr.slice(0,1500));}results.push({version,client,format,...JSON.parse(r.stdout)});
 }
 for(const format of ['json','protobuf']){
  const same=results.filter(r=>r.format===format);
  if(new Set(same.map(x=>x.outputSHA256)).size!==1)throw Error('Output changed for '+format);
  if(same[1].scriptInvocations!==same[0].scriptInvocations)throw Error('Loon hooks changed');
 }
 const report={at:new Date().toISOString(),environment:process.version+' '+process.platform+' '+process.arch,scope:(churn?'240 different synthetic cold songs with bounded-cache eviction and 720 HTTP calls. ':'120 synthetic track changes across 12 songs. ')+ '24 original lines per song, metadata and lyric transactions on every change. Native API mocks; separate Node processes with 32 MiB old-space. Loon 0.5.3 applies the verified native header-rewrite effect without launching a request script. Explicit GC every six changes makes sampled heap reproducible; it is not an on-device peak or VPN stability test.',results};writeFileSync(new URL(churn?'./native-churn-results.json':'./native-playlist-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else{
 const root=process.argv[3],client=process.argv[4],version=process.argv[5],format=process.argv[6],m=await import(pathToFileURL(root+'/core/spotify-lyrics.js')),qx=client==='QuantumultX',store=new Map(),id=n=>String(n).padStart(22,'0'),base='https://spclient.wg.spotify.com/',scripts={},modules={},outputs=createHash('sha256'),content=createHash('sha256');let scriptInvocations=0,httpCalls=0,active=0,maxActive=0,timers=0,doneCalls=0,peak=0;
 const entity=JSON.parse(readFileSync(new URL('./core/test/fixtures/target-palette.json',import.meta.url))).entity;
 const sample=()=>{peak=Math.max(peak,process.memoryUsage().heapUsed);};
 for(const kind of ['Request','Entry','Lyrics']){
  const name=client==='Egern'?'Egern/script/SpotifyLyrics/spotify-lyrics'+(kind==='Lyrics'?'':kind==='Entry'?'-entry':'-request')+'.js':client+'/script/SpotifyLyrics'+(kind==='Lyrics'?'':'.'+kind)+'.js';
  if(client==='Egern')modules[kind]=(await import(pathToFileURL(root+'/runtime/'+name))).default;else scripts[kind]=new vm.Script(readFileSync(root+'/runtime/'+name,'utf8'));
 }
 let current=1;
 const words=n=>Array.from({length:24},(_,i)=>`Song ${n}, original lantern line ${i+1}.`);
 async function network(o){
  httpCalls++;active++;maxActive=Math.max(maxActive,active);sample();let data,type='application/json';const u=new URL(o.url),n=current;
  if(u.host==='lrclib.net')data={trackName:'Lantern '+n,artistName:'Ada North',albumName:'Quiet Walk',duration:180,syncedLyrics:words(n).map((s,i)=>{const t=i*2+1;return`[${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}.00]${s}`;}).join('\n')};
  else if(u.host==='translate.googleapis.com')data=u.searchParams.getAll('q').map(s=>'自写译文 '+s.match(/\d+/g).join('/'));
  else if(u.host==='open.spotify.com'){type='text/html';data='<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{state:{data:{entity:{...entity,id:id(n),uri:'spotify:track:'+id(n)}}}}}})+'</script>';}
  else throw Error('unexpected host '+u.host);
  await Promise.resolve();active--;return{status:200,headers:{'Content-Type':type},body:typeof data==='string'?data:JSON.stringify(data)};
 }
 async function invoke(kind,url,body,status=200,accept='application/json'){
  scriptInvocations++;const headers={Accept:accept},env={TRANSLATION_ENABLED:true,TARGET_LANGUAGE:'zh-CN',FALLBACK_PROVIDER:'lrclib',DISCOVER_MISSING:true};
  if(client==='Egern'){
   const ctx={env,request:{url,headers:new Headers(headers)},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v),getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},http:{get:async(u,o)=>{const r=await network({url:u,...o});return new Response(r.body,{status:r.status,headers:r.headers});}}};
   if(kind!=='Request')ctx.response=new Response(body,{status,headers:{'Content-Type':accept}});const r=await modules[kind](ctx);sample();return r?.body;
  }
  const input=new Uint8Array(body||[]);let resolve;const complete=new Promise(r=>resolve=r);let done=0;
  const ctx={$request:{url,method:'GET',headers},setTimeout:()=>{if(!qx)throw Error('unexpected timer');timers++;return timers;},clearTimeout(){},$done:r=>{done++;doneCalls++;sample();resolve(r);}};
  if(kind!=='Request')ctx.$response=qx?{statusCode:status,headers:{'Content-Type':accept},bodyBytes:input.buffer}:{status,headers:{'Content-Type':accept},body:input};
  if(qx){ctx.$environment={variables:env};ctx.$prefs={valueForKey:k=>store.get(k),setValueForKey:(v,k)=>{store.set(k,v);return true;}};ctx.$task={fetch:async o=>{const r=await network(o),b=new Uint8Array(Buffer.from(r.body));return{statusCode:r.status,headers:r.headers,bodyBytes:b.buffer};}};}
  else{ctx.$argument=env;ctx.$persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}};ctx.$httpClient={get:(o,cb)=>{network(o).then(r=>cb(null,r,o['binary-mode']===false?r.body:new Uint8Array(Buffer.from(r.body))),e=>cb(String(e)));}};}
  scripts[kind].runInNewContext(ctx);const r=await complete;await Promise.resolve();if(done!==1)throw Error('completion count');return qx?r.bodyBytes:r.body;
 }
 global.gc();const before=process.memoryUsage().heapUsed,start=performance.now(),rounds=[];
 const trackChanges=churn?240:120;
 for(let turn=0;turn<trackChanges;turn++){
  current=churn?turn+1:turn%12+1;const hex=m.base62Hex(id(current)),metadata=m.join([m.dataField(1,Buffer.from(hex,'hex')),m.stringField(2,'Lantern '+current),m.dataField(3,m.stringField(2,'Quiet Walk')),m.dataField(4,m.stringField(2,'Ada North')),m.numberField(7,360000),m.numberField(18,0)]),metaURL=base+'metadata/4/track/'+hex,lyricURL=base+'color-lyrics/v2/track/'+id(current);
  if(!(client==='Loon'&&['0.5.2','0.5.3'].includes(version)))await invoke('Request',metaURL);
  const metaOut=await invoke('Entry',metaURL,metadata,200,'application/x-protobuf');if(!metaOut||!m.parseMetadata(new Uint8Array(metaOut),hex).hasLyrics)throw Error('metadata entry missing');
  if(!(client==='Loon'&&['0.5.2','0.5.3'].includes(version)))await invoke('Request',lyricURL);
  const result=await invoke('Lyrics',lyricURL,Buffer.from('missing'),404,format==='json'?'application/json':'application/x-protobuf'),bytes=new Uint8Array(result),parsed=m.parseDocument(bytes,format==='json'?'application/json':'application/x-protobuf');
  const translations=format==='json'?JSON.parse(Buffer.from(bytes)).lyrics.alternatives[0].lines:(()=>{const inner=m.fields(m.fields(bytes).find(f=>f.number===1).payload),alt=m.fields(inner.find(f=>f.number===9).payload);return alt.filter(f=>f.number===2).map(f=>m.text(f.payload));})();
  if(parsed.words.length!==24||parsed.words[0]!==words(current)[0]||translations[0]!==`自写译文 ${current}/1`)throw Error('lyrics/translation lost at '+turn);
  outputs.update(bytes);content.update(JSON.stringify([parsed.words,translations]));const colors=m.existingPalette(bytes,parsed);if(colors.text!==-16777216||colors.highlightText!==-1||colors.background!==-10985626)throw Error('incorrect native color roles');const raw=store.get('VerseLyrics.v1.cache');if(raw.length>64000||JSON.parse(raw).entries.length>128)throw Error('cache overflow');
  sample();if(turn%6===5){await new Promise(setImmediate);global.gc();}if(turn%12===11)rounds.push({round:turn/12+1|0,httpCalls,cacheCharacters:raw.length});
 }
 if(active||maxActive!==1)throw Error('network overlap');if(httpCalls!==(churn?720:36))throw Error('cache missed '+httpCalls);global.gc();
 console.log(JSON.stringify({trackChanges,scriptInvocations,httpCalls,maxActiveHTTP:maxActive,scheduledTimers:timers,completionCalls:doneCalls,elapsedMs:Math.round(performance.now()-start),baselineHeapBytes:before,sampledMaxHeapBytes:peak,retainedHeapBytes:process.memoryUsage().heapUsed,outputSHA256:outputs.digest('hex'),contentSHA256:content.digest('hex'),rounds}));
}
