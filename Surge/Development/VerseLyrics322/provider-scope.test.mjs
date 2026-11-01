import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {extractFunctions} from './native-flow.mjs';
test('provider extraction preserves single-line, asynchronous and nested declarations',()=>{
 const source='const shared=2;\nfunction first(){return shared;}\nasync function second(){function nested(){return first()+1;}return nested();}\nfunction kept(){return "first() text";}';
 const out=extractFunctions(source,['first','second']);assert.equal(out.definitions.length,2);assert.ok(out.source.includes('function kept'));assert.ok(!out.source.includes('async function second'));
 const ctx={};new vm.Script(out.source+'\nfunction providers(){'+out.definitions.join('\n')+';return {first,second};}\nthis.api=providers();').runInNewContext(ctx);assert.equal(ctx.api.first(),2);return ctx.api.second().then(v=>assert.equal(v,3));
});
for(const names of [['absent'],['first','first'],['nested']])test('provider extraction rejects incomplete scopes: '+names.join(','),()=>{
 assert.throws(()=>extractFunctions('function first(){function nested(){}}',names),/Missing\/duplicate/);
});
