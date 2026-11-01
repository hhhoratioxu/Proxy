import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {localUntilIO,runner} from './native-flow.mjs';
for(const [body,expected]of [
 ['return await 42;',42],['return (await (true ? 2 : 3)) + 4;',6],
 ['try { throw Error("x"); } catch { return await 5; }',5],
 ['let n=0;try { n=await 4; } finally { n++; }return n;',5],
 ['async function child(){return await 7;}return await child();',7],
 ['return await (await 6);',6]
])test('native local lowering preserves synchronous value and control flow: '+body,()=>{
 const c={};vm.runInNewContext(runner+localUntilIO('async function f(){'+body+'}')+';result=f();',c);assert.equal(c.result,expected);
});
test('native lowering suspends for real Promise and unwinds catch/finally only after settlement',async()=>{
 let resolve;const events=[],c={p:new Promise(r=>resolve=r),events};
 vm.runInNewContext(runner+localUntilIO('async function f(){try {events.push("start");const x=await p;events.push(x);throw Error("later");}catch(e){events.push(e.message);return 9;}finally{events.push("finally");}}')+';result=f();',c);
 assert.deepEqual(events,['start']);resolve('settled');assert.equal(await c.result,9);assert.deepEqual(events,['start','settled','later','finally']);
});
test('native lowering rejects unsupported lexical bindings instead of silently changing semantics',()=>{
 for(const code of ['async function f(){return this;}','async function f(){return arguments[0];}','const f=async()=>1;','const o={async f(){return 1;}}'])assert.throws(()=>localUntilIO(code));
});
