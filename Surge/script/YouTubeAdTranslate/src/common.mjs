// Copyright 2026 Horatio Xu. Apache-2.0.
export const VERSION = '0.1.0';
export const LIMIT = 8 * 1024 * 1024;
export const SUBTITLE_LIMIT = 1024 * 1024;
export const API_PATTERN = '^https://(?:youtubei(?:-att)?\\.googleapis\\.com|(?:www|m)\\.youtube\\.com)/youtubei/v1/(?:browse|next|player|search|reel/reel_watch_sequence|get_watch|log_event|config)(?:\\?.*)?$';
export const INIT_PATTERN = '^https://[a-zA-Z0-9-]+\\.googlevideo\\.com/initplayback(?:\\?.*)?$';
export const TEXT_PATTERN = '^https://(?:www|m)\\.youtube\\.com/api/timedtext(?:\\?.*)?$';
export const API = new RegExp(API_PATTERN), INIT = new RegExp(INIT_PATTERN), TIMEDTEXT = new RegExp(TEXT_PATTERN);
export const KEY = 'Horatio.YouTubeEnhance.Keys.v1';
export const MARKER = 'X-Horatio-YouTube';
export const INTERNAL = 'X-Horatio-YouTube-Internal';

export function header(headers, name) {
  if (typeof headers?.get === 'function') return String(headers.get(name) ?? '');
  const key = Object.keys(headers || {}).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key]) : '';
}
export function cleanHeaders(headers) {
  const drop = ['content-length', 'content-encoding', 'etag', 'content-md5', 'digest', 'last-modified', 'cache-control'];
  if (typeof headers?.delete === 'function') {
    for (const key of drop) headers.delete(key);
    headers.set(MARKER, VERSION); headers.set('Cache-Control', 'no-store');
    return headers;
  }
  const out = Object.fromEntries(Object.entries(headers || {}).filter(([k]) => !drop.includes(k.toLowerCase())));
  out[MARKER] = VERSION; out['Cache-Control'] = 'no-store';
  return out;
}
export function bytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  throw new Error('missing body');
}
export const text = value => new TextDecoder().decode(bytes(value));
export function parseJson(source) {
  // Bypass rather than round numeric IDs or timestamps outside IEEE-754 precision.
  const tokens = source.match(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || [];
  if (tokens.some(t => t[0] !== '"' && Number.isInteger(Number(t)) && !Number.isSafeInteger(Number(t)))) throw new Error('unsafe JSON integer');
  return JSON.parse(source);
}
export function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total); let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}
export function equal(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64(data) {
  let out = '';
  for (let i = 0; i < data.length; i += 3) {
    const n = data[i] * 65536 + (data[i + 1] || 0) * 256 + (data[i + 2] || 0);
    out += B64[n >>> 18] + B64[(n >>> 12) & 63] + (i + 1 < data.length ? B64[(n >>> 6) & 63] : '=') + (i + 2 < data.length ? B64[n & 63] : '=');
  }
  return out;
}
export function unbase64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4) throw new Error('invalid key');
  const out = new Uint8Array(value.length * 3 / 4 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0));
  let at = 0;
  for (let i = 0; i < value.length; i += 4) {
    const n = (B64.indexOf(value[i]) << 18) | (B64.indexOf(value[i + 1]) << 12) | (Math.max(0, B64.indexOf(value[i + 2])) << 6) | Math.max(0, B64.indexOf(value[i + 3]));
    if (at < out.length) out[at++] = n >>> 16;
    if (at < out.length) out[at++] = n >>> 8;
    if (at < out.length) out[at++] = n;
  }
  return out;
}
function decode(s) { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; } }
// Preserve the spelling, order and encoding of every unrelated signed query item.
export function query(url, key, value = undefined) {
  const at = url.indexOf('?'); const prefix = at < 0 ? url : url.slice(0, at);
  const parts = at < 0 ? [] : url.slice(at + 1).split('&').filter(Boolean);
  if (value === undefined) {
    const item = parts.find(p => decode(p.split('=')[0]) === key);
    return item ? decode(item.slice(item.indexOf('=') + 1)) : '';
  }
  const kept = parts.filter(p => decode(p.split('=')[0]) !== key);
  if (value !== null) kept.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
  return prefix + (kept.length ? '?' + kept.join('&') : '');
}
export function options(input = {}) {
  if (typeof input === 'string') {
    try { input = input.trim().startsWith('{') ? JSON.parse(input) : Object.fromEntries(input.split('&').map(x => x.split('=').map(decode))); }
    catch { input = {}; }
  }
  const yes = (k, fallback = true) => input[k] == null ? fallback : /^(true|1)$/i.test(String(input[k]));
  let lang = String(input.TARGET_LANGUAGE || 'zh-Hans');
  lang = ({ 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', 'zh-cn': 'zh-Hans', 'zh-tw': 'zh-Hant' })[lang] || lang;
  if (!/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(lang)) lang = 'zh-Hans';
  return { ads: yes('ADBLOCK_ENABLED'), translate: yes('TRANSLATION_ENABLED'), bilingual: yes('BILINGUAL'), autoCC: yes('AUTO_CC'), lang };
}
