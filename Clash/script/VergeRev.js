// Horatio Proxy — Clash Verge Rev global/profile Extended Script
// Source: https://github.com/hhhoratioxu/Proxy/tree/main/Clash
// Routes LAN / Parsec P2P / StarDesk / NTP / China services DIRECT; Meta and Parsec prefer TAG.
// Does not replace the original subscription's rules or proxies.

function main(config) {
  // Horatio Proxy | Clash Verge Rev / Mihomo extension script
  // Paste into Profiles > Extended Script. Edit POLICY_OVERRIDES if needed.
  const BASE = "https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/rule/";
  const ORDER = [
    "LAN", "ParsecP2P", "StarDesk", "NTP", "SiriAI", "AI", "Parsec", "Meta",
    "GitHub", "Telegram",
    "TikTok", "Twitter", "Spotify", "Netflix", "Disney", "HBOMAX",
    "Weverse", "Wikimedia", "Infuse",
    "Bilibili", "Meituan", "WeChat", "Xiaohongshu",
    "Google", "Apple", "Adobe", "Microsoft"
  ];
  const DIRECT_RULES = ["LAN", "ParsecP2P", "StarDesk", "NTP", "Bilibili", "Meituan", "WeChat", "Xiaohongshu"];
  // These are preferred names. If a named policy does not exist, use the main proxy group.
  const POLICY_OVERRIDES = { Meta: "TAG", Parsec: "TAG" };
  const groupNames = (config["proxy-groups"] || []).map((p) => p && p.name).filter((name) => typeof name === "string");
  const nodeNames = (config.proxies || []).map((p) => p && p.name).filter((name) => typeof name === "string");
  const names = groupNames.concat(nodeNames);
  function matchPolicy(wanted) {
    return names.find((x) => x === wanted) ||
      names.find((x) => x.toLowerCase() === wanted.toLowerCase()) || null;
  }
  const preferred = ["🚀 节点选择", "节点选择", "PROXY", "Proxy", "🌐 代理", "🚀 代理", "手动选择", "自动选择", "GLOBAL"];
  let proxyPolicy = null;
  for (const wanted of preferred) {
    proxyPolicy = matchPolicy(wanted);
    if (proxyPolicy) break;
  }
  if (!proxyPolicy) proxyPolicy = groupNames[0] || nodeNames[0] || null;
  if (!proxyPolicy) throw new Error("Horatio Clash: your subscription has no proxy groups or nodes.");
  const providers = config["rule-providers"] || {};
  const original = Array.isArray(config.rules) ? config.rules : [];
  const managedKeys = new Set(ORDER.map((name) => "Horatio-" + name));
  const existingRules = new Map();
  function managedKey(rule) {
    if (typeof rule !== "string") return null;
    const parts = rule.split(",", 3).map((part) => part.trim());
    return parts[0] === "RULE-SET" && parts.length === 3 && managedKeys.has(parts[1]) ? parts[1] : null;
  }
  for (const rule of original) {
    const key = managedKey(rule);
    if (!key) continue;
    if (!existingRules.has(key)) existingRules.set(key, []);
    existingRules.get(key).push(rule);
  }
  const addedRules = [];
  for (const name of ORDER) {
    const key = "Horatio-" + name;
    // Existing URLs, refresh intervals and download policies are user settings.
    // Fill defaults only for a new provider; retain custom match-policy variants.
    if (!Object.prototype.hasOwnProperty.call(providers, key)) providers[key] = {
      type: "http",
      behavior: "classical",
      format: "yaml",
      url: BASE + name + ".yaml",
      path: "./rule-providers/horatio-" + name.toLowerCase() + ".yaml",
      interval: 86400,
      proxy: proxyPolicy
    };
    const policy = DIRECT_RULES.includes(name)
      ? "DIRECT"
      : (matchPolicy(POLICY_OVERRIDES[name] || "") || proxyPolicy);
    if (existingRules.has(key)) addedRules.push(...existingRules.get(key));
    else addedRules.push("RULE-SET," + key + "," + policy);
  }
  config["rule-providers"] = providers;
  config.rules = addedRules.concat(original.filter((rule) => !managedKey(rule)));
  return config;
}
