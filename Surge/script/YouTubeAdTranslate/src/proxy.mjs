// Copyright 2026 Horatio Xu. Apache-2.0. Surge, Loon, Shadowrocket, Quantumult X.
import { run } from './engine.mjs';
import { options, cleanHeaders, bytes } from './common.mjs';
const qx = typeof $task !== 'undefined';
const req = typeof $request === 'undefined' ? {} : $request;
const res = typeof $response === 'undefined' ? null : $response;
function storage() {
  return {
    get(key) { const value = qx ? $prefs.valueForKey(key) : $persistentStore.read(key); try { return value ? JSON.parse(value) : null; } catch { return null; } },
    set(key, value) { const data = JSON.stringify(value); if (qx) $prefs.setValueForKey(data, key); else $persistentStore.write(data, key); }
  };
}
async function fetchCaption(url, headers) {
  if (qx) {
    let timer;
    const response = await Promise.race([
      $task.fetch({ url, method: 'GET', headers, opts: { redirection: false, hints: false, 'auto-cookie': false } }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('caption timeout')), 5000); })
    ]).finally(() => clearTimeout(timer));
    return { status: response.statusCode, body: response.bodyBytes || response.body };
  }
  return await new Promise((resolve, reject) => {
    $httpClient.get({ url, headers, timeout: 5, 'binary-mode': true, 'auto-cookie': false, 'auto-redirect': false }, (error, response, body) => {
      if (error || !response) reject(new Error('caption request failed'));
      else resolve({ status: response.status || response.statusCode, body });
    });
  });
}
// One completion, including asynchronous failures. No notifications, playback redirects or logs.
(async () => {
  const cfg = options(qx && typeof $environment !== 'undefined' ? $environment.variables || {} : typeof $argument === 'undefined' ? {} : $argument);
  const result = await run({
    url: req.url || '', phase: res ? 'response' : 'request', status: res?.statusCode || res?.status,
    requestHeaders: req.headers || {}, responseHeaders: res?.headers || {},
    body: (res || req).bodyBytes || (res || req).body,
    storage: storage(), fetch: fetchCaption
  }, cfg);
  if (!result) return {};
  if (result.body) {
    const body = bytes(result.body), headers = cleanHeaders(res.headers);
    return qx ? { bodyBytes: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength), headers } : { body, headers };
  }
  return result;
})().then(result => $done(result)).catch(() => $done({}));
