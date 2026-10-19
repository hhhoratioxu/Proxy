import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {invoke,seedStore,meta,colors,sourceFixture} from './feature-host.mjs';
import {encodeDocument,parseDocument,loadCache} from './core/spotify-lyrics.js';
const id=n=>String(n).padStart(22,'0'),invalid='<html>'+'x'.repeat(90000)+'</html>',results=[];
for(const format of ['json','protobuf'])for(const kind of ['translator','first-source'])for(const [version,root]of [['3.1.2',process.argv[2]],['3.1.3',new URL('.',import.meta.url).pathname]]){
 const store=seedStore(),hash=createHash('sha256');let current=1,bad=0,other=0,completed=0,successfulFallbacks=0;
 const body=encodeDocument({lyrics:{provider:'Spotify',providerDisplayName:'Spotify',language:'en',syncType:'LINE_SYNCED',lines:[{words:'Original self-written line.',startTimeMs:'1000'}],alternatives:[]},colors},format);
 for(current=1;current<=10;current++){
  if(kind==='first-source'){const c=loadCache({storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)}});c.put('meta:'+id(current),{...meta,id:id(current),artists:['Ada North '+current]});c.put('palette:v1:'+id(current),{colors});c.save();}
  const out=await invoke('Loon',{root,format,store,track:id(current),provider:'auto',...(kind==='translator'?{status:200,responseBody:body}:{}),network:async u=>{
   if(kind==='translator'||u.includes('lrclib.net')){bad++;return {body:invalid};}other++;const r=sourceFixture('qq',u,{lines:2});if(u.includes('/soso/'))r.data.song.list[0].singer=[{name:'Ada North '+current}];return {body:JSON.stringify(r)};
  }});assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);hash.update(out.bytes);completed++;
  const d=parseDocument(out.bytes,format==='json'?'application/json':'application/x-protobuf');if(kind==='first-source'){assert.equal(d.words.length,2);assert.ok(d.hasAlternatives);successfulFallbacks++;}else assert.deepEqual(d.words,['Original self-written line.']);
 }
 assert.equal(bad,version==='3.1.2'?10:1);assert.equal(other,kind==='first-source'?20:0);results.push({version,format,kind,songs:10,completed,badHostRequests:bad,otherRequests:other,invalidBodyBytes:Buffer.byteLength(invalid)*bad,successfulFallbacks,outputSHA256:hash.digest('hex')});
}
for(const format of ['json','protobuf'])for(const kind of ['translator','first-source'])assert.equal(new Set(results.filter(r=>r.format===format&&r.kind===kind).map(r=>r.outputSHA256)).size,1);
const report={at:new Date().toISOString(),scope:'Actual compiled Loon runtimes, deterministic HTTP-200 malformed ASCII HTML reply and valid identity-checked QQ fallback mocks. Distinct artists prevent source-hint reuse. Request and payload counts are not live network timing, native buffers or VPN acceptance.',results};writeFileSync('backoff-work-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
