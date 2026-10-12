// Contract tests against Egern's documented ctx API, without a live iPhone.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const source = readFileSync(new URL('../Scripts/NetworkInfo.js', import.meta.url), 'utf8');
const { default: run } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function fixture(options = {}) {
  const requests = [], memory = {};
  const ctx = {
    env: { PROBE_POLICY: 'TAG 香港', ...options.env },
    device: { wifi: { ssid: 'Dorm Wi-Fi', bssid: '00:11:22:33:44:55' }, cellular: { carrier: 'China Telecom', radio: '5G' }, ipv4: { address: '192.168.9.21', gateway: '192.168.9.1', interface: 'en0' }, dnsServers: ['223.5.5.5'] },
    app: { version: 'test', language: 'en' },
    lookupIP: () => ({ country: 'US', asn: 64500, organization: 'Local ASN' }),
    storage: { getJSON: key => memory[key], setJSON: (key, value) => { memory[key] = value; } },
    respond: response => response,
    http: { get: async (url, init) => {
      requests.push({ url, init });
      if (options.offline) throw new Error('timeout');
      const direct = init.policy === 'DIRECT';
      const ip = direct ? '203.0.113.10' : '198.51.100.20';
      const v6 = direct ? '2001:db8::10' : '2001:db8::20';
      let data;
      if (url.includes('api6.ipify')) {
        if (options.noIPv6) throw new Error('Network unavailable');
        data = { ip: options.invalidIPv6 || v6 };
      } else if (url.includes('api.ipify')) {
        if (options.noIPv4) throw new Error('timeout');
        data = { ip };
      } else if (url.includes('ipwho.is')) {
        if (options.geoError) return { status: 429 };
        data = { success: true, ip, country: direct ? 'China' : 'United States', country_code: direct ? 'CN' : 'US', region: direct ? 'Shanghai' : 'California', city: direct ? 'Shanghai' : 'Los Angeles', connection: { asn: 64500, isp: options.isp || 'Example ISP', org: 'Example ASN' }, timezone: { id: 'Asia/Shanghai' } };
      } else {
        const traceIP = options.traceIPv6 ? v6 : ip;
        return { status: options.traceStatus || 200, text: async () => options.invalidTrace ? '<html>captive portal</html>' : 'ip=' + traceIP + '\nloc=' + (direct ? 'CN' : 'US') + '\ncolo=' + (direct ? 'SHA' : 'LAX') + '\nhttp=h2\ntls=TLSv1.3\n' };
      }
      return { status: 200, json: async () => data };
    } }
  };
  return { ctx, requests, memory };
}
async function data(f) { return JSON.parse((await run({ ...f.ctx, request: { method: 'GET', url: 'http://network.horatio.test/api' } })).body); }
function texts(tree) { return [tree.text || '', ...(tree.children || []).flatMap(texts)]; }
test('isolates DIRECT and specified policy requests and reports real addresses', async () => {
  const f = fixture(); const d = await data(f);
  assert.equal(d.routes[0].v4.ip, '203.0.113.10'); assert.equal(d.routes[1].v4.ip, '198.51.100.20');
  assert.equal(d.routes[1].v6.ip, '2001:db8::20'); assert.equal(d.routes[1].geo.city, 'Los Angeles');
  assert.ok(f.requests.filter(r => !/netflix|youtube/.test(r.url)).every(r => ['DIRECT', 'TAG 香港'].includes(r.init.policy)));
  assert.ok(f.requests.every(r => r.init.credentials === 'omit'));
  assert.equal(d.device.kind, 'Wi-Fi / 有线');
});
test('an empty policy follows rules without pretending it is a proxy', async () => {
  const f = fixture({ env: { PROBE_POLICY: '' } }); const d = await data(f);
  assert.equal(d.routes[1].title, '规则出口'); assert.equal(d.routes[1].policy, '按当前规则');
  assert.ok(f.requests.filter(r => r.init.policy !== 'DIRECT').every(r => !Object.hasOwn(r.init, 'policy')));
});
test('IPv6 failure stays unknown, and a dual-stack IPv4 trace does not prove IPv6', async () => {
  const d = await data(fixture({ noIPv6: true }));
  assert.equal(d.routes[0].v6.ok, false); assert.equal(d.routes[0].v6.ip, '');
  assert.equal(d.routes[0].v4.ok, true);
});
test('trace IPv6 only fills IPv6, never IPv4', async () => {
  const d = await data(fixture({ noIPv6: true, noIPv4: true, traceIPv6: true }));
  assert.equal(d.routes[1].v4.ok, false); assert.equal(d.routes[1].v6.ok, true);
  assert.equal(d.routes[1].v6.source, 'Cloudflare');
});
test('rejects malformed IPv6 provider payloads', async () => {
  for (const value of ['not-an-ip', ':::', ':1:2:3:4:5:6:7:8', '1:2:3:4:5:6:7:8:', '2001:db8:::1', '2001:db8::1:2:3:4:5:6']) {
    const d = await data(fixture({ invalidIPv6: value })); assert.equal(d.routes[1].v6.ok, false, value);
  }
});
test('GeoIP rate limits retain local ASN and cannot fabricate a city', async () => {
  const d = await data(fixture({ geoError: true }));
  assert.equal(d.routes[1].geo.source, 'Egern 本地库'); assert.equal(d.routes[1].geo.asn, '64500');
  assert.equal(d.routes[1].geo.city, undefined); assert.equal(d.routes[1].geo.detail, 'GeoIP HTTP 429');
});
test('GeoIP caching is bounded and merged between concurrent lookups', async () => {
  const f = fixture(); await data(f); await data(f);
  assert.equal(f.requests.filter(r => r.url.includes('ipwho.is')).length, 2);
  assert.equal(Object.keys(f.memory['horatio.network.geo.v1']).length, 2);
});
test('privacy toggles hide local identifiers and disable online GeoIP', async () => {
  const f = fixture({ env: { GEO_LOOKUP: 'false', SHOW_LOCAL: 'false' } }); const d = await data(f);
  assert.equal(d.device.ssid, ''); assert.equal(d.device.bssid, ''); assert.equal(d.device.ipv4, '');
  assert.deepEqual(d.device.dns, []); assert.equal(f.requests.length, 10);
  assert.ok(!f.requests.some(r => r.url.includes('ipwho.is')));
});
test('offline/missing device and storage APIs still produce all widget sizes', async () => {
  for (const widgetFamily of ['systemSmall', 'systemMedium', 'systemLarge', 'systemExtraLarge', 'accessoryInline', 'accessoryCircular', 'accessoryRectangular']) {
    const f = fixture({ offline: true }); delete f.ctx.device; delete f.ctx.storage; delete f.ctx.lookupIP;
    const w = await run({ ...f.ctx, widgetFamily });
    assert.equal(w.type, 'widget'); assert.ok(w.children.length); assert.equal(w.url, 'http://network.horatio.test/');
    assert.ok(!texts(w).join('').includes('undefined'));
    const verifyClear = node => {
      if (node.type === 'widget' || node.type === 'stack') {
        assert.equal(node.backgroundColor, '#00000000');
        assert.equal(node.backgroundGradient, undefined);
        assert.equal(node.backgroundImage, undefined);
        assert.equal(node.shadowRadius, undefined);
      }
      (node.children || []).forEach(verifyClear);
    };
    verifyClear(w);
  }
});
test('captive portal is not a valid trace', async () => {
  const d = await data(fixture({ invalidTrace: true })); assert.equal(d.routes[1].trace.ok, false);
});
test('local page is available without detection calls, includes CSP, and rejects foreign hosts', async () => {
  const f = fixture(); const r = await run({ ...f.ctx, request: { method: 'GET', url: 'http://network.horatio.test/' } });
  assert.equal(r.status, 200); assert.match(r.body, /backdrop-filter:blur/); assert.match(r.headers['Content-Security-Policy'], /connect-src 'self'/);
  assert.equal(f.requests.length, 0);
  assert.equal(await run({ ...f.ctx, request: { method: 'GET', url: 'http://network.horatio.test.attacker.com/' } }), undefined);
  assert.equal((await run({ ...f.ctx, request: { method: 'POST', url: 'http://network.horatio.test/api' } })).status, 405);
  assert.equal((await run({ ...f.ctx, request: { method: 'GET', url: 'http://network.horatio.test/unknown' } })).status, 404);
});
test('HTML and HEAD do not send diagnostics, and user data is rendered with textContent', async () => {
  const f = fixture(); const r = await run({ ...f.ctx, request: { method: 'HEAD', url: 'http://network.horatio.test/api' } });
  assert.equal(r.body, ''); assert.equal(f.requests.length, 0);
  const page = (await run({ ...f.ctx, request: { method: 'GET', url: 'http://network.horatio.test/' } })).body;
  assert.ok(!page.includes('innerHTML')); assert.match(page, /textContent/);
});
