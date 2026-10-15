import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const clients = [
  { name: "Loon", script: "Loon/script/MeituanWaimai.js", config: "Loon/script/MeituanWaimai.plugin", status: { status: 200 } },
  { name: "Surge", script: "Surge/script/MeituanWaimai.js", config: "Surge/script/MeituanWaimai.sgmodule", status: { status: 200 } },
  { name: "Shadowrocket", script: "Shadowrocket/script/MeituanWaimai.js", config: "Shadowrocket/script/MeituanWaimai.sgmodule", status: { status: 200 } },
  { name: "QuantumultX", script: "QuantumultX/script/MeituanWaimai.js", config: "QuantumultX/script/MeituanWaimai.conf", status: { statusCode: 200 } }
];
const raw = "https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/";
const loadURL = "https://wmapi.meituan.com/api/v7/loadInfo?city=1";
function run(client, body, options = {}) {
  const calls = [];
  const logs = [];
  const request = { url: options.url ?? loadURL, method: "POST", headers: { Cookie: "synthetic-only" } };
  const response = { ...client.status, headers: { "Content-Type": "application/json" }, body };
  if (options.status) {
    delete response.status;
    delete response.statusCode;
    Object.assign(response, options.status);
  }
  const context = {
    $request: request,
    $response: response,
    $done: value => calls.push(value),
    console: { log: (...args) => logs.push(args) }
  };
  if (options.noRequest) delete context.$request;
  if (options.noResponse) delete context.$response;
  vm.runInNewContext(readFileSync(resolve(root, client.script), "utf8"), context, { timeout: 1500 });
  assert.equal(calls.length, 1, "finish exactly once");
  assert.equal(logs.length, 0, "no response or credential logging");
  const result = JSON.parse(JSON.stringify(calls[0]));
  assert.ok(Object.keys(result).every(key => key === "body"), "only the body may be modified");
  assert.equal(response.body, body, "input response object is not mutated");
  return { result, body: Object.hasOwn(result, "body") ? result.body : body };
}
function configuration(client) {
  const text = readFileSync(resolve(root, client.config), "utf8");
  if (client.name === "Loon") {
    const row = text.split("\n").find(line => line.startsWith("response if "));
    const match = /^response if \$\{url\} ~= \/(.+)\/ then script\("([^"]+)"\) with (.+)$/.exec(row);
    assert.ok(match, "Loon response condition and script action");
    assert.match(match[3], /requires_body=true/);
    assert.match(match[3], /timeout=10/);
    assert.match(text, /#!loon_version = 3\.5\.1\(983\)/);
    assert.match(text, /\[Mitm\]\nhostname = wmapi\.meituan\.com\s*$/);
    return { pattern: new RegExp(match[1]), script: match[2], text };
  }
  if (client.name === "QuantumultX") {
    const row = text.split("\n").find(line => line.includes(" url script-response-body "));
    const match = /^(\S+) url script-response-body (\S+)$/.exec(row);
    assert.ok(match, "Quantumult X native rewrite declaration");
    assert.match(text, /^hostname = wmapi\.meituan\.com$/m);
    assert.doesNotMatch(text, /^\[/m, "remote rewrite resource has no full-profile section headers");
    return { pattern: new RegExp(match[1]), script: match[2], text };
  }
  const row = text.split("\n").find(line => line.startsWith("MeituanWaimai = "));
  const attributes = Object.fromEntries(row.slice(row.indexOf(" = ") + 3).split(",").map(item => {
    const index = item.indexOf("=");
    return [item.slice(0, index), item.slice(index + 1)];
  }));
  assert.equal(attributes.type, "http-response");
  assert.equal(attributes["requires-body"], client.name === "Shadowrocket" ? "1" : "true");
  assert.equal(attributes["max-size"], "2097152");
  assert.equal(attributes.timeout, "10");
  assert.match(text, /\[MITM\]\nhostname = %APPEND% wmapi\.meituan\.com\s*$/);
  return { pattern: new RegExp(attributes.pattern), script: attributes["script-path"], text };
}

const fixtures = [
  ["both arrays; business data retained", '{"code":0,"data":{"startpicture":{"ad":[1],"mk":[2],"meta":"keep"},"cart":{"count":2},"city":"上海"}}', '{"code":0,"data":{"startpicture":{"ad":[],"mk":[],"meta":"keep"},"cart":{"count":2},"city":"上海"}}'],
  ["only ad; no mk added", '{"data":{"startpicture":{"ad":[{"url":"ad"}]}}}', '{"data":{"startpicture":{"ad":[]}}}'],
  ["only mk; string success code", '{"code":"0","data":{"startpicture":{"mk":[1]}}}', '{"code":"0","data":{"startpicture":{"mk":[]}}}'],
  ["direct startup array", '{"data":{"startpicture":[1,{"nested":[2]}],"shop":[1]}}', '{"data":{"startpicture":[],"shop":[1]}}'],
  ["other ad fields retained", '{"data":{"startpicture":{"ad":[1]},"shop":{"ad":[2],"mk":[3]}},"ad":[4]}', '{"data":{"startpicture":{"ad":[]},"shop":{"ad":[2],"mk":[3]}},"ad":[4]}'],
  ["large identifiers and numeric spelling retained", '{"code":0,"data":{"startpicture":{"ad":[{"id":9999999999999999999}]},"poi_id":9223372036854775807,"price":12.3400,"tiny":1e-9,"negative":-0}}', '{"code":0,"data":{"startpicture":{"ad":[]},"poi_id":9223372036854775807,"price":12.3400,"tiny":1e-9,"negative":-0}}'],
  ["whitespace retained", ' { "data" : { "startpicture" : { "ad" : [ 1, 2 ], "mk": [3] }, "x" : true } }\n', ' { "data" : { "startpicture" : { "ad" : [], "mk": [] }, "x" : true } }\n'],
  ["escaped JSON keys", '{"d\\u0061ta":{"startpicture":{"a\\u0064":[1],"mk":[2]}}}', '{"d\\u0061ta":{"startpicture":{"a\\u0064":[],"mk":[]}}}'],
  ["brackets and escapes inside strings", '{"data":{"startpicture":{"ad":[{"s":"a]b}c\\"d\\\\e","inner":[1]}],"mk":[2]},"s":"keep[1]"}}', '{"data":{"startpicture":{"ad":[],"mk":[]},"s":"keep[1]"}}'],
  ["a slash inside a key is not a path", '{"data/startpicture/ad":[1],"data":{"startpicture":{"ad":[2]}}}', '{"data/startpicture/ad":[1],"data":{"startpicture":{"ad":[]}}}'],
  ["prototype-like keys", '{"__proto__":{"ad":[7]},"data":{"startpicture":{"ad":[1]},"constructor":4}}', '{"__proto__":{"ad":[7]},"data":{"startpicture":{"ad":[]},"constructor":4}}']
];
const unchanged = [
  "", "not json", "<html>challenge</html>", "null", "0", '"text"', "[]", "[1,2]", "{}",
  '{"data":null}', '{"data":[]}', '{"data":"unknown"}', '{"data":{}}',
  '{"data":{"startpicture":null}}', '{"data":{"startpicture":"unknown"}}',
  '{"data":{"startpicture":{}}}', '{"data":{"startpicture":{"ad":[],"mk":[]}}}',
  '{"data":{"startpicture":{"ad":{"new":"schema"},"mk":"unknown"}}}',
  '{"data":{"startpicture":{"new_ad_schema":[1]}}}',
  '{"code":401,"data":{"startpicture":{"ad":[1]}}}',
  '{"code":"401","data":{"startpicture":{"ad":[1]}}}',
  '{"code":null,"data":{"startpicture":{"ad":[1]}}}',
  '{"data":{"startpicture":{"ad":[1],"ad":[2]}}}',
  '{"data":{"startpicture":{"ad":[1]}},"data":{"startpicture":{"ad":[2]}}}',
  '{"data":{"startpicture":{"ad":[1]}}} trailing',
  '{"data":{"startpicture":{"ad":[1]}}',
  '{"data":{"startpicture":{"ad":[1]}},"nested":' + "[".repeat(130) + "0" + "]".repeat(130) + "}",
  '{"data":{"startpicture":{"ad":[1]}},"padding":"' + "a".repeat(2 * 1024 * 1024) + '"}'
];
const positiveURLs = [
  "http://wmapi.meituan.com/api/v7/loadInfo",
  "https://wmapi.meituan.com/api/v12/loadInfo?city=1",
  "https://wmapi.meituan.com/api/v7/startpicture",
  "http://wmapi.meituan.com/api/v10/startpicture?city=1",
  "https://wmapi.meituan.com/api/v7/openscreen?ad=1",
  "https://wmapi.meituan.com/api/v12/openscreen?adType=1&city=1"
];
const negativeURLs = [
  "https://wmapi.meituan.com/api/v7/order/list",
  "https://wmapi.meituan.com/api/v7/order/submit",
  "https://wmapi.meituan.com/api/v7/pay",
  "https://wmapi.meituan.com/api/v7/poi/food",
  "https://wmapi.meituan.com/api/v7/poi/list",
  "https://wmapi.meituan.com/api/v7/cart",
  "https://wmapi.meituan.com/api/v7/home",
  "https://wmapi.meituan.com/api/v7/loadInfoExtra",
  "https://wmapi.meituan.com/api/v7/loadInfo/order",
  "https://wmapi.meituan.com/api/v7/startpictureExtra",
  "https://wmapi.meituan.com/api/v7/startpicture/order",
  "https://wmapi.meituan.com/api/v7/openscreen",
  "https://wmapi.meituan.com/api/v7/openscreen?city=1",
  "https://wmapi.meituan.com/api/v7/openscreenExtra?ad=1",
  "https://wmapi.meituan.com.evil.invalid/api/v7/loadInfo",
  "https://wmapiXmeituanXcom/api/v7/loadInfo",
  "https://other.meituan.com/api/v7/loadInfo",
  "https://img.meituan.net/food.jpg",
  "https://p0.meituan.net/food.jpg",
  "https://wmapi.meituan.com/api/vx/loadInfo",
  "https://wmapi.meituan.com/api/v/loadInfo"
];

test("all four published scripts have identical implementation", () => {
  const sources = clients.map(client => readFileSync(resolve(root, client.script), "utf8"));
  for (const source of sources) assert.equal(source, sources[0]);
});
for (const client of clients) {
  for (const [name, before, after] of fixtures) {
    test(client.name + ": " + name, () => {
      assert.equal(run(client, before).body, after);
      const second = run(client, after);
      assert.equal(second.body, after);
      assert.deepEqual(second.result, {});
    });
  }
  unchanged.forEach((body, index) => {
    test(client.name + ": unsupported/error/unchanged fixture " + (index + 1), () => {
      assert.deepEqual(run(client, body).result, {});
    });
  });
  for (const url of positiveURLs) {
    test(client.name + ": configured endpoint " + url, () => {
      assert.ok(configuration(client).pattern.test(url));
      const result = run(client, fixtures[0][1], { url });
      const expected = url.includes("/loadInfo") ? fixtures[0][2] : "{}";
      assert.equal(result.body, expected);
    });
  }
  for (const url of negativeURLs) {
    test(client.name + ": do not intercept " + url, () => {
      assert.ok(!configuration(client).pattern.test(url));
      assert.deepEqual(run(client, fixtures[0][1], { url }).result, {});
    });
  }
  for (const status of [201, 204, 301, 401, 403, 404, 429, 500]) {
    test(client.name + ": HTTP status " + status + " unchanged", () => {
      assert.deepEqual(run(client, fixtures[0][1], { status: { statusCode: status } }).result, {});
      assert.deepEqual(run(client, fixtures[0][1], { url: positiveURLs[2], status: { status } }).result, {});
    });
  }
  test(client.name + ": native config references own published script", () => {
    assert.equal(configuration(client).script, raw + client.script);
  });
  test(client.name + ": alternate native status forms", () => {
    for (const status of [{ status: "HTTP/1.1 200 OK" }, { status: "HTTP/2 200 OK" }, { status: "200" }, { statusCode: 200 }]) {
      assert.equal(run(client, fixtures[0][1], { status }).body, fixtures[0][2]);
    }
  });
  test(client.name + ": missing request/response safely completes", () => {
    assert.deepEqual(run(client, fixtures[0][1], { noRequest: true }).result, {});
    assert.deepEqual(run(client, fixtures[0][1], { noResponse: true }).result, {});
  });
  test(client.name + ": standalone upstream errors not disguised", () => {
    assert.deepEqual(run(client, '{"code":401}', { url: positiveURLs[2] }).result, {});
    assert.deepEqual(run(client, "<html>challenge</html>", { url: positiveURLs[2] }).result, {});
  });
}
