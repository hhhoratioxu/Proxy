// Meituan Waimai startup ad cleaner v0.1.0.
// Native response script for Loon, Surge, Shadowrocket and Quantumult X.
// No network calls, storage or logging. Only selected JSON arrays are spliced;
// all other text, including large numeric IDs, is preserved byte for byte.
(function () {
  "use strict";
  var result = {};
  var own = Object.prototype.hasOwnProperty;
  var MAX_BODY_LENGTH = 2 * 1024 * 1024;
  var LOAD_INFO = /^https?:\/\/wmapi\.meituan\.com\/api\/v[0-9]+\/loadInfo(?:\?.*)?$/;
  var STANDALONE = /^https?:\/\/wmapi\.meituan\.com\/api\/v[0-9]+\/(?:startpicture(?:\?.*)?$|openscreen\?ad)/;

  function record(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function statusCode(response) {
    var status = response.statusCode != null ? response.statusCode : response.status;
    if (typeof status === "number") return status;
    var match = /^(?:HTTP\/[0-9.]+\s+)?([0-9]{3})(?:\s|$)/.exec(String(status || ""));
    return match ? Number(match[1]) : 0;
  }

  function cleanLoadInfo(body, data) {
    if (!record(data.data)) return body;
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

    // JSON.parse validates syntax and identifies the supported shape. The scanner
    // finds source ranges; it never serializes business values from parsed data.
    var cursor = 0;
    var ranges = [];
    function space() {
      while (cursor < body.length && /\s/.test(body.charAt(cursor))) cursor++;
    }
    function stringToken() {
      var begin = cursor++;
      while (cursor < body.length) {
        var ch = body.charAt(cursor++);
        if (ch === "\\") cursor++;
        else if (ch === '"') return body.slice(begin, cursor);
      }
      throw new Error("Unterminated JSON string");
    }
    function value(path, depth) {
      if (depth > 128) throw new Error("JSON nesting limit");
      space();
      var begin = cursor;
      var ch = body.charAt(cursor);
      if (ch === "{") {
        cursor++;
        space();
        var keys = Object.create(null);
        if (body.charAt(cursor) !== "}") {
          while (true) {
            var key = JSON.parse(stringToken());
            if (own.call(keys, key)) throw new Error("Duplicate JSON key");
            keys[key] = true;
            space();
            if (body.charAt(cursor++) !== ":") throw new Error("Missing JSON colon");
            value(path.concat(key), depth + 1);
            space();
            if (body.charAt(cursor) === "}") break;
            if (body.charAt(cursor++) !== ",") throw new Error("Missing JSON comma");
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
            if (body.charAt(cursor++) !== ",") throw new Error("Missing JSON comma");
          }
        }
        cursor++;
        if (targets.indexOf(JSON.stringify(path)) !== -1) ranges.push([begin, cursor]);
      } else if (ch === '"') {
        stringToken();
      } else {
        while (cursor < body.length && !/[\s,\]}]/.test(body.charAt(cursor))) cursor++;
        if (cursor === begin) throw new Error("Missing JSON value");
      }
    }
    value([], 0);
    space();
    if (cursor !== body.length) throw new Error("Trailing JSON content");
    ranges.sort(function (a, b) { return b[0] - a[0]; });
    ranges.forEach(function (range) {
      body = body.slice(0, range[0]) + "[]" + body.slice(range[1]);
    });
    return body;
  }

  try {
    if (typeof $request !== "undefined" && typeof $response !== "undefined") {
      var url = $request.url;
      var body = $response.body;
      if (typeof url === "string" && (LOAD_INFO.test(url) || STANDALONE.test(url)) &&
          statusCode($response) === 200 && typeof body === "string" &&
          body.length > 0 && body.length <= MAX_BODY_LENGTH) {
        var data = JSON.parse(body);
        var businessError = record(data) && own.call(data, "code") &&
          data.code !== 0 && data.code !== "0";
        if (!businessError) {
          var next = LOAD_INFO.test(url) && record(data) ? cleanLoadInfo(body, data) :
            (STANDALONE.test(url) ? "{}" : body);
          if (next !== body) result = { body: next };
        }
      }
    }
  } catch (error) {
    // Unexpected, malformed or unsupported responses pass through unchanged.
    result = {};
  }
  $done(result);
})();
