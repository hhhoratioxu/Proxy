import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke,seedStore,colors,sourceFixture} from './feature-host.mjs';
import {encodeDocument,parseDocument,existingPalette} from './core/spotify-lyrics.js';
const meta={id:'1fpBhAhO9gpTwuglQfjVBh',title:'后会无期 (《诡案》网络剧插曲)',artists:['Silence Wang','徐良'],album:'',duration:211.76};
function official(format,zeroOnly=false){const d={lyrics:{syncType:zeroOnly?'LINE_SYNCED':'UNSYNCED',provider:'Spotify',providerDisplayName:'Spotify',language:'zh',lines:['自写原词第一句','自写原词第二句'].map(words=>({startTimeMs:'0',words})),alternatives:[{language:'zh-CN',lines:['错误简繁译文','错误简繁译文']}]},colors};return encodeDocument(d,format);}
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const format of ['json','protobuf']){
 const title=client+' '+format,type=format==='json'?'application/json':'application/x-protobuf';
 test(title+': user-track metadata upgrades by verified artist/title matching with no special track shortcut',async()=>{
  const out=await invoke(client,{format,provider:'auto',track:meta.id,store:seedStore(meta),status:200,responseBody:official(format),network:async u=>{
   if(u.includes('/soso/')){const q=new URL(u).searchParams.get('w');assert.equal(q,'后会无期 汪苏泷 徐良');return {body:JSON.stringify({code:0,data:{song:{list:[{songmid:'TESTMID',songname:'后会无期',singer:[{name:'徐良'},{name:'汪苏泷'}],albumname:'不良少年',interval:211}]}}})};}
   assert.ok(u.includes('/lyric/'));return {body:JSON.stringify({code:0,lyric:'[00:01]自写测试歌词\n[00:03]自写第二句'})};
  }}),doc=parseDocument(out.bytes,type);assert.equal(doc.unsynced,false);assert.deepEqual(doc.words,['自写测试歌词','自写第二句']);assert.equal(out.calls.length,2);assert.deepEqual(existingPalette(out.bytes,doc),colors);assert.equal(out.done,1);assert.equal(out.active,0);assert.equal(out.maxActive,1);
 });
 for(const enabled of [true,false])test(title+': synchronized label with zero-only times respects replacement switch '+enabled,async()=>{
  const out=await invoke(client,{format,status:200,responseBody:official(format,true),env:{REPLACE_UNSYNCED:enabled},network:async u=>({body:JSON.stringify(sourceFixture('netease',u,{lines:8}))})}),doc=parseDocument(out.bytes,type);
  assert.equal(doc.unsynced,!enabled);assert.equal(out.calls.length,enabled?2:0);assert.equal(doc.hasAlternatives,enabled);assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);
 });
}
