// Page interaction checks in a simulated DOM. Not a WebKit rendering test.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const src = readFileSync(new URL('../script/NetworkInfo.js', import.meta.url), 'utf8');
const { default: run } = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const page = await run({ request: { method: 'GET', url: 'http://network.horatio.test/' }, respond: r => r });
const script = page.body.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const route = id => ({ id, title: id === 'direct' ? '直连出口' : '规则出口', policy: id === 'direct' ? 'DIRECT' : '按当前规则', v4: { ok: true, ip: '203.0.113.10', source: 'ipify' }, v6: { ok: false, ip: '', detail: '请求失败' }, trace: { ok: true, ip: '203.0.113.10', countryCode: 'CN', colo: 'SHA', ms: 38, http: 'h2' }, geo: { country: 'China', countryCode: 'CN', city: 'Shanghai', isp: 'Example ISP', asn: '64500', source: 'ipwho.is' } });
const sample = () => ({ version: '1.1.0', updatedAt: new Date().toISOString(), device: { kind: 'Wi-Fi / 有线', ssid: 'Example Wi-Fi', carrier: 'China Telecom', dns: ['223.5.5.5'] }, routes: [route('direct'), route('probe')], streaming: [{ name: 'Netflix', state: 'partial', detail: '仅自制剧（抽样）', region: 'US', policy: '按当前规则' }, { name: 'YouTube Premium', state: 'ok', detail: 'Premium 地区可用', region: 'JP', policy: 'Google' }] });
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.hidden = false; this.disabled = false; this.listeners = {}; this.textContent = ''; }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness(getData = sample) {
  const ids = new Map(); let calls = 0, fail = false;
  const document = { createElement: tag => new Element(tag), getElementById: id => { if (!ids.has(id)) ids.set(id, new Element(id)); return ids.get(id); }, execCommand: () => false };
  const ctx = vm.createContext({ document, window: { isSecureContext: false }, navigator: {}, Date, Array, Set, String, Error, AbortController, setTimeout: () => 1, clearTimeout: () => {}, fetch: async (url, init) => { calls++; assert.match(url, /^\/api\?t=/); assert.equal(init.credentials, 'omit'); if (fail) throw new Error('offline'); return { ok: true, json: async () => getData() }; } });
  new vm.Script(script).runInContext(ctx);
  return { ids, ctx, get calls() { return calls; }, setFail() { fail = true; } };
}
function allText(e) { return [e.textContent, ...e.children.flatMap(allText)].join(' '); }
test('page JS renders both routes and details without polling', async () => {
  const h = harness(); await flush();
  assert.equal(h.calls, 1); assert.equal(h.ids.get('routes').children.length, 2);
  assert.equal(h.ids.get('streaming').children.length, 2);
  assert.match(allText(h.ids.get('streaming')), /Netflix.*仅自制剧.*YouTube Premium.*可用/);
  assert.match(allText(h.ids.get('routes')), /公网 IPv6.*未确认/);
  assert.match(h.ids.get('status').textContent, /更新于/);
  assert.equal(h.ids.get('refresh').disabled, false);
  assert.equal(h.ids.get('copy').disabled, false);
});
test('HTML-like SSID and provider data stay text', async () => {
  const payload = sample(); payload.device.ssid = '<img src=x onerror="PWNED=1">'; payload.routes[1].geo.isp = '</script><script>PWNED=1</script>';
  const h = harness(() => payload); await flush();
  assert.equal(h.ids.get('network').textContent, payload.device.ssid);
  assert.equal(h.ids.get('network').children.length, 0); assert.equal(h.ctx.PWNED, undefined);
  assert.match(allText(h.ids.get('routes')), /<script>PWNED/);
});
test('failed refresh retains previous results and re-enables controls', async () => {
  const h = harness(); await flush(); h.setFail(); await h.ids.get('refresh').listeners.click();
  assert.match(h.ids.get('status').textContent, /上次结果/); assert.equal(h.ids.get('routes').children.length, 2);
  assert.equal(h.ids.get('error').hidden, false); assert.equal(h.ids.get('refresh').disabled, false);
});
test('copy works on an insecure HTTP origin through a visible fallback', async () => {
  const h = harness(); await flush(); await h.ids.get('copy').listeners.click();
  assert.equal(h.ids.get('copy-fallback').hidden, false); assert.equal(h.ids.get('copy-fallback').selected, true);
  assert.match(h.ids.get('copy-fallback').value, /203\.0\.113\.10/);
});
test('SHOW_LOCAL hidden mode does not render SSID and DNS detail', async () => {
  const payload = sample(); payload.device = { ...payload.device, hidden: true, ssid: '', dns: [] };
  const h = harness(() => payload); await flush();
  assert.equal(h.ids.get('local-rows').children.length, 1);
  assert.match(allText(h.ids.get('local-rows')), /本地信息.*已隐藏/);
});
