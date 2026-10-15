import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url);
const source = readFileSync(new URL('../SpotifyLyrics/spotify-lyrics.js', root), 'utf8');
assert.ok(source.includes('const VERSION = "0.3.3";'));
const entry = 'export default async function(ctx) {';
const catcher = '} catch { status(ctx, "响应结构不支持或处理失败，已保留原响应。"); return unchanged(); }';
assert.equal(source.split(entry).length, 2);
assert.equal(source.split(catcher).length, 2);
const processor = source.replace(entry, 'async function handleLyrics(ctx) {').replace(catcher,
  '} catch (error) { try { ctx.diagnosticError?.(error); } catch { } status(ctx, "响应结构不支持或处理失败，已保留原响应。"); return unchanged(); }');
const layer = readFileSync(new URL('notification-layer.js', root), 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const bundle = '// Generated from the original VerseLyrics 0.3.3 and its original diagnostic adapter.\n' +
  '// Main source SHA-256: ' + hash(source) + '\n' + processor + '\n' + layer;
writeFileSync(new URL('spotify-lyrics-diagnostics.js', root), bundle);
writeFileSync(new URL('build-info.json', root), JSON.stringify({
  version: '0.3.3-diag.1', processorVersion: '0.3.3', sourceSha256: hash(source),
  adapterSha256: hash(layer), bundleSha256: hash(bundle),
  changesToProcessor: ['rename entry point for wrapper', 'report a safe processing-error code before the existing pass-through'],
  scope: 'Self-contained original source; no external runtime imports. Diagnostic notifications do not assert that missing native lyrics are fixed.'
}, null, 2) + '\n');
console.log(JSON.stringify({version:'0.3.3-diag.1', bundleBytes:Buffer.byteLength(bundle), bundleSha256:hash(bundle)}));
