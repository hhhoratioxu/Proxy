# Horatio Proxy

<p align="center">点击下方标题切换语言 · Select a language below</p>

<details open>
<summary><strong>🇨🇳 简体中文</strong></summary>

按 Clash、Loon、Egern、Surge、Shadowrocket、QuanX 六个客户端分类的个人规则、模块、脚本与图标配置。

各客户端的 `rule/` 存放分流规则，`script/` 只放可直接使用的当前插件、模块、重写或任务资源；`Docs/` 放安装与使用说明。共用图标统一保存在根目录 [Icons](./Icons/)。

[六客户端分流格式与全库兼容性审核（2026-10-25）](./Docs/Rule-Format-Compliance.md)。规则数据保持原有分类，格式与冗余条目已进行全量规范化；真实设备连通性仍需验证。

## AI 分流更新

**2026-10-28：六个客户端统一 971 条，新增 495 条。** 合并主流社区来源并按官方页面补充模型、编程、研究、会议、图像/视频/3D 和云端 AI 服务，保留原订阅地址。[全部订阅、覆盖与边界](./Docs/AI-Routing.md) · [来源、官网与授权](./Docs/AI-Sources.md)。

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

**1.2.9**。译文按标点与长度均衡换行，短句保持一行，保留全部文字与字幕时间；新增「译文智能换行」开关。保留 1.2.8 的分配优化、去广告及发布「＋」/Shorts 独立开关。Loon 默认仅显示译文；每个客户端仍为一个安装入口。

| 客户端 | 安装入口 |
| --- | --- |
| Egern | [YouTubeClean.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/YouTubeClean.yaml) |
| Loon | [YouTubeClean.lpx](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/YouTubeClean.lpx) |
| Surge | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/YouTubeClean.sgmodule) |
| Shadowrocket | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/YouTubeClean.sgmodule) |
| Quantumult X | [YouTubeClean.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/YouTubeClean.conf) |
| Clash / Mihomo | [能力说明](./Clash/Docs/YouTubeClean.md) |


259 项自动检查通过，覆盖四种字幕格式与五客户端构建脚本中的 YouTube/Google 译文路径；12 次独立桌面字幕检查保留原短句输出、请求次数和单次完成。新排版有少量处理开销，没有增加网络请求或缓存；字体、底色及位置仍由原生 CC 控制。1.2.8 的历史内存数据不作为 1.2.9 或手机内存结论。用户已确认 1.2.7 中韩双语显示；本版最终手机排版仍待确认。[源码与检查记录](https://github.com/hhhoratioxu/Proxy/tree/06b0b47bb86f0e326d83a1fc04f5606f53ec8710/Surge/script/YouTubeClean)。

## Spotify 双语歌词 · VerseLyrics

Egern、Surge、Loon、Shadowrocket、Quantumult X 已统一为 **3.2.0**，原生歌词入口同步完成，减少 Spotify 重开时脚本和正文缓冲堆积。 保留六源补词、插件翻译与原生高亮。性能测量范围见固定源码，未做 iPhone VPN 验收。Shadowrocket 完整官方脚本规范尚未取得，其兼容适配未标为官方验证。用户已确认《那页夏天》在 Loon 可显示补充歌词。Egern 的无词问题尚未解决，补源仍受客户端行为与来源收录限制。

| 客户端 | 安装入口 | 设置与限制 |
| --- | --- | --- |
| Egern | [SpotifyLyrics.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics.yaml) | [说明](./Egern/Docs/SpotifyLyrics.md) |
| Surge | [SpotifyLyrics.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/SpotifyLyrics.sgmodule) | [说明](./Surge/Docs/SpotifyLyrics.md) |
| Loon | [SpotifyLyrics.lpx](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/SpotifyLyrics.lpx) | [说明](./Loon/Docs/SpotifyLyrics.md) |
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

[Full rule-format compliance audit for six clients (2026-10-25)](./Docs/Rule-Format-Compliance.md). All rule sets were normalized; real-device connectivity remains unverified.

AI routing updated on **2026-10-28**: all six clients now have **971 conditions**, with the original 476 retained and 495 additions. Existing subscription URLs are unchanged. [Subscriptions and coverage](./Docs/AI-Routing.md) · [Pinned sources and license notices](./Docs/AI-Sources.md).

## Client directories

| Client | Content |
| --- | --- |
| Clash | [Rules](./Clash/rule/) · [Setup](./Clash/README.md) |
| Loon | [Rules and plugins](./Loon/) · [Guide](./Loon/README.md) |
| Egern | [Rules, modules and scripts](./Egern/) · [Guide](./Egern/README.md) |
| Surge | [Rules](./Surge/rule/) · [Guide](./Surge/README.md) |
| Shadowrocket | [Rules, scripts and modules](./Shadowrocket/) · [Guide](./Shadowrocket/README.md) |
| QuanX / Quantumult X | [Rules, scripts and tasks](./QuantumultX/) · [Guide](./QuantumultX/README.md) |

YouTube Clean 1.2.9 adds punctuation-aware balanced translation wrapping with a native toggle, preserving all text and cue times. All 259 checks pass, including built bundles for five clients and both translation providers. Twelve isolated desktop caption trials preserve short-cue output, request counts and single completion; layout adds small processing overhead. Loon keeps translation-only defaults and one import. Fonts and positioning belong to the native player; device visuals remain unverified. [Compatibility guide](./Clash/Docs/YouTubeClean.md).

VerseLyrics entries for Egern, Surge, Loon, Shadowrocket and Quantumult X are listed above. All five clients now use core 3.2.0. Complete native local entry processing synchronously to reduce response and script retention during Spotify relaunch bursts. Keep Egern native streams and all fallback/translation behavior. Six sources, plugin translations and native highlighting remain. Measurements do not establish iPhone VPN stability. Complete official Shadowrocket scripting documentation was not found; its compatibility adapter is not claimed to be officially verified. The user confirmed fallback lyrics for one previously missing track in Loon. The Egern issue remains unresolved, and coverage still depends on the client and lyric sources.

Each plugin has one current installation entry. Clients automatically load any required runtime from a pinned version; no separate JavaScript download, build or test run is needed.

[Shared icons and import links](./Icons/) · [Directory and migration guide](./Clash/Docs/Directory-Migration.md). The Parsec routing guide is in `Clash/Docs/`.

Tests, build tools, validation records and development archives have been removed from the default branch. Each client README lists its installation files and usage guides.

> These configurations are for personal use. Adjust them for your client version and network environment. All icons and brand names belong to their respective owners.

</details>

