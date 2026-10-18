import test from 'node:test';
import assert from 'node:assert/strict';
import run,{settings,sourceLyrics,translate,loadCache,encodeDocument,parseDocument} from '../spotify-lyrics.js';
const id='0000000000000000000001',url='https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,key='translations:v1:zh-CN:'+id;
const meta={id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:180};
const colors={background:-10985626,text:-16777216,highlightText:-1};
const original='[00:01.00]A paper lantern\n[00:03.00]Across the sea';
const chinese='[00:01.00]一盏纸灯\n[00:03.00]越过海面';
function fixture(provider,u,{lyrics=original,translations=chinese,mismatch=false}={}) {
 const title=mismatch?'A different song':meta.title;
 if(u.includes('/soso/'))return {code:0,data:{song:{list:[{songmid:'TESTMID',songname:title,singer:[{name:meta.artists[0]}],albumname:meta.album,interval:180}]}}};
 if(u.includes('/cloudsearch/'))return {code:200,result:{songs:[{id:9,name:title,ar:[{name:meta.artists[0]}],al:{name:meta.album},dt:180000}]}};
 return provider==='qq'?{code:0,lyric:lyrics,trans:translations}:{code:200,lrc:{lyric:lyrics},tlyric:{lyric:translations}};
}
function setup(provider='netease',options={},env={},store=new Map()) {
 const calls=[],ctx={env:{FALLBACK_PROVIDER:provider,...env},request:{url,headers:new Headers({Accept:'application/json'})},response:new Response('missing',{status:404}),storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v),getJSON:k=>store.has(k)?JSON.parse(store.get(k)):null,setJSON:(k,v)=>store.set(k,JSON.stringify(v))}};
 const fetch=async u=>{calls.push(u);if(u.includes('translate.googleapis.com')){if(options.failTranslation)throw Error('translator offline');return new Response(JSON.stringify(new URL(u).searchParams.getAll('q').map(s=>'引擎译文 '+s)));}return new Response(JSON.stringify(fixture(provider,u,options)));};
 ctx.http={get:fetch,post:fetch};
 const state={settings:settings(ctx.env),cache:loadCache(ctx),deadline:Date.now()+10000};
 return {ctx,state,calls,store};
}
function seed(x){x.state.cache.put('meta:'+id,meta);x.state.cache.put('palette:v1:'+id,{colors});x.state.cache.save();}
const decode=r=>JSON.parse(Buffer.from(r.body));
test('source translations default on and can be explicitly disabled',()=>{
 assert.equal(settings({}).sourceTranslations,true);assert.equal(settings({SOURCE_TRANSLATIONS:'false'}).sourceTranslations,false);
});
for(const provider of ['qq','netease'])test(`${provider}: aligned same-response translations avoid translator HTTP, retain provenance and survive warm cache`,async()=>{
 const x=setup(provider);seed(x);const out=decode(await run(x.ctx));
 assert.equal(x.calls.length,2);assert.ok(x.calls.every(u=>!u.includes('translate.googleapis.com')));
 assert.deepEqual(out.lyrics.alternatives,[{language:'zh-CN',lines:['一盏纸灯','越过海面']}]);assert.deepEqual(out.colors,colors);
 assert.deepEqual(out.lyrics.lines.map(l=>[l.startTimeMs,l.words]),[['1000','A paper lantern'],['3000','Across the sea']]);
 const cache=loadCache(x.ctx);assert.deepEqual(cache.get(key).pairs,[['A paper lantern','一盏纸灯','source'],['Across the sea','越过海面','source']]);
 assert.ok(x.store.get('VerseLyrics.v1.cache').length<=64000);assert.equal(cache.get('lyrics:'+provider+':'+id).v,1);
 const warm=setup(provider,{}, {},x.store);assert.deepEqual(decode(await run(warm.ctx)),out);assert.equal(warm.calls.length,0);
 const off=setup(provider,{}, {SOURCE_TRANSLATIONS:false},x.store),other=decode(await run(off.ctx));
 assert.equal(off.calls.length,1);assert.ok(off.calls[0].includes('translate.googleapis.com'));assert.deepEqual(other.lyrics.alternatives[0].lines,['引擎译文 A paper lantern','引擎译文 Across the sea']);
 assert.ok(loadCache(off.ctx).get(key).pairs.every(p=>p.length===2));
});
for(const [name,translations,expected] of [
 ['different offset','[offset:1]\n'+chinese,0],['different row count','[00:03.00]越过海面',1],
 ['wrong first timestamp','[00:02.00]一盏纸灯\n[00:03.00]越过海面',1],
 ['duplicate conflicting time','[00:01.00]一盏纸灯\n[00:01.00]其他意思\n[00:03.00]越过海面',1],
 ['Japanese or Korean','[00:01.00]海の灯り\n[00:03.00]빛',0],
 ['traditional Chinese','[00:01.00]一盞紙燈\n[00:03.00]越過海面',0],
 ['romanization','[00:01.00]yi zhan zhi deng\n[00:03.00]yue guo hai mian',0],
 ['mixed letters','[00:01.00]纸灯 light\n[00:03.00]海面 Ω',0],
 ['empty','',0],['non-string',{text:chinese},0],['oversized','a'.repeat(60001),0],
 ['excessive rows',Array.from({length:601},(_,i)=>`[${Math.floor(i/60)}:${String(i%60).padStart(2,'0')}]海`).join('\n'),0]
])test(`optional source translation validation: ${name}`,async()=>{
 const x=setup('netease',{translations}),doc=await sourceLyrics(x.ctx,'netease',meta,x.state);
 assert.equal(doc.lyrics.lines.length,2);assert.equal((doc.lyrics.alternatives[0]?.lines||[]).filter(Boolean).length,expected);
 const out=await translate(x.ctx,doc.lyrics.lines.map(l=>l.words),x.state,'',doc.lyrics.alternatives[0]?.lines);
 assert.equal(out.changed,2);assert.equal(x.calls.length,3);assert.equal(new URL(x.calls[2]).searchParams.getAll('q').length,2-expected);
});
test('exact timestamp source rows remain useful when translation service fails',async()=>{
 const x=setup('netease',{translations:'[00:03.00]越过海面',failTranslation:true});seed(x);const out=decode(await run(x.ctx));
 assert.deepEqual(out.lyrics.alternatives[0].lines,['','越过海面']);assert.equal(out.lyrics.lines.length,2);assert.equal(x.calls.length,3);
 assert.deepEqual(loadCache(x.ctx).get(key).pairs,[['Across the sea','越过海面','source']]);
});
test('conflicting translations for the same repeated original fall back to the translator',async()=>{
 const x=setup('netease',{lyrics:'[00:01]A paper lantern\n[00:03]A paper lantern'});seed(x);const out=decode(await run(x.ctx));
 assert.deepEqual(out.lyrics.alternatives[0].lines,['引擎译文 A paper lantern','引擎译文 A paper lantern']);
 assert.deepEqual(new URL(x.calls[2]).searchParams.getAll('q'),['A paper lantern']);assert.ok(loadCache(x.ctx).get(key).pairs.every(p=>p.length===2));
});
test('same repeated original and translation are cached once',async()=>{
 const x=setup('qq',{lyrics:'[00:01]A paper lantern\n[00:03]A  paper lantern',translations:'[00:01]一盏纸灯\n[00:03]一盏纸灯'});seed(x);const out=decode(await run(x.ctx));
 assert.equal(x.calls.length,2);assert.deepEqual(out.lyrics.alternatives[0].lines,['一盏纸灯','一盏纸灯']);assert.equal(loadCache(x.ctx).get(key).pairs.length,1);
});
test('existing translator cache takes priority over provider translations',async()=>{
 const x=setup();x.state.cache.put(key,{pairs:[['A paper lantern','既有译文']]});seed(x);const out=decode(await run(x.ctx));
 assert.deepEqual(out.lyrics.alternatives[0].lines,['既有译文','越过海面']);assert.equal(x.calls.length,2);
});
for(const env of [{SOURCE_TRANSLATIONS:false},{TRANSLATION_ENABLED:false},{TARGET_LANGUAGE:'ja'},{TARGET_LANGUAGE:'zh-TW'}])test(`settings gate source translations: ${JSON.stringify(env)}`,async()=>{
 const x=setup('netease',{},env);seed(x);const out=decode(await run(x.ctx));
 assert.ok(!JSON.stringify(out.lyrics.alternatives).includes('一盏纸灯'));
 assert.equal(x.calls.length,env.TRANSLATION_ENABLED===false?2:3);assert.equal(out.lyrics.lines.length,2);
});
test('provider translations cannot relax candidate identity checks',async()=>{
 const x=setup('netease',{mismatch:true});assert.equal(await sourceLyrics(x.ctx,'netease',meta,x.state),null);assert.equal(x.calls.length,1);
});
test('concurrent scoped cache saves preserve provenance without losing other lines',()=>{
 const x=setup(),a=loadCache(x.ctx,{track:id,language:'zh-CN'}),b=loadCache(x.ctx,{track:id,language:'zh-CN'});
 a.get(key);b.get(key);a.put(key,{pairs:[['A','来源译文','source']]});b.put(key,{pairs:[['B','引擎译文']]});a.save();b.save();
 const pairs=loadCache(x.ctx).get(key).pairs;assert.deepEqual(new Set(pairs.map(JSON.stringify)),new Set([['A','来源译文','source'],['B','引擎译文']].map(JSON.stringify)));
});
for(const format of ['json','protobuf'])test(`Spotify's own translations are never reused (${format})`,async()=>{
 const x=setup(),doc={lyrics:{syncType:'LINE_SYNCED',provider:'Musixmatch',providerDisplayName:'Official',language:'en',lines:[{startTimeMs:'1000',words:'A paper lantern'}],alternatives:[{language:'zh-CN',lines:['不得复用的官方译文']}]},colors};
 const type=format==='json'?'application/json':'application/x-protobuf';x.ctx.request.headers.set('Accept',type);x.ctx.response=new Response(encodeDocument(doc,format),{headers:{'Content-Type':type}});
 const out=await run(x.ctx),bytes=Buffer.from(out.body);assert.equal(x.calls.length,1);assert.ok(x.calls[0].includes('translate.googleapis.com'));assert.equal(bytes.includes(Buffer.from('不得复用')),false);assert.ok(bytes.includes(Buffer.from('引擎译文')));assert.deepEqual(parseDocument(bytes,type).words,['A paper lantern']);
});
