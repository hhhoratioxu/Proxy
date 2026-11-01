import test from 'node:test';
import assert from 'node:assert/strict';
import {http,networkLease} from '../spotify-lyrics.js';
for(const asText of [true,false])for(const mode of ['retired','expired','active'])test(`settled ${mode} ${asText?'text':'binary'} transport validates ownership before decoding`,async()=>{
 const store=new Map(),id='0000000000000000000001';let finish,reads=0,cancels=0;
 const ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id},storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)},http:{get:()=>new Promise(r=>finish=r)}};
 const state={cache:{cooldowns:{}},deadline:Date.now()+10000};state.network=networkLease(ctx,state.deadline,true);
 const work=http(ctx,'https://lrclib.net/api/get',state,{text:asText});
 if(mode==='retired')store.set('VerseLyrics.v1.network',store.get('VerseLyrics.v1.network').map(r=>({...r,retired:true})));
 if(mode==='expired')state.deadline=Date.now()-1;
 finish({status:200,headers:new Headers(),body:{cancel:async()=>cancels++},boundedText(){reads++;return {text:'[]',byteLength:2};},boundedBytes(){reads++;return new Uint8Array([91,93]);}});
 if(mode==='active'){const out=await work;assert.equal(out.status,200);assert.equal(reads,1);assert.equal(cancels,0);}
 else {await assert.rejects(work,new RegExp(mode==='retired'?'work-superseded':'deadline'));assert.equal(reads,0);assert.equal(cancels,1);}
 state.network.release();assert.deepEqual(store.get('VerseLyrics.v1.network'),[]);assert.deepEqual(state.cache.cooldowns,{});
});
test('callback cancellation failure cannot resume a retired request or create host cooldown',async()=>{
 let checks=0,reads=0;
 const state={cache:{cooldowns:{}},deadline:Date.now()+10000,network:{enter(){if(++checks===2)throw Error('work-superseded');}}};
 const ctx={http:{get:async()=>({status:200,headers:new Headers(),body:{cancel(){throw Error('already closed');}},boundedBytes(){reads++;}})}};
 await assert.rejects(http(ctx,'https://lrclib.net/api/get',state),/work-superseded/);assert.equal(reads,0);assert.deepEqual(state.cache.cooldowns,{});
});
