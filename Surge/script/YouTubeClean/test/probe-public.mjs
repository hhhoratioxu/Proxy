// Optional real-response check: inputs are captured locally and must not be committed.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Settings} from '../src/data.mjs';
import {editBinary} from '../src/edit.mjs';
import {inspect,at,all,ids} from './fixtures.mjs';
const [playerPath,guidePath]=process.argv.slice(2);
if(!playerPath||!guidePath)throw Error('Pass native player and guide protobuf files');
const p=await readFile(playerPath),g=await readFile(guidePath),s=new Settings({HIDE_UPLOAD:true,HIDE_SHORTS:true});
const fresh=editBinary(p,'player',s),before=all(at(at(p,10),51621377),1),after=all(at(at(fresh,10),51621377),1);
assert.equal(after.length,before.length);
for(let i=0;i<before.length;i++)assert.deepEqual(Buffer.from(after[i]),Buffer.from(before[i]));
const adFields=new Set([7,23,25,27,38,44,45,48,68,69]),unrelated=f=>f.id!==10&&!adFields.has(f.id);
assert.deepEqual(inspect(fresh).filter(unrelated).map(f=>f.raw),inspect(p).filter(unrelated).map(f=>f.raw));
const newGuide=editBinary(g,'guide',s);
assert.deepEqual(ids(newGuide),ids(g).filter(id=>!['FEuploads','FEupload','FEcreate','creation_entry','FEshorts'].includes(id)));
console.log(JSON.stringify({player:{inputBytes:p.length,outputBytes:fresh.length,originalCaptionTracks:before.length,newCaptionTracks:after.length,originalTracksByteIdentical:true,unrelatedTopLevelFieldsByteIdentical:true,removedAdFieldNumbers:inspect(p).filter(f=>adFields.has(f.id)).map(f=>f.id)},guide:{inputBytes:g.length,outputBytes:newGuide.length,observedBottomIds:ids(g),targetButtonsPresent:ids(g).some(id=>['FEshorts','FEuploads'].includes(id)),note:'Anonymous protocol observation; no logged-in device acceptance'}},null,2));
