// Copyright 2026 Horatio Xu. Apache-2.0.
import { API, INIT, TIMEDTEXT, KEY, MARKER, INTERNAL, LIMIT, SUBTITLE_LIMIT, bytes, text, base64, unbase64, header, query, parseJson } from './common.mjs';
import { core, transformProto, cleanJsonAds, captions } from './player.mjs';
import { transformUmp } from './ump.mjs';
import { mergeSubtitles } from './subtitles.mjs';

export function scope(url) { return API.test(url) ? 'api' : INIT.test(url) ? 'ump' : TIMEDTEXT.test(url) ? 'subtitles' : null; }
function platform(headers) { return /music/i.test(header(headers, 'User-Agent')) ? 'music' : 'video'; }
function readKeys(io) {
  try { const value = io.storage.get(KEY); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
function activeKey(io) {
  const key = readKeys(io)[platform(io.requestHeaders)];
  if (!key || key.expires <= Date.now()) return null;
  try { const raw = unbase64(key.clientKey); return raw.length === 32 ? raw : null; } catch { return null; }
}
function saveKeys(io, raw) {
  const message = core.schemas.config.fromBinary(raw);
  const key = message.responseContext?.globalConfigGroup?.hotConfigGroup?.mediaHotConfig?.onesieHotConfig;
  if (key?.clientKey?.length !== 32 || !key.encryptKey?.length || key.encryptKey.length > 8192) return;
  const state = readKeys(io), ttl = Math.min(86400, Math.max(60, Number(key.keyExpiresInSeconds) || 3600));
  state[platform(io.requestHeaders)] = { clientKey: base64(key.clientKey), encryptKey: base64(key.encryptKey), expires: Date.now() + ttl * 1000 };
  io.storage.set(KEY, state);
}
function clearKeys(io) { const state = readKeys(io); delete state[platform(io.requestHeaders)]; io.storage.set(KEY, state); }
function stripHotHash(headers) {
  if (!header(headers, 'x-youtube-hot-hash-data')) return null;
  if (typeof headers.delete === 'function') { headers.delete('x-youtube-hot-hash-data'); return headers; }
  return Object.fromEntries(Object.entries(headers).filter(([key]) => key.toLowerCase() !== 'x-youtube-hot-hash-data'));
}
export async function run(io, cfg) {
  const kind = scope(io.url);
  if (!kind || (!cfg.ads && !cfg.translate) || header(io.requestHeaders, INTERNAL)) return null;
  const endpoint = io.url.split('?')[0].split('/').pop();
  if (io.phase === 'request') {
    if (kind === 'api' && endpoint === 'log_event' && !activeKey(io)) {
      const headers = stripHotHash(io.requestHeaders); return headers ? { headers } : null;
    }
    return null;
  }
  if (io.status !== 200 || header(io.responseHeaders, MARKER)) return null;
  const raw = bytes(io.body); if (!raw.length || raw.length > (kind === 'subtitles' ? SUBTITLE_LIMIT : LIMIT)) return null;
  if (kind === 'subtitles') {
    if (!cfg.translate || !cfg.bilingual || query(io.url, 'tlang').toLowerCase() !== cfg.lang.toLowerCase()) return null;
    // Only the original caption track is requested; account cookies and authorization are never copied.
    const originalUrl = query(io.url, 'tlang', null);
    if (!TIMEDTEXT.test(originalUrl) || originalUrl === io.url) return null;
    const translated = text(raw);
    const response = await io.fetch(originalUrl, { [INTERNAL]: '1', Accept: header(io.responseHeaders, 'Content-Type') || '*/*' });
    if (response.status !== 200 || bytes(response.body).length > SUBTITLE_LIMIT) return null;
    const merged = mergeSubtitles(translated, text(response.body));
    return merged ? { body: bytes(merged) } : null;
  }
  if (kind === 'ump') {
    const key = activeKey(io); if (!key) return null;
    try { const output = transformUmp(raw, key, cfg); return output ? { body: output } : null; }
    catch { clearKeys(io); return null; }
  }
  if (['config', 'log_event'].includes(endpoint)) {
    if (!/json/i.test(header(io.responseHeaders, 'Content-Type'))) saveKeys(io, raw);
    return null;
  }
  if (/json/i.test(header(io.responseHeaders, 'Content-Type')) || /^\s*\{/.test(text(raw.subarray(0, 40)))) {
    const json = parseJson(text(raw)), before = JSON.stringify(json); if (cfg.ads) cleanJsonAds(json); captions(json, cfg);
    const rendered = JSON.stringify(json);
    return rendered === before ? null : { body: bytes(rendered) };
  }
  const output = transformProto(endpoint, raw, cfg); return output ? { body: output } : null;
}
