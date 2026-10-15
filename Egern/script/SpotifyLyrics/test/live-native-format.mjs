// Real fallback provider; captured public metadata; synthetic iOS 404 envelope.
// Packet bodies stay in a temporary directory and are never publication evidence.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import old from '../spotify-lyrics-0.4.0.js';import run from '../spotify-lyrics.js';
const exec=promisify(execFile),target=JSON.parse(readFileSync(new URL('./fixtures/target-song.json',import.meta.url),'utf8'));
const packets=mkdtempSync(join(tmpdir(),'verselyrics-native-format-packets-')),store=new Map(),calls=[];
async function request(url,options={}){
 assert.ok(['lrclib.net','c.y.qq.com','music.163.com'].includes(new URL(url).hostname));assert.equal(options.headers?.Authorization,undefined);
 const args=['-sS','--max-time',String(Math.ceil((options.timeout||5500)/1000))];for(const [key,value] of Object.entries(options.headers||{}))args.push('--header',key+': '+value);if(options.body!==undefined)args.push('--data-raw',options.body);args.push('--write-out','\n__STATUS__%{http_code}',url);
 const {stdout}=await exec('/usr/bin/curl',args,{maxBuffer:3*1024*1024});const at=stdout.lastIndexOf('\n__STATUS__'),status=Number(stdout.slice(at+11));assert.ok(at>=0&&status>=100);calls.push({host:new URL(url).hostname,status});return new Response(stdout.slice(0,at),{status});
}
const storage={getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))};
const base={env:{TRANSLATION_ENABLED:'false'},storage,http:{get:request,post:request}};
await old({...base,request:{url:'https://spclient.wg.spotify.com/metadata/4/track/'+target.track_hex,headers:new Headers()},response:new Response(Buffer.from(target.metadata_base64,'base64'),{headers:{'Content-Type':'application/x-protobuf'}})});
function missing(){return {...base,request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+target.track_id,headers:new Headers({Accept:'*/*','app-platform':'iOS','spotify-app-version':'9.1.92.3058'})},response:new Response('{"error":"not found"}',{status:404,headers:{'Content-Type':'application/json'}})};}
const previous=await old(missing());assert.equal(previous.status,200);assert.match(previous.headers.get('Content-Type'),/json/);const beforeCalls=calls.length;
const current=await run(missing());assert.equal(current.status,200);assert.match(current.headers.get('Content-Type'),/protobuf/);assert.equal(calls.length,beforeCalls);
writeFileSync(join(packets,'old.json'),previous.body);writeFileSync(join(packets,'native.pb'),current.body);
const report={date:new Date().toISOString(),trackId:target.track_id,version:'0.4.1',requestAccept:'*/*',upstreamStatus:404,upstreamErrorContentType:'application/json',oldOutputContentType:previous.headers.get('Content-Type'),newOutputContentType:current.headers.get('Content-Type'),oldSha256:createHash('sha256').update(previous.body).digest('hex'),newSha256:createHash('sha256').update(current.body).digest('hex'),newBytes:current.body.length,providerCalls:calls,cachedProviderDataReused:true,scope:'Live lyric provider and captured public metadata; synthetic iOS 404, not a phone capture.',deviceVerified:false};
writeFileSync(join(packets,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({packets,report}));
