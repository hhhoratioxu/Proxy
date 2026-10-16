import entryRun from '../../runtime/Egern/script/SpotifyLyrics/spotify-lyrics-entry.js';
const run = ctx => String(ctx.request?.url||'').includes('/color-lyrics/') || !ctx.request ? unusedCore(ctx) : entryRun(ctx);
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import unusedCore,{LYRICS_GATE_URL,parseMetadata,parseDocument} from '../spotify-lyrics.js';
const target=JSON.parse(readFileSync(new URL('./fixtures/target-song.json',import.meta.url),'utf8'));
const card=JSON.parse(readFileSync(new URL('./fixtures/target-scroll.json',import.meta.url),'utf8'));
// Independent fixture writer/reader for public native wire field facts.
const cat=(...xs)=>Buffer.concat(xs);
function vi(value){let n=BigInt(value),out=[];do{const b=Number(n&127n);n>>=7n;out.push(b|(n?128:0));}while(n);return Buffer.from(out);}
const bin=(n,b)=>cat(vi(n*8+2),vi(b.length),b),num=(n,v)=>cat(vi(n*8),vi(v)),str=(n,s)=>bin(n,Buffer.from(s));
function read(bytes){const b=Buffer.from(bytes),out=[];let at=0;function v(){let n=0n,s=0n,x;do{assert.ok(at<b.length);x=b[at++];n|=BigInt(x&127)<<s;s+=7n;}while(x&128);return Number(n);}while(at<b.length){const begin=at,k=v(),no=k>>3,wire=k&7;let value,payload;if(wire===0)value=v();else if(wire===2){const len=v();payload=b.subarray(at,at+len);at+=len;}else if(wire===1)at+=8;else if(wire===5)at+=4;else throw Error('wire');assert.ok(at<=b.length);out.push({no,wire,value,payload,raw:b.subarray(begin,at)});}return out;}
function configuration(value=0){return cat(str(1,'self-written-config-id'),num(2,1000),bin(3,cat(bin(1,cat(str(1,'ios-feature-lyrics'),str(2,'enable_has_lyrics_check_bypass'))),bin(3,num(1,value)),str(99,'keep-assignment'))),str(98,'keep-config'));}
function wrapper(body,bootstrap=false){for(const n of bootstrap?[1,1,1,1,1,2]:[1,1,1])body=cat(bin(n,body),bin(88,Buffer.from('PRIVATE_ACCOUNT_OPAQUE')));return body;}
function ctx(url,body,{status=200,env={},type='application/x-protobuf',store=new Map(),network=async()=>{throw Error('unexpected network');}}={}){
 const calls=[],notices=[];
 const context={env,request:{url,headers:new Headers({Accept:type,Authorization:'Bearer TEST_ONLY','If-None-Match':'old'})},
  response:new Response(body,{status,headers:{'Content-Type':type,ETag:'old'}}),
  storage:{getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))},notify:n=>notices.push(n),
  http:{get:async(u,o)=>{calls.push(u);return network(u,o);},post:async(u,o)=>{calls.push(u);return network(u,o);}}};
 return {context,calls,notices,store};
}
const endpoint=path=>'https://spclient.wg.spotify.com/'+path;
for(const path of ['user-customization-service/v1/customize','bootstrap/v1/bootstrap'])test('production handles the complete native '+path+' response silently and preserves every other field',async()=>{
 const bootstrap=path.startsWith('bootstrap/'),input=wrapper(configuration(),bootstrap),x=ctx(endpoint(path),input),result=await run(x.context);assert.ok(result.headers);assert.equal(result.headers.get('ETag'),null);assert.equal(result.headers.get('x-verselyrics'),'0.4.12');assert.equal(x.notices.length,0);assert.equal(x.calls.length,0);
 let a=input,b=Buffer.from(result.body);for(const no of bootstrap?[2,1,1,1,1,1]:[1,1,1]){const old=read(a),fresh=read(b);assert.deepEqual(old.filter(f=>f.no!==no).map(f=>f.raw),fresh.filter(f=>f.no!==no).map(f=>f.raw));a=old.find(f=>f.no===no).payload;b=fresh.find(f=>f.no===no).payload;}
 const old=read(a),fresh=read(b);assert.deepEqual(old.filter(f=>f.no!==3).map(f=>f.raw),fresh.filter(f=>f.no!==3).map(f=>f.raw));const assignment=read(fresh.find(f=>f.no===3).payload);assert.equal(read(assignment.find(f=>f.no===3).payload).find(f=>f.no===1).value,1);assert.doesNotMatch(JSON.stringify([...x.store]),/TEST_ONLY|PRIVATE_ACCOUNT_OPAQUE/);
});
for(const path of ['user-customization-service/v1/customize','bootstrap/v1/bootstrap'])test('production cache request handling covers '+path,async()=>{
 const x=ctx(endpoint(path),null);delete x.context.response;const result=await run(x.context);assert.equal(result.headers.get('If-None-Match'),null);assert.equal(result.headers.get('Accept-Encoding'),'identity');assert.equal(result.headers.get('Authorization'),'Bearer TEST_ONLY');assert.equal(x.notices.length,0);
});
for(const status of [304,401,403,429,500])test('production configuration HTTP '+status+' stays untouched and silent',async()=>{
 const x=ctx(endpoint('user-customization-service/v1/customize'),status===304?null:'failure',{status});assert.equal(await run(x.context),undefined);assert.equal(x.context.response.bodyUsed,false);assert.equal(x.notices.length,0);assert.equal(x.calls.length,0);
});
test('disabled discovery, disabled fallback, marked responses and internal requests do not enable configuration',async()=>{
 for(const env of [{DISCOVER_MISSING:'false'},{FALLBACK_PROVIDER:'off'}]){const x=ctx(endpoint('user-customization-service/v1/customize'),configuration(),{env});assert.equal(await run(x.context),undefined);assert.equal(x.context.response.bodyUsed,false);assert.equal(x.notices.length,0);}
 const x=ctx(endpoint('user-customization-service/v1/customize'),configuration());x.context.request.headers.set('x-verselyrics-internal','1');assert.equal(await run(x.context),undefined);assert.equal(x.context.response.bodyUsed,false);
 const y=ctx(endpoint('user-customization-service/v1/customize'),configuration());y.context.response.headers.set('x-verselyrics','0.4.1');assert.deepEqual(Buffer.from((await run(y.context)).body),configuration());
});
test('unknown configuration, JSON, and host or path lookalikes are retained',async()=>{
 for(const [input,type] of [[str(99,'unknown'),'application/x-protobuf'],[Buffer.from('{"account":"keep"}'),'application/json']]){const x=ctx(endpoint('user-customization-service/v1/customize'),input,{type});assert.deepEqual(Buffer.from((await run(x.context)).body),input);assert.equal(x.notices.length,0);}
 for(const url of ['https://spclient.wg.spotify.com.evil.test/user-customization-service/v1/customize',endpoint('user-customization-service/v1/customize/other'),endpoint('audio/v1/track/anything')]){const x=ctx(url,configuration());assert.equal(LYRICS_GATE_URL.test(url),false);assert.equal(await run(x.context),undefined);assert.equal(x.context.response.bodyUsed,false);}
});
test('one production response handler shares metadata through card insertion, auto fallback, plugin translation and cache reuse without notifications',async()=>{
 const store=new Map(),requests=[];const network=async(url,options)=>{
  requests.push(url);assert.equal(options.headers?.Authorization,undefined);assert.equal(options.headers?.['client-token'],undefined);
  if(url.startsWith('https://lrclib.net/'))return new Response('limited',{status:429});
  if(url.includes('/soso/'))return new Response(JSON.stringify({code:0,data:{song:{list:[{songmid:'SelfWrittenFixture',songname:'那页夏天',albumname:'WJK',interval:246,singer:[{name:'王俊凯'}]}]}}}));
  if(url.includes('/lyric/'))return new Response(JSON.stringify({retcode:0,lyric:'[00:01.00]A self written line\n[00:03.00]Another self written line'}));
  if(url.startsWith('https://translate.googleapis.com/'))return new Response(JSON.stringify(new URL(url).searchParams.getAll('q').map((s,i)=>['插件译文'+i,'en'])));
  throw Error('unexpected endpoint');
 };
 const metadata=ctx(endpoint('metadata/4/track/'+target.track_hex),Buffer.from(target.metadata_base64,'base64'),{store,network});const mr=await run(metadata.context);assert.equal(parseMetadata(mr.body,target.track_hex).hasLyrics,true);assert.equal(requests.length,0);
 const cards=ctx(card.endpoint,Buffer.from(card.structure_field_base64,'base64'),{store,network});assert.ok((await run(cards.context)).headers);assert.equal(requests.length,0);
 const lyrics=ctx(endpoint('color-lyrics/v2/track/'+target.track_id),'missing',{status:404,store,network,type:'application/json'});lyrics.context.request.headers.delete('Authorization');const result=await run(lyrics.context);assert.equal(result.status,200);const body=JSON.parse(Buffer.from(result.body).toString());assert.equal(body.lyrics.providerDisplayName,'QQ 音乐');assert.equal(body.lyrics.lines.length,2);assert.deepEqual(body.lyrics.alternatives,[{language:'zh-CN',lines:['插件译文0','插件译文1']}]);assert.equal(parseDocument(result.body,'application/json').words.length,2);
 const count=requests.length;const again=ctx(lyrics.context.request.url,'missing',{status:404,store,network,type:'application/json'});assert.equal((await run(again.context)).status,200);assert.equal(requests.length,count);assert.equal(metadata.notices.length+cards.notices.length+lyrics.notices.length+again.notices.length,0);
});
test('the production bundle has no notification adapter, schedule or runtime imports',()=>{
 const source=readFileSync(new URL('../spotify-lyrics.js',import.meta.url),'utf8');assert.doesNotMatch(source,/ctx\.notify|diagnosticNotify|DIAGNOSTIC_VERSION|^\s*import\s/m);
});
