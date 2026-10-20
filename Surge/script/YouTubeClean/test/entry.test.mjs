import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {VERSION} from '../src/data.mjs';
import {combine,binary,string,opaque,homeFirstPage,homeSection,homeContents} from './fixtures.mjs';
const dir=await mkdtemp(join(tmpdir(),'youtube-clean-entry-'));
execFileSync(process.execPath,['package-native.mjs','f'.repeat(40),dir]);
const code=await readFile(new URL('../dist/clients.js',import.meta.url),'utf8');
function parameters(plugin){
  const text=plugin.split('[Argument]\n')[1].split('\n[Script]')[0],out={};
  for(const line of text.trim().split('\n')){const m=/^(\w+) = (switch|select),([^,]+)/.exec(line);assert.ok(m,line);out[m[1]]=m[2]==='switch'?m[3]==='true':JSON.parse(m[3]);}
  return out;
}
function element(name){
  const uri=binary(172035250,string(1,name+'.eml-fe|fixture'));
  const type=binary(1,binary(168777401,binary(3,uri)));
  return binary(153515154,binary(172660663,type));
}
test('the sole Loon entry runs the bundled code with deep filtering and typed object arguments',async()=>{
  const plugin=await readFile(join(dir,'Loon/script/YouTubeClean.lpx'),'utf8'),args=parameters(plugin),logs=[];
  assert.equal(args.PROFILE,undefined);assert.equal(args.DEEP_FILTER,true);assert.equal(args.DIAGNOSTICS,true);assert.equal(args.CAPTION_LAYOUT,true);assert.equal(args.BILINGUAL,false);assert.ok(plugin.includes(VERSION));
  for(const line of plugin.split('\n').filter(l=>/^(?:request|response) if /.test(l))){const raw=line.slice(line.indexOf('~= /')+4,line.indexOf('/ then script'));assert.ok(new RegExp(raw).test('https://youtubei.googleapis.com:443/youtubei/v1/browse?alt=proto'));const passed=[...line.matchAll(/\$\{(\w+)\}/g)].map(m=>m[1]).filter(k=>k!=='url');assert.deepEqual(new Set(passed),new Set(Object.keys(args)));}
  const ordinary=[homeSection([element('cell_divider')]),...Array.from({length:8},()=>homeSection([element('video_lockup_with_attachment')]))];
  const body=homeFirstPage([ordinary[0],homeSection([element('full_width_square_image_layout')]),homeSection([element('video_display_full_buttoned_layout')]),...ordinary.slice(1)]);
  let finish;const done=new Promise(resolve=>finish=resolve);let calls=0;
  vm.runInNewContext(code,{Uint8Array,ArrayBuffer,DataView,setTimeout,TextEncoder:undefined,TextDecoder:undefined,$loon:'iPhone fixture 3.5.3(1008)',$argument:args,$request:{url:'https://youtubei.googleapis.com:443/youtubei/v1/browse?alt=proto',headers:{}},$response:{status:200,headers:{},body},$persistentStore:{read:()=>null,write:()=>true},$done:r=>{calls++;finish(r);},console:{log:s=>logs.push(s)}},{timeout:3000});
  const result=await done;assert.equal(calls,1);assert.deepEqual(homeContents(result.body,'first').map(Buffer.from),ordinary.map(Buffer.from));assert.equal(logs.length,1);assert.ok(logs[0].includes('"profile":"deep"'));
  const diagnostic=JSON.parse(logs[0].slice(15));assert.equal(diagnostic.version,VERSION);assert.equal(diagnostic.reason,'modified');assert.equal(diagnostic.keyState,'missing');assert.equal(diagnostic.feedCards,11);assert.equal(diagnostic.removedParts,2);assert.deepEqual(diagnostic.matchedAdTemplates,['full_width_square_image_layout','video_display_full_buttoned_layout']);
});
test('packaging produces one import per capable client with no scheme selector or route changes',async()=>{
  for(const [client,name]of [['Egern','YouTubeClean.yaml'],['Loon','YouTubeClean.lpx'],['Surge','YouTubeClean.sgmodule'],['Shadowrocket','YouTubeClean.sgmodule'],['QuantumultX','YouTubeClean.conf']]){
    const files=await readdir(join(dir,client,'script'));assert.deepEqual(files,[name]);
  }
  const plugin=await readFile(join(dir,'Loon/script/YouTubeClean.lpx'),'utf8');
  assert.ok(!plugin.includes('[Rule]'));assert.ok(!plugin.includes('PROFILE'));assert.ok(plugin.includes('DEEP_FILTER = switch,true,type=boolean'));
  assert.ok(plugin.includes('CAPTION_LAYOUT = switch,true,type=boolean,tag=译文智能换行'));
});
test.after(async()=>rm(dir,{recursive:true,force:true}));
