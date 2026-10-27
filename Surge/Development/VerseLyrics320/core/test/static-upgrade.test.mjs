import test from 'node:test';
import assert from 'node:assert/strict';
import {backup,cachedBackup,loadCache,settings,parseDocument,encodeDocument,fields,dataField,numberField,join} from '../spotify-lyrics.js';
const id='0000000000000000000001',meta={id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:300};
const colors={background:-10985626,text:-16777216,highlightText:-1};
const textDoc={lyrics:{syncType:'UNSYNCED',provider:'Spotify',providerDisplayName:'Spotify',lines:[{startTimeMs:'0',words:'Original lantern line.'}]},colors};
function setup(provider='auto',network=()=>{throw Error('unexpected HTTP');}){
 const store=new Map(),calls=[],ctx={env:{},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{calls.push(u);return network(u);},post:async u=>{calls.push(u);return network(u);}}};
 return {ctx,store,calls,state:{cache:loadCache(ctx),settings:settings({FALLBACK_PROVIDER:provider}),deadline:Date.now()+10000}};
}
const reply=x=>new Response(JSON.stringify(x));
function empty(u){
 if(u.includes('lrclib'))return u.includes('/get?')?new Response('{}',{status:404}):reply([]);
 if(u.includes('/soso/'))return reply({code:0,data:{song:{list:[]}}});
 if(u.includes('/cloudsearch/'))return reply({code:200,result:{songs:[]}});
 if(u.includes('kugou'))return reply({status:200,candidates:[]});
 if(u.includes('kuwo'))return reply({abslist:[]});
 throw Error('untimed-only provider must be skipped');
}
test('static upgrade searches only timing-capable sources under the existing budget',async()=>{
 const x=setup('auto',empty);assert.equal(await backup(x.ctx,meta,x.state,true),null);
 assert.deepEqual(x.state.attempts.map(a=>a.provider),['lrclib','qq','netease','kugou','kuwo']);assert.equal(x.calls.length,6);assert.ok(x.state.sourceUsage.requests<=12);assert.ok(x.state.sourceUsage.bytes<=256*1024);assert.ok(!x.calls.some(u=>u.includes('lyrics.ovh')));
 assert.equal(x.state.cache.get('lyrics:auto:'+id),undefined);assert.equal(cachedBackup(x.state,id),undefined);
});
test('a completed no-timeline search expires within 90 seconds and does not suppress ordinary text fallback',async()=>{
 const original=Date.now;let now=original();Date.now=()=>now;
 try {
  const record={trackName:meta.title,artistName:meta.artists[0],albumName:meta.album,duration:meta.duration,plainLyrics:'Original plain lantern one.\nOriginal plain lantern two.'};
  const x=setup('lrclib',u=>reply(u.includes('/search?')?[record]:record));
  assert.equal(await backup(x.ctx,meta,x.state,true),null);assert.equal(x.calls.length,2);
  const miss=x.state.cache.entries.find(e=>e.key==='synced-miss:v1:lrclib:'+id);assert.equal(miss.expires,now+90000);
  assert.equal(cachedBackup(x.state,id,false,true),null);assert.equal(cachedBackup(x.state,id),undefined);
  const ordinary=await backup(x.ctx,meta,x.state);assert.equal(ordinary.lyrics.syncType,'UNSYNCED');assert.equal(x.calls.length,4);
  now+=90001;x.state.deadline=now+10000;assert.equal(cachedBackup(x.state,id,false,true),undefined);await backup(x.ctx,meta,x.state,true);assert.equal(x.calls.length,6);
 } finally {Date.now=original;}
});
test('a timed-only LRCLIB search failure after a valid plain record is retryable',async()=>{
 const record={trackName:meta.title,artistName:meta.artists[0],albumName:meta.album,duration:meta.duration,plainLyrics:'Original plain lantern one.\nOriginal plain lantern two.'};
 const x=setup('lrclib',u=>u.includes('/search?')?new Response('busy',{status:503}):reply(record));
 assert.equal(await backup(x.ctx,meta,x.state,true),null);assert.equal(x.calls.length,2);assert.equal(x.state.cache.get('synced-miss:v1:lrclib:'+id),undefined);assert.equal(x.state.cache.get('lyrics:lrclib:'+id),undefined);
 assert.ok(x.state.attempts.some(a=>a.result==='http-503'));
});
test('JSON classifies only the explicit static enum; unknown sync types retain official handling',()=>{
 for(const sync of ['UNSYNCED','LINE_SYNCED','SYLLABLE_SYNCED','future-value',undefined]){
  const bytes=Buffer.from(JSON.stringify({...textDoc,lyrics:{...textDoc.lyrics,syncType:sync}}));assert.equal(parseDocument(bytes,'application/json').unsynced,sync==='UNSYNCED');
 }
});
test('protobuf recognizes default static enum and preserves unknown enum values',()=>{
 const bytes=encodeDocument(textDoc,'protobuf'),root=fields(bytes),inner=fields(root[0].payload);
 for(const sync of [undefined,0,1,2,99]){
  const modified=dataField(1,join([...(sync===undefined?[]:[numberField(1,sync)]),...inner.filter(f=>f.number!==1).map(f=>f.raw)]));
  const body=join([modified,...root.slice(1).map(f=>f.raw)]),doc=parseDocument(body,'application/x-protobuf');assert.equal(doc.unsynced,sync==null||sync===0);assert.deepEqual(doc.words,['Original lantern line.']);
 }
 assert.throws(()=>parseDocument(dataField(1,dataField(1,new Uint8Array())),'application/x-protobuf'),/sync-type/);
});
