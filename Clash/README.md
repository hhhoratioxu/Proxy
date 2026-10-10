# Clash Verge Rev / Mihomo

本目录包含 **26 组** `classical` 格式的远程分流规则。原有 Loon / Egern / Quantumult X / Shadowrocket 内容未受影响。

## 最方便的方式：扩展脚本

1. 先在 Clash Verge Rev 载入自己的节点订阅，确认代理组可用。
2. 进入「订阅 Profiles」，对要使用的订阅选择 **扩展脚本 / Extended Script**（或使用全局扩展脚本）。
3. 复制 [VergeRev.js](./VergeRev.js) 的完整内容粘贴保存，然后更新/启用订阅。
4. 将内核模式设为 **Rule**；到规则页检查 `Horatio-*` 规则提供者是否成功下载，日志是否出现规则命中。

注意：这个 JS 是**扩展脚本的源码**，不是代理节点订阅 URL，也不能直接当作 Mihomo YAML 导入。Clash Verge Rev 的扩展配置与扩展脚本是两个不同入口。

脚本会自动识别一个已有代理组作为默认代理策略；如果存在名字为 `TAG` 的节点或代理组，`Meta` 与 `Parsec` 优先走它，否则退回默认代理组。可直接编辑 `POLICY_OVERRIDES`。

| 策略 | 分类 |
| --- | --- |
| DIRECT | LAN、ParsecP2P、NTP、Bilibili、Meituan、WeChat、Xiaohongshu |
| TAG（若存在） | Meta、Parsec |
| 默认代理组 | 其他规则，包括 Apple、Google、Microsoft、AI、Netflix 等 |

**优先级：** LAN 与 ParsecP2P 在前，AI 优先于 Google、Microsoft、Meta；现有订阅规则被保留在新规则之后，原始 MATCH 仍位于末尾。Parsec 的 UDP P2P 需要 TUN 和/或进程匹配能够正确识别；仅使用直连规则不保证复杂 NAT 下必然成功建立 P2P。

## 手动接入一组规则

下面的 `POLICY` 需改为你当前订阅中真实存在的代理组或节点名（如 `TAG`）。将 `rule-providers` 放在 Mihomo 主配置的对应字段，`RULE-SET` 放进 `rules` 且在兜底 `MATCH` 前面：

```yaml
rule-providers:
  Horatio-Meta:
    type: http
    behavior: classical
    format: yaml
    url: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Meta.yaml
    path: ./rule-providers/horatio-meta.yaml
    interval: 86400
rules:
  - RULE-SET,Horatio-Meta,POLICY
  - MATCH,POLICY
```

不要只复制 `rules` 而漏掉 `rule-providers` 声明。扩展配置中的 `rules` 在部分新版 Clash Verge Rev 中会整体覆盖原规则，批量安装建议用扩展脚本。

## 全部 Raw 地址

| 分类 | 规则下载 |
| --- | --- |
| AI | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/AI.yaml) |
| Adobe | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Adobe.yaml) |
| Apple | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Apple.yaml) |
| Bilibili | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Bilibili.yaml) |
| Disney | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Disney.yaml) |
| GitHub | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/GitHub.yaml) |
| Google | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Google.yaml) |
| HBOMAX | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/HBOMAX.yaml) |
| Infuse | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Infuse.yaml) |
| LAN | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/LAN.yaml) |
| Meituan | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Meituan.yaml) |
| Meta | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Meta.yaml) |
| Microsoft | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Microsoft.yaml) |
| NTP | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/NTP.yaml) |
| Netflix | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Netflix.yaml) |
| Parsec | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Parsec.yaml) |
| ParsecP2P | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/ParsecP2P.yaml) |
| SiriAI | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/SiriAI.yaml) |
| Spotify | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Spotify.yaml) |
| Telegram | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Telegram.yaml) |
| TikTok | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/TikTok.yaml) |
| Twitter | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Twitter.yaml) |
| WeChat | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/WeChat.yaml) |
| Weverse | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Weverse.yaml) |
| Wikimedia | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Wikimedia.yaml) |
| Xiaohongshu | [Raw](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Xiaohongshu.yaml) |

## 转换说明

- 根据仓库原版 Loon 分流集转换，保留 DOMAIN、DOMAIN-SUFFIX、DOMAIN-KEYWORD、IP-CIDR、IP-CIDR6、IP-ASN 及 `no-resolve`，并去除重复的完全相同条目。
- Mihomo 不支持旧版 `USER-AGENT` 规则，因此共跳过 47 条；每份受影响文件顶部也有说明。不是百分之百语义等效，但其余支持的原规则得以保留。
- 保留此前已有的 Parsec / ParsecP2P 原版 Clash 文件。所有文件须使用 `behavior: classical`，不能用 `behavior: domain`。
- 实际路由效果还取决于 DNS、TUN、进程匹配和节点 UDP 支持；建议用 Clash Verge Rev 的连接与日志页面确认。

更新时间：2026-10-10。
