/* VerseLyrics Loon lightweight entry 0.4.8. */
(() => {
"use strict";
/* VerseLyrics 0.4.8 — original core, 2026-10-16.
 * Rewrites Spotify color-lyrics JSON and protobuf; no third-party script runtime.
 * Public protocol field numbers and service endpoints are documented in README.md.
 * Egern API: export default async function(ctx), ctx.http, ctx.storage.
 */
const VERSION = "0.4.8";
const KEY = "VerseLyrics.v1.cache";
const STATUS = "VerseLyrics.v1.status";
const EVENTS = "VerseLyrics.v1.events";
const LIMIT = 512 * 1024;
const BODY_LIMIT = 256 * 1024;
const SERVICE_LIMIT = 96 * 1024;
const PLAYER_LIMIT = 128 * 1024;
const CACHE_LIMIT = 64000;
const CACHE_COUNT = 128;
const MAX_LINES = 600;
const INTERNAL = "x-verselyrics-internal";
const MARKER = "x-verselyrics";
// Public wire identifier for Spotify's lyrics section, not a donor track.
const LYRICS_SECTION = "spotify:section:0JQ5DB6s3cssW5Bo6cGq21";
const HOST = "(?:spclient\\.wg|[a-z0-9-]+-spclient)\\.spotify\\.com";
const LYRIC_URL = new RegExp("^https://(" + HOST + ")(?::443)?/color-lyrics/v2/track/([0-9A-Za-z]{22})(?:/image/[^?#\\s]+)?/?(?:\\?.*)?$");
const META_URL = new RegExp("^https://(" + HOST + ")(?::443)?/metadata/4/track/([0-9a-f]{32})(?:\\?.*)?$");
const EXTENDED_URL = new RegExp("^https://(" + HOST + ")(?::443)?/extended-metadata/v0/extended-metadata/?(?:\\?.*)?$");
const SCROLL_URL = new RegExp("^https://(" + HOST + ")(?::443)?/scrollsita/v1/scroll/spotify(?::|%3[aA])track(?::|%3[aA])([0-9A-Za-z]{22})/?(?:\\?.*)?$");
const LANGUAGES = ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "ar", "hi", "id", "vi", "th", "tr", "nl", "pl", "sv", "uk", "he", "fa", "ms", "el"];
const SOURCES = { lrclib: "LRCLIB", qq: "QQ 音乐", netease: "网易云音乐", kugou: "酷狗音乐", kuwo: "酷我音乐", lyricsovh: "lyrics.ovh" };
const SOURCE_REVISION = 3;
const SOURCE_REQUEST_LIMIT = 12;
const SOURCE_BYTE_LIMIT = 256 * 1024;
const NEW_SOURCE_LIMIT = 96 * 1024;
const B62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const goodObject = x => x !== null && typeof x === "object" && !Array.isArray(x);
const str = x => typeof x === "string" ? x : "";
const truth = x => x === true || x === "true";
const clean = x => str(x).replace(/\u0000/g, "").trim();
const normal = x => clean(x).normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
function header(h, name) {
  if (typeof h?.get === "function") return h.get(name) || "";
  const k = Object.keys(h || {}).find(k => k.toLowerCase() === name.toLowerCase());
  return k ? str(h[k]) : "";
}
function utf8(text, maxBytes = LIMIT) {
  // Two bounded passes, with no percent-encoded string or boxed byte array.
  let size = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = text.charCodeAt(++i); if (!(d >= 0xdc00 && d <= 0xdfff)) throw new URIError("invalid-utf16"); size += 4;
    } else if (c >= 0xdc00 && c <= 0xdfff) throw new URIError("invalid-utf16");
    else size += c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
    if (size > maxBytes) { const error = new Error("body-limit"); error.bodyBytes = size; throw error; }
  }
  const out = new Uint8Array(size); let at = 0;
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) c = 0x10000 + ((c - 0xd800) << 10) + text.charCodeAt(++i) - 0xdc00;
    if (c < 0x80) out[at++] = c;
    else if (c < 0x800) { out[at++] = 0xc0 | c >> 6; out[at++] = 0x80 | c & 63; }
    else if (c < 0x10000) { out[at++] = 0xe0 | c >> 12; out[at++] = 0x80 | c >> 6 & 63; out[at++] = 0x80 | c & 63; }
    else { out[at++] = 0xf0 | c >> 18; out[at++] = 0x80 | c >> 12 & 63; out[at++] = 0x80 | c >> 6 & 63; out[at++] = 0x80 | c & 63; }
  }
  return out;
}
function text(bytes) {
  // Works without TextDecoder in mobile proxy engines. Scratch storage never
  // exceeds 4097 UTF-16 units, even for a multi-megabyte response.
  const chunks = [], units = [];
  for (let i = 0; i < bytes.length;) {
    const first = bytes[i++]; let cp, count, minimum;
    if (first < 0x80) { cp = first; count = 0; minimum = 0; }
    else if (first >= 0xc2 && first <= 0xdf) { cp = first & 31; count = 1; minimum = 0x80; }
    else if (first >= 0xe0 && first <= 0xef) { cp = first & 15; count = 2; minimum = 0x800; }
    else if (first >= 0xf0 && first <= 0xf4) { cp = first & 7; count = 3; minimum = 0x10000; }
    else throw new URIError("invalid-utf8");
    for (let j = 0; j < count; j++) { const b = bytes[i++]; if (!(b >= 0x80 && b <= 0xbf)) throw new URIError("invalid-utf8"); cp = cp * 64 + (b & 63); }
    if (cp < minimum || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) throw new URIError("invalid-utf8");
    if (cp < 0x10000) units.push(cp); else { cp -= 0x10000; units.push(0xd800 | cp >> 10, 0xdc00 | cp & 1023); }
    if (units.length >= 4096) { chunks.push(String.fromCharCode.apply(null, units)); units.length = 0; }
  }
  if (units.length) chunks.push(String.fromCharCode.apply(null, units));
  return chunks.join("");
}
function join(parts) {
  const size = parts.reduce((n, p) => n + p.length, 0);
  if (size > LIMIT) throw new Error("body-limit");
  const out = new Uint8Array(size); let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
function uint(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("integer");
  const a = [];
  do { const b = n % 128; n = Math.floor(n / 128); a.push(b + (n ? 128 : 0)); } while (n);
  return Uint8Array.from(a);
}
function signedInt(n) {
  if (n >= 0) return uint(n);
  let low = n >>> 0; const a = [];
  for (let i = 0; i < 4; i++) { a.push((low % 128) | 128); low = Math.floor(low / 128); }
  a.push(low | 240, 255, 255, 255, 255, 1);
  return Uint8Array.from(a);
}
function vint(bytes, at) {
  let n = 0, factor = 1, safe = true;
  for (let i = 0; i < 10; i++) {
    if (at >= bytes.length) throw new Error("truncated-varint");
    const b = bytes[at++];
    if (i === 9 && b > 1) throw new Error("overflow-varint");
    n += (b & 127) * factor;
    safe = safe && Number.isSafeInteger(n);
    if (!(b & 128)) return { at, n: safe ? n : null };
    factor *= 128;
  }
  throw new Error("long-varint");
}
// Untouched fields retain their original wire bytes, including unknown fields.
function fields(bytes) {
  const out = []; let at = 0;
  while (at < bytes.length) {
    if (out.length >= 4096) throw new Error("field-limit");
    const start = at, tag = vint(bytes, at); at = tag.at;
    if (!tag.n || tag.n > 0xffffffff) throw new Error("bad-tag");
    const number = Math.floor(tag.n / 8), wire = tag.n % 8;
    if (number < 1) throw new Error("bad-field-number");
    let payload, value;
    if (wire === 0) { const v = vint(bytes, at); value = v.n; at = v.at; }
    else if (wire === 1 || wire === 5) { at += wire === 1 ? 8 : 4; }
    else if (wire === 2) {
      const len = vint(bytes, at); at = len.at;
      if (len.n === null || len.n > LIMIT) throw new Error("bad-length");
      payload = bytes.subarray(at, at + len.n); at += len.n;
    } else throw new Error("unsupported-wire");
    if (at > bytes.length) throw new Error("truncated-field");
    out.push({ number, wire, payload, value, raw: bytes.subarray(start, at) });
  }
  return out;
}
function dataField(number, payload) { return join([uint(number * 8 + 2), uint(payload.length), payload]); }
function stringField(number, value) { return dataField(number, utf8(value)); }
function numberField(number, value) { return join([uint(number * 8), signedInt(value)]); }
function last(fs, n, wire) { for (let i = fs.length - 1; i >= 0; i--) if (fs[i].number === n && fs[i].wire === wire) return fs[i]; }
function word(fs, n) { const f = last(fs, n, 2); return f ? text(f.payload) : ""; }
function replaceField(fs, number, replacement) {
  let inserted = false; const parts = [];
  for (const f of fs) {
    if (f.number === number) { if (!inserted && replacement) parts.push(replacement); inserted = true; }
    else parts.push(f.raw);
  }
  if (!inserted && replacement) parts.push(replacement);
  return join(parts);
}
function base62Hex(id) {
  if (!/^[0-9A-Za-z]{22}$/.test(id)) throw new Error("track-id");
  const a = new Array(16).fill(0);
  for (const c of id) {
    let carry = B62.indexOf(c);
    for (let i = 15; i >= 0; i--) { const n = a[i] * 62 + carry; a[i] = n % 256; carry = Math.floor(n / 256); }
    if (carry) throw new Error("track-overflow");
  }
  return a.map(n => n.toString(16).padStart(2, "0")).join("");
}
function hexBase62(hex) {
  if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error("track-hex");
  const a = hex.match(/../g).map(x => parseInt(x, 16)); let out = "";
  while (a.some(Boolean)) {
    let carry = 0;
    for (let i = 0; i < a.length; i++) { const n = carry * 256 + a[i]; a[i] = Math.floor(n / 62); carry = n % 62; }
    out = B62[carry] + out;
  }
  return out.padStart(22, "0");
}
function parseMetadata(bytes, hex) {
  const fs = fields(bytes), gid = last(fs, 1, 2);
  if (!gid || Array.from(gid.payload, b => b.toString(16).padStart(2, "0")).join("") !== hex) throw new Error("metadata-id");
  const album = last(fs, 3, 2), rawDuration = last(fs, 7, 0)?.value;
  const meta = { id: hexBase62(hex), title: word(fs, 2), album: album ? word(fields(album.payload), 2) : "",
    artists: fs.filter(f => f.number === 4 && f.wire === 2).map(f => word(fields(f.payload), 2)),
    duration: Number.isSafeInteger(rawDuration) ? (rawDuration % 2 ? -(rawDuration + 1) / 2 : rawDuration / 2) / 1000 : 0 };
  if (!clean(meta.title) || !clean(meta.album) || !meta.artists.length || meta.artists.some(a => !clean(a)) || meta.duration <= 0 || meta.duration > 86400) throw new Error("metadata-incomplete");
  const flag = last(fs, 18, 0);
  if (fs.some(f => f.number === 18 && f.wire !== 0) || (flag && ![0, 1].includes(flag.value))) throw new Error("metadata-lyrics-flag");
  // spotify.metadata.Track is proto2: an omitted optional bool is false.
  // Native no-lyrics tracks can omit this field entirely instead of sending 0.
  return { meta, fs, hasLyrics: flag?.value === 1, hasLyricsField: Boolean(flag) };
}
// Only the documented TRACK_V4 Any payload is parsed. Other extensions remain
// opaque, including audio/playability/account data and all unknown wire fields.
function extendedTracks(bytes) {
  const root = fields(bytes), records = [];
  for (const group of root.filter(f => f.number === 2 && f.wire === 2)) {
    const groupFields = fields(group.payload);
    if (last(groupFields, 2, 0)?.value !== 10) continue;
    const groupHeader = last(groupFields, 1, 2);
    if (groupHeader && ![0, 200].includes(last(fields(groupHeader.payload), 1, 0)?.value ?? 0)) continue;
    for (const entity of groupFields.filter(f => f.number === 3 && f.wire === 2)) {
      const entityFields = fields(entity.payload), uri = word(entityFields, 2);
      const id = /^spotify:track:([0-9A-Za-z]{22})$/.exec(uri)?.[1];
      const entityHeader = last(entityFields, 1, 2);
      if (!id || (entityHeader && ![0, 200].includes(last(fields(entityHeader.payload), 1, 0)?.value ?? 0))) continue;
      const any = last(entityFields, 3, 2); if (!any) continue;
      const anyFields = fields(any.payload), type = word(anyFields, 1), payload = last(anyFields, 2, 2);
      if (!/(?:^|\/)spotify\.metadata\.Track$/.test(type) || !payload) continue;
      // A corrupt individual track cannot prevent other tracks being cached.
      try {
        const parsed = parseMetadata(payload.payload, base62Hex(id));
        records.push({ ...parsed, group, groupFields, entity, entityFields, anyFields });
        if (records.length > 100) throw new Error("extended-track-limit");
      } catch (e) { if (e.message === "extended-track-limit") throw e; }
    }
  }
  return { records,
    writeFlags(selected) {
      const entities = new Map(), groups = new Map();
      for (const record of selected) {
        const track = replaceField(record.fs, 18, numberField(18, 1));
        const any = replaceField(record.anyFields, 2, dataField(2, track));
        let value = replaceField(record.entityFields, 3, dataField(3, any));
        const header = last(record.entityFields, 1, 2);
        if (header) {
          let h = replaceField(fields(header.payload), 2, null); // Discard the old entity ETag.
          h = replaceField(fields(h), 4, numberField(4, 300));
          h = replaceField(fields(h), 5, numberField(5, 0));
          value = replaceField(fields(value), 1, dataField(1, h));
        }
        entities.set(record.entity, dataField(3, value)); groups.set(record.group, record.groupFields);
      }
      const replacements = new Map();
      for (const [group, fs] of groups) {
        let value = join(fs.map(f => entities.get(f) || f.raw));
        const header = last(fs, 1, 2);
        if (header) {
          let h = replaceField(fields(header.payload), 2, numberField(2, 300));
          h = replaceField(fields(h), 3, numberField(3, 0));
          value = replaceField(fields(value), 1, dataField(1, h));
        }
        replacements.set(group, dataField(2, value));
      }
      return join(root.map(f => replacements.get(f) || f.raw));
    }
  };
}
function scrollDocument(bytes, contentType, id) {
  const uri = "spotify:track:" + id;
  if (/json/i.test(contentType) || bytes[0] === 123) {
    const obj = JSON.parse(text(bytes)), sections = obj?.structure?.sections;
    if (!Array.isArray(sections) || sections.length > 100 || sections.some(s => !goodObject(s))) throw new Error("scroll-shape");
    return { format: "json", hasLyrics: sections.some(s => Object.hasOwn(s, "lyrics")),
      add() {
        sections.unshift({ lyrics: { entityUri: uri }, sectionInfo: { sectionId: LYRICS_SECTION } });
        return utf8(JSON.stringify(obj));
      } };
  }
  if (!/protobuf|octet-stream/i.test(contentType)) throw new Error("scroll-format");
  const root = fields(bytes), structures = root.filter(f => f.number === 1);
  if (structures.length !== 1 || structures[0].wire !== 2) throw new Error("scroll-structure");
  const inner = fields(structures[0].payload), sections = inner.filter(f => f.number === 1);
  if (sections.length > 100 || sections.some(f => f.wire !== 2)) throw new Error("scroll-sections");
  const parsed = sections.map(f => fields(f.payload));
  // NpvScrollResponse.structure(1) -> NpvScrollStructure.sections(1)
  // -> Section.lyrics(5) -> Lyrics.entity_uri(1).
  // Each native section also carries Section.section_info(23).section_id(1).
  return { format: "protobuf", hasLyrics: parsed.some(fs => fs.some(f => f.number === 5)),
    add() {
      const card = dataField(1, join([
        dataField(5, stringField(1, uri)), dataField(23, stringField(1, LYRICS_SECTION))
      ]));
      return replaceField(root, 1, dataField(1, join([card, ...inner.map(f => f.raw)])));
    } };
}
function settings(env = {}) {
  const provider = str(env.FALLBACK_PROVIDER) || "auto";
  const language = str(env.TARGET_LANGUAGE) || "zh-CN";
  if (!LANGUAGES.includes(language) || !["auto", "off", ...Object.keys(SOURCES)].includes(provider)) throw new Error("settings-invalid");
  return { translate: env.TRANSLATION_ENABLED == null || env.TRANSLATION_ENABLED === "" ? true : truth(env.TRANSLATION_ENABLED), language, provider, discover: env.DISCOVER_MISSING == null || env.DISCOVER_MISSING === "" ? true : truth(env.DISCOVER_MISSING) };
}
function loadCache(ctx, scope) {
  let loaded = false, entries = [], cooldowns = {}, initialCooldowns = "{}", compact = false;
  const pending = new Map(), costs = new WeakMap(); let total = 64;
  // Keep other songs out of the live heap while a native HTTP call is pending.
  // Saving still merges against the complete bounded store, never this view alone.
  function relevant(e) {
    if (!scope) return true;
    const key = str(e?.key);
    if (scope.metadata) return key.startsWith("meta:") || key.startsWith("availability:");
    return key.endsWith(":" + scope.track) || key.startsWith("source-order:v1:") || key.startsWith("translation:" + scope.language + ":");
  }
  function overhead() { return JSON.stringify({entries:[],cooldowns}).length; }
  function mergeCooldowns(value) {
    if (!goodObject(value)) return;
    for (const host of Object.keys(value)) {
      if (host.length > 253 || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)) continue;
      const until = value[host];
      if (!Number.isFinite(until) || until <= Date.now()) continue;
      if (!Object.hasOwn(cooldowns, host) && Object.keys(cooldowns).length >= 16) continue;
      cooldowns[host] = Math.max(cooldowns[host] || 0, Math.min(until, Date.now() + 86400000));
    }
  }
  function cost(e) { if (!costs.has(e)) costs.set(e, JSON.stringify(e).length + 1); return costs.get(e); }
  function read() {
    let value;
    try {
      if (typeof ctx.storage.get === "function") { const raw = ctx.storage.get(KEY); if (typeof raw === "string" && raw.length <= 128000) value = JSON.parse(raw); }
      else value = ctx.storage.getJSON(KEY);
    } catch { }
    return goodObject(value) ? value : {};
  }
  function combineTranslations(a,b) {
    if (!a || !b.key.startsWith("translations:v1:") || !Array.isArray(a.value?.pairs) || !Array.isArray(b.value?.pairs)) return null;
    const newest = a.expires > b.expires ? a : b, older = newest === a ? b : a;
    const pairs = [], seen = new Set(); let size = JSON.stringify({...newest,value:{pairs:[]}}).length;
    for (const record of [newest,older]) for (const pair of record.value.pairs.slice(0,MAX_LINES)) {
      if (!Array.isArray(pair) || pair.length !== 2 || pair.some(s => typeof s !== "string") || seen.has(pair[0])) continue;
      const length = JSON.stringify(pair).length + 1;
      if (pairs.length >= MAX_LINES || size + length > CACHE_LIMIT / 2) continue;
      size += length; pairs.push(pair); seen.add(pair[0]);
    }
    return {...newest,value:{pairs}};
  }
  function bounded(input) {
    const kept = [], seen = new Set(); let size = overhead();
    for (let i = input.length - 1; i >= 0 && kept.length < CACHE_COUNT; i--) {
      const e = input[i];
      if (!goodObject(e) || typeof e.key !== "string" || !Number.isFinite(e.expires) || e.expires <= Date.now() || seen.has(e.key)) continue;
      let length; try { length = cost(e); } catch { continue; }
      if (length > CACHE_LIMIT / 2 || size + length > CACHE_LIMIT) continue;
      size += length; seen.add(e.key); kept.push(e);
    }
    return kept.reverse();
  }
  function ensure() {
    if (loaded) return; loaded = true;
    const data = read(), original = Array.isArray(data.entries) ? data.entries : [];
    mergeCooldowns(data.cooldowns);
    entries = bounded(scope ? original.filter(relevant) : original);
    total = overhead() + entries.reduce((n,e) => n + cost(e), 0);
    compact = !scope && entries.length !== original.length;
    initialCooldowns = JSON.stringify(cooldowns);
  }
  return {
    get entries() { ensure(); return entries; },
    get cooldowns() { ensure(); return cooldowns; },
    get(key) { ensure(); for (let i = entries.length - 1; i >= 0; i--) if (entries[i].key === key && entries[i].expires > Date.now()) return entries[i].value; },
    put(key, value, ttl = 86400000, expires = Date.now() + ttl) {
      ensure(); const entry = { key, value, expires };
      let length; try { length = cost(entry); } catch { return; }
      if (length > CACHE_LIMIT / 2) return;
      const old = entries.findIndex(e => e.key === key);
      if (old >= 0) { total -= cost(entries[old]); entries.splice(old, 1); }
      entries.push(entry); pending.set(key, entry); total += length;
      total = overhead() + entries.reduce((n,e) => n + cost(e), 0);
      while (entries.length > CACHE_COUNT || total > CACHE_LIMIT) { const e = entries.shift(); total -= cost(e); pending.delete(e.key); }
    },
    save() {
      // Card-only and unchanged responses never load or rewrite the lyric cache.
      if (!loaded || (!compact && !pending.size && initialCooldowns === JSON.stringify(cooldowns))) return;
      try {
        const latest = read();
        const merged = new Map();
        for (const e of bounded(Array.isArray(latest.entries) ? latest.entries : [])) merged.set(e.key, e);
        for (const e of pending.values()) {
          if (!goodObject(e) || typeof e.key !== "string" || !Number.isFinite(e.expires) || e.expires <= Date.now()) continue;
          const combined = combineTranslations(merged.get(e.key),e);
          if (combined || !merged.has(e.key) || merged.get(e.key).expires <= e.expires) { merged.delete(e.key); merged.set(e.key, combined || e); }
        }
        // Include cooldown metadata in the same serialized storage limit.
        for (const host of Object.keys(cooldowns)) if (cooldowns[host] <= Date.now()) delete cooldowns[host];
        mergeCooldowns(latest.cooldowns);
        const complete = bounded([...merged.values()]);
        ctx.storage.setJSON(KEY, { entries: complete, cooldowns });
        entries = scope ? complete.filter(relevant) : complete;
        total = overhead() + entries.reduce((n,e) => n + cost(e), 0);
        pending.clear(); compact = false; initialCooldowns = JSON.stringify(cooldowns);
      } catch { }
    }
  };
}
function status(ctx, message) {
  try {
    const url = str(ctx.request?.url), lyric = LYRIC_URL.exec(url), meta = META_URL.exec(url), scroll = SCROLL_URL.exec(url);
    const event = { message, at: new Date().toISOString(), version: VERSION,
      route: lyric ? "lyrics" : meta ? "metadata" : scroll ? "player-cards" : EXTENDED_URL.test(url) ? "extended-metadata" : LYRICS_GATE_URL.test(url) ? "lyrics-entry" : PLAYER_ENTRY_URL.test(url) ? "player-metadata" : "manual",
      ...(lyric || scroll ? { trackId: (lyric || scroll)[2] } : {}), ...(ctx.response ? { httpStatus: ctx.response.status } : {}) };
    const recent = ctx.storage.getJSON(EVENTS), previous = Array.isArray(recent) ? recent[recent.length - 1] : null;
    const age = previous ? Date.parse(event.at) - Date.parse(previous.at) : Infinity;
    if (age >= 0 && age < 15000 && ["message","version","route","trackId","httpStatus"].every(k => previous[k] === event[k])) return;
    ctx.storage.setJSON(EVENTS, [...(Array.isArray(recent) ? recent : []).slice(-7), event]);
    ctx.storage.setJSON(STATUS, event);
  } catch { }
}
async function readBody(resp, maxBytes = BODY_LIMIT) {
  if (Number(header(resp.headers,"Content-Length")) > maxBytes) throw new Error("body-limit");
  // Callback hosts expose a bounded, lazy byte view. Egern uses its documented
  // arrayBuffer API; both paths check byte size before text/JSON decoding.
  if (typeof resp.boundedBytes !== "function" && typeof resp.body?.getReader === "function") {
    const reader = resp.body.getReader(), parts = []; let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read(); if (chunk.done) break;
        const value = chunk.value;
        if (!ArrayBuffer.isView(value)) throw new Error("body-shape");
        size += value.byteLength;
        if (size > maxBytes || parts.length >= 128) { const error = new Error("body-limit"); error.bodyBytes = size; throw error; }
        parts.push(new Uint8Array(value.buffer,value.byteOffset,value.byteLength));
      }
      return parts.length === 1 ? parts[0] : join(parts);
    } catch (error) { try { await reader.cancel(); } catch { } throw error; }
    finally { reader.releaseLock(); }
  }
  const value = typeof resp.boundedBytes === "function" ? resp.boundedBytes(maxBytes) : await resp.arrayBuffer();
  const bytes = ArrayBuffer.isView(value) ? new Uint8Array(value.buffer,value.byteOffset,value.byteLength) : new Uint8Array(value);
  if (bytes.length > maxBytes) { const error = new Error("body-limit"); error.bodyBytes = bytes.length; throw error; }
  return bytes;
}
function cacheMetadata(state, parsed) {
  const key = "meta:" + parsed.meta.id, old = state.cache.get(key), next = parsed.meta;
  const same = old && old.id === next.id && old.title === next.title && old.album === next.album && old.duration === next.duration &&
    Array.isArray(old.artists) && old.artists.length === next.artists.length && old.artists.every((name,i) => name === next.artists[i]);
  if (!same) state.cache.put(key,next);
  const available = "availability:" + next.id;
  if (parsed.hasLyrics !== null && state.cache.get(available) !== parsed.hasLyrics) state.cache.put(available,parsed.hasLyrics,300000);
}
function responseHeaders(ctx, format) {
  // Use only Egern's documented Headers get/set/delete API. Preserve all other
  // fields and multiple Set-Cookie headers without enumerating bridge objects.
  const out = ctx.response.headers;
  const originalType = header(out, "Content-Type");
  const requestedType = header(ctx.request?.headers, "Accept").split(",").map(v => v.trim()).find(v => /^application\/[a-z0-9.+-]*protobuf$/i.test(v));
  for (const name of ["Content-Length", "Content-Encoding", "ETag", "Content-MD5", "Digest", "Last-Modified", "Cache-Control", "Content-Type", MARKER]) out.delete(name);
  out.set("Content-Type", format === "json" ? "application/json; charset=utf-8" : /protobuf|octet-stream/i.test(originalType) ? originalType : requestedType || "application/vnd.google.protobuf");
  out.set("Cache-Control", "no-store");
  out.set(MARKER, VERSION);
  return out;
}
async function verseLyricsCore(ctx) {
  if (LYRIC_URL.test(str(ctx.request?.url))) return;
  if (!ctx.request) {
    let s, events, config; try { s = ctx.storage.getJSON(STATUS); events = ctx.storage.getJSON(EVENTS); config = settings(ctx.env); } catch { }
    return { type: "widget", padding: 14, children: [
      { type: "text", text: "VerseLyrics " + VERSION, font: { size: "headline" } },
      { type: "text", text: config ? "补源：" + config.provider + " · 无词发现：" + (config.discover ? "开" : "关") + " · 翻译：" + (config.translate ? "开" : "关") : "设置无效" },
      { type: "text", text: s?.message || "等待 Spotify 歌词请求。" },
      { type: "text", text: s?.at || "" },
      ...(Array.isArray(events) ? events.slice(-6).filter(e => goodObject(e) && typeof e.message === "string").reverse().map(e =>
        ({ type: "text", text: [e.at, e.route, e.trackId || "", e.httpStatus || "", e.message].join(" · "), font: { size: "footnote" } })) : [])
    ] };
  }
  if (PLAYER_ENTRY_URL.test(str(ctx.request.url)) && !header(ctx.request.headers, INTERNAL)) return handlePlayerEntry(ctx);
  if (LYRICS_GATE_URL.test(str(ctx.request.url)) && !header(ctx.request.headers, INTERNAL)) return handleLyricGate(ctx);
  const url = str(ctx.request.url), lyric = LYRIC_URL.exec(url), metaURL = META_URL.exec(url), extended = EXTENDED_URL.exec(url), scroll = SCROLL_URL.exec(url);
  if ((!lyric && !metaURL && !extended && !scroll) || header(ctx.request.headers, INTERNAL)) return;
  let config;
  try { config = settings(ctx.env); } catch { status(ctx, "设置无效，已保留原响应。"); return; }
  if (!ctx.response) {
    if (lyric ? !config.translate && config.provider === "off" : !config.discover || config.provider === "off") return;
    const headers = ctx.request.headers;
    for (const name of ["If-None-Match", "If-Modified-Since", "Accept-Encoding", "Cache-Control"]) headers.delete(name);
    headers.set("Accept-Encoding", "identity"); headers.set("Cache-Control", "no-cache");
    if (lyric && fallbackFormat(ctx) === "protobuf" && !/protobuf|octet-stream|json/i.test(header(headers, "Accept"))) headers.set("Accept", "application/x-protobuf");
    return { headers };
  }
  const code = ctx.response.status;
  if (header(ctx.response.headers, MARKER)) return;
  if (code !== 200 && !(lyric && code === 404)) { status(ctx, "Spotify HTTP " + code + "，保留原响应，不将鉴权或服务错误当成无词。"); return; }
  if (lyric && code === 200 && !config.translate && config.provider === "off") return;
  let bytes;
  try { bytes = await readBody(ctx.response, LYRIC_URL.test(str(ctx.request.url)) ? BODY_LIMIT : PLAYER_LIMIT); } catch { status(ctx, "无法读取响应或响应超出大小限制，保留原响应。"); return; }
  const unchanged = () => ({ body: bytes });
  if (bytes.length > LIMIT) return unchanged();
  const state = { settings: config, cache: loadCache(ctx, lyric ? {track:lyric[2],language:config.language} : {metadata:true}), deadline: Date.now() + 10000 };


  try {
    if (scroll) {
      const card = scrollDocument(bytes, header(ctx.response.headers, "Content-Type"), scroll[2]);
      if (card.hasLyrics) { status(ctx, "播放器已下发歌词卡片，等待实际歌词请求。"); return unchanged(); }
      if (!config.discover || config.provider === "off") { status(ctx, "播放器没有歌词卡片；无词发现或备用源已关闭，请在模块设置开启。"); return unchanged(); }
      // The card list is on the player's critical loading path. Do not gate it
      // on a second authenticated Spotify request or a slow external lookup.
      // The actual lyric response below preserves native words and access
      // errors; only a real 404 or recognized empty result can query backups.
      status(ctx, "已补入完整原生歌词入口；此阶段不联网查词，等待客户端的 lyrics 请求。入口不代表备用源已收录。");
      return { headers: responseHeaders(ctx, card.format), body: card.add() };
    }
    if (extended) {
      if (/json/i.test(header(ctx.response.headers, "Content-Type"))) { status(ctx, "已命中批量元数据，但当前 JSON 结构未适配；保留响应，等待播放器卡片请求。"); return unchanged(); }
      const batch = extendedTracks(bytes);
      for (const record of batch.records) cacheMetadata(state, record);
      const selected = config.discover && config.provider !== "off" ? batch.records.filter(r => r.hasLyrics === false) : [];
      status(ctx, "批量元数据：缓存 " + batch.records.length + " 首歌曲信息；" + (selected.length ? "已将 " + selected.length + " 首无词歌曲的有词标记设为 true；等待客户端请求歌词。" : "未更改有词标记。"));
      return selected.length ? { headers: responseHeaders(ctx, "protobuf"), body: batch.writeFlags(selected) } : unchanged();
    }
    if (metaURL) {
      if (/json/i.test(header(ctx.response.headers, "Content-Type"))) { status(ctx, "旧版元数据返回未适配的 JSON；保留响应。"); return unchanged(); }
      const parsed = parseMetadata(bytes, metaURL[2]);
      cacheMetadata(state, parsed);
      if (parsed.hasLyrics !== false || !config.discover || config.provider === "off") {
        status(ctx, "已缓存歌曲信息；" + (parsed.hasLyrics === true ? "Spotify 标记有词。" : !config.discover ? "无词发现已关闭，请在模块设置开启。" : "未修改有词标记。")); return unchanged();
      }
      status(ctx, "已缓存歌曲信息并改写有词标记；实际歌词请求再自动补源。");
      return { headers: responseHeaders(ctx, "protobuf"), body: replaceField(parsed.fs, 18, numberField(18, 1)) };
    }
    return unchanged();
  } catch { status(ctx, "响应结构不支持或处理失败，已保留原响应。"); return unchanged(); }
  finally { state.cache.save(); state.network?.release(); }
}
// Original, narrowly scoped iOS lyric-entry configuration adapter.
// Uses public Protobuf field facts; never changes account attributes or other
// feature assignments. Integrated into the silent production processor.
const LYRICS_GATE_URL = new RegExp("^https://(" + HOST + ")(?::443)?/(?:user-customization-service/v1/customize|bootstrap/v1/bootstrap|v1/customize)/?(?:\\?.*)?$");
const LYRICS_GATE_SCOPE = "ios-feature-lyrics";
const LYRICS_GATE_NAME = "enable_has_lyrics_check_bypass";
function lyricGateConfiguration(bytes) {
  // Configuration.assigned_values(3) -> AssignedValue.property_id(1)
  // -> Identifier.scope(1), name(2). AssignedValue.bool_value(3).value(1).
  // Recognize only a configuration containing an actual iOS lyrics namespace.
  const fs = fields(bytes), entries = fs.filter(f => f.number === 3 && f.wire === 2);
  if (!entries.length || entries.length > 5000) return null;
  const id = fs.filter(f => f.number === 1), time = fs.filter(f => f.number === 2);
  if (id.length !== 1 || id[0].wire !== 2 || !word(fs, 1) || time.some(f => f.wire !== 0)) return null;
  let iosLyrics = false; const targets = [];
  for (const entry of entries) {
    let ef, identifier;
    try {
      ef = fields(entry.payload);
      const ids = ef.filter(f => f.number === 1);
      if (ids.length !== 1 || ids[0].wire !== 2) continue;
      identifier = fields(ids[0].payload);
      if (identifier.filter(f => f.number === 1).length !== 1 || identifier.filter(f => f.number === 2).length !== 1) continue;
      if (word(identifier, 1) !== LYRICS_GATE_SCOPE) continue;
      iosLyrics = true;
      if (word(identifier, 2) !== LYRICS_GATE_NAME) continue;
    } catch { continue; }
    const values = ef.filter(f => [3, 4, 5].includes(f.number));
    if (values.length !== 1 || values[0].number !== 3 || values[0].wire !== 2) throw new Error("lyrics-gate-type");
    const bool = fields(values[0].payload), value = bool.filter(f => f.number === 1);
    if (value.length > 1 || value.some(f => f.wire !== 0 || ![0, 1].includes(f.value))) throw new Error("lyrics-gate-value");
    targets.push({ entry, ef, bool, value: value[0]?.value ?? 0 });
  }
  if (!iosLyrics) return null;
  return { fs, entries, targets };
}
function nativeLyricGate(bytes, envelope = "customize") {
  if (bytes.length > LIMIT) throw new Error("body-limit");
  if (envelope === "bootstrap") {
    // Native BootstrapMessage.wrapper(2) -> oneMoreWrapper(1) ->
    // message(1) -> CustomizeMessage. These are protocol field facts,
    // not a recursive scan of arbitrary embedded messages.
    let current = bytes; const wrappers = [];
    for (const number of [2, 1, 1]) {
      let fs; try { fs = fields(current); } catch { return { changed: false, body: bytes, unsupported: true }; }
      const target = fs.filter(f => f.number === number);
      if (target.length !== 1 || target[0].wire !== 2) return { changed: false, body: bytes, unsupported: true };
      wrappers.push({ fs, number }); current = target[0].payload;
    }
    const result = nativeLyricGate(current);
    if (!result.changed) return { ...result, body: bytes, ...(result.depth !== undefined ? { depth: result.depth + 3 } : {}) };
    let body = result.body;
    for (let i = wrappers.length - 1; i >= 0; i--) {
      const { fs, number } = wrappers[i]; body = replaceField(fs, number, dataField(number, body));
    }
    return { ...result, body, depth: result.depth + 3 };
  }
  // Known configurations can be direct Configuration, ResolveResponse,
  // UcsResponse, or UcsResponseWrapper. Only descend their unique field 1;
  // arbitrary byte searches and unknown container rewrites are not used.
  let current = bytes; const parents = [];
  for (let depth = 0; depth <= 3; depth++) {
    let candidate;
    try { candidate = lyricGateConfiguration(current); }
    catch (e) { if (/^lyrics-gate-/.test(e.message)) throw e; }
    if (candidate) {
      const replacements = new Map(); let updated = 0, added = 0;
      for (const t of candidate.targets) {
        if (t.value === 1) continue;
        const bool = replaceField(t.bool, 1, numberField(1, 1));
        replacements.set(t.entry, dataField(3, replaceField(t.ef, 3, dataField(3, bool)))); updated++;
      }
      const parts = candidate.fs.map(f => replacements.get(f) || f.raw);
      if (!candidate.targets.length) {
        const identifier = join([stringField(1, LYRICS_GATE_SCOPE), stringField(2, LYRICS_GATE_NAME)]);
        parts.push(dataField(3, join([dataField(1, identifier), dataField(3, numberField(1, 1))]))); added = 1;
      }
      if (!updated && !added) return { changed: false, body: bytes, matched: candidate.targets.length, added, updated, depth };
      let body = join(parts);
      for (let i = parents.length - 1; i >= 0; i--) body = replaceField(parents[i], 1, dataField(1, body));
      return { changed: true, body, matched: candidate.targets.length, added, updated, depth };
    }
    if (depth === 3) break;
    let fs; try { fs = fields(current); } catch { break; }
    const next = fs.filter(f => f.number === 1);
    if (next.length !== 1 || next[0].wire !== 2) break;
    // A success and an error in the same oneof is not a supported envelope.
    if (fs.some(f => f.number === 2 && f.wire === 2)) break;
    parents.push(fs); current = next[0].payload;
  }
  return { changed: false, body: bytes, unsupported: true };
}
async function handleLyricGate(ctx) {
  let config; try { config = settings(ctx.env); } catch { return; }
  if (!config.discover || config.provider === "off") return;
  if (!ctx.response) {
    const h = ctx.request.headers;
    for (const name of ["If-None-Match", "If-Modified-Since", "Accept-Encoding", "Cache-Control"]) h.delete(name);
    h.set("Accept-Encoding", "identity"); h.set("Cache-Control", "no-cache");
    return { headers: h };
  }
  const code = ctx.response.status;
  if (code !== 200) {
    status(ctx, code === 304 ? "客户端歌词配置仍返回 304，未取得配置正文；请确认模块已更新后重新打开 Spotify。" : "客户端歌词配置 HTTP " + code + "；保留原响应，未改写。");
    return;
  }
  let bytes; try { bytes = await readBody(ctx.response, LYRIC_URL.test(str(ctx.request.url)) ? BODY_LIMIT : PLAYER_LIMIT); } catch { return; }
  if (header(ctx.response.headers, MARKER)) { status(ctx, "客户端配置已有处理标记；保留原响应。"); return { body: bytes }; }
  try {
    if (/json/i.test(header(ctx.response.headers, "Content-Type"))) {
      status(ctx, "客户端配置返回 JSON，当前适配仅支持已核对的原生二进制结构；保留原响应。"); return { body: bytes };
    }
    const envelope = /\/bootstrap\/v1\/bootstrap\/?(?:\?|$)/.test(str(ctx.request.url)) ? "bootstrap" : "customize";
    const result = nativeLyricGate(bytes, envelope);
    if (result.unsupported) { status(ctx, "客户端配置已命中，但没有识别到 iOS 歌词配置容器；保留原响应。"); return { body: bytes }; }
    if (!result.changed) { status(ctx, "客户端歌词检查跳过标记已经开启；配置无需改写，等待后续 lyrics 请求。"); return { body: bytes }; }
    status(ctx, "客户端歌词配置 " + envelope + "：已写入无词检查跳过标记（新增 " + result.added + "，修改 " + result.updated + "）；其他配置保持原字节，等待后续 lyrics 请求。");
    return { headers: responseHeaders(ctx, "protobuf"), body: result.body };
  } catch (error) {
    status(ctx, "客户端歌词配置结构不支持或字段类型不符；保留原响应。"); return { body: bytes };
  }
}

// Native playback models carry separate has_lyrics metadata from TRACK_V4.
const PLAYER_ENTRY_URL = new RegExp("^https://(" + HOST + ")(?::443)?/(?:context-resolve/v1/spotify(?::|%3[aA])[^?#\\s/]{1,512}|connect-state/v1/devices/[0-9A-Za-z_-]{16,128})/?(?:\\?.*)?$");
function playerEntryWire(bytes, connect) {
  let changed = 0, visited = 0;
  function track(body, mapNumber) {
    const fs = fields(body), uri = word(fs, 1);
    if (!/^spotify:track:[0-9A-Za-z]{22}$/.test(uri)) return body;
    if (++visited > 300) throw new Error("player-track-limit");
    const maps = fs.filter(f => f.number === mapNumber);
    if (maps.some(f => f.wire !== 2)) return body;
    const targets = maps.map(f => ({f, fs:fields(f.payload)})).filter(t => word(t.fs,1) === "has_lyrics");
    if (targets.some(t => !["true", "false"].includes(word(t.fs,2)))) return body;
    const replacements = new Map();
    for (const t of targets) if (word(t.fs,2) === "false") {
      replacements.set(t.f, dataField(mapNumber, replaceField(t.fs,2,stringField(2,"true")))); changed++;
    }
    if (!replacements.size && targets.length) return body;
    const parts = fs.map(f => replacements.get(f) || f.raw);
    if (!targets.length) { parts.push(dataField(mapNumber,join([stringField(1,"has_lyrics"),stringField(2,"true")]))); changed++; }
    return join(parts);
  }
  function repeated(body, number, transform) {
    const initial = changed;
    const parts = fields(body).map(f => {
      if(f.number!==number||f.wire!==2)return f.raw;
      const before=changed, value=transform(f.payload);return before===changed?f.raw:dataField(number,value);
    });
    return initial === changed ? body : join(parts);
  }
  let body;
  if (connect) {
    // Cluster.player_state(3) -> PlayerState.track(7), prev(19), next(20).
    body = repeated(bytes,3,state => {
      const fs = fields(state), initial = changed;
      const parts = fs.map(f => {
        if(![7,19,20].includes(f.number)||f.wire!==2)return f.raw;
        const before=changed,value=track(f.payload,3);return before===changed?f.raw:dataField(f.number,value);
      });
      return initial === changed ? state : join(parts);
    });
  } else {
    // Context.pages(5) -> ContextPage.tracks(4) -> ContextTrack.metadata(4).
    if(!/^spotify:[^\s?#]{1,512}$/.test(word(fields(bytes),1)))return {body:bytes,changed:0,visited:0};
    body = repeated(bytes,5,page => repeated(page,4,t => track(t,4)));
  }
  return {body:changed ? body : bytes,changed,visited};
}
function playerEntryJSON(bytes, connect) {
  const source = text(bytes), obj = JSON.parse(source), plans = new Map();let visited = 0;
  function target(value,path) {
    if (!goodObject(value) || !/^spotify:track:[0-9A-Za-z]{22}$/.test(str(value.uri))) return;
    if (++visited > 300) throw new Error("player-track-limit");
    if (!Object.hasOwn(value,"metadata")) { plans.set(JSON.stringify(path),{add:'"metadata":{"has_lyrics":"true"}'}); return; }
    if (!goodObject(value.metadata)) return;
    const meta = value.metadata;
    if (!Object.hasOwn(meta,"has_lyrics")) plans.set(JSON.stringify([...path,"metadata"]),{add:'"has_lyrics":"true"'});
    else if (meta.has_lyrics === "false" || meta.has_lyrics === false) plans.set(JSON.stringify([...path,"metadata","has_lyrics"]),{value:typeof meta.has_lyrics === "string" ? '"true"' : 'true'});
  }
  if (connect) {
    const state = obj?.player_state;
    if (goodObject(state)) {
      target(state.track,["player_state","track"]);
      for (const key of ["prev_tracks","next_tracks"]) if (Array.isArray(state[key])) state[key].forEach((v,i)=>target(v,["player_state",key,i]));
    }
  } else if (goodObject(obj) && /^spotify:[^\s?#]{1,512}$/.test(str(obj.uri)) && Array.isArray(obj.pages)) {
    obj.pages.forEach((page,i)=>{if(Array.isArray(page?.tracks))page.tracks.forEach((v,j)=>target(v,["pages",i,"tracks",j]));});
  }
  if (!plans.size) return {body:bytes,changed:0,visited};
  // Splice only selected JSON tokens. Preserve all other text, escaped strings,
  // numeric IDs, whitespace and unknown data without JSON reserialization.
  const edits=[];let at=0,nodes=0;
  function space(){while(/\s/.test(source[at]||"x"))at++;}
  function string(){const begin=at++;while(at<source.length){const ch=source[at++];if(ch==='\\')at++;else if(ch==='"')return source.slice(begin,at);}throw new Error("player-json-string");}
  function scan(path,depth){
    if(depth>64||++nodes>100000)throw new Error("player-json-limit");space();const begin=at,plan=plans.get(JSON.stringify(path));
    if(source[at]==='{'){
      at++;space();const empty=source[at]==='}';
      while(source[at]!=='}'){const key=JSON.parse(string());space();if(source[at++]!==':')throw new Error("player-json-colon");scan([...path,key],depth+1);space();if(source[at]===','){at++;space();}else break;}
      if(source[at]!=='}')throw new Error("player-json-object");if(plan?.add)edits.push({begin:at,end:at,value:(empty?'':',')+plan.add});at++;
    }else if(source[at]==='['){at++;space();let i=0;while(source[at]!==']'){scan([...path,i++],depth+1);space();if(source[at]===','){at++;space();}else break;}if(source[at++]!==']')throw new Error("player-json-array");}
    else if(source[at]==='"')string();else{while(at<source.length&&!/[\s,}\]]/.test(source[at]))at++;}
    if(plan?.value)edits.push({begin,end:at,value:plan.value});
  }
  scan([],0);space();if(at!==source.length||edits.length!==plans.size)throw new Error("player-json-shape");
  const parts=[];let end=0;
  for(const e of edits.sort((a,b)=>a.begin-b.begin)){parts.push(source.slice(end,e.begin),e.value);end=e.end;}
  parts.push(source.slice(end));return {body:utf8(parts.join("")),changed:edits.length,visited};
}
async function handlePlayerEntry(ctx) {
  let config;try {config=settings(ctx.env);}catch{return;}
  if(!config.discover||config.provider==="off")return;
  if(!ctx.response){const h=ctx.request.headers;h.delete("If-None-Match");h.delete("If-Modified-Since");h.set("Accept-Encoding","identity");h.set("Cache-Control","no-cache");return {headers:h};}
  if(ctx.response.status!==200||header(ctx.response.headers,MARKER))return;
  if(Number(header(ctx.response.headers,"Content-Length"))>PLAYER_LIMIT)return;
  let bytes;try{bytes=await readBody(ctx.response,PLAYER_LIMIT);}catch{return;}
  if(bytes.length>PLAYER_LIMIT)return {body:bytes};
  try {
    const connect=str(ctx.request.url).includes("/connect-state/"),type=header(ctx.response.headers,"Content-Type"),format=/json/i.test(type)?"json":"protobuf";
    if(format==="protobuf"&&!/protobuf|octet-stream/i.test(type))return {body:bytes};
    const result=format==="json"?playerEntryJSON(bytes,connect):playerEntryWire(bytes,connect);
    status(ctx,"播放器曲目元数据：识别 "+result.visited+" 首，更新 "+result.changed+" 个歌词标记。");
    return result.changed?{headers:responseHeaders(ctx,format),body:result.body}:{body:bytes};
  }catch{return {body:bytes};}
}

// Original VerseLyrics native host bridge, adapter 7 (core 0.4.8).
// CLIENT is fixed at build time, never inferred from another app's globals.
const CLIENT = "Loon";
const nativeQX = CLIENT === "QuantumultX";
let nativeFinished = false, nativeWatchdog, nativeWatchdogStarted = false, nativeDeadline = 0;
function nativeDone(value) {
  if (nativeFinished) return;
  nativeFinished = true;
  if (nativeWatchdog !== undefined && typeof clearTimeout === "function") clearTimeout(nativeWatchdog);
  nativeWatchdog = undefined;
  $done(value || {});
}
class NativeHeaders {
  constructor(value) {
    this.array = Array.isArray(value);
    this.pairs = this.array ? value.map(x => [x.field, x.value]) : Object.entries(value || {});
  }
  get(name) {
    const pair = this.pairs.find(x => x[0].toLowerCase() === name.toLowerCase());
    return pair ? String(pair[1]) : null;
  }
  delete(name) { this.pairs = this.pairs.filter(x => x[0].toLowerCase() !== name.toLowerCase()); }
  set(name, value) { this.delete(name); this.pairs.push([name, String(value)]); }
  native() {
    return this.array ? this.pairs.map(([field, value]) => ({field, value})) : Object.fromEntries(this.pairs);
  }
}
function nativeBytes(value, limit = LIMIT) {
  if (value == null) return new Uint8Array(0);
  if (typeof value === "string") return utf8(value,limit);
  if (Number(value.byteLength) > limit) { const error = new Error("body-limit"); error.bodyBytes = value.byteLength; throw error; }
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Object.prototype.toString.call(value) === "[object ArrayBuffer]") return new Uint8Array(value);
  throw new Error("unsupported native body");
}
function nativeBuffer(bytes) {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? bytes.buffer : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
function nativeStatus(value) {
  if (typeof value === "number") return value;
  const match = /^(?:HTTP\/\S+\s+)?([1-5]\d\d)(?:\s|$)/.exec(String(value));
  return match ? Number(match[1]) : 0;
}
function nativeResponse(status, headers, data) {
  let bytes;
  function boundedBytes(limit = LIMIT) {
    if (!bytes) bytes = nativeBytes(data,limit);
    if (bytes.byteLength > limit) { const error = new Error("body-limit"); error.bodyBytes = bytes.byteLength; throw error; }
    return bytes;
  }
  return {status: nativeStatus(status), headers: new NativeHeaders(headers), boundedBytes, arrayBuffer: async () => nativeBuffer(boundedBytes())};
}
function nativeArguments() {
  const allowed = ["TRANSLATION_ENABLED", "TARGET_LANGUAGE", "FALLBACK_PROVIDER", "DISCOVER_MISSING"];
  const env = Object.create(null);
  function add(raw) {
    if (typeof raw === "string") {
      for (const item of raw.split("&")) {
        const equal = item.indexOf("=");
        if (equal < 1) continue;
        const key = decodeURIComponent(item.slice(0, equal));
        if (allowed.includes(key)) env[key] = decodeURIComponent(item.slice(equal + 1));
      }
    } else if (raw && typeof raw === "object") {
      for (const key of allowed) if (raw[key] != null) env[key] = String(raw[key]);
    }
  }
  if (nativeQX && typeof $environment !== "undefined") {
    const source = String($environment.sourcePath || "");
    if (source.includes("#")) add(source.slice(source.indexOf("#") + 1));
    add($environment.variables);
  }
  if (typeof $argument !== "undefined") add($argument);
  return env;
}
const nativeStorage = {
  getJSON(key) {
    try {
      const raw = nativeQX ? $prefs.valueForKey(key) : $persistentStore.read(key);
      return typeof raw === "string" && raw.length <= 128000 ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  setJSON(key, value) {
    if (nativeFinished) return;
    const raw = JSON.stringify(value);
    if (nativeQX) $prefs.setValueForKey(raw, key); else $persistentStore.write(raw, key);
  }
};
async function nativeMain() {
  if (typeof $request === "undefined" || !$request?.url) return nativeDone({});
  const ctx = {
    request: {url: $request.url, method: $request.method, headers: new NativeHeaders($request.headers)},
    env: nativeArguments(), storage: nativeStorage,
    http: {get: (url, opts) => nativeHTTP("get", url, opts), post: (url, opts) => nativeHTTP("post", url, opts)}
  };
  if (typeof $response !== "undefined" && $response) {
    ctx.response = nativeResponse($response.statusCode ?? $response.status, $response.headers, nativeQX ? $response.bodyBytes ?? $response.body : $response.body);
  }
  nativeDeadline = Date.now() + 12000;
  const result = await verseLyricsCore(ctx);
  if (!result || nativeFinished) return nativeDone({});
  if (nativeQX && ctx.response && result.body === undefined) return nativeDone({});
  // An unchanged byte result must remain passthrough, including an empty 404.
  if (!result.headers && result.status === undefined && result.body && ctx.response) {
    const original = ctx.response.boundedBytes();
    const sameView = result.body.buffer === original.buffer && result.body.byteOffset === original.byteOffset;
    if (result.body.length === original.length && (sameView || result.body.every((b, i) => b === original[i]))) return nativeDone({});
  }
  const output = {};
  if (result.headers) {
    if (nativeQX && ctx.response) {
      // QX owns these fields when replacing body/bodyBytes. Restore their
      // original spelling and values; the shared core may have changed them.
      const protectedNames = ["content-length", "content-type", "content-encoding"];
      for (const name of protectedNames) result.headers.delete(name);
      for (const [field,value] of Object.entries($response.headers || {})) {
        if (protectedNames.includes(field.toLowerCase())) result.headers.pairs.push([field,value]);
      }
    }
    output.headers = result.headers.native();
  }
  if (result.status !== undefined) output.status = nativeQX ? "HTTP/1.1 " + result.status + (result.status === 200 ? " OK" : "") : result.status;
  if (result.body !== undefined && ctx.response) {
    const bytes = nativeBytes(result.body);
    if (nativeQX) output.bodyBytes = nativeBuffer(bytes); else output.body = bytes;
  }
  nativeDone(output);
}
nativeMain().catch(() => nativeDone({}));

})();
