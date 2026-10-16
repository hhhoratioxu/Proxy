import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const core=read('./core/spotify-lyrics.js'),notice=read('./core/NOTICE-UNICODE.txt'),adapter=read('./native-adapter.js');
const gitSHA=s=>createHash('sha1').update(`blob ${Buffer.byteLength(s)}\0`).update(s).digest('hex');
function fn(name){const m=core.match(new RegExp('^function '+name+'\\([^]*?^}', 'm'));if(!m)throw Error('Missing function '+name);return m[0];}
const names=['INTERNAL','HOST','LYRIC_URL','META_URL','EXTENDED_URL','SCROLL_URL','LANGUAGES','SOURCES','LYRICS_GATE_URL','PLAYER_ENTRY_URL','str','truth'];
const declarations=names.map(n=>{const m=core.match(new RegExp('^const '+n+' = .+$','m'));if(!m)throw Error(n);return m[0];});
const request=`/* VerseLyrics 0.4.10 lightweight request hook. Generated from the shared core. */
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
// Small entry-only bundle: no lyric providers, translation engine or Han tables.
let entry = clean;
entry = entry.slice(0,entry.indexOf('// BEGIN GENERATED HAN VARIANTS')) + entry.slice(entry.indexOf('function header('));
entry = entry.slice(0,entry.indexOf('function checkTranslationRows(')) + entry.slice(entry.indexOf('function parseMetadata('));
entry = entry.slice(0,entry.indexOf('function cooldown(')) + clean.match(/^async function readBody\([^]*?^}/m)[0] + '\n' + entry.slice(entry.indexOf('function cacheMetadata('));
entry = entry.slice(0,entry.indexOf('async function metadata(')) + entry.slice(entry.indexOf('function responseHeaders('));
entry = entry.replace('  state.network = networkLease(ctx,state.deadline);','');
entry = entry.replace('  if (lyric) state.work = lyricWork(ctx,lyric[2]);','');
const lyricStart = entry.indexOf('    const contentType = header(ctx.response.headers, "Content-Type");');
const lyricEnd = entry.indexOf('  } catch { status(ctx, "响应结构不支持或处理失败',lyricStart);
entry = entry.slice(0,lyricStart) + '    return unchanged();\n' + entry.slice(lyricEnd);
entry = entry.replace('export default async function(ctx) {','export default async function(ctx) {\n  if (LYRIC_URL.test(str(ctx.request?.url))) return;');
const entryAdapter = (adapter.slice(0,adapter.indexOf('function nativeHTTP(')) + adapter.slice(adapter.indexOf('const nativeStorage'))).replace('ctx.response ? 12000 : 2500','2500');
// The lyric hook does not need bootstrap/card/context entry rewriting. Keep
// metadata decoders used by fallback lookups, and preserve the exact lyric path.
let lyrics = clean.slice(0,clean.indexOf('// Original, narrowly scoped iOS lyric-entry'));
lyrics = lyrics.replace(/^function scrollDocument\([^]*?^}\n/m,'');
const main = lyrics.indexOf('export default async function(ctx) {');
const guards = lyrics.indexOf('  const url = str(ctx.request.url), lyric = LYRIC_URL.exec(url), metaURL',main);
if(main < 0 || guards < 0)throw Error('Missing lyric main boundaries');
lyrics = lyrics.slice(0,main)+'export default async function(ctx) {\n  if (!ctx.request) return;\n'+lyrics.slice(guards);
lyrics = lyrics.replace('const url = str(ctx.request.url), lyric = LYRIC_URL.exec(url), metaURL = META_URL.exec(url), extended = EXTENDED_URL.exec(url), scroll = SCROLL_URL.exec(url);','const url = str(ctx.request.url), lyric = LYRIC_URL.exec(url);');
lyrics = lyrics.replace('(!lyric && !metaURL && !extended && !scroll)','!lyric');
const entryStart = lyrics.indexOf('    if (scroll) {',lyrics.indexOf('export default'));
const entryEnd = lyrics.indexOf('    const contentType = header(ctx.response.headers, "Content-Type");',entryStart);
if(entryStart < 0 || entryEnd < 0)throw Error('Missing entry branch boundaries');
lyrics = lyrics.slice(0,entryStart)+lyrics.slice(entryEnd);
lyrics = lyrics.replace('const url = str(ctx.request?.url), lyric = LYRIC_URL.exec(url), meta = META_URL.exec(url), scroll = SCROLL_URL.exec(url);','const url = str(ctx.request?.url), lyric = LYRIC_URL.exec(url);');
lyrics = lyrics.replace(/^      route: lyric \? "lyrics"[^\n]+/m,'      route: lyric ? "lyrics" : "manual",');
lyrics = lyrics.replace('...(lyric || scroll ? { trackId: (lyric || scroll)[2] } : {})','...(lyric ? { trackId: lyric[2] } : {})');
for(const name of ['LYRICS_SECTION','META_URL','EXTENDED_URL','SCROLL_URL'])lyrics=lyrics.replace(new RegExp('^const '+name+' = .+\\n','m'),'');
const manifest=[];
function save(path,body){const url=new URL('./runtime/'+path,import.meta.url);mkdirSync(new URL('./',url),{recursive:true});writeFileSync(url,body);manifest.push({path,bytes:Buffer.byteLength(body),sha:gitSHA(body),sha256:createHash('sha256').update(body).digest('hex')});}
for(const client of ['Surge','Loon','Shadowrocket','QuantumultX']){
  save(client+'/script/SpotifyLyrics.js',`/* VerseLyrics ${client} adapter 8; core 0.4.10.\n * Original host bridge. No external JavaScript runtime.\n */\n/*\n${notice}*/\n(() => {\n"use strict";\n${strip(lyrics)}\n${adapter.replace('__CLIENT__',client)}\n})();\n`);
  save(client+'/script/SpotifyLyrics.Entry.js',`/* VerseLyrics ${client} lightweight entry 0.4.10. */\n(() => {\n"use strict";\n${strip(entry)}\n${entryAdapter.replace('__CLIENT__',client)}\n})();\n`);
  save(client+'/script/SpotifyLyrics.Request.js',`(() => {\n"use strict";\n${strip(request)}\n${requestAdapter.replace('__CLIENT__',client)}\n})();\n`);
}
save('Egern/script/SpotifyLyrics/spotify-lyrics.js',`/* VerseLyrics 0.4.10 — Egern native ctx module. */\n/*\n${notice}*/\n${lyrics}`);
save('Egern/script/SpotifyLyrics/spotify-lyrics-entry.js',entry);
save('Egern/script/SpotifyLyrics/spotify-lyrics-request.js',request);
save('Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt',notice);
writeFileSync(new URL('./runtime-manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest.map(({path,bytes})=>({path,bytes}))));
