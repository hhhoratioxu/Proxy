import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const clients = ["Egern", "Loon", "Surge", "Shadowrocket", "QuantumultX"];
export const entries = {
  Egern: "Egern/script/MeituanWaimai.yaml",
  Loon: "Loon/script/MeituanWaimai.plugin",
  Surge: "Surge/script/MeituanWaimai.sgmodule",
  Shadowrocket: "Shadowrocket/script/MeituanWaimai.sgmodule",
  QuantumultX: "QuantumultX/script/MeituanWaimai.conf"
};
const core = fs.readFileSync(path.join(root, "Source/MeituanWaimai/core.js"), "utf8");
export const cleaner = vm.runInNewContext(core + "\ncreateMeituanCleaner()");
const p = cleaner.patterns;
const hosts = ["wmapi.meituan.com", "img.meituan.net", "p*.meituan.net",
  "s3plus.meituan.net", "flowplus.meituan.net"];
const gif = Array.from(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));
const rawRoot = "https://raw.githubusercontent.com/hhhoratioxu/Proxy/";
let generic;
function makeGeneric(decode) { return [
  "// Generated Meituan Waimai v0.2.0. See fixed source commit for core and tests.",
  "(function () {", '"use strict";', core, decode,
  "var cleaner = createMeituanCleaner(), result = {};",
  "try {",
  '  if (typeof $request !== "undefined" && cleaner.kind($request.url) === "load") {',
  '    if (typeof $response === "undefined") {',
  '      result = { headers: cleaner.headers($request.headers, "request") };',
  "    } else if (cleaner.status($response) === 200) {",
  "      var body = $response.body, text = body;",
  '      if (body && Object.prototype.toString.call(body) === "[object Uint8Array]" && body.byteLength <= cleaner.maxBody) text = decodeUtf8(body);',
  "      var next = cleaner.clean(text);",
  '      if (next !== text) result = { body: next, headers: cleaner.headers($response.headers, "response") };',
  "    }", "  }",
  "} catch (error) { result = {}; }",
  "$done(result);", "})();", ""
].join("\n"); }

// Strict UTF-8: invalid encodings pass their original bytes back to Egern.
const decode = [
  "function decodeUtf8(bytes) {",
  '  var parts = [], chunk = "";',
  "  for (var i = 0; i < bytes.length;) {",
  "    var first = bytes[i++], code = first, needed = 0, minimum = 0;",
  "    if (first < 128) { /* ASCII */ }",
  "    else if (first >= 194 && first <= 223) { code = first & 31; needed = 1; minimum = 128; }",
  "    else if (first >= 224 && first <= 239) { code = first & 15; needed = 2; minimum = 2048; }",
  "    else if (first >= 240 && first <= 244) { code = first & 7; needed = 3; minimum = 65536; }",
  '    else throw new Error("Invalid UTF-8");',
  '    if (i + needed > bytes.length) throw new Error("Truncated UTF-8");',
  "    for (var n = 0; n < needed; n++) {",
  "      var next = bytes[i++];",
  '      if ((next & 192) !== 128) throw new Error("Invalid continuation");',
  "      code = (code << 6) | (next & 63);",
  "    }",
  '    if (code < minimum || code > 1114111 || (code >= 55296 && code <= 57343)) throw new Error("Invalid scalar");',
  "    if (code > 65535) { code -= 65536; chunk += String.fromCharCode(55296 + (code >> 10), 56320 + (code & 1023)); }",
  "    else chunk += String.fromCharCode(code);",
  '    if (chunk.length >= 4096) { parts.push(chunk); chunk = ""; }',
  "  }",
  '  parts.push(chunk); return parts.join("");',
  "}"
].join("\n");
generic = makeGeneric(decode);
const egern = [
  "// Generated Meituan Waimai v0.2.0. Native Egern ctx API.",
  core, decode,
  "export default async function(ctx) {",
  "  var cleaner = createMeituanCleaner(), bytes;",
  "  try {",
  "    var kind = cleaner.kind(ctx.request && ctx.request.url);",
  "    if (!kind) return;",
  "    if (!ctx.response) {",
  '      if (kind === "load") {',
  "        var requestHeaders = ctx.request.headers;",
  '        requestHeaders.delete("If-None-Match"); requestHeaders.delete("If-Modified-Since");',
  '        requestHeaders.set("Cache-Control", "no-cache"); requestHeaders.set("Pragma", "no-cache");',
  "        return { headers: requestHeaders };",
  "      }",
  '      var type = kind === "ad" ? "application/json; charset=utf-8" : kind === "image" ? "image/gif" : "application/octet-stream";',
  '      var body = kind === "ad" ? "{}" : kind === "image" ? new Uint8Array(' + JSON.stringify(gif) + ') : "";',
  '      return ctx.respond({ status: 200, headers: { "Content-Type": type, "Cache-Control": "no-store" }, body: body });',
  "    }",
  '    if (kind !== "load" || ctx.response.status !== 200 || !ctx.response.body) return;',
  "    bytes = new Uint8Array(await ctx.response.arrayBuffer());",
  "    if (bytes.length > cleaner.maxBody) return { body: bytes };",
  "    var text = decodeUtf8(bytes), next = cleaner.clean(text);",
  "    if (next === text) return { body: bytes };",
  "    var headers = ctx.response.headers;",
  '    ["ETag", "Last-Modified", "Content-MD5", "Digest", "Expires", "Pragma"].forEach(function (key) { headers.delete(key); });',
  '    headers.set("Cache-Control", "no-store"); headers.set("Pragma", "no-cache"); headers.set("Expires", "0");',
  "    return { headers: headers, body: next };",
  "  } catch (error) {",
  "    // A consumed body must be returned, even when unsupported or malformed.",
  "    if (bytes) return { body: bytes };",
  "  }", "}", ""
].join("\n");

export function build(commit) {
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error("Expected an immutable 40-digit source commit");
  const files = {};
  for (const client of clients) files[client + "/script/MeituanWaimai.js"] = client === "Egern" ? egern : generic;
  const script = client => rawRoot + commit + "/" + client + "/script/MeituanWaimai.js";
  const yaml = value => JSON.stringify(value);
  const all = [p.load, p.ad, ...p.image, ...p.media].map(re => "(?:" + re + ")").join("|");
  files[entries.Egern] = [
    "# 美团外卖去广告 v0.2.0 · Egern 原生模块",
    "# 2026-10-20 · 广告接口、素材与开屏配置缓存处理",
    "name: 美团外卖去广告",
    "description: v0.2.0 · 开屏广告和已知广告素材；首页推广与红包弹窗仍需实测。",
    "author: Horatio Xu",
    "homepage: https://github.com/hhhoratioxu/Proxy",
    "manual: https://github.com/hhhoratioxu/Proxy/blob/main/Egern/Docs/MeituanWaimai.md",
    "mitm:", "  hostnames:", ...hosts.map(h => "    - " + yaml(h)),
    "scriptings:", "  - http_request:",
    "      name: 美团外卖 · 广告拦截与配置刷新",
    "      match: " + yaml(all),
    "      script_url: " + script("Egern"),
    "      body_required: false", "      timeout: 8", "      update_interval: 86400",
    "  - http_response:",
    "      name: 美团外卖 · 开屏配置清理",
    "      match: " + yaml(p.load),
    "      script_url: " + script("Egern"),
    "      body_required: true", "      binary_body: true",
    "      max_size: 2097152", "      timeout: 8", "      update_interval: 86400", ""
  ].join("\n");

  const url = "$" + "{url}";
  files[entries.Loon] = [
    "#!name = 美团外卖去广告",
    "#!desc = v0.2.0 · 广告接口、广告素材与开屏配置缓存处理；实际效果需真机确认。",
    "#!author = Horatio Xu", "#!homepage = https://github.com/hhhoratioxu/Proxy",
    "#!loon_version = 3.5.1(983)", "#!date = 2026-10-20", "",
    "[Rewrite]",
    "request if " + url + " ~= /" + p.ad + '/ then reject_dict(200)',
    ...p.image.map(re => "request if " + url + " ~= /" + re + "/ then reject_img(200)"),
    ...p.media.map(re => "request if " + url + " ~= /" + re + "/ then reject(200)"),
    "request if " + url + " ~= /" + p.load + '/ then request.header.del("If-None-Match") | request.header.del("If-Modified-Since") | request.header.set("Cache-Control", "no-cache") | request.header.set("Pragma", "no-cache")',
    "", "[Script]",
    "response if " + url + " ~= /" + p.load + '/ then script("' + script("Loon") + '") with tag="美团外卖去广告", timeout=8, requires_body=true',
    "", "[Mitm]", "hostname = " + hosts.join(", "), ""
  ].join("\n");

  files[entries.Surge] = [
    "#!name=美团外卖去广告",
    "#!desc=v0.2.0 · 开屏接口、广告素材与配置缓存处理；Surge iOS 5.9.1+/Mac 5.5.1+。",
    "#!author=Horatio Xu", "#!homepage=https://github.com/hhhoratioxu/Proxy", "",
    "[General]", "force-http-engine-hosts = %APPEND% " + hosts.join(", "), "",
    "[Map Local]",
    p.ad + ' data-type=text data="{}" status-code=200 header="Content-Type:application/json; charset=utf-8|Cache-Control:no-store"',
    ...p.image.map(re => re + ' data-type=tiny-gif status-code=200 header="Cache-Control:no-store"'),
    ...p.media.map(re => re + ' data-type=text data="" status-code=200 header="Cache-Control:no-store"'),
    "", "[Script]",
    "MeituanWaimaiRequest = type=http-request,pattern=" + p.load + ",script-path=" + script("Surge") + ",timeout=8",
    "MeituanWaimai = type=http-response,pattern=" + p.load + ",script-path=" + script("Surge") + ",requires-body=true,max-size=2097152,timeout=8",
    "", "[MITM]", "hostname = %APPEND% " + hosts.join(", "), ""
  ].join("\n");
  files[entries.Shadowrocket] = [
    "#!name=美团外卖去广告",
    "#!desc=v0.2.0 · 开屏接口、广告素材与配置缓存处理；实际效果需真机确认。",
    "#!author=Horatio Xu", "#!homepage=https://github.com/hhhoratioxu/Proxy", "",
    "[General]", "force-http-engine-hosts = %APPEND% " + hosts.join(", "), "",
    "[Rule]", "URL-REGEX," + p.ad + ",REJECT-DICT",
    ...p.image.map(re => "URL-REGEX," + re + ",REJECT-IMG"),
    ...p.media.map(re => "URL-REGEX," + re + ",REJECT-200"),
    "", "[Script]",
    "MeituanWaimaiRequest = type=http-request,pattern=" + p.load + ",script-path=" + script("Shadowrocket") + ",timeout=8",
    "MeituanWaimai = type=http-response,pattern=" + p.load + ",script-path=" + script("Shadowrocket") + ",requires-body=1,max-size=2097152,timeout=8",
    "", "[MITM]", "hostname = %APPEND% " + hosts.join(", "), ""
  ].join("\n");
  files[entries.QuantumultX] = [
    "# 美团外卖去广告 v0.2.0 · Quantumult X 远程重写资源",
    "# 添加到 rewrite_remote；2026-10-20",
    "hostname = " + hosts.join(", "), "",
    p.ad + " url reject-dict",
    ...p.image.map(re => re + " url reject-img"),
    ...p.media.map(re => re + " url reject-200"),
    p.load + " url script-request-header " + script("QuantumultX"),
    p.load + " url script-response-body " + script("QuantumultX"), ""
  ].join("\n");
  return files;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = build(process.argv[2] || "0".repeat(40));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(root, name), content);
  console.log("Generated " + Object.keys(files).length + " native imports and runtimes");
}
