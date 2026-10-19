// Generated Meituan Waimai v0.2.0. Native Egern ctx API.
// Meituan Waimai v0.2.0. Original implementation; no network, storage or logging.
// Only established startup fields and narrowly scoped advertising resources.
function createMeituanCleaner() {
  "use strict";
  var own = Object.prototype.hasOwnProperty;
  var MAX_BODY = 2 * 1024 * 1024;
  var LOAD = /^https?:\/\/wmapi\.meituan\.com(?::(?:80|443))?\/api\/v[0-9]+\/loadInfo\/?(?:\?[^#]*)?$/;
  var AD = /^https?:\/\/wmapi\.meituan\.com(?::(?:80|443))?\/api\/v[0-9]+\/(?:startpicture\/?(?:\?[^#]*)?|openscreen\/?\?(?:[^&#]*&)*ad[A-Za-z0-9_]*(?:=[^&#]*)?(?:&[^#]*)?)$/;
  var IMAGE = [
    /^https?:\/\/img\.meituan\.net(?::(?:80|443))?\/bizad\/bizad_brandCpt_[0-9]+\.jpg(?:@[^/?#]+)?(?:\?[^#]*)?$/,
    /^https?:\/\/p[0-9]+\.meituan\.net(?::(?:80|443))?\/(?:bizad|brandCpt)\/[A-Za-z0-9_-]+\.jpg(?:@[^/?#]+)?(?:\?[^#]*)?$/,
    /^https?:\/\/(?:s3plus|flowplus)\.meituan\.net(?::(?:80|443))?\/v[0-9]+\/[A-Za-z0-9_-]+\/linglong\/[A-Za-z0-9_-]+\.(?:gif|jpg)(?:@[^/?#]+)?(?:\?[^#]*)?$/
  ];
  var MEDIA = [
    /^https?:\/\/(?:s3plus|flowplus)\.meituan\.net(?::(?:80|443))?\/v[0-9]+\/[A-Za-z0-9_-]+\/linglong\/[A-Za-z0-9_-]+\.mp4(?:\?[^#]*)?$/,
    /^https?:\/\/s3plus\.meituan\.net(?::(?:80|443))?\/v[0-9]+\/mss_[A-Za-z0-9_-]+\/brandcpt-vedio\/[A-Za-z0-9_-]+\.(?:zip|mp4)(?:\?[^#]*)?$/
  ];

  function record(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function statusCode(response) {
    var status = response.statusCode != null ? response.statusCode : response.status;
    if (typeof status === "number") return status;
    var match = /^(?:HTTP\/[0-9.]+\s+)?([0-9]{3})(?:\s|$)/.exec(String(status || ""));
    return match ? Number(match[1]) : 0;
  }
  function kind(url) {
    if (typeof url !== "string" || url.length > 32768) return "";
    if (LOAD.test(url)) return "load";
    if (AD.test(url)) return "ad";
    var i;
    for (i = 0; i < IMAGE.length; i++) if (IMAGE[i].test(url)) return "image";
    for (i = 0; i < MEDIA.length; i++) if (MEDIA[i].test(url)) return "media";
    return "";
  }

  // Preserve all unrelated headers and array-valued fields such as Set-Cookie.
  // Framing/encoding headers are handled by the client's body-rewrite engine.
  function headers(original, phase) {
    var next = Object.create(null);
    Object.keys(original || {}).forEach(function (key) {
      var name = key.toLowerCase();
      var remove = phase === "request" ?
        /^(if-none-match|if-modified-since|cache-control|pragma)$/ :
        /^(etag|last-modified|content-md5|digest|cache-control|expires|pragma)$/;
      if (!remove.test(name)) next[key] = original[key];
    });
    next["Cache-Control"] = phase === "request" ? "no-cache" : "no-store";
    next.Pragma = "no-cache";
    if (phase !== "request") next.Expires = "0";
    return next;
  }

  function clean(body) {
    if (typeof body !== "string" || body.length === 0 || body.length > MAX_BODY) return body;
    var data = JSON.parse(body);
    if (!record(data) || (own.call(data, "code") && data.code !== 0 && data.code !== "0") ||
        !record(data.data)) return body;
    var picture = data.data.startpicture;
    var targets = [];
    if (Array.isArray(picture) && picture.length > 0) {
      targets.push(JSON.stringify(["data", "startpicture"]));
    } else if (record(picture)) {
      ["ad", "mk"].forEach(function (key) {
        if (Array.isArray(picture[key]) && picture[key].length > 0) {
          targets.push(JSON.stringify(["data", "startpicture", key]));
        }
      });
    }
    if (targets.length === 0) return body;

    // JSON.parse validates syntax; scan original ranges without serializing any
    // business values. Ambiguous duplicate keys anywhere fail closed.
    var cursor = 0, nodes = 0, ranges = [];
    var deadline = Date.now() + 250;
    function budget() {
      if (Date.now() > deadline) throw new Error("Work budget");
    }
    function space() {
      while (cursor < body.length && /[ \t\r\n]/.test(body.charAt(cursor))) cursor++;
    }
    function stringToken() {
      var begin = cursor++;
      while (cursor < body.length) {
        if ((cursor & 4095) === 0) budget();
        var ch = body.charAt(cursor++);
        if (ch === "\\") cursor++;
        else if (ch === '"') return body.slice(begin, cursor);
      }
      throw new Error("Unterminated string");
    }
    function value(path, depth) {
      if (depth > 64 || ++nodes > 50000) throw new Error("Structure limit");
      if ((nodes & 255) === 0) budget();
      space();
      var begin = cursor, ch = body.charAt(cursor);
      if (ch === "{") {
        cursor++;
        space();
        var keys = Object.create(null);
        if (body.charAt(cursor) !== "}") {
          while (true) {
            var key = JSON.parse(stringToken());
            if (own.call(keys, key)) throw new Error("Duplicate key");
            keys[key] = true;
            space();
            if (body.charAt(cursor++) !== ":") throw new Error("Missing colon");
            value(path.concat(key), depth + 1);
            space();
            if (body.charAt(cursor) === "}") break;
            if (body.charAt(cursor++) !== ",") throw new Error("Missing comma");
            space();
          }
        }
        cursor++;
      } else if (ch === "[") {
        cursor++;
        space();
        var index = 0;
        if (body.charAt(cursor) !== "]") {
          while (true) {
            value(path.concat(index++), depth + 1);
            space();
            if (body.charAt(cursor) === "]") break;
            if (body.charAt(cursor++) !== ",") throw new Error("Missing comma");
          }
        }
        cursor++;
        if (targets.indexOf(JSON.stringify(path)) !== -1) ranges.push([begin, cursor]);
      } else if (ch === '"') {
        stringToken();
      } else {
        while (cursor < body.length && !/[\s,\]}]/.test(body.charAt(cursor))) cursor++;
        if (cursor === begin) throw new Error("Missing value");
      }
    }
    value([], 0);
    space();
    budget();
    if (cursor !== body.length || ranges.length !== targets.length) throw new Error("Ambiguous ranges");
    ranges.sort(function (a, b) { return b[0] - a[0]; });
    ranges.forEach(function (range) {
      body = body.slice(0, range[0]) + "[]" + body.slice(range[1]);
    });
    return body;
  }
  return { maxBody: MAX_BODY, kind: kind, clean: clean, headers: headers, status: statusCode,
    patterns: { load: LOAD.source, ad: AD.source,
      image: IMAGE.map(function (re) { return re.source; }),
      media: MEDIA.map(function (re) { return re.source; }) } };
}

function decodeUtf8(bytes) {
  var parts = [], chunk = "";
  for (var i = 0; i < bytes.length;) {
    var first = bytes[i++], code = first, needed = 0, minimum = 0;
    if (first < 128) { /* ASCII */ }
    else if (first >= 194 && first <= 223) { code = first & 31; needed = 1; minimum = 128; }
    else if (first >= 224 && first <= 239) { code = first & 15; needed = 2; minimum = 2048; }
    else if (first >= 240 && first <= 244) { code = first & 7; needed = 3; minimum = 65536; }
    else throw new Error("Invalid UTF-8");
    if (i + needed > bytes.length) throw new Error("Truncated UTF-8");
    for (var n = 0; n < needed; n++) {
      var next = bytes[i++];
      if ((next & 192) !== 128) throw new Error("Invalid continuation");
      code = (code << 6) | (next & 63);
    }
    if (code < minimum || code > 1114111 || (code >= 55296 && code <= 57343)) throw new Error("Invalid scalar");
    if (code > 65535) { code -= 65536; chunk += String.fromCharCode(55296 + (code >> 10), 56320 + (code & 1023)); }
    else chunk += String.fromCharCode(code);
    if (chunk.length >= 4096) { parts.push(chunk); chunk = ""; }
  }
  parts.push(chunk); return parts.join("");
}
export default async function(ctx) {
  var cleaner = createMeituanCleaner(), bytes;
  try {
    var kind = cleaner.kind(ctx.request && ctx.request.url);
    if (!kind) return;
    if (!ctx.response) {
      if (kind === "load") {
        var requestHeaders = ctx.request.headers;
        requestHeaders.delete("If-None-Match"); requestHeaders.delete("If-Modified-Since");
        requestHeaders.set("Cache-Control", "no-cache"); requestHeaders.set("Pragma", "no-cache");
        return { headers: requestHeaders };
      }
      var type = kind === "ad" ? "application/json; charset=utf-8" : kind === "image" ? "image/gif" : "application/octet-stream";
      var body = kind === "ad" ? "{}" : kind === "image" ? new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,1,68,0,59]) : "";
      return ctx.respond({ status: 200, headers: { "Content-Type": type, "Cache-Control": "no-store" }, body: body });
    }
    if (kind !== "load" || ctx.response.status !== 200 || !ctx.response.body) return;
    bytes = new Uint8Array(await ctx.response.arrayBuffer());
    if (bytes.length > cleaner.maxBody) return { body: bytes };
    var text = decodeUtf8(bytes), next = cleaner.clean(text);
    if (next === text) return { body: bytes };
    var headers = ctx.response.headers;
    ["ETag", "Last-Modified", "Content-MD5", "Digest", "Expires", "Pragma"].forEach(function (key) { headers.delete(key); });
    headers.set("Cache-Control", "no-store"); headers.set("Pragma", "no-cache"); headers.set("Expires", "0");
    return { headers: headers, body: next };
  } catch (error) {
    // A consumed body must be returned, even when unsupported or malformed.
    if (bytes) return { body: bytes };
  }
}
