import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import run,{fallbackFormat,encodeDocument,parseDocument} from '../spotify-lyrics.js';
import old from '../spotify-lyrics-0.4.0.js';
const target=JSON.parse(readFileSync(new URL('./fixtures/target-song.json',import.meta.url),'utf8'));
const url='https://spclient.wg.spotify.com/color-lyrics/v2/track/'+target.track_id;
const doc={lyrics:{syncType:'LINE_SYNCED',lines:[{startTimeMs:'1000',words:'Self written test line'}],provider:'TEST',providerDisplayName:'Self written',language:'en'},colors:{background:-15656936,text:-1,highlightText:-1}};
function session({accept='*/*',query='',type='application/json',body='{"error":"not found"}'}={}){
 const map=new Map(),storage={getJSON:k=>map.has(k)?JSON.parse(map.get(k)):null,setJSON:(k,v)=>map.set(k,JSON.stringify(v))},headers=new Headers({'app-platform':'iOS','spotify-app-version':'9.1.92.3058'});if(accept!==null)headers.set('Accept',accept);
 const ctx={env:{TRANSLATION_ENABLED:'false'},storage,request:{url:url+query,headers},response:new Response(body,{status:404,headers:type?{'Content-Type':type}:{}}),http:{get:async()=>new Response(JSON.stringify([{trackName:'那页夏天',albumName:'WJK',artistName:'王俊凯',duration:246,syncedLyrics:'[00:01.00]Self written test line'}]))}};
 async function warm(handler){await handler({...ctx,request:{url:'https://spclient.wg.spotify.com/metadata/4/track/'+target.track_hex,headers:new Headers()},response:new Response(Buffer.from(target.metadata_base64,'base64'),{headers:{'Content-Type':'application/x-protobuf'}})});}
 return {ctx,warm};
}
test('reproduces 0.4.0 iOS wildcard Accept plus JSON error returning the wrong lyric format, then corrects it',async()=>{
 const previous=session();await previous.warm(old);const a=await old(previous.ctx);assert.match(a.headers.get('Content-Type'),/json/);assert.equal(Buffer.from(a.body)[0],123);
 const current=session();await current.warm(run);const b=await run(current.ctx);assert.equal(b.status,200);assert.match(b.headers.get('Content-Type'),/protobuf/);assert.equal(Buffer.from(b.body)[0],10);assert.deepEqual(parseDocument(b.body,b.headers.get('Content-Type')).words,['Self written test line']);
});
for(const [accept,type,body] of [['*/*','application/json','{}'],['*/*','application/json',''],[null,'application/json','{}'],['*/*',null,''],['application/x-protobuf','application/json','{}'],['application/octet-stream','text/plain','missing']])test('missing native lyrics format is independent of the upstream error MIME: '+JSON.stringify([accept,type,body]),async()=>{
 const s=session({accept,type,body});await s.warm(run);const result=await run(s.ctx);assert.equal(result.status,200);assert.match(result.headers.get('Content-Type'),/protobuf/);assert.equal(parseDocument(result.body,result.headers.get('Content-Type')).format,'protobuf');
});
for(const [accept,query,expected] of [['*/*','?format=json','json'],['application/json','','json'],['application/json','?format=protobuf','protobuf'],['application/x-protobuf','?format=json','json'],['application/x-protobuf','','protobuf']])test('explicit successful representation remains supported '+JSON.stringify([accept,query,expected]),async()=>{
 const s=session({accept,query});await s.warm(run);const result=await run(s.ctx);assert.equal(parseDocument(result.body,result.headers.get('Content-Type')).format,expected);
});
test('a successfully parsed empty JSON document remains JSON for clients using that endpoint representation',()=>{assert.equal(fallbackFormat({request:{url,headers:new Headers()}},{format:'json'}),'json');});
test('wildcard native requests explicitly ask upstream for protobuf while JSON clients retain their representation',async()=>{
 const native=session();delete native.ctx.response;const result=await run(native.ctx);assert.equal(result.headers.get('Accept'),'application/x-protobuf');
 const web=session({query:'?format=json'});delete web.ctx.response;const again=await run(web.ctx);assert.equal(again.headers.get('Accept'),'*/*');
});
test('a valid native protobuf with a 123-byte lyrics message cannot be mistaken for a JSON opening brace',()=>{
 let input;for(let length=1;length<200;length++){const bytes=encodeDocument({...doc,lyrics:{...doc.lyrics,lines:[{startTimeMs:'1000',words:'x'.repeat(length)}]}},'protobuf');if(bytes[0]===10&&bytes[1]===123){input=bytes;break;}}assert.ok(input);assert.equal(parseDocument(input,'application/x-protobuf').format,'protobuf');
});
test('native ARGB fields are encoded as canonical unsigned 32-bit values',()=>{
 const input=encodeDocument(doc,'protobuf');let at=1;function v(){let n=0n,s=0n,b;do{b=input[at++];n|=BigInt(b&127)<<s;s+=7n;}while(b&128);return n;}
 const size=Number(v());at+=size;assert.equal(v(),18n);const end=at+Number(v()),values=[];while(at<end){v();const begin=at,n=v();assert.ok(n<=0xffffffffn);assert.ok(at-begin<=5);values.push(n);}assert.deepEqual(values,[4279310360n,4294967295n,4294967295n]);
});
