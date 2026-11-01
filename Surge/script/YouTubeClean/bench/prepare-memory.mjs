// Adds independent 1.2.10 feed-envelope cases to the existing preservation corpus.
// Preparation happens in a separate process, outside every measured worker.
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {combine,binary,string,homeFirstPage,homeSection} from '../test/fixtures.mjs';
const [directory]=process.argv.slice(2);if(!directory)throw Error('fixture directory required');
const result=spawnSync(process.execPath,[fileURLToPath(new URL('./prepare.mjs',import.meta.url)),directory],{encoding:'utf8'});
if(result.status!==0)throw Error(result.stderr||result.stdout);
const cases=JSON.parse(await readFile(join(directory,'cases.json'),'utf8'));
const element=name=>binary(153515154,binary(172660663,binary(1,binary(168777401,binary(3,binary(172035250,string(1,name+'.eml-fe|independent')))))));
const normal=Array.from({length:120},(_,i)=>combine(element('video_lockup_with_attachment'),string(55,'ordinary-'+i+' '+'n'.repeat(8000)))),ad=element('full_width_square_image_layout');
const mixed=[...normal.slice(0,5),ad,...normal.slice(5)];
function modern(items,depth=0){let inner=combine(...items.map(x=>binary(1,x)));for(let i=0;i<depth;i++)inner=binary(2,inner);return homeFirstPage([homeSection([binary(474376530,inner)])]);}
for(const [name,body,expectedChanged]of [
 ['native-home',homeFirstPage(mixed.map(x=>homeSection([x]))),true],
 ['feed-envelope',modern(mixed),true],
 ['nested-feed-envelope',modern(mixed,8),true],
 ['unchanged-feed-envelope',modern(normal),false]
]){await writeFile(join(directory,name+'.body'),body);cases.push({name,url:'https://youtubei.googleapis.com/youtubei/v1/browse',contentType:'application/x-protobuf',expectedChanged});}
await writeFile(join(directory,'cases.json'),JSON.stringify(cases,null,2)+'\n');
console.log('Prepared '+cases.length+' independent fixtures.');
