import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../../script/ApplePhotosMapDiagnostic.lpx',import.meta.url),'utf8');
const compat=readFileSync(new URL('../../script/ApplePhotosMapDiagnostic.plugin',import.meta.url),'utf8');
const lines=main.split('\n').filter(x=>/^(request|response) if /.test(x));
function guard(line){const m=/\$\{url\} ~= (\/(?:\\.|[^/])+\/)/.exec(line);assert.ok(m);return vm.runInNewContext(m[1]);}
function first(phase,url,status){return lines.find(x=>x.startsWith(phase+' ')&&guard(x).test(url)&&(!x.includes('${response.status} == 200')||status===200));}
const manifest='https://gspe35-ssl.ls.apple.com/geo_manifest/dynamic/config';
const tile='https://gspe19-cn-ssl.ls.apple.com/tiles';
const dispatcher='https://dispatcher.is.autonavi.com/dispatcher';
test('primary LPX and compatibility entry are identical version 0.2.0',()=>{assert.equal(main,compat);assert.ok(main.includes('诊断 0.2.0'));assert.ok(main.includes('#!loon_version = 3.5.1(983)'));assert.equal(lines.length,7);});
test('only successful manifest response requires a binary body',()=>{const bodies=lines.filter(x=>x.includes('requires_body=true'));assert.equal(bodies.length,1);assert.ok(bodies[0].startsWith('response '));assert.ok(bodies[0].includes('${response.status} == 200'));assert.ok(bodies[0].includes('binary_body_mode=true'));});
test('the first-match rule selects manifest body for 200 and headers for other statuses',()=>{assert.ok(first('response',manifest,200).includes('数据源诊断'));for(const status of [304,400,403,500]){const line=first('response',manifest,status);assert.ok(line.includes('资源响应头诊断'));assert.ok(!line.includes('requires_body'));}});
test('both tile and dispatcher response rules use header phase',()=>{for(const url of [tile,dispatcher])for(const status of [200,304,403,500]){const line=first('response',url,status);assert.ok(line);assert.ok(!line.includes('requires_body'));assert.ok(!line.includes('binary_body_mode'));}});
test('nine narrowly matched domains remain covered by MITM',()=>{
  const hosts=main.split('hostname = ')[1].trim().split(/,\s*/);
  for(const url of [manifest,tile,'https://gspe19-2-cn-ssl.ls.apple.com/tiles','https://gspe19-ssl.ls.apple.com/tile.vf','https://gspe19-kittyhawk-ssl.ls.apple.com/tile.vf','https://gspe11-2-cn-ssl.ls.apple.com/2/tiles','https://gspe11-ssl.ls.apple.com/tile',dispatcher,'https://gsp-ssl.ls.apple.com/dispatcher.arpc']){assert.ok(hosts.includes(new URL(url).hostname));assert.ok(first('request',url));assert.ok(first('response',url,200));}
  assert.equal(hosts.length,9);assert.ok(!hosts.some(x=>x.includes('*')));
});
test('out-of-scope URLs match no generated rule',()=>{
  for(const url of [tile+'/extra',tile+'#secret','https://example.com/tiles','https://gspe19-cn-ssl.ls.apple.com.evil.test/tiles','https://gspe19-cn-ssl.ls.apple.com:444/tiles','https://gsp-ssl.ls.apple.com/wloc'])for(const line of lines)assert.ok(!guard(line).test(url));
});
test('generated scripts use one immutable runtime and only documented Loon options',()=>{
  const paths=lines.map(x=>/script\("([^"]+)"/.exec(x)?.[1]);assert.equal(new Set(paths).size,1);assert.match(paths[0],/^https:\/\/raw\.githubusercontent\.com\/hhhoratioxu\/Proxy\/[a-f0-9]{40}\/Loon\/script\/ApplePhotosMapDiagnostic\.js$/);
  for(const line of lines){assert.ok(!line.includes('max_size'));assert.ok(!line.includes('engine='));assert.ok(line.includes('timeout=3'));}
});
