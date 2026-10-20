import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFileSync} from 'node:fs';
import {invoke,seedStore,colors} from './feature-host.mjs';
import {encodeDocument,parseDocument} from './core/spotify-lyrics.js';
const exec=promisify(execFile),id='6n7jFn3rgC6qWjsYaPJfB8',KEY='VerseLyrics.v1.cache';
const words=['오늘은 바람이 조용합니다','이 문장은 한국어와 English words를 포함합니다','Please stay with me','오늘도 안녕하세요'];
const body=encodeDocument({lyrics:{syncType:'LINE_SYNCED',language:'ko',provider:'Spotify',providerDisplayName:'Spotify',lines:words.map((words,i)=>({words,startTimeMs:String(i*2000+1000)})),alternatives:[]},colors},'json');
const results=[];
for(const target of ['zh-CN','zh-TW']){
 const store=seedStore(),saved=JSON.parse(store.get(KEY));saved.entries.push({key:'translations:v1:'+target+':'+id,value:{pairs:words.map(s=>[s,s])},expires:Date.now()+60000});store.set(KEY,JSON.stringify(saved));
 const transports=[],start=performance.now();
 const out=await invoke('Loon',{track:id,format:'json',store,status:200,responseBody:body,env:{TARGET_LANGUAGE:target},network:async(u,o)=>{
  const url=new URL(u);if(url.host!=='translate.googleapis.com')throw Error('Unexpected host');
  const started=performance.now();const r=await exec('curl',['-fsSL','--max-time',String(o.timeout/1000),'--max-filesize','98304','-H','Accept-Encoding: identity',u],{maxBuffer:100000});
  const parsed=JSON.parse(r.stdout);transports.push({source:url.searchParams.get('sl'),rows:url.searchParams.getAll('q').length,replyBytes:Buffer.byteLength(r.stdout),milliseconds:performance.now()-started});
  return{body:r.stdout};
 }});
 const d=JSON.parse(out.bytes),translations=d.lyrics.alternatives?.[0]?.lines||[],warm=await invoke('Loon',{track:id,format:'json',store,status:200,responseBody:body,env:{TARGET_LANGUAGE:target},network:()=>{throw Error('Warm reopen must not send');}});
 results.push({target,originals:words,translations,changed:translations.filter(Boolean).length,coldHTTP:out.calls.length,warmHTTP:warm.calls.length,transport:transports,milliseconds:performance.now()-start,done:out.done,active:out.active,originalsPreserved:JSON.stringify(d.lyrics.lines.map(l=>l.words))===JSON.stringify(words)});
 if(out.done!==1||out.active!==0||warm.calls.length)throw Error('Native completion or cache contract');
}
const report={at:new Date().toISOString(),scope:'Actual public translation requests through the compiled Loon host mock with self-written Korean/English sentences and a seeded stale identity cache. Song ID identifies the reported track; input sentences are self-written, not a captured Spotify lyric response. No account credentials or song lyrics sent. Does not establish phone UI/VPN acceptance.',results};
writeFileSync('live-translation-results.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(results.some(r=>r.changed!==words.length||r.coldHTTP!==1||r.warmHTTP!==0||!r.originalsPreserved))process.exitCode=1;

