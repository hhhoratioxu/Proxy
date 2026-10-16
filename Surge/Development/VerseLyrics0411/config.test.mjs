import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
const ext={Surge:'sgmodule',Loon:'plugin',Shadowrocket:'sgmodule',QuantumultX:'conf'};
const hosts=['spclient.wg.spotify.com','gew1-spclient.spotify.com','gae2-spclient.spotify.com:443'];
const routes=['color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo','color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo/image/ab12','metadata/4/track/00000000000000000000000000000001','extended-metadata/v0/extended-metadata','scrollsita/v1/scroll/spotify:track:76XUZSb13QUuj1HECY4Hvo','scrollsita/v1/scroll/spotify%3Atrack%3A76XUZSb13QUuj1HECY4Hvo','user-customization-service/v1/customize','bootstrap/v1/bootstrap','v1/customize','context-resolve/v1/spotify%3Aplaylist%3Aabcdefgh','connect-state/v1/devices/abcdefghijklmnop'];
for(const [c,e]of Object.entries(ext)){
  if(c==='Loon')continue; // Native Rewrite and two response hooks have their own parity suite.
  const cfg=readFileSync(new URL(`./publish/${c}/script/SpotifyLyrics.${e}`,import.meta.url),'utf8');
  test(`${c}: three native hooks with complete URL coverage and correct binary configuration`,()=>{
    const lines=cfg.split('\n').filter(x=>/^(?:VerseLyrics-|request if|response if|\^https:)/.test(x));assert.equal(lines.length,3);
    let regexes;
    if(c==='Loon'){
      regexes=lines.map(l=>new RegExp(l.split(' ~= /')[1].split('/ && ')[0].split('/ then ')[0]));
      assert.match(lines[0],/^request if /);assert.match(lines[1],/^response if /);
      assert.match(lines[1],/requires_body=true, binary_body_mode=true/);
      assert.match(lines[1],/timeout=12/);assert.match(lines[2],/timeout=3/);assert.match(lines[1],/Content-Length/);assert.doesNotMatch(lines[0],/requires_body=true/);
      for(const line of lines)for(const option of line.split(' with ')[1].split(','))assert.ok(['tag','timeout','requires_body','binary_body_mode'].includes(option.trim().split('=')[0]),'documented Loon option');
      for(const key of ['TRANSLATION_ENABLED','TARGET_LANGUAGE','FALLBACK_PROVIDER','DISCOVER_MISSING']){
        assert.ok(cfg.includes('\n'+key+' = '));for(const l of lines)assert.ok(l.includes('${'+key+'}'));
      }
    }else if(c==='QuantumultX'){
      regexes=lines.map(l=>new RegExp(l.split(' url ')[0]));
      assert.match(lines[0],/ url script-request-header /);assert.match(lines[1],/ url script-response-body /);
      for(const l of lines){const u=new URL(l.split(' ').at(-1));const p=new URLSearchParams(u.hash.slice(1));assert.equal(p.get('TARGET_LANGUAGE'),'zh-CN');assert.equal(p.get('TRANSLATION_ENABLED'),'true');assert.equal(p.get('FALLBACK_PROVIDER'),'auto');assert.equal(p.get('DISCOVER_MISSING'),'true');}
      assert.doesNotMatch(cfg,/\[rewrite_local\]|binary-body-mode|script-path=/);
    }else{
      const opts=lines.map(l=>Object.fromEntries(l.split(' = ')[1].split(',').map(kv=>[kv.slice(0,kv.indexOf('=')),kv.slice(kv.indexOf('=')+1)])));
      regexes=opts.map(o=>new RegExp(o.pattern));assert.equal(opts[0].type,'http-request');assert.equal(opts[1].type,'http-response');assert.equal(opts[1]['binary-body-mode'],'true');assert.equal(opts[1]['requires-body'],'true');assert.equal(opts[1]['max-size'],'262144');assert.equal(opts[1].timeout,'12');assert.equal(opts[0].timeout,'3');
      for(const o of opts){assert.equal(new URLSearchParams(o.argument).get('TARGET_LANGUAGE'),'zh-CN');assert.equal(Object.keys(o).some(x=>x==='512}'||x==='128}'),false);}
      if(c==='Surge')assert.deepEqual(opts.map(o=>o.engine),['jsc','webview','webview']);
      else assert.ok(opts.every(o=>!Object.hasOwn(o,'engine')));
      assert.match(cfg,/hostname = %APPEND% spclient\.wg\.spotify\.com, \*-spclient\.spotify\.com/);
    }
    for(const h of hosts)for(const p of routes)for(const suffix of ['', '?market=US&format=protobuf']){
      const u=`https://${h}/${p}${suffix}`;assert.ok(regexes[0].test(u));assert.equal(regexes.slice(1).filter(r=>r.test(u)).length,1);assert.equal(regexes[1].test(u),p.startsWith('color-lyrics/'));
    }
    for(const r of regexes)for(const u of ['https://accounts.spotify.com/authorize','https://spclient.wg.spotify.com/gander/v2/GetUserHasUnreadNotification','https://spclient.wg.spotify.com.evil.test/color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo','http://spclient.wg.spotify.com/color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo'])assert.equal(r.test(u),false);
    assert.match(lines[2],/SpotifyLyrics\.Entry\.js/);
    const entry=readFileSync(new URL(`./runtime/${c}/script/SpotifyLyrics.Entry.js`,import.meta.url),'utf8');new vm.Script(entry);assert.ok(Buffer.byteLength(entry)<32000);assert.doesNotMatch(entry,/HAN_TABLES|function translate|function sourceLyrics|function nativeHTTP/);
    assert.doesNotMatch(entry,/setTimeout\(|lrclib\.net|translate\.googleapis\.com/);
    if(c==='Loon')assert.match(cfg,/FALLBACK_PROVIDER = select,"auto","lrclib","qq","netease","kugou","kuwo","lyricsovh","off"/);
    assert.match(lines[0],/SpotifyLyrics\.Request\.js/);assert.doesNotMatch(lines[1],/SpotifyLyrics\.Request\.js/);
    const request=readFileSync(new URL(`./runtime/${c}/script/SpotifyLyrics.Request.js`,import.meta.url),'utf8');new vm.Script(request);assert.ok(Buffer.byteLength(request)<5000);assert.doesNotMatch(request,/HAN_FOLD|function sourceLyrics|const nativeStorage/);
    const js=readFileSync(new URL(`./runtime/${c}/script/SpotifyLyrics.js`,import.meta.url),'utf8');new vm.Script(js);assert.doesNotMatch(js,/^export |^import /m);assert.match(js,/UNICODE LICENSE V3/);assert.ok(js.includes(`VerseLyrics ${c} adapter 9`));
    assert.doesNotMatch(js,/function scrollDocument|function handlePlayerEntry|function handleLyricGate/);assert.ok(Buffer.byteLength(js)<100000);
  });
}

test('Loon header-stage size guards cover all lengths around both body limits',()=>{
 const cfg=readFileSync(new URL('./publish/Loon/script/SpotifyLyrics.plugin',import.meta.url),'utf8');const patterns=[...cfg.matchAll(/Content-Length'\]\} ~= \/([^]*?)\/\)/g)];assert.equal(patterns.length,2);
 for(let i=0;i<patterns.length;i++){const r=new RegExp(patterns[i][1]),limit=i===0?262144:131072;for(let n=0;n<300000;n++)assert.equal(r.test(String(n)),n<=limit,`${i}: ${n}`);for(const n of [-1,1000000,'garbage','1e3'])assert.equal(r.test(String(n)),false);}
});
