import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {invoke,seedStore,colors} from './feature-host.mjs';
import {encodeDocument,parseDocument} from './core/spotify-lyrics.js';
const baseline=process.argv[2];if(!baseline)throw Error('Pass unchanged 3.1.4 stage');
const id='1fpBhAhO9gpTwuglQfjVBh',allowed=new Set(['c.y.qq.com','music.163.com','lyrics.kugou.com','search.kuwo.cn','www.kuwo.cn','lrclib.net','api.lyrics.ovh']);
const raw=readFileSync(new URL('./user-track-metadata.json',import.meta.url)),entity=JSON.parse(raw),meta={id,title:entity.title,artists:entity.artists.map(a=>a.name),duration:entity.duration/1000,album:''};
assert.equal(entity.id,id);
const official=format=>encodeDocument({lyrics:{syncType:'UNSYNCED',provider:'Spotify',providerDisplayName:'Spotify',language:'zh',lines:[{startTimeMs:'0',words:'用于验证静态歌词替换的自写文字'},{startTimeMs:'0',words:'自写第二行'}],alternatives:[]},colors},format);
const replies=new Map(),trace=[];let phase='baseline';
async function network(url,options={},method='GET'){
 const parsed=new URL(url);assert.ok(allowed.has(parsed.host));assert.ok(!Object.keys(options.headers||{}).some(k=>/authorization|cookie|client-token/i.test(k)));
 const ms=Math.min(2500,Math.max(100,options.timeout||2500)),args=['-sS','--max-time',String(ms/1000),'--connect-timeout',String(Math.min(ms,1000)/1000),'--max-filesize','98304','--write-out','\n%{http_code}'];
 for(const [key,value] of Object.entries(options.headers||{}))args.push('--header',key+': '+value);
 if(method==='POST'){args.push('--request','POST','--data-raw',options.body||'');}args.push(url);
 const start=performance.now();let data;
 try{data=execFileSync('curl',args,{encoding:'utf8',maxBuffer:128*1024,timeout:Math.ceil(ms)+2000,stdio:['ignore','pipe','pipe']});}
 catch(error){trace.push({phase,url,method,error:'transport-failed',milliseconds:Math.round(performance.now()-start)});throw error;}
 const at=data.lastIndexOf('\n'),body=data.slice(0,at),status=Number(data.slice(at+1));assert.ok(Buffer.byteLength(body)<=98304);const response={status,body};
 trace.push({phase,url,method,status,bytes:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex'),milliseconds:Math.round(performance.now()-start)});
 if(phase==='candidate')replies.set(method+' '+url,response);
 return response;
}
const old=await invoke('Loon',{root:baseline,provider:'qq',track:id,store:seedStore(meta),status:200,responseBody:official('protobuf'),env:{TRANSLATION_ENABLED:false},network});
assert.equal(parseDocument(old.bytes,'application/x-protobuf').unsynced,true);
phase='candidate';const current=await invoke('Loon',{provider:'qq',track:id,store:seedStore(meta),status:200,responseBody:official('protobuf'),env:{TRANSLATION_ENABLED:false},network});
const doc=parseDocument(current.bytes,'application/x-protobuf');assert.equal(doc.unsynced,false);assert.ok(doc.words.length>10);assert.equal(current.calls.length,2);assert.equal(current.done,1);assert.equal(current.active,0);assert.equal(current.maxActive,1);
const replay=[];
for(const client of ['Loon','Surge','Shadowrocket','QuantumultX','Egern'])for(const format of ['json','protobuf']){
 const store=seedStore(meta),options={provider:'auto',format,track:id,store,status:200,responseBody:official(format),env:{TRANSLATION_ENABLED:false},network:async(u,o,m)=>{const r=replies.get(m+' '+u);assert.ok(r,'Only verified replies are replayed');return r;}};
 const out=await invoke(client,options),parsed=parseDocument(out.bytes,format==='json'?'application/json':'application/x-protobuf');assert.equal(parsed.unsynced,false);assert.equal(parsed.words.length,doc.words.length);assert.equal(out.calls.length,2);assert.equal(out.done,1);assert.equal(out.active,0);assert.equal(out.maxActive,1);
 const warm=await invoke(client,{...options,network:()=>{throw Error('Warm cache must not query');}});assert.equal(warm.calls.length,0);assert.deepEqual(warm.bytes,out.bytes);
 replay.push({client,format,rows:parsed.words.length,httpCalls:out.calls.length,warmHTTP:warm.calls.length,bodySHA256:createHash('sha256').update(out.bytes).digest('hex')});
}
// Do not publish downloaded lyric text or raw service bodies. Counts, timing
// tags and hashes document the real lookup; native replays use it only in RAM.
const report={version:'3.1.5',at:new Date().toISOString(),scope:'Real unauthenticated QQ catalog/lyric requests with public Spotify same-track metadata. Static official input is a self-written fixture, not captured iPhone traffic. Translation disabled only for this focused source check. Ten native client/format replays use the real replies in memory; downloaded lyrics are not published. This does not establish Spotify UI or VPN acceptance.',meta,metadataSHA256:createHash('sha256').update(raw).digest('hex'),baseline:{version:'3.1.4',static:true,httpCalls:old.calls.length},candidate:{version:'3.1.5',static:false,rows:doc.words.length,httpCalls:current.calls.length,bodySHA256:createHash('sha256').update(current.bytes).digest('hex')},trace,nativeReplays:replay};
writeFileSync(new URL('./user-track-live-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({baseline:report.baseline,candidate:report.candidate,nativeReplays:replay.length,actualRequests:trace.length}));
