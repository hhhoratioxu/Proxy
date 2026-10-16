import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const licenseFiles = ['Apache-2.0.txt', 'GoogleVideo-MIT.txt', 'Noble-Ciphers-MIT.txt', 'Noble-Hashes-MIT.txt', 'Fflate-MIT.txt'];
const licenses = await Promise.all(licenseFiles.map(async file => file + '\n' + await readFile('licenses/' + file, 'utf8')));
const notice = await readFile('NOTICE', 'utf8');
const banner = '/*! YouTube Enhance 0.1.0\n' + notice + '\n' + licenses.join('\n\n') + '\n*/';
await mkdir('dist', { recursive: true });
for (const [entry, format, output] of [['egern', 'esm', 'youtube-egern.js'], ['proxy', 'iife', 'youtube-proxy.js']]) {
  await build({ entryPoints: ['src/' + entry + '.mjs'], bundle: true, format, platform: 'browser', target: ['es2020'], outfile: 'dist/' + output, minify: true, legalComments: 'inline', banner: { js: banner }, charset: 'utf8' });
}
const sums = {};
for (const file of ['youtube-egern.js', 'youtube-proxy.js']) {
  const data = await readFile('dist/' + file); sums[file] = createHash('sha256').update(data).digest('hex');
  console.log(file, data.length, 'bytes', sums[file]);
}
await writeFile('dist/SHA256.json', JSON.stringify(sums, null, 2) + '\n');
