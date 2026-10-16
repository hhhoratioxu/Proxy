(() => {
"use strict";
/* VerseLyrics 0.4.10 lightweight request hook. Generated from the shared core. */
const INTERNAL = "x-verselyrics-internal";
const HOST = "(?:spclient\\.wg|[a-z0-9-]+-spclient)\\.spotify\\.com";
const LYRIC_URL = new RegExp("^https://(" + HOST + ")(?::443)?/color-lyrics/v2/track/([0-9A-Za-z]{22})(?:/image/[^?#\\s]+)?/?(?:\\?.*)?$");
const META_URL = new RegExp("^https://(" + HOST + ")(?::443)?/metadata/4/track/([0-9a-f]{32})(?:\\?.*)?$");
const EXTENDED_URL = new RegExp("^https://(" + HOST + ")(?::443)?/extended-metadata/v0/extended-metadata/?(?:\\?.*)?$");
const SCROLL_URL = new RegExp("^https://(" + HOST + ")(?::443)?/scrollsita/v1/scroll/spotify(?::|%3[aA])track(?::|%3[aA])([0-9A-Za-z]{22})/?(?:\\?.*)?$");
const LANGUAGES = ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "ar", "hi", "id", "vi", "th", "tr", "nl", "pl", "sv", "uk", "he", "fa", "ms", "el"];
const SOURCES = { lrclib: "LRCLIB", qq: "QQ 音乐", netease: "网易云音乐", kugou: "酷狗音乐", kuwo: "酷我音乐", lyricsovh: "lyrics.ovh" };
const LYRICS_GATE_URL = new RegExp("^https://(" + HOST + ")(?::443)?/(?:user-customization-service/v1/customize|bootstrap/v1/bootstrap|v1/customize)/?(?:\\?.*)?$");
const PLAYER_ENTRY_URL = new RegExp("^https://(" + HOST + ")(?::443)?/(?:context-resolve/v1/spotify(?::|%3[aA])[^?#\\s/]{1,512}|connect-state/v1/devices/[0-9A-Za-z_-]{16,128})/?(?:\\?.*)?$");
const str = x => typeof x === "string" ? x : "";
const truth = x => x === true || x === "true";
function header(h, name) {
  if (typeof h?.get === "function") return h.get(name) || "";
  const k = Object.keys(h || {}).find(k => k.toLowerCase() === name.toLowerCase());
  return k ? str(h[k]) : "";
}
function settings(env = {}) {
  const provider = str(env.FALLBACK_PROVIDER) || "auto";
  const language = str(env.TARGET_LANGUAGE) || "zh-CN";
  if (!LANGUAGES.includes(language) || !["auto", "off", ...Object.keys(SOURCES)].includes(provider)) throw new Error("settings-invalid");
  return { translate: env.TRANSLATION_ENABLED == null || env.TRANSLATION_ENABLED === "" ? true : truth(env.TRANSLATION_ENABLED), language, provider, discover: env.DISCOVER_MISSING == null || env.DISCOVER_MISSING === "" ? true : truth(env.DISCOVER_MISSING) };
}
function fallbackFormat(ctx, existing) {
  if (existing) return existing.format;
  const url = str(ctx.request.url), accept = header(ctx.request.headers, "Accept");
  const explicit = /(?:^|[?&])format=(json|protobuf)(?:&|$)/i.exec(url)?.[1].toLowerCase();
  if (explicit) return explicit;
  if (/protobuf|octet-stream/i.test(accept)) return "protobuf";
  if (/(?:^|[,;\s])application\/(?:[a-z0-9.+-]+\+)?json(?:[,;\s]|$)/i.test(accept)) return "json";
  // An error's MIME type describes the error envelope, not the native client's
  // lyric decoder. Wildcard/absent Accept on this native endpoint uses protobuf.
  return "protobuf";
}
async function verseLyricsCore(ctx) {
  if (!ctx.request || ctx.response || header(ctx.request.headers, INTERNAL)) return;
  const url=str(ctx.request.url), lyric=LYRIC_URL.test(url);
  if(!lyric && ![META_URL,EXTENDED_URL,SCROLL_URL,LYRICS_GATE_URL,PLAYER_ENTRY_URL].some(r=>r.test(url)))return;
  let config;try{config=settings(ctx.env);}catch{return;}
  if(lyric ? !config.translate && config.provider === "off" : !config.discover || config.provider === "off")return;
  const headers=ctx.request.headers;
  for(const name of ["If-None-Match","If-Modified-Since","Accept-Encoding","Cache-Control"])headers.delete(name);
  headers.set("Accept-Encoding","identity");headers.set("Cache-Control","no-cache");
  if(lyric && fallbackFormat(ctx)==="protobuf" && !/protobuf|octet-stream|json/i.test(header(headers,"Accept")))headers.set("Accept","application/x-protobuf");
  return {headers};
}

// Original VerseLyrics native host bridge, adapter 8 (core 0.4.10).
// CLIENT is fixed at build time, never inferred from another app's globals.
const CLIENT = "Shadowrocket";
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

try {
  if(typeof $request === "undefined" || !$request?.url || (typeof $response !== "undefined" && $response)) nativeDone({});
  else Promise.resolve(verseLyricsCore({request:{url:$request.url,headers:new NativeHeaders($request.headers)},env:nativeArguments()}))
    .then(r=>nativeDone(r?.headers?{headers:r.headers.native()}:{}),()=>nativeDone({}));
} catch { nativeDone({}); }

})();
