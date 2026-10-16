// Copyright 2026 Horatio Xu. Apache-2.0. Native Egern entrypoint.
import { run, scope } from './engine.mjs';
import { options, header, INTERNAL, MARKER, cleanHeaders, bytes } from './common.mjs';
export default async function(ctx) {
  if (!ctx.request || !scope(ctx.request.url) || header(ctx.request.headers, INTERNAL)) return;
  const cfg = options(ctx.env);
  if (!cfg.ads && !cfg.translate) return;
  if (ctx.response && (ctx.response.status !== 200 || header(ctx.response.headers, MARKER))) return;
  let raw;
  try {
    const obj = ctx.response || ctx.request;
    if (ctx.response) raw = new Uint8Array(await obj.arrayBuffer());
    const result = await run({
      url: ctx.request.url, requestHeaders: ctx.request.headers, responseHeaders: ctx.response?.headers,
      phase: ctx.response ? 'response' : 'request', status: ctx.response?.status, body: raw,
      storage: { get: key => ctx.storage.getJSON(key), set: (key, value) => ctx.storage.setJSON(key, value) },
      fetch: async (url, headers) => {
        const response = await ctx.http.get(url, { headers, timeout: 5000, redirect: 'error', credentials: 'omit', insecureTls: false });
        return { status: response.status, body: new Uint8Array(await response.arrayBuffer()) };
      }
    }, cfg);
    if (result?.body) return { body: result.body, headers: cleanHeaders(ctx.response.headers) };
    if (result?.headers) return { headers: result.headers, ...(raw ? { body: raw } : {}) };
  } catch { /* Keep playback intact on unknown protocols, failed translation or unavailable storage. */ }
  // Egern bodies are streams: explicitly return consumed bytes on every pass-through path.
  if (raw) return { body: bytes(raw) };
}
