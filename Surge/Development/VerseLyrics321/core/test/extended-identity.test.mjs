import test from 'node:test';import assert from 'node:assert/strict';
import {extendedIdentity,extendedTracks,join,dataField,stringField,numberField,base62Hex} from '../spotify-lyrics.js';
const id=n=>String(n).padStart(22,'0');
const track=(n,title='Original '+n)=>join([dataField(1,Buffer.from(base62Hex(id(n)),'hex')),stringField(2,title),dataField(3,stringField(2,'Album')),dataField(4,stringField(2,'Artist')),numberField(7,600000),numberField(18,0),...Array.from({length:25},()=>stringField(100,'opaque metadata'))]);
const entity=(n,{body=track(n),type='type.googleapis.com/spotify.metadata.Track',status=200}={})=>join([dataField(1,numberField(1,status)),stringField(2,'spotify:track:'+id(n)),dataField(3,join([stringField(1,type),dataField(2,body)]))]);
const group=(entities,{kind=10,status=200}={})=>dataField(2,join([...entities.map(e=>dataField(3,e)),dataField(1,numberField(1,status)),numberField(2,kind)]));
test('lookup reads one identity from a large batch without retaining a rewrite tree',()=>{
 const bytes=group(Array.from({length:100},(_,n)=>entity(n+1))),before=bytes.slice();
 for(const n of [1,50,100]){const r=extendedIdentity(bytes,id(n)),old=extendedTracks(bytes).records[n-1];assert.deepEqual(r.meta,old.meta);assert.equal(r.hasLyrics,old.hasLyrics);assert.deepEqual(Object.keys(r).sort(),['hasLyrics','hasLyricsField','meta']);}
 assert.deepEqual(bytes,before);assert.equal(extendedIdentity(bytes,id(101)),undefined);
});
for(const opts of [{kind:7},{status:404}])test('non-track or failed group does not supply identity '+JSON.stringify(opts),()=>assert.equal(extendedIdentity(group([entity(1)],opts),id(1)),undefined));
for(const opts of [{status:404},{type:'spotify.metadata.Album'},{body:track(2)},{body:new Uint8Array([0])}])test('invalid target entity stays unavailable '+JSON.stringify(Object.keys(opts)),()=>assert.equal(extendedIdentity(group([entity(1,opts)]),id(1)),undefined));
test('duplicate candidates retain first valid identity while every outer wire envelope is validated',()=>{
 const bytes=group([entity(1,{body:new Uint8Array([0])}),entity(1),entity(1,{body:track(1,'Later')})]);assert.equal(extendedIdentity(bytes,id(1)).meta.title,'Original 1');
 assert.throws(()=>extendedIdentity(join([bytes,new Uint8Array([0])]),id(1)));assert.throws(()=>extendedIdentity(group([entity(1),new Uint8Array([0])]),id(1)));
});
