import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = readFileSync(new URL('../Clash/script/VergeRev.js', import.meta.url), 'utf8');
const main = vm.runInNewContext(source + '\nmain;');
const profile = () => ({
  'proxy-groups': [{ name: 'Proxy', type: 'select', proxies: ['edge'] }],
  proxies: [{ name: 'edge', type: 'socks5', server: '127.0.0.1', port: 12345 }],
  rules: ['DOMAIN,local.example,DIRECT', 'MATCH,Proxy'],
  dns: { ipv6: true },
  tun: { enable: false },
});
const plain = value => JSON.parse(JSON.stringify(value));

test('27 categories retain native provider URLs and existing profile settings', () => {
  const input = profile();
  const saved = structuredClone(input);
  const output = main(input);
  assert.equal(Object.keys(output['rule-providers']).length, 27);
  for (const [key, provider] of Object.entries(output['rule-providers'])) {
    assert.equal(provider.behavior, 'classical');
    assert.equal(provider.format, 'yaml');
    assert.equal(provider.url, 'https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/rule/' + key.slice(8) + '.yaml');
  }
  assert.deepEqual(plain(output.proxies), saved.proxies);
  assert.deepEqual(plain(output['proxy-groups']), saved['proxy-groups']);
  assert.deepEqual(output.dns, saved.dns);
  assert.deepEqual(output.tun, saved.tun);
  assert.deepEqual(plain(output.rules.slice(-2)), saved.rules);
});

test('SiriAI overrides AI, AI overrides general services, P2P precedes control', () => {
  const output = main(profile());
  const at = group => output.rules.findIndex(rule => rule.startsWith('RULE-SET,Horatio-' + group + ','));
  assert.ok(at('SiriAI') < at('AI'));
  for (const group of ['Apple', 'Google', 'Microsoft', 'Meta', 'GitHub']) assert.ok(at('AI') < at(group));
  assert.ok(at('ParsecP2P') < at('Parsec'));
  assert.ok(at('NTP') < at('Apple'));
  assert.ok(at('StarDesk') < at('Google'));
});

test('repeated application does not grow rules or alter policies', () => {
  const first = plain(main(profile()));
  const second = plain(main(structuredClone(first)));
  assert.deepEqual(second, first);
});

test('dedicated service hosts beat general cloud and vendor rule sets', () => {
  const output = main(profile());
  function firstDomainGroup(host) {
    for (const rule of output.rules) {
      const key = rule.split(',')[1];
      if (!key?.startsWith('Horatio-')) continue;
      const group = key.slice(8);
      const text = readFileSync(new URL('../Clash/rule/' + group + '.yaml', import.meta.url), 'utf8');
      const domains = [...text.matchAll(/^  - (['"])(DOMAIN(?:-SUFFIX|-KEYWORD)?),([^'"]+)\1$/gm)];
      if (domains.some(([, , kind, value]) => kind === 'DOMAIN' ? host === value
        : kind === 'DOMAIN-KEYWORD' ? host.includes(value)
        : host === value || host.endsWith('.' + value))) return group;
    }
    return null;
  }
  assert.equal(firstDomainGroup('productionresultssa0.blob.core.windows.net'), 'GitHub');
  assert.equal(firstDomainGroup('spotify.app.link'), 'Spotify');
  assert.equal(firstDomainGroup('aistudio.google.com'), 'AI');
  assert.equal(firstDomainGroup('apple-relay.apple.com'), 'SiriAI');
  assert.equal(firstDomainGroup('stun.parsec.app'), 'ParsecP2P');
  assert.equal(firstDomainGroup('api.stardesk.net'), 'StarDesk');
  assert.equal(firstDomainGroup('notstardesk.net'), null);
  assert.equal(firstDomainGroup('www.youtube.com'), 'Google');
  assert.equal(firstDomainGroup('appleworldwidedeveloper.sc.omtrdc.net'), 'Apple');
  assert.equal(firstDomainGroup('disney.demdex.net'), 'Disney');
});

test('all reviewed domain intersections select their documented service policy', () => {
  const catalog = JSON.parse(readFileSync(new URL('../tools/reviewed-domain-overlaps.json', import.meta.url), 'utf8'));
  const domains = new Map();
  for (const rule of main(profile()).rules) {
    const key = rule.split(',')[1];
    if (!key?.startsWith('Horatio-')) continue;
    const group = key.slice(8);
    const text = readFileSync(new URL('../Clash/rule/' + group + '.yaml', import.meta.url), 'utf8');
    domains.set(group, [...text.matchAll(/^  - (['"])(DOMAIN(?:-SUFFIX)?),([^'"]+)\1$/gm)]
      .map(([, , kind, value]) => ({ kind, value })));
  }
  for (const entry of catalog.intersections) {
    for (const host of entry.hosts) {
      let actual = null;
      for (const [group, rules] of domains) {
        if (rules.some(r => host === r.value || r.kind === 'DOMAIN-SUFFIX' && host.endsWith('.' + r.value))) {
          actual = group;
          break;
        }
      }
      assert.equal(actual, entry.expected_group, host);
    }
  }
});

test('preexisting provider options and per-service policies survive', () => {
  const input = profile();
  const provider = { type: 'http', behavior: 'classical', format: 'yaml',
    url: 'https://rules.example.net/meta.yaml', path: './custom/meta.yaml', interval: 43200, proxy: 'edge' };
  input['rule-providers'] = { 'Horatio-Meta': provider, 'PrivateProvider': { type: 'file', path: './private.yaml' } };
  input.rules.unshift('RULE-SET,Horatio-Meta,edge,no-resolve');
  const output = main(input);
  assert.deepEqual(plain(output['rule-providers']['Horatio-Meta']), provider);
  assert.ok(output.rules.includes('RULE-SET,Horatio-Meta,edge,no-resolve'));
  assert.ok(!output.rules.includes('RULE-SET,Horatio-Meta,Proxy'));
  assert.deepEqual(output['rule-providers'].PrivateProvider, { type: 'file', path: './private.yaml' });
});

test('unmanaged Horatio-prefixed rules and duplicate custom variants are retained', () => {
  const input = profile();
  input.rules.unshift('RULE-SET,Horatio-Custom,edge',
    'RULE-SET,Horatio-Meta,edge,no-resolve', 'RULE-SET,Horatio-Meta,Proxy');
  const first = plain(main(input));
  for (const rule of ['RULE-SET,Horatio-Custom,edge', 'RULE-SET,Horatio-Meta,edge,no-resolve', 'RULE-SET,Horatio-Meta,Proxy']) {
    assert.ok(first.rules.includes(rule));
  }
  assert.deepEqual(plain(main(structuredClone(first))), first);
});

test('TAG preferences and DIRECT classifications still work', () => {
  const input = profile();
  input['proxy-groups'].push({ name: 'TAG', type: 'select', proxies: ['edge'] });
  const output = main(input);
  assert.ok(output.rules.includes('RULE-SET,Horatio-Meta,TAG'));
  assert.ok(output.rules.includes('RULE-SET,Horatio-Parsec,TAG'));
  for (const group of ['LAN', 'ParsecP2P', 'StarDesk', 'NTP', 'Bilibili', 'Meituan', 'WeChat', 'Xiaohongshu']) {
    assert.ok(output.rules.includes('RULE-SET,Horatio-' + group + ',DIRECT'));
  }
});

test('profile without a usable policy fails before adding providers', () => {
  const input = { rules: ['MATCH,DIRECT'] };
  assert.throws(() => main(input), /no proxy groups or nodes/);
  assert.deepEqual(input, { rules: ['MATCH,DIRECT'] });
});
