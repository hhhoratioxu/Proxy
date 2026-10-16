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


## YouTube 去广告与双语字幕

**0.1.0** 将去广告和字幕翻译合并在一个插件内，默认原文＋简体中文；每个客户端只需导入一个文件。安装前停用其他 YouTube 模块，包括原有 Egern YouTubeEnhance，避免冲突。

| 客户端 | 合并插件安装入口 |
| --- | --- |
| Egern | [YouTubeAdTranslate.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/YouTubeAdTranslate.yaml) |
| Surge | [YouTubeAdTranslate.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/YouTubeAdTranslate.sgmodule) |
| Loon | [YouTubeAdTranslate.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/YouTubeAdTranslate.plugin) |
| Shadowrocket | [YouTubeAdTranslate.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/YouTubeAdTranslate.sgmodule) |
| Quantumult X | [YouTubeAdTranslate.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/YouTubeAdTranslate.conf) |
| Clash / Mihomo | [能力限制与其他客户端入口](./Clash/Docs/YouTubeAdTranslate.md) |

80 项本地测试通过，真实公开播放器数据已成功加入双语轨道。字幕下载返回 HTTP 429，手机客户端导入、实际去广告和播放效果仍待真机验收。

## Spotify 双语歌词 · VerseLyrics

Egern、Surge、Loon、Shadowrocket、Quantumult X 已统一为 **0.4.2**，同步修正补充歌词的背景与文字配色。用户已确认《那页夏天》在 Loon 可显示补充歌词。Egern 的无词问题尚未解决，补源仍受客户端行为与来源收录限制。

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

YouTube AdTranslate 0.1.0 combines ad removal and bilingual subtitles in one import per supported client, defaulting to the original text plus Simplified Chinese. Links are listed above; disable other YouTube modules before enabling it. Eighty local tests passed and a public player response gained a bilingual track. Live subtitle downloads returned HTTP 429; native client imports, real ad removal and on-device playback remain unverified. [Compatibility guide](./Clash/Docs/YouTubeAdTranslate.md).

VerseLyrics entries for Egern, Surge, Loon, Shadowrocket and Quantumult X are listed above. All five clients now use core 0.4.2 with the fallback lyric color correction. The user confirmed fallback lyrics for one previously missing track in Loon. The Egern issue remains unresolved, and coverage still depends on the client and lyric sources.

Each plugin has one current installation entry. Clients automatically load any required runtime from a pinned version; no separate JavaScript download, build or test run is needed.

[Shared icons and import links](./Icons/) · [Directory and migration guide](./Clash/Docs/Directory-Migration.md). The Parsec routing guide is in `Clash/Docs/`.

Tests, build tools, validation records and development archives have been removed from the default branch. Each client README lists its installation files and usage guides.

> These configurations are for personal use. Adjust them for your client version and network environment. All icons and brand names belong to their respective owners.

</details>
