import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=JSON.parse(readFileSync(new URL('./base.json',import.meta.url))),report={head:base.head,tree:base.tree,files:[],readmes:[]};
for(const [path,content] of Object.entries(base.files)){
 const r=await fetch('https://raw.githubusercontent.com/hhhoratioxu/Proxy/'+base.head+'/'+path);if(!r.ok)throw Error(path+' '+r.status);const text=await r.text();if(text!==content)throw Error('baseline mismatch '+path);report.files.push({path,sha256:createHash('sha256').update(text).digest('hex')});
}
for(const client of ['Loon','Egern','Surge','Shadowrocket','QuantumultX','Clash']){
 const r=await fetch('https://raw.githubusercontent.com/hhhoratioxu/Proxy/'+base.head+'/'+client+'/README.md');if(!r.ok)throw Error(client+' '+r.status);const content=await r.text();report.readmes.push({path:client+'/README.md',content});console.log(client+': '+content.split('\n').slice(0,10).join(' ').slice(0,350));
}
writeFileSync(new URL('./baseline-remote-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('12 baseline bytes verified; six client conventions fetched at '+base.head);
