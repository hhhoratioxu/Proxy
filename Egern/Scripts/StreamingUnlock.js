const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const C = {
  label: { light: "#000000", dark: "#FFFFFF" },
  secondary: { light: "#6E6E73", dark: "#98989D" },
  tertiary: { light: "#8E8E93", dark: "#8E8E93" },
  bg: { light: "#F2F2F7", dark: "#000000" },
  card: { light: "#FFFFFF", dark: "#1C1C1E" },
  border: { light: "#D1D1D6", dark: "#38383A" },
  green: "#34C759",
  orange: "#FF9F0A",
  red: "#FF453A",
  blue: "#0A84FF",
  gray: "#8E8E93",
  netflix: "#E50914",
  max: "#6C4BFF",
  youtube: "#FF0000",
  chatgpt: "#10A37F"
};

const SERVICE_ORDER = ["Netflix", "Max", "YouTube Premium", "ChatGPT"];

function env(ctx, key, fallback = "") {
  const v = ctx.env?.[key];
  return String(v == null ? fallback : v).trim();
}

function timeout(ctx) {
  const n = Number(env(ctx, "TIMEOUT", "8000"));
  return Number.isFinite(n) && n > 0 ? n : 8000;
}

function req(ctx, extra = {}) {
  return {
    credentials: "omit",
    timeout: timeout(ctx),
    ...extra,
    headers: {
      "User-Agent": UA,
      ...(extra.headers || {})
    }
  };
}

async function text(resp) {
  try { return await resp.text(); } catch { return ""; }
}

function header(resp, name) {
  try {
    if (resp?.headers?.get) return resp.headers.get(name) || "";
    const h = resp?.headers || {};
    return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()] || "";
  } catch {
    return "";
  }
}

async function get(ctx, url, extra = {}) {
  return ctx.http.get(url, req(ctx, extra));
}

function result(name, state, detail = "", region = "", extra = {}) {
  return { name, state, detail, region, ...extra };
}

function meta(state) {
  if (state === "ok") return { label: "已解锁", color: C.green, symbol: "checkmark.circle.fill" };
  if (state === "partial") return { label: "部分可用", color: C.orange, symbol: "exclamationmark.circle.fill" };
  if (state === "blocked") return { label: "不可用", color: C.red, symbol: "xmark.circle.fill" };
  return { label: "检测失败", color: C.gray, symbol: "questionmark.circle.fill" };
}

function serviceInfo(name) {
  if (name === "Netflix") return {
    title: "Netflix",
    policy: "Netflix",
    nodeEnv: "NETFLIX_NODE",
    iconText: "N",
    iconColor: C.netflix
  };
  if (name === "Max") return {
    title: "Max",
    policy: "HBOMAX",
    nodeEnv: "MAX_NODE",
    iconText: "max",
    iconColor: C.max
  };
  if (name === "YouTube Premium") return {
    title: "YouTube",
    policy: "Google",
    nodeEnv: "YOUTUBE_NODE",
    iconText: "▶",
    iconColor: C.youtube
  };
  return {
    title: "ChatGPT",
    policy: "AI",
    nodeEnv: "CHATGPT_NODE",
    iconText: "✦",
    iconColor: C.chatgpt
  };
}

async function cloudflareTrace(ctx, url) {
  try {
    const r = await get(ctx, url);
    const t = await text(r);
    const d = {};
    t.split("\n").forEach(line => {
      const i = line.indexOf("=");
      if (i > 0) d[line.slice(0, i)] = line.slice(i + 1).trim();
    });
    const ip = d.ip || "";
    let org = "";
    if (ip && typeof ctx.lookupIP === "function") {
      try { org = ctx.lookupIP(ip)?.organization || ""; } catch {}
    }
    return { ip, region: d.loc || "", org };
  } catch {
    return { ip: "", region: "", org: "" };
  }
}

async function netflix(ctx) {
  try {
    const ids = ["81280792", "70143836"];
    const checks = await Promise.all(ids.map(async id => {
      const r = await get(ctx, `https://www.netflix.com/title/${id}`, {
        redirect: "follow",
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Upgrade-Insecure-Requests": "1"
        }
      });
      const t = await text(r);
      if (!t) return { networkError: true, blocked: false, t: "", status: r.status };
      const blocked = /Oh no!/i.test(t);
      return { networkError: false, blocked, t, status: r.status };
    }));

    if (checks.some(x => x.networkError)) {
      return result("Netflix", "error", "网络请求失败");
    }

    const body = checks.map(x => x.t).join("\n");
    const region =
      (body.match(/"countryCode"\s*:\s*"([A-Z]{2})"/) || [])[1] ||
      (body.match(/"countryCode":"([A-Z]{2})"/) || [])[1] ||
      "";

    if (checks.every(x => x.blocked)) {
      return result("Netflix", "partial", "仅自制剧", region);
    }

    if (checks.some(x => !x.blocked && x.status >= 200 && x.status < 400)) {
      return result("Netflix", "ok", "完整片库", region);
    }

    return result("Netflix", "error", "页面状态异常", region);
  } catch {
    return result("Netflix", "error", "请求失败");
  }
}

async function maxCheck(ctx) {
  try {
    const r = await get(ctx, "https://www.max.com/", {
      redirect: "follow",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const t = await text(r);
    if (!t) return result("Max", "error", "网络请求失败");

    const cookie = header(r, "set-cookie");
    const location = header(r, "location");
    const raw = `${cookie}\n${location}\n${t}`;

    const region =
      (raw.match(/countryCode=([A-Z]{2})/) || [])[1] ||
      (raw.match(/"countryCode"\s*:\s*"([A-Z]{2})"/) || [])[1] ||
      "";

    if (!region) {
      return result("Max", "error", "未识别地区");
    }

    const available = new Set(["US"]);
    const re = /"url"\s*:\s*"\/([a-z]{2})\/[a-z]{2}"/g;
    let m;
    while ((m = re.exec(t)) !== null) available.add(m[1].toUpperCase());

    if (available.has(region)) {
      return result("Max", "ok", "完整解锁", region);
    }

    return result("Max", "blocked", "地区不支持", region);
  } catch {
    return result("Max", "error", "请求失败");
  }
}

async function youtube(ctx) {
  try {
    const ytCookie = "VISITOR_PRIVACY_METADATA=CgJERRIEEgAgYQ%3D%3D; PREF=f7=4000";
    const r = await get(ctx, "https://www.youtube.com/premium", {
      redirect: "follow",
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": ytCookie
      }
    });
    const t = await text(r);

    if (!t) return result("YouTube Premium", "error", "网络请求失败");

    if (/www\.google\.cn/i.test(t)) {
      return result("YouTube Premium", "blocked", "Premium 不可用", "CN");
    }

    const region =
      (t.match(/"INNERTUBE_CONTEXT_GL"\s*:\s*"([^"]+)"/) || [])[1] ||
      "";

    if (/Premium is not available in your country/i.test(t)) {
      return result("YouTube Premium", "blocked", "Premium 不可用", region);
    }

    if (/ad-free/i.test(t)) {
      return result("YouTube Premium", "ok", "Premium 可用", region || "UNKNOWN");
    }

    return result("YouTube Premium", "error", "页面特征异常", region);
  } catch {
    return result("YouTube Premium", "error", "请求失败");
  }
}

async function chatgpt(ctx) {
  const trace = await cloudflareTrace(ctx, "https://chatgpt.com/cdn-cgi/trace");

  try {
    const [apiResp, iosResp] = await Promise.all([
      get(ctx, "https://api.openai.com/compliance/cookie_requirements", {
        headers: {
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Authorization": "Bearer null",
          "Content-Type": "application/json",
          "Origin": "https://platform.openai.com",
          "Referer": "https://platform.openai.com/"
        }
      }),
      get(ctx, "https://ios.chat.openai.com/", {
        redirect: "follow",
        headers: {
          "Accept": "*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "en-US,en;q=0.9",
          "Upgrade-Insecure-Requests": "1"
        }
      })
    ]);

    const apiText = await text(apiResp);
    const iosText = await text(iosResp);

    if (!apiText || !iosText) {
      return result("ChatGPT", "error", "检测接口无响应", trace.region, trace);
    }

    const webBlocked = /unsupported_country/i.test(apiText);
    const appBlocked = /VPN/i.test(iosText);

    if (!webBlocked && !appBlocked) {
      return result("ChatGPT", "ok", "Web + App 可用", trace.region, trace);
    }

    if (!webBlocked && appBlocked) {
      return result("ChatGPT", "partial", "仅 Web 可用", trace.region, trace);
    }

    if (webBlocked && !appBlocked) {
      return result("ChatGPT", "partial", "仅 App 可用", trace.region, trace);
    }

    return result("ChatGPT", "blocked", "Web + App 不可用", trace.region, trace);
  } catch {
    return result("ChatGPT", "error", "请求失败", trace.region, trace);
  }
}

function endpointInfo(ctx, item) {
  const info = serviceInfo(item.name);
  const manualNode = env(ctx, info.nodeEnv, "");
  if (manualNode) return { kind: "节点", value: manualNode };
  if (item.ip) {
    const suffix = item.ip.length > 21 ? `${item.ip.slice(0, 18)}…` : item.ip;
    return { kind: "出口", value: `${item.region || "--"} · ${suffix}` };
  }
  if (item.region) return { kind: "出口", value: item.region };
  return { kind: "出口", value: "按规则" };
}

function policyLabel(item) {
  return serviceInfo(item.name).policy;
}

function iconTile(item, compact = false) {
  const info = serviceInfo(item.name);
  return {
    type: "stack",
    direction: "row",
    alignItems: "center",
    width: compact ? 28 : 34,
    height: compact ? 28 : 34,
    borderRadius: compact ? 7 : 9,
    backgroundColor: info.iconColor,
    children: [
      { type: "spacer" },
      {
        type: "text",
        text: info.iconText,
        font: { size: compact ? 14 : (item.name === "Max" ? 11 : 17), weight: "bold" },
        textColor: "#FFFFFF",
        textAlign: "center",
        minScale: 0.6,
        maxLines: 1
      },
      { type: "spacer" }
    ]
  };
}

function statusBadge(item) {
  const m = meta(item.state);
  return {
    type: "stack",
    direction: "row",
    alignItems: "center",
    gap: 3,
    padding: [3, 6],
    borderRadius: 999,
    backgroundColor: { light: "#F2F2F7", dark: "#2C2C2E" },
    children: [
      { type: "image", src: `sf-symbol:${m.symbol}`, width: 10, height: 10, color: m.color },
      { type: "text", text: m.label, font: { size: 9.5, weight: "semibold" }, textColor: m.color }
    ]
  };
}

function card(ctx, item) {
  const info = serviceInfo(item.name);
  const ep = endpointInfo(ctx, item);
  return {
    type: "stack",
    direction: "column",
    flex: 1,
    gap: 7,
    padding: 11,
    borderRadius: 17,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    url: "egern:/connections",
    children: [
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 8,
        children: [
          iconTile(item),
          {
            type: "text",
            text: info.title,
            font: { size: 14, weight: "bold" },
            textColor: C.label,
            flex: 1,
            maxLines: 1
          }
        ]
      },
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 6,
        children: [
          {
            type: "text",
            text: `${item.region || "--"} · ${item.detail || meta(item.state).label}`,
            font: { size: 10.5, weight: "medium" },
            textColor: C.secondary,
            flex: 1,
            maxLines: 1,
            minScale: 0.62
          },
          statusBadge(item)
        ]
      },
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 5,
        children: [
          { type: "image", src: "sf-symbol:point.3.connected.trianglepath.dotted", width: 10, height: 10, color: C.blue },
          { type: "text", text: `策略  ${policyLabel(item)}`, font: { size: 10, weight: "medium" }, textColor: C.secondary, maxLines: 1, minScale: 0.65 }
        ]
      },
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 5,
        children: [
          { type: "image", src: "sf-symbol:network", width: 10, height: 10, color: C.blue },
          { type: "text", text: `${ep.kind}  ${ep.value}`, font: { size: 10, weight: "medium" }, textColor: C.label, flex: 1, maxLines: 1, minScale: 0.55 },
          { type: "image", src: "sf-symbol:chevron.right", width: 7, height: 7, color: C.tertiary }
        ]
      }
    ]
  };
}

function compactRow(ctx, item) {
  const info = serviceInfo(item.name);
  const m = meta(item.state);
  const ep = endpointInfo(ctx, item);
  return {
    type: "stack",
    direction: "row",
    alignItems: "center",
    gap: 7,
    url: "egern:/connections",
    children: [
      iconTile(item, true),
      {
        type: "stack",
        direction: "column",
        flex: 1,
        gap: 1,
        children: [
          { type: "text", text: info.title, font: { size: 11, weight: "semibold" }, textColor: C.label, maxLines: 1 },
          { type: "text", text: `${item.region || "--"} · ${policyLabel(item)} · ${ep.value}`, font: { size: 8.5, weight: "medium" }, textColor: C.secondary, maxLines: 1, minScale: 0.5 }
        ]
      },
      { type: "image", src: `sf-symbol:${m.symbol}`, width: 13, height: 13, color: m.color }
    ]
  };
}

function summary(items) {
  const ok = items.filter(x => x.state === "ok").length;
  return `${ok} / 4 已解锁`;
}

function clockText() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `更新 ${h}:${m}`;
}

function widget(ctx, items) {
  const family = ctx.widgetFamily || "systemMedium";

  if (family === "accessoryInline") {
    return { type: "widget", children: [{ type: "text", text: `Streaming · ${summary(items)}` }] };
  }

  if (family === "accessoryCircular") {
    const ok = items.filter(x => x.state === "ok").length;
    return {
      type: "widget",
      children: [
        { type: "image", src: "sf-symbol:play.tv.fill", width: 14, height: 14 },
        { type: "text", text: `${ok}/4`, font: { size: "caption1", weight: "bold" } }
      ]
    };
  }

  if (family === "accessoryRectangular") {
    return {
      type: "widget",
      children: [
        { type: "text", text: "Streaming", font: { size: "headline", weight: "semibold" } },
        { type: "text", text: items.map(x => `${serviceInfo(x.name).title} ${x.region || "--"}`).join(" · "), font: { size: "caption2" }, maxLines: 2 }
      ]
    };
  }

  const header = {
    type: "stack",
    direction: "row",
    alignItems: "center",
    children: [
      {
        type: "stack",
        direction: "column",
        flex: 1,
        gap: 1,
        children: [
          { type: "text", text: "Streaming", font: { size: 18, weight: "bold" }, textColor: C.label },
          { type: "text", text: "Netflix · Max · YouTube · ChatGPT", font: { size: 9.5, weight: "medium" }, textColor: C.secondary, maxLines: 1, minScale: 0.7 }
        ]
      },
      {
        type: "stack",
        direction: "column",
        alignItems: "end",
        gap: 1,
        children: [
          { type: "text", text: summary(items), font: { size: 11, weight: "semibold" }, textColor: C.blue },
          { type: "text", text: clockText(), font: { size: 9 }, textColor: C.tertiary }
        ]
      }
    ]
  };

  if (family === "systemSmall") {
    return {
      type: "widget",
      backgroundColor: C.bg,
      padding: 12,
      gap: 8,
      url: "egern:/connections",
      children: [
        header,
        ...items.map(x => compactRow(ctx, x))
      ]
    };
  }

  const row1 = { type: "stack", direction: "row", gap: 8, children: [card(ctx, items[0]), card(ctx, items[1])] };
  const row2 = { type: "stack", direction: "row", gap: 8, children: [card(ctx, items[2]), card(ctx, items[3])] };

  return {
    type: "widget",
    backgroundColor: C.bg,
    padding: 13,
    gap: 9,
    children: [header, row1, row2]
  };
}

export default async function(ctx) {
  const tasks = [netflix(ctx), maxCheck(ctx), youtube(ctx), chatgpt(ctx)];
  const settled = await Promise.allSettled(tasks);
  const items = settled.map((x, i) => x.status === "fulfilled" ? x.value : result(SERVICE_ORDER[i], "error", "脚本异常"));

  if (!ctx.widgetFamily && typeof ctx.notify === "function") {
    ctx.notify({
      title: "Streaming Unlock",
      subtitle: summary(items),
      body: items.map(x => {
        const m = meta(x.state);
        const ep = endpointInfo(ctx, x); return `${m.label} · ${serviceInfo(x.name).title} · ${x.region || "--"} · ${ep.kind} ${ep.value}`;
      }).join("\n"),
      action: { type: "openUrl", url: "egern:/connections" }
    });
  }

  return widget(ctx, items);
}
