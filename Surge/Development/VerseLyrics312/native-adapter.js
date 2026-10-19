// Original VerseLyrics native host bridge, adapter 14 (core 3.1.2).
// CLIENT is fixed at build time, never inferred from another app's globals.
const CLIENT = "__CLIENT__";
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
    this.source = value || {}; this.array = Array.isArray(value); this.pairs = null;
  }
  get(name) {
    name = name.toLowerCase();
    if (this.pairs) {
      const pair = this.pairs.find(x => x[0].toLowerCase() === name);
      return pair ? String(pair[1]) : null;
    }
    if (this.array) {
      const pair = this.source.find(x => x.field.toLowerCase() === name);
      return pair ? String(pair.value) : null;
    }
    for (const key in this.source) if (Object.hasOwn(this.source,key) && key.toLowerCase() === name) return String(this.source[key]);
    return null;
  }
  materialize() {
    if (!this.pairs) this.pairs = this.array ? this.source.map(x => [x.field,x.value]) : Object.entries(this.source);
    return this.pairs;
  }
  delete(name) {
    const pairs = this.materialize(), key = name.toLowerCase(); let kept = 0;
    for (let i = 0; i < pairs.length; i++) if (pairs[i][0].toLowerCase() !== key) pairs[kept++] = pairs[i];
    pairs.length = kept;
  }
  set(name, value) { this.delete(name); this.pairs.push([name, String(value)]); }
  native() {
    return this.pairs ? this.array ? this.pairs.map(([field,value]) => ({field,value})) : Object.fromEntries(this.pairs) : this.source;
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
  return {status: nativeStatus(status), headers: new NativeHeaders(headers), boundedBytes,
    boundedText(limit) { return typeof data === "string" ? {text:data,byteLength:utf8Size(data,limit)} : null; },
    arrayBuffer: async () => nativeBuffer(boundedBytes())};
}
function nativeArguments() {
  const allowed = ["TRANSLATION_ENABLED", "TARGET_LANGUAGE", "FALLBACK_PROVIDER", "DISCOVER_MISSING", "SOURCE_TRANSLATIONS", "PREFERRED_SOURCE", "MEMORY_MODE", "FETCH_ARTWORK_COLOR", "FALLBACK_OFFSET_MS", "FALLBACK_MODE", "NETWORK_MODE"];
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
function nativeHTTP(method, url, options = {}, asText = false) {
  if (nativeFinished) return Promise.reject(new Error("transport-pending"));
  const ms = Math.max(1, Math.min(2500, Number(options.timeout) || 2500));
  // QX documents a script-exit timer, not a per-fetch cancellation API.
  // One lazy watchdog covers the whole run; cache/entry work creates no timer.
  // Loon/Surge use their native HTTP and script timeouts instead.
  if (nativeQX && !nativeWatchdogStarted) {
    nativeWatchdogStarted = true;
    nativeWatchdog = setTimeout(() => nativeDone({}), Math.max(1, nativeDeadline - Date.now()));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    function complete(error, response, data) {
      if (settled) return;
      settled = true;
      // Release promise closures after the native transport settles.
      const finish = resolve, fail = reject; resolve = reject = null;
      if (nativeFinished || error) {
        const timedOut = /timeout|timed\s*out|abort/i.test(String(error?.error || error?.message || error || ""));
        const failure = new Error(nativeFinished ? "transport-pending" : timedOut ? "native http timeout" : "native http failed");
        failure.pendingTransport = nativeFinished;
        fail(failure); return;
      }
      try { finish(nativeResponse(response.statusCode ?? response.status, response.headers, data)); }
      catch { fail(new Error("invalid native http response")); }
    }
    try {
      const request = {url, headers: options.headers || {}};
      if (nativeQX) {
        request.method = method.toUpperCase();
        request.opts = {redirection: false, "auto-cookie": false, "skip-cert-verify": false};
        if (options.body !== undefined) {
          if (typeof options.body === "string") request.body = options.body;
          else request.bodyBytes = nativeBuffer(nativeBytes(options.body));
        }
        $task.fetch(request).then(r => {
          if (nativeFinished) complete("finished");
          else complete(null, r, r.bodyBytes ?? r.body);
        }, error => complete(error || true));
      } else {
        request.timeout = CLIENT === "Loon" ? ms : ms / 1000;
        request["binary-mode"] = !asText;
        request["auto-redirect"] = false;
        request["auto-cookie"] = false;
        request.insecure = false;
        if (options.body !== undefined) request.body = options.body;
        $httpClient[method](request, complete);
      }
    } catch (error) { complete(error || true); }
  });
}
const nativeStorage = {
  get(key) { return nativeQX ? $prefs.valueForKey(key) : $persistentStore.read(key); },
  set(key, raw) {
    if (nativeFinished) return;
    if (nativeQX) $prefs.setValueForKey(raw, key); else $persistentStore.write(raw, key);
  },
  getJSON(key) {
    try {
      const raw = nativeStorage.get(key);
      return typeof raw === "string" && raw.length <= 128000 ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  setJSON(key, value) {
    if (nativeFinished) return;
    nativeStorage.set(key, JSON.stringify(value));
  }
};
async function nativeMain() {
  if (typeof $request === "undefined" || !$request?.url) return nativeDone({});
  const ctx = {
    request: {url: $request.url, method: $request.method, headers: new NativeHeaders($request.headers)},
    env: nativeArguments(), storage: nativeStorage,
    http: {get: (url, opts) => nativeHTTP("get", url, opts), post: (url, opts) => nativeHTTP("post", url, opts),
      // Loon documents UTF-8 string responses, falling back to Uint8Array for
      // invalid UTF-8. Use it only for explicit text-service requests.
      ...(CLIENT === "Loon" ? {getText: (url, opts) => nativeHTTP("get", url, opts, true)} : {})}
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
