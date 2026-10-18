import entryRun from '../../runtime/Egern/script/SpotifyLyrics/spotify-lyrics-entry.js';
const run = ctx => String(ctx.request?.url||'').includes('/color-lyrics/') || !ctx.request ? unusedCore(ctx) : entryRun(ctx);
import test from 'node:test';import assert from 'node:assert/strict';
import unusedCore,{PLAYER_ENTRY_URL,playerEntryJSON,playerEntryWire} from '../spotify-lyrics.js';
const id=n=>String(n).padStart(22,'0'),uri=n=>'spotify:track:'+id(n),enc=s=>Buffer.from(s),cat=(...x)=>Buffer.concat(x);
function vi(n){n=BigInt(n);const out=[];do{const b=Number(n&127n);n>>=7n;out.push(b|(n?128:0));}while(n);return Buffer.from(out);}
const bin=(n,b)=>cat(vi(n*8+2),vi(b.length),b),str=(n,s)=>bin(n,enc(s));
function read(bytes){const b=Buffer.from(bytes),out=[];let at=0;function v(){let n=0n,s=0n,x;do{assert.ok(at<b.length);x=b[at++];n|=BigInt(x&127)<<s;s+=7n;}while(x&128);return Number(n);}while(at<b.length){const start=at,k=v(),no=k>>3,wire=k&7;let payload;if(wire===0)v();else if(wire===2){const length=v();payload=b.subarray(at,at+length);at+=length;}else at+=wire===1?8:4;assert.ok(at<=b.length);out.push({no,wire,payload,raw:b.subarray(start,at)});}return out;}
const flags=(n,value='false')=>bin(n,cat(str(1,'has_lyrics'),str(2,value),str(90,'keep-map')));
const track=(n,mapNo,flag='false')=>cat(str(1,uri(n)),...(flag===null?[]:[flags(mapNo,flag)]),str(99,'keep-track-'+n));
const value=(body,mapNo)=>read(read(body).find(f=>f.no===mapNo).payload).find(f=>f.no===2).payload.toString();
function ctx(path,body,{env={},status=200,type='application/json'}={}){const map=new Map();return {env,request:{url:'https://spclient.wg.spotify.com/'+path,headers:new Headers({'If-None-Match':'old'})},response:new Response(body,{status,headers:{'Content-Type':type,ETag:'old'}}),storage:{getJSON:k=>map.get(k),setJSON:(k,v)=>map.set(k,v)},notify(){throw Error('must be silent');},http:{get(){throw Error('no source requests in entry stage');}}};}
for(const kind of ['track','album','playlist','station:artist','collection:tracks'])test('context '+kind+' adds missing lyric metadata for multiple tracks, without reserializing unknown large numbers',()=>{
 const source=' {"uri":"spotify:'+kind+':'+id(20)+'","unknown":18446744073709551615,"pages":[{"tracks":[{"uri":"'+uri(1)+'","metadata":{"has_lyrics":"false","untouched":"false"}},{"uri":"'+uri(2)+'","metadata":{}},{"uri":"'+uri(3)+'"}]}]} ';
 const result=playerEntryJSON(enc(source),false),output=Buffer.from(result.body).toString(),obj=JSON.parse(output);assert.equal(result.changed,3);assert.ok(output.includes('"unknown":18446744073709551615'));assert.ok(output.startsWith(' '));assert.ok(output.endsWith(' '));assert.ok(obj.pages[0].tracks.every(t=>t.metadata.has_lyrics==='true'));assert.equal(obj.pages[0].tracks[0].metadata.untouched,'false');assert.equal(playerEntryJSON(result.body,false).changed,0);
});
test('player state updates current, previous and next metadata without modifying playback timing or restrictions',()=>{
 const source=JSON.stringify({player_state:{track:{uri:uri(1),metadata:{has_lyrics:'false'}},prev_tracks:[{uri:uri(2)}],next_tracks:[{uri:uri(3),metadata:{has_lyrics:true}}],position:1234,is_paused:false,restrictions:{disallow_skipping_next_reasons:['keep']}},devices:{account:'keep'},unknown:'has_lyrics false'});
 const result=playerEntryJSON(enc(source),true),out=JSON.parse(Buffer.from(result.body).toString());assert.equal(result.changed,2);assert.equal(out.player_state.track.metadata.has_lyrics,'true');assert.equal(out.player_state.prev_tracks[0].metadata.has_lyrics,'true');assert.equal(out.player_state.next_tracks[0].metadata.has_lyrics,true);assert.equal(out.player_state.position,1234);assert.deepEqual(out.player_state.restrictions,{disallow_skipping_next_reasons:['keep']});assert.deepEqual(out.devices,{account:'keep'});
});
test('native Context field path 5,4,4 preserves all other track and container fields',()=>{
 const first=track(1,4),second=track(2,4,null),other=str(98,'keep-page'),input=cat(str(1,'spotify:album:'+id(7)),bin(5,cat(bin(4,first),bin(4,second),other)),str(99,'keep-context'));
 const result=playerEntryWire(input,false),root=read(result.body),page=read(root.find(f=>f.no===5).payload),tracks=page.filter(f=>f.no===4);assert.equal(result.changed,2);assert.ok(tracks.every(t=>value(t.payload,4)==='true'));
 assert.deepEqual(root.filter(f=>f.no!==5).map(f=>f.raw),read(input).filter(f=>f.no!==5).map(f=>f.raw));assert.deepEqual(page.find(f=>f.no===98).raw,other);assert.deepEqual(read(first).filter(f=>f.no!==4).map(f=>f.raw),read(tracks[0].payload).filter(f=>f.no!==4).map(f=>f.raw));assert.equal(playerEntryWire(result.body,false).changed,0);
});
test('native Cluster field path 3 then 7/19/20 then metadata 3 preserves devices and unknown state bytes',()=>{
 const state=cat(bin(7,track(1,3)),bin(19,track(2,3,null)),bin(20,track(3,3,'true')),str(95,'keep-state'));
 const opaque=bin(4,str(90,'PRIVATE_DEVICE_DATA')),input=cat(bin(3,state),opaque,str(99,'keep-cluster')),result=playerEntryWire(input,true),output=read(result.body);assert.equal(result.changed,2);assert.deepEqual(output.find(f=>f.no===4).raw,opaque);const fresh=read(output.find(f=>f.no===3).payload);for(const n of [7,19,20])assert.equal(value(fresh.find(f=>f.no===n).payload,3),'true');assert.deepEqual(fresh.find(f=>f.no===95).raw,read(state).find(f=>f.no===95).raw);
});
for(const path of ['context-resolve/v1/spotify:track:'+id(1),'context-resolve/v1/spotify%3Aplaylist%3A'+id(2),'connect-state/v1/devices/'+id(9)])test('production handles the previously omitted playback entry route '+path,async()=>{
 const connect=path.startsWith('connect-state'),body=JSON.stringify(connect?{player_state:{track:{uri:uri(1),metadata:{has_lyrics:'false'}}}}:{uri:uri(1),pages:[{tracks:[{uri:uri(1),metadata:{has_lyrics:'false'}}]}]});
 assert.equal(PLAYER_ENTRY_URL.test('https://spclient.wg.spotify.com/'+path),true);const context=ctx(path,body),result=await run(context);assert.ok(result.headers);assert.equal(result.headers.get('ETag'),null);const out=JSON.parse(Buffer.from(result.body).toString());assert.equal((connect?out.player_state.track:out.pages[0].tracks[0]).metadata.has_lyrics,'true');delete context.response;const request=await run(context);assert.equal(request.headers.get('If-None-Match'),null);
});
for(const option of [{env:{DISCOVER_MISSING:'false'}},{env:{FALLBACK_PROVIDER:'off'}},{status:401},{status:403},{status:429},{status:500}])test('playback entry retains upstream state when disabled or unavailable '+JSON.stringify(option),async()=>{const context=ctx('context-resolve/v1/spotify:track:'+id(1),'{}',option);assert.equal(await run(context),undefined);assert.equal(context.response.bodyUsed,false);});
test('episodes, malformed flags, unknown shapes, lookalike hosts and unsupported paths stay untouched',async()=>{
 const input=enc(JSON.stringify({uri:uri(1),pages:[{tracks:[{uri:'spotify:episode:'+id(1),metadata:{has_lyrics:'false'}},{uri:uri(2),metadata:{has_lyrics:'unknown'}}]}]}));assert.deepEqual(Buffer.from(playerEntryJSON(input,false).body),input);
 for(const body of ['not-json','{"unknown":true}','{"uri":"'+uri(1)+'","pages":[{"tracks":[{"uri":"'+uri(1)+'","metadata":{"has_lyrics":"false","has_lyrics":"false"}}]}]}']){const context=ctx('context-resolve/v1/spotify:track:'+id(1),body),result=await run(context);assert.equal(Buffer.from(result.body).toString(),body);}
 assert.equal(PLAYER_ENTRY_URL.test('https://spclient.wg.spotify.com.evil.test/context-resolve/v1/'+uri(1)),false);assert.equal(PLAYER_ENTRY_URL.test('https://spclient.wg.spotify.com/context-resolve/v99/'+uri(1)),false);
});
