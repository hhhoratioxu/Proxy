# Horatio Proxy

<p align="center">点击下方标题切换语言 · Select a language below</p>

<details open>
<summary><strong>🇨🇳 简体中文</strong></summary>

按 Clash、Loon、Egern、Surge、Shadowrocket、QuanX 六个客户端分类的个人规则、模块、脚本与图标配置。

各客户端的 `rule/` 存放分流规则，`script/` 只放可直接使用的当前插件、模块、重写或任务资源；`Docs/` 放安装与使用说明。共用图标统一保存在根目录 [Icons](./Icons/)。

[六客户端分流格式与全库兼容性审核（2026-10-25）](./Docs/Rule-Format-Compliance.md)。规则数据保持原有分类，格式与冗余条目已进行全量规范化；真实设备连通性仍需验证。

## AI 分流更新

**2026-11-25：六个客户端 AI 各 951 条、Meta 各 574 条，全库保留 26 类；所有已收录 Meta 服务（含 Meta AI、Muse、Llama）统一归入 Meta，AI/Meta 无域名交集。** 按官方资料缩小共享范围、清理冗余及修正规则优先级，保留原订阅地址。[本轮优化与验证](./Docs/Official-Optimization-2026-11-13.md)。[全部订阅、覆盖与边界](./Docs/AI-Routing.md) · [来源、官网与授权](./Docs/AI-Sources.md)。

## StarDesk 远程桌面

**2026-11-26：新增独立 StarDesk 分流，六端各 1 条规则，共 27 类。** 建议 DIRECT，已核实 `stardesk.net` 官方域名；IP-only P2P 与 Relay 流量不保证被域名规则识别。[六端订阅与使用说明](./Docs/StarDesk-Routing.md)。

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

**Loon 1.2.12；其他客户端 1.2.11**。Loon 按接口只加载需要的代码，并减少字幕对齐数据保留；继续保留主页去广告、字幕翻译、仅译文、智能换行及底栏开关。每个客户端仍只有一个正式安装入口。

| 客户端 | 安装入口 |
| --- | --- |
| Egern | [YouTubeClean.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/YouTubeClean.yaml) |
| Loon | [YouTubeClean.lpx](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/YouTubeClean.lpx) |
| Surge | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/YouTubeClean.sgmodule) |
| Shadowrocket | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/YouTubeClean.sgmodule) |
| Quantumult X | [YouTubeClean.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/YouTubeClean.conf) |
| Clash / Mihomo | [能力说明](./Clash/Docs/YouTubeClean.md) |


315 项自动检查通过。15 个自写场景完成 150 次 Node/V8 和 90 次 macOS JavaScriptCore 独立进程对比，输出正文、请求头结果、网络次数与单次完成均与 1.2.11 一致。JSC 请求头处理峰值 RSS 中位数 14.30 → 10.33 MiB（-27.8%），新版主页 21.70 → 20.41 MiB（-6.0%），Google 备用翻译 15.38 → 12.77 MiB（-17.0%）。用户已确认 1.2.10 的 Loon 主页去广告；新版内存是桌面测量，手机内存与 VPN 稳定性尚未验收。[源码、完整数据与范围](https://github.com/hhhoratioxu/Proxy/tree/53e4351e1cbd892803554b698ef3e5fe46767d9a/Surge/script/YouTubeClean)。

## Spotify 双语歌词 · VerseLyrics

Egern、Surge、Loon、Shadowrocket、Quantumult X 已统一为 **3.2.2**，备用源按需初始化，减少英语歌词重复检查；临时无词响应不长期缓存。保留六源补词，中文目标仅翻译英语歌曲。 保留六源补词、插件翻译与原生高亮。性能测量范围见固定源码，未做 iPhone VPN 验收。Shadowrocket 完整官方脚本规范尚未取得，其兼容适配未标为官方验证。用户已确认《那页夏天》在 Loon 可显示补充歌词。Egern 的无词问题尚未解决，补源仍受客户端行为与来源收录限制。

| 客户端 | 安装入口 | 设置与限制 |
| --- | --- | --- |
| Egern | [SpotifyLyrics.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics.yaml) | [说明](./Egern/Docs/SpotifyLyrics.md) |
| Surge | [SpotifyLyrics.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/SpotifyLyrics.sgmodule) | [说明](./Surge/Docs/SpotifyLyrics.md) |
| Loon | [SpotifyLyrics.lpx](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/SpotifyLyrics.lpx) | [说明](./Loon/Docs/SpotifyLyrics.md) |
| Shadowrocket | [SpotifyLyrics.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/SpotifyLyrics.sgmodule) | [说明](./Shadowrocket/Docs/SpotifyLyrics.md) |
| Quantumult X | [SpotifyLyrics.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/SpotifyLyrics.conf) | [说明](./QuantumultX/Docs/SpotifyLyrics.md) |
| Clash / Mihomo | 无可用的响应体脚本插件 | [能力说明](./Clash/Docs/SpotifyLyrics.md) |

Loon 的原 Spotify 安装入口已更新为配置 **2026.11.14**：手机保持 `mobile`，Mac 在插件参数选择 `macOS`；核心仍为 3.2.2。Mac 已有逐行双语显示，完全无词入口仍未完成；手机整体峰值低于 50 MB 尚待实机验收。[Loon 更新说明](./Loon/Docs/SpotifyLyrics.md)。其他客户端继续现有版本，本次没有将 Loon 代码套用到 Surge。

每个插件只保留一个当前安装入口。需要的运行脚本由客户端自动从固定版本加载，无需另外下载 JS、编译或运行测试。

[共用图标库与导入入口](./Icons/) · [目录用途与迁移说明](./Clash/Docs/Directory-Migration.md)。Parsec 分流文档保存在 `Clash/Docs/`。

维护工具及重复验证命令见[开发说明](./Docs/Development.md)，本轮依据与记录见[优化报告](./Docs/Official-Optimization-2026-11-13.md)。各客户端 README 保留当前安装文件与使用方法；安装插件无需运行维护工具。

> 配置仅供个人使用，请根据客户端版本和实际网络环境调整。图标及品牌名称归各自权利人所有。

</details>

<details>
<summary><strong>🇺🇸 English</strong></summary>

A personal collection of rules, modules, scripts and icon configurations organized by six clients.

Each client keeps routing lists in `rule/` and current installable resources in `script/`. `Docs/` contains installation and usage guides. All shared icons live in the root [Icons](./Icons/) directory.

[Full rule-format compliance audit for six clients (2026-10-25)](./Docs/Rule-Format-Compliance.md). All rule sets were normalized; real-device connectivity remains unverified.

AI routing reviewed on **2026-11-25**: all six clients have **951 AI conditions** and **574 Meta conditions** and retain the existing 26 categories. All listed Meta Platforms services, including Meta AI, Muse and Llama, are routed exclusively by Meta, with no domain intersection between AI and Meta. Shared namespaces, redundant matchers and policy precedence were reviewed against official sources. Existing subscription URLs remain unchanged. [Changes and validation](./Docs/Official-Optimization-2026-11-13.md). [Subscriptions and coverage](./Docs/AI-Routing.md) · [Pinned sources and license notices](./Docs/AI-Sources.md).

## StarDesk remote desktop

**2026-11-26:** Added a dedicated StarDesk category (one condition per client, 27 categories total). DIRECT is recommended for the verified official domain; IP-only P2P and relay traffic may require additional device-specific configuration. [Subscriptions and guide](./Docs/StarDesk-Routing.md).

## Client directories

| Client | Content |
| --- | --- |
| Clash | [Rules](./Clash/rule/) · [Setup](./Clash/README.md) |
| Loon | [Rules and plugins](./Loon/) · [Guide](./Loon/README.md) |
| Egern | [Rules, modules and scripts](./Egern/) · [Guide](./Egern/README.md) |
| Surge | [Rules](./Surge/rule/) · [Guide](./Surge/README.md) |
| Shadowrocket | [Rules, scripts and modules](./Shadowrocket/) · [Guide](./Shadowrocket/README.md) |
| QuanX / Quantumult X | [Rules, scripts and tasks](./QuantumultX/) · [Guide](./QuantumultX/README.md) |

YouTube Clean 1.2.12 specializes the single Loon plugin by endpoint and retains only text/timing for alignment-only caption tracks. Other client entries remain pinned to 1.2.11. All 315 checks pass; 150 Node/V8 and 90 desktop JavaScriptCore trials preserve body bytes, request-header results, network counts and single completion across 15 independent cases. JSC peak RSS decreases 27.8% for request headers, 6.0% for the new homepage envelope and 17.0% for fallback captions. These are desktop fixture-host measurements, not iPhone/Loon memory or VPN acceptance. Homepage filtering, translation-only defaults, caption layout and navigation switches remain. [Compatibility guide](./Clash/Docs/YouTubeClean.md).

VerseLyrics entries for Egern, Surge, Loon, Shadowrocket and Quantumult X are listed above. All five clients now use core 3.2.2. Initialize fallback providers only when needed, avoid redundant scans of eligible English lyrics, and prevent temporary missing-lyric responses from being stored by the client. Keep six sources, English-to-Chinese translation and native timing. Six sources, plugin translations and native highlighting remain. Measurements do not establish iPhone VPN stability. Complete official Shadowrocket scripting documentation was not found; its compatibility adapter is not claimed to be officially verified. The user confirmed fallback lyrics for one previously missing track in Loon. The Egern issue remains unresolved, and coverage still depends on the client and lyric sources.

Each plugin has one current installation entry. Clients automatically load any required runtime from a pinned version; no separate JavaScript download, build or test run is needed.

[Shared icons and import links](./Icons/) · [Directory and migration guide](./Clash/Docs/Directory-Migration.md). The Parsec routing guide is in `Clash/Docs/`.

Maintainer checks and repeatable commands are in the [development guide](./Docs/Development.md), with findings in the [optimization report](./Docs/Official-Optimization-2026-11-13.md). Each client README retains current installation files and usage guides; installing plugins does not require these tools.

> These configurations are for personal use. Adjust them for your client version and network environment. All icons and brand names belong to their respective owners.

</details>

