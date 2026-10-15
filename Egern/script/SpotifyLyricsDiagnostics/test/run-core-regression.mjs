import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url),base=new URL('../SpotifyLyrics/test/',root);
const source=readFileSync(new URL('spotify-lyrics.test.mjs',base),'utf8');
const bundle=new URL('spotify-lyrics-diagnostics-2.js',root).href,fixtures=new URL('fixtures/',base).href;
const generated=source.replace("'../spotify-lyrics.js'",JSON.stringify(bundle)).replaceAll("'./fixtures/","'"+fixtures);
const temp=mkdtempSync(join(tmpdir(),'verselyrics-diag-regression-'));
try {
  const path=join(temp,'core-regression.mjs');writeFileSync(path,generated);
  const result=spawnSync(process.execPath,['--test',path],{stdio:'inherit'});process.exitCode=result.status??1;
} finally {rmSync(temp,{recursive:true,force:true});}
