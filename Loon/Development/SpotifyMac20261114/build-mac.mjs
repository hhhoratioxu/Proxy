// Build a local Mac transport comparison from the unchanged official 3.2.2.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {debugWrap} from './debug-wrap.mjs';
import {macDisplay} from './mac-display.mjs';
import {refreshTestMetadata} from './cache-probe.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const here=fileURLToPath(new URL('.',import.meta.url));
const commit='10049053ce86bd992e3ebb6511ffb28312ba86fb';
const source='Surge/Development/VerseLyrics322/';
const git=path=>execFileSync('git',['show',commit+':'+path],{cwd:root,maxBuffer:4*1024*1024});
const sha=data=>createHash('sha256').update(data).digest('hex');
const scratch=mkdtempSync(join(tmpdir(),'verselyrics-mac-'));
const files=['build.mjs','native-flow.mjs','native-adapter.js','core/spotify-lyrics.js','core/NOTICE-UNICODE.txt'];
const provenance=[];
try {
  for(const file of files){const data=git(source+file);const dest=join(scratch,file);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,data);provenance.push({file,sha256:sha(data)});}
  symlinkSync(join(here,'node_modules'),join(scratch,'node_modules'),'dir');
  let build=readFileSync(join(scratch,'build.mjs'),'utf8');
  const skip="if(client !== 'Loon') await save(client+'/script/SpotifyLyrics.Request.js'";
  if(!build.includes(skip))throw Error('Baseline request-builder boundary changed');
  build=build.replace(skip,"await save(client+'/script/SpotifyLyrics.Request.js'");
  // OPTIONS is a browser preflight, not a request for lyric or metadata bodies.
  const guard='if(typeof $request === "undefined" || !$request?.url || (typeof $response !== "undefined" && $response))';
  if(!build.includes(guard))throw Error('Baseline request guard changed');
  build=build.replace(guard,'if(typeof $request === "undefined" || !$request?.url || !["GET","POST","PUT"].includes(String($request.method||"").toUpperCase()) || (typeof $response !== "undefined" && $response))');
  const clientLoop="for(const client of ['Surge','Loon','Shadowrocket','QuantumultX']){";
  const egernStart="await save('Egern/script/SpotifyLyrics/spotify-lyrics.js'";
  if(!build.includes(clientLoop)||!build.includes(egernStart))throw Error('Baseline target build boundaries changed');
  build=build.replace(clientLoop,"for(const client of ['Loon']){");
  build=build.slice(0,build.indexOf(egernStart))+'console.log("Built Loon target only");\n';
  writeFileSync(join(scratch,'build.mjs'),build);
  execFileSync(process.execPath,[join(scratch,'build.mjs')],{stdio:'pipe',maxBuffer:1024*1024});
  const out=join(here,'runtime');mkdirSync(out,{recursive:true});
  const artifacts=[];
  const coreSource=git(source+'core/spotify-lyrics.js').toString();
  const codec=['utf8Size','putUTF8','utf8','text'].map(name=>{const m=coreSource.match(new RegExp('^function '+name+'\\([^]*?^}', 'm'));if(!m)throw Error('Missing baseline codec '+name);return m[0];}).join('\n');
  for(const name of ['SpotifyLyrics.Request.js','SpotifyLyrics.js','SpotifyLyrics.Entry.js']){
    const data=readFileSync(join(scratch,'runtime/Loon/script',name));
    if(name!=='SpotifyLyrics.Request.js'&&!data.equals(git('Loon/script/'+name)))throw Error('Response runtime drift: '+name);
    writeFileSync(join(out,name),data);artifacts.push({file:'runtime/'+name,bytes:data.length,sha256:sha(data),unchangedOfficial:name!=='SpotifyLyrics.Request.js'});
    if(name==='SpotifyLyrics.js')writeFileSync(join(out,'SpotifyLyrics.Debug.js'),debugWrap(data.toString(),'lyrics'));
    if(name==='SpotifyLyrics.js'){
      const wrapped='(function(hostDone){\nconst LIMIT=262144;let TEXT_UNITS;\n'+codec+'\n'+macDisplay.toString()+'\nconst $done=output=>hostDone(macDisplay($response,output,typeof $argument==="undefined"?{}:$argument,{text,utf8}));\n'+data.toString()+'\n})($done);\n';
      writeFileSync(join(out,'SpotifyLyrics.Mac.js'),wrapped);artifacts.push({file:'runtime/SpotifyLyrics.Mac.js',bytes:Buffer.byteLength(wrapped),sha256:sha(wrapped),unchangedOfficial:false});
    }
  }
  const requestCore=readFileSync(join(out,'SpotifyLyrics.Request.js'),'utf8');
  const wireCodec=['join','uint','vint','scanFields','fields','dataField','replaceField'].map(name=>{const m=coreSource.match(new RegExp('^function '+name+'\\([^]*?^}', 'm'));if(!m)throw Error('Missing baseline wire codec '+name);return m[0];}).join('\n');
  const cacheProbe='(function(hostDone){\nconst LIMIT=65536;let TEXT_UNITS;\n'+codec+'\n'+wireCodec+'\n'+refreshTestMetadata.toString()+`\nlet finished=false;
const $done=output=>{let stats={queries:0,changed:0};const result=refreshTestMetadata($request,output,{fields,text,dataField,replaceField,join},s=>stats=s);
function done(){if(!finished){finished=true;hostDone(result);}}
try{$httpClient.post({url:"http://127.0.0.1:18765/events",headers:{"Content-Type":"application/json"},body:JSON.stringify({phase:"cache-probe",route:"metadata-cache",method:$request.method,bytes:$request.body?.length||0,outputBytes:result?.body?.length||0,flags:[{path:"queries",value:stats.queries},{path:"removed",value:stats.changed},{path:"headerHook",value:Boolean(output?.headers)},{path:"responseGlobal",value:typeof $response!=="undefined"&&Boolean($response)},{path:"body.view",value:ArrayBuffer.isView($request.body)},{path:"body.type",value:typeof $request.body},{path:"url.type",value:typeof $request.url}]}),timeout:300,node:"DIRECT","auto-cookie":false,"auto-redirect":false,"binary-mode":false,insecure:false},done);}catch{done();}
};\n`+requestCore+'\n})($done);\n';
  writeFileSync(join(out,'SpotifyLyrics.CacheProbe2.js'),cacheProbe);
  // Observed Mac ConnectState 200: valid known protobuf, no recognized MIME.
  // Only this exact route may reach the existing strict wire parser without a
  // Content-Type. Unknown structure still returns the original bytes.
  const typeGuard='if(format==="protobuf"&&!/protobuf|octet-stream/i.test(type))return {body:bytes};';
  if(!coreSource.includes(typeGuard))throw Error('Baseline player MIME guard changed');
  writeFileSync(join(scratch,'core/spotify-lyrics.js'),coreSource.replace(typeGuard,'if(format==="protobuf"&&!/protobuf|octet-stream/i.test(type)&&!(connect&&!type))return {body:bytes};'));
  execFileSync(process.execPath,[join(scratch,'build.mjs')],{stdio:'pipe',maxBuffer:1024*1024});
  const macEntry=readFileSync(join(scratch,'runtime/Loon/script/SpotifyLyrics.Entry.js'));
  writeFileSync(join(out,'SpotifyLyrics.Entry.Mac.js'),macEntry);
  writeFileSync(join(out,'SpotifyLyrics.Entry.Mac.TypesDebug.js'),debugWrap(macEntry.toString(),'entry'));
  artifacts.push({file:'runtime/SpotifyLyrics.Entry.Mac.js',bytes:macEntry.length,sha256:sha(macEntry),unchangedOfficial:false});
  const official=git('Loon/script/SpotifyLyrics.lpx').toString();
  const lyric=official.split('\n').find(s=>s.startsWith('response if '));
  const entry=official.split('\n').find(s=>s.startsWith('response if ')&&s.includes('SpotifyLyrics.Entry.js'));
  const urlExpr=line=>line.slice('response if '.length,line.indexOf(' && ${response.status}'));
  const lyricURL=lyric.slice('response if '.length,lyric.indexOf(' && ('));
  const internal='(${request.header[\'x-verselyrics-internal\']} == null || ${request.header[\'x-verselyrics-internal\']} == "")';
  const method='(${request.method} == "GET" || ${request.method} == "POST" || ${request.method} == "PUT")';
  const args=lyric.match(/, (\{\$\{TRANSLATION_ENABLED\}[^]*?\})\) with/)[1];
  const request='request if ('+lyricURL+' || '+urlExpr(entry)+') && '+method+' && '+internal+' then script("http://127.0.0.1:18765/SpotifyLyrics.Request.js", '+args+') with tag="VerseLyrics Mac Request", timeout=1';
  let profile=official.replace(/^#!name = .*$/m,'#!name = Spotify 双语歌词 · VerseLyrics Mac 本地测试')
    .replace(/^#!desc = .*$/m,'#!desc = 与正式 3.2.2 相同核心和参数；仅对照 Mac 请求头传递与 OPTIONS 预检，尚未验收。')
    .replace(/^#!date = .*$/m,'#!date = 2026-11-14\n#!system = macOS')
    .replace(/\[Rewrite\][^]*?(?=\[Script\])/,'')
    .replace('[Script]','[Script]\n'+request)
    .replaceAll('response if ','response if '+method+' && ')
    .replace(/https:\/\/raw\.githubusercontent\.com\/hhhoratioxu\/Proxy\/[0-9a-f]{40}\/Loon\/script\//g,'http://127.0.0.1:18765/');
  writeFileSync(join(here,'Mac.lpx'),profile);artifacts.push({file:'Mac.lpx',bytes:Buffer.byteLength(profile),sha256:sha(profile)});
  writeFileSync(join(here,'DebugMac.lpx'),profile.replace('Mac 本地测试','Mac 本地执行核对').replaceAll('/SpotifyLyrics.js','/SpotifyLyrics.Debug.js').replaceAll('/SpotifyLyrics.Entry.js','/SpotifyLyrics.Entry.Mac.TypesDebug.js'));
  const displayProfile=profile.replace('Mac 本地测试','Mac 双语显示测试').replace(/^#!desc = .*$/m,'#!desc = 正式 3.2.2 核心；Mac JSON 逐行原词下方显示已有译文，保留时间轴。补词入口尚未验收，本地未发布。').replaceAll('/SpotifyLyrics.js','/SpotifyLyrics.Mac.js').replaceAll('/SpotifyLyrics.Entry.js','/SpotifyLyrics.Entry.Mac.js');
  writeFileSync(join(here,'DisplayMac.lpx'),displayProfile);artifacts.push({file:'DisplayMac.lpx',bytes:Buffer.byteLength(displayProfile),sha256:sha(displayProfile)});
  const probeRule='request if ${url} ~= /^https:\\/\\/(?:spclient\\.wg|[a-z0-9-]+-spclient)\\.spotify\\.com(?::443)?\\/extended-metadata\\/v0\\/extended-metadata\\/?(?:\\?.*)?$/ && ${request.method} == "POST" && (${request.header[\'Content-Length\']} == null || ${request.header[\'Content-Length\']} ~= /^(?:[0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-6])$/) && '+internal+' then script("http://127.0.0.1:18765/SpotifyLyrics.CacheProbe2.js", '+args+') with tag="VerseLyrics Mac Cache Probe", timeout=1, requires_body=true, binary_body_mode=true';
  writeFileSync(join(here,'CacheProbe.lpx'),readFileSync(join(here,'DebugMac.lpx'),'utf8').replace('Mac 本地执行核对','Mac 单曲缓存核对').replace('[Script]','[Script]\n'+probeRule));
  writeFileSync(join(here,'build-manifest.json'),JSON.stringify({baseline:commit,provenance,artifacts},null,2)+'\n');
  console.log(JSON.stringify(artifacts));
} finally {rmSync(scratch,{recursive:true,force:true});}
