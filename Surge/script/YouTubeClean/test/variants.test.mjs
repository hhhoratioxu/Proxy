import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {combine,binary,string,opaque,homeFirstPage,homeSection,homeContents} from './fixtures.mjs';
const dir=await mkdtemp(join(tmpdir(),'youtube-clean-variants-'));
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
for(const [stem,profile,deep]of [['YouTubeClean','elements',false],['YouTubeClean.Deep','deep',true],['YouTubeClean.TCP','tcp',true]])test('Loon '+profile+' actual generated entry dispatches the bundled code using its own defaults',async()=>{
  const plugin=await readFile(join(dir,'Loon/script',stem+'.plugin'),'utf8'),args=parameters(plugin),logs=[];
  assert.equal(args.PROFILE,profile);assert.equal(args.DEEP_FILTER,deep);assert.equal(args.DIAGNOSTICS,true);assert.ok(plugin.includes('1.2.1'));
  for(const line of plugin.split('\n').filter(l=>/^(?:request|response) if /.test(l))){const raw=line.slice(line.indexOf('~= /')+4,line.indexOf('/ then script'));assert.ok(new RegExp(raw).test('https://youtubei.googleapis.com:443/youtubei/v1/browse?alt=proto'));const passed=[...line.matchAll(/\$\{(\w+)\}/g)].map(m=>m[1]).filter(k=>k!=='url');assert.deepEqual(new Set(passed),new Set(Object.keys(args)));}
  const unknownAd=binary(477777777,binary(1,element('ad_layout'))),body=homeFirstPage([homeSection([element('ads_video_with_context')]),homeSection([unknownAd]),homeSection([element('video_card')])]);
  let finish;const done=new Promise(resolve=>finish=resolve);let calls=0;
  vm.runInNewContext(code,{Uint8Array,ArrayBuffer,DataView,setTimeout,TextEncoder:undefined,TextDecoder:undefined,$argument:args,$request:{url:'https://youtubei.googleapis.com:443/youtubei/v1/browse?alt=proto',headers:{}},$response:{status:200,headers:{},body},$persistentStore:{read:()=>null,write:()=>true},$done:r=>{calls++;finish(r);},console:{log:s=>logs.push(s)}},{timeout:3000});
  const result=await done;assert.equal(calls,1);assert.equal(homeContents(result.body,'first').length,deep?1:2);assert.equal(logs.length,1);assert.ok(logs[0].includes('"profile":"'+profile+'"'));
});
test('only Loon TCP variant changes routing, narrowly for UDP/443 on the four API hosts',async()=>{
  const a=await readFile(join(dir,'Loon/script/YouTubeClean.plugin'),'utf8'),b=await readFile(join(dir,'Loon/script/YouTubeClean.Deep.plugin'),'utf8'),c=await readFile(join(dir,'Loon/script/YouTubeClean.TCP.plugin'),'utf8');
  assert.ok(!a.includes('[Rule]'));assert.ok(!b.includes('[Rule]'));
  const rules=c.split('[Rule]\n')[1].split('\n[Mitm]')[0].trim().split('\n');assert.equal(rules.length,4);
  const hosts=rules.map(rule=>{const m=/^AND,\(\(DOMAIN,([a-z.-]+)\),\(PROTOCOL,UDP\),\(DEST-PORT,443\)\),REJECT$/.exec(rule);assert.ok(m,rule);return m[1];});
  assert.deepEqual(hosts.sort(),['youtubei.googleapis.com','youtubei-att.googleapis.com','www.youtube.com','m.youtube.com'].sort());
  const reject=(host,protocol,port)=>hosts.includes(host)&&protocol==='UDP'&&port===443;
  assert.ok(reject('youtubei.googleapis.com','UDP',443));assert.ok(!reject('youtubei.googleapis.com','TCP',443));assert.ok(!reject('youtubei.googleapis.com','UDP',53));assert.ok(!reject('rr1.googlevideo.com','UDP',443));assert.ok(!reject('www.example.com','UDP',443));
});
test.after(async()=>rm(dir,{recursive:true,force:true}));
