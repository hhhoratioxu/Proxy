# Horatio Proxy

<p align="center">点击下方标题切换语言 · Select a language below</p>

<details open>
<summary><strong>🇨🇳 简体中文</strong></summary>

按 Clash、Loon、Egern、Surge、Shadowrocket、QuanX 六个客户端分类的个人规则、模块、脚本与图标配置。

各客户端的 `rule/` 存放分流规则，`script/` 只放可直接使用的当前插件、模块、重写或任务资源；`Docs/` 放安装与使用说明。共用图标统一保存在根目录 [Icons](./Icons/)。

## 客户端入口

| 客户端 | 内容 |
| --- | --- |
| Clash | [分流规则](./Clash/rule/) · [配置说明](./Clash/README.md) |
| Loon | [规则与插件](./Loon/) · [使用说明](./Loon/README.md) |
| Egern | [规则、模块与脚本](./Egern/) · [使用说明](./Egern/README.md) |
| Surge | [分流规则](./Surge/rule/) · [使用说明](./Surge/README.md) |
| Shadowrocket | [规则、脚本与模块](./Shadowrocket/) · [使用说明](./Shadowrocket/README.md) |
| QuanX / Quantumult X | [规则、脚本与任务](./QuantumultX/) · [使用说明](./QuantumultX/README.md) |


## YouTube Clean · 去广告、双语字幕与底栏控制

**1.2.7**。补齐备用译文回复的编码/保护前缀兼容，保留空项位置并细分失败原因；原生轨道、时间和格式保持。备用只接收字幕文字和语言，可关闭。每个客户端继续一个安装入口，包含去广告、双语字幕与发布「＋」/Shorts 独立开关。

| 客户端 | 安装入口 |
| --- | --- |
| Egern | [YouTubeClean.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/YouTubeClean.yaml) |
| Loon | [YouTubeClean.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/YouTubeClean.plugin) |
| Surge | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/YouTubeClean.sgmodule) |
| Shadowrocket | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/YouTubeClean.sgmodule) |
| Quantumult X | [YouTubeClean.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/YouTubeClean.conf) |
| Clash / Mihomo | [能力说明](./Clash/Docs/YouTubeClean.md) |


196 项本地检查通过。构建的 Loon 脚本对 180 条带唯一位置标记的自写韩文取得真实繁体译文，逐条核对位置与时间。实际 Loon 1.2.6 仍报 HTTP 200 / invalid-batch，回复正文未取得，具体原因和手机修复结果待确认。[源码与验证范围](https://github.com/hhhoratioxu/Proxy/tree/8cfd57baf23480d1f8ee84e4fea129741bd50dc6/Surge/script/YouTubeClean)。

## Spotify 双语歌词 · VerseLyrics

Egern、Surge、Loon、Shadowrocket、Quantumult X 已统一为 **3.1.3**，缩小歌词脚本，复用重复英文查询和副歌比较，减少缓存解码，并短暂避让异常 JSON 回复。 保留六源补词、插件翻译与原生高亮。性能测量范围见固定源码，未做 iPhone VPN 验收。Shadowrocket 完整官方脚本规范尚未取得，其兼容适配未标为官方验证。用户已确认《那页夏天》在 Loon 可显示补充歌词。Egern 的无词问题尚未解决，补源仍受客户端行为与来源收录限制。

| 客户端 | 安装入口 | 设置与限制 |
| --- | --- | --- |
| Egern | [SpotifyLyrics.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics.yaml) | [说明](./Egern/Docs/SpotifyLyrics.md) |
| Surge | [SpotifyLyrics.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/SpotifyLyrics.sgmodule) | [说明](./Surge/Docs/SpotifyLyrics.md) |
| Loon | [SpotifyLyrics.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/SpotifyLyrics.plugin) | [说明](./Loon/Docs/SpotifyLyrics.md) |
| Shadowrocket | [SpotifyLyrics.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/SpotifyLyrics.sgmodule) | [说明](./Shadowrocket/Docs/SpotifyLyrics.md) |
| Quantumult X | [SpotifyLyrics.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/SpotifyLyrics.conf) | [说明](./QuantumultX/Docs/SpotifyLyrics.md) |
| Clash / Mihomo | 无可用的响应体脚本插件 | [能力说明](./Clash/Docs/SpotifyLyrics.md) |

每个插件只保留一个当前安装入口。需要的运行脚本由客户端自动从固定版本加载，无需另外下载 JS、编译或运行测试。

[共用图标库与导入入口](./Icons/) · [目录用途与迁移说明](./Clash/Docs/Directory-Migration.md)。Parsec 分流文档保存在 `Clash/Docs/`。

测试、构建工具、验证记录和开发压缩包已从主分支移除。各客户端 README 直接列出安装文件和使用方法。

> 配置仅供个人使用，请根据客户端版本和实际网络环境调整。图标及品牌名称归各自权利人所有。

</details>

<details>
<summary><strong>🇺🇸 English</strong></summary>

A personal collection of rules, modules, scripts and icon configurations organized by six clients.

Each client keeps routing lists in `rule/` and current installable resources in `script/`. `Docs/` contains installation and usage guides. All shared icons live in the root [Icons](./Icons/) directory.

## Client directories

| Client | Content |
| --- | --- |
| Clash | [Rules](./Clash/rule/) · [Setup](./Clash/README.md) |
| Loon | [Rules and plugins](./Loon/) · [Guide](./Loon/README.md) |
| Egern | [Rules, modules and scripts](./Egern/) · [Guide](./Egern/README.md) |
| Surge | [Rules](./Surge/rule/) · [Guide](./Surge/README.md) |
| Shadowrocket | [Rules, scripts and modules](./Shadowrocket/) · [Guide](./Shadowrocket/README.md) |
| QuanX / Quantumult X | [Rules, scripts and tasks](./QuantumultX/) · [Guide](./QuantumultX/README.md) |

YouTube Clean 1.2.7 handles fallback response encoding, explicit JSON protection prefixes and empty slots without shifting captions. It records precise structural failures without caption text. All 196 local checks passed; the built Loon adapter obtained and aligned 180 real Traditional Chinese translations of self-written Korean. The user-device invalid-batch cause and acceptance remain unconfirmed. One import per client. [Compatibility guide](./Clash/Docs/YouTubeClean.md).

VerseLyrics entries for Egern, Surge, Loon, Shadowrocket and Quantumult X are listed above. All five clients now use core 3.1.3. Reduce temporary allocations in language checks, duplicate mixed-English queries, repeated chorus comparisons and post-save cache reads. Preserve six-source fallback, timed upgrades, mixed-English translations, Chinese script preservation and existing work limits. Briefly back off malformed service JSON without storing a false lyric miss; preserve alternate sources and retry after expiry. Six sources, plugin translations and native highlighting remain. Measurements do not establish iPhone VPN stability. Complete official Shadowrocket scripting documentation was not found; its compatibility adapter is not claimed to be officially verified. The user confirmed fallback lyrics for one previously missing track in Loon. The Egern issue remains unresolved, and coverage still depends on the client and lyric sources.

Each plugin has one current installation entry. Clients automatically load any required runtime from a pinned version; no separate JavaScript download, build or test run is needed.

[Shared icons and import links](./Icons/) · [Directory and migration guide](./Clash/Docs/Directory-Migration.md). The Parsec routing guide is in `Clash/Docs/`.

Tests, build tools, validation records and development archives have been removed from the default branch. Each client README lists its installation files and usage guides.

> These configurations are for personal use. Adjust them for your client version and network environment. All icons and brand names belong to their respective owners.

</details>

