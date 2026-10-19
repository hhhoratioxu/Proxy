import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const notices=await readFile('NOTICE','utf8');
const files=['LICENSE','licenses/protocol-MIT.txt','licenses/youtube-x-MIT.txt','licenses/noble-ciphers-MIT.txt','licenses/noble-hashes-MIT.txt','licenses/fflate-MIT.txt'];
const licenses=await Promise.all(files.map(async path=>path+'\n'+await readFile(path,'utf8')));
const banner='/*! Horatio YouTube Clean 1.2.9\n'+notices+'\n'+licenses.join('\n\n')+'\n*/';
await mkdir('dist',{recursive:true});const sums={};
for(const [entry,format,name]of [['egern','esm','egern.js'],['clients','iife','clients.js']]){
  await build({entryPoints:['src/'+entry+'.mjs'],outfile:'dist/'+name,bundle:true,platform:'browser',format,target:['es2020'],minify:true,charset:'utf8',banner:{js:banner},legalComments:'inline'});
  const bytes=await readFile('dist/'+name);sums[name]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
await writeFile('dist/SHA256.json',JSON.stringify(sums,null,2)+'\n');console.log(JSON.stringify(sums));
