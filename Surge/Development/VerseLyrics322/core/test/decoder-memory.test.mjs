import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {text,networkLease} from '../spotify-lyrics.js';
const source=readFileSync(new URL('../spotify-lyrics.js',import.meta.url),'utf8').match(/^function text\([^]*?^}/m)[0];
function tracked(){
 const scratch=[],calls=[],context={Uint16Array:class extends Uint16Array{static get [Symbol.species](){return Uint16Array;}constructor(n){super(n);scratch.push(this.byteLength);}},String:{fromCharCode:function(){calls.push(arguments.length);return String.fromCharCode.apply(null,arguments);}}};
 vm.runInNewContext('let TEXT_UNITS;\n'+source+'\nthis.decode=text;',context);return{decode:context.decode,scratch,calls};
}
for(const length of [0,1,127,4095,4096,4097,8192,98304])test('ASCII byte views decode without a scratch array at length '+length,()=>{
 const input=Buffer.from(('A\0\t\r\n~'.repeat(Math.ceil(length/6))).slice(0,length)),slab=Buffer.concat([Buffer.from([255]),input,Buffer.from([255])]),x=tracked();
 assert.equal(x.decode(new Uint8Array(slab.buffer,slab.byteOffset+1,input.length)),input.toString('utf8'));assert.deepEqual(x.scratch,[]);assert.ok(x.calls.every(n=>n<=4096));
});
for(const value of ['é','纸灯','\uFEFF海の灯り','바다 위의 빛','𳈆🎵','A'.repeat(4095)+'🎵','A'.repeat(4096)+'🎵','海'.repeat(40000),'A'.repeat(98000)+'é'])test('UTF-8 decode keeps typed scratch within 8194 bytes: '+value.length,()=>{
 const x=tracked(),bytes=Buffer.from(value);assert.equal(x.decode(bytes),value);assert.equal(x.scratch.length,1);assert.equal(x.scratch[0],Math.min(bytes.length,4097)*2);assert.ok(x.calls.every(n=>n<=4097));
});
for(const tail of [[0x80],[0xc0,0x80],[0xe2,0x82],[0xed,0xa0,0x80],[0xf4,0x90,0x80,0x80]])test('ASCII prefix cannot hide malformed UTF-8 '+tail.join(','),()=>{
 const bytes=Buffer.concat([Buffer.alloc(8192,65),Buffer.from(tail)]);assert.throws(()=>text(bytes),/invalid-utf8/);
});
test('cache-only admission creates no owner and does not read another job waiter',()=>{
 const calls=[],ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001'},storage:{getJSON:k=>{calls.push(k);return null;},setJSON:()=>{throw Error('unexpected write');}}};
 const random=Math.random;let owners=0;Math.random=()=>{owners++;return 0.5;};
 try{const lease=networkLease(ctx,Date.now()+10000,true);lease.release();lease.release();assert.deepEqual(calls,[]);assert.equal(owners,0);}finally{Math.random=random;}
});
test('lazy admission still acquires and releases exactly its own active slot',async()=>{
 const store=new Map(),ctx={request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001'},storage:{getJSON:k=>store.get(k),setJSON:(k,v)=>store.set(k,v)}};
 const lease=networkLease(ctx,Date.now()+10000,true);assert.equal(await lease.acquire(),false);assert.equal(store.get('VerseLyrics.v1.network').length,1);lease.release();assert.equal(store.get('VerseLyrics.v1.network').length,0);
});
