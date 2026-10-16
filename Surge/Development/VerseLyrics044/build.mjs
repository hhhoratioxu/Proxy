import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const core=read('./core/spotify-lyrics.js'),notice=read('./core/NOTICE-UNICODE.txt'),adapter=read('./native-adapter.js');
const gitSHA=s=>createHash('sha1').update(`blob ${Buffer.byteLength(s)}\0`).update(s).digest('hex');
function fn(name){const m=core.match(new RegExp('^function '+name+'\\([^]*?^}', 'm'));if(!m)throw Error('Missing function '+name);return m[0];}
const names=['INTERNAL','HOST','LYRIC_URL','META_URL','EXTENDED_URL','SCROLL_URL','LANGUAGES','SOURCES','LYRICS_GATE_URL','PLAYER_ENTRY_URL','str','truth'];
const declarations=names.map(n=>{const m=core.match(new RegExp('^const '+n+' = .+$','m'));if(!m)throw Error(n);return m[0];});
const request=`/* VerseLyrics 0.4.4 lightweight request hook. Generated from the shared core. */
${declarations.join('\n')}
${['header','settings','fallbackFormat'].map(fn).join('\n')}
export default async function(ctx) {
  if (!ctx.request || ctx.response || header(ctx.request.headers, INTERNAL)) return;
  const url=str(ctx.request.url), lyric=LYRIC_URL.test(url);
  if(!lyric && ![META_URL,EXTENDED_URL,SCROLL_URL,LYRICS_GATE_URL,PLAYER_ENTRY_URL].some(r=>r.test(url)))return;
  let config;try{config=settings(ctx.env);}catch{return;}
  if(lyric ? !config.translate && config.provider === "off" : !config.discover || config.provider === "off")return;
  const headers=ctx.request.headers;
  for(const name of ["If-None-Match","If-Modified-Since","Accept-Encoding","Cache-Control"])headers.delete(name);
  headers.set("Accept-Encoding","identity");headers.set("Cache-Control","no-cache");
  if(lyric && fallbackFormat(ctx)==="protobuf" && !/protobuf|octet-stream|json/i.test(header(headers,"Accept")))headers.set("Accept","application/x-protobuf");
  return {headers};
}
`;
writeFileSync(new URL('./request-core.js',import.meta.url),request);
const clean=core.replace(/^export\s*\{[^}]*\};\s*/gm,'');
const strip=s=>{const r=s.replace(/^export default async function\(ctx\)/m,'async function verseLyricsCore(ctx)');if(/^export\s/m.test(r))throw Error('Unhandled export');return r;};
const requestAdapter=adapter.slice(0,adapter.indexOf('function nativeBytes'))+adapter.slice(adapter.indexOf('function nativeArguments'),adapter.indexOf('function nativeHTTP'))+`
try {
  if(typeof $request === "undefined" || !$request?.url || (typeof $response !== "undefined" && $response)) nativeDone({});
  else Promise.resolve(verseLyricsCore({request:{url:$request.url,headers:new NativeHeaders($request.headers)},env:nativeArguments()}))
    .then(r=>nativeDone(r?.headers?{headers:r.headers.native()}:{}),()=>nativeDone({}));
} catch { nativeDone({}); }
`;
const manifest=[];
function save(path,body){const url=new URL('./runtime/'+path,import.meta.url);mkdirSync(new URL('./',url),{recursive:true});writeFileSync(url,body);manifest.push({path,bytes:Buffer.byteLength(body),sha:gitSHA(body),sha256:createHash('sha256').update(body).digest('hex')});}
for(const client of ['Surge','Loon','Shadowrocket','QuantumultX']){
  save(client+'/script/SpotifyLyrics.js',`/* VerseLyrics ${client} adapter 3; core 0.4.4.\n * Original host bridge. No external JavaScript runtime.\n */\n/*\n${notice}*/\n(() => {\n"use strict";\n${strip(clean)}\n${adapter.replace('__CLIENT__',client)}\n})();\n`);
  save(client+'/script/SpotifyLyrics.Request.js',`(() => {\n"use strict";\n${strip(request)}\n${requestAdapter.replace('__CLIENT__',client)}\n})();\n`);
}
save('Egern/script/SpotifyLyrics/spotify-lyrics.js',`/* VerseLyrics 0.4.4 — Egern native ctx module. */\n/*\n${notice}*/\n${clean}`);
save('Egern/script/SpotifyLyrics/spotify-lyrics-request.js',request);
save('Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt',notice);
writeFileSync(new URL('./runtime-manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest.map(({path,bytes})=>({path,bytes}))));
