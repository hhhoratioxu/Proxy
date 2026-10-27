import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {startupFixture,kinds,id} from './startup-fixtures.mjs';
import {parseMetadata,base62Hex,extendedTracks,nativeLyricGate,scrollDocument,playerEntryJSON,playerEntryWire} from './core/spotify-lyrics.js';
const clients=['Loon','Surge','Shadowrocket','QuantumultX'],KEY='VerseLyrics.v1.cache';
function invoke(client,fixture,{env={},store=new Map(),response={},bodyValue=fixture.body}={}){
 const qx=client==='QuantumultX',state={done:0,calls:0,timers:0,output:null},bytes=new Uint8Array(bodyValue);
 const context={$request:{url:fixture.url,headers:{}},$response:qx?{statusCode:200,headers:{'Content-Type':fixture.type},...(typeof bodyValue==='string'?{body:bodyValue}:{bodyBytes:bytes.buffer}),...response}:{status:200,headers:{'Content-Type':fixture.type},body:typeof bodyValue==='string'?bodyValue:bytes,...response},
 $argument:env,$environment:{variables:env},$persistentStore:{read:k=>store.get(k),write:(v,k)=>{store.set(k,v);return true;}},$prefs:{valueForKey:k=>store.get(k),setValueForKey:(v,k)=>{store.set(k,v);return true;}},
 setTimeout(){state.timers++;throw Error('Entry allocated timer');},$httpClient:{get(){state.calls++;throw Error('Entry network');},post(){state.calls++;throw Error('Entry network');}},$task:{fetch(){state.calls++;throw Error('Entry network');}},
 $done:out=>{state.done++;state.output=out;}};
 new vm.Script(readFileSync(new URL('./runtime/'+client+'/script/SpotifyLyrics.Entry.js',import.meta.url),'utf8')).runInNewContext(context);
 assert.equal(state.done,1,'response must finish synchronously before host returns');
 assert.equal(state.calls,0);assert.equal(state.timers,0);state.bytes=Buffer.from((qx?state.output.bodyBytes:state.output.body)||fixture.body);return{...state,store};
}
function inspect(f,out){
 assert.ok(out.output.body||out.output.bodyBytes,'expected a real rewritten entry');
 if(f.kind==='metadata'){const d=parseMetadata(out.bytes,base62Hex(id));assert.equal(d.hasLyrics,true);assert.equal(d.meta.title,'Paper Lantern');}
 else if(f.kind==='extended'){const d=extendedTracks(out.bytes);assert.equal(d.records.length,1);assert.equal(d.records[0].hasLyrics,true);}
 else if(['bootstrap','customize'].includes(f.kind))assert.equal(nativeLyricGate(out.bytes,f.kind==='bootstrap'?'bootstrap':'customize').changed,false);
 else if(f.kind==='scroll')assert.equal(scrollDocument(out.bytes,f.type,id).hasLyrics,true);
 else if(f.kind.endsWith('json')){const d=JSON.parse(out.bytes),track=f.kind.startsWith('connect')?d.player_state.track:d.pages[0].tracks[0];assert.ok(track.metadata.has_lyrics===true||track.metadata.has_lyrics==='true');assert.ok(d.opaque||d.player_state.opaque);}
 else assert.equal(playerEntryWire(out.bytes,f.kind.startsWith('connect')).changed,0);
 if(['metadata','extended'].includes(f.kind)){const saved=JSON.parse(out.store.get(KEY));assert.ok(saved.entries.some(e=>e.key==='meta:'+id));assert.ok(out.store.get(KEY).length<=64000);}
}
for(const client of clients)for(const kind of kinds)test(client+': '+kind+' cold entry finishes in the current host call and preserves useful rewrite',()=>{
 const f=startupFixture(kind),out=invoke(client,f);inspect(f,out);
});
for(const client of clients)for(const kind of ['context-json','connect-json'])test(client+': string '+kind+' body keeps synchronous UTF-8 validation',()=>{
 const f=startupFixture(kind,100),out=invoke(client,f,{bodyValue:f.body.toString('utf8')});inspect(f,out);
});
for(const client of clients)for(const scenario of ['malformed','oversized','declared-oversized','invalid-utf8','unsupported-body','disabled-discovery','disabled-provider','already-marked','wrong-status'])test(client+': synchronous '+scenario+' completion passes through safely',()=>{
 const f=startupFixture('extended'),opts={};
 if(scenario==='malformed')opts.bodyValue=Buffer.from([0]);
 if(scenario==='oversized')opts.bodyValue=Buffer.alloc(131073);
 if(scenario==='declared-oversized')opts.response={headers:{'Content-Type':f.type,'Content-Length':'131073'}};
 if(scenario==='invalid-utf8'){opts.bodyValue=Buffer.from([123,255,125]);opts.response={headers:{'Content-Type':'application/json'}};}
 if(scenario==='unsupported-body')opts.response=client==='QuantumultX'?{bodyBytes:{}}:{body:{}};
 if(scenario==='disabled-discovery')opts.env={DISCOVER_MISSING:false};
 if(scenario==='disabled-provider')opts.env={FALLBACK_PROVIDER:'off'};
 if(scenario==='already-marked')opts.response={headers:{'Content-Type':f.type,'x-verselyrics':'old'}};
 if(scenario==='wrong-status')opts.response=client==='QuantumultX'?{statusCode:500}:{status:500};
 const out=invoke(client,f,opts);
 if(scenario!=='disabled-provider'&&scenario!=='disabled-discovery')assert.equal(out.output.body===undefined&&out.output.bodyBytes===undefined,true);
 if(scenario==='disabled-discovery'||scenario==='disabled-provider'){const d=extendedTracks(out.bytes);assert.equal(d.records[0].hasLyrics,false);}
});
for(const client of clients)test(client+': 72 relaunch entry responses cannot accumulate unfinished local script work',()=>{
 let count=0;const store=new Map();
 for(let i=0;i<72;i++){const f=startupFixture(kinds[i%kinds.length],(i%3+1)*4096),out=invoke(client,f,{store});assert.equal(out.done,1);count++;}
 assert.equal(count,72);assert.ok(!store.get(KEY)||store.get(KEY).length<=64000);
});
