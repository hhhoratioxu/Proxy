import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
const ext={Surge:'sgmodule',Loon:'plugin',Shadowrocket:'sgmodule',QuantumultX:'conf'};
const hosts=['spclient.wg.spotify.com','gew1-spclient.spotify.com','gae2-spclient.spotify.com:443'];
const routes=['color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo','color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo/image/ab12','metadata/4/track/00000000000000000000000000000001','extended-metadata/v0/extended-metadata','scrollsita/v1/scroll/spotify:track:76XUZSb13QUuj1HECY4Hvo','scrollsita/v1/scroll/spotify%3Atrack%3A76XUZSb13QUuj1HECY4Hvo','user-customization-service/v1/customize','bootstrap/v1/bootstrap','v1/customize','context-resolve/v1/spotify%3Aplaylist%3Aabcdefgh','connect-state/v1/devices/abcdefghijklmnop'];
for(const [c,e]of Object.entries(ext)){
  const cfg=readFileSync(new URL(`./publish/${c}/script/SpotifyLyrics.${e}`,import.meta.url),'utf8');
  test(`${c}: two native hooks with complete URL coverage and correct binary configuration`,()=>{
    const lines=cfg.split('\n').filter(x=>/^(?:VerseLyrics-|request if|response if|\^https:)/.test(x));assert.equal(lines.length,2);
    let regexes;
    if(c==='Loon'){
      regexes=lines.map(l=>new RegExp(l.split(' ~= /')[1].split('/ then ')[0]));
      assert.match(lines[0],/^request if /);assert.match(lines[1],/^response if /);
      assert.match(lines[1],/requires_body=true, binary_body_mode=true/);
      assert.match(lines[1],/timeout=25/);assert.doesNotMatch(lines[0],/requires_body=true/);
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
      regexes=opts.map(o=>new RegExp(o.pattern));assert.equal(opts[0].type,'http-request');assert.equal(opts[1].type,'http-response');assert.equal(opts[1]['binary-body-mode'],'true');assert.equal(opts[1]['requires-body'],'true');assert.equal(opts[1]['max-size'],'2097152');assert.equal(opts[1].timeout,'25');assert.equal(opts[0].timeout,'3');
      for(const o of opts){assert.equal(new URLSearchParams(o.argument).get('TARGET_LANGUAGE'),'zh-CN');assert.equal(Object.keys(o).some(x=>x==='512}'||x==='128}'),false);}
      assert.match(cfg,/hostname = %APPEND% spclient\.wg\.spotify\.com, \*-spclient\.spotify\.com/);
    }
    for(const r of regexes){for(const h of hosts)for(const p of routes){assert.ok(r.test(`https://${h}/${p}`));assert.ok(r.test(`https://${h}/${p}?market=US&format=protobuf`));}
      for(const u of ['https://accounts.spotify.com/authorize','https://spclient.wg.spotify.com/gander/v2/GetUserHasUnreadNotification','https://spclient.wg.spotify.com.evil.test/color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo','http://spclient.wg.spotify.com/color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo'])assert.equal(r.test(u),false);
    }
    if(c==='Loon')assert.match(cfg,/FALLBACK_PROVIDER = select,"auto","lrclib","qq","netease","kugou","kuwo","lyricsovh","off"/);
    assert.match(lines[0],/SpotifyLyrics\.Request\.js/);assert.doesNotMatch(lines[1],/SpotifyLyrics\.Request\.js/);
    const request=readFileSync(new URL(`./runtime/${c}/script/SpotifyLyrics.Request.js`,import.meta.url),'utf8');new vm.Script(request);assert.ok(Buffer.byteLength(request)<7000);assert.doesNotMatch(request,/HAN_FOLD|function sourceLyrics|const nativeStorage/);
    const js=readFileSync(new URL(`./runtime/${c}/script/SpotifyLyrics.js`,import.meta.url),'utf8');new vm.Script(js);assert.doesNotMatch(js,/^export |^import /m);assert.match(js,/UNICODE LICENSE V3/);assert.ok(js.includes(`const CLIENT = "${c}"`));
  });
}
