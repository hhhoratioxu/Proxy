# Surge

**StarDesk（2026-11-26）：** [直接订阅 StarDesk.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/StarDesk.list) · [使用说明](../Docs/StarDesk-Routing.md)。建议 DIRECT；当前共 27 类，之前带日期的审核统计保留历史范围。

2026-11-13 分流复核：保留 **26 类、5,927 条**默认条件，规则、跨端差异与验证结果见[官方依据优化报告](../Docs/Official-Optimization-2026-11-13.md)。原有订阅地址及安装入口继续使用。

[分流规则](./rule/) · [可导入插件](./script/) · [共用图标](../Icons/)

**AI 分流复核（2026-11-13）：961 条。** [直接订阅 AI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/AI.list) · [覆盖范围与使用说明](../Docs/AI-Routing.md) · [固定来源与授权](../Docs/AI-Sources.md)。原订阅地址继续使用，更新远程规则即可。

## 分流规则订阅

本目录现有 **27 组** Surge 原生 `RULE-SET` 分流规则。下表均为可直接订阅的原始地址；策略在 Surge 引用规则集时选择，规则文件内不写入节点或策略组名称。

| 分流规则 | 条目数 | 直接订阅地址 |
| --- | ---: | --- |
| AI | 961 | [AI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/AI.list) |
| Adobe | 142 | [Adobe.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Adobe.list) |
| Apple | 1596 | [Apple.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Apple.list) |
| 哔哩哔哩 | 124 | [Bilibili.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Bilibili.list) |
| Disney+ | 232 | [Disney.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Disney.list) |
| GitHub | 59 | [GitHub.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/GitHub.list) |
| Google / YouTube | 865 | [Google.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Google.list) |
| HBO Max | 88 | [HBOMAX.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/HBOMAX.list) |
| Infuse | 13 | [Infuse.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Infuse.list) |
| 局域网 LAN | 143 | [LAN.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/LAN.list) |
| 美团 | 24 | [Meituan.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Meituan.list) |
| Meta | 572 | [Meta.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Meta.list) |
| Microsoft | 716 | [Microsoft.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Microsoft.list) |
| 时间同步 NTP | 84 | [NTP.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/NTP.list) |
| Netflix | 48 | [Netflix.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Netflix.list) |
| Parsec | 3 | [Parsec.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Parsec.list) |
| Parsec P2P | 3 | [ParsecP2P.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/ParsecP2P.list) |
| Siri AI | 6 | [SiriAI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/SiriAI.list) |
| StarDesk | 1 | [StarDesk.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/StarDesk.list) |
| Spotify | 30 | [Spotify.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Spotify.list) |
| Telegram | 52 | [Telegram.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Telegram.list) |
| TikTok | 36 | [TikTok.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/TikTok.list) |
| X / Twitter | 33 | [Twitter.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Twitter.list) |
| 微信 | 32 | [WeChat.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/WeChat.list) |
| Weverse | 14 | [Weverse.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Weverse.list) |
| 维基 Wikimedia | 22 | [Wikimedia.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Wikimedia.list) |
| 小红书 | 29 | [Xiaohongshu.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Xiaohongshu.list) |

### 使用方法

在 Surge 的规则编辑器中新增 `RULE-SET`，粘贴对应链接并选择实际存在的直连、节点或策略组。也可以在现有配置的 `[Rule]` 区段、兜底 `FINAL` 之前添加：

```ini
RULE-SET,https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/AI.list,POLICY,update-interval=86400
```

将 `POLICY` 替换为你现有的策略组名称；`update-interval=86400` 表示每 24 小时检查更新。这些文件应通过 `RULE-SET` 引用，格式包含域名、IP、ASN 及 User-Agent 等多种规则。

需要分别指定策略时，LAN、ParsecP2P、NTP 通常靠前；SiriAI 先于 AI，AI 先于一般平台；GitHub 等服务专用端点先于 Google、Apple、Microsoft 通用集合；Apple/Disney 的具名 Adobe 租户先于 Adobe。ParsecP2P 绑定 DIRECT 并排在 Parsec 控制连接代理之前；保留现有节点与策略选择。跨端 DNS 与协议边界见[开发与验证说明](../Docs/Development.md)。

### 来源与验证范围

- 最初补齐的 24 组规则来自仓库 `73e99eb3e2c36920768328b65bbf60b8eed3281f` 提交的 `Loon/rule/`，固定来源与作者说明继续保留。2026-11-13 已修正过宽匹配、历史重复及 DNS 选项，历史来源统计不代表当前内容；当前条数见表格，修改依据与范围见[优化报告](../Docs/Official-Optimization-2026-11-13.md)。
- Parsec 控制连接代理与 P2P 两类继续保留；默认 P2P 列表使用 STUN，以及仅适用于 Surge Mac 的进程 UDP 条件。旧来源埠 9000 兼容方式移至[独立可选列表](./rule/optional/ParsecP2P-Port9000.list)，需要额外引用并绑定 DIRECT，不会自动启用。平台与版本要求见[Parsec 分流说明](../Clash/Docs/Parsec.md)。
- Surge 使用原生 `DOMAIN`、`DOMAIN-SUFFIX`、`IP-CIDR`、`IP-CIDR6`、`IP-ASN` 和 `USER-AGENT`。User-Agent 规则需要 Surge 的 HTTP 引擎能读取对应请求头；保留规则不代表任意 HTTPS 流量都能命中。
- 已检查文件语法、IP 网段、来源条目一致性和发布链接；尚未在实际 Surge 客户端完成导入及流量命中验收。

格式依据：[Surge 规则集](https://manual.nssurge.com/rules/ruleset.html) · [IP 规则](https://manual.nssurge.com/rules/ip.html) · [HTTP 规则](https://manual.nssurge.com/rules/http.html)。

## 插件与模块

在 Surge「模块」中安装远程模块，粘贴下方原始地址并启用；Spotify 歌词和美团外卖模块需要已配置的 HTTPS 解密证书。

| 插件 | 安装文件原始地址 | 使用说明 |
| --- | --- | --- |
| YouTube Clean · 去广告、双语字幕与底栏 | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/YouTubeClean.sgmodule) | [设置与验证范围](./Docs/YouTubeClean.md) |
| Spotify 双语歌词 · VerseLyrics | [SpotifyLyrics.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/SpotifyLyrics.sgmodule) | [设置与已知限制](./Docs/SpotifyLyrics.md) |
| 美团外卖去广告 | [MeituanWaimai.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/MeituanWaimai.sgmodule) | [说明](./Docs/MeituanWaimai.md) |

每个插件只提供一个当前安装入口。运行依赖由客户端自动下载，维护校验位于 `tools/` 与 `tests/`，不参与客户端运行；重复验证方法见[开发说明](../Docs/Development.md)。

[Parsec 分流说明](../Clash/Docs/Parsec.md) · [目录说明](../Clash/Docs/Directory-Migration.md) · [返回首页](../README.md)
