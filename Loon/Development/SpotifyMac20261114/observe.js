/* Local macOS protocol observation, 2026-11-14. No credentials or lyric text. */
(() => {
  let finished = false;
  function done() { if (!finished) { finished = true; $done({}); } }
  try {
    const url = String($request.url || "");
    if (!/^https:\/\/(?:spclient\.wg|[a-z0-9-]+-spclient)\.spotify\.com(?::443)?\//.test(url)) return done();
    const path = url.replace(/^https:\/\/[^/]+/, "").split(/[?#]/, 1)[0];
    const segments=path.split("/");
    const route = segments.map((s,i) => /^(?:users?|profiles?|devices?|sessions?|accounts?|username)$/i.test(segments[i-1]||"") || /^[0-9a-f]{16,}$/i.test(s) || /^[0-9A-Za-z]{22}$/.test(s) || s.length > 48 || /%3a|spotify:/i.test(s) ? ":id" : s).join("/").slice(0, 256);
    const response = typeof $response !== "undefined" && $response;
    const event = { phase: response ? "response" : "request", route, method: /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test($request.method) ? $request.method : "other" };
    if (response) {
      event.status = Number($response.status);
      const headers = $response.headers || {};
      const type = Object.keys(headers).find(k => k.toLowerCase() === "content-type");
      event.format = /json/i.test(headers[type] || "") ? "json" : /protobuf|octet-stream/i.test(headers[type] || "") ? "binary" : "other";
      const body = $response.body;
      event.bytes = typeof body === "string" || body instanceof Uint8Array ? body.length : 0;
      if (event.format === "json" && event.bytes <= 131072) {
        let source = body;
        if (body instanceof Uint8Array) {
          const chunks = [];
          for (let i = 0; i < body.length; i += 2048) chunks.push(String.fromCharCode.apply(null, body.subarray(i, i + 2048)));
          source = chunks.join("");
        }
        const root = JSON.parse(source), flags = [];
        let nodes = 0;
        function walk(value, depth, keys) {
          if (++nodes > 10000 || depth > 12 || flags.length >= 16 || !value || typeof value !== "object") return;
          for (const key of Object.keys(value)) {
            if (key === "hasLyrics" || key === "has_lyrics") {
              if ([true, false, "true", "false"].includes(value[key])) flags.push({ path: keys.concat(key).join("."), value: value[key] });
            }
            if (Array.isArray(value) || /^(data|track|tracks|pages|player_state|item|metadata|attributes)$/.test(key)) walk(value[key], depth + 1, keys.concat(Array.isArray(value) ? "[]" : key));
          }
        }
        walk(root, 0, []);
        event.flags = flags;
      }
    }
    $httpClient.post({url:"http://127.0.0.1:18765/events", body:JSON.stringify(event), headers:{"Content-Type":"application/json"}, timeout:300, node:"DIRECT", "auto-cookie":false, "auto-redirect":false, "binary-mode":false, insecure:false}, done);
  } catch { done(); }
})();
