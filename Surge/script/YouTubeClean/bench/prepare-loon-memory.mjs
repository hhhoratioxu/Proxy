import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const [dir]=process.argv.slice(2);if(!dir)throw Error('output directory required');
const out=spawnSync(process.execPath,[fileURLToPath(new URL('./prepare-memory.mjs',import.meta.url)),dir],{encoding:'utf8'});if(out.status!==0)throw Error(out.stderr||out.stdout);
const cases=JSON.parse(await readFile(join(dir,'cases.json'),'utf8'));
await writeFile(join(dir,'request-header.body'),new Uint8Array());
cases.push({name:'request-header',phase:'request',url:'https://youtubei.googleapis.com/youtubei/v1/browse',requestHeaders:{'If-None-Match':'self-written cache','x-youtube-hot-hash-data':'self-written config'},expectedChanged:false});
function json3(translated){return Buffer.from(JSON.stringify({events:Array.from({length:1500},(_,i)=>({tStartMs:i*2500,dDurationMs:2000,segs:[{utf8:translated?'[YX'+i+'] 這是翻譯。':'[YX'+i+'] 안녕하세요.'}],nativeMetadata:'independent '.repeat(22)}))}));}
await writeFile(join(dir,'caption-json3.body'),json3(false));await writeFile(join(dir,'caption-json3.download'),json3(true));
cases.push({name:'caption-json3',url:'https://www.youtube.com/api/timedtext?lang=ko&fmt=json3',contentType:'application/json',download:'caption-json3.download',downloadStatus:200,expectedChanged:true});
await writeFile(join(dir,'cases.json'),JSON.stringify(cases,null,2)+'\n');console.log('Prepared '+cases.length+' independent fixtures.');
