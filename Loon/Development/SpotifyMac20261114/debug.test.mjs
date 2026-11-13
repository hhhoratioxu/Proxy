import {debugWrap} from './debug-wrap.mjs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
for(const failure of [false,true])test('debug wrapper preserves exact response and single completion; service failure='+failure,()=>{
  const done=[],events=[],body=new Uint8Array([1,2,3]);const response={status:200,headers:{Authorization:'SECRET'},body};
  const context={$request:{method:'GET',url:'SECRET',headers:{Authorization:'SECRET'}},$response:response,$done:out=>done.push(out),Uint8Array,
    $httpClient:{post:(options,cb)=>{assert.ok(!JSON.stringify(options).includes('SECRET'));events.push(JSON.parse(options.body));if(failure)throw Error('offline');cb();cb();}}};
  vm.runInNewContext(debugWrap('$done({body:$response.body});$done({status:404});','lyrics'),context,{timeout:1000});
  assert.equal(done.length,1);assert.equal(done[0].body,body);assert.deepEqual(events.map(x=>x.phase),['lyrics-enter','lyrics']);
});
