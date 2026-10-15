/* VerseLyrics 0.3.0 — original Egern native script, 2026-10-15.
 * Rewrites Spotify color-lyrics JSON and protobuf; no third-party script runtime.
 * Public protocol field numbers and service endpoints are documented in README.md.
 * Egern API: export default async function(ctx), ctx.http, ctx.storage.
 */
const VERSION = "0.3.0";
const KEY = "VerseLyrics.v1.cache";
const STATUS = "VerseLyrics.v1.status";
const EVENTS = "VerseLyrics.v1.events";
const LIMIT = 2 * 1024 * 1024;
const MAX_LINES = 600;
const INTERNAL = "x-verselyrics-internal";
const MARKER = "x-verselyrics";
const HOST = "(?:spclient\\.wg|[a-z0-9-]+-spclient)\\.spotify\\.com";
const LYRIC_URL = new RegExp("^https://(" + HOST + ")(?::443)?/color-lyrics/v2/track/([0-9A-Za-z]{22})(?:/image/[^?#\\s]+)?/?(?:\\?.*)?$");
const META_URL = new RegExp("^https://(" + HOST + ")(?::443)?/metadata/4/track/([0-9a-f]{32})(?:\\?.*)?$");
const EXTENDED_URL = new RegExp("^https://(" + HOST + ")(?::443)?/extended-metadata/v0/extended-metadata/?(?:\\?.*)?$");
const SCROLL_URL = new RegExp("^https://(" + HOST + ")(?::443)?/scrollsita/v1/scroll/spotify(?::|%3[aA])track(?::|%3[aA])([0-9A-Za-z]{22})/?(?:\\?.*)?$");
const LANGUAGES = ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "ar", "hi", "id", "vi", "th", "tr", "nl", "pl", "sv", "uk", "he", "fa", "ms", "el"];
const SOURCES = { lrclib: "LRCLIB", qq: "QQ 音乐", netease: "网易云音乐" };
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
function utf8(text) {
  const encoded = encodeURIComponent(text), out = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === "%") { out.push(parseInt(encoded.slice(i + 1, i + 3), 16)); i += 2; }
    else out.push(encoded.charCodeAt(i));
  }
  return Uint8Array.from(out);
}
function text(bytes) { return decodeURIComponent(Array.from(bytes, b => "%" + b.toString(16).padStart(2, "0")).join("")); }
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
    if (out.length >= 20000) throw new Error("field-limit");
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
function last(fs, n, wire) { return fs.filter(f => f.number === n && f.wire === wire).at(-1); }
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
function languageFamily(value) { return clean(value).toLowerCase().replace(/_/g, "-").split("-")[0]; }
function nativeTranslationState(alternatives, language, count) {
  if (!Array.isArray(alternatives) || alternatives.some(a => !goodObject(a) || !clean(a.language) ||
      !Array.isArray(a.lines) || a.lines.some(line => typeof line !== "string" || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(line)))) return "unsupported";
  const existing = alternatives.find(a => languageFamily(a.language) === languageFamily(language));
  if (!existing) return "missing";
  return existing.lines.length === count && existing.lines.some(line => clean(line)) ? "present" : "unsupported";
}
function checkTranslationRows(rows, count) {
  if (!Array.isArray(rows) || rows.length !== count || rows.some(row => typeof row !== "string")) throw new Error("native-line-count");
}
function parseDocument(bytes, contentType) {
  if (bytes.length > LIMIT) throw new Error("body-limit");
  let at = 0; while (at < bytes.length && [9, 10, 13, 32].includes(bytes[at])) at++;
  if (/json/i.test(contentType) || bytes[at] === 123) {
    const obj = JSON.parse(text(bytes));
    if (!goodObject(obj) || (obj.lyrics != null && !goodObject(obj.lyrics))) throw new Error("json-shape");
    const lyrics = obj.lyrics;
    if (lyrics && !Array.isArray(lyrics.lines)) throw new Error("line-shape");
    if ((lyrics?.lines.length || 0) > MAX_LINES) throw new Error("line-limit");
    if (lyrics?.lines.some(l => !goodObject(l) || typeof l.words !== "string")) throw new Error("line-shape");
    const words = (lyrics?.lines || []).map(l => l.words), alternatives = lyrics?.alternatives ?? [];
    return { format: "json", words, obj, lyrics, language: clean(lyrics?.language), blocked: lyrics?.showUpsell === true,
      nativeState(language) { return nativeTranslationState(alternatives, language, words.length); },
      writeNative(language, rows) {
        checkTranslationRows(rows, words.length);
        if (nativeTranslationState(alternatives, language, words.length) !== "missing") throw new Error("native-alternative-conflict");
        // Keep original rows, timestamps, syllables, preview rows and typography.
        // Spotify's existing translation renderer consumes this separate string list.
        obj.lyrics.alternatives = [...alternatives, { language, lines: rows }];
        return utf8(JSON.stringify(obj));
      } };
  }
  if (!/protobuf|octet-stream/i.test(contentType)) throw new Error("unknown-format");
  const outer = fields(bytes), containers = outer.filter(f => f.number === 1);
  if (containers.length !== 1 || containers[0].wire !== 2) throw new Error("lyrics-container");
  const inner = fields(containers[0].payload), lineFields = inner.filter(f => f.number === 2);
  if (lineFields.length > MAX_LINES || lineFields.some(f => f.wire !== 2)) throw new Error("line-shape");
  const parsed = lineFields.map(f => fields(f.payload));
  if (parsed.some(fs => fs.filter(f => f.number === 2).length > 1 || fs.some(f => f.number === 2 && f.wire !== 2))) throw new Error("line-shape");
  const words = parsed.map(fs => word(fs, 2)), alternativeFields = inner.filter(f => f.number === 9);
  let alternatives;
  try {
    alternatives = alternativeFields.map(f => {
      if (f.wire !== 2) throw new Error("alternative-wire");
      const fs = fields(f.payload), languageFields = fs.filter(f => f.number === 1), rows = fs.filter(f => f.number === 2);
      if (languageFields.length !== 1 || languageFields[0].wire !== 2 || rows.some(f => f.wire !== 2)) throw new Error("alternative-schema");
      return { language: word(fs, 1), lines: rows.map(f => text(f.payload)) };
    });
  } catch { alternatives = null; }
  return { format: "protobuf", words, language: word(inner, 10), blocked: last(inner, 13, 0)?.value === 1,
    nativeState(language) { return nativeTranslationState(alternatives, language, words.length); },
    writeNative(language, rows) {
      checkTranslationRows(rows, words.length);
      if (nativeTranslationState(alternatives, language, words.length) !== "missing") throw new Error("native-alternative-conflict");
      // LyricsResponse.alternatives = field 9; Alternative.language = field 1;
      // Alternative.lines = repeated UTF-8 strings in field 2, NOT lyric messages.
      const alternative = join([stringField(1, language), ...rows.map(row => stringField(2, row))]);
      const body = join([...inner.map(f => f.raw), dataField(9, alternative)]);
      return replaceField(outer, 1, dataField(1, body));
    } };
}
function encodeDocument(doc, format) {
  if (format === "json") return utf8(JSON.stringify(doc));
  const l = doc.lyrics;
  const body = join([
    numberField(1, l.syncType === "LINE_SYNCED" ? 1 : 0),
    ...l.lines.map(line => dataField(2, join([numberField(1, Number(line.startTimeMs)), stringField(2, line.words)]))),
    stringField(3, l.provider), stringField(5, l.providerDisplayName), stringField(10, l.language || "")
  ]);
  const colors = join([numberField(1, doc.colors.background), numberField(2, doc.colors.text), numberField(3, doc.colors.highlightText)]);
  return join([dataField(1, body), dataField(2, colors)]);
}
function parseMetadata(bytes, hex) {
  const fs = fields(bytes), gid = last(fs, 1, 2);
  if (!gid || Array.from(gid.payload, b => b.toString(16).padStart(2, "0")).join("") !== hex) throw new Error("metadata-id");
  const album = last(fs, 3, 2), rawDuration = last(fs, 7, 0)?.value;
  const meta = { id: hexBase62(hex), title: word(fs, 2), album: album ? word(fields(album.payload), 2) : "",
    artists: fs.filter(f => f.number === 4 && f.wire === 2).map(f => word(fields(f.payload), 2)),
    duration: Number.isSafeInteger(rawDuration) ? (rawDuration % 2 ? -(rawDuration + 1) / 2 : rawDuration / 2) / 1000 : 0 };
  if (!clean(meta.title) || !clean(meta.album) || !meta.artists.length || meta.artists.some(a => !clean(a)) || meta.duration <= 0 || meta.duration > 86400) throw new Error("metadata-incomplete");
  return { meta, fs, hasLyrics: last(fs, 18, 0) ? last(fs, 18, 0).value === 1 : null };
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
      add() { sections.unshift({ lyrics: { entityUri: uri } }); return utf8(JSON.stringify(obj)); } };
  }
  if (!/protobuf|octet-stream/i.test(contentType)) throw new Error("scroll-format");
  const root = fields(bytes), structures = root.filter(f => f.number === 1);
  if (structures.length !== 1 || structures[0].wire !== 2) throw new Error("scroll-structure");
  const inner = fields(structures[0].payload), sections = inner.filter(f => f.number === 1);
  if (sections.length > 100 || sections.some(f => f.wire !== 2)) throw new Error("scroll-sections");
  const parsed = sections.map(f => fields(f.payload));
  // NpvScrollResponse.structure(1) -> NpvScrollStructure.sections(1)
  // -> Section.lyrics(5) -> Lyrics.entity_uri(1).
  return { format: "protobuf", hasLyrics: parsed.some(fs => fs.some(f => f.number === 5)),
    add() {
      const card = dataField(1, dataField(5, stringField(1, uri)));
      return replaceField(root, 1, dataField(1, join([card, ...inner.map(f => f.raw)])));
    } };
}
function settings(env = {}) {
  const provider = str(env.FALLBACK_PROVIDER) || "auto";
  const language = str(env.TARGET_LANGUAGE) || "zh-CN";
  if (!LANGUAGES.includes(language) || !["auto", "off", ...Object.keys(SOURCES)].includes(provider)) throw new Error("settings-invalid");
  return { translate: truth(env.TRANSLATION_ENABLED), language, provider, discover: env.DISCOVER_MISSING == null || env.DISCOVER_MISSING === "" ? true : truth(env.DISCOVER_MISSING) };
}
function loadCache(ctx) {
  let data;
  try { data = ctx.storage.getJSON(KEY); } catch { }
  if (!goodObject(data)) data = {};
  const entries = (Array.isArray(data.entries) ? data.entries : []).filter(e => goodObject(e) && typeof e.key === "string" && e.expires > Date.now()).slice(-700);
  const cooldowns = goodObject(data.cooldowns) ? data.cooldowns : {};
  return { entries, cooldowns,
    get(key) { for (let i = this.entries.length - 1; i >= 0; i--) if (this.entries[i].key === key) return this.entries[i].value; },
    put(key, value, ttl = 86400000) { this.entries = this.entries.filter(e => e.key !== key); this.entries.push({ key, value, expires: Date.now() + ttl }); },
    save() {
      try {
        // Multiple Spotify requests can complete in a different order. Merge the
        // latest entries and keep the longest Retry-After deadline before saving.
        let latest; try { latest = ctx.storage.getJSON(KEY); } catch { }
        const merged = new Map();
        for (const e of [...(Array.isArray(latest?.entries) ? latest.entries : []), ...this.entries]) {
          if (!goodObject(e) || typeof e.key !== "string" || !Number.isFinite(e.expires) || e.expires <= Date.now()) continue;
          if (!merged.has(e.key) || merged.get(e.key).expires < e.expires) merged.set(e.key, e);
        }
        this.entries = [...merged.values()];
        for (const [host, until] of Object.entries(goodObject(latest?.cooldowns) ? latest.cooldowns : {})) {
          if (Number.isFinite(until)) this.cooldowns[host] = Math.max(this.cooldowns[host] || 0, until);
        }
        while (this.entries.length > 700 || JSON.stringify(this.entries).length > 350000) this.entries.shift();
        ctx.storage.setJSON(KEY, { entries: this.entries, cooldowns: this.cooldowns });
      } catch { }
    }
  };
}
function status(ctx, message) {
  try {
    const url = str(ctx.request?.url), lyric = LYRIC_URL.exec(url), meta = META_URL.exec(url), scroll = SCROLL_URL.exec(url);
    const event = { message, at: new Date().toISOString(), version: VERSION,
      route: lyric ? "lyrics" : meta ? "metadata" : scroll ? "player-cards" : EXTENDED_URL.test(url) ? "extended-metadata" : "manual",
      ...(lyric || scroll ? { trackId: (lyric || scroll)[2] } : {}), ...(ctx.response ? { httpStatus: ctx.response.status } : {}) };
    const recent = ctx.storage.getJSON(EVENTS);
    ctx.storage.setJSON(EVENTS, [...(Array.isArray(recent) ? recent : []).slice(-7), event]);
    ctx.storage.setJSON(STATUS, event);
  } catch { }
}
function cooldown(resp, cache, host) {
  if (![429, 503].includes(resp.status)) return;
  const value = header(resp.headers, "Retry-After"), seconds = Number(value);
  const delay = value && Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  cache.cooldowns[host] = Date.now() + Math.min(86400000, Math.max(30000, Number.isFinite(delay) ? delay : 60000));
}
async function http(ctx, url, state, options = {}, allowMissing = false) {
  const host = /^https:\/\/([^/]+)\//.exec(url)?.[1];
  if (!host || state.cache.cooldowns[host] > Date.now()) throw new Error("cooldown");
  const remaining = state.deadline - Date.now();
  if (remaining < 250) throw new Error("deadline");
  const common = { ...options, timeout: Math.min(5500, remaining), redirect: "error", credentials: "omit", insecureTls: false };
  const resp = options.body === undefined ? await ctx.http.get(url, common) : await ctx.http.post(url, common);
  cooldown(resp, state.cache, host);
  if ((resp.status < 200 || resp.status >= 300) && !(allowMissing && resp.status === 404)) throw new Error("http-" + resp.status);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (bytes.length > LIMIT) throw new Error("service-body-limit");
  return { bytes, headers: resp.headers, status: resp.status };
}
async function json(ctx, url, state, options) { return JSON.parse(text((await http(ctx, url, state, options)).bytes)); }
const query = params => Object.entries(params).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(String(v))).join("&");
function artists(names) {
  return [...new Set(names.flatMap(s => clean(s).split(/\s*(?:;|；|、|,|，|&|\/|\bfeat\.?|\bfeaturing\b)\s*/i)).map(normal).filter(Boolean))].sort();
}
function matches(meta, candidate) {
  return normal(meta.title) === normal(candidate.title) && normal(meta.album) === normal(candidate.album) &&
    JSON.stringify(artists(meta.artists)) === JSON.stringify(artists(candidate.artists)) &&
    Number.isFinite(candidate.duration) && Math.abs(meta.duration - candidate.duration) <= 2;
}
function entities(s) {
  return str(s).replace(/&(?:#(x[0-9a-f]+|\d+)|(amp|lt|gt|quot|apos));/gi, (all, n, name) => {
    if (name) return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[name.toLowerCase()];
    const value = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
    return Number.isInteger(value) && value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : all;
  });
}
function lrc(input) {
  const source = entities(input).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (source.length > 120000) throw new Error("lyrics-limit");
  let offset = 0;
  for (const m of source.matchAll(/\[offset:\s*(-?\d+)\s*\]/gi)) offset = Math.max(-600000, Math.min(600000, Number(m[1])));
  const rows = [];
  for (const line of source.split("\n")) {
    const tags = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!tags.length) continue;
    const words = line.slice(tags.at(-1).index + tags.at(-1)[0].length).replace(/<\d{1,3}:\d{2}(?:\.\d{1,3})?>/g, "");
    for (const t of tags) {
      if (Number(t[2]) >= 60) continue;
      const start = Math.max(0, Number(t[1]) * 60000 + Number(t[2]) * 1000 + Number((t[3] || "").padEnd(3, "0")) + offset);
      rows.push({ startTimeMs: String(start), words, syllables: [], endTimeMs: "0" });
    }
  }
  rows.sort((a, b) => Number(a.startTimeMs) - Number(b.startTimeMs));
  const merged = [];
  for (const row of rows) {
    const prev = merged.at(-1);
    if (prev && prev.startTimeMs === row.startTimeMs) { if (row.words && row.words !== prev.words) prev.words += (prev.words ? "\n" : "") + row.words; }
    else merged.push(row);
  }
  if (merged.length > MAX_LINES) throw new Error("line-limit");
  return merged;
}
function fallbackDoc(provider, synced, plain) {
  let lines = lrc(synced), timed = lines.some(l => Number(l.startTimeMs) > 0);
  if (!lines.some(l => clean(l.words))) {
    lines = clean(entities(plain)).split(/\r?\n/).filter(s => clean(s)).map(words => ({ startTimeMs: "0", words, syllables: [], endTimeMs: "0" }));
    timed = false;
  }
  if (!lines.length || lines.length > MAX_LINES) return null;
  return { lyrics: { syncType: timed ? "LINE_SYNCED" : "UNSYNCED", lines, provider,
    providerLyricsId: "", providerDisplayName: SOURCES[provider], syncLyricsUri: "", isDenseTypeface: false,
    alternatives: [], language: "", isRtlLanguage: false },
    colors: { background: -15656936, text: -1, highlightText: -1 }, hasVocalRemoval: false };
}
async function sourceLyrics(ctx, provider, meta, state) {
  if (provider === "lrclib") {
    const data = await json(ctx, "https://lrclib.net/api/search?" + query({ track_name: meta.title, artist_name: meta.artists.join(" "), album_name: meta.album }), state,
      { headers: { "User-Agent": "VerseLyrics/" + VERSION + " (Egern; original Spotify lyrics module)" } });
    if (!Array.isArray(data)) throw new Error("lrclib-format");
    for (const record of data.slice(0, 20)) {
      if (!matches(meta, { title: record.trackName, artists: [record.artistName], album: record.albumName, duration: record.duration })) continue;
      const result = fallbackDoc(provider, str(record.syncedLyrics), str(record.plainLyrics));
      if (result) return result;
    }
    return null;
  }
  if (provider === "qq") {
    const headers = { Referer: "https://y.qq.com/" };
    const data = await json(ctx, "https://c.y.qq.com/soso/fcgi-bin/client_search_cp?" + query({ w: meta.title + " " + meta.artists.join(" "), format: "json", n: 10, p: 1, t: 0 }), state, { headers });
    if (data.code !== 0 || !Array.isArray(data.data?.song?.list)) throw new Error("qq-format");
    const songs = data.data.song.list.filter(s => matches(meta, { title: s.songname, artists: (s.singer || []).map(a => a.name), album: s.albumname, duration: s.interval }));
    for (const song of songs.slice(0, 2)) {
      if (!/^[0-9A-Za-z]{1,32}$/.test(song.songmid)) continue;
      const lyrics = await json(ctx, "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?" + query({ songmid: song.songmid, format: "json", nobase64: 1, g_tk: 5381 }), state, { headers });
      if ((lyrics.retcode ?? lyrics.code) !== 0) continue;
      const result = fallbackDoc(provider, str(lyrics.lyric), "");
      if (result) return result;
    }
    return null;
  }
  const headers = { Referer: "https://music.163.com/", "Content-Type": "application/x-www-form-urlencoded" };
  const data = await json(ctx, "https://music.163.com/api/cloudsearch/pc", state, { headers,
    body: query({ s: meta.title + " " + meta.artists.join(" "), type: 1, limit: 15, offset: 0 }) });
  if (data.code !== 200 || !Array.isArray(data.result?.songs)) throw new Error("netease-format");
  const songs = data.result.songs.filter(s => matches(meta, { title: s.name, artists: (s.ar || []).map(a => a.name), album: s.al?.name, duration: s.dt / 1000 }));
  for (const song of songs.slice(0, 2)) {
    if (!Number.isSafeInteger(song.id) || song.id <= 0) continue;
    const lyrics = await json(ctx, "https://music.163.com/api/song/lyric?" + query({ id: song.id, lv: -1, kv: -1, tv: -1 }), state, { headers: { Referer: headers.Referer } });
    if (lyrics.code !== 200) continue;
    const result = fallbackDoc(provider, str(lyrics.lrc?.lyric), "");
    if (result) return result;
  }
  return null;
}
async function backup(ctx, meta, state) {
  if (state.settings.provider === "off") return null;
  const key = "lyrics:" + state.settings.provider + ":" + meta.id;
  const cached = state.cache.get(key);
  if (goodObject(cached) && Array.isArray(cached.lyrics?.lines)) return cached;
  state.attempts = [];
  const providers = state.settings.provider === "auto" ? ["lrclib", "qq", "netease"] : [state.settings.provider];
  for (const provider of providers) {
    try {
      const doc = await sourceLyrics(ctx, provider, meta, state);
      state.attempts.push({ provider, result: doc ? "matched" : "no-match" });
      if (doc) { state.cache.put(key, doc); return doc; }
    } catch (e) {
      const reason = /^(?:http-\d{3}|cooldown|deadline)$/.test(str(e.message)) ? e.message : "request-or-format";
      state.attempts.push({ provider, result: reason });
    }
    if (Date.now() + 250 >= state.deadline) break;
  }
  return null;
}
function sourceReport(state) {
  return (state.attempts || []).map(a => SOURCES[a.provider] + "：" +
    ({ "no-match": "未找到同版本", cooldown: "限流冷却中", deadline: "超时预算用尽", "request-or-format": "请求或格式失败", matched: "匹配成功" }[a.result] || a.result.replace("http-", "HTTP "))).join("；");
}
function spotifyHeaders(ctx, accept = "application/x-protobuf") {
  const auth = header(ctx.request.headers, "Authorization");
  if (!/^Bearer [^\s]+$/i.test(auth)) return null;
  // Reuse only in-flight credentials, only for this request's Spotify host.
  const headers = { Authorization: auth, Accept: accept, [INTERNAL]: "1" };
  for (const name of ["client-token", "app-platform", "spotify-app-version"]) {
    const value = header(ctx.request.headers, name); if (value) headers[name] = value;
  }
  return headers;
}
function cacheMetadata(state, parsed) {
  state.cache.put("meta:" + parsed.meta.id, parsed.meta);
  if (parsed.hasLyrics !== null) state.cache.put("availability:" + parsed.meta.id, parsed.hasLyrics, 300000);
}
async function metadata(ctx, host, id, state) {
  const key = "meta:" + id, cached = state.cache.get(key);
  if (goodObject(cached) && cached.id === id) return cached;
  const headers = spotifyHeaders(ctx); if (!headers) return null;
  const hex = base62Hex(id);
  try {
    const response = await http(ctx, "https://" + host + "/metadata/4/track/" + hex, state, { headers });
    const parsed = parseMetadata(response.bytes, hex); cacheMetadata(state, parsed); return parsed.meta;
  } catch (e) {
    // Authentication failures are not a reason to try a different endpoint.
    if (/^http-(?:401|403|429)$/.test(str(e.message))) throw e;
  }
  const body = dataField(2, join([stringField(1, "spotify:track:" + id), dataField(2, numberField(1, 10))]));
  const response = await http(ctx, "https://" + host + "/extended-metadata/v0/extended-metadata", state,
    { headers: { ...headers, "Content-Type": "application/x-protobuf" }, body });
  const record = extendedTracks(response.bytes).records.find(r => r.meta.id === id);
  if (!record) throw new Error("extended-track-missing");
  cacheMetadata(state, record); return record.meta;
}
async function nativeAvailable(ctx, host, id, state) {
  const known = state.cache.get("availability:" + id);
  if (known === false) return false;
  const headers = spotifyHeaders(ctx, "application/json"); if (!headers) throw new Error("native-no-auth");
  const response = await http(ctx, "https://" + host + "/color-lyrics/v2/track/" + id + "?format=json", state, { headers }, true);
  if (response.status === 404) { state.cache.put("availability:" + id, false, 300000); return false; }
  const doc = parseDocument(response.bytes, header(response.headers, "Content-Type"));
  if (doc.blocked) throw new Error("native-access");
  if (doc.format === "json" && !Object.hasOwn(doc.obj, "lyrics")) throw new Error("native-unknown-shape");
  const available = doc.words.some(s => clean(s));
  state.cache.put("availability:" + id, available, 300000); return available;
}
async function translate(ctx, original, state) {
  const language = state.settings.language, translated = new Map(), pending = [];
  for (const s of new Set(original)) {
    if (!clean(s) || !/[\p{L}\p{N}]/u.test(s) || s.includes("\n") || s.length > 3000) continue;
    const cached = state.cache.get("translation:" + language + ":" + s);
    if (typeof cached === "string") translated.set(s, cached); else pending.push(s);
  }
  const base = "https://translate.googleapis.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=" + encodeURIComponent(language);
  const groups = []; let group = [], size = base.length;
  for (const s of pending) {
    const n = encodeURIComponent(s).length + 3;
    if (n + base.length > 6800) continue;
    if (group.length && (size + n > 6800 || group.length >= 32)) { groups.push(group); group = []; size = base.length; }
    group.push(s); size += n;
  }
  if (group.length) groups.push(group);
  for (let i = 0; i < groups.length && Date.now() + 250 < state.deadline; i += 2) {
    await Promise.all(groups.slice(i, i + 2).map(async rows => {
      try {
        const data = await json(ctx, base + rows.map(s => "&q=" + encodeURIComponent(s)).join(""), state);
        if (!Array.isArray(data) || data.length !== rows.length) throw new Error("translation-count");
        const values = data.map(x => typeof x === "string" ? x : Array.isArray(x) && typeof x[0] === "string" ? x[0] : null);
        if (values.some(x => x === null || !clean(x))) throw new Error("translation-shape");
        rows.forEach((s, j) => { const v = clean(values[j]); translated.set(s, v); state.cache.put("translation:" + language + ":" + s, v, 7 * 86400000); });
      } catch { /* Failed groups leave their original lines unchanged. */ }
    }));
  }
  let changed = 0;
  const translations = original.map(s => {
    const t = translated.get(s);
    if (!t || normal(t) === normal(s)) return "";
    changed++; return t;
  });
  return { translations, changed };
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
export default async function(ctx) {
  if (!ctx.request) {
    let s, events, config; try { s = ctx.storage.getJSON(STATUS); events = ctx.storage.getJSON(EVENTS); config = settings(ctx.env); } catch { }
    return { type: "widget", padding: 14, children: [
      { type: "text", text: "VerseLyrics " + VERSION, font: { size: "headline" } },
      { type: "text", text: config ? "补源：" + config.provider + " · 无词发现：" + (config.discover ? "开" : "关") + " · 翻译：" + (config.translate ? "开" : "关") : "设置无效" },
      { type: "text", text: s?.message || "等待 Spotify 歌词请求；翻译默认关闭，请在模块设置开启。" },
      { type: "text", text: s?.at || "" },
      ...(Array.isArray(events) ? events.slice(-6).filter(e => goodObject(e) && typeof e.message === "string").reverse().map(e =>
        ({ type: "text", text: [e.at, e.route, e.trackId || "", e.httpStatus || "", e.message].join(" · "), font: { size: "footnote" } })) : [])
    ] };
  }
  const url = str(ctx.request.url), lyric = LYRIC_URL.exec(url), metaURL = META_URL.exec(url), extended = EXTENDED_URL.exec(url), scroll = SCROLL_URL.exec(url);
  if ((!lyric && !metaURL && !extended && !scroll) || header(ctx.request.headers, INTERNAL)) return;
  let config;
  try { config = settings(ctx.env); } catch { status(ctx, "设置无效，已保留原响应。"); return; }
  if (!ctx.response) {
    if (lyric ? !config.translate && config.provider === "off" : !config.discover || config.provider === "off") return;
    const headers = ctx.request.headers;
    for (const name of ["If-None-Match", "If-Modified-Since", "Accept-Encoding", "Cache-Control"]) headers.delete(name);
    headers.set("Accept-Encoding", "identity"); headers.set("Cache-Control", "no-cache");
    return { headers };
  }
  const code = ctx.response.status;
  if (header(ctx.response.headers, MARKER)) return;
  if (code !== 200 && !(lyric && code === 404)) { status(ctx, "Spotify HTTP " + code + "，保留原响应，不将鉴权或服务错误当成无词。"); return; }
  if (lyric && code === 200 && !config.translate && config.provider === "off") return;
  let bytes;
  try { bytes = new Uint8Array(await ctx.response.arrayBuffer()); } catch { status(ctx, "无法读取响应，保留原响应。"); return; }
  const unchanged = () => ({ body: bytes });
  if (bytes.length > LIMIT) return unchanged();
  const state = { settings: config, cache: loadCache(ctx), deadline: Date.now() + 20000 };
  try {
    if (scroll) {
      const card = scrollDocument(bytes, header(ctx.response.headers, "Content-Type"), scroll[2]);
      if (card.hasLyrics) { status(ctx, "播放器已下发歌词卡片，等待实际歌词请求。"); return unchanged(); }
      if (!config.discover || config.provider === "off") { status(ctx, "播放器没有歌词卡片；无词发现或备用源已关闭，请在模块设置开启。"); return unchanged(); }
      const cached = state.cache.get("lyrics:" + config.provider + ":" + scroll[2]);
      let ready = goodObject(cached) && Array.isArray(cached.lyrics?.lines) && cached.lyrics.lines.some(l => clean(l.words));
      let source = ready ? cached.lyrics.providerDisplayName : "Spotify";
      if (!ready) {
        try { ready = await nativeAvailable(ctx, scroll[1], scroll[2], state); }
        catch { status(ctx, "播放器没有歌词卡片；未能确认 Spotify 原词状态（鉴权、服务错误或未知响应），已保留原列表。"); return unchanged(); }
      }
      if (!ready) {
        let meta; try { meta = await metadata(ctx, scroll[1], scroll[2], state); } catch { }
        if (!meta) { status(ctx, "播放器没有歌词卡片；Spotify 无词，但歌曲信息不可核对，无法补源。"); return unchanged(); }
        const doc = await backup(ctx, meta, state); ready = Boolean(doc); source = doc?.lyrics.providerDisplayName;
        if (!ready) { status(ctx, "播放器没有歌词卡片；未补入卡片。" + sourceReport(state)); return unchanged(); }
      }
      status(ctx, "已为此曲补入原生歌词卡片（" + source + "）；备用歌词已就绪，等待客户端请求。若界面仍无卡片，请切歌后重试并检查后续 lyrics 记录。");
      return { headers: responseHeaders(ctx, card.format), body: card.add() };
    }
    if (extended) {
      if (/json/i.test(header(ctx.response.headers, "Content-Type"))) { status(ctx, "已命中批量元数据，但当前 JSON 结构未适配；保留响应，等待播放器卡片请求。"); return unchanged(); }
      const batch = extendedTracks(bytes), selected = [];
      for (const record of batch.records) cacheMetadata(state, record);
      if (config.discover && config.provider !== "off") {
        for (const record of batch.records.filter(r => r.hasLyrics === false).slice(0, 3)) {
          if (await backup(ctx, record.meta, state)) selected.push(record);
          if (Date.now() + 250 >= state.deadline) break;
        }
      }
      status(ctx, "批量元数据：缓存 " + batch.records.length + " 首歌曲信息；" + (selected.length ? "确认 " + selected.length + " 首有备用歌词并设置有词标记。" : "未更改有词标记。" + sourceReport(state)));
      return selected.length ? { headers: responseHeaders(ctx, "protobuf"), body: batch.writeFlags(selected) } : unchanged();
    }
    if (metaURL) {
      if (/json/i.test(header(ctx.response.headers, "Content-Type"))) { status(ctx, "旧版元数据返回未适配的 JSON；保留响应。"); return unchanged(); }
      const parsed = parseMetadata(bytes, metaURL[2]);
      cacheMetadata(state, parsed);
      if (parsed.hasLyrics !== false || !config.discover || config.provider === "off") {
        status(ctx, "已缓存歌曲信息；" + (parsed.hasLyrics === true ? "Spotify 标记有词。" : !config.discover ? "无词发现已关闭，请在模块设置开启。" : "未修改有词标记。")); return unchanged();
      }
      const doc = await backup(ctx, parsed.meta, state);
      if (!doc) { status(ctx, "无原词歌曲未找到严格匹配的备用歌词，保留原状态。" + sourceReport(state)); return unchanged(); }
      status(ctx, "已找到 " + doc.lyrics.providerDisplayName + " 歌词；客户端再次请求时提供。");
      return { headers: responseHeaders(ctx, "protobuf"), body: replaceField(parsed.fs, 18, numberField(18, 1)) };
    }
    const contentType = header(ctx.response.headers, "Content-Type");
    let doc, generated = null;
    if (code === 200) {
      doc = parseDocument(bytes, contentType);
      if (doc.blocked) { status(ctx, "Spotify 返回账户权限提示，保留原响应。"); return unchanged(); }
      // Unknown schemas and malformed successful responses are never called 'no lyrics'.
      if (!doc.words.some(s => clean(s))) {
        if (doc.format === "json" && !Object.hasOwn(doc.obj, "lyrics")) return unchanged();
      }
    }
    if (code === 404 || (doc && !doc.words.some(s => clean(s)))) {
      if (config.provider === "off") return unchanged();
      let meta; try { meta = await metadata(ctx, lyric[1], lyric[2], state); } catch { }
      if (!meta) { status(ctx, "Spotify 无词，但未取得可核对的歌曲信息，保留原响应。"); return unchanged(); }
      generated = await backup(ctx, meta, state);
      if (!generated) { status(ctx, "备用歌词未取得，保留原响应。" + sourceReport(state)); return unchanged(); }
      const accept = header(ctx.request.headers, "Accept");
      const wantsJSON = doc ? doc.format === "json" : /(?:^|[?&])format=json(?:&|$)/.test(url) || (!/protobuf|octet-stream/i.test(accept) && (/json/i.test(accept) || /json/i.test(contentType)));
      doc = parseDocument(encodeDocument(generated, wantsJSON ? "json" : "protobuf"), wantsJSON ? "application/json" : "application/x-protobuf");
    }
    if (!doc || !doc.words.length) return unchanged();
    const nativeState = doc.nativeState(config.language);
    if (config.translate && nativeState !== "missing") {
      status(ctx, nativeState === "present" ? "已保留 Spotify 自带的同语种翻译；请使用 Spotify 原生翻译按钮。" : "译文结构无法安全适配，已保留原生歌词；不会改为拼接双语文本。");
      if (!generated) return unchanged();
    }
    const result = config.translate && nativeState === "missing" ? await translate(ctx, doc.words, state) : { translations: [], changed: 0 };
    if (!generated && !result.changed) {
      status(ctx, "保留 Spotify 原词；未取得可添加的原生译文。");
      return unchanged();
    }
    const body = result.changed ? doc.writeNative(config.language, result.translations) : encodeDocument(generated, doc.format);
    status(ctx, (generated ? "备用来源：" + generated.lyrics.providerDisplayName : "Spotify 原词") + "；已提供 " + result.changed + " 句独立译文（" + config.language + "），显示由 Spotify 原生翻译界面决定。");
    return { ...(generated ? { status: 200 } : {}), headers: responseHeaders(ctx, doc.format), body };
  } catch { status(ctx, "响应结构不支持或处理失败，已保留原响应。"); return unchanged(); }
  finally { state.cache.save(); }
}
export { fields, uint, dataField, stringField, numberField, join, utf8, text, base62Hex, hexBase62,
  parseDocument, encodeDocument, parseMetadata, extendedTracks, scrollDocument, nativeTranslationState, languageFamily, settings, matches, lrc, translate, sourceLyrics, loadCache, LANGUAGES, LYRIC_URL, META_URL, EXTENDED_URL, SCROLL_URL };
