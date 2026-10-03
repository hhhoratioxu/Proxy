/*
 * StreamingUnlock.js
 * Loon generic script for per-node streaming / AI unlock checks.
 * Every HTTP request is explicitly bound to the node selected in Loon.
 * Author: Horatio Xu
 * Version: 1.0.0
 */

const PARAMS = (typeof $environment !== 'undefined' && $environment.params) ? $environment.params : {};
const NODE = PARAMS.node || (PARAMS.nodeInfo && (PARAMS.nodeInfo.name || PARAMS.nodeInfo.tag)) || 'DIRECT';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const TIMEOUT = 9000;

function flag(code) {
  if (!code) return '';
  const cc = String(code).trim().toUpperCase().slice(0, 2);
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0)));
}

function regionLabel(code) {
  if (!code) return '';
  const cc = String(code).trim().toUpperCase();
  const alpha2 = cc.length === 2 ? cc : alpha3To2(cc);
  return `${alpha2 ? flag(alpha2) : ''}${cc}`;
}

function alpha3To2(code) {
  const map = {
    USA:'US', GBR:'GB', JPN:'JP', KOR:'KR', SGP:'SG', TWN:'TW', HKG:'HK', MAC:'MO',
    CHN:'CN', CAN:'CA', AUS:'AU', NZL:'NZ', DEU:'DE', FRA:'FR', NLD:'NL', CHE:'CH',
    ITA:'IT', ESP:'ES', PRT:'PT', SWE:'SE', NOR:'NO', DNK:'DK', FIN:'FI', POL:'PL',
    AUT:'AT', BEL:'BE', IRL:'IE', CZE:'CZ', HUN:'HU', ROU:'RO', TUR:'TR', IND:'IN',
    IDN:'ID', MYS:'MY', THA:'TH', PHL:'PH', VNM:'VN', BRA:'BR', MEX:'MX', ARG:'AR',
    CHL:'CL', COL:'CO', ARE:'AE', SAU:'SA', ISR:'IL', ZAF:'ZA', RUS:'RU', BLR:'BY',
    CUB:'CU', IRN:'IR', PRK:'KP', SYR:'SY'
  };
  return map[String(code).toUpperCase()] || '';
}

function req(method, url, headers = {}, body = null, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const opts = { url, headers, timeout, node: NODE };
    if (body !== null) opts.body = body;
    const fn = $httpClient[String(method).toLowerCase()];
    if (typeof fn !== 'function') return reject(new Error(`Unsupported method: ${method}`));
    fn(opts, (err, resp, data) => {
      if (err) return reject(new Error(String(err)));
      resolve({
        status: (resp && resp.status) || 0,
        headers: (resp && resp.headers) || {},
        url: (resp && resp.url) || url,
        body: typeof data === 'string' ? data : (data ? String(data) : '')
      });
    });
  });
}

async function safe(name, fn) {
  try {
    const result = await fn();
    return { name, ...result };
  } catch (e) {
    console.log(`[${name}] ${e && e.message ? e.message : e}`);
    return { name, state: 'fail', text: '检测失败' };
  }
}

async function checkExit() {
  const r = await req('get', 'https://www.cloudflare.com/cdn-cgi/trace', { 'User-Agent': UA });
  const kv = {};
  r.body.split('\n').forEach(line => {
    const i = line.indexOf('=');
    if (i > 0) kv[line.slice(0, i)] = line.slice(i + 1).trim();
  });
  return { ip: kv.ip || '未知', loc: kv.loc || '', colo: kv.colo || '' };
}

async function checkApple() {
  const r = await req('get', 'https://gspe1-ssl.ls.apple.com/pep/gcc', { 'User-Agent': UA });
  const cc = r.body.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cc)) return { state: 'info', text: `地区 ${regionLabel(cc)}` };
  return { state: 'fail', text: '地区检测失败' };
}

async function checkNetflix() {
  try {
    const fast = await req('get', 'https://api.fast.com/netflix/speedtest/v2?https=true&token=YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm&urlCount=5', { 'User-Agent': UA });
    const json = JSON.parse(fast.body);
    const cc = json && json.targets && json.targets[0] && json.targets[0].location && json.targets[0].location.country;
    if (cc) return { state: 'ok', text: `完整解锁 ${regionLabel(cc)}` };
  } catch (_) {}

  const [a, b] = await Promise.all([
    req('get', 'https://www.netflix.com/title/81280792', { 'User-Agent': UA, 'Accept-Language': 'en' }),
    req('get', 'https://www.netflix.com/title/70143836', { 'User-Agent': UA, 'Accept-Language': 'en' })
  ]);
  if (a.status === 404 && b.status === 404) return { state: 'partial', text: '仅自制剧' };
  if (a.status === 403 || b.status === 403) return { state: 'blocked', text: '不可用' };
  if ([200, 301, 302].includes(a.status) || [200, 301, 302].includes(b.status)) {
    let cc = '';
    try {
      const r = await req('get', 'https://www.netflix.com/title/80018499', { 'User-Agent': UA, 'Accept-Language': 'en' });
      const loc = r.headers.location || r.headers.Location || r.url || '';
      const m = String(loc).match(/netflix\.com\/(?:[a-z]{2}-)?([a-z]{2})\/title/i) || String(loc).match(/netflix\.com\/([a-z]{2})(?:-[A-Z]{2})?\/title/i);
      if (m) cc = m[1].toUpperCase();
    } catch (_) {}
    return { state: 'ok', text: `完整解锁${cc ? ` ${regionLabel(cc)}` : ''}` };
  }
  return { state: 'fail', text: `未知响应 (${a.status}/${b.status})` };
}

async function checkDisney() {
  const AUTH = 'Bearer ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84';
  const device = await req('post', 'https://disney.api.edge.bamgrid.com/devices', {
    'Authorization': AUTH,
    'Content-Type': 'application/json; charset=UTF-8',
    'User-Agent': UA
  }, JSON.stringify({ deviceFamily:'browser', applicationRuntime:'chrome', deviceProfile:'windows', attributes:{} }));
  if (device.status === 403) return { state:'blocked', text:'不可用（IP 被封禁）' };
  let assertion = '';
  try { assertion = JSON.parse(device.body).assertion || ''; } catch (_) {
    const m = device.body.match(/"assertion"\s*:\s*"([^"]+)/); if (m) assertion = m[1];
  }
  if (!assertion) return { state:'fail', text:'无法获取设备授权' };

  const form = [
    ['grant_type','urn:ietf:params:oauth:grant-type:token-exchange'],
    ['latitude','0'], ['longitude','0'], ['platform','browser'],
    ['subject_token', assertion],
    ['subject_token_type','urn:bamtech:params:oauth:token-type:device']
  ].map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

  const token = await req('post', 'https://disney.api.edge.bamgrid.com/token', {
    'Authorization': AUTH,
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': UA
  }, form);
  if (/forbidden-location|403 ERROR/i.test(token.body)) return { state:'blocked', text:'不可用（地区/IP 限制）' };
  let refresh = '';
  try { refresh = JSON.parse(token.body).refresh_token || ''; } catch (_) {
    const m = token.body.match(/"refresh_token"\s*:\s*"([^"]+)/); if (m) refresh = m[1];
  }
  if (!refresh) return { state:'fail', text:'无法获取 refresh token' };

  const graph = await req('post', 'https://disney.api.edge.bamgrid.com/graph/v1/device/graphql', {
    'Authorization': AUTH,
    'Content-Type': 'application/json',
    'User-Agent': UA
  }, JSON.stringify({
    query:'mutation refreshToken($input: RefreshTokenInput!) { refreshToken(refreshToken: $input) { activeSession { sessionId } } }',
    variables:{ input:{ refreshToken:refresh } }
  }));

  let cc = '';
  let supported = null;
  const cm = graph.body.match(/"countryCode"\s*:\s*"([^"]+)/i); if (cm) cc = cm[1].toUpperCase();
  const sm = graph.body.match(/"inSupportedLocation"\s*:\s*(true|false)/i); if (sm) supported = sm[1] === 'true';
  let unavailable = false;
  try {
    const home = await req('get', 'https://www.disneyplus.com/', { 'User-Agent': UA, 'Accept-Language':'en' });
    unavailable = /preview|unavailable/i.test(home.url);
    if (!cc) {
      const hm = home.body.match(/region"\s*:\s*"([^"]+)/i); if (hm) cc = hm[1].toUpperCase();
    }
  } catch (_) {}

  if (cc === 'JP') return { state:'ok', text:`已解锁 ${regionLabel(cc)}` };
  if (unavailable) return { state:'blocked', text:`不可用${cc ? ` ${regionLabel(cc)}` : ''}` };
  if (supported === false) return { state:'partial', text:`即将登陆${cc ? ` ${regionLabel(cc)}` : ''}` };
  if (supported === true || cc) return { state:'ok', text:`已解锁${cc ? ` ${regionLabel(cc)}` : ''}` };
  return { state:'fail', text:'状态未知' };
}

async function checkMax() {
  const headers = {
    'User-Agent': UA,
    'x-device-info':'beam/5.0.0 (desktop/desktop; Windows/10; afbb5daa-c327-461d-9460-d8e4b3ee4a1f/da0cdd94-5a39-42ef-aa68-54cbc1b852c3)',
    'x-disco-client':'WEB:10:beam:5.2.1'
  };
  const tokenR = await req('get', 'https://default.any-any.prd.api.max.com/token?realm=bolt&deviceId=afbb5daa-c327-461d-9460-d8e4b3ee4a1f', headers);
  let token = '';
  try { token = JSON.parse(tokenR.body).data.attributes.token || ''; } catch (_) {}
  if (!token) return { state:'blocked', text:'不可用 / 无法获取 Token' };

  const sessionR = await req('post', 'https://default.any-any.prd.api.max.com/session-context/headwaiter/v1/bootstrap', {
    'User-Agent': UA, 'Cookie':`st=${token}`, 'Content-Type':'application/json'
  }, '{}');
  let routing = null;
  try { routing = JSON.parse(sessionR.body).routing || null; } catch (_) {}
  if (!routing || !routing.domain || !routing.tenant || !routing.env || !routing.homeMarket) return { state:'fail', text:'无法获取地区路由' };

  const userUrl = `https://default.${routing.tenant}-${routing.homeMarket}.${routing.env}.${routing.domain}/users/me`;
  const userR = await req('get', userUrl, { 'User-Agent':UA, 'Cookie':`st=${token}` });
  let cc = '';
  try { cc = JSON.parse(userR.body).data.attributes.currentLocationTerritory || ''; } catch (_) {}
  if (!cc) return { state:'fail', text:'无法获取地区' };
  const home = await req('get', 'https://www.max.com/', { 'User-Agent':UA });
  if (home.status >= 200 && home.status < 400) return { state:'ok', text:`已解锁 ${regionLabel(cc)}` };
  return { state:'blocked', text:`不可用 ${regionLabel(cc)}` };
}

async function checkPrimeVideo() {
  const r = await req('get', 'https://www.primevideo.com', { 'User-Agent':UA, 'Accept-Language':'en-US,en;q=0.9' });
  if (/isServiceRestricted/i.test(r.body)) return { state:'blocked', text:'不可用' };
  const m = r.body.match(/"currentTerritory"\s*:\s*"([^"]+)/i);
  if (m) return { state:'ok', text:`已解锁 ${regionLabel(m[1])}` };
  return { state:'fail', text:'无法识别地区' };
}

async function checkYouTube() {
  const r = await req('get', 'https://www.youtube.com/premium?hl=en', { 'User-Agent':UA, 'Accept-Language':'en' });
  const lower = r.body.toLowerCase();
  if (/premium is not available in your (country|region)/i.test(lower)) return { state:'blocked', text:'不可用' };
  const ok = r.status >= 200 && r.status < 300 && (lower.includes('youtube premium') || lower.includes('ad-free') || lower.includes('"browseid":"spunlimited"'));
  if (!ok) return { state:'fail', text:'无法确认 Premium' };
  const pats = [
    /id=[#']country-code["'][^>]*>\s*([A-Za-z]{2,3})\s*</,
    /"GL"\s*:\s*"([A-Za-z]{2})"/,
    /"countryCode"\s*:\s*"([A-Za-z]{2})"/,
    /"country_code"\s*:\s*"([A-Za-z]{2})"/
  ];
  let cc = '';
  for (const p of pats) { const m = r.body.match(p); if (m) { cc = m[1].toUpperCase(); break; } }
  return { state:'ok', text:`Premium 已解锁${cc ? ` ${regionLabel(cc)}` : ''}` };
}

async function checkSpotify() {
  const r = await req('get', 'https://www.spotify.com/api/content/v1/country-selector?platform=web&format=json', { 'User-Agent':UA });
  if (r.status === 403 || r.status === 451 || /not available in your country/i.test(r.body)) return { state:'blocked', text:'不可用' };
  if (r.status < 200 || r.status >= 400) return { state:'fail', text:`HTTP ${r.status}` };
  let cc = '';
  const bm = r.body.match(/"countryCode"\s*:\s*"([A-Za-z]{2})"/i); if (bm) cc = bm[1].toUpperCase();
  if (!cc) {
    const um = String(r.url).match(/spotify\.com\/([a-z]{2})(?:-[a-z]{2})?\//i); if (um) cc = um[1].toUpperCase();
  }
  return { state:'ok', text:`已解锁${cc ? ` ${regionLabel(cc)}` : ''}` };
}

async function checkTikTok() {
  let r = await req('get', 'https://www.tiktok.com/cdn-cgi/trace', { 'User-Agent':UA, 'Accept-Language':'en' });
  if ([403,451].includes(r.status) || /access denied|not available in your region|tiktok is not available/i.test(r.body)) return { state:'blocked', text:'不可用' };
  if (r.status < 200 || r.status >= 300) r = await req('get', 'https://www.tiktok.com/', { 'User-Agent':UA, 'Accept-Language':'en' });
  if ([403,451].includes(r.status) || /access denied|not available in your region|tiktok is not available/i.test(r.body)) return { state:'blocked', text:'不可用' };
  const m = r.body.match(/\"region\"\s*:\s*\"([A-Za-z-]+)\"/);
  const locm = r.body.match(/^loc=([A-Za-z]{2})$/m);
  let cc = '';
  if (locm) cc = locm[1].toUpperCase();
  else if (m) {
    const parts = m[1].split('-');
    cc = (parts.length > 1 ? parts[parts.length - 1] : parts[0]).toUpperCase();
  }
  return { state:'ok', text:`已解锁${cc && /^[A-Z]{2}$/.test(cc) ? ` ${regionLabel(cc)}` : ''}` };
}

async function checkChatGPT() {
  let cc = '';
  try {
    const trace = await req('get', 'https://chat.openai.com/cdn-cgi/trace', { 'User-Agent':UA });
    const lm = trace.body.match(/^loc=([A-Za-z]{2})$/m); if (lm) cc = lm[1].toUpperCase();
  } catch (_) {}

  let web = 'fail', ios = 'fail';
  try {
    const w = await req('get', 'https://api.openai.com/compliance/cookie_requirements', { 'User-Agent':UA });
    web = /unsupported_country/i.test(w.body) ? 'blocked' : 'ok';
  } catch (_) {}
  try {
    const i = await req('get', 'https://ios.chat.openai.com/', { 'User-Agent':UA });
    const b = i.body.toLowerCase();
    if (b.includes('you may be connected to a disallowed isp')) ios = 'isp';
    else if (b.includes('sorry, you have been blocked')) ios = 'blocked';
    else if (b.includes('request is not allowed. please try again later.')) ios = 'ok';
    else if (i.status >= 200 && i.status < 500) ios = 'ok';
  } catch (_) {}

  const label = x => ({ok:'已解锁', blocked:'不可用', isp:'ISP 不支持', fail:'检测失败'})[x] || x;
  let state = (web === 'ok' && ios === 'ok') ? 'ok' : ((web === 'blocked' || ios === 'blocked' || ios === 'isp') ? 'blocked' : 'partial');
  return { state, text:`Web ${label(web)} · iOS ${label(ios)}${cc ? ` ${regionLabel(cc)}` : ''}` };
}

async function checkGemini() {
  const r = await req('get', 'https://gemini.google.com/', { 'User-Agent':UA, 'Accept-Language':'en-US,en;q=0.9' });
  if (r.status === 403 || r.status === 451) return { state:'blocked', text:'不可用' };
  const marker = ',2,1,200,"';
  const idx = r.body.indexOf(marker);
  let code = '';
  if (idx >= 0) {
    const s = r.body.slice(idx + marker.length, idx + marker.length + 3);
    if (/^[A-Z]{3}$/.test(s)) code = s;
  }
  if (!code) {
    const m = r.body.match(/\b(USA|GBR|JPN|KOR|SGP|TWN|HKG|CHN|CAN|AUS|DEU|FRA|NLD|CHE|IND|MYS|THA|PHL|VNM|RUS|BLR|CUB|IRN|PRK|SYR|MAC)\b/);
    if (m) code = m[1];
  }
  const blocked = new Set(['CHN','RUS','BLR','CUB','IRN','PRK','SYR','HKG','MAC']);
  if (code && blocked.has(code)) return { state:'blocked', text:`不可用 ${regionLabel(code)}` };
  if (code) return { state:'ok', text:`已解锁 ${regionLabel(code)}` };
  if (r.status >= 200 && r.status < 400 && !/not available|unsupported/i.test(r.body)) return { state:'partial', text:'可访问（地区未识别）' };
  return { state:'fail', text:'检测失败' };
}

async function checkInstagramMusic() {
  const url = 'https://www.instagram.com/api/graphql';
  const variables = encodeURIComponent(JSON.stringify({
    shortcode:'C2YEAdOh9AB', fetch_comment_count:1, fetch_related_profile_media_count:0,
    parent_comment_count:0, child_comment_count:0, fetch_like_count:0,
    fetch_tagged_user_count:null, fetch_preview_comment_count:0,
    has_threaded_comments:true, hoisted_comment_id:null, hoisted_reply_id:null
  }));
  const body = [
    'av=0','__d=www','__user=0','__a=1','__req=3','__comet_req=7',
    'lsd=AVrkL73GMdk','jazoest=2909','fb_api_caller_class=RelayModern',
    'fb_api_req_friendly_name=PolarisPostActionLoadPostQueryQuery',
    `variables=${variables}`,'server_timestamps=true','doc_id=10015901848480474'
  ].join('&');
  const r = await req('post', url, {
    'Accept':'*/*',
    'Accept-Language':'en-US,en;q=0.9',
    'Content-Type':'application/x-www-form-urlencoded',
    'Origin':'https://www.instagram.com',
    'Referer':'https://www.instagram.com/p/C2YEAdOh9AB/',
    'X-FB-Friendly-Name':'PolarisPostActionLoadPostQueryQuery',
    'X-FB-LSD':'AVrkL73GMdk',
    'X-IG-App-ID':'936619743392459',
    'User-Agent':UA
  }, body);
  if (r.status === 429) return { state:'rate', text:'Rate Limited（HTTP 429）' };
  if (r.status === 200) {
    if (/"should_mute_audio"\s*:\s*true/i.test(r.body)) return { state:'blocked', text:'Licensed Audio 不可用' };
    if (/"should_mute_audio"\s*:\s*false/i.test(r.body) || r.body.length > 50) return { state:'ok', text:'Licensed Audio 可用' };
  }
  if ([403,451].includes(r.status)) return { state:'blocked', text:`不可用（HTTP ${r.status}）` };
  return { state:'fail', text:`检测失败（HTTP ${r.status || 'N/A'}）` };
}

function colorFor(state) {
  return ({ ok:'#34C759', partial:'#FF9F0A', blocked:'#FF3B30', rate:'#FF9500', fail:'#8E8E93', info:'#0A84FF' })[state] || '#8E8E93';
}

function iconFor(state) {
  return ({ ok:'●', partial:'◐', blocked:'●', rate:'●', fail:'○', info:'●' })[state] || '○';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(async () => {
  const exitPromise = checkExit().catch(() => ({ ip:'未知', loc:'', colo:'' }));
  const tasks = [
    ['Apple', checkApple],
    ['Netflix', checkNetflix],
    ['Disney+', checkDisney],
    ['Max', checkMax],
    ['Prime Video', checkPrimeVideo],
    ['YouTube Premium', checkYouTube],
    ['Spotify', checkSpotify],
    ['TikTok', checkTikTok],
    ['ChatGPT', checkChatGPT],
    ['Gemini', checkGemini],
    ['Instagram Music', checkInstagramMusic]
  ];

  const [exitInfo, results] = await Promise.all([
    exitPromise,
    Promise.all(tasks.map(([name, fn]) => safe(name, fn)))
  ]);

  const rows = results.map(r => `
    <div class="row">
      <div class="name">${esc(r.name)}</div>
      <div class="status" style="color:${colorFor(r.state)}">${iconFor(r.state)} ${esc(r.text)}</div>
    </div>`).join('');

  const loc = exitInfo.loc ? `${flag(exitInfo.loc)}${exitInfo.loc}` : '未知';
  const html = `
  <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;margin:0;padding:16px;background:#f2f2f7;color:#111}
    .card{background:#fff;border-radius:18px;padding:16px;box-shadow:0 2px 14px rgba(0,0,0,.06)}
    .title{font-size:21px;font-weight:750;margin-bottom:4px}.sub{font-size:12px;color:#8e8e93;line-height:1.45;margin-bottom:13px;word-break:break-all}
    .row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:.5px solid #e5e5ea;align-items:flex-start}
    .name{font-size:14px;font-weight:650;min-width:112px}.status{font-size:13px;text-align:right;font-weight:600;line-height:1.35}
    .foot{font-size:11px;color:#8e8e93;margin-top:12px;line-height:1.5}
    @media (prefers-color-scheme:dark){body{background:#000;color:#fff}.card{background:#1c1c1e}.row{border-color:#38383a}}
  </style></head><body><div class="card">
    <div class="title">📺 流媒体解锁查询</div>
    <div class="sub">节点：${esc(NODE)}<br>出口：${esc(exitInfo.ip)} · ${esc(loc)}${exitInfo.colo ? ` · CF ${esc(exitInfo.colo)}` : ''}</div>
    ${rows}
    <div class="foot">所有检测请求均强制通过当前所选节点。检测接口可能受平台限流、WAF、登录状态或接口更新影响；“检测失败”不等于明确不可用。</div>
  </div></body></html>`;

  console.log(html);
  $done({ title:'📺 流媒体解锁查询', htmlMessage:html });
})().catch(e => {
  console.log(`[StreamingUnlock Fatal] ${e && e.message ? e.message : e}`);
  $done({ title:'📺 流媒体解锁查询', htmlMessage:`<p>检测失败：${esc(e && e.message ? e.message : e)}</p>` });
});
