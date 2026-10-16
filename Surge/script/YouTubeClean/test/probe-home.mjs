// Optional hybrid regression: real public envelopes, self-written ad insertion.
// Does not claim that an anonymously captured response contains a delivered ad.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Settings} from '../src/data.mjs';
import {editBinary} from '../src/edit.mjs';
import {decodeMessage,withPayload,makeBytes,join} from '../src/wire.mjs';
import {homeSection,homeAdCard,homeContents} from './fixtures.mjs';
const [firstPath,continuationPath]=process.argv.slice(2);
if(!firstPath||!continuationPath)throw Error('Pass locally captured native first-page and continuation protobuf files');
const settings=new Settings({TRANSLATE_CAPTIONS:false});
function insert(raw,path){if(!path.length)return join([makeBytes(1,homeSection([homeAdCard()])),raw]);const [id,...rest]=path;let changed=false;return join(decodeMessage(raw).map(f=>{if(f.no!==id||changed)return f.raw;changed=true;return withPayload(f,insert(f.payload,rest));}));}
const result=[];
for(const [kind,path,chain]of [['first',firstPath,[9,58173949,1,58174010,4,49399797]],['continuation',continuationPath,[10,49399797]]]){
  const original=await readFile(path),unchanged=editBinary(original,'browse',settings);
  assert.deepEqual(Buffer.from(unchanged),original);
  const seeded=insert(original,chain),filtered=editBinary(seeded,'browse',settings);
  assert.equal(homeContents(seeded,kind).length,homeContents(original,kind).length+1);
  assert.deepEqual(Buffer.from(filtered),original);
  result.push({kind,publicResponseBytes:original.length,originalSections:homeContents(original,kind).length,selfWrittenAdInserted:1,selfWrittenAdRemoved:1,remainingResponseByteIdentical:true});
}
console.log(JSON.stringify(result,null,2));
