import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const source = readFileSync(new URL('../Scripts/NetworkInfo.js', import.meta.url), 'utf8');
const { default: run } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const title = '<script type="application/ld+json">{"@type":"Movie","name":"Test title"}</script>{"countryCode":"US"}';
const premium = 'ytInitialData {"INNERTUBE_CONTEXT_GL":"JP"} YouTube Premium ad-free';
async function check(options = {}) {
  const calls = [];
  const ctx = { env: options.env || {}, respond: x => x, request: { method: 'GET', url: 'http://network.horatio.test/api' }, http: { get: async (url, init) => {
    calls.push({ url, init });
    if (url.includes('netflix')) {
      const id = url.split('/').at(-1); const body = options.netflix?.[id] ?? title;
      return { status: options.netflixStatus || 200, text: async () => body };
    }
    if (url.includes('youtube')) return { status: options.youtubeStatus || 200, text: async () => options.youtube ?? premium };
    throw new Error('unavailable');
  } } };
  const data = JSON.parse((await run(ctx)).body);
  return { data, calls, nf: data.streaming[0], yt: data.streaming[1] };
}
test('Netflix confirms sampled licensed titles, and YouTube confirms Premium region', async () => {
  const { nf, yt } = await check();
  assert.equal(nf.state, 'ok'); assert.match(nf.detail, /抽样/); assert.equal(nf.region, 'US');
  assert.equal(yt.state, 'ok'); assert.equal(yt.region, 'JP');
});
test('Netflix partial requires both licensed failures and an available original', async () => {
  const restricted = { '81280792': 'Oh no!', '70143836': 'This title is not available' };
  assert.equal((await check({ netflix: restricted })).nf.state, 'partial');
  assert.equal((await check({ netflix: { ...restricted, '80057281': '<html>Sign in</html>' } })).nf.state, 'unknown');
});
test('HTTP 200 sign-in, empty and challenge pages never prove Netflix unlock', async () => {
  for (const body of ['', '<html>Netflix sign in</html>', '<html>Verify you are human</html>']) {
    const { nf } = await check({ netflix: { '81280792': body, '70143836': body, '80057281': body } });
    assert.equal(nf.state, 'unknown');
  }
});
test('Premium restrictions, missing region, and generic ad-free text remain distinct', async () => {
  assert.equal((await check({ youtube: 'ytInitialData {"INNERTUBE_CONTEXT_GL":"CN"} Premium is not available in your country' })).yt.state, 'blocked');
  for (const youtube of ['<html>ad-free</html>', 'ytInitialData YouTube Premium ad-free', 'ytInitialData {"INNERTUBE_CONTEXT_GL":"US"} ordinary page']) {
    assert.equal((await check({ youtube })).yt.state, 'unknown');
  }
});
test('HTTP 429 and 403 cannot be mistaken for streaming availability', async () => {
  for (const [status, state] of [[429, 'limited'], [403, 'blocked']]) {
    const { nf, yt } = await check({ netflixStatus: status, youtubeStatus: status });
    assert.equal(nf.state, state); assert.equal(yt.state, state);
  }
});
test('streaming follows independent policies and never borrows PROBE_POLICY', async () => {
  const defaultRun = await check({ env: { PROBE_POLICY: 'bwg' } });
  assert.ok(defaultRun.calls.filter(x => /netflix|youtube/.test(x.url)).every(x => !Object.hasOwn(x.init, 'policy')));
  const chosen = await check({ env: { PROBE_POLICY: 'bwg', NETFLIX_POLICY: 'Netflix', YOUTUBE_POLICY: 'Google' } });
  assert.ok(chosen.calls.filter(x => /netflix/.test(x.url)).every(x => x.init.policy === 'Netflix'));
  assert.ok(chosen.calls.filter(x => /youtube/.test(x.url)).every(x => x.init.policy === 'Google'));
  assert.ok(chosen.calls.every(x => x.init.credentials === 'omit' && !x.init.headers.Cookie));
});
