import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,readdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {API_REGEX,CAPTION_REGEX,UMP_REGEX,VERSION} from '../src/data.mjs';
const dir=await mkdtemp(join(tmpdir(),'youtube-loon-lanes-'));
execFileSync(process.execPath,['package-native.mjs','f'.repeat(40),dir,'--loon-only']);
const config=await readFile(join(dir,'Loon/script/YouTubeClean.lpx'),'utf8');
const rules=[...config.matchAll(/^(request|response) if \$\{url\} ~= \/(.+)\/ then script\("([^"]+)"/gm)].map(m=>({phase:m[1],pattern:new RegExp(m[2]),lane:m[3].match(/YouTubeClean\.(\w+)\.js$/)[1]}));
const code=Object.fromEntries(await Promise.all(['request','api','caption','playback'].map(async lane=>[lane,new vm.Script(await readFile(new URL('../dist/loon-'+lane+'.js',import.meta.url),'utf8'))])));
test('one Loon plugin partitions the original response URL set into exactly one body hook',()=>{
 assert.equal(rules.length,4);assert.equal(rules.filter(r=>r.phase==='request').length,1);
 const old=new RegExp('(?:'+[API_REGEX,CAPTION_REGEX,UMP_REGEX].join('|')+')');
 const hosts=['youtubei.googleapis.com','youtubei-att.googleapis.com','www.youtube.com','m.youtube.com','rr3---sn-test.googlevideo.com','youtube.com','youtube.com.example.test'];
 const paths=['player','player/ad_break','browse','next','search','guide','navigation/resolve_url','reel/reel_watch_sequence','reel/reel_item_watch','get_watch','config','log_event','unknown'].map(x=>'/youtubei/v1/'+x).concat(['/api/timedtext','/initplayback','/videoplayback']);
 for(const host of hosts)for(const path of paths)for(const port of ['',':443',':8080'])for(const query of ['','?alt=proto&x=1']){
  const url='https://'+host+port+path+query,hits=rules.filter(r=>r.phase==='response'&&r.pattern.test(url));assert.equal(hits.length,old.test(url)?1:0,url);
 }
});
test('specialized output contains no unused caption, playback or schema modules',async()=>{
 const composition=JSON.parse(await readFile(new URL('../dist/composition.json',import.meta.url),'utf8'));
 const request=Object.keys(composition['loon-request.js']),caption=Object.keys(composition['loon-caption.js']),api=Object.keys(composition['loon-api.js']);
 assert.ok(!request.some(p=>/protocol|fflate|noble|captions|timeline|stream|edit|body\.mjs/.test(p)));
 assert.ok(!caption.some(p=>/protocol|noble|stream|edit\.mjs|elements/.test(p)));
 assert.ok(!api.some(p=>/noble|stream|captions|timeline|translation/.test(p)));
 assert.ok(api.includes('src/feed-envelope.mjs'));assert.ok(caption.includes('src/translation.mjs'));
});
test('Loon-only packaging leaves other client resources intact and keeps the legacy alias identical',async()=>{
 await writeFile(join(dir,'Loon/script/YouTubeClean.plugin'),'old alias');
 execFileSync(process.execPath,['package-native.mjs','e'.repeat(40),dir,'--loon-only']);assert.deepEqual(await readdir(dir),['Loon']);
 assert.equal(await readFile(join(dir,'Loon/script/YouTubeClean.plugin'),'utf8'),await readFile(join(dir,'Loon/script/YouTubeClean.lpx'),'utf8'));
});
function run(lane,url,options={}){
 let calls=0,result;const logs=[],storage=options.storage||new Map();
 const ctx={Uint8Array,ArrayBuffer,DataView,$loon:'specialized fixture',$argument:options.settings||{},$request:{url,headers:options.headers||{}},...(!options.request?{$response:{status:200,headers:{'Content-Type':'application/json'},body:options.body||Buffer.from('{}')}}:{}),$persistentStore:{read:k=>storage.get(k),write:(v,k)=>{storage.set(k,v);return true;}},$httpClient:{get:()=>assert.fail('unexpected network'),post:()=>assert.fail('unexpected network')},$done:r=>{calls++;result=r;},console:{log:s=>logs.push(JSON.parse(s.slice(15)))}};
 code[lane].runInNewContext(ctx);return{calls,result,logs,storage};
}
test('wrong response lane passes through without processing or network calls',()=>{
 const urls={api:'https://youtubei.googleapis.com/youtubei/v1/browse',caption:'https://www.youtube.com/api/timedtext?lang=ko',playback:'https://rr3.googlevideo.com/initplayback'};
 for(const [kind,url]of Object.entries(urls))for(const lane of Object.keys(code))if(lane!==kind){const r=run(lane,url);assert.equal(r.calls,1);assert.deepEqual(Object.keys(r.result),[]);assert.equal(r.logs.length,0);}
});
test('specialized request and API hooks share the existing playback-key store without resetting it',()=>{
 const url='https://youtubei.googleapis.com/youtubei/v1/log_event',storage=new Map(),headers={'x-youtube-hot-hash-data':'native-cache'};
 const before=run('request',url,{request:true,headers,storage});assert.equal(before.calls,1);assert.equal(before.result.headers['x-youtube-hot-hash-data'],undefined);
 const body=Buffer.from(JSON.stringify({onesieHotConfig:{clientKey:Buffer.alloc(32,7).toString('base64'),encryptedClientKey:Buffer.alloc(32,8).toString('base64'),ttl:3600}}));
 const saved=run('api',url,{body,storage});assert.equal(saved.logs[0].keySaved,true);assert.equal(saved.logs[0].version,VERSION);assert.equal(storage.size,1);
 const after=run('request',url,{request:true,headers,storage});assert.deepEqual(Object.keys(after.result),[]);assert.equal(after.logs[0].keyState,'available');assert.equal(storage.size,1);
});
test.after(async()=>rm(dir,{recursive:true,force:true}));
