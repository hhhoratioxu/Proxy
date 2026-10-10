/*
 * Streaming Unlock · Quantumult X 1.0.0 (2026-10-10)
 * Author: Horatio Xu | https://github.com/hhhoratioxu/Proxy
 * Task type: event-interaction (UIAction). No MitM required.
 * Each HTTP request is pinned to the selected policy or node.
 * These probes never sign in and cannot guarantee playback in an account.
 */
'use strict';
var VERSION = '1.1.0';
var PARAMS = typeof $environment !== 'undefined' ? $environment.params : '';
var POLICY = (typeof PARAMS === 'string' ? PARAMS.trim() : String((PARAMS || {}).node || (PARAMS || {}).name || (PARAMS || {}).tag || '').trim()) || 'proxy';
var ACTIVE = 0, WAITING = [], MAX_ACTIVE = 4;
var REQUEST_ERRORS = [];
var UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function req(url, options) {
  options = options || {};
  var input = {
    url: url,
    method: (options.method || 'GET').toUpperCase(),
    headers: Object.assign({'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9'}, options.headers || {}),
    opts: {policy: POLICY, redirection: options.redirect !== false, 'auto-cookie': false},
    timeout: options.timeout || 8000
  };
  if (options.body !== undefined) input.body = options.body;
  // QX establishes a new TCP/TLS connection for every policy-pinned fetch.
  // Limit total in-flight requests to avoid exhausting a server's connection quota.
  return new Promise(function(resolve, reject) {
    WAITING.push(function() {
      ACTIVE++;
      Promise.resolve().then(function(){return $task.fetch(input);}).then(function(r) {
        resolve({status:Number(r.statusCode || r.status || 0),body:String(r.body || ''),headers:r.headers || {},url:r.url || url});
      },function(err) {
        var msg=String((err && (err.error || err.message)) || err || 'Network error');
        if (REQUEST_ERRORS.length < 30) REQUEST_ERRORS.push(url.replace(/\?.*$/, '')+' · '+msg.slice(0,90));
        reject(new Error(msg));
      }).finally(function(){
        ACTIVE--;
        while (ACTIVE < MAX_ACTIVE && WAITING.length) WAITING.shift()();
      });
    });
    while (ACTIVE < MAX_ACTIVE && WAITING.length) WAITING.shift()();
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
    ok: ['检测通过','#34C759'], likely: ['疑似可用','#34C759'], reach: ['网页可达','#0A84FF'], partial: ['部分受限','#FF9F0A'],
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
  if (!o || typeof o !== 'object' || o.error || o.success === false) return null;
  var conn=o.connection || {};
  var asn=o.asn || conn.asn || '';
  var c=String(o.country_code || o.countryCode || (String(o.country||'').length===2?o.country:'') || '').toUpperCase();
  var x={
    asn:asn?'AS'+String(asn).replace(/^AS/i,''):'',
    isp:String(o.isp || conn.isp || '').trim(),
    org:String(o.organization || o.org || o.asn_organization || conn.org || '').trim(),
    country:/^[A-Z]{2}$/.test(c)?c:'',
    city:String(o.city || '').trim(),
    region:String(o.region || o.region_name || '').trim()
  };
  return x.asn || x.isp || x.org || x.country ? x : null;
}
async function geo(ip) {
  if (!ip) return null;
  var encoded=encodeURIComponent(ip);
  var urls=[
    'https://api.ip.sb/geoip/'+encoded,
    'https://ipwho.is/'+encoded,
    'https://ipapi.co/'+encoded+'/json/'
  ];
  for (var i=0;i<urls.length;i++) {
    try {
      var r=await req(urls[i],{timeout:7000});
      if (good(r)) {
        var obj=normalizeGeo(json(r.body));
        if (obj) return obj;
      }
    } catch(e) {}
  }
  return null;
}
function ipFamily(raw) {
  raw=String(raw||'').trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(raw) && raw.split('.').every(function(n){return +n>=0 && +n<=255;})) return 4;
  if (/^[0-9a-f:.]+$/i.test(raw) && raw.includes(':') && raw.length<46) return 6;
  return 0;
}
function responseIp(r) {
  var body=String(r&&r.body||'').trim();
  var obj=json(body);
  return String(obj.ip || obj.query || obj.address || body).trim().split(/\s/)[0];
}
async function fallbackIp(urls, kind) {
  for (var i=0;i<urls.length;i++) {
    try {
      var r=await req(urls[i],{timeout:6000});
      var ip=responseIp(r);
      if (good(r) && ipFamily(ip)===kind) return ip;
      if (r.status>=400) REQUEST_ERRORS.push('IP '+urls[i]+' HTTP '+r.status);
    } catch(e){}
  }
  return '';
}
async function exitInfo() {
  var cf={}, cfError='';
  try {
    var response=await req('https://www.cloudflare.com/cdn-cgi/trace',{timeout:6000});
    if (good(response)) cf=trace(response.body);
    else cfError='Cloudflare Trace HTTP '+response.status;
  } catch(e) {cfError='Cloudflare Trace '+String(e.message||e).slice(0,65);}
  var ipv4='',ipv6='';
  var cfIp=String(cf.ip||'').trim();
  if (ipFamily(cfIp)===4) ipv4=cfIp;
  if (ipFamily(cfIp)===6) ipv6=cfIp;
  // Cloudflare Trace always reports its observed egress address when available.
  // Avoid treating an IPv6-only exit as "IPv4 unavailable" without another probe.
  if (!ipv4) ipv4=await fallbackIp([
    'https://api4.ipify.org?format=json',
    'https://ipv4.icanhazip.com/',
    'https://v4.ident.me/'
  ],4);
  if (!ipv6) ipv6=await fallbackIp([
    'https://api6.ipify.org?format=json',
    'https://ipv6.icanhazip.com/'
  ],6);
  // IPv6 probe failure is normal for IPv4-only / disabled IPv6 configurations.
  var g=await Promise.all([geo(ipv4),geo(ipv6)]);
  return {ipv4:ipv4,ipv6:ipv6,cf:cf,geo4:g[0],geo6:g[1],cfError:cfError};
}
async function apple() {
  var r=await req('https://gspe1-ssl.ls.apple.com/pep/gcc');
  var cc=r.body.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? result('info','Apple 地区识别',cc) : result('error','无法读取地区');
}
async function netflix() {
  var items=await Promise.allSettled([
    req('https://www.netflix.com/title/81280792'),
    req('https://www.netflix.com/title/70143836')
  ]);
  var rs=items.map(function(x){return x.status==='fulfilled'?x.value:null;});
  if (rs.some(function(x){return x&&x.status===429;})) return result('limited','HTTP 429');
  if (rs.some(function(x){return !x || !x.body;})) return result('error','Netflix 请求失败');
  var both=rs.map(function(x){return x.body;}).join('\n');
  var cc=value(both,/"countryCode"\s*:\s*"([A-Z]{2})"/);
  var blocked=rs.filter(function(x){return /Oh no!|not available in your country|not available in your region/i.test(x.body);}).length;
  if (blocked===2) return result('partial','仅自制剧／地区片库受限',cc);
  if (rs.some(function(x){return x.status===403 || x.status===451;})) return result('blocked','访问受限',cc);
  if (rs.some(function(x){return good(x) && /netflix/i.test(x.body) && !/Oh no!/i.test(x.body);}))
    return result('likely','片库页面可达（实际播放未验证）',cc);
  return result('error','未确认片库可用性',cc);
}
async function disney() {
  var r=await req('https://www.disneyplus.com/');
  var cc=value(r.body,/Region:\s*([A-Z]{2})/i) || value(r.body,/"countryCode"\s*:\s*"([A-Z]{2})"/);
  if (r.status===451 || /not available in your region|not available in your country/i.test(r.body)) return result('blocked','地区不可用',cc);
  if (r.status===429) return result('limited','HTTP 429',cc);
  return good(r) && r.body ? result('reach','网页可达 · 播放未验证',cc) : result('error','无法验证',cc);
}
async function max() {
  var r=await req('https://www.max.com/');
  var cc=value(r.body,/"countryCode"\s*:\s*"([A-Z]{2})"/) || value(JSON.stringify(r.headers),/countryCode=([A-Z]{2})/);
  if (r.status===451 || /not available in your region|not available in your country/i.test(r.body)) return result('blocked','地区受限',cc);
  if (r.status===429) return result('limited','HTTP 429',cc);
  return good(r) && r.body ? result('reach','网页可达 · 播放未验证',cc) : result('error','无法验证',cc);
}
async function prime() {
  var r=await req('https://www.primevideo.com/');
  var cc=value(r.body,/"currentTerritory"\s*:\s*"([A-Z]{2})"/) || value(r.body,/"countryCode"\s*:\s*"([A-Z]{2})"/);
  if (r.status===451 || /not available in your location|not available in your country/i.test(r.body)) return result('blocked','地区受限',cc);
  return good(r) && r.body ? result('reach','网页可达 · 播放未验证',cc) : result('error','无法验证',cc);
}
async function youtube() {
  var r=await req('https://www.youtube.com/premium',{headers:{'Cookie':'PREF=f7=4000'}});
  var cc=value(r.body,/"INNERTUBE_CONTEXT_GL"\s*:\s*"([A-Z]{2})"/);
  if (r.status===429) return result('limited','HTTP 429',cc);
  if (r.status===451 || /Premium is not available in your country/i.test(r.body)) return result('blocked','Premium 地区限制',cc);
  // "ad-free" is standard marketing copy; it proves neither a country nor an account is eligible.
  if (good(r) && /youtube|premium/i.test(r.body)) return result('reach','Premium 页面可达 · 地区/订阅未验证',cc);
  return result('error','Premium 状态无法确认',cc);
}
async function spotify() {
  var r=await req('https://open.spotify.com/');
  if (r.status===403 || r.status===451) return result('blocked','访问受限');
  if (good(r) && r.body) return result('reach','网页可达 · 登录/播放未验证');
  return result('error','无法验证');
}
async function tiktok() {
  var r=await req('https://www.tiktok.com/');
  if (r.status===403 || r.status===451) return result('blocked','访问受限');
  if (r.status===429) return result('limited','HTTP 429');
  // App country may differ from marketing HTML's locale — do not display it as exit region.
  return good(r) && /tiktok/i.test(r.body) ? result('reach','网页可达 · App 未验证') : result('error','无法验证');
}
async function chatgpt() {
  var rs=await Promise.allSettled([
    req('https://chatgpt.com/'),
    req('https://api.openai.com/compliance/cookie_requirements')
  ]);
  var web=rs[0].status==='fulfilled'?rs[0].value:null;
  var api=rs[1].status==='fulfilled'?rs[1].value:null;
  if ((web&&web.status===429)||(api&&api.status===429)) return result('limited','HTTP 429');
  if ((web&&/unsupported_country/i.test(web.body))||(api&&/unsupported_country/i.test(api.body)))
    return result('blocked','检测到 unsupported_country');
  if (web&&good(web)&&web.body) return result('reach','ChatGPT 网页可达 · 登录/API 未验证');
  return result('error','无足够证据判定');
}
async function gemini() {
  var r=await req('https://gemini.google.com/app');
  if (r.status===403 || r.status===451 || /not available in your country/i.test(r.body)) return result('blocked','地区限制');
  if (r.status===429) return result('limited','HTTP 429');
  return good(r) && /gemini/i.test(r.body) ? result('reach','网页可达 · 登录未验证') : result('error','无法验证');
}
async function instagram() {
  // Public, unauthenticated probe: account-specific music licensing is not verifiable here.
  var shortcode='C2YEAdOh9AB';
  var variables={shortcode:shortcode,fetch_comment_count:10,fetch_related_profile_media_count:1,
    parent_comment_count:3,child_comment_count:1,fetch_like_count:10,
    fetch_tagged_user_count:null,fetch_preview_comment_count:2,
    has_threaded_comments:true,hoisted_comment_id:null,hoisted_reply_id:null};
  var payload='doc_id=10015901848480474&fb_api_caller_class=RelayModern'
      +'&fb_api_req_friendly_name=PolarisPostActionLoadPostQueryQuery'
      +'&variables='+encodeURIComponent(JSON.stringify(variables));
  var headers={
    'Content-Type':'application/x-www-form-urlencoded',
    'Origin':'https://www.instagram.com',
    'Referer':'https://www.instagram.com/p/'+shortcode+'/',
    'X-IG-App-ID':'936619743392459',
    'X-FB-Friendly-Name':'PolarisPostActionLoadPostQueryQuery'
  };
  var r=await req('https://www.instagram.com/api/graphql',{method:'POST',headers:headers,body:payload});
  if (r.status===429) return result('limited','Meta HTTP 429（限流）');
  if (/"should_mute_audio"\s*:\s*false/i.test(r.body)) return result('likely','测试样本音频许可通过 · 账号仍需实测');
  if (/"should_mute_audio"\s*:\s*true/i.test(r.body)) return result('partial','测试样本音频受限 · 非账号结论');
  if (r.status===403) return result('error','Meta 拒绝匿名请求 · HTTP 403');
  return result('error','未返回音频授权字段 · '+(r.status?'HTTP '+r.status:'请求异常'));
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
  var positive=checks.filter(function(x){return x.state==='ok' || x.state==='likely';}).length;
  var reachable=checks.filter(function(x){return x.state==='reach';}).length;
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
    ['节点',node], ['IPv4',exit.ipv4 || '未探测到'], ['IPv6',exit.ipv6 || '未探测到（可能未开启）'],
    ['ASN',asn], ['ISP / Org',isp], ['GeoIP',geo],
    ['CF 出口 IP',cf.ip || '未返回'],
    ['Cloudflare POP',(cf.colo || '未知')+(cf.loc?' · '+flag(cf.loc)+' '+cf.loc:'')]
  ].map(function(v){return '<div class="kv"><span>'+escapeHTML(v[0])+'</span><strong>'+escapeHTML(v[1])+'</strong></div>';}).join('');
  if(exit.cfError) summary+='<div class="kv"><span>网络诊断</span><strong>'+escapeHTML(exit.cfError)+'</strong></div>';
  if(!exit.ipv4 && !exit.ipv6) summary+='<div class="kv"><span>IP 诊断</span><strong>'+escapeHTML(REQUEST_ERRORS.slice(0,2).join(' / ') || '多个 IP 接口未返回公网地址')+'</strong></div>';
  var style='<style>'+
    ':root{color-scheme:light dark}*{box-sizing:border-box}html,body{margin:0;padding:0;background:transparent!important;color:CanvasText;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif;-webkit-font-smoothing:antialiased}'+
    '.wrap{padding:6px 3px 10px}.top{margin:0 0 14px;padding:14px;border-radius:20px;border:1px solid rgba(130,130,140,.2);background:rgba(255,255,255,.72)}'+
    '.eyebrow{font-size:11px;font-weight:700;color:GrayText;letter-spacing:.4px}.heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0 13px}.heading strong{font-size:20px;letter-spacing:-.45px}.count{font-size:12px;color:#0A84FF;font-weight:700}'+
    '.kv{display:grid;grid-template-columns:90px minmax(0,1fr);gap:7px;padding:6px 0;border-bottom:1px solid rgba(130,130,140,.12)}.kv:last-child{border:0}.kv span{font-size:12px;color:GrayText}.kv strong{font-size:12px;font-weight:600;overflow-wrap:anywhere;text-align:right}'+
    '.service{display:grid;grid-template-columns:36% 64%;align-items:center;gap:0;padding:12px 3px;border-bottom:1px solid rgba(130,130,140,.15)}.service-name{font-size:13px;font-weight:700}.service-result{text-align:right;padding-left:8px}.pill{font-size:12px;font-weight:750}.detail{font-size:11px;color:GrayText;margin-top:3px;line-height:1.35;overflow-wrap:anywhere}'+
    '.foot{font-size:10px;color:GrayText;line-height:1.6;margin:14px 4px 0}'+
    '@media(prefers-color-scheme:dark){.top{background:rgba(28,28,30,.72)}}'+
    '</style>';
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+style+'</head><body><main class="wrap"><section class="top">'+
    '<div class="eyebrow">HORATIO · QUANTUMULT X · v'+VERSION+'</div><div class="heading"><strong>Streaming Unlock</strong><span class="count">'+positive+' 项疑似 · '+reachable+' 项网页可达</span></div>'+summary+'</section>'+
    rows+'<div class="foot">对所选节点/策略强制发起请求；网页可达、疑似可用均不等于账号完成解锁。IPv4 / IPv6 独立检测；ASN/ISP/GeoIP 来自 IP.SB，失败时回退 ipapi.co。Cloudflare POP 是接入点而非节点所在地。Instagram 音乐必须以 App 实测为准。IPv6 未探测到不等于节点故障。</div></main></body></html>';
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
