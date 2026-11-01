import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {encodeDocument,parseDocument} from '../spotify-lyrics.js';
function inspect(){
 const allocations=[],context={Uint16Array:new Proxy(Uint16Array,{construct(t,args){const b=Reflect.construct(t,args);allocations.push(b.byteLength);return b;}})};
 let source=readFileSync(new URL('../spotify-lyrics.js',import.meta.url),'utf8').replace(/^export\s*\{[^}]*\};\s*/gm,'').replace(/^export default async function\(ctx\)/m,'async function main(ctx)');
 source=source.replace('function vint(bytes, at) {','function vint(bytes, at) { globalThis.slowVarints++;');context.slowVarints=0;
 vm.runInNewContext(source+'\nthis.api={text,parseDocument,fields,latinSpans,vocalOnly,vocalLine,scanners:()=>[LATIN_SPANS,VOCAL_WORDS,VOCAL_TOKEN]};',context);return {context,api:context.api,allocations};
}
test('600 Chinese protobuf rows reuse one bounded decoding buffer and avoid short varint result objects',()=>{
 const x=inspect(),words='自写的中文测试歌词 𳈆🎵',doc={lyrics:{syncType:'LINE_SYNCED',provider:'Spotify',providerDisplayName:'Spotify',lines:Array.from({length:600},(_,i)=>({startTimeMs:String(i*2000+1000),words}))},colors:{background:-10985626,text:-16777216,highlightText:-1}};
 const bytes=encodeDocument(doc,'protobuf'),parsed=x.api.parseDocument(bytes,'application/x-protobuf');assert.deepEqual([...parsed.words],doc.lyrics.lines.map(l=>l.words));assert.equal(x.allocations.length,1);assert.ok(x.allocations[0]<=8194);assert.ok(x.context.slowVarints>=590 && x.context.slowVarints<=605);assert.equal(parsed.unsynced,false);
 const old=[...parsed.words];x.api.text(Buffer.from('不同的短句'));assert.deepEqual([...parsed.words],old);
});
test('shared scratch grows only when needed, stays bounded and cannot leak previous decoded words',()=>{
 const x=inspect();for(let i=0;i<120;i++)assert.equal(x.api.text(Buffer.from(i%2?'中文纸灯':'海岸微风')),i%2?'中文纸灯':'海岸微风');assert.equal(x.allocations.length,1);
 const long='海'.repeat(40000);assert.equal(x.api.text(Buffer.from(long)),long);assert.ok(x.allocations.every(n=>n<=8194));const count=x.allocations.length;
 assert.equal(x.api.text(Buffer.from('短')), '短');assert.equal(x.api.text(Buffer.from('ASCII')), 'ASCII');assert.equal(x.allocations.length,count);
 assert.throws(()=>x.api.text(Buffer.from([0x61,0xf4,0x90,0x80,0x80])),/invalid-utf8/);assert.equal(x.api.text(Buffer.from('纸灯🎵')),'纸灯🎵');assert.equal(x.allocations.length,count);
});
test('each script execution owns its decoding scratch',()=>{
 const a=inspect(),b=inspect();assert.equal(a.api.text(Buffer.from('纸灯')),'纸灯');assert.equal(b.allocations.length,0);assert.equal(b.api.text(Buffer.from('海岸')),'海岸');assert.equal(a.allocations.length,1);assert.equal(b.allocations.length,1);
});
test('Latin and vocal scanners are lazy and reused without stale cursors',()=>{
 const x=inspect();assert.deepEqual([...x.api.scanners()],[undefined,undefined,undefined]);assert.equal(x.api.vocalOnly('纸灯'),false);assert.deepEqual([...x.api.scanners()],[undefined,undefined,undefined]);
 assert.equal(x.api.vocalOnly('I miss you'),false);assert.deepEqual([...x.api.scanners()],[undefined,undefined,undefined]);
 const spans=x.api.latinSpans();spans.exec('hello 世界 goodbye');assert.equal(x.api.latinSpans(),spans);assert.equal(spans.lastIndex,0);
 for(let i=0;i<120;i++){assert.equal(x.api.vocalOnly('oh oh'),true);assert.equal(x.api.vocalOnly('oh my love'),false);assert.equal(x.api.vocalOnly('ah'),true);assert.equal(x.api.vocalLine('我说 oh，我想你 I miss you',true),false);assert.equal(x.api.vocalLine('我说 oh，我想你 ah',true),true);}
 const before=[...x.api.scanners()];x.api.vocalOnly('ooh');assert.deepEqual([...x.api.scanners()],before);
});
test('short-field fast paths preserve malformed and long-varint rejection',()=>{
 const x=inspect();for(const value of [[0],[0x0a],[0x0a,0x80],[0x08],[0x08,0x80],[0x0a,0x02,0x61],[0x0f],[0x80],[0x80,0],[0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0x02]])assert.throws(()=>x.api.fields(new Uint8Array(value)));
 const huge=encodeDocument({lyrics:{syncType:'LINE_SYNCED',provider:'Spotify',providerDisplayName:'Spotify',lines:[{startTimeMs:'9007199254740991',words:'自写 '+ 'x'.repeat(200)}]},colors:{background:-10985626,text:-16777216,highlightText:-1}},'protobuf');assert.deepEqual([...x.api.parseDocument(huge,'application/x-protobuf').words],parseDocument(huge,'application/x-protobuf').words);
});
