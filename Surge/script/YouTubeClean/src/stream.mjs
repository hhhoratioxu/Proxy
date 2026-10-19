// Copyright 2026 Horatio Xu. MIT. Independent UMP metadata transformer.
import {ctr} from '@noble/ciphers/aes';
import {hmac} from '@noble/hashes/hmac';
import {sha256} from '@noble/hashes/sha256';
import {gunzipSync,gzipSync} from 'fflate';
import {decodeMessage,findField,join,makeBytes,replaceAll,withPayload,same} from './wire.mjs';
import {fromUtf8,utf8,safeJson,MAX_BODY} from './data.mjs';
import {editBinary,editJson,editWatchPart} from './edit.mjs';

export function umpInteger(value){
  if(!Number.isInteger(value)||value<0||value>0xffffffff)throw Error('UMP integer range');
  const length=value<128?1:value<16384?2:value<2097152?3:value<268435456?4:5;
  if(length===1)return new Uint8Array([value]);
  if(length===5){const out=new Uint8Array(5);out[0]=240;new DataView(out.buffer).setUint32(1,value,true);return out;}
  const width=8-length,out=new Uint8Array(length);out[0]=(256-(1<<(9-length)))|(value&((1<<width)-1));
  for(let i=1;i<length;i++)out[i]=Math.floor(value/2**(width+8*(i-1)))&255;return out;
}
function readInteger(raw,start){
  if(start>=raw.length)throw Error('UMP truncated');const first=raw[start],length=first<128?1:first<192?2:first<224?3:first<240?4:5;
  if(start+length>raw.length)throw Error('UMP truncated integer');if(length===1)return[first,start+1];
  if(length===5)return[new DataView(raw.buffer,raw.byteOffset+start+1,4).getUint32(0,true),start+5];
  const width=8-length;let value=first&((1<<width)-1);for(let i=1;i<length;i++)value+=raw[start+i]*2**(width+8*(i-1));return[value,start+length];
}
export const umpFrame=(type,payload)=>join([umpInteger(type),umpInteger(payload.length),payload]);
export function umpFrames(raw){
  const frames=[];let pos=0;
  while(pos<raw.length){if(frames.length>=50000)throw Error('UMP count');const begin=pos;let type,size;[type,pos]=readInteger(raw,pos);[size,pos]=readInteger(raw,pos);if(size>raw.length-pos)throw Error('UMP payload truncated');frames.push({type,payload:raw.subarray(pos,pos+size),raw:raw.subarray(begin,pos+size)});pos+=size;}
  return frames;
}
function signature(cipher,iv,key){if(key.length!==32||iv.length!==16)throw Error('UMP crypto dimensions');return hmac.create(sha256,key.subarray(16)).update(cipher).update(iv).digest();}
export function openMetadata(cipher,mac,iv,key){
  if(mac?.length!==32||!iv||!cipher)throw Error('UMP authentication');const actual=signature(cipher,iv,key);let difference=0;for(let i=0;i<32;i++)difference|=actual[i]^mac[i];if(difference)throw Error('UMP authentication');return ctr(key.subarray(0,16),iv).decrypt(cipher);
}
export function sealMetadata(plain,iv,key){const cipher=ctr(key.subarray(0,16),iv).encrypt(plain);return{cipher,mac:signature(cipher,iv,key),iv};}
function unpack(data,compression){
  if(compression!==0&&compression!==1)throw Error('UMP compression');const gzip=data[0]===31&&data[1]===139;if(compression===1&&!gzip)throw Error('UMP gzip marker');
  if(!gzip)return{plain:data,gzip:false};
  if(data.length<18||new DataView(data.buffer,data.byteOffset+data.length-4,4).getUint32(0,true)>MAX_BODY)throw Error('UMP gzip size');
  const plain=gunzipSync(data);if(plain.length>MAX_BODY)throw Error('UMP expanded size');return{plain,gzip:true};
}
function transformSealed(cipher,mac,iv,key,compression,edit){
  const {plain,gzip}=unpack(openMetadata(cipher,mac,iv,key),compression);const fresh=edit(plain);if(same(plain,fresh))return null;
  return sealMetadata(gzip?gzipSync(fresh,{level:1,mtime:0}):fresh,iv,key);
}
function modifyWatchStream(plain,settings,onKeys,trace){
  const fields=decodeMessage(plain),out=[];let changed=false;
  for(const f of fields){if(f.no===4&&f.wire===2){const fresh=editWatchPart(f.payload,settings,onKeys,trace);if(!same(fresh,f.payload)){out.push(withPayload(f,fresh));changed=true;continue;}}out.push(f.raw);}
  return changed?join(out):plain;
}
function modifyPlayerEnvelope(plain,settings,onKeys,trace){
  const fields=decodeMessage(plain),status=findField(fields,1)?.value,http=findField(fields,2)?.value,body=findField(fields,4);
  if(status!==1n||http!==200n||body?.wire!==2)return plain;
  let fresh=body.payload;const first=fromUtf8(fresh.subarray(0,40));
  if(/^\s*\{/.test(first)){const json=safeJson(fromUtf8(fresh)),changes={changed:false};editJson(json,settings,onKeys,trace,changes);if(!changes.changed)return plain;fresh=utf8(JSON.stringify(json));}
  else fresh=editBinary(fresh,'player',settings,onKeys,trace);
  return same(fresh,body.payload)?plain:replaceAll(fields,4,[withPayload(body,fresh)]);
}
export function editStream(raw,key,settings,trace,onKeys){
  const frames=umpFrames(raw),output=frames.map(f=>f.raw);let header=null,headerIndex=-1,changed=false;
  if(trace){trace.umpFrames=frames.length;trace.umpTypes=[...new Set(frames.map(f=>f.type))].slice(0,16);trace.umpHeaderTypes=[];trace.metadataParts=0;trace.changedMetadataParts=0;}
  for(let i=0;i<frames.length;i++){
    const frame=frames[i];
    if(frame.type===10){header=decodeMessage(frame.payload);headerIndex=i;continue;}
    if(frame.type!==11||!header)continue;
    const type=findField(header,1)?.value,crypto=findField(header,4);
    if(trace&&trace.umpHeaderTypes.length<12){const number=Number(type??0n);if(Number.isSafeInteger(number)&&number>=0&&!trace.umpHeaderTypes.includes(number))trace.umpHeaderTypes.push(number);}
    const player=type===0n||type===undefined;
    if(trace&&(type===25n||player))trace.metadataParts++;
    if((type===25n||player&&crypto?.wire===2)&&!key){if(trace)trace.missingKey=true;header=null;continue;}
    if(type===25n){
      const parts=decodeMessage(frame.payload),cipher=findField(parts,1),mac=findField(parts,2),iv=findField(parts,3),compression=Number(findField(parts,4)?.value||0n);
      const replacement=transformSealed(cipher?.payload,mac?.payload,iv?.payload,key,compression,p=>modifyWatchStream(p,settings,onKeys,trace));
      if(replacement){let body=replaceAll(parts,1,[makeBytes(1,replacement.cipher)]);body=replaceAll(decodeMessage(body),2,[makeBytes(2,replacement.mac)]);output[i]=umpFrame(11,body);changed=true;if(trace)trace.changedMetadataParts++;}
    }else if(player&&crypto?.wire===2){
      const parameters=decodeMessage(crypto.payload),mac=findField(parameters,4),iv=findField(parameters,5),compression=Number(findField(parameters,6)?.value||0n);
      const replacement=transformSealed(frame.payload,mac?.payload,iv?.payload,key,compression,p=>modifyPlayerEnvelope(p,settings,onKeys,trace));
      if(replacement){const params=replaceAll(parameters,4,[makeBytes(4,replacement.mac)]),freshHeader=replaceAll(header,4,[withPayload(crypto,params)]);output[headerIndex]=umpFrame(10,freshHeader);output[i]=umpFrame(11,replacement.cipher);changed=true;if(trace)trace.changedMetadataParts++;}
    }else if(player&&!crypto){
      // CryptoParams is optional in the protocol. A clear player envelope can be
      // processed without a key, after verifying its success/status/body fields.
      const fresh=modifyPlayerEnvelope(frame.payload,settings,onKeys,trace);
      if(!same(fresh,frame.payload)){output[i]=umpFrame(11,fresh);changed=true;if(trace)trace.changedMetadataParts++;}
    }
    header=null;
  }
  return changed?join(output):raw;
}
