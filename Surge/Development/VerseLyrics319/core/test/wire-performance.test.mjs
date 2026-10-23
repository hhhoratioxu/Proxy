import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {encodeDocument,parseDocument,fields,text,sourceCandidates,loadCache} from '../spotify-lyrics.js';
// Independent Buffer/BigInt wire oracle; no shared encoder helpers.
const cat=(...parts)=>Buffer.concat(parts);
function v(n){let x=BigInt(n);if(x<0n)x=BigInt.asUintN(64,x);const b=[];do{b.push(Number(x&127n)|(x>127n?128:0));x>>=7n;}while(x);return Buffer.from(b);}
const num=(n,x)=>cat(v(n*8),v(x)),bin=(n,b)=>cat(v(n*8+2),v(b.length),b),str=(n,s)=>bin(n,Buffer.from(s));
const alternative=a=>cat(str(1,a.language),...a.lines.map(s=>str(2,s)));
function reference(d){
 const l=d.lyrics,b=cat(num(1,l.syncType==='LINE_SYNCED'?1:0),...l.lines.map(r=>bin(2,cat(num(1,Number(r.startTimeMs)),str(2,r.words)))),str(3,l.provider),str(5,l.providerDisplayName),str(10,l.language||''),...(l.alternatives||[]).map(a=>bin(9,alternative(a))));
 const c=d.colors;return cat(bin(1,b),bin(2,cat(num(1,c.background>>>0),num(2,c.text>>>0),num(3,c.highlightText>>>0))));
}
const doc=(count,timed=true)=>({lyrics:{syncType:timed?'LINE_SYNCED':'UNSYNCED',provider:'qq',providerDisplayName:'原始测试来源',language:'en',lines:Array.from({length:count},(_,i)=>({startTimeMs:String(i%3===0?9007199254740991:i*2001),words:['ASCII original','中文𳈆🎵','Cafe\u0301 \0\n'][i%3]+' '+i})),alternatives:[{language:'zh-CN',lines:Array.from({length:count},(_,i)=>'原创测试译文 '+i)},{language:'ja',lines:Array.from({length:count},()=> '別のテスト')}]},colors:{background:-10985626,text:-16777216,highlightText:-1}});
for(const placement of ['absent','first','middle','last','multiple','wrong-wire'])for(const remove of [false,true])test('official single-buffer splice: '+placement+' / remove '+remove,()=>{
 const a=bin(2,cat(num(1,1000),str(2,'Original'))),b=bin(99,Buffer.from([255,0,254])),old=bin(9,alternative({language:'ja',lines:['old']})),replacement=remove?Buffer.alloc(0):bin(9,alternative({language:'zh-CN',lines:['原创译文']}));
 const parts=placement==='absent'?[a,b]:placement==='first'?[old,a,b]:placement==='middle'?[a,old,b]:placement==='last'?[a,b,old]:placement==='multiple'?[old,a,old,b,old]:[a,num(9,7),b];
 let inserted=false;const desired=[];
 for(const p of parts){if(p[0]===74||p[0]===72){if(!inserted)desired.push(replacement);inserted=true;}else desired.push(p);}
 if(!inserted)desired.push(replacement);
 const before=bin(100,Buffer.from([128,255])),after=num(3,1),input=cat(before,bin(1,cat(...parts)),after),parsed=parseDocument(input,'application/x-protobuf');
 const out=parsed.writeNative('zh-CN',remove?['']:['原创译文']);assert.deepEqual(Buffer.from(out),cat(before,bin(1,cat(...desired)),after));assert.deepEqual(parsed.words,['Original']);
});
test('official 600-line translation replacement allocates one final byte buffer',()=>{
 const allocations=[],source=readFileSync(new URL('../spotify-lyrics.js',import.meta.url),'utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function entry(ctx)');
 const tracked=new Proxy(Uint8Array,{construct(t,args){const out=Reflect.construct(t,args);allocations.push(out.byteLength);return out;}}),ctx={Uint8Array:tracked};
 vm.runInNewContext(source+'\nthis.parse=parseDocument;',ctx);
 const d=doc(600),parsed=ctx.parse(reference(d),'application/x-protobuf'),out=parsed.writeNative('zh-TW',d.lyrics.lines.map((_,i)=>'新译文 '+i));
 assert.deepEqual(allocations,[out.length]);assert.equal(parseDocument(out,'application/x-protobuf').words.length,600);
});
test('packed Han tables stay absent on Latin matching and retain every reference mapping',()=>{
 const source=readFileSync(new URL('../spotify-lyrics.js',import.meta.url),'utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function entry(ctx)'),ctx={};
 vm.runInNewContext(source+'\nthis.han={fold:foldHan,table:()=>HAN_TABLES};',ctx);
 assert.equal(ctx.han.table(),undefined);assert.equal(ctx.han.fold('Ada North 123'),'Ada North 123');assert.equal(ctx.han.table(),undefined);
 const chars=[...JSON.parse(readFileSync(new URL('./fixtures/han-reference.json',import.meta.url))).pairs],map=new Map();for(let i=0;i<chars.length;i+=2)map.set(chars[i],chars[i+1]);
 const input=[...map.keys()].join('');assert.equal(ctx.han.fold(input),[...map.values()].join(''));
 const tables=ctx.han.table();assert.equal(tables.flat().reduce((n,t)=>n+t[3].length/2,0),6447);
 for(let cp=0x3400;cp<0xa000;cp+=13){const c=String.fromCodePoint(cp);assert.equal(ctx.han.fold(c),map.get(c)||c);}
 for(let cp=0x20000;cp<0x40000;cp+=17){const c=String.fromCodePoint(cp);assert.equal(ctx.han.fold(c),map.get(c)||c);}
 assert.equal(ctx.han.table(),tables);
});
for(const count of [0,1,24,200,600])for(const timed of [false,true])test('exact protobuf bytes match independent oracle: '+count+' rows / '+timed,()=>{
 const d=doc(count,timed),bytes=encodeDocument(d,'protobuf');assert.deepEqual(Buffer.from(bytes),reference(d));assert.deepEqual(parseDocument(bytes,'application/x-protobuf').words,d.lyrics.lines.map(l=>l.words));
});
test('official replacement preserves timing, unknown fields and original line bytes',()=>{
 const d=doc(200),root=fields(reference(d)),lyrics=cat(root[0].payload,bin(100,Buffer.from([255,254,0]))),input=cat(bin(1,lyrics),root[1].raw,num(99,123456)),p=parseDocument(input,'application/x-protobuf'),rows=d.lyrics.lines.map((_,i)=>'新的译文 '+i),out=p.writeNative('zh-TW',rows);
 const inner=fields(fields(out)[0].payload);assert.deepEqual(inner.filter(f=>f.number===2).map(f=>Buffer.from(f.raw)),fields(lyrics).filter(f=>f.number===2).map(f=>Buffer.from(f.raw)));
 assert.deepEqual(Buffer.from(inner.find(f=>f.number===9).payload),alternative({language:'zh-TW',lines:rows}));assert.ok(Buffer.from(out).includes(Buffer.from([255,254,0])));assert.equal(fields(out).find(f=>f.number===99).value,123456);
});
for(const bad of [cat(str(2,'one'),str(2,'two')),num(2,42),Buffer.from([18,4,65]),Buffer.from([15]),Buffer.from([0]),Buffer.from([18,1,255])])test('streamed line parsing still rejects malformed wire '+bad.toString('hex'),()=>{
 const bytes=bin(1,bin(2,bad));assert.throws(()=>parseDocument(bytes,'application/x-protobuf'));
});
test('single-buffer encoder rejects invalid UTF-16, timestamps and over-limit output',()=>{
 for(const mutate of [d=>d.lyrics.lines[0].words='\ud800',d=>d.lyrics.lines[0].startTimeMs='NaN',d=>d.lyrics.lines[0].startTimeMs='9007199254740992',d=>d.lyrics.lines[0].words='中'.repeat(180000),d=>d.lyrics.alternatives[0].lines=[]]){
  const d=doc(1);mutate(d);assert.throws(()=>encodeDocument(d,'protobuf'));
 }
});
test('600-line fallback allocates one Uint8Array output and one compact numeric plan',()=>{
 const allocations=[],source=readFileSync(new URL('../spotify-lyrics.js',import.meta.url),'utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function entry(ctx)');
 const track=C=>new Proxy(C,{construct(t,args){const b=Reflect.construct(t,args);allocations.push({type:C.name,bytes:b.byteLength});return b;}});
 const ctx={Uint8Array:track(Uint8Array),Uint32Array:track(Uint32Array)};vm.runInNewContext(source+'\nthis.encode=encodeDocument;',ctx);
 const out=ctx.encode(doc(600),'protobuf');assert.deepEqual(allocations.map(a=>a.type),['Uint32Array','Uint8Array']);assert.equal(allocations[0].bytes,4800);assert.equal(allocations[1].bytes,out.length);
});
test('candidate target normalization reads each target field once while retaining recording checks',()=>{
 const reads={},data={title:'紙燈',album:'專輯',artists:['王先生'],duration:180},meta=Object.fromEntries(Object.keys(data).map(k=>[k,undefined]));
 for(const k of Object.keys(data))Object.defineProperty(meta,k,{get(){reads[k]=(reads[k]||0)+1;return data[k];}});
 const records=Array.from({length:50},(_,i)=>({title:i===49?'纸灯':'Other '+i,album:'专辑',artists:['王先生'],duration:180}));
 assert.deepEqual(sourceCandidates(meta,records,x=>x),[records[49]]);assert.deepEqual(reads,{title:1,artists:1,album:1,duration:1});
 assert.deepEqual(sourceCandidates({...data,duration:NaN},records,x=>x),[]);
});
test('indexed cache reads reuse measured record sizes without serializing lyric objects',()=>{
 const store=new Map(),ctx={storage:{get:k=>store.get(k),set:(k,v)=>store.set(k,v)}},id='0000000000000000000001',cache=loadCache(ctx);
 cache.put('lyrics:auto:'+id,{v:1,p:'qq',t:true,l:[[1000,'An original line']]});cache.save();const stringify=JSON.stringify;let objects=0;
 try{JSON.stringify=(x,...args)=>{if(x?.key||x?.l)objects++;return stringify(x,...args);};const c=loadCache(ctx,{track:id,language:'zh-CN'});assert.equal(c.get('lyrics:auto:'+id).l.length,1);c.save();}finally{JSON.stringify=stringify;}
 assert.equal(objects,0);
});
test('Han planes are loaded only when requested, without expanding another plane',()=>{
 const source=readFileSync(new URL('../spotify-lyrics.js',import.meta.url),'utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function entry(ctx)'),ctx={};vm.runInNewContext(source+'\nthis.han={fold:foldHan,table:()=>HAN_TABLES};',ctx);
 assert.equal(ctx.han.fold('原創紙燈'),'原创纸灯');assert.ok(ctx.han.table()[0]);assert.equal(ctx.han.table()[2],undefined);assert.equal(ctx.han.table()[3],undefined);
 const chars=[...JSON.parse(readFileSync(new URL('./fixtures/han-reference.json',import.meta.url))).pairs];
 for(const plane of [2,3]){const at=chars.findIndex((c,i)=>i%2===0&&c.codePointAt(0)>>>16===plane);assert.ok(at>=0);assert.equal(ctx.han.fold(chars[at]),chars[at+1]);assert.ok(ctx.han.table()[plane]);}
});
