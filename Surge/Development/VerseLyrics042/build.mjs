import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const core=read('./core/spotify-lyrics.js'),notice=read('./core/NOTICE-UNICODE.txt'),adapter=read('./native-adapter.js');
const gitSHA=s=>createHash('sha1').update(`blob ${Buffer.byteLength(s)}\0`).update(s).digest('hex');
if(gitSHA(core)!=='9a883bea34f33194684baeb2a6800d06bd25f534')throw Error('Core must match the published Loon 0.4.2 implementation');
const clean=core.replace(/^export\s*\{[^}]*\};\s*/gm,'');
const stripped=clean.replace(/^export default async function\(ctx\)/m,'async function verseLyricsCore(ctx)');
if(/^export\s/m.test(stripped))throw Error('Unhandled export');
function save(path,body){const url=new URL('./runtime/'+path,import.meta.url);mkdirSync(new URL('./',url),{recursive:true});writeFileSync(url,body);console.log(JSON.stringify({path,bytes:Buffer.byteLength(body),sha:gitSHA(body)}));}
for(const client of ['Surge','Loon','Shadowrocket','QuantumultX']){
  const body=`/* VerseLyrics ${client} adapter 1; core 0.4.2.\n * Original host bridge and color handling. No external JavaScript runtime.\n */\n/*\n${notice}*/\n(() => {\n"use strict";\n${stripped}\n${adapter.replace('__CLIENT__',client)}\n})();\n`;
  if(client==='Loon'&&gitSHA(body)!=='47c88e41bee432300cb90f6d4ed6345493c48d67')throw Error('Loon runtime drift');
  save(client+'/script/SpotifyLyrics.js',body);
}
save('Egern/script/SpotifyLyrics/spotify-lyrics.js',`/* VerseLyrics 0.4.2 — Egern native ctx module. */\n/*\n${notice}*/\n${clean}`);
save('Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt',notice);
