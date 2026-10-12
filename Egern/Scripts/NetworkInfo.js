// Horatio Network Info v1.1.0 · Egern native ctx API.
// No external dependencies. Never equates a failed IPv6 request to no IPv6.
const VERSION = '1.1.0';
const PANEL_URL = 'http://network.horatio.test/';
const TRACE_URL = 'https://www.cloudflare.com/cdn-cgi/trace';
const IPV4_URL = 'https://api.ipify.org?format=json';
const IPV6_URL = 'https://api6.ipify.org?format=json';
const GEO_CACHE_KEY = 'horatio.network.geo.v1';
const GEO_TTL = 86400000;
const MAX_TEXT = 300;

function clean(value, limit = MAX_TEXT) {
  return value == null ? '' : String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit);
}
function env(ctx, key, fallback = '') {
  return clean(ctx.env?.[key] ?? fallback);
}
function timeout(ctx) {
  const n = Number(env(ctx, 'TIMEOUT', '4000'));
  return Number.isFinite(n) && n >= 1500 ? Math.min(n, 7000) : 4000;
}
function enabled(ctx, key) { return env(ctx, key, 'true').toLowerCase() !== 'false'; }
function requestOptions(ctx, policy, extra = {}) {
  return {
    timeout: timeout(ctx), credentials: 'omit', redirect: 'error',
    headers: { 'Cache-Control': 'no-cache', Accept: '*/*' },
    ...(policy ? { policy } : {}), ...extra
  };
}
function family(ip) {
  const value = clean(ip, 64);
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every(x => +x <= 255)) return 4;
  // Require valid compression and group count, including IPv4-mapped IPv6.
  if (!value.includes(':') || !/^[a-f\d:.]+$/i.test(value)) return 0;
  let expanded = value;
  if (value.includes('.')) {
    const last = value.slice(value.lastIndexOf(':') + 1);
    if (family(last) !== 4) return 0;
    expanded = value.slice(0, value.lastIndexOf(':') + 1) + '0:0';
  }
  if ((expanded.match(/::/g) || []).length > 1 || expanded.includes(':::')) return 0;
  if ((expanded.startsWith(':') && !expanded.startsWith('::')) || (expanded.endsWith(':') && !expanded.endsWith('::'))) return 0;
  const groups = expanded.split(':').filter(Boolean);
  if (!groups.every(x => /^[a-f\d]{1,4}$/i.test(x))) return 0;
  if (expanded.includes('::')) return groups.length < 8 ? 6 : 0;
  return groups.length === 8 ? 6 : 0;
}
function errorText(error) {
  const msg = clean(error?.message || error);
  if (/timeout|timed out|超时/i.test(msg)) return '请求超时';
  // Avoid logging a potentially sensitive proxy descriptor or raw URL in errors.
  return '请求失败';
}
function parseTrace(body) {
  const fields = {};
  for (const line of String(body).split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) fields[line.slice(0, i)] = clean(line.slice(i + 1));
  }
  if (!family(fields.ip)) throw new Error('invalid trace');
  return {
    ip: fields.ip, countryCode: /^[A-Z]{2}$/.test(fields.loc || '') ? fields.loc : '',
    colo: clean(fields.colo, 8), http: clean(fields.http, 20), tls: clean(fields.tls, 30),
    warp: clean(fields.warp, 20)
  };
}
async function ipCheck(ctx, policy, version) {
  try {
    const resp = await ctx.http.get(version === 4 ? IPV4_URL : IPV6_URL, requestOptions(ctx, policy));
    if (resp.status !== 200) return { ok: false, ip: '', detail: 'HTTP ' + resp.status };
    const data = await resp.json();
    const ip = clean(data?.ip, 64);
    if (family(ip) !== version) return { ok: false, ip: '', detail: '返回地址类型不符' };
    return { ok: true, ip, source: 'ipify', detail: '已确认' };
  } catch (e) { return { ok: false, ip: '', detail: errorText(e) }; }
}
async function traceCheck(ctx, policy) {
  const start = Date.now();
  try {
    const resp = await ctx.http.get(TRACE_URL, requestOptions(ctx, policy));
    if (resp.status !== 200) return { ok: false, detail: 'HTTP ' + resp.status };
    const data = parseTrace(await resp.text());
    return { ok: true, ...data, ms: Math.max(1, Date.now() - start), detail: '已连通' };
  } catch (e) { return { ok: false, detail: errorText(e) }; }
}
function localGeo(ctx, ip) {
  try {
    const g = ctx.lookupIP?.(ip);
    return g ? { countryCode: clean(g.country, 2), asn: clean(g.asn, 12), org: clean(g.organization), source: 'Egern 本地库' } : {};
  } catch { return {}; }
}
function readGeoCache(ctx) {
  try { return ctx.storage?.getJSON(GEO_CACHE_KEY) || {}; } catch { return {}; }
}
async function getGeo(ctx, ip, policy) {
  if (!ip) return { detail: '尚未获取 IPv4' };
  const base = localGeo(ctx, ip);
  if (!enabled(ctx, 'GEO_LOOKUP')) return { ...base, detail: '在线查询已关闭' };
  const cache = readGeoCache(ctx);
  const hit = cache[ip];
  if (hit?.at && Date.now() - hit.at >= 0 && Date.now() - hit.at < GEO_TTL) return { ...base, ...hit.data, cached: true };
  try {
    const resp = await ctx.http.get('https://ipwho.is/' + encodeURIComponent(ip), requestOptions(ctx, policy, { timeout: Math.min(timeout(ctx), 3000) }));
    if (resp.status !== 200) return { ...base, detail: 'GeoIP HTTP ' + resp.status };
    const data = await resp.json();
    if (data?.success !== true || clean(data.ip, 64) !== ip) return { ...base, detail: 'GeoIP 数据未确认' };
    const geo = {
      country: clean(data.country), countryCode: clean(data.country_code, 2),
      region: clean(data.region), city: clean(data.city),
      asn: clean(data.connection?.asn, 12), org: clean(data.connection?.org),
      isp: clean(data.connection?.isp), timezone: clean(data.timezone?.id),
      source: 'ipwho.is', detail: ''
    };
    try {
      // Merge again after await to preserve parallel lookups. Retain only 12 IPs.
      const next = readGeoCache(ctx);
      next[ip] = { at: Date.now(), data: geo };
      const bounded = Object.fromEntries(Object.entries(next).sort((a, b) => b[1].at - a[1].at).slice(0, 12));
      ctx.storage?.setJSON(GEO_CACHE_KEY, bounded);
    } catch { /* Storage is optional; detection still works. */ }
    return { ...base, ...Object.fromEntries(Object.entries(geo).filter(([, v]) => v !== '')) };
  } catch (e) { return { ...base, detail: 'GeoIP ' + errorText(e) }; }
}
function deviceInfo(ctx) {
  const d = ctx.device || {};
  const show = enabled(ctx, 'SHOW_LOCAL');
  const iface = clean(d.ipv4?.interface || d.ipv6?.interface);
  const ssid = clean(d.wifi?.ssid);
  const radio = clean(d.cellular?.radio);
  // A registered SIM does not prove that cellular is the active network.
  const kind = ssid || /^en\d/.test(iface) ? 'Wi-Fi / 有线' : /^pdp_ip/.test(iface) ? '蜂窝网络' : '网络类型未确认';
  return {
    kind, hidden: !show,
    ssid: show ? ssid : '', bssid: show ? clean(d.wifi?.bssid) : '',
    carrier: clean(d.cellular?.carrier), radio,
    ipv4: show ? clean(d.ipv4?.address, 64) : '', ipv6: show ? clean(d.ipv6?.address, 64) : '',
    gateway: show ? clean(d.ipv4?.gateway, 64) : '', interface: show ? iface : '',
    dns: show && Array.isArray(d.dnsServers) ? d.dnsServers.map(x => clean(x, 200)).filter(Boolean).slice(0, 8) : [],
    appVersion: clean(ctx.app?.version), language: clean(ctx.app?.language)
  };
}
async function collect(ctx) {
  const policy = env(ctx, 'PROBE_POLICY');
  const specs = [{ id: 'direct', title: '直连出口', policy: 'DIRECT' }, { id: 'probe', title: policy ? '指定策略出口' : '规则出口', policy }];
  const streamingTask = Promise.all([netflixCheck(ctx), youtubeCheck(ctx)]);
  const routes = await Promise.all(specs.map(async spec => {
    const [v4, v6, trace] = await Promise.all([ipCheck(ctx, spec.policy, 4), ipCheck(ctx, spec.policy, 6), traceCheck(ctx, spec.policy)]);
    // A dual-stack trace is only a fallback for the matching address family.
    for (const [v, type] of [[v4, 4], [v6, 6]]) {
      if (!v.ok && trace.ok && family(trace.ip) === type) Object.assign(v, { ok: true, ip: trace.ip, source: 'Cloudflare', detail: '备用检测' });
    }
    const geo = await getGeo(ctx, v4.ip, spec.policy);
    return { ...spec, policy: spec.policy || '按当前规则', v4, v6, trace, geo };
  }));
  return { version: VERSION, updatedAt: new Date().toISOString(), device: deviceInfo(ctx), routes, streaming: await streamingTask, geoEnabled: enabled(ctx, 'GEO_LOOKUP') };
}
const STREAM_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
function streamResult(name, state, detail, region = '', policy = '') {
  return { name, state, detail, region: /^[A-Z]{2}$/.test(region) ? region : '', policy: policy || '按当前规则' };
}
async function streamPage(ctx, url, policy) {
  try {
    const r = await ctx.http.get(url, requestOptions(ctx, policy, { redirect: 'follow', headers: { 'User-Agent': STREAM_UA, 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html', 'Cache-Control': 'no-cache' } }));
    const body = await r.text();
    return { status: r.status, body: String(body || '').replace(/\\"/g, '"'), error: '' };
  } catch (e) { return { status: 0, body: '', error: errorText(e) }; }
}
function netflixTitleState(page) {
  if (page.status !== 200 || !page.body) return 'unknown';
  if (/Oh no!|This title is not available|not available in your country/i.test(page.body)) return 'unavailable';
  // A 200 login/challenge/landing page is not evidence of an available title.
  if (/"@type"\s*:\s*"(?:Movie|TVSeries|TVEpisode|VideoObject)"/i.test(page.body) && /"name"\s*:\s*"[^"\n]+"/i.test(page.body)) return 'available';
  if (/<meta\b[^>]*property=["']og:type["'][^>]*content=["']video\.(?:movie|tv_show|episode)["']/i.test(page.body)) return 'available';
  return 'unknown';
}
async function netflixCheck(ctx) {
  const policy = env(ctx, 'NETFLIX_POLICY');
  const pages = await Promise.all(['81280792', '70143836', '80057281'].map(id => streamPage(ctx, 'https://www.netflix.com/title/' + id, policy)));
  const body = pages.map(x => x.body).join('\n');
  const region = (body.match(/"countryCode"\s*:\s*"([A-Z]{2})"/) || [])[1] || '';
  const result = (state, detail) => streamResult('Netflix', state, detail, region, policy);
  const states = pages.map(netflixTitleState);
  if (states.slice(0, 2).includes('available')) return result('ok', '非自制片源可用（抽样）');
  if (states[0] === 'unavailable' && states[1] === 'unavailable' && states[2] === 'available') return result('partial', '仅自制剧（抽样）');
  if (pages.some(x => x.status === 429)) return result('limited', 'HTTP 429 限流');
  if (pages.every(x => x.status === 403)) return result('blocked', '访问受限 · HTTP 403');
  return result('unknown', pages.find(x => x.error)?.error || '片库/页面未确认');
}
async function youtubeCheck(ctx) {
  const policy = env(ctx, 'YOUTUBE_POLICY');
  const page = await streamPage(ctx, 'https://www.youtube.com/premium', policy);
  const body = page.body;
  const region = (body.match(/"INNERTUBE_CONTEXT_GL"\s*:\s*"([A-Z]{2})"/) || [])[1] || '';
  const result = (state, detail, country = region) => streamResult('YouTube Premium', state, detail, country, policy);
  if (page.status === 429) return result('limited', 'HTTP 429 限流');
  if (page.status === 403) return result('blocked', '访问受限 · HTTP 403');
  if (page.status !== 200 || !body) return result('unknown', page.error || 'HTTP ' + page.status);
  // Require a YouTube page marker before interpreting region text.
  if (!/ytInitialData|INNERTUBE_CONTEXT_GL|youtube\.com/i.test(body)) return result('unknown', '页面特征未确认');
  if (/Premium is not available in your country|YouTube Premium is not available in your location/i.test(body)) return result('blocked', 'Premium 地区不可用');
  if (/consent\.youtube\.com|consent\.google\.com/i.test(body) && !/ytInitialData/.test(body)) return result('unknown', '需要同意隐私提示');
  if (/ad[-\s]?free/i.test(body) && /(?:YouTube\s+Premium|premiumOffer|ypcOffers)/i.test(body) && region) return result('ok', 'Premium 地区可用');
  return result('unknown', 'Premium 页面未确认');
}
function streamMeta(item) {
  if (item.state === 'ok') return { label: '可用', color: C.green, icon: 'checkmark.circle.fill' };
  if (item.state === 'partial') return { label: '仅自制', color: C.amber, icon: 'exclamationmark.circle' };
  if (item.state === 'limited') return { label: '限流', color: C.amber, icon: 'exclamationmark.circle' };
  if (item.state === 'blocked') return { label: '受限', color: C.amber, icon: 'xmark.circle' };
  return { label: '未确认', color: C.muted, icon: 'questionmark.circle' };
}
function asnLabel(geo) { return geo.asn ? 'AS' + String(geo.asn).replace(/^AS/i, '') : '未确认'; }
function locationLabel(geo) { return [...new Set([geo.country || geo.countryCode, geo.region, geo.city].filter(Boolean))].join(' · ') || '地区未确认'; }
function flag(code) { return /^[A-Z]{2}$/.test(code || '') ? String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt())) : ''; }

// Widget DSL uses only documented properties. Real backdrop blur is in the HTML panel.
const C = {
  fg: { light: '#132033', dark: '#F5F7FF' }, muted: { light: '#5F7085', dark: '#A9B9D0' },
  edge: { light: '#FFFFFF80', dark: '#C3D8FF30' }, shadow: { light: '#5379AC14', dark: '#00000030' },
  blue: { light: '#0061D9', dark: '#70B6FF' }, green: { light: '#16763E', dark: '#65DB9C' },
  amber: { light: '#A96500', dark: '#FFD080' }
};
function txt(text, size = 12, color = C.fg, weight = 'regular', more = {}) {
  return { type: 'text', text: String(text || '未提供'), font: { size, weight }, textColor: color, maxLines: 1, minScale: 0.7, ...more };
}
function stack(children, more = {}) { return { type: 'stack', direction: 'column', alignItems: 'start', gap: 4, children, ...more }; }
function row(children, more = {}) { return stack(children, { direction: 'row', alignItems: 'center', gap: 6, ...more }); }
function glass(children, more = {}) {
  return stack(children, {
    padding: 10, borderRadius: 18, borderWidth: 0.7, borderColor: C.edge,
    backgroundGradient: { type: 'linear', colors: [{ light: '#FFFFFF42', dark: '#FFFFFF18' }, { light: '#FFFFFF12', dark: '#A5CFFF06' }], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    shadowColor: C.shadow, shadowRadius: 5, shadowOffset: { x: 0, y: 2 }, ...more
  });
}
function icon(name, color = C.blue, size = 15) { return { type: 'image', src: 'sf-symbol:' + name, color, width: size, height: size }; }
function infoLine(label, value, more = {}) { return row([txt(label, 10, C.muted), { type: 'spacer' }, txt(value, 10, C.fg, 'medium', { textAlign: 'right', ...more })]); }
function routeCard(route, large) {
  const good = route.v4.ok || route.v6.ok;
  const geo = route.geo;
  const country = geo.countryCode || route.trace.countryCode;
  return glass([
    row([icon(route.id === 'direct' ? 'wifi' : 'globe'), txt(route.title, 11, C.muted, 'semibold'), { type: 'spacer' }, icon(good ? 'checkmark.circle.fill' : 'questionmark.circle', good ? C.green : C.amber, 12)]),
    txt(route.v4.ip || 'IPv4 未确认', large ? 19 : 16, C.fg, 'semibold', { minScale: 0.55 }),
    txt([flag(country), geo.city || geo.country || country || '地区未确认'].filter(Boolean).join(' '), 11, C.blue, 'medium'),
    txt((geo.isp || geo.org || 'ISP 未确认') + ' · ' + asnLabel(geo), 10, C.muted),
    ...(large ? [infoLine('IPv6', route.v6.ip || '未确认 · ' + route.v6.detail, { maxLines: 2, minScale: 0.6 }), infoLine('策略', route.policy)] : []),
    infoLine('CF POP / HTTP', route.trace.ok ? (route.trace.colo || '—') + ' · ' + route.trace.ms + ' ms' : '未确认')
  ], { flex: 1, padding: large ? 8 : 7, gap: large ? 3 : 2 });
}
function streamCard(item) {
  const m = streamMeta(item);
  return glass([
    row([icon(item.name === 'Netflix' ? 'play.tv.fill' : 'play.rectangle.fill', item.name === 'Netflix' ? '#E83C47' : '#F04D4D', 13), txt(item.name === 'Netflix' ? 'Netflix' : 'YouTube Premium', 11, C.fg, 'semibold', { flex: 1 }), icon(m.icon, m.color, 11)]),
    row([txt(m.label, 12, m.color, 'semibold'), { type: 'spacer' }, txt([flag(item.region), item.region].filter(Boolean).join(' ') || '地区未确认', 10, C.muted)]),
    txt(item.detail, 9, C.muted),
    txt(item.policy, 9, C.muted)
  ], { flex: 1, padding: 7, gap: 2 });
}
function renderWidget(ctx, data) {
  const familyName = ctx.widgetFamily || 'systemLarge';
  const probe = data.routes[1];
  const country = probe.geo.countryCode || probe.trace.countryCode || '—';
  const accessory = familyName.startsWith('accessory');
  const common = { type: 'widget', url: PANEL_URL, refreshAfter: new Date(Date.now() + 900000).toISOString() };
  if (accessory) {
    const main = probe.v4.ip || '出口未确认';
    if (familyName === 'accessoryInline') return { ...common, children: [txt('Network · ' + main, 'caption1')] };
    if (familyName === 'accessoryCircular') return { ...common, children: [icon('network', C.fg, 16), txt(country, 'caption1', C.fg, 'bold')] };
    return { ...common, children: [txt('Network Info · ' + country, 'headline', C.fg, 'semibold'), txt(main, 'caption1'), txt(data.device.kind, 'caption2', C.muted)] };
  }
  const large = ['systemLarge', 'systemExtraLarge'].includes(familyName);
  const header = row([icon('network'), txt('Network Info', 15, C.fg, 'bold'), { type: 'spacer' }, txt('v' + VERSION, 9, C.muted)]);
  const stamp = row([txt(data.device.hidden ? data.device.kind : data.device.ssid || data.device.kind, 10, C.muted), { type: 'spacer' }, { type: 'date', date: data.updatedAt, format: 'time', font: { size: 9 }, textColor: C.muted }]);
  let content;
  if (familyName === 'systemSmall') {
    content = [header, txt(probe.title, 9, C.muted), txt(probe.v4.ip || 'IPv4 未确认', 18, C.fg, 'bold', { minScale: 0.5 }), txt(flag(country) + ' ' + (probe.geo.city || country), 11, C.blue), ...(data.streaming || []).map(s => row([txt(s.name === 'Netflix' ? 'Netflix' : 'YouTube', 9, C.muted), { type: 'spacer' }, txt(streamMeta(s).label, 9, streamMeta(s).color, 'medium')])), stamp];
  } else {
    content = [header, row(data.routes.map(r => routeCard(r, large)), { alignItems: 'start', gap: 8 }),
      ...(large ? [row((data.streaming || []).map(streamCard), { alignItems: 'start', gap: 8 })] : [row((data.streaming || []).map(s => row([txt(s.name === 'Netflix' ? 'Netflix' : 'YouTube', 9, C.muted), txt(streamMeta(s).label + (s.region ? ' · ' + s.region : ''), 9, streamMeta(s).color, 'semibold')], { flex: 1 })))]),
      ...(large ? [glass([row([icon('point.3.connected.trianglepath.dotted'), txt('本地网络', 12, C.fg, 'semibold')]),
        infoLine('连接', data.device.hidden ? '本地详情已隐藏' : data.device.ssid || data.device.kind),
        infoLine('LAN IPv4', data.device.hidden ? '已隐藏' : data.device.ipv4 || '未提供'),
        infoLine('网关', data.device.hidden ? '已隐藏' : data.device.gateway || '未提供'),
        infoLine('设备 DNS', data.device.hidden ? '已隐藏' : data.device.dns.join(' · ') || '未提供', { maxLines: 2 })], { padding: 8, gap: 3 }) ] : []),
      stamp, ...(large ? [txt('轻点查看详情 · 解锁为网页抽样检测', 9, C.muted)] : [])];
  }
  return { ...common, padding: large ? 9 : 7, gap: large ? 5 : 3, backgroundColor: '#00000000', children: content };
}

// PANEL_HTML is appended by the release build; no runtime fetch of UI assets.
export default async function(ctx) {
  if (ctx.request) {
    const parsed = /^http:\/\/network\.horatio\.test(\/[^?#]*)?(?:\?[^#]*)?$/.exec(ctx.request.url);
    if (!parsed) return;
    const path = parsed[1] || '/';
    const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
    if (ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD') return ctx.respond({ status: 405, headers: { ...headers, Allow: 'GET, HEAD' }, body: '' });
    if (path !== '/' && path !== '/api' && path !== '/favicon.ico') return ctx.respond({ status: 404, headers, body: 'Not found' });
    if (path === '/favicon.ico') return ctx.respond({ status: 204, headers, body: '' });
    if (ctx.request.method === 'HEAD') return ctx.respond({ status: 200, headers: { ...headers, 'Content-Type': path === '/api' ? 'application/json' : 'text/html; charset=utf-8' }, body: '' });
    if (path === '/api') return ctx.respond({ status: 200, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(await collect(ctx)) });
    return ctx.respond({ status: 200, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" }, body: PANEL_HTML });
  }
  return renderWidget(ctx, await collect(ctx));
}

const PANEL_HTML = "<!doctype html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"color-scheme\" content=\"light dark\"><meta name=\"referrer\" content=\"no-referrer\">\n<title>Network Info · Horatio</title>\n<style>\n:root{color-scheme:light dark;--bg:#ecf1fb;--fg:#152238;--muted:#62738c;--glass:rgba(255,255,255,.16);--glass2:rgba(255,255,255,.08);--edge:rgba(255,255,255,.52);--line:rgba(55,78,112,.10);--blue:#0068dd;--green:#19805a;--amber:#9b670b;--shadow:0 12px 38px rgba(36,68,115,.09),inset 0 1px 1px rgba(255,255,255,.4);--focus:#0068dd}\n@media(prefers-color-scheme:dark){:root{--bg:#0d1527;--fg:#f0f5ff;--muted:#a5b6d1;--glass:rgba(255,255,255,.045);--glass2:rgba(255,255,255,.02);--edge:rgba(208,229,255,.24);--line:rgba(210,231,255,.09);--blue:#7bbeff;--green:#7ae3b0;--amber:#ffd18a;--shadow:0 14px 42px rgba(0,0,0,.22),inset 0 1px 1px rgba(255,255,255,.16);--focus:#7bbeff}}\n*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;-webkit-font-smoothing:antialiased;line-height:1.45}button,a{-webkit-tap-highlight-color:transparent}button{font:inherit}a{color:var(--blue)}:focus-visible{outline:3px solid var(--focus);outline-offset:4px}.ambient{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:-1}.ambient:before,.ambient:after{content:\"\";position:absolute;filter:blur(55px);border-radius:50%;opacity:.44}.ambient:before{width:65vw;height:65vw;max-width:680px;max-height:680px;left:-20%;top:-10%;background:linear-gradient(150deg,#8badff,#88e4df)}.ambient:after{width:90vw;height:80vw;max-width:760px;max-height:760px;right:-35%;top:35%;background:linear-gradient(120deg,#bca2f8,#93cfff)}main{max-width:890px;margin:auto;padding:max(28px,env(safe-area-inset-top)) 22px max(36px,env(safe-area-inset-bottom))}.eyebrow{color:var(--muted);font-size:10px;font-weight:650;letter-spacing:2.3px}.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}.top h1{font-size:32px;letter-spacing:-1.4px;margin:3px 0;font-weight:750}.sub{font-size:12px;color:var(--muted)}.round,.pill,.glass{background:var(--glass);border:1px solid var(--edge);box-shadow:var(--shadow);-webkit-backdrop-filter:blur(28px) saturate(165%);backdrop-filter:blur(28px) saturate(165%)}.round{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;color:var(--fg);cursor:pointer;flex-shrink:0}.round svg{width:20px;height:20px}.round:disabled{opacity:.5;cursor:wait}.glass{border-radius:28px;position:relative;overflow:hidden}.glass:before{content:\"\";position:absolute;top:0;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);pointer-events:none}.hero{padding:20px;display:flex;gap:14px;align-items:center;margin-bottom:14px}.symbol{width:48px;height:48px;border-radius:17px;color:var(--blue);background:var(--glass2);border:1px solid var(--edge);display:grid;place-items:center;flex-shrink:0}.symbol svg{width:25px;height:25px}.hero-info{min-width:0;flex:1}.hero-title{font-size:16px;font-weight:650;overflow-wrap:anywhere}.hero small{font-size:11px;color:var(--muted)}.pill{padding:5px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:6px;font-size:10px;color:var(--green);white-space:nowrap;flex-shrink:0}.dot{width:5px;height:5px;border-radius:50%;background:currentColor}.routes{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.route{padding:22px;min-width:0}.cardtop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:16px}.kicker{font-size:11px;color:var(--muted);font-weight:650;letter-spacing:.4px}.badge{color:var(--blue);font-size:9px;font-weight:650;border:1px solid var(--edge);background:var(--glass2);padding:4px 8px;border-radius:20px}.label{font-size:10px;color:var(--muted);margin-bottom:4px}.ip{font-size:clamp(20px,3vw,29px);font-weight:700;letter-spacing:-.6px;overflow-wrap:anywhere;margin:0 0 7px;font-variant-numeric:tabular-nums}.place{font-size:12px;color:var(--blue);min-height:18px;overflow-wrap:anywhere}.isp{font-size:11px;color:var(--muted);margin-top:5px;overflow-wrap:anywhere}.divider{height:1px;background:var(--line);margin:17px 0 14px}.v6{font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere;min-height:36px}.row{display:grid;grid-template-columns:minmax(70px,auto) 1fr;gap:15px;font-size:12px;padding:11px 0;border-bottom:1px solid var(--line)}.row:last-child{border-bottom:0}.row dt{color:var(--muted)}.row dd{margin:0;text-align:right;overflow-wrap:anywhere;font-weight:500}.row small{display:block;font-size:10px;color:var(--muted);font-weight:400;margin-top:4px}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}.metric{display:flex;align-items:baseline;gap:5px;margin:13px 0 2px}.metric b{font-size:25px;letter-spacing:-1px;font-variant-numeric:tabular-nums}.metric span{font-size:10px;color:var(--muted)}.metric-caption{font-size:10px;color:var(--muted)}.section{padding:20px 22px;margin-bottom:14px}.section h2{font-size:14px;font-weight:650;letter-spacing:-.2px;margin:0 0 6px}.section p{margin:5px 0 0;font-size:11px;color:var(--muted)}dl{margin:0}.warn{color:var(--amber)}.statusline{margin:0 2px 15px;font-size:11px;color:var(--muted)}details summary{font-size:12px;cursor:pointer;font-weight:600;padding:3px 0}details .body{font-size:11px;color:var(--muted);line-height:1.8;margin-top:12px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.action{padding:11px 16px;font-size:12px;font-weight:600;border-radius:30px;background:var(--glass);border:1px solid var(--edge);box-shadow:var(--shadow);color:var(--fg);text-decoration:none;cursor:pointer}.action:disabled{opacity:.45;cursor:default}.foot{font-size:10px;color:var(--muted);display:flex;justify-content:space-between;gap:10px;padding:0 4px}.error{border:1px solid rgba(212,147,48,.4);border-radius:18px;padding:14px;margin-bottom:14px;font-size:12px;color:var(--amber);background:var(--glass)}.loading{opacity:.65}#toast{position:fixed;bottom:max(30px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:25px;font-size:12px;z-index:10;white-space:nowrap}.copy-fallback{width:100%;min-height:140px;border:1px solid var(--edge);background:var(--glass2);border-radius:16px;padding:12px;color:var(--fg);font:11px/1.7 ui-monospace,monospace;margin-top:10px}.hidden,[hidden]{display:none!important}@media(max-width:570px){main{padding-left:18px;padding-right:18px}.top h1{font-size:30px}.routes{grid-template-columns:1fr}.route{padding:21px}.ip{font-size:29px}.v6{min-height:0}.hero{padding:17px}.symbol{width:42px;height:42px}.hero-title{font-size:14px}.pill{font-size:9px;padding:5px 8px}.top{margin-bottom:20px}}@media(prefers-reduced-transparency:reduce){.glass,.round,.pill{background:var(--bg);backdrop-filter:none;-webkit-backdrop-filter:none}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}\n.stream-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.stream-card{padding:15px;border-radius:20px;min-width:0}.stream-card h3{margin:0 0 9px;font-size:14px}.stream-state{font-size:17px;font-weight:650;margin-bottom:6px}.stream-note{font-size:10px;color:var(--muted);overflow-wrap:anywhere}.stream-card .badge{display:inline-block;margin-top:9px;white-space:normal;overflow-wrap:anywhere}</style>\n</head>\n<body><div class=\"ambient\" aria-hidden=\"true\"></div>\n<main>\n<header class=\"top\"><div><div class=\"eyebrow\">HORATIO / NETWORK</div><h1>Network Info</h1><div class=\"sub\">你的连接，一目了然。</div></div><button class=\"round\" id=\"refresh\" title=\"重新检测\" aria-label=\"重新检测\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"><path d=\"M20 7v5h-5M4 17v-5h5\"/><path d=\"M6.2 6.2a8 8 0 0 1 12.6 2L20 12M4 12l1.2 3.8a8 8 0 0 0 12.6 2\"/></svg></button></header>\n<div id=\"error\" class=\"error\" role=\"alert\" hidden></div>\n<section class=\"glass hero\" aria-label=\"当前连接\"><div class=\"symbol\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><ellipse cx=\"12\" cy=\"12\" rx=\"4\" ry=\"9\"/><path d=\"M3 12h18M5 6.5h14M5 17.5h14\"/></svg></div><div class=\"hero-info\"><div class=\"hero-title\" id=\"network\">正在读取连接</div><small id=\"network-sub\">直连与规则出口分别检测</small></div><div class=\"pill\" id=\"overall\"><span class=\"dot\"></span><span id=\"overall-text\">检测中</span></div></section>\n<p class=\"statusline\" id=\"status\" aria-live=\"polite\">正在检查 IPv4、IPv6 与网络出口…</p>\n<div class=\"routes\" id=\"routes\" aria-live=\"polite\"></div>\n<section class=\"glass section\"><h2>流媒体解锁</h2><p>Netflix 非自制片源 · YouTube Premium 地区</p><div class=\"stream-grid\" id=\"streaming\"></div></section>\n<section class=\"glass section\" id=\"local\"><h2>本地网络</h2><p>设备接口信息</p><dl id=\"local-rows\"></dl></section>\n<section class=\"glass section\"><details><summary>如何理解这些结果</summary><div class=\"body\">“直连出口”由 DIRECT 单独请求。“规则出口”按检测域名的当前分流访问，可能直连；可在模块的 PROBE_POLICY 中填写现有节点或策略组，检测该策略的出口。<br><br>Cloudflare POP 是检测请求接入的边缘机房代码，不是节点所在地。HTTP 耗时包含 DNS、连接、TLS 和响应，不是 ICMP Ping。不同检测域名可能命中不同规则；面板不代表所有 App 的出口。<br><br>IPv6 显示“未确认”表示该请求没有拿到有效地址，可能是策略不支持、超时或接口异常。GeoIP 是数据库估计位置，不是 GPS，也不保证与 Instagram 等服务的地区判定一致。设备 DNS 列表不等于 Egern 最终使用的 DoH/DoQ 上游。<br><br>Netflix 是指定片源的网页抽样检测，片源可访问不保证整个片库或实际播放；仅自制剧需同时确认非自制片源不可用且原创片源可访问。YouTube 检测 Premium 地区页面，地区可用不代表已开通会员。两项默认按各自域名分流，不跟随 PROBE_POLICY；可分别设置 NETFLIX_POLICY / YOUTUBE_POLICY。</div></details></section>\n<div class=\"actions\"><button class=\"action\" id=\"copy\" disabled>复制检测摘要</button><a class=\"action\" href=\"egern:/connections\">查看实际连接</a></div>\n<textarea class=\"copy-fallback\" id=\"copy-fallback\" readonly aria-label=\"检测摘要，长按复制\" hidden></textarea>\n<footer class=\"foot\"><span>Horatio · Liquid Glass</span><span id=\"version\">v1.1.0</span></footer>\n</main><div class=\"glass\" id=\"toast\" role=\"status\" hidden></div>\n<script>\n(function(){\n'use strict';\nvar current=null,busy=false,toastTimer;\nfunction el(id){return document.getElementById(id)}\nfunction node(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n}\nfunction label(value,fallback){return value||fallback||'未提供'}\nfunction flag(code){return /^[A-Z]{2}$/.test(code||'')?String.fromCodePoint.apply(null,Array.from(code).map(function(c){return 127397+c.charCodeAt(0)})):''}\nfunction asn(g){return g.asn?'AS'+String(g.asn).replace(/^AS/i,''):'ASN 未确认'}\nfunction place(g,t){return Array.from(new Set([g.country||g.countryCode||t.countryCode,g.region,g.city].filter(Boolean))).join(' · ')||'地区未确认'}\nfunction line(label,value,note,mono){var r=node('div','row'),dt=node('dt','',label),dd=node('dd',mono?'mono':'',value||'未提供');if(note)dd.appendChild(node('small','',note));r.appendChild(dt);r.appendChild(dd);return r}\nfunction routeCard(r){\nvar g=r.geo||{},t=r.trace||{},box=node('article','glass route');var top=node('div','cardtop');top.appendChild(node('div','kicker',r.title));top.appendChild(node('span','badge',r.policy));box.appendChild(top);\nbox.appendChild(node('div','label','公网 IPv4'));box.appendChild(node('div','ip',r.v4.ip||'未确认'));box.appendChild(node('div','place',[flag(g.countryCode||t.countryCode),place(g,t)].filter(Boolean).join(' ')));box.appendChild(node('div','isp',[g.isp||g.org||'ISP 未确认',asn(g)].join(' · ')));\nbox.appendChild(node('div','divider'));box.appendChild(node('div','label','公网 IPv6'));box.appendChild(node('div',r.v6.ok?'v6':'v6 warn',r.v6.ip||'未确认 · '+r.v6.detail));\nvar dl=node('dl');dl.appendChild(line('Cloudflare POP',t.colo||'未确认',t.ok?'接入机房 · 不代表出口所在地':t.detail));dl.appendChild(line('IPv4 数据源',r.v4.source||'未确认',r.v4.ok?'':r.v4.detail));dl.appendChild(line('GeoIP 数据源',g.source||'未确认',g.detail||(g.cached?'地理信息缓存 · 最长 24 小时':'')));if(g.timezone)dl.appendChild(line('时区',g.timezone));box.appendChild(dl);\nvar m=node('div','metric');m.appendChild(node('b','',t.ok?String(t.ms):'—'));m.appendChild(node('span','',t.ok?'ms · HTTP':'HTTP 未确认'));box.appendChild(m);box.appendChild(node('div','metric-caption',t.ok?'Cloudflare 请求总耗时'+(t.http?' · HTTP/'+t.http:''):'检测接口暂未连通'));\nreturn box;\n}\nfunction streamCard(s){\nvar box=node('article','glass stream-card');box.appendChild(node('h3','',s.name));var labels={ok:'可用',partial:'仅自制剧',limited:'限流',blocked:'访问受限',unknown:'未确认'};var state=node('div','stream-state',labels[s.state]||'未确认');state.style.color=s.state==='ok'?'var(--green)':s.state==='unknown'?'var(--muted)':'var(--amber)';box.appendChild(state);box.appendChild(node('div','stream-note',s.detail));box.appendChild(node('div','stream-note',[flag(s.region),s.region||'地区未确认'].filter(Boolean).join(' ')));box.appendChild(node('span','badge',s.policy||'按当前规则'));return box;\n}\nfunction render(data){\ncurrent=data;var d=data.device||{},ok=data.routes.some(function(r){return r.v4.ok||r.v6.ok});el('network').textContent=d.hidden?d.kind:d.ssid||d.kind;el('network-sub').textContent=[d.kind,d.radio&&d.kind==='蜂窝网络'?d.radio:'',d.carrier?'SIM · '+d.carrier:''].filter(Boolean).join(' · ');el('overall-text').textContent=ok?'已获取出口':'出口未确认';el('overall').style.color=ok?'var(--green)':'var(--amber)';\nel('routes').replaceChildren.apply(el('routes'),data.routes.map(routeCard));el('streaming').replaceChildren.apply(el('streaming'),(data.streaming||[]).map(streamCard));var rows=[];\nif(d.hidden){rows=[line('本地信息','已隐藏','模块 SHOW_LOCAL 已关闭')]}else{rows=[line('Wi-Fi',d.ssid||'未提供','未提供名称时，可检查 iOS 权限与当前连接类型'),line('BSSID',d.bssid,'',true),line('蜂窝运营商',d.carrier,'SIM 信息不等于正在使用蜂窝网络'),line('蜂窝制式',d.radio),line('LAN IPv4',d.ipv4,'',true),line('本地 IPv6',d.ipv6,'',true),line('IPv4 网关',d.gateway,'',true),line('接口',d.interface,'',true),line('设备 DNS',(d.dns||[]).join('\\n')||'未提供','设备列表，不代表 Egern 的实际加密 DNS 上游',true)]}\nel('local-rows').replaceChildren.apply(el('local-rows'),rows);el('version').textContent='v'+data.version+(d.appVersion?' · Egern '+d.appVersion:'');el('status').textContent='更新于 '+new Date(data.updatedAt).toLocaleString('zh-CN',{hour12:false})+' · 轻点右上角重新检测';el('copy').disabled=false;el('copy-fallback').hidden=true;\n}\nasync function refresh(){if(busy)return;busy=true;el('refresh').disabled=true;el('error').hidden=true;el('status').textContent='正在检查 IPv4、IPv6 与网络出口…';var controller=new AbortController();var timer=setTimeout(function(){controller.abort()},23000);try{var resp=await fetch('/api?t='+Date.now(),{cache:'no-store',credentials:'omit',signal:controller.signal});if(!resp.ok)throw new Error('HTTP '+resp.status);var data=await resp.json();if(!Array.isArray(data.routes)||data.routes.length!==2)throw new Error('返回数据不完整');render(data)}catch(e){el('error').textContent='检测未完成。请确认 Egern 已连接、Network Info 模块已启用，然后重试。'+(e.name==='AbortError'?'（请求超时）':'');el('error').hidden=false;el('status').textContent=current?'上次结果 · '+new Date(current.updatedAt).toLocaleString('zh-CN',{hour12:false}):'等待重新检测';if(!current){el('network').textContent='等待连接';el('overall-text').textContent='未确认';el('overall').style.color='var(--amber)'}}finally{clearTimeout(timer);busy=false;el('refresh').disabled=false}}\nfunction summary(){var a=['Network Info v'+current.version,'检测时间: '+current.updatedAt,'连接: '+(current.device.hidden?current.device.kind:current.device.ssid||current.device.kind)];current.routes.forEach(function(r){a.push('',r.title+' · '+r.policy,'IPv4: '+(r.v4.ip||'未确认'),'IPv6: '+(r.v6.ip||'未确认 · '+r.v6.detail),'GeoIP: '+place(r.geo,r.trace),'ISP: '+(r.geo.isp||r.geo.org||'未确认'),'ASN: '+asn(r.geo),'Cloudflare POP: '+(r.trace.colo||'未确认'),'HTTP: '+(r.trace.ok?r.trace.ms+' ms':'未确认'))});(current.streaming||[]).forEach(function(s){a.push('',s.name+' · '+s.policy,s.state+' · '+s.detail,'地区: '+(s.region||'未确认'))});a.push('','HTTP 耗时不是 Ping；规则出口不代表所有 App；解锁为网页抽样。');return a.join('\\n')}\nfunction toast(text){el('toast').textContent=text;el('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){el('toast').hidden=true},2500)}\nasync function copy(){if(!current)return;var text=summary();try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);toast('已复制检测摘要');return}var area=el('copy-fallback');area.value=text;area.hidden=false;area.focus();area.select();if(document.execCommand('copy')){area.hidden=true;toast('已复制检测摘要')}else{toast('长按下方摘要即可复制')}}catch(e){el('copy-fallback').value=text;el('copy-fallback').hidden=false;toast('长按下方摘要即可复制')}}\nel('refresh').addEventListener('click',refresh);el('copy').addEventListener('click',copy);refresh();\n})();\n</script></body></html>\n";
