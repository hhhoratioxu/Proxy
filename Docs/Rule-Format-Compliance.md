# 规则格式兼容性与全库规范化记录 / Rule Format Compliance

最后审核：**2026-10-25**。仓库共 **26 个规则类别 × 6 个客户端 = 156 个分流文件**。

这次审核的是**远程规则文件格式**，不是订阅配置文件，也不代表所有域名、IP 地址实时可用。以现有 Loon 规则数据为转换基准，保持匹配类型和原始匹配值（但去掉被前序同匹配条件完全覆盖的冗余规则）；对 ParsecP2P 采用客户端专属版本。客户端安装及代理策略仍由用户单独指定。

| 客户端 | 规则集格式 | 规则类型处理 | 导入/引用方式 |
| --- | --- | --- | --- |
| Loon | 每行一个 `DOMAIN` / `IP-CIDR` 等规则，无策略 | 支持 `IP-CIDR6`、`IP-ASN` 和受请求可见性限制的 `USER-AGENT` | 远程规则订阅（`rule URL,策略组`） |
| Egern | YAML：`domain_set`、`domain_suffix_set`、`ip_cidr6_set`、`asn_set` 等 | IP 类条件的 `no_resolve` 是规则集层级开关，无法逐项精确复现不同旗标 | 在 Egern 配置的 `rule_set` 引用远程 YAML，并指定策略 |
| Surge | 每行一个不含策略的外部规则 | `IP-CIDR6`、`IP-ASN`、`USER-AGENT` 等；UA 依赖 HTTP 可见信息 | `RULE-SET,https://.../Surge/rule/xxx.list,策略` |
| Shadowrocket | 一行一条规则，不含策略 | 保留支持的 `IP-CIDR6`、`IP-ASN`、`USER-AGENT`；设备上的实际行为需验收 | 引入规则集后绑定策略 |
| Quantumult X | `HOST`、`HOST-SUFFIX`、`HOST-KEYWORD`、`IP6-CIDR` 等 | `DOMAIN-*` 转为 `HOST-*`；`IP-CIDR6` 转为 `IP6-CIDR` | `[filter_remote]` 远程 URL 配 `force-policy` |
| Clash / Mihomo | YAML `payload`，`behavior: classical` | 不支持 `USER-AGENT`，已在该端省略；逻辑规则使用 Mihomo 类型 | `rule-providers` 配 `behavior: classical, format: yaml`，再用 `RULE-SET` |

## 本次关键更正

- 清理同一种类型、同一匹配值被更早的普通规则覆盖的冗余 `no-resolve` 变体，避免跨客户端重复规则。具体涉及 Apple（4 条）、Telegram（5 条）、WeChat（1 条）；没有从规则集中删除这些 IP / ASN 匹配对象。
- 全六端重新生成兼容格式，统一了规则数量标记和引入方式；Egern YAML 统一对匹配值进行字符串转义，Mihomo `payload` 保持 YAML 可解析。
- `ParsecP2P` 不做不安全的“一刀切”转换：Loon/Surge/Mihomo 支持不同条件组合，Egern/Shadowrocket 只保留 STUN 域名，Quantumult X 的源端口匹配取决于客户端支持且有误分流风险。所有客户端均无法仅靠此规则保证 NAT 打洞成功。
- 原有流量优先级仍由主配置文件或扩展脚本决定：跨规则集的覆盖关系、DNS/TUN、客户端版本和节点 UDP 支持不能仅靠单个规则文件静态验证。

## 对照文档

- [Loon 官方规则与远程规则](https://nsloon.app/docs/Rule/sub_rule/) · [IP / IPv6](https://nsloon.app/docs/Rule/ip_rule/)
- [Egern 官方 Rules / Rule Sets](https://egernapp.com/docs/configuration/rules/)
- [Surge 官方 Rule Sets](https://manual.nssurge.com/rules/ruleset.html) · [规则类型](https://manual.nssurge.com/rules/overview.html)
- [Quantumult X 开发者 sample.conf](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)
- [Mihomo 官方 Rule Providers](https://wiki.metacubex.one/en/config/rule-providers/) · [classical 内容规范](https://wiki.metacubex.one/en/config/rule-providers/content/)
- [Shadowrocket 社区规则语法参考](https://doc.repcz.link/shadowrocket/rule/)

## 验证范围与限制

本次检查包括文件目录完整性、六端规则类型映射、匹配值及重复性、YAML / 逐行规则结构、规则条数与不支持类型的处理。**未连接你的全部设备逐一运行原生客户端实测，也未验证所有匹配对象的当前归属。** Spotify 图片 CDN 若仍无法打开，请继续检查 DNS、规则优先级、节点线路与代理接管，而不要将规则格式更新视为 CDN 故障已解决。
