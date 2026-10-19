import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { root, clients, entries } from "./build.mjs";

let checks = 0;
function equal(actual, expected, label) {
  assert.deepEqual(actual, expected, label); checks++;
}
function ok(value, label) { assert.ok(value, label); checks++; }
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const loadURL = "https://wmapi.meituan.com/api/v7/loadInfo?city=1";
const rich = '{ "code":0,"data":{"startpicture":{"ad":[{"id":123}],"mk":[1,2],"normal":"保留"},"order_id":92233720368547758071234,"price":1.00e+2,"coupon":[{"title":"优惠券"}]},"extra":"中英😀" }';
const cleaned = rich.replace('[{"id":123}]', "[]").replace("[1,2]", "[]");
const cases = [
  ["https://wmapi.meituan.com/api/v7/startpicture", "ad"],
  ["http://wmapi.meituan.com:80/api/v12/startpicture/?a=1", "ad"],
  ["https://wmapi.meituan.com/api/v7/openscreen?ad_id=1", "ad"],
  ["https://wmapi.meituan.com/api/v7/openscreen?city=1&ad_id=2", "ad"],
  ["https://wmapi.meituan.com/api/v7/openscreen?city=1&adId=2&x=3", "ad"],
  ["https://wmapi.meituan.com:443/api/v10/openscreen/?x=1&ad=1", "ad"],
  [loadURL, "load"],
  ["https://wmapi.meituan.com:443/api/v12/loadInfo/?city=1", "load"],
  ["https://img.meituan.net/bizad/bizad_brandCpt_123.jpg", "image"],
  ["https://img.meituan.net/bizad/bizad_brandCpt_123.jpg@750w_90Q?x=1", "image"],
  ["https://p0.meituan.net/bizad/a1_b2.jpg", "image"],
  ["http://p12.meituan.net:80/brandCpt/abc-123.jpg?x=1", "image"],
  ["https://flowplus.meituan.net/v1/mss_abc/linglong/123.jpg?time=1", "image"],
  ["https://s3plus.meituan.net/v12/mss_abc/linglong/start.gif", "image"],
  ["https://flowplus.meituan.net/v1/mss_abc/linglong/123.mp4?time=1", "media"],
  ["https://s3plus.meituan.net/v1/mss_abc/brandcpt-vedio/abc.zip?time=1", "media"],
  ["https://s3plus.meituan.net/v1/mss_abc/brandcpt-vedio/a-b.mp4", "media"],
  ["https://wmapi.meituan.com/api/v7/openscreen?city=1&notad=2", ""],
  ["https://wmapi.meituan.com/api/v7/openscreen?url=ad_id%3D2", ""],
  ["https://wmapi.meituan.com/api/v7/openscreen?city=1#&ad=2", ""],
  ["https://wmapi.meituan.com/api/v7/openscreen", ""],
  ["https://wmapi.meituan.com/api/v7/startpictureHelp?ad=1", ""],
  ["https://wmapi.meituan.com/api/v7/loadInformation", ""],
  ["https://wmapi.meituan.com/api/v7/order", ""],
  ["https://wmapi.meituan.com/api/v7/pay?ad=1", ""],
  ["https://wmapi.meituan.com/api/v7/poi/channel/kingkong", ""],
  ["https://wmapi.meituan.com/api/v7/cart", ""],
  ["https://wmapi.meituan.com/api/v7/coupon", ""],
  ["https://wmapi.meituan.com.evil.invalid/api/v7/startpicture", ""],
  ["https://evil.invalid/?url=https://wmapi.meituan.com/api/v7/startpicture", ""],
  ["https://wmapi.meituan.com@evil.invalid/api/v7/startpicture", ""],
  ["https://p0.meituan.net/food/abc.jpg", ""],
  ["https://p1.meituan.net/poi/abc.jpg", ""],
  ["https://p1.meituan.net/wmbanner/abc.jpg", ""],
  ["https://p1.meituan.net/bizad/abc.jpg/normal", ""],
  ["https://img.meituan.net/bizad/normal.jpg", ""],
  ["https://img.meituan.net/bizad/bizad_brandCpt_123.jpg.exe", ""],
  ["https://s3plus.meituan.net/v1/mss_abc/waimai-alita/abc.zip", ""],
  ["https://s3plus.meituan.net/ocean-blk-index/index/blk_conf_73.json", ""],
  ["https://flowplus.meituan.net/v1/mss_abc/food/123.jpg", ""],
  ["https://apimobile.meituan.com/api/v7/startpicture", ""]
];

const yaml = spawnSync("/usr/bin/ruby", ["-r", "yaml", "-r", "json", "-e",
  "puts JSON.generate(YAML.load_file(ARGV[0]))", path.join(root, entries.Egern)], { encoding: "utf8" });
if (yaml.status !== 0) throw new Error(yaml.stderr);
const egernModule = JSON.parse(yaml.stdout);
const sourceURLs = new Set();
const native = {};
for (const client of clients) {
  const text = read(entries[client]);
  native[client] = [];
  if (client === "Egern") {
    for (const entry of egernModule.scriptings) {
      const [phase, script] = Object.entries(entry)[0];
      sourceURLs.add(script.script_url);
      native[client].push({ regex: new RegExp(script.match), type: phase === "http_request" ? "request" : "load" });
      equal(script.body_required, phase === "http_response", "Egern typed body flag");
      ok(script.timeout === 8, "Egern timeout seconds");
    }
    ok(egernModule.scriptings[1].http_response.binary_body === true, "Egern bytes mode");
    equal(egernModule.scriptings[1].http_response.max_size, 2097152, "Egern native size bound");
  } else {
    for (const line of text.split("\n")) {
      if (line.includes("script-path=")) sourceURLs.add(line.split("script-path=")[1].split(",")[0]);
      if (line.includes('then script("')) sourceURLs.add(line.split('then script("')[1].split('"')[0]);
      if (line.includes(" url script-")) sourceURLs.add(line.split(" ").at(-1));
      if (client === "Loon" && line.startsWith("request if")) {
        const pattern = line.split(" ~= /")[1].split("/ then ")[0];
        const type = line.includes("reject_dict") ? "ad" : line.includes("reject_img") ? "image" :
          line.includes("reject(200)") ? "media" : "load";
        native[client].push({ regex: new RegExp(pattern), type });
      } else if (client === "Surge" && line.includes(" data-type=")) {
        native[client].push({ regex: new RegExp(line.split(" ")[0]), type: line.includes('data="{}"') ? "ad" :
          line.includes("tiny-gif") ? "image" : "media" });
      } else if (client === "Shadowrocket" && line.startsWith("URL-REGEX,")) {
        const [, pattern, policy] = line.split(",");
        native[client].push({ regex: new RegExp(pattern), type: policy === "REJECT-DICT" ? "ad" : policy === "REJECT-IMG" ? "image" : "media" });
      } else if (client === "QuantumultX" && / url reject-/.test(line)) {
        native[client].push({ regex: new RegExp(line.split(" ")[0]), type: line.endsWith("reject-dict") ? "ad" :
          line.endsWith("reject-img") ? "image" : "media" });
      }
      if (client !== "Loon" && line.includes("pattern=")) {
        native[client].push({ regex: new RegExp(line.split("pattern=")[1].split(",")[0]), type: "load" });
      }
      if (client === "QuantumultX" && line.includes(" url script-")) {
        native[client].push({ regex: new RegExp(line.split(" ")[0]), type: "load" });
      }
    }
  }
  ok(native[client].length >= 2, client + " actual import rules");
  for (const [url, kind] of cases) {
    const hits = native[client].filter(rule => rule.regex.test(url));
    const actual = client === "Egern" ? (hits.length ? kind || "unexpected" : "") : hits[0]?.type || "";
    equal(actual, kind, client + " actual native regex " + url);
  }
  ok(!text.includes("/main/" + client + "/script/MeituanWaimai.js"), "Immutable runtime " + client);
  if (client === "Loon") {
    ok(text.includes("requires_body=true") && text.includes("3.5.1(983)"), "Loon native boolean and minimum");
    ok(!/max_size|max-size|engine=|http-response/.test(text), "No other-client Loon fields");
    equal((text.match(/request.header.del/g) || []).length, 2, "Loon cache condition removals");
    ok(text.includes('request.header.set("Cache-Control", "no-cache")'), "Loon cache refresh");
  }
}
equal(sourceURLs.size, 5, "One pinned source per client");
for (const url of sourceURLs) ok(/\/[0-9a-f]{40}\/[^/]+\/script\/MeituanWaimai\.js$/.test(url), "Pinned raw source URL");

function run(client, body, response = {}, request = {}) {
  const calls = [];
  const context = {
    $request: { url: loadURL, headers: {}, ...request },
    $done: value => calls.push(value), Date
  };
  if (body !== undefined || response.status !== undefined || response.statusCode !== undefined) {
    context.$response = { status: 200, body, headers: {}, ...response };
  }
  vm.runInNewContext(read(client + "/script/MeituanWaimai.js"), context, { timeout: 1500 });
  equal(calls.length, 1, client + " finishes once");
  return JSON.parse(JSON.stringify(calls[0]));
}
const bodyCases = [
  [rich, cleaned],
  ['{"code":"0","data":{"startpicture":[{"id":1}],"normal":5}}', '{"code":"0","data":{"startpicture":[],"normal":5}}'],
  ['{"data":{"startpicture":{"ad":[],"mk":[3]}}}', '{"data":{"startpicture":{"ad":[],"mk":[]}}}'],
  ['{"data":{"startpicture":{"ad":[1],"mk":null}}}', '{"data":{"startpicture":{"ad":[],"mk":null}}}'],
  ['{"code":1,"data":{"startpicture":{"ad":[1]}}}', null],
  ['{"code":null,"data":{"startpicture":{"ad":[1]}}}', null],
  ['{"data":{"startpicture":{"ad":"url","mk":{"x":1}}}}', null],
  ['{"data":{"startpicture":{"ad":[],"mk":[]}}}', null],
  ['{"data":{"startpicture":null}}', null],
  ['{"data":{"startpicture":{"ad":[1]}},"coupon":[1],"coupon":[2]}', null],
  ['{"data":{"startpicture":{"ad":[1]}},"data":{"startpicture":{"ad":[2]}}}', null],
  ['{"data":{"startpicture":{"ad":[1]}},"\\u0064ata":{"startpicture":{"ad":[2]}}}', null],
  ['{"data":{"startpicture":{"ad":[1]}}', null],
  ['<html>upstream error</html>', null], ["", null], ["[]", null],
  ['{"ad":[1],"banner":[2],"coupon":{"ad":[3]}}', null],
  ['{"data":{"startpicture":{"ad":[1]}},"deep":' + "[".repeat(70) + "0" + "]".repeat(70) + "}", null],
  ['{"data":{"startpicture":{"ad":[1]}},"big":[' + "0,".repeat(50001) + "0]}", null],
  ['{"data":{"startpicture":{"ad":[1]}},"pad":"' + "x".repeat(2097152) + '"}', null]
];
const requestHeaders = { "iF-nOnE-mAtCh": "old", "IF-MODIFIED-SINCE": "old", "Cache-Control": "max-age=9",
  Cookie: "synthetic-cookie", Authorization: "synthetic-auth", "If-Match": "business-precondition" };
const responseHeaders = { ETag: "old", "last-MODIFIED": "old", "content-MD5": "old", Digest: "old",
  "Cache-Control": "max-age=60", "Set-Cookie": ["test=a", "other=b"], "Content-Type": "application/json" };
for (const client of clients.filter(c => c !== "Egern")) {
  for (const [body, expected] of bodyCases) {
    const result = run(client, body);
    equal(result.body ?? body, expected ?? body, client + " lossless/unsupported body");
    if (expected) equal(run(client, expected), {}, client + " idempotent");
  }
  const request = run(client, undefined, {}, { headers: requestHeaders });
  equal(request.headers, { Cookie: "synthetic-cookie", Authorization: "synthetic-auth",
    "If-Match": "business-precondition", "Cache-Control": "no-cache", Pragma: "no-cache" }, client + " refresh without deleting credentials");
  const result = run(client, rich, { headers: responseHeaders });
  equal(result.headers["Cache-Control"], "no-store", client + " changed response cache");
  equal(result.headers["Set-Cookie"], responseHeaders["Set-Cookie"], client + " multi-value cookies retained");
  ok(!Object.keys(result.headers).some(k => /^(etag|last-modified|content-md5|digest)$/i.test(k)), client + " stale validators removed");
  for (const status of [204, 304, 400, 500]) equal(run(client, rich, { status }), {}, client + " original non200 " + status);
  equal(run(client, rich, { status: "HTTP/1.1 200 OK" }).body, cleaned, client + " status line");
  equal(run(client, rich, { statusCode: 200, status: "unknown" }).body, cleaned, client + " numeric statusCode");
  equal(run(client, rich, {}, { url: "https://wmapi.meituan.com/api/v7/cart" }), {}, client + " business request");
  equal(run(client, new Uint8Array([1, 2, 3])), {}, client + " unexpected bytes untouched");
  equal(run(client, new Uint8Array(Buffer.from(rich))).body, cleaned, client + " native UTF-8 body bytes");
  equal(run(client, new Uint8Array([0xc0, 0x80])), {}, client + " invalid UTF-8 untouched");
}

class NativeHeaders {
  constructor(value = {}) { this.value = { ...value }; }
  delete(name) {
    Object.keys(this.value).forEach(key => { if (key.toLowerCase() === name.toLowerCase()) delete this.value[key]; });
  }
  set(name, value) { this.delete(name); this.value[name] = value; }
}
const egernSource = read("Egern/script/MeituanWaimai.js").replace("export default async function(ctx)", "async function execute(ctx)");
const egernRun = vm.runInNewContext(egernSource + "\nexecute", { Date, Uint8Array }, { timeout: 1500 });
async function egernResponse(body, { url = loadURL, status = 200, headers = responseHeaders } = {}) {
  const bytes = typeof body === "string" ? new Uint8Array(Buffer.from(body)) : body;
  let reads = 0;
  const ctx = {
    request: { url, headers: new NativeHeaders() },
    response: { status, headers: new NativeHeaders(headers), body: {},
      arrayBuffer: async () => { reads++; return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); } },
    respond: () => { throw new Error("Unexpected synthetic response during response phase"); }
  };
  const result = await egernRun(ctx);
  ok(reads <= 1, "Egern consumes body once");
  const actual = result?.body instanceof Uint8Array ? Buffer.from(result.body).toString("utf8") : result?.body;
  return { result, actual, reads };
}
for (const [body, expected] of bodyCases) {
  const { actual } = await egernResponse(body);
  equal(actual, expected ?? body, "Egern same lossless behavior");
}
for (const bytes of [new Uint8Array([0xc0, 0x80]), new Uint8Array([0xed, 0xa0, 0x80]),
  new Uint8Array([0xf4, 0x90, 0x80, 0x80]), new Uint8Array([0xe4, 0xb8])]) {
  const { result } = await egernResponse(bytes);
  equal(Array.from(result.body), Array.from(bytes), "Egern invalid UTF-8 original bytes");
}
for (const status of [204, 304, 400, 500]) {
  const { result, reads } = await egernResponse(rich, { status });
  equal(result, undefined, "Egern non200 untouched"); equal(reads, 0, "Egern non200 no body consumption");
}
const egernChanged = await egernResponse(rich);
equal(egernChanged.result.headers.value["Set-Cookie"], responseHeaders["Set-Cookie"], "Egern cookies retained");
equal(egernChanged.result.headers.value["Cache-Control"], "no-store", "Egern changed cache");
for (const [url, type] of cases) {
  let responses = 0;
  const headers = new NativeHeaders(requestHeaders);
  const result = await egernRun({ request: { url, headers }, respond: value => { responses++; return value; } });
  if (["ad", "image", "media"].includes(type)) {
    equal(responses, 1, "Egern intercept once"); equal(result.status, 200, "Egern local 200");
    if (type === "ad") equal(result.body, "{}", "Egern local JSON");
    if (type === "image") equal(Buffer.from(result.body).subarray(0, 6).toString("ascii"), "GIF89a", "Egern local image bytes");
    if (type === "media") equal(result.body, "", "Egern blocks ad media");
  } else if (type === "load") {
    equal(responses, 0, "Egern startup still reaches server");
    equal(result.headers.value, { Cookie: "synthetic-cookie", Authorization: "synthetic-auth",
      "If-Match": "business-precondition", "Cache-Control": "no-cache", Pragma: "no-cache" }, "Egern load cache headers");
  } else { equal(responses, 0, "Egern unrelated no interception"); equal(result, undefined, "Egern unrelated no mutation"); }
}
console.log(JSON.stringify({ version: "0.2.0", assertions: checks, clients: clients.length,
  urlCases: cases.length, bodyCases: bodyCases.length,
  nativeClientImportVerified: false, realPhoneTrafficVerified: false }, null, 2));
