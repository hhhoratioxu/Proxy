/*
 * Streaming Unlock · Quantumult X 1.0.0 (2026-10-10)
 * Author: Horatio Xu | https://github.com/hhhoratioxu/Proxy
 * Task type: event-interaction (UIAction). No MitM required.
 * Each HTTP request is pinned to the selected policy or node.
 * These probes never sign in and cannot guarantee playback in an account.
 */
'use strict';
var VERSION = '1.0.0';
var PARAMS = typeof $environment !== 'undefined' ? $environment.params : '';
var POLICY = (typeof PARAMS === 'string' ? PARAMS.trim() : String((PARAMS || {}).node || (PARAMS || {}).name || (PARAMS || {}).tag || '').trim()) || 'proxy';
var UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function req(url, options) {
  options = options || {};
  var input = {
    url: url,
    method: (options.method || 'GET').toUpperCase(),
    headers: Object.assign({'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9'}, options.headers || {}),
    opts: { policy: POLICY, redirection: options.redirect !== false },
    timeout: options.timeout || 9000
  };
  if (options.body !== undefined) input.body = options.body;
  return $task.fetch(input).then(function(r) {
    return {status: Number(r.statusCode || r.status || 0), body: String(r.body || ''), headers: r.headers || {}, url: r.url || url};
  });
}
function value(body, pattern) {var match = String(body || '').match(pattern); return match ? String(match[1] || '').trim() : '';}
function result(state, detail, region) {return {state:state, detail:detail, region:region || ''};}
function good(r) {return r && r.status >= 200 && r.status < 400;}
function json(body) {try {return JSON.parse(body);} catch(e) {return {};}}
function flag(cc) {
  cc = String(cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(cc.charCodeAt(0)+127397, cc.charCodeAt(1)+127397);
}
function escapeHTML(s) {return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function indicator(state) {
  return ({
    ok: ['已解锁','#34C759'], partial: ['部分可用','#FF9F0A'],
    blocked: ['不可用','#FF453A'], limited: ['限流','#FF9F0A'],
    info: ['地区信息','#0A84FF'], error: ['无法确认','#8E8E93']
  })[state] || ['无法确认','#8E8E93'];
}
function trace(text) {
  var obj = {};
  String(text || '').split('\n').forEach(function(line){
    var at = line.indexOf('=');
    if (at > 0) obj[line.substring(0,at)] = line.substring(at+1).trim();
  });
  return obj;
}
function normalizeGeo(o) {
  if (!o || typeof o !== 'object' || o.error) return null;
  var conn = o.connection || {};
  var asn = o.asn || conn.asn || '';
  return {
    asn: asn ? 'AS'+String(asn).replace(/^AS/i,'') : '',
    isp: String(o.isp || conn.isp || '').trim(),
    org: String(o.organization || o.org || o.asn_organization || conn.org || '').trim(),
    country: String(o.country_code || (String(o.country||'').length===2 ? o.country : '') || '').toUpperCase(),
    city: String(o.city || '').trim(),
    region: String(o.region || o.region_name || '').trim()
  };
}
async function geo(ip) {
  if (!ip) return null;
  var urls = ['https://api.ip.sb/geoip/'+encodeURIComponent(ip), 'https://ipapi.co/'+encodeURIComponent(ip)+'/json/'];
  for (var i=0;i<urls.length;i++) {
    try {
      var r=await req(urls[i], {timeout:6500});
      if (good(r)) {
        var resultGeo=normalizeGeo(json(r.body));
        if (resultGeo && (resultGeo.asn || resultGeo.isp || resultGeo.country)) return resultGeo;
      }
    } catch(e) {}
  }
  return null;
}
async function exitInfo() {
  var results = await Promise.allSettled([
    req('https://www.cloudflare.com/cdn-cgi/trace',{timeout:6500}),
    req('https://api.ipify.org?format=json',{timeout:6500}),
    req('https://api6.ipify.org?format=json',{timeout:6500})
  ]);
  function body(i) {return results[i].status === 'fulfilled' ? results[i].value.body : '';}
  var cf=trace(body(0));
  var ipv4=String(json(body(1)).ip || '').trim();
  var ipv6=String(json(body(2)).ip || '').trim();
  if (!ipv4 && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(cf.ip || '')) ipv4=cf.ip;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ipv4)) ipv4='';
  if (ipv6.indexOf(':')<0) ipv6='';
  var infos=await Promise.all([geo(ipv4),geo(ipv6)]);
  return {ipv4:ipv4,ipv6:ipv6,cf:cf,geo4:infos[0],geo6:infos[1]};
}
async function apple() {
  var r=await req('https://gspe1-ssl.ls.apple.com/pep/gcc');
  var cc=r.body.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? result('info','Apple 地区识别',cc) : result('error','无法读取地区');
}
async function netflix() {
  var a=await Promise.all([req('https://www.netflix.com/title/81280792'), req('https://www.netflix.com/title/70143836')]);
  if (a.some(function(x){return x.status===429;})) return result('limited','HTTP 429');
  if (a.some(function(x){return !x.body || x.status>=500;})) return result('error','检测接口异常');
  var cc=value(a.map(function(x){return x.body;}).join('\n'),/"countryCode"\s*:\s*"([A-Z]{2})"/);
  if (a.every(function(x){return /Oh no!/i.test(x.body);} )) return result('partial','仅自制剧',cc);
  if (a.some(function(x){return good(x) && !/Oh no!/i.test(x.body) && /netflix|title|watch/i.test(x.body);} )) return result('ok','片库检测通过',cc);
  if (a.some(function(x){return x.status===403 || x.status===451;})) return result('blocked','访问受限',cc);
  return result('error','页面特征无法确认',cc);
}
async function disney() {
  var r=await req('https://www.disneyplus.com/');
  var cc=value(r.body,/Region:\s*([A-Z]{2})/i) || value(r.body,/"countryCode"\s*:\s*"([A-Z]{2})"/);
  if (r.status===451 || /not available in your region|not available in your country/i.test(r.body)) return result('blocked','地区不可用',cc);
  if (r.status===429) return result('limited','HTTP 429',cc);
  return good(r) && r.body ? result('partial','网页可访问，播放未校验',cc) : result('error','无法验证',cc);
}
async function max() {
  var r=await req('https://www.max.com/');
  var cc=value(r.body,/"countryCode"\s*:\s*"([A-Z]{2})"/) || value(JSON.stringify(r.headers),/countryCode=([A-Z]{2})/);
  if (r.status===451 || /not available in your region|not available in your country/i.test(r.body)) return result('blocked','地区受限',cc);
  if (r.status===429) return result('limited','HTTP 429',cc);
  return good(r) && r.body ? result('partial','网页可访问，播放未校验',cc) : result('error','无法验证',cc);
}
async function prime() {
  var r=await req('https://www.primevideo.com/');
  var cc=value(r.body,/"currentTerritory"\s*:\s*"([A-Z]{2})"/) || value(r.body,/"countryCode"\s*:\s*"([A-Z]{2})"/);
  if (r.status===451 || /not available in your location|not available in your country/i.test(r.body)) return result('blocked','地区受限',cc);
  return good(r) && r.body ? result('partial','网页可访问，播放未校验',cc) : result('error','无法验证',cc);
}
async function youtube() {
  var r=await req('https://www.youtube.com/premium',{headers:{'Cookie':'PREF=f7=4000'}});
  var cc=value(r.body,/"INNERTUBE_CONTEXT_GL"\s*:\s*"([A-Z]{2})"/);
  if (r.status===429) return result('limited','HTTP 429',cc);
  if (r.status===403 || r.status===451 || /Premium is not available in your country/i.test(r.body)) return result('blocked','Premium 不可用',cc);
  if (good(r) && /ad-free/i.test(r.body)) return result('ok','Premium 页面特征通过',cc);
  return result('error','Premium 状态无法确认',cc);
}
async function spotify() {
  var r=await req('https://open.spotify.com/');
  var cc=value(r.body,/"country"\s*:\s*"([A-Z]{2})"/) || value(r.body,/"market"\s*:\s*"([A-Z]{2})"/);
  if (r.status===403 || r.status===451) return result('blocked','访问受限',cc);
  if (good(r) && r.body) return result('partial','网页可访问'+(cc?' · 市场识别':''),cc);
  return result('error','无法验证',cc);
}
async function tiktok() {
  var r=await req('https://www.tiktok.com/');
  var cc=value(r.body,/"region"\s*:\s*"([A-Z]{2})"/);
  if (r.status===403 || r.status===451) return result('blocked','访问受限',cc);
  if (r.status===429) return result('limited','HTTP 429',cc);
  return good(r) && /tiktok/i.test(r.body) ? result('partial','网页可访问，App 未校验',cc) : result('error','无法验证',cc);
}
async function chatgpt() {
  var rs=await Promise.allSettled([
    req('https://api.openai.com/compliance/cookie_requirements'),
    req('https://ios.chat.openai.com/'),
    req('https://chatgpt.com/cdn-cgi/trace')
  ]);
  var api=rs[0].status==='fulfilled'?rs[0].value:null;
  var ios=rs[1].status==='fulfilled'?rs[1].value:null;
  var cf=rs[2].status==='fulfilled'?trace(rs[2].value.body):{};
  if ((api && api.status===429) || (ios && ios.status===429)) return result('limited','HTTP 429',cf.loc);
  var webBlocked=api && /unsupported_country/i.test(api.body);
  var appBlocked=ios && /VPN detected|unsupported_country/i.test(ios.body);
  if (webBlocked && appBlocked) return result('blocked','Web + iOS 地区限制',cf.loc);
  if (webBlocked) return result('partial','Web 受限，iOS 未确认',cf.loc);
  if (appBlocked) return result('partial','iOS 受限，Web 未确认',cf.loc);
  if (api && ios && good(api) && good(ios) && api.body && ios.body) return result('ok','Web + iOS 检测通过',cf.loc);
  return result('error','接口结果不足以判定',cf.loc);
}
async function gemini() {
  var r=await req('https://gemini.google.com/app');
  var cc=value(r.body,/"countryCode"\s*:\s*"([A-Z]{2})"/);
  if (r.status===403 || r.status===451 || /not available in your country/i.test(r.body)) return result('blocked','地区限制',cc);
  if (r.status===429) return result('limited','HTTP 429',cc);
  return good(r) && /gemini/i.test(r.body) ? result('partial','网页可访问，登录未校验',cc) : result('error','无法验证',cc);
}
async function instagram() {
  // Only an explicit audio-licensing field proves anything; HTTP 200 alone does not.
  var r=await req('https://www.instagram.com/p/C2YEAdOh9AB/?__a=1');
  if (r.status===429) return result('limited','Licensed Audio 检测限流 · 429');
  if (/"should_mute_audio"\s*:\s*false/i.test(r.body)) return result('ok','音频许可字段通过');
  if (/"should_mute_audio"\s*:\s*true/i.test(r.body)) return result('blocked','音频许可受限');
  return result('error','未返回音频许可字段；请在 App 内验证');
}
async function pathLabel() {
  if (typeof $configuration === 'undefined' || typeof $configuration.sendMessage !== 'function') return POLICY;
  try {
    var response=await $configuration.sendMessage({action:'get_policy_state', content:POLICY});
    var list=response && response.ret && response.ret[POLICY];
    return Array.isArray(list) && list.length ? list.join(' → ') : POLICY;
  } catch(e) {return POLICY;}
}
async function safely(name, fn) {
  try {
    var r=await fn();
    return {name:name,state:r.state,detail:r.detail,region:r.region || ''};
  } catch(e) {
    console.log('[StreamingUnlock]['+name+'] '+String(e));
    return {name:name,state:'error',detail:'请求失败或超时',region:''};
  }
}
function geoString(g) {
  if (!g) return '';
  return [g.country ? flag(g.country)+' '+g.country : '',g.region,g.city].filter(Boolean).join(' · ');
}
function joinInfo(a,b,key) {
  var x=a && a[key] ? a[key] : '', y=b && b[key] ? b[key] : '';
  if (x && y && x!==y) return 'v4 '+x+' / v6 '+y;
  return x || y || '未知';
}
function render(node, exit, checks) {
  var ok=checks.filter(function(x){return x.state==='ok';}).length;
  var rows=checks.map(function(x){
    var m=indicator(x.state);
    return '<div class="service"><div class="service-name">'+escapeHTML(x.name)+'</div>'+
      '<div class="service-result"><span class="pill" style="color:'+m[1]+'">'+escapeHTML(m[0])+'</span>'+
      '<div class="detail">'+escapeHTML((x.region?flag(x.region)+' '+x.region+' · ':'')+x.detail)+'</div></div></div>';
  }).join('');
  var g4=exit.geo4, g6=exit.geo6, cf=exit.cf || {};
  var asn=joinInfo(g4,g6,'asn'), isp=joinInfo(g4,g6,'isp'), org=joinInfo(g4,g6,'org');
  if (isp==='未知') isp=org;
  var geos=geoString(g4), geos6=geoString(g6);
  var geo=geos && geos6 && geos!==geos6 ? 'v4 '+geos+' / v6 '+geos6 : geos || geos6 || '未知';
  var summary=[
    ['节点',node], ['IPv4',exit.ipv4 || '不可用'], ['IPv6',exit.ipv6 || '不可用'],
    ['ASN',asn], ['ISP / Org',isp], ['GeoIP',geo],
    ['Cloudflare POP',(cf.colo || '未知')+(cf.loc?' · '+flag(cf.loc)+' '+cf.loc:'')]
  ].map(function(v){return '<div class="kv"><span>'+escapeHTML(v[0])+'</span><strong>'+escapeHTML(v[1])+'</strong></div>';}).join('');
  var style='<style>'+
    ':root{color-scheme:light dark}*{box-sizing:border-box}html,body{margin:0;padding:0;background:transparent!important;color:CanvasText;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif;-webkit-font-smoothing:antialiased}'+
    '.wrap{padding:6px 3px 10px}.top{margin:0 0 14px;padding:14px;border-radius:20px;border:1px solid color-mix(in srgb,CanvasText 12%,transparent);background:color-mix(in srgb,Canvas 72%,transparent)}'+
    '.eyebrow{font-size:11px;font-weight:700;color:GrayText;letter-spacing:.4px}.heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0 13px}.heading strong{font-size:20px;letter-spacing:-.45px}.count{font-size:12px;color:#0A84FF;font-weight:700}'+
    '.kv{display:grid;grid-template-columns:90px minmax(0,1fr);gap:7px;padding:6px 0;border-bottom:1px solid color-mix(in srgb,CanvasText 8%,transparent)}.kv:last-child{border:0}.kv span{font-size:12px;color:GrayText}.kv strong{font-size:12px;font-weight:600;overflow-wrap:anywhere;text-align:right}'+
    '.service{display:grid;grid-template-columns:36% 64%;align-items:center;gap:0;padding:12px 3px;border-bottom:1px solid color-mix(in srgb,CanvasText 13%,transparent)}.service-name{font-size:13px;font-weight:700}.service-result{text-align:right;padding-left:8px}.pill{font-size:12px;font-weight:750}.detail{font-size:11px;color:GrayText;margin-top:3px;line-height:1.35;overflow-wrap:anywhere}'+
    '.foot{font-size:10px;color:GrayText;line-height:1.6;margin:14px 4px 0}'+
    '</style>';
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+style+'</head><body><main class="wrap"><section class="top">'+
    '<div class="eyebrow">HORATIO · QUANTUMULT X · v'+VERSION+'</div><div class="heading"><strong>Streaming Unlock</strong><span class="count">'+ok+'/'+checks.length+' 已解锁</span></div>'+summary+'</section>'+
    rows+'<div class="foot">对所选节点/策略强制发起请求；部分可用不代表可播放。IPv4 / IPv6 独立检测；ASN/ISP/GeoIP 来自 IP.SB，失败时回退 ipapi.co。Cloudflare POP 是接入点而非节点所在地。Instagram 音乐必须以 App 实测为准。</div></main></body></html>';
}
(async function() {
  var tasks=[
    ['Apple',apple],['Netflix',netflix],['Disney+',disney],['Max',max],
    ['Prime Video',prime],['YouTube Premium',youtube],['Spotify',spotify],
    ['TikTok',tiktok],['ChatGPT',chatgpt],['Gemini',gemini],['Instagram Music',instagram]
  ];
  var output=await Promise.all([
    exitInfo().catch(function(){return {ipv4:'',ipv6:'',cf:{},geo4:null,geo6:null};}),
    Promise.all(tasks.map(function(t){return safely(t[0],t[1]);})),
    pathLabel()
  ]);
  $done({title:'📺 流媒体解锁查询',htmlMessage:render(output[2],output[0],output[1])});
})().catch(function(e) {
  console.log('[StreamingUnlock fatal] '+e);
  $done({title:'流媒体解锁查询',message:'检测出错：'+String(e)});
});
