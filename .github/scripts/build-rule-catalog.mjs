import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const root = git('rev-parse', '--show-toplevel').trim();
const commit = git('rev-parse', 'HEAD').trim();
const tree = git('rev-parse', 'HEAD^{tree}').trim();
const files = git('ls-tree', '-rz', '--long', 'HEAD').split('\0').filter(Boolean).flatMap(record => {
  const match = record.match(/^\d+ blob ([a-f0-9]{40})\s+(\d+)\t(.+)$/s);
  if (!match || !/^(Loon|Surge|Clash|Egern|Shadowrocket|QuantumultX)\/rule\/[^/]+\.(lsr|list|txt|yaml|yml|mrs|dat|bin)$/.test(match[3])) return [];
  return [{ path: match[3], sha: match[1], size: +match[2] }];
});
if (!files.length) throw new Error('No native routing files found; refusing to publish an empty directory.');
files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
const snapshot = { repository: 'hhhoratioxu/Proxy', branch: 'main', commit, tree, checkedAt: new Date().toISOString(), files };
const target = resolve(root, 'Docs/RuleFinder-Catalog.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Rule Finder: ${files.length} files from ${commit}`);
