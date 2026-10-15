import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import diagnose, {parseDocument, diagnosticError} from '../spotify-lyrics-diagnostics-3.js';
import original from '../../SpotifyLyrics/spotify-lyrics.js';
const fixtures = new URL('../../SpotifyLyrics/test/fixtures/', import.meta.url);
const song = JSON.parse(readFileSync(new URL('target-song.json', fixtures), 'utf8'));
const scroll = JSON.parse(readFileSync(new URL('target-scroll.json', fixtures), 'utf8'));
const card = Buffer.from(scroll.structure_field_base64, 'base64');
const cardURL = scroll.endpoint;
const lyricURL = 'https://spclient.wg.spotify.com/color-lyrics/v2/track/' + song.track_id;
const metadataURL = 'https://spclient.wg.spotify.com/metadata/4/track/' + song.track_hex;
function context({url=cardURL, body=card, type='application/x-protobuf', status=200, env={}, store=new Map(), notify, network=async()=>{throw Error('unexpected HTTP');}, requestHeaders={}, responseHeaders={}}={}) {
  const notifications=[], calls=[];
  const ctx={env:{TRANSLATION_ENABLED:'false',...env},app:{version:'2.20.0'},
    request:{url,headers:new Headers({'spotify-app-version':'9.1.92.3058',...requestHeaders})},
    response:new Response(body,{status,headers:{'Content-Type':type,...responseHeaders}}),
    storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},
    http:{get:async(u,o)=>{calls.push(u);return network(u,o);},post:async(u,o)=>{calls.push(u);return network(u,o);}},
    notify:notify||((item)=>notifications.push(item))};
  return {ctx,store,notifications,calls};
}
const copied=x=>x.notifications.map(n=>n.action.text).join('\n');
const noSecrets=(value)=>assert.doesNotMatch(JSON.stringify(value),/PRIVATE_AUTH|PRIVATE_COOKIE|PRIVATE_CLIENT|PRIVATE_QUERY|PRIVATE_PAYLOAD|PRIVATE_ACCOUNT|PRIVATE_TRANSLATION|PRIVATE_ROW|PRIVATE_STALE/);
test('a real public scroll sample sends a copyable notification and preserves the ordinary card output',async()=>{
  const x=context(),r=await diagnose(x.ctx),baseline=await original(context().ctx);
  assert.deepEqual(Buffer.from(r.body),Buffer.from(baseline.body));assert.equal(x.calls.length,0);
  assert.equal(x.notifications.length,1);const n=x.notifications[0];assert.equal(n.action.type,'clipboard');assert.equal(n.sound,false);
  assert.match(n.title,/player-cards/);assert.match(copied(x),/0\.3\.3-diag\.3/);assert.match(copied(x),/Egern 2\.20\.0/);assert.match(copied(x),/Spotify 9\.1\.92\.3058/);assert.ok(copied(x).includes(song.track_id));
  assert.ok(n.body.startsWith('0.3.3-diag.3 · '));assert.ok(n.subtitle.startsWith('0.3.3-diag.3'));
});
test('metadata and actual lyric 404 produce direct current-invocation records and timed fallback rows',async()=>{
  const store=new Map(),meta=context({store,url:metadataURL,body:Buffer.from(song.metadata_base64,'base64')});await diagnose(meta.ctx);assert.match(copied(meta),/metadata/);assert.equal(meta.calls.length,0);
  const x=context({store,url:lyricURL,status:404,body:'missing',network:async()=>{
    assert.ok(x.notifications.some(n=>n.body.includes('已收到实际歌词请求')));
    return new Response(JSON.stringify([{trackName:song.expected.title,albumName:song.expected.album,artistName:song.qq_candidate.artists.join(', '),duration:song.qq_candidate.duration,
      syncedLyrics:'[00:01.00]Self written diagnostic line\n[00:03.00]Another original diagnostic line'}]));
  }});
  const r=await diagnose(x.ctx);assert.equal(r.status,200);assert.equal(parseDocument(r.body,'application/x-protobuf').words.length,2);
  assert.equal(x.notifications.length,2);assert.match(copied(x),/404 → 200/);assert.match(copied(x),/2 行/);assert.match(copied(x),/LRCLIB/);assert.doesNotMatch(copied(x),/Self written diagnostic line/);
});
test('official translations are replaced by plugin output and none of the lyric text is copied to notifications',async()=>{
  const body=JSON.stringify({lyrics:{lines:[{startTimeMs:'1',words:'PRIVATE_ROW'}],alternatives:[{language:'zh',lines:['PRIVATE_TRANSLATION']}]}});
  const x=context({url:lyricURL,body,type:'application/json',env:{TRANSLATION_ENABLED:'true'},network:async()=>new Response(JSON.stringify([['插件译文','en']]))});
  const r=await diagnose(x.ctx),doc=JSON.parse(Buffer.from(r.body).toString());assert.deepEqual(doc.lyrics.alternatives,[{language:'zh-CN',lines:['插件译文']}]);noSecrets(x.notifications);
});
test('no credentials or identity leaves a real missing response intact and explains the metadata failure',async()=>{
  const x=context({url:lyricURL,status:404,body:'missing'}),r=await diagnose(x.ctx);
  assert.equal(r.status,undefined);assert.equal(Buffer.from(r.body).toString(),'missing');assert.equal(x.calls.length,0);assert.match(copied(x),/未取得可核对的歌曲信息/);assert.match(copied(x),/请求鉴权 无/);assert.match(copied(x),/歌曲信息缓存 无/);
});
test('metadata HTTP failures are reported without copying credentials or retrying a forbidden endpoint',async()=>{
  const x=context({url:lyricURL,status:404,body:'missing',requestHeaders:{Authorization:'Bearer PRIVATE_AUTH',Cookie:'PRIVATE_COOKIE'},network:async()=>new Response('PRIVATE_PAYLOAD',{status:403})});
  const r=await diagnose(x.ctx);assert.equal(r.status,undefined);assert.equal(x.calls.length,1);assert.match(copied(x),/请求鉴权 有/);assert.match(copied(x),/Spotify 元数据 403/);noSecrets(x.notifications);noSecrets([...x.store]);
});
test('service transport failures and compressed response encodings use fixed safe labels',async()=>{
  const x=context({url:lyricURL,status:404,body:'missing',responseHeaders:{'Content-Encoding':'gzip'},requestHeaders:{Authorization:'Bearer PRIVATE_AUTH'},network:async()=>{throw Error('PRIVATE_PAYLOAD');}});
  await diagnose(x.ctx);assert.match(copied(x),/请求失败/);assert.match(copied(x),/响应编码 gzip/);noSecrets(x.notifications);
});
for(const status of [401,403,429,500])test('actual lyric HTTP '+status+' is not changed into a success by diagnostics',async()=>{
  const x=context({url:lyricURL,status,body:'upstream error'});assert.equal(await diagnose(x.ctx),undefined);assert.equal(x.ctx.response.bodyUsed,false);assert.equal(x.calls.length,0);assert.match(copied(x),new RegExp('HTTP '+status));
});
test('unknown Spotify traffic is classified without reading its body, header secrets, query or arbitrary path',async()=>{
  const x=context({url:'https://gew1-spclient.spotify.com/PRIVATE_ACCOUNT/PRIVATE_QUERY?token=PRIVATE_QUERY',body:'PRIVATE_PAYLOAD',type:'application/json',requestHeaders:{Authorization:'Bearer PRIVATE_AUTH',Cookie:'PRIVATE_COOKIE','Client-Token':'PRIVATE_CLIENT'}});
  assert.equal(await diagnose(x.ctx),undefined);assert.equal(x.ctx.response.bodyUsed,false);assert.equal(x.calls.length,0);assert.match(copied(x),/other-spotify/);noSecrets(x.notifications);noSecrets([...x.store]);
});
test('unmatched metadata versions are identified by a safe fixed family, without a full path',async()=>{
  const x=context({url:'https://spclient.wg.spotify.com/metadata/99/PRIVATE_ACCOUNT?token=PRIVATE_QUERY',body:'PRIVATE_PAYLOAD'});await diagnose(x.ctx);assert.match(copied(x),/metadata-other/);noSecrets(x.notifications);assert.equal(x.ctx.response.bodyUsed,false);
});
test('unrelated startup API families share one notification slot and leave room for the lyric entry',async()=>{
  const store=new Map(),all=[];
  for(const family of ['gander','pathfinder','social-connect','context-resolve','connect-state','player','lyrics','metadata']){
    const x=context({store,url:'https://spclient.wg.spotify.com/'+family+'/99/PRIVATE_ACCOUNT',body:'PRIVATE_PAYLOAD'});await diagnose(x.ctx);all.push(...x.notifications);assert.equal(x.ctx.response.bodyUsed,false);
  }
  assert.equal(all.length,1);const x=context({store});await diagnose(x.ctx);assert.equal(x.notifications.length,1);assert.match(copied(x),/player-cards/);noSecrets(all);
});
test('malformed client version is discarded instead of copying arbitrary header contents',async()=>{
  const x=context({requestHeaders:{'spotify-app-version':'9.1 PRIVATE_AUTH'}});await diagnose(x.ctx);noSecrets(x.notifications);assert.doesNotMatch(copied(x),/Spotify 9\.1 /);
});
test('internal fetches and lookalike hosts do not produce diagnostics',async()=>{
  for(const options of [{requestHeaders:{'x-verselyrics-internal':'1'}},{url:cardURL.replace('spotify.com','spotify.com.evil.test')},{url:'https://accounts.spotify.com/login'}]){
    const x=context(options);assert.equal(await diagnose(x.ctx),undefined);assert.equal(x.notifications.length,0);assert.equal(x.ctx.response.bodyUsed,false);
  }
});
test('an already marked response explicitly identifies the duplicate processor without reading the body',async()=>{
  const x=context({responseHeaders:{'x-verselyrics':'0.3.3'}});assert.equal(await diagnose(x.ctx),undefined);assert.equal(x.ctx.response.bodyUsed,false);assert.match(copied(x),/另一份 VerseLyrics/);
});
test('an invalid protobuf preserves every byte and reports only a known safe processing code',async()=>{
  const input=Buffer.from([10,255]),x=context({body:input}),r=await diagnose(x.ctx);
  assert.deepEqual(Buffer.from(r.body),input);assert.match(copied(x),/truncated-varint/);assert.equal(diagnosticError(Error('PRIVATE_AUTH')),'processing-error');
});
test('notification failures do not alter the card response or prevent fallback cache writes',async()=>{
  const x=context({notify(){throw Error('PRIVATE_AUTH');}}),r=await diagnose(x.ctx),baseline=await original(context().ctx);assert.deepEqual(Buffer.from(r.body),Buffer.from(baseline.body));assert.equal(r.headers.get('x-verselyrics'),'0.3.3');
});
test('storage failures still allow a notification from this invocation and the original card rewrite',async()=>{
  const x=context();x.ctx.storage={getJSON(){throw Error('PRIVATE_AUTH');},setJSON(){throw Error('PRIVATE_AUTH');}};const r=await diagnose(x.ctx);
  assert.ok(r.headers);assert.equal(x.notifications.length,1);assert.match(copied(x),/已补入完整原生歌词入口/);noSecrets(x.notifications);
});
test('identical results are rate-limited and retained history stays bounded',async()=>{
  const store=new Map(),all=[];for(let i=0;i<20;i++){const x=context({store});await diagnose(x.ctx);all.push(...x.notifications);}
  assert.equal(all.length,1);assert.equal(JSON.parse(store.get('VerseLyrics.diagnostics.1')).events.length,12);
});
test('a burst of distinct cards cannot send more than six event notifications per minute',async()=>{
  const store=new Map(),all=[];for(let i=0;i<12;i++){const x=context({store,url:cardURL.replace(song.track_id,String(i+1).padStart(22,'0'))});await diagnose(x.ctx);all.push(...x.notifications);}
  assert.equal(all.length,6);
});
test('scheduled startup sends at most two initial notifications without network or lyric requests',async()=>{
  const x=context();delete x.ctx.request;delete x.ctx.response;x.ctx.cron='* * * * *';for(let i=0;i<4;i++)assert.equal(await diagnose(x.ctx),undefined);
  assert.equal(x.notifications.length,2);assert.equal(x.calls.length,0);assert.match(copied(x),/heartbeat/);assert.match(copied(x),/尚未读取到接口记录/);
});
test('an unrelated cached status cannot be mistaken for the current response status',async()=>{
  const store=new Map([['VerseLyrics.v1.status',JSON.stringify({message:'PRIVATE_STALE'})]]);
  const x=context({store,url:lyricURL,body:'{"unrecognized":true}',type:'application/json'});await diagnose(x.ctx);noSecrets(x.notifications);assert.match(copied(x),/本次未产生新的处理状态/);
});
test('manual preview keeps the existing widget result and also sends the copyable summary',async()=>{
  const x=context();delete x.ctx.request;delete x.ctx.response;const widget=await diagnose(x.ctx);assert.equal(widget.type,'widget');assert.equal(x.notifications[0].action.type,'clipboard');
});
test('the delivered bundle is self-contained and hashes match its original processor and adapter',()=>{
  const root=new URL('../',import.meta.url),info=JSON.parse(readFileSync(new URL('build-info.json',root),'utf8'));
  const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
  assert.equal(info.sourceSha256,hash(new URL('../../SpotifyLyrics/spotify-lyrics.js',import.meta.url)));
  assert.equal(info.adapterSha256,hash(new URL('notification-layer.js',root)));assert.equal(info.gateSha256,hash(new URL('lyrics-entry-gate.js',root)));assert.equal(info.bundleSha256,hash(new URL(info.bundleFile,root)));
  assert.equal(hash(new URL('spotify-lyrics-diagnostics.js',root)),'fbcb85d42b60d7fad733a4ecfbd7a7d3314eaad2bd673f2c0611cc383badeb35');
  assert.equal(hash(new URL('spotify-lyrics-diagnostics-2.js',root)),'7e796de3e00505bbbcaf4a540dd4b81171a1f5277f38a6d2c04c4fc4a65bf347');
  assert.doesNotMatch(readFileSync(new URL(info.bundleFile,root),'utf8'),/^\s*import\s/m);
});
