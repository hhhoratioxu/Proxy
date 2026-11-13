import {metadataShape} from './metadata-shape.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const vi=v=>{const a=[];do{a.push((v&127)|(v>127?128:0));v=Math.floor(v/128);}while(v);return Buffer.from(a);};
const bin=(n,b)=>Buffer.concat([vi(n*8+2),vi(b.length),b]),txt=(n,s)=>bin(n,Buffer.from(s)),num=(n,v)=>Buffer.concat([vi(n*8),vi(v)]),cat=(...v)=>Buffer.concat(v);
test('diagnostic distinguishes partial TRACK_V4 without exposing any text',()=>{
  const track=cat(bin(1,new Uint8Array(16)),txt(2,'SECRET'),num(7,480200));
  const any=cat(txt(1,'type.googleapis.com/spotify.metadata.Track'),bin(2,track));
  const group=cat(num(2,10),bin(3,cat(txt(2,'spotify:track:76XUZSb13QUuj1HECY4Hvo'),bin(3,any))));
  const result=metadataShape(new Uint8Array(bin(2,group)));assert.ok(!JSON.stringify(result).includes('SECRET'));
  const m=Object.fromEntries(result.map(x=>[x.path,x.value]));assert.equal(m['metadata.0.albumName'],false);assert.equal(m['metadata.0.artistNames'],false);assert.equal(m['metadata.0.durationRaw'],480200);assert.equal(m['metadata.0.hasLyrics'],'omitted');
});
test('malformed and oversize metadata yield no raw data',()=>{for(const b of [new Uint8Array([255]),new Uint8Array(131073)])assert.deepEqual(metadataShape(b),[]);});
