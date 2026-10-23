import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {invoke} from './feature-host.mjs';
import {parseDocument} from './core/spotify-lyrics.js';
const exec=promisify(execFile),id='5gjHrjV4IhqPqoDHQUAriQ',store=new Map(),transports=[];
const start=performance.now();
const out=await invoke('Loon',{track:id,format:'protobuf',provider:'auto',store,env:{TRANSLATION_ENABLED:false},network:async(u,o,method)=>{
 const url=new URL(u);
 if(!['open.spotify.com','lrclib.net','c.y.qq.com','music.163.com','lyrics.kugou.com','search.kuwo.cn','www.kuwo.cn','api.lyrics.ovh'].includes(url.host))throw Error('Unexpected service');
 const begin=performance.now(),args=['-sS','--compressed','--max-time',String(o.timeout/1000),'--max-filesize',url.host==='open.spotify.com'?'262144':'98304','-w','\n%{http_code}'];
 for(const [k,v]of Object.entries(o.headers||{})){if(/authorization|cookie|token/i.test(k))throw Error('Unexpected credential');args.push('-H',k+': '+v);}
 if(method==='POST')args.push('--data-raw',String(o.body));
 args.push(u);
 try{
  const r=await exec('curl',args,{maxBuffer:270000}),at=r.stdout.lastIndexOf('\n'),body=r.stdout.slice(0,at),status=Number(r.stdout.slice(at+1));
  transports.push({host:url.host,path:url.pathname,status,bytes:Buffer.byteLength(body),milliseconds:performance.now()-begin});
  return{body,status};
 }catch(e){transports.push({host:url.host,path:url.pathname,error:'curl-'+e.code,milliseconds:performance.now()-begin});throw Error('Public transport failed');}
}});
let parsed;try{parsed=parseDocument(out.bytes,'application/x-protobuf');}catch{}
const warm=parsed?.words?.length?await invoke('Loon',{track:id,format:'protobuf',provider:'auto',store,env:{TRANSLATION_ENABLED:false},network:()=>{throw Error('Warm reopen sent a request');}}):null;
const report={at:new Date().toISOString(),scope:'Compiled Loon runtime, empty plugin storage, real anonymous public metadata and fallback service requests, simulated official HTTP 404. No actual phone request, protected Spotify lyrics or iPhone/VPN acceptance. Translation disabled for this real-song probe; translation behavior tested separately with self-written rows.',track:id,transport:transports,flowMs:performance.now()-start,lines:parsed?.words?.length||0,synced:parsed?.unsynced===false,outputSHA256:createHash('sha256').update(out.bytes).digest('hex'),coldHTTP:out.calls.length,warmHTTP:warm?.calls.length,warmIdentical:warm?warm.bytes.equals(out.bytes):false,done:out.done,active:out.active,maxActive:out.maxActive,cacheCharacters:store.get('VerseLyrics.v1.cache')?.length||0};
writeFileSync('live-source-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(report.lines!==42||!report.synced||report.warmHTTP!==0||!report.warmIdentical||report.done!==1||report.active!==0||report.maxActive!==1)process.exitCode=1;
