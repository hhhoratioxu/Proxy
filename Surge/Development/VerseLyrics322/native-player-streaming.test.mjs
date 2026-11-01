import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import egern from './runtime/Egern/script/SpotifyLyrics/spotify-lyrics-entry.js';
import {playerEntryJSON,playerEntryWire,join,stringField,dataField,utf8} from './core/spotify-lyrics.js';
const id='0000000000000000000001',uri='spotify:track:'+id;
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const connect of [false,true])for(const format of ['json','protobuf'])test(`${client}: compiled ${connect?'connect':'context'} ${format} entry preserves exact native bytes`,async()=>{
 const json=JSON.stringify(connect?{player_state:{track:{uri,metadata:{has_lyrics:false,unknown:'保留'}},position:12345}}:{uri:'spotify:playlist:'+id,pages:[{tracks:[{uri,metadata:{has_lyrics:'false',other:'keep'}}]}]});
 const track=join([stringField(1,uri),dataField(connect?3:4,join([stringField(1,'has_lyrics'),stringField(2,'false'),stringField(99,'opaque')])),stringField(100,'keep')]);
 const wire=connect?join([dataField(3,dataField(7,track)),stringField(99,'device')]):join([stringField(1,'spotify:playlist:'+id),dataField(5,dataField(4,track)),stringField(99,'context')]);
 const body=format==='json'?utf8(json):wire,type=format==='json'?'application/json':'application/x-protobuf',url='https://spclient.wg.spotify.com/'+(connect?'connect-state/v1/devices/':'context-resolve/v1/spotify:playlist:')+id;
 const expected=(format==='json'?playerEntryJSON:playerEntryWire)(body,connect);assert.equal(expected.changed,1);let output;
 if(client==='Egern'){output=await egern({env:{},request:{url,headers:new Headers()},response:new Response(body,{headers:{'Content-Type':type}}),storage:{get:()=>null,set(){},getJSON:()=>null,setJSON(){}}});}
 else {const qx=client==='QuantumultX';let done=0;await new Promise((resolve,reject)=>{const ctx={$request:{url,headers:{}},$response:qx?{statusCode:200,headers:{'Content-Type':type},bodyBytes:body.buffer}:{status:200,headers:{'Content-Type':type},body},$argument:{},$persistentStore:{read:()=>null,write:()=>true},$prefs:{valueForKey:()=>null,setValueForKey:()=>true},$done:r=>{done++;output={...r,body:qx?r.bodyBytes:r.body};resolve();}};try{vm.runInNewContext(readFileSync(new URL('./runtime/'+client+'/script/SpotifyLyrics.Entry.js',import.meta.url),'utf8'),ctx);}catch(e){reject(e);}});assert.equal(done,1);}
 assert.ok(output?.body,'compiled entry returned passthrough');assert.deepEqual(Buffer.from(output.body),Buffer.from(expected.body));
});
