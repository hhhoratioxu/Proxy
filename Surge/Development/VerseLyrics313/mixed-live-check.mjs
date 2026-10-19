import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {translate,loadCache} from './core/spotify-lyrics.js';
const inputs=['我爱你 baby','如果你愿意 stay with me','把那句 never say goodbye 放在心里','我想说 hello world',"請說：Don't leave me，還有 I need you！",'我还想说 hello world'],results=[];
for(const target of ['zh-CN','zh-TW']){
 const store=new Map(),calls=[],ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001'},storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)},http:{get:async u=>{
  const queries=new URL(u).searchParams.getAll('q');assert.deepEqual(queries,['baby','stay with me','never say goodbye','hello world',"Don't leave me\nI need you"]);
  const raw=execFileSync('python3',['-c','import sys,urllib.request; r=urllib.request.urlopen(sys.argv[1],timeout=12); print(r.read().decode())',u],{encoding:'utf8',timeout:15000});calls.push({queries,response:JSON.parse(raw)});return new Response(raw);
 }}};
 const state={settings:{language:target},cache:loadCache(ctx),deadline:Date.now()+10000},r=await translate(ctx,inputs,state,'zh');assert.equal(r.changed,6);assert.ok(r.translations.every(Boolean));
 assert.ok(r.translations[0].startsWith('我爱你 '));assert.ok(r.translations[1].startsWith('如果你愿意 '));assert.ok(r.translations[2].startsWith('把那句 ')&&r.translations[2].endsWith(' 放在心里'));assert.ok(r.translations[3].startsWith('我想说 '));assert.ok(r.translations[5].startsWith('我还想说 '));assert.ok(r.translations[4].startsWith('請說：')&&r.translations[4].includes('，還有 '));
 assert.ok(r.translations.every(t=>!/[A-Za-z]/.test(t)));state.cache.save();const warm=await translate(ctx,inputs,{...state,deadline:Date.now()+10000,cache:loadCache(ctx)},'zh');assert.deepEqual(warm,r);assert.equal(calls.length,1);results.push({target,inputs,calls,translations:r.translations,changed:r.changed,warmHTTP:0});
}
const report={at:new Date().toISOString(),scope:'Two unauthenticated live public translation requests through the candidate shared translator using self-written synthetic text. Warm reopen uses local cache. Not Spotify phone traffic or native VPN acceptance.',results};writeFileSync('mixed-live-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
