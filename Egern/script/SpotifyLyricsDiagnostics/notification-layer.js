// Original notification adapter. Appended to the original VerseLyrics source
// by build.mjs; it does not need runtime imports or a separately run script.
const DIAGNOSTIC_VERSION = "0.3.3-diag.1";
const DIAGNOSTIC_KEY = "VerseLyrics.diagnostics.1";
const DIAGNOSTIC_HEARTBEAT = "VerseLyrics.diagnostics.1.heartbeat";
const DIAGNOSTIC_HOST = new RegExp("^https://" + HOST + "(?::443)?/");
const DIAGNOSTIC_FAMILIES = new Set([
  "color-lyrics", "lyrics", "metadata", "extended-metadata", "scrollsita",
  "context-resolve", "connect-state", "now-playing-view", "nowplaying-view",
  "gander", "pathfinder", "social-connect", "player", "spclient-metadata"
]);
const DIAGNOSTIC_ERRORS = new Set([
  "body-limit", "unknown-format", "json-shape", "line-shape", "line-limit",
  "lyrics-container", "scroll-shape", "scroll-format", "scroll-structure",
  "scroll-sections", "metadata-id", "metadata-incomplete", "metadata-lyrics-flag",
  "extended-track-limit", "integer", "truncated-varint", "overflow-varint",
  "long-varint", "field-limit", "bad-tag", "bad-field-number", "bad-length",
  "unsupported-wire", "truncated-field", "native-line-count", "settings-invalid"
]);
function diagnosticVersion(value) {
  return typeof value === "string" && /^\d[\d.]{0,31}$/.test(value) ? value : "未知";
}
function diagnosticError(error) {
  if (DIAGNOSTIC_ERRORS.has(error?.message)) return error.message;
  return ["SyntaxError", "URIError", "TypeError", "RangeError"].includes(error?.name) ? error.name : "processing-error";
}
function diagnosticRoute(url) {
  const lyric = LYRIC_URL.exec(url), meta = META_URL.exec(url), card = SCROLL_URL.exec(url);
  if (lyric) return { route: "lyrics", trackId: lyric[2], known: true };
  if (card) return { route: "player-cards", trackId: card[2], known: true };
  if (meta) return { route: "metadata", trackId: hexBase62(meta[2]), known: true };
  if (EXTENDED_URL.test(url)) return { route: "extended-metadata", known: true };
  // Record only allowlisted API families. Never keep a full URL, query,
  // arbitrary path, response payload, account identifier or request headers.
  const family = str(url).replace(DIAGNOSTIC_HOST, "").split(/[/?#]/, 1)[0];
  return { route: DIAGNOSTIC_FAMILIES.has(family) ? family + "-other" : "other-spotify", known: false };
}
function diagnosticRead(ctx) {
  try {
    const data = ctx.storage.getJSON(DIAGNOSTIC_KEY);
    if (goodObject(data) && data.version === DIAGNOSTIC_VERSION) {
      return { events: Array.isArray(data.events) ? data.events.slice(-12) : [],
        sent: goodObject(data.sent) ? data.sent : {}, budget: Array.isArray(data.budget) ? data.budget : [] };
    }
  } catch { }
  return { events: [], sent: {}, budget: [] };
}
function diagnosticSave(ctx, data) {
  try { ctx.storage.setJSON(DIAGNOSTIC_KEY, { ...data, version: DIAGNOSTIC_VERSION }); } catch { }
}
function diagnosticReport(ctx, events) {
  let config; try { config = settings(ctx.env); } catch { }
  const rows = ["VerseLyrics 诊断 " + DIAGNOSTIC_VERSION,
    "歌词处理器 " + VERSION + " · Egern " + diagnosticVersion(ctx.app?.version),
    config ? "备用源 " + config.provider + " · 无词发现 " + (config.discover ? "开" : "关") + " · 翻译 " + (config.translate ? "开" : "关") : "设置无效"];
  for (const e of events.slice(-10)) {
    rows.push([e.at, e.route, e.trackId || "", e.upstream ? "HTTP " + e.upstream + (e.output !== e.upstream ? " → " + e.output : "") : "", e.spotifyVersion && e.spotifyVersion !== "未知" ? "Spotify " + e.spotifyVersion : "", e.message,
      e.error || "", Number.isInteger(e.rows) ? e.rows + " 行" : "",
      typeof e.hasAuth === "boolean" ? "请求鉴权 " + (e.hasAuth ? "有" : "无") : "",
      typeof e.metaCached === "boolean" ? "歌曲信息缓存 " + (e.metaCached ? "有" : "无") : "",
      e.encoding ? "响应编码 " + e.encoding : "",
      Array.isArray(e.services) && e.services.length ? e.services.map(s => s.service + " " + s.status).join("；") : ""].filter(Boolean).join(" · "));
  }
  if (!events.some(e => e.route !== "heartbeat")) rows.push("定时诊断已运行，尚未读取到接口记录；请同时查看播放时是否出现其他诊断通知。");
  return rows.join("\n").slice(0, 7500);
}
function diagnosticNotify(ctx, event, category, force = false) {
  try {
    const data = diagnosticRead(ctx), now = Date.now();
    const signature = JSON.stringify([event.route, event.trackId, event.upstream, event.output, event.message, event.error, event.rows]);
    data.events.push(event); data.events = data.events.slice(-12);
    const previous = data.sent[category];
    const duplicate = previous && (category === "other" || previous.signature === signature) && now - previous.at < 60000;
    data.budget = data.budget.filter(at => Number.isFinite(at) && now - at < 60000);
    const eligible = force || (!duplicate && data.budget.length < 6);
    // A notification failure must never change or discard a lyric response.
    if (eligible && typeof ctx.notify === "function") {
      try {
        ctx.notify({
          title: event.route === "heartbeat" ? "Spotify 歌词诊断已运行" : "Spotify 歌词诊断 · " + event.route,
          subtitle: "点此复制记录，粘贴回对话",
          body: event.message.slice(0, 260), sound: false,
          action: { type: "clipboard", text: diagnosticReport(ctx, data.events) }
        });
        data.sent[category] = { at: now, signature };
        if (!force) data.budget.push(now);
      } catch { }
    }
    diagnosticSave(ctx, data);
  } catch { }
}
function diagnosticEvent(ctx, route, message, extra = {}) {
  return { at: new Date().toISOString(), route: route.route, ...(route.trackId ? { trackId: route.trackId } : {}),
    spotifyVersion: diagnosticVersion(header(ctx.request?.headers, "spotify-app-version")),
    message, ...extra };
}
export default async function diagnoseLyrics(ctx) {
  if (!ctx.request) {
    // The scheduled notification provides an entry even when no intercepted
    // request arrives. It must not be interpreted as proof of HTTPS interception.
    let count = 0; try { count = Number(ctx.storage.getJSON(DIAGNOSTIC_HEARTBEAT)) || 0; } catch { }
    if (!ctx.cron || count < 2) {
      diagnosticNotify(ctx, diagnosticEvent(ctx, { route: "heartbeat" }, "诊断版已运行。播放《那页夏天》并打开播放页；收到接口诊断通知后，点通知复制记录。"), "heartbeat", true);
      try { ctx.storage.setJSON(DIAGNOSTIC_HEARTBEAT, count + 1); } catch { }
    }
    if (ctx.cron) return;
    return handleLyrics(ctx);
  }
  const url = str(ctx.request.url);
  if (!DIAGNOSTIC_HOST.test(url) || header(ctx.request.headers, INTERNAL)) return;
  const route = diagnosticRoute(url);
  if (!ctx.response) return route.known ? handleLyrics(ctx) : undefined;
  const upstream = ctx.response.status;
  if (!route.known) {
    diagnosticNotify(ctx, diagnosticEvent(ctx, route, "已看到 Spotify 接口响应；这一条不是当前适配的歌词或入口请求。", { upstream, output: upstream }), "other");
    return;
  }
  const wasMarked = Boolean(header(ctx.response.headers, MARKER));
  const encodingHeader = header(ctx.response.headers, "Content-Encoding").toLowerCase();
  const encoding = ["gzip", "br", "deflate", "identity"].includes(encodingHeader) ? encodingHeader : encodingHeader ? "other" : "identity";
  const requestInfo = route.route === "lyrics" ? {
    hasAuth: /^Bearer [^\s]+$/i.test(header(ctx.request.headers, "Authorization")),
    metaCached: goodObject(loadCache(ctx).get("meta:" + route.trackId))
  } : {};
  if (route.route === "lyrics") {
    diagnosticNotify(ctx, diagnosticEvent(ctx, route, "已收到实际歌词请求，正在处理。", { upstream, output: upstream, ...requestInfo, encoding }), "lyrics-start");
  }
  let freshStatus, failure; const services = [];
  // Capture the status written by THIS invocation, using a small adapter over
  // documented storage methods. Do not rely on another script's storage scope
  // or reuse an unrelated cached song's last message.
  const storage = {
    getJSON(key) {
      try { return ctx.storage.getJSON(key); }
      catch (error) { if (key === STATUS || key === EVENTS) return null; throw error; }
    },
    setJSON(key, value) {
      if (key === STATUS) freshStatus = value;
      if (key === EVENTS && Array.isArray(value)) freshStatus = value[value.length - 1];
      return ctx.storage.setJSON(key, value);
    }
  };
  async function request(method, url, options) {
    const host = /^https:\/\/([^/]+)\//.exec(str(url))?.[1];
    const service = host && new RegExp("^" + HOST + "$").test(host) ? "Spotify 元数据" :
      ({ "lrclib.net": "LRCLIB", "c.y.qq.com": "QQ 音乐", "music.163.com": "网易云", "translate.googleapis.com": "Google 翻译" }[host]);
    try {
      const response = await ctx.http[method](url, options);
      if (service && services.length < 10) services.push({ service, status: Number.isInteger(response.status) ? response.status : "未知状态" });
      return response;
    } catch (error) {
      if (service && services.length < 10) services.push({ service, status: "请求失败" });
      throw error;
    }
  }
  const working = { request: ctx.request, response: ctx.response, http: { get: (u, o) => request("get", u, o), post: (u, o) => request("post", u, o) }, env: ctx.env, storage,
    diagnosticError(error) { failure = diagnosticError(error); } };
  const result = await handleLyrics(working);
  const message = wasMarked ? "响应已被另一份 VerseLyrics 处理。请临时关闭普通版，仅启用诊断版。" :
    typeof freshStatus?.message === "string" ? freshStatus.message : "已命中适配接口；本次未产生新的处理状态。";
  const output = Number.isInteger(result?.status) ? result.status : upstream;
  let rows;
  if (route.route === "lyrics" && result?.body instanceof Uint8Array) {
    try { rows = parseDocument(result.body, header(result.headers || ctx.response.headers, "Content-Type")).words.length; } catch { }
  }
  diagnosticNotify(ctx, diagnosticEvent(ctx, route, message, { upstream, output, ...requestInfo, encoding, services, ...(failure ? { error: failure } : {}), ...(Number.isInteger(rows) ? { rows } : {}) }), route.route);
  return result;
}
export { diagnosticRoute, diagnosticReport, diagnosticError };
