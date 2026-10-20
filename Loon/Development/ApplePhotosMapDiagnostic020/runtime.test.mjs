import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';

const source=readFileSync(new URL('../../script/ApplePhotosMapDiagnostic.js',import.meta.url),'utf8');
const compiled=new vm.Script(source);
const tileURL='https://gspe19-cn-ssl.ls.apple.com/tiles';
const manifestURL='https://gspe35-ssl.ls.apple.com/geo_manifest/dynamic/config';
const hash=b=>createHash('sha256').update(b).digest('hex');
const req=(url=tileURL,headers={})=>({url,method:'GET',headers});
const res=(body,status=200,type='application/octet-stream')=>({body,status,headers:{'content-type':type}});
function invoke(request=req(),response,extra={}) {
  const done=[],logs=[];
  const sandbox={Uint8Array,ArrayBuffer,$request:request,$done:x=>done.push(x),console:{log:x=>logs.push(x)},...extra};
  if(response!==undefined)sandbox.$response=response;
  for(const key of ['$httpClient','$persistentStore','$config'])Object.defineProperty(sandbox,key,{get(){throw Error('unexpected host API '+key);}});
  compiled.runInNewContext(sandbox,{timeout:1000});
  assert.equal(done.length,1,'exactly one completion');
  assert.equal(JSON.stringify(done[0]),'{}','original traffic is preserved');
  return {logs,records:logs.map(x=>JSON.parse(x.slice('[ApplePhotosMapDiagnostic] '.length)))};
}
const headers=(x='11642',y='5123',z='14',style='style=1&size=2&scale=0&v=18965870')=>({'maps-tile-x':x,'maps-tile-y':y,'maps-tile-z':z,'maps-tile-style':style});
const tile=(r=req())=>invoke(r).records[0].tile;
const vi=value=>{const a=[];do{const b=value%128;value=Math.floor(value/128);a.push(b+(value?128:0));}while(value);return Buffer.from(a);};
const message=(number,bytes)=>Buffer.concat([vi(number*8+2),vi(bytes.length),bytes]);
const string=(n,s)=>message(n,Buffer.from(s));
function manifest() {
  return Buffer.concat([message(1,Buffer.alloc(0)),message(2,Buffer.concat([string(1,'https://gspe19-cn-ssl.ls.apple.com/tiles'),message(5,message(2,Buffer.alloc(0)))])),message(92,message(10,string(1,'https://shift.is.autonavi.com/localshift'))),string(30,'SECRET_MANIFEST_TOKEN')]);
}

test('reported bare GET URL is handled without an exception',()=>{
  const r=invoke(req());assert.equal(r.records[0].version,'0.2.0');assert.equal(r.records[0].interface,'vector-tile');assert.equal(r.records[0].provider,'apple-cn');assert.deepEqual(r.records[0].query.keys,[]);assert.equal(r.records[0].tile.coordinates,'unavailable');
});
test('bare GET with published maps headers now identifies a valid coordinate carrier',()=>{
  const r=tile(req(tileURL,headers()));assert.equal(r.coordinates,'valid');assert.equal(r.carrier,'headers');assert.equal(r.queryXYZ,'missing');assert.equal(r.headerXYZ,'valid');assert.equal(r.zoom,14);assert.deepEqual(r.headerStyle.options,{style:1,size:2,scale:0});
});
test('header names are case insensitive',()=>{
  const r=tile(req(tileURL,{'Maps-Tile-X':'0','MAPS-TILE-Y':'0','maps-TILE-z':'1','MAPS-TILE-STYLE':'style=20&size=2&scale=0'}));assert.equal(r.coordinates,'valid');assert.equal(r.zoom,1);assert.equal(r.headerStyle.options.style,20);
});
test('precise coordinates, credentials and unknown header values never enter logs',()=>{
  const h=headers('123456789','98765432','27','style=1&size=2&scale=0&v=19999887&token=SECRET_STYLE_TOKEN');
  Object.assign(h,{'maps-auth-token':'SECRET_MAPS_TOKEN',Authorization:'SECRET_AUTH',Cookie:'SECRET_COOKIE','x-tilekey':'SECRET_TILEKEY','x-private-street':'SECRET_STREET'});
  const r=invoke(req(tileURL,h)),text=r.logs.join('');
  assert.equal(r.records[0].tile.coordinates,'valid');
  for(const secret of ['123456789','98765432','19999887','SECRET','x-private-street','maps-auth-token','x-tilekey'])assert.ok(!text.includes(secret),secret);
});
test('credential and unknown header getters are not read',()=>{
  const h=headers();for(const key of ['maps-auth-token','Authorization','Cookie','x-tilekey','Unknown'])Object.defineProperty(h,key,{enumerable:true,get(){throw Error('credential read');}});
  assert.equal(tile(req(tileURL,h)).coordinates,'valid');
});
test('known header getter failure still preserves traffic and emits a safe failure marker',()=>{
  const h={};Object.defineProperty(h,'maps-tile-x',{enumerable:true,get(){throw Error('SECRET_ERROR');}});
  const r=invoke(req(tileURL,h));assert.equal(r.records[0].tile.parse,'header-read-failed');assert.ok(!r.logs.join('').includes('SECRET_ERROR'));
});
test('case-duplicate coordinate headers are ambiguous',()=>{
  const h={...headers(),'MAPS-TILE-X':'11642'};assert.equal(tile(req(tileURL,h)).headerXYZ,'ambiguous');assert.equal(tile(req(tileURL,h)).coordinates,'unavailable');
});
test('case-duplicate style headers are not interpreted',()=>{
  const h={...headers(),'MAPS-TILE-STYLE':'style=20'};const r=tile(req(tileURL,h));assert.equal(r.headerStyle.state,'ambiguous');assert.equal(r.headerStyle.options,undefined);
});
test('prototype headers cannot supply a coordinate',()=>{
  const h=Object.create(headers());assert.equal(tile(req(tileURL,h)).headerXYZ,'missing');
});
test('zero coordinates and zero zoom are valid',()=>{
  const r=tile(req(tileURL,headers('0','0','0')));assert.equal(r.coordinates,'valid');assert.equal(r.zoom,0);
});
test('upper supported zoom and its maximum tile indices are valid',()=>assert.equal(tile(req(tileURL,headers('1073741823','1073741823','30'))).coordinates,'valid'));
for(const [label,h] of [
  ['negative x',headers('-1')],['fractional x',headers('1.2')],['scientific x',headers('1e3')],['whitespace x',headers(' 1')],['oversized x',headers('11111111111')],['non-string x',headers(1)],['leading zero',headers('01')],['zoom above bound',headers('1','1','31')],['x outside tile grid',headers('4','1','2')],['y outside tile grid',headers('1','4','2')],['negative zoom',headers('1','1','-1')],['array x',headers(['1'])]
])test('invalid coordinate input: '+label,()=>{const r=tile(req(tileURL,h));assert.equal(r.headerXYZ,'invalid');assert.equal(r.coordinates,'unavailable');assert.equal(r.zoom,undefined);});
test('partial coordinates remain unavailable',()=>{
  const r=tile(req(tileURL,{'maps-tile-x':'10','maps-tile-z':'5'}));assert.equal(r.headerXYZ,'partial');assert.equal(r.coordinates,'unavailable');
});
test('query XYZ remains supported and redacted',()=>{
  const r=invoke(req(tileURL+'?x=123456789&y=98765432&z=27&token=SECRET'));assert.equal(r.records[0].tile.carrier,'query');assert.equal(r.records[0].tile.coordinates,'valid');assert.ok(!r.logs.join('').includes('123456789'));assert.ok(!r.logs.join('').includes('SECRET'));
});
test('encoded query coordinate names and values are supported',()=>{
  const r=tile(req(tileURL+'?%78=%31&y=2&z=3'));assert.equal(r.coordinates,'valid');assert.equal(r.carrier,'query');
});
test('matching query and header coordinates are recognized without logging them',()=>{
  const r=tile(req(tileURL+'?x=1&y=2&z=3',headers('1','2','3')));assert.equal(r.coordinates,'valid');assert.equal(r.carrier,'both');
});
test('conflicting complete carriers do not select a coordinate',()=>{
  const r=tile(req(tileURL+'?x=1&y=2&z=3',headers('2','2','3')));assert.equal(r.coordinates,'conflict');assert.equal(r.zoom,undefined);
});
test('a partial query does not override complete headers',()=>{
  const r=tile(req(tileURL+'?x=1',headers()));assert.equal(r.coordinates,'unavailable');assert.equal(r.queryXYZ,'partial');assert.equal(r.headerXYZ,'valid');
});
test('duplicate query coordinates remain ambiguous',()=>assert.equal(tile(req(tileURL+'?x=1&x=2&y=1&z=3')).queryXYZ,'ambiguous'));
test('malformed percent escapes never escape into a log',()=>{
  const r=invoke(req(tileURL+'?%FF=SECRET'));assert.equal(r.records[0].tile.queryXYZ,'invalid');assert.ok(!r.logs.join('').includes('SECRET'));
});
test('maps-tile-style permits only safe bounded numeric options',()=>{
  const r=tile(req(tileURL,headers('1','1','3','style=121&size=9&scale=5&v=SECRET&x=123&y=456')));assert.deepEqual(r.headerStyle.options,{});assert.deepEqual(r.headerStyle.keys,['scale','size','style','v','x','y']);
});
test('third duplicate style option cannot re-enable logging',()=>{
  const r=tile(req(tileURL,headers('1','1','3','style=1&style=2&style=3')));assert.deepEqual(r.headerStyle.options,{});
});
test('long style header and long header lists have explicit bounds',()=>{
  assert.equal(tile(req(tileURL,headers('1','1','3','x'.repeat(2049)))).headerStyle.state,'header-limit');
  const h={...headers()};for(let i=0;i<129;i++)h['unknown-'+i]='SECRET';const r=tile(req(tileURL,h));assert.equal(r.headerXYZ,'header-limit');assert.equal(r.coordinates,'unavailable');
});
test('long query lists stop coordinate detection',()=>{
  const r=tile(req(tileURL+'?'+Array.from({length:129},()=> 'x=1').join('&')));assert.equal(r.queryXYZ,'query-limit');
});
test('requests and responses never read a tile body',()=>{
  const request=req(tileURL,headers()),response=res(undefined,200,'application/octet-stream');
  for(const obj of [request,response])Object.defineProperty(obj,'body',{get(){throw Error('SECRET_BODY_READ');}});
  assert.equal(invoke(request).records[0].tile.coordinates,'valid');assert.equal(invoke(request,response).records[0].status,200);
});
test('tile status and recognized image MIME are reported without the body',()=>{
  const request=req('https://gspe11-ssl.ls.apple.com/tile',headers());for(const [status,type] of [[200,'image/jpeg'],[403,'text/html'],[500,'SECRET_MIME']]){
    const r=invoke(request,res('SECRET_BODY',status,type));assert.equal(r.records[0].status,status);assert.equal(r.records[0].contentType,type==='SECRET_MIME'?'other':type);assert.ok(!r.logs.join('').includes('SECRET'));
  }
});
test('request object, headers and binary response remain unchanged',()=>{
  const h=Object.freeze(headers()),request=Object.freeze(req(tileURL,h)),bytes=new Uint8Array([1,2,3]);const before=hash(bytes);invoke(request,res(bytes));assert.equal(hash(bytes),before);assert.equal(h['maps-tile-x'],'11642');
});
test('manifest scanner retains existing source-provider summaries',()=>{
  const body=manifest(),before=hash(body),r=invoke(req(manifestURL),res(body));const m=r.records[0].manifest;
  assert.equal(m.parse,'ok');assert.equal(m.tileProviders['apple-cn'],1);assert.equal(m.shiftProviders.amap,1);assert.equal(hash(body),before);assert.ok(!r.logs.join('').includes('SECRET'));
});
test('304 manifest responses do not access missing body data',()=>{
  const response=res(undefined,304);Object.defineProperty(response,'body',{get(){throw Error('body read');}});const r=invoke(req(manifestURL),response);assert.equal(r.records[0].status,304);assert.equal(r.records[0].manifest,undefined);
});
test('malformed, empty, unknown and oversized manifests fail safely',()=>{
  for(const [body,state] of [[new Uint8Array(),'empty'],[new Uint8Array([0]),'unsupported-or-malformed'],[string(100,'SECRET'),'unknown-schema'],[new Uint8Array(1048577),'body-limit'],['SECRET','binary-unavailable']])assert.equal(invoke(req(manifestURL),res(body)).records[0].manifest.parse,state);
});
test('unknown uint64 and fixed-width protobuf fields are skipped safely',()=>{
  const body=Buffer.concat([manifest(),vi(200*8),Buffer.from([255,255,255,255,255,255,255,255,255,1]),vi(201*8+1),Buffer.alloc(8),vi(202*8+5),Buffer.alloc(4)]);assert.equal(invoke(req(manifestURL),res(body)).records[0].manifest.parse,'ok');
});
test('excessive protobuf field count is bounded',()=>assert.equal(invoke(req(manifestURL),res(Buffer.from(Array(20001).fill([8,0]).flat()))).records[0].manifest.parse,'unsupported-or-malformed'));
test('all nine supported endpoints keep known classification',()=>{
  for(const url of [manifestURL,tileURL,'https://gspe19-2-cn-ssl.ls.apple.com/tiles','https://gspe19-ssl.ls.apple.com/tile.vf','https://gspe19-kittyhawk-ssl.ls.apple.com/tile.vf','https://gspe11-2-cn-ssl.ls.apple.com/2/tiles','https://gspe11-ssl.ls.apple.com/tile','https://dispatcher.is.autonavi.com/dispatcher','https://gsp-ssl.ls.apple.com/dispatcher.arpc'])assert.equal(invoke(req(url)).records.length,1,url);
});
test('out-of-scope hosts, paths, protocols, ports and fragments remain silent',()=>{
  for(const url of ['http://gspe19-cn-ssl.ls.apple.com/tiles',tileURL+'/extra',tileURL+'#secret','https://gspe19-cn-ssl.ls.apple.com.evil.test/tiles','https://gspe19-cn-ssl.ls.apple.com:444/tiles','https://user@gspe19-cn-ssl.ls.apple.com/tiles','https://example.com/tiles'])assert.equal(invoke(req(url)).records.length,0,url);
});
test('logger and known-header errors cannot change traffic or completion count',()=>{
  invoke(req(),undefined,{console:{log(){throw Error('logger unavailable');}}});
});
test('250 fuzzed inputs complete without logging arbitrary secret values',()=>{
  for(let i=0;i<250;i++){
    const h=headers('SECRET_X_'+i,'SECRET_Y_'+i,'SECRET_Z_'+i,'random=SECRET_'+i);const r=invoke(req(tileURL,h),res(randomBytes(i%80)));assert.ok(!r.logs.join('').includes('SECRET'));
  }
});
test('1,000 sequential invocations have no cross-request state',()=>{
  for(let i=0;i<1000;i++){const r=tile(req(tileURL,headers(String(i%100),String(i%100),'10')));assert.equal(r.coordinates,'valid');assert.equal(r.zoom,10);}
});
