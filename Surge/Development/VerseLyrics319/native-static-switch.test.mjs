import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {invoke,sourceFixture,seedStore,id,colors} from './feature-host.mjs';
import {parseDocument,encodeDocument,existingPalette} from './core/spotify-lyrics.js';
const clients={Loon:'lpx',Surge:'sgmodule',Shadowrocket:'sgmodule',QuantumultX:'conf',Egern:'yaml'},KEY='VerseLyrics.v1.cache';
const words=['Original lantern 0.','Original lantern 1.'];
function official(format,rows=words,sync='UNSYNCED') {return encodeDocument({lyrics:{syncType:sync,language:'en',provider:'Spotify',providerDisplayName:'Spotify',lines:rows.map((words,i)=>({words,startTimeMs:sync==='UNSYNCED'?'0':String(i*2000+1000)})),alternatives:[{language:'zh-CN',lines:rows.map(()=> 'OFFICIAL_TRANSLATION')}]},colors},format);}
const timed=async u=>({body:JSON.stringify(sourceFixture('netease',u,{lines:8}))});
const translator=async u=>{assert.ok(u.includes('translate.googleapis.com'));return {body:JSON.stringify(new URL(u).searchParams.getAll('q').map(s=>'有意义的译文 '+s))};};
function check(out){assert.equal(out.done,1);assert.equal(out.active,0);assert.ok(out.maxActive<=1);if(out.store.has(KEY)){const raw=out.store.get(KEY);assert.ok(raw.length<=64000);assert.ok(JSON.parse(raw).entries.length<=128);}assert.equal(out.bytes.includes(Buffer.from('OFFICIAL_TRANSLATION')),false);}
for(const [client,ext] of Object.entries(clients)) {
  test(client+': native import exposes default-on static replacement preference',()=>{
    const cfg=readFileSync(new URL('./publish/'+client+'/script/SpotifyLyrics.'+ext,import.meta.url),'utf8');
    if(client==='Loon'){assert.match(cfg,/REPLACE_UNSYNCED = switch,true,type=boolean,tag=替换官方非同步歌词/);assert.match(cfg,/SpotifyLyrics\.js[^\n]+\$\{REPLACE_UNSYNCED\}/);}
    else if(client==='Egern'){assert.match(cfg,/  REPLACE_UNSYNCED:\n    name: 替换官方非同步歌词/);assert.match(cfg,/default_value: "true"/);assert.match(cfg,/REPLACE_UNSYNCED: "true"/);}
    else assert.match(cfg,/REPLACE_UNSYNCED=true/);
  });
  for(const format of ['json','protobuf']) {
    const type=format==='json'?'application/json':'application/x-protobuf',title=client+' '+format;
    for(const flag of [false,'false']) test(title+': off preserves official static words and plugin translations, value '+JSON.stringify(flag),async()=>{
      const out=await invoke(client,{format,status:200,responseBody:official(format),env:{REPLACE_UNSYNCED:flag},network:translator}),doc=parseDocument(out.bytes,type);
      assert.deepEqual(doc.words,words);assert.equal(doc.unsynced,true);assert.equal(out.calls.length,1);assert.ok(out.bytes.includes(Buffer.from('有意义的译文')));assert.deepEqual(existingPalette(out.bytes,doc),colors);check(out);
    });
    for(const flag of [true,'true']) test(title+': on replaces static words with verified real timing, value '+JSON.stringify(flag),async()=>{
      const out=await invoke(client,{format,status:200,responseBody:official(format),env:{REPLACE_UNSYNCED:flag},network:timed});assert.equal(parseDocument(out.bytes,type).unsynced,false);assert.equal(out.calls.length,2);check(out);
    });
    test(title+': off ignores a warm timed source cache without removing it; re-enabling reuses it',async()=>{
      const store=seedStore(),body=official(format),warm=await invoke(client,{format,store,status:200,responseBody:body,network:timed});check(warm);
      const off=await invoke(client,{format,store,status:200,responseBody:body,env:{REPLACE_UNSYNCED:false},network:translator});assert.equal(parseDocument(off.bytes,type).unsynced,true);assert.deepEqual(parseDocument(off.bytes,type).words,words);assert.equal(off.calls.length,1);check(off);
      const enabled=await invoke(client,{format,store,status:200,responseBody:body,env:{REPLACE_UNSYNCED:true},network:()=>{throw Error('timed cache must survive');}});assert.equal(enabled.calls.length,0);assert.deepEqual(enabled.bytes,warm.bytes);check(enabled);
    });
    test(title+': off keeps completely missing lyrics fallback enabled',async()=>{
      const out=await invoke(client,{format,env:{REPLACE_UNSYNCED:false},network:timed});assert.equal(parseDocument(out.bytes,type).unsynced,false);assert.equal(out.calls.length,2);check(out);
    });
    test(title+': cache-only plus off preserves static Chinese even with a timed cache',async()=>{
      const store=seedStore();await invoke(client,{format,store,network:timed});
      const rows=['頭髮随风','头发隨風'],out=await invoke(client,{format,store,status:200,responseBody:official(format,rows),env:{REPLACE_UNSYNCED:false,NETWORK_MODE:'cache-only'},network:()=>{throw Error('No HTTP');}}),doc=parseDocument(out.bytes,type);
      assert.equal(doc.unsynced,true);assert.deepEqual(doc.words,rows);assert.equal(doc.hasAlternatives,false);assert.equal(out.calls.length,0);check(out);
    });
    test(title+': filler-only official lyrics remove official and cached translations without any request',async()=>{
      const rows=['Oh-oh-oh!','Aaahhh','ooh','Hmm…','na na na'],store=seedStore(),cache=JSON.parse(store.get(KEY));
      cache.entries.push({key:'translations:v1:zh-CN:'+id,value:{pairs:rows.map(s=>[s,'旧语气译文'])},expires:Date.now()+60000});store.set(KEY,JSON.stringify(cache));
      const out=await invoke(client,{format,store,status:200,responseBody:official(format,rows,'LINE_SYNCED'),network:()=>{throw Error('Filler must not be queried');}}),doc=parseDocument(out.bytes,type);assert.deepEqual(doc.words,rows);assert.equal(doc.hasAlternatives,false);assert.equal(out.calls.length,0);check(out);
    });
    for(const target of ['zh-CN','zh-TW'])test(title+': mixed filler stays literal, meaningful English translates to '+target,async()=>{
      const rows=['我想你 oh','我想你 oh，在等你 I miss you','纸灯 ooh / 海岸 stay with me'],answers={'I miss you':'我想你','stay with me':'陪着我'};
      const out=await invoke(client,{format,status:200,responseBody:official(format,rows,'LINE_SYNCED'),env:{TARGET_LANGUAGE:target},network:async u=>{const q=new URL(u).searchParams.getAll('q');assert.deepEqual(q,['I miss you','stay with me']);return {body:JSON.stringify(q.map(s=>answers[s]))};}}),doc=parseDocument(out.bytes,type);
      assert.deepEqual(doc.words,rows);assert.equal(out.calls.length,1);assert.ok(out.bytes.includes(Buffer.from('我想你 oh，在等你 我想你')));assert.ok(out.bytes.includes(Buffer.from('纸灯 ooh / 海岸 陪着我')));assert.equal(out.bytes.includes(Buffer.from('我想你 哦')),false);check(out);
    });
    test(title+': fallback-source filler translations are discarded while meaningful rows survive',async()=>{
      const lyric='[00:01]Oh-oh\n[00:03]啊 ah\n[00:05]I miss you',trans='[00:01]哦哦\n[00:03]啊 啊\n[00:05]我想你';
      const out=await invoke(client,{format,network:async u=>{assert.ok(!u.includes('translate.googleapis'));return {body:JSON.stringify(u.includes('/cloudsearch/')?sourceFixture('netease',u):{code:200,lrc:{lyric},tlyric:{lyric:trans}})};}}),doc=parseDocument(out.bytes,type);
      assert.deepEqual(doc.words,['Oh-oh','啊 ah','I miss you']);assert.equal(out.calls.length,2);assert.ok(out.bytes.includes(Buffer.from('我想你')));assert.equal(out.bytes.includes(Buffer.from('哦哦')),false);check(out);
    });
  }
}
