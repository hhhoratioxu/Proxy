// Original VerseLyrics native host bridge, adapter 2 (core 0.4.4).
// CLIENT is fixed at build time, never inferred from another app's globals.
const CLIENT = "__CLIENT__";
const nativeQX = CLIENT === "QuantumultX";
let nativeFinished = false;
function nativeDone(value) {
  if (nativeFinished) return;
  nativeFinished = true;
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
function nativeBytes(value) {
  if (value == null) return new Uint8Array(0);
  if (typeof value === "string") return utf8(value);
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
  const bytes = nativeBytes(data);
  return {status: nativeStatus(status), headers: new NativeHeaders(headers), arrayBuffer: async () => nativeBuffer(bytes)};
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
function nativeHTTP(method, url, options = {}) {
  if (nativeFinished) return Promise.reject(new Error("finished"));
  const ms = Math.max(1, Math.min(5500, Number(options.timeout) || 5500));
  return new Promise((resolve, reject) => {
    let settled = false, timer;
    function complete(error, response, data) {
      if (settled) return;
      settled = true;
      if (timer !== undefined && typeof clearTimeout === "function") clearTimeout(timer);
      // Release promise closures even on hosts without clearTimeout. Otherwise
      // a settled timer may keep its response buffer alive until it fires.
      const finish = resolve, fail = reject; resolve = reject = null;
      if (nativeFinished || error) { fail(new Error("native http failed")); return; }
      try { finish(nativeResponse(response.statusCode ?? response.status, response.headers, data)); }
      catch { fail(new Error("invalid native http response")); }
    }
    // Do not rely on timeout units or cancellation APIs that differ by host.
    // Clear timers when supported; settled guards all late callbacks.
    timer = setTimeout(() => complete(true), ms);
    try {
      const request = {url, headers: options.headers || {}};
      if (nativeQX) {
        request.method = method.toUpperCase();
        request.opts = {redirection: false, "auto-cookie": false, "skip-cert-verify": false};
        if (options.body !== undefined) {
          if (typeof options.body === "string") request.body = options.body;
          else request.bodyBytes = nativeBuffer(nativeBytes(options.body));
        }
        $task.fetch(request).then(r => complete(null, r, r.bodyBytes ?? r.body), () => complete(true));
      } else {
        request.timeout = CLIENT === "Loon" ? ms : ms / 1000;
        request["binary-mode"] = true;
        request["auto-redirect"] = false;
        request["auto-cookie"] = false;
        request.insecure = false;
        if (options.body !== undefined) request.body = options.body;
        $httpClient[method](request, complete);
      }
    } catch { complete(true); }
  });
}
const nativeStorage = {
  getJSON(key) {
    try {
      const raw = nativeQX ? $prefs.valueForKey(key) : $persistentStore.read(key);
      return raw ? JSON.parse(raw) : null;
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
  let original;
  if (typeof $response !== "undefined" && $response) {
    original = nativeBytes(nativeQX ? $response.bodyBytes ?? $response.body : $response.body);
    ctx.response = nativeResponse($response.statusCode ?? $response.status, $response.headers, original);
  }
  setTimeout(() => nativeDone({}), ctx.response ? 23000 : 2500);
  const result = await verseLyricsCore(ctx);
  if (!result || nativeFinished) return nativeDone({});
  // An unchanged byte result must remain passthrough, including an empty 404.
  if (!result.headers && result.status === undefined && result.body && original &&
      result.body.length === original.length && result.body.every((b, i) => b === original[i])) return nativeDone({});
  const output = {};
  if (result.headers) output.headers = result.headers.native();
  if (result.status !== undefined) output.status = nativeQX ? "HTTP/1.1 " + result.status + (result.status === 200 ? " OK" : "") : result.status;
  if (result.body !== undefined && ctx.response) {
    const bytes = nativeBytes(result.body);
    if (nativeQX) output.bodyBytes = nativeBuffer(bytes); else output.body = bytes;
  }
  nativeDone(output);
}
nativeMain().catch(() => nativeDone({}));
