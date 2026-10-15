import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url);
const source = readFileSync(new URL('legacy/processor-0.3.3.js', root), 'utf8');
assert.ok(source.includes('const VERSION = "0.3.3";'));
const entry = 'export default async function(ctx) {';
const catcher = '} catch { status(ctx, "响应结构不支持或处理失败，已保留原响应。"); return unchanged(); }';
assert.equal(source.split(entry).length, 2);
assert.equal(source.split(catcher).length, 2);
const processor = source.replace(entry, 'async function handleLyrics(ctx) {').replace(catcher,
  '} catch (error) { try { ctx.diagnosticError?.(error); } catch { } status(ctx, "响应结构不支持或处理失败，已保留原响应。"); return unchanged(); }');
const layer = readFileSync(new URL('notification-layer.js', root), 'utf8');
const gate = readFileSync(new URL('lyrics-entry-gate.js', root), 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const bundle = '// Generated from the original VerseLyrics 0.3.3 and its original diagnostic adapter.\n' +
  '// Main source SHA-256: ' + hash(source) + '\n' + processor + '\n' + gate + '\n' + layer;
const bundleFile = 'spotify-lyrics-diagnostics-3.js';
writeFileSync(new URL(bundleFile, root), bundle);
writeFileSync(new URL('build-info.json', root), JSON.stringify({
  version: '0.3.3-diag.3', processorVersion: '0.3.3', bundleFile, sourceSha256: hash(source),
  adapterSha256: hash(layer), gateSha256: hash(gate), bundleSha256: hash(bundle),
  changesToProcessor: ['rename entry point for wrapper', 'report a safe processing-error code before the existing pass-through'],
  scope: 'Self-contained original source and a narrow iOS lyric-entry flag candidate; no external runtime imports. Diagnostic notifications do not assert that missing native lyrics are fixed.'
}, null, 2) + '\n');
console.log(JSON.stringify({version:'0.3.3-diag.3', bundleFile, bundleBytes:Buffer.byteLength(bundle), bundleSha256:hash(bundle)}));
