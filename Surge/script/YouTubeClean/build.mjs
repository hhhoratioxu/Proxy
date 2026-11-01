import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const notices=await readFile('NOTICE','utf8');
const files=['LICENSE','licenses/protocol-MIT.txt','licenses/youtube-x-MIT.txt','licenses/noble-ciphers-MIT.txt','licenses/noble-hashes-MIT.txt','licenses/fflate-MIT.txt'];
const licenses=await Promise.all(files.map(async path=>path+'\n'+await readFile(path,'utf8')));
const banner='/*! Horatio YouTube Clean 1.2.12\n'+notices+'\n'+licenses.join('\n\n')+'\n*/';
await mkdir('dist',{recursive:true});const sums={};
const bundles=[['egern','esm','egern.js','all'],['clients','iife','clients.js','all'],...['request','api','caption','playback'].map(lane=>['clients','iife','loon-'+lane+'.js',lane])];
const composition={};
for(const [entry,format,name,lane]of bundles){
  const result=await build({entryPoints:['src/'+entry+'.mjs'],outfile:'dist/'+name,bundle:true,platform:'browser',format,target:['es2020'],minify:true,charset:'utf8',banner:{js:banner},legalComments:'inline',define:{__YT_LANE__:JSON.stringify(lane),__YT_LOON__:String(lane!=='all'),...Object.fromEntries(['request','api','caption','playback'].map(x=>['__YT_'+x.toUpperCase()+'__',String(lane==='all'||lane===x)]))},metafile:true});
  composition[name]=Object.fromEntries(Object.entries(result.metafile.outputs['dist/'+name].inputs).map(([path,value])=>[path,value.bytesInOutput]).filter(([,bytes])=>bytes));
  const bytes=await readFile('dist/'+name);sums[name]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
await writeFile('dist/composition.json',JSON.stringify(composition,null,2)+'\n');
await writeFile('dist/SHA256.json',JSON.stringify(sums,null,2)+'\n');console.log(JSON.stringify(sums));
