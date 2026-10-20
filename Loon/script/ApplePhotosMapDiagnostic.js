/* Apple Photos Map Diagnostic 0.2.0
 * Copyright 2026 Horatio Xu. SPDX-License-Identifier: MIT
 * Read-only Loon diagnostics; this does not implement a location fix.
 * No photo access, request-body access, networking, storage or coordinate logs.
 * Protocol field references: NSRingo/MapKit v4.6.1 (Apache-2.0).
 * Independently implemented scanner; no upstream runtime is bundled.
 */
(function () {
  "use strict";
  const VERSION = "0.2.0", MAX_BODY = 1048576, MAX_FIELDS = 20000;
  function log(record) {
    try { console.log("[ApplePhotosMapDiagnostic] " + JSON.stringify(record)); } catch (_) {}
  }
  function provider(host) {
    if (/^(?:dispatcher|direction2|shift)\.is\.autonavi\.com$/.test(host)) return "amap";
    if (/^gspe(?:11-2|19|19-2)-cn-ssl\.ls\.apple\.com$/.test(host)) return "apple-cn";
    if (/^(?:gsp-ssl|gspe(?:11|19|19-kittyhawk|35)-ssl)\.ls\.apple\.com$/.test(host)) return "apple-global";
    return "other";
  }
  function parseURL(raw) {
    if (typeof raw !== "string" || raw.length > 16384) return null;
    const m = /^https:\/\/([a-zA-Z0-9.-]+)(?::443)?(\/[^?#]*)(?:\?([^#]*))?$/.exec(raw);
    return m ? {host:m[1].toLowerCase(), path:m[2], query:m[3] || ""} : null;
  }
  function endpoint(u) {
    if (!u) return null;
    if (u.host === "gspe35-ssl.ls.apple.com" && u.path === "/geo_manifest/dynamic/config") return "manifest";
    if (/^gspe(?:19|19-2)-cn-ssl\.ls\.apple\.com$/.test(u.host) && u.path === "/tiles") return "vector-tile";
    if (/^gspe19(?:-kittyhawk)?-ssl\.ls\.apple\.com$/.test(u.host) && u.path === "/tile.vf") return "vector-tile";
    if (u.host === "gspe11-2-cn-ssl.ls.apple.com" && u.path === "/2/tiles") return "satellite-tile";
    if (u.host === "gspe11-ssl.ls.apple.com" && u.path === "/tile") return "satellite-tile";
    if (u.host === "dispatcher.is.autonavi.com" && u.path === "/dispatcher") return "dispatcher";
    if (u.host === "gsp-ssl.ls.apple.com" && u.path === "/dispatcher.arpc") return "dispatcher";
    return null;
  }
  function querySummary(query) {
    const allowed = new Set(["application","application_version","country_code","hardware","os","os_build","os_version","x","y","z","style","scale","size","v","version","flags","accessKey","token","key","lang","language","latitude","longitude","lat","lon","lng","center","ll"]);
    const seen = new Set(), duplicates = new Set(), options = {}, pairs = query.split("&", 129);
    const limits = {z:30, style:120, scale:4, size:8};
    let unknownKeys = 0, malformed = false;
    for (const pair of pairs.slice(0, 128)) {
      if (!pair) continue;
      const at = pair.indexOf("=");
      let name;
      try { name = decodeURIComponent((at < 0 ? pair : pair.slice(0, at)).replace(/\+/g," ")); }
      catch (_) { malformed = true; continue; }
      if (!allowed.has(name)) { unknownKeys++; continue; }
      if (seen.has(name)) duplicates.add(name);
      seen.add(name);
      // Never emit coordinates, tokens, identifiers or arbitrary query values.
      if (Object.prototype.hasOwnProperty.call(limits, name)) {
        const raw = at < 0 ? "" : pair.slice(at + 1);
        if (!duplicates.has(name) && /^\d{1,3}$/.test(raw) && Number(raw) <= limits[name]) options[name] = Number(raw);
        else delete options[name];
      }
    }
    return {keys:[...seen].sort(), unknownKeys, truncated:pairs.length > 128, malformed, options};
  }
  function validateXYZ(values, ambiguous) {
    if (ambiguous) return {state:"ambiguous"};
    const present = ["x","y","z"].filter(k => values[k] !== undefined);
    if (!present.length) return {state:"missing"};
    if (present.length !== 3) return {state:"partial"};
    const xyz = {};
    for (const k of ["x","y","z"]) {
      const v = values[k];
      if (typeof v !== "string" || v.length > 10 || !/^(?:0|[1-9]\d*)$/.test(v)) return {state:"invalid"};
      xyz[k] = Number(v);
    }
    if (xyz.z > 30 || xyz.x >= Math.pow(2,xyz.z) || xyz.y >= Math.pow(2,xyz.z)) return {state:"invalid"};
    return {state:"valid", ...xyz};
  }
  function queryXYZ(query) {
    const pairs = query.split("&",129), values = {};
    if (pairs.length > 128) return {state:"query-limit"};
    let ambiguous = false;
    for (const pair of pairs) {
      const at = pair.indexOf("=");
      let key;
      try { key = decodeURIComponent((at < 0 ? pair : pair.slice(0,at)).replace(/\+/g," ")); }
      catch (_) { return {state:"invalid"}; }
      if (!["x","y","z"].includes(key)) continue;
      if (Object.prototype.hasOwnProperty.call(values,key)) ambiguous = true;
      try { values[key] = at < 0 ? "" : decodeURIComponent(pair.slice(at+1).replace(/\+/g," ")); }
      catch (_) { return {state:"invalid"}; }
    }
    return validateXYZ(values,ambiguous);
  }
  function headerTiles(headers) {
    if (headers == null) return {xyz:{state:"missing"}, style:{state:"missing"}};
    if (typeof headers !== "object" || Array.isArray(headers)) return {xyz:{state:"invalid"}, style:{state:"invalid"}};
    const keys = Object.keys(headers);
    if (keys.length > 128) return {xyz:{state:"header-limit"}, style:{state:"header-limit"}};
    const values = {}, seen = new Set();
    let ambiguous = false, styleKey = null, styleDuplicate = false;
    for (const key of keys) {
      const name = key.toLowerCase();
      // Only read these four documented map-header values. Never read auth,
      // cookies, x-tilekey, account IDs, unknown headers or raw body data.
      if (["maps-tile-x","maps-tile-y","maps-tile-z"].includes(name)) {
        const axis = name.slice(-1);
        if (seen.has(axis)) ambiguous = true;
        seen.add(axis);
        values[axis] = headers[key];
      } else if (name === "maps-tile-style") {
        if (styleKey !== null) styleDuplicate = true;
        styleKey = key;
      }
    }
    let style = {state:"missing"};
    if (styleDuplicate) style = {state:"ambiguous"};
    else if (styleKey !== null) {
      const raw = headers[styleKey];
      if (typeof raw !== "string") style = {state:"invalid"};
      else if (raw.length > 2048) style = {state:"header-limit"};
      else style = {state:"present", ...querySummary(raw)};
    }
    return {xyz:validateXYZ(values,ambiguous),style};
  }
  function tileSummary(query, headers) {
    const q = queryXYZ(query), h = headerTiles(headers);
    // Raw XYZ objects stay inside this function. Only states, zoom and safe
    // style options are copied to the log record. They do not identify a photo.
    const out = {queryXYZ:q.state, headerXYZ:h.xyz.state, coordinates:"unavailable", carrier:"none", headerStyle:h.style};
    if (q.state === "valid" && h.xyz.state === "valid") {
      if (q.x === h.xyz.x && q.y === h.xyz.y && q.z === h.xyz.z) {
        out.coordinates = "valid"; out.carrier = "both"; out.zoom = q.z;
      } else { out.coordinates = "conflict"; out.carrier = "both"; }
    } else if (q.state === "valid" && h.xyz.state === "missing") {
      out.coordinates = "valid"; out.carrier = "query"; out.zoom = q.z;
    } else if (h.xyz.state === "valid" && q.state === "missing") {
      out.coordinates = "valid"; out.carrier = "headers"; out.zoom = h.xyz.z;
    }
    return out;
  }
  function varint(bytes, cursor, max) {
    let value = 0, factor = 1;
    for (let i = 0; i < max; i++) {
      if (cursor.pos >= bytes.length) throw new Error("truncated");
      const b = bytes[cursor.pos++];
      value += (b & 127) * factor;
      if (b < 128) {
        if (!Number.isSafeInteger(value)) throw new Error("integer");
        return value;
      }
      factor *= 128;
    }
    throw new Error("varint");
  }
  function fields(bytes, budget) {
    const result = [], cursor = {pos:0};
    while (cursor.pos < bytes.length) {
      if (--budget.remaining < 0) throw new Error("field-limit");
      const tag = varint(bytes, cursor, 5), number = Math.floor(tag / 8), wire = tag % 8;
      if (!number || number > 536870911) throw new Error("tag");
      let start = cursor.pos;
      if (wire === 0) {
        // Skip uint64 without converting, rounding or retaining its value.
        let complete = false;
        for (let i = 0; i < 10; i++) {
          if (cursor.pos >= bytes.length) throw new Error("truncated");
          const b = bytes[cursor.pos++];
          if (i === 9 && b > 1) throw new Error("varint");
          if (b < 128) { complete = true; break; }
        }
        if (!complete) throw new Error("varint");
      } else if (wire === 2) {
        const length = varint(bytes, cursor, 5);
        start = cursor.pos;
        cursor.pos += length;
      } else if (wire === 1 || wire === 5) cursor.pos += wire === 1 ? 8 : 4;
      else throw new Error("wire");
      if (cursor.pos > bytes.length) throw new Error("truncated");
      result.push({number, wire, data:bytes.subarray(start, cursor.pos)});
    }
    return result;
  }
  function messages(list, number, max) {
    const selected = list.filter(f => f.number === number);
    if (selected.length > max || selected.some(f => f.wire !== 2)) throw new Error("schema");
    return selected.map(f => f.data);
  }
  function asciiURL(bytes) {
    if (!bytes || bytes.length > 512) return null;
    let value = "";
    for (const b of bytes) {
      if (b < 32 || b > 126) return null;
      value += String.fromCharCode(b);
    }
    return parseURL(value);
  }
  function manifestSummary(body) {
    if (!ArrayBuffer.isView(body) || Object.prototype.toString.call(body) !== "[object Uint8Array]") return {parse:"binary-unavailable"};
    if (!body.length) return {parse:"empty"};
    if (body.length > MAX_BODY) return {parse:"body-limit"};
    const budget = {remaining:MAX_FIELDS}, root = fields(body, budget);
    const tiles = messages(root, 2, 256), groups = messages(root, 1, 64), info = messages(root, 92, 16);
    if (!tiles.length || !groups.length || !info.length) return {parse:"unknown-schema"};
    const tileProviders = {"apple-cn":0, "apple-global":0, other:0};
    const shiftProviders = {amap:0, "apple-global":0, other:0, absent:0};
    let versions = 0, coverageRegions = 0;
    function count(target, url) {
      const key = url ? provider(url.host) : "other";
      target[Object.prototype.hasOwnProperty.call(target, key) ? key : "other"]++;
    }
    for (const tile of tiles) {
      const list = fields(tile, budget), urls = messages(list, 1, 1);
      count(tileProviders, urls.length ? asciiURL(urls[0]) : null);
      for (const version of messages(list, 5, 32)) {
        versions++;
        coverageRegions += messages(fields(version, budget), 2, 4096).length;
      }
    }
    for (const item of info) {
      const urls = messages(fields(item, budget), 10, 1);
      if (!urls.length) { shiftProviders.absent++; continue; }
      const strings = messages(fields(urls[0], budget), 1, 1);
      count(shiftProviders, strings.length ? asciiURL(strings[0]) : null);
    }
    return {parse:"ok", tileSets:tiles.length, tileProviders, versions, coverageRegions, infoSets:info.length, shiftProviders};
  }
  function contentType(headers) {
    if (!headers || typeof headers !== "object") return "absent";
    const key = Object.keys(headers).find(k => k.toLowerCase() === "content-type");
    if (!key || typeof headers[key] !== "string") return "absent";
    const type = headers[key].split(";",1)[0].trim().toLowerCase();
    return ["application/octet-stream","application/protobuf","application/x-protobuf","application/vnd.google.protobuf","text/plain","text/html","image/png","image/jpeg","image/webp"].includes(type) ? type : "other";
  }
  try {
    const request = typeof $request === "undefined" ? null : $request;
    const url = parseURL(request && request.url), kind = endpoint(url);
    if (!kind) return;
    const response = typeof $response === "undefined" ? null : $response;
    const record = {version:VERSION, phase:response ? "response" : "request", interface:kind, provider:provider(url.host)};
    if (kind === "vector-tile" || kind === "satellite-tile") {
      try { record.tile = tileSummary(url.query,request.headers); }
      catch (_) { record.tile = {coordinates:"unavailable",carrier:"none",parse:"header-read-failed"}; }
    }
    if (response) {
      record.status = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : null;
      record.contentType = contentType(response.headers);
      if (kind === "manifest" && record.status === 200) {
        if (["application/octet-stream","application/protobuf","application/x-protobuf","application/vnd.google.protobuf"].includes(record.contentType)) {
          try { record.manifest = manifestSummary(response.body); }
          catch (_) { record.manifest = {parse:"unsupported-or-malformed"}; }
        } else record.manifest = {parse:"content-type"};
      }
    } else {
      record.method = ["GET","POST","HEAD"].includes(request.method) ? request.method : "other";
      record.query = querySummary(url.query);
    }
    log(record);
  } catch (_) { log({version:VERSION, event:"diagnostic-skipped"}); }
  finally { $done({}); }
})();
