// Optional local public-envelope check. Never commit the captured input body.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Settings} from '../src/data.mjs';
import {editBinary} from '../src/edit.mjs';
import {decodeMessage,join,withPayload,makeBytes} from '../src/wire.mjs';
import {combine,binary,string,homeSection} from './fixtures.mjs';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('node test/probe-feed-envelope.mjs <locally captured browse.proto> <report.json>');
const s=new Settings({TRANSLATE_CAPTIONS:false}),raw=await readFile(input),clean=editBinary(raw,'browse',s),chain=[9,58173949,1,58174010,4,49399797];
const element=name=>binary(153515154,binary(172660663,binary(1,binary(168777401,binary(3,binary(172035250,string(1,name+'.eml-fe|independent')))))));
const container=entries=>homeSection([binary(474376530,combine(...entries.map(x=>binary(1,x))))]);
function insert(bytes,path,section){
 if(!path.length)return join([makeBytes(1,section),bytes]);
 const [id,...rest]=path;let used=false;
 const result=join(decodeMessage(bytes).map(f=>{if(f.no!==id||used)return f.raw;used=true;return withPayload(f,insert(f.payload,rest,section));}));assert.ok(used,'public envelope path absent');return result;
}
const rows=[];
for(const size of [0,540000]){
 const normal=combine(element('video_lockup_with_attachment'),...(size?[string(55,'n'.repeat(size))]:[])),ad=element('full_width_square_image_layout');
 const seeded=insert(raw,chain,container([normal,ad])),expected=insert(clean,chain,container([normal])),actual=editBinary(seeded,'browse',s);
 assert.deepEqual(Buffer.from(actual),Buffer.from(expected));
 rows.push({case:size?'large-mixed-envelope':'small-mixed-envelope',inputBytes:seeded.length,outputBytes:actual.length,selfWrittenAdRemoved:1,selfWrittenOrdinaryEntryPreserved:true,publicRemainderMatchesExpectedBytes:true});
}
const outside=combine(raw,binary(499,container([element('full_width_square_image_layout')]))),expectedOutside=combine(clean,binary(499,container([element('full_width_square_image_layout')])));
assert.deepEqual(Buffer.from(editBinary(outside,'browse',s)),Buffer.from(expectedOutside));
const report={scope:'anonymous public browse envelope plus self-written new-wrapper entries; no captured user response or real delivered advertisement',date:'2026-10-28',clientVersion:'21.42.4',publicResponseBytes:raw.length,publicResponseInitiallyUnchanged:Buffer.from(raw).equals(Buffer.from(clean)),rows,outsideUnknownFieldPreserved:true,deviceAcceptance:false};
await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
