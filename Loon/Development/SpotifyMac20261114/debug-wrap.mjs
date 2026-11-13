// A temporary, local-only wrapper; never part of the response core.
import {availabilityMapPaths} from './protocol-shape.mjs';
import {metadataShape} from './metadata-shape.mjs';
export function debugWrap(core,kind){
  if(!['lyrics','entry'].includes(kind))throw Error('invalid kind');
  return `(function(hostDone){
${availabilityMapPaths.toString()}
${metadataShape.toString()}
let started=false,finished=false;
function summary(output){
  const incoming=$response.body, body=output&&output.body;
  const event={phase:"${kind}",route:"runtime",method:$request.method,status:Number($response.status),bytes:incoming?incoming.length:0,format:body===undefined?"unchanged":typeof body==="string"?"string":"bytes"};
  if(output&&output.status!==undefined)event.outputStatus=Number(output.status);
  if(body!==undefined)event.outputBytes=body.length;
  return event;
}
function report(event,next){
  let called=false;function resume(){if(!called){called=true;next();}}
  try{$httpClient.post({url:"http://127.0.0.1:18765/events",headers:{"Content-Type":"application/json"},body:JSON.stringify(event),timeout:300,node:"DIRECT","auto-cookie":false,"auto-redirect":false,"binary-mode":false,insecure:false},resume);}catch{resume();}
}
const $done=output=>{if(finished)return;finished=true;let event;try{event=summary(output);}catch{event={phase:"${kind}",route:"runtime",format:"summary-error"};}report(event,()=>hostDone(output));};
function start(){if(started)return;started=true;\n${core}\n}
const incoming=$response.body;let first=0;if(incoming&&ArrayBuffer.isView(incoming)){while(first<incoming.length&&[9,10,13,32].includes(incoming[first]))first++;}
const shape=[{path:"body.json",value:typeof incoming==="string"&&/^\\s*[{[]/.test(incoming)||Boolean(incoming&&incoming[first]===123)},{path:"body.gzip",value:Boolean(incoming&&incoming[0]===31&&incoming[1]===139)},{path:"body.view",value:ArrayBuffer.isView(incoming)}];
const headers=$response.headers||{},typeKey=Object.keys(headers).find(k=>k.toLowerCase()==="content-type"),encodingKey=Object.keys(headers).find(k=>k.toLowerCase()==="content-encoding");
shape.push({path:"header.json",value:/json/i.test(headers[typeKey]||"")},{path:"header.protobuf",value:/protobuf|octet-stream/i.test(headers[typeKey]||"")},{path:"header.encoding",value:/^(gzip|deflate|br|zstd)$/.test(headers[encodingKey]||"")?headers[encodingKey]:"other-or-absent"});
let mime=headers[typeKey];if(Array.isArray(headers)){const row=headers.find(x=>String(x.field||x.name||x.key||"").toLowerCase()==="content-type");mime=row?.value;}
const base=String(mime||"").split(";",1)[0].trim();shape.push({path:"header.shape",value:Array.isArray(headers)?"array":typeof headers},{path:"header.type",value:/^[a-z0-9.+-]+\\/[a-z0-9.+-]+$/i.test(base)?base:"absent-or-other"});
const metaFlags=/\\/extended-metadata\\/v0\\/extended-metadata/.test($request.url)?metadataShape(incoming):[];
report({phase:"${kind}-enter",route:"runtime",method:$request.method,status:Number($response.status),bytes:incoming?incoming.length:0,flags:shape.concat(metaFlags.length?metaFlags:availabilityMapPaths(incoming,true))},start);
})($done);\n`;
}
