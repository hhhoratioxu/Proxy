# Surge

[分流规则](./rule/) · [可导入插件](./script/) · [共用图标](../Icons/)

## 分流规则订阅

本目录现有 **26 组** Surge 原生 `RULE-SET` 分流规则。下表均为可直接订阅的原始地址；策略在 Surge 引用规则集时选择，规则文件内不写入节点或策略组名称。

| 分流规则 | 条目数 | 直接订阅地址 |
| --- | ---: | --- |
| AI | 476 | [AI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/AI.list) |
| Adobe | 274 | [Adobe.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Adobe.list) |
| Apple | 1765 | [Apple.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Apple.list) |
| 哔哩哔哩 | 133 | [Bilibili.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Bilibili.list) |
| Disney+ | 245 | [Disney.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Disney.list) |
| GitHub | 64 | [GitHub.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/GitHub.list) |
| Google / YouTube | 887 | [Google.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Google.list) |
| HBO Max | 90 | [HBOMAX.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/HBOMAX.list) |
| Infuse | 13 | [Infuse.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Infuse.list) |
| 局域网 LAN | 145 | [LAN.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/LAN.list) |
| 美团 | 24 | [Meituan.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Meituan.list) |
| Meta | 622 | [Meta.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Meta.list) |
| Microsoft | 815 | [Microsoft.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Microsoft.list) |
| 时间同步 NTP | 85 | [NTP.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/NTP.list) |
| Netflix | 1157 | [Netflix.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Netflix.list) |
| Parsec | 3 | [Parsec.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Parsec.list) |
| Parsec P2P | 4 | [ParsecP2P.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/ParsecP2P.list) |
| Siri AI | 6 | [SiriAI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/SiriAI.list) |
| Spotify | 33 | [Spotify.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Spotify.list) |
| Telegram | 57 | [Telegram.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Telegram.list) |
| TikTok | 38 | [TikTok.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/TikTok.list) |
| X / Twitter | 34 | [Twitter.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Twitter.list) |
| 微信 | 334 | [WeChat.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/WeChat.list) |
| Weverse | 14 | [Weverse.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Weverse.list) |
| 维基 Wikimedia | 22 | [Wikimedia.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Wikimedia.list) |
| 小红书 | 29 | [Xiaohongshu.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Xiaohongshu.list) |

### 使用方法

在 Surge 的规则编辑器中新增 `RULE-SET`，粘贴对应链接并选择实际存在的直连、节点或策略组。也可以在现有配置的 `[Rule]` 区段、兜底 `FINAL` 之前添加：

```ini
RULE-SET,https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/AI.list,POLICY,update-interval=86400
```

将 `POLICY` 替换为你现有的策略组名称；`update-interval=86400` 表示每 24 小时检查更新。这些文件应通过 `RULE-SET` 引用，格式包含域名、IP、ASN 及 User-Agent 等多种规则。

需要分别指定策略时，AI 应排在 Google、Microsoft、GitHub、Meta 之前，SiriAI 和 NTP 应排在 Apple 等通用服务规则之前。局域网 LAN 通常选择 `DIRECT`；Parsec P2P 按原说明选择 `DIRECT` 并排在 Parsec 之前。

### 来源与验证范围

- 本次补齐 24 组规则，来源为仓库 `73e99eb3e2c36920768328b65bbf60b8eed3281f` 提交的 `Loon/rule/`，保留原规则条目、顺序、`no-resolve` 标记、作者和来源说明；每个新文件注明固定版本的源文件地址。
- 原有 `Parsec.list`、`ParsecP2P.list` 保持原样，具体平台能力与使用条件见 [Parsec 分流说明](../Clash/Docs/Parsec.md)。
- Surge 支持这里使用的 `DOMAIN`、`DOMAIN-SUFFIX`、`DOMAIN-KEYWORD`、`IP-CIDR`、`IP-CIDR6`、`IP-ASN` 和 `USER-AGENT`。User-Agent 规则需要 Surge 的 HTTP 引擎能读取对应请求头；保留规则不代表任意 HTTPS 流量都能命中。
- 已检查文件语法、IP 网段、来源条目一致性和发布链接；尚未在实际 Surge 客户端完成导入及流量命中验收。

格式依据：[Surge 规则集](https://manual.nssurge.com/rules/ruleset.html) · [IP 规则](https://manual.nssurge.com/rules/ip.html) · [HTTP 规则](https://manual.nssurge.com/rules/http.html)。

## 插件与模块

在 Surge「模块」中安装远程模块，粘贴下方原始地址并启用；Spotify 歌词和美团外卖模块需要已配置的 HTTPS 解密证书。

| 插件 | 安装文件原始地址 | 使用说明 |
| --- | --- | --- |
| YouTube 去广告与双语字幕 | [YouTubeAdTranslate.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/YouTubeAdTranslate.sgmodule) | [设置与验证范围](./Docs/YouTubeAdTranslate.md) |
| Spotify 双语歌词 · VerseLyrics | [SpotifyLyrics.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/SpotifyLyrics.sgmodule) | [设置与已知限制](./Docs/SpotifyLyrics.md) |
| 美团外卖去广告 | [MeituanWaimai.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/MeituanWaimai.sgmodule) | [说明](./Docs/MeituanWaimai.md) |

每个插件只提供一个当前安装入口。运行依赖由客户端自动下载，主分支不放测试、构建工具、开发压缩包或单独的依赖源码。

[Parsec 分流说明](../Clash/Docs/Parsec.md) · [目录说明](../Clash/Docs/Directory-Migration.md) · [返回首页](../README.md)
