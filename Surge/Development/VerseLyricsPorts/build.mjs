import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const core = readFileSync(new URL('./core/spotify-lyrics.js', import.meta.url), 'utf8');
const blob = createHash('sha1').update(`blob ${Buffer.byteLength(core)}\0`).update(core).digest('hex');
if (blob !== '72e9b904356eac896522410a43ad7a7dbcdfd79b') throw new Error('Unexpected 0.4.1 core');
const notice = readFileSync(new URL('./core/NOTICE-UNICODE.txt', import.meta.url), 'utf8');
const adapter = readFileSync(new URL('./native-adapter.js', import.meta.url), 'utf8');
const stripped = core.replace(/^export default async function\(ctx\)/m, 'async function verseLyricsCore(ctx)').replace(/^export\s*\{[^}]*\};\s*/gm, '');
if (/^export\s/m.test(stripped)) throw new Error('unhandled export');
for (const client of ['Surge','Loon','Shadowrocket','QuantumultX']) {
  const folder = new URL(`./runtime/${client}/script/`, import.meta.url);
  mkdirSync(folder, {recursive:true});
  const body = `/* VerseLyrics ${client} adapter 1; core 0.4.1.\n * Host adapters are original code. No external JavaScript runtime.\n */\n/*\n${notice}*/\n(() => {\n"use strict";\n${stripped}\n${adapter.replace('__CLIENT__', client)}\n})();\n`;
  writeFileSync(new URL('SpotifyLyrics.js',folder), body);
  console.log(client, Buffer.byteLength(body), createHash('sha256').update(body).digest('hex'));
}
