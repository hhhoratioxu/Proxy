# Spotify 双语歌词 · VerseLyrics

当前发布 **3.2.0**（原生适配 16）。修复原生客户端本地入口处理仍跨异步任务保留响应的问题。入口使用已完整取得的正文，在当前调用中完成元数据、卡片和歌词开关处理；Loon、Surge、Shadowrocket、Quantumult X 使用同步入口，Egern 保留原生异步流读取。补词、翻译和全部设置保留。

保留六源补词、插件翻译、原生时间轴与高亮。缓存和网络都有明确上限；未收录的歌曲仍不能凭空补全。本地自动测试与 macOS JavaScriptCore 测量不等于 iPhone Loon 实机 VPN 验收，不能保证所有设备都不会被系统终止。

当前模块：3.2.0，适用于支持原生 `ctx` 脚本 API 的 Egern。

补词优先核对同专辑。列表搜索中的跨专辑结果要求歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 完全相同的重复歌词可合并）；LRCLIB 签名接口直接返回的候选经相同身份、时长与版本校验后可用，不要求 Spotify 提供专辑名，但不代表已证明全库唯一，排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

## 安装与更新

已安装的用户更新原模块，再重新打开 Spotify；原来的导入地址继续有效。

[正式模块 SpotifyLyrics.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics.yaml)

1. 在 Egern「模块」中添加上面的远程地址并启用，只保留一个 VerseLyrics 模块。
2. 使用已经安装、信任并开启的 HTTPS 解密证书。模块仅处理 `spclient.wg.spotify.com` 和 `*-spclient.spotify.com`。
3. 重新加载配置，将 Spotify 从后台退出后重新打开。

只需导入这一个 YAML。Egern 会自动下载固定版本的运行脚本，不需要下载源码、安装 Node.js、编译或运行测试。

已安装旧路径的用户，请把模块地址更新为上面的当前地址。

## 默认设置

| 设置 | 默认值 | 用途 |
| --- | --- | --- |
| `TRANSLATION_ENABLED` | `true` | 使用插件译文替换官方译文列表。 |
| `TARGET_LANGUAGE` | `zh-CN` | 简体中文，可在模块设置中改为其他语言。 |
| `FALLBACK_PROVIDER` | `auto` | 官方无词时核对六源；只有静态歌词时搜索真实同步来源；也可选 `lrclib` / `qq` / `netease` / `kugou` / `kuwo` / `lyricsovh` / `off`。 |
| `DISCOVER_MISSING` | `true` | 处理已适配的歌词检查、元数据和原生歌词入口。 |
| `PREFERRED_SOURCE` | `auto` | 仅 auto 补词模式生效；优先尝试所选来源，其他来源继续兜底，已有成功缓存优先。 可选：`auto`, `lrclib`, `qq`, `netease`, `kugou`, `kuwo`, `lyricsovh`。 |
| `MEMORY_MODE` | `standard` | standard 为 128 条和 64000 字符；compact 为 64 条和 32000 字符，旧歌更早淘汰，较长记录可能不缓存。 可选：`standard`, `compact`。 |
| `FETCH_ARTWORK_COLOR` | `true` | 关闭可省去额外取色请求；已有配色仍可复用，否则使用中性灰，补词和翻译保留。 可选：`true`, `false`。 |
| `FALLBACK_OFFSET_MS` | `0` | 仅影响所有备用来源的逐行同步歌词。正数延后、负数提前，默认 0；不影响官方原词，无时间轴歌词不移动。 可选：`0`, `-500`, `-1000`, `-2000`, `-5000`, `500`, `1000`, `2000`, `5000`。 |
| `FALLBACK_MODE` | `synced` | synced 默认继续寻找逐行时间轴；fast 对完全无词歌曲可返回首份核对通过的纯文本。“替换官方非同步歌词”开启时，两种模式都只用真实同步歌词升级官方静态歌词。 可选：`synced`, `fast`。 |
| `NETWORK_MODE` | `online` | online 正常补词与翻译；cache-only 仅使用有效缓存，未缓存的歌曲无法补词，未缓存的句子不联网翻译。不影响 Spotify 自身联网。 可选：`online`, `cache-only`。 |
| `REPLACE_UNSYNCED` | `true` | 开启：官方只有静态歌词时尝试备用同步源；未匹配保留官方原词。关闭：保留官方静态歌词，完全无词时的补词及翻译仍正常。 可选：`true`, `false`。 |
| `SOURCE_TRANSLATIONS` | `true` | 简体中文目标下，复用补词响应中严格对齐的中文译文；关闭后忽略此类缓存并使用翻译服务。 |

Spotify 已有同步歌词的原词和时间轴继续保留；官方只有静态歌词时尝试真实同步来源，未匹配则保留原词。备用源优先核对同专辑结果；跨专辑的列表搜索要求唯一同曲匹配，LRCLIB 签名结果需通过身份、时长与版本校验，未收录的歌曲无法生成歌词。译文由插件处理，翻译服务不可用时保留原词。

## 兼容性

用户已确认《那页夏天》在 Loon 能显示补充歌词；Egern 此前的无词问题仍未解决。本次优化不代表所有客户端、所有无词歌曲均已通过实机验证，补源仍受客户端请求行为及来源收录限制。

补充歌词优先保留歌词接口已有的有效配色；没有配色时，读取同一歌曲 Spotify 公开嵌入页的背景色，验证歌曲 ID 与颜色范围。普通句用黑色、高亮句用白色，过暗或过亮的背景在保留色调的基础上调整明度，使生成颜色的普通文字 / 背景对比度至少 3.2:1、高亮文字 / 背景至少 4.8:1；这些数值针对颜色字段，不包含客户端动画或透明度。旧缓存同样在读取时修正，不增加联网和缓存写入。

取得补充歌词后才取色，单次最多占用现有总预算中的 1.5 秒；公开元数据页已提供颜色时直接复用。成功缓存一天，失败短暂缓存五分钟并使用中性灰色。取色失败仍可返回已经找到的歌词。

取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。脚本不保存或记录 Spotify 授权令牌；歌词来源收到歌曲信息，翻译服务收到待翻译歌词文本。

正式模块没有诊断通知或定时监测。无需运行开发测试或收集诊断通知来安装。

## 来源与许可

插件逻辑独立编写。Unihan 简繁体映射的许可保存在运行版本对应的 [NOTICE-UNICODE.txt](https://raw.githubusercontent.com/hhhoratioxu/Proxy/c6ccfb93c1fb8e1140d5bd69d3b54f0a9f6e9e78/Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt)。

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/c6ccfb93c1fb8e1140d5bd69d3b54f0a9f6e9e78/Egern/script/SpotifyLyrics/spotify-lyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/c6ccfb93c1fb8e1140d5bd69d3b54f0a9f6e9e78/Surge/Development/VerseLyrics320) · [Egern 原生 API](https://egernapp.com/docs/javascript-api/)

[其他客户端](../../README.md) · [返回 Egern](../README.md)

2026-10-28：2181 项自动测试通过。每版实际改动、完整测量数据和重现命令见固定源码 README；测试不等同于 iPhone 实机 VPN 验收。
