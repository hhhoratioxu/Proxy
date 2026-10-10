// Horatio Proxy — Clash Verge Rev global/profile Extended Script
// Source: https://github.com/hhhoratioxu/Proxy/tree/main/Clash
// Routes LAN / Parsec P2P / NTP / China services DIRECT; Meta and Parsec prefer TAG.
// Does not replace the original subscription's rules or proxies.

function main(config) {
  // Horatio Proxy | Clash Verge Rev / Mihomo extension script
  // Paste into Profiles > Extended Script. Edit POLICY_OVERRIDES if needed.
  const BASE = "https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/";
  const ORDER = [
    "LAN", "ParsecP2P", "NTP", "AI", "SiriAI", "Parsec", "Meta",
    "Google", "Apple", "Microsoft", "GitHub", "Telegram",
    "TikTok", "Twitter", "Spotify", "Netflix", "Disney", "HBOMAX",
    "Weverse", "Wikimedia", "Adobe", "Infuse",
    "Bilibili", "Meituan", "WeChat", "Xiaohongshu"
  ];
  const DIRECT_RULES = ["LAN", "ParsecP2P", "NTP", "Bilibili", "Meituan", "WeChat", "Xiaohongshu"];
  // These are preferred names. If a named policy does not exist, use the main proxy group.
  const POLICY_OVERRIDES = { Meta: "TAG", Parsec: "TAG" };
  const groupNames = (config["proxy-groups"] || []).map((p) => p && p.name).filter(Boolean);
  const nodeNames = (config.proxies || []).map((p) => p && p.name).filter(Boolean);
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
  const addedRules = [];
  for (const name of ORDER) {
    const key = "Horatio-" + name;
    providers[key] = {
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
    addedRules.push("RULE-SET," + key + "," + policy);
  }
  config["rule-providers"] = providers;
  const original = Array.isArray(config.rules) ? config.rules : [];
  config.rules = addedRules.concat(original.filter(
    (r) => typeof r !== "string" || !r.startsWith("RULE-SET,Horatio-")
  ));
  return config;
}
