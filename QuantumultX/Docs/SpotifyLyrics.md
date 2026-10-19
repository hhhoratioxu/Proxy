# Spotify 双语歌词 · VerseLyrics · Quantumult X

当前发布 **3.1.2**（原生适配 14）。中文夹英文时提取英文片段合批翻译，再放回原位置，保留中文原字形和标点，不再整行跳过；纯中文不简繁互译。所有缓存、歌词源与翻译服务结果输出前过滤仅有简繁、标点、空格或不可见格式差异的译文。旧版混合句的原文身份缓存或纯转换缓存按行重查，有效译文继续复用；本次实际查询仍无有用译文时在同一受限缓存中记录，避免反复请求。保留官方静态歌词自动升级真实同步来源、六源补词、外语翻译与原生高亮，缓存容量、并发和超时不变。

保留六源补词、插件翻译、原生时间轴与高亮。缓存和网络都有明确上限；未收录的歌曲仍不能凭空补全。本地自动测试与 macOS JavaScriptCore 测量不等于 iPhone Loon 实机 VPN 验收，不能保证所有设备都不会被系统终止。

核心 **3.1.2**，客户端适配 **14**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

补词优先核对同专辑。列表搜索中的跨专辑结果要求歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 完全相同的重复歌词可合并）；LRCLIB 签名接口直接返回的候选经相同身份、时长与版本校验后可用，不要求 Spotify 提供专辑名，但不代表已证明全库唯一，排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

用户已确认《那页夏天》在 Loon 能显示补充歌词；Egern 此前的无词问题仍未解决。本次优化不代表所有客户端、所有无词歌曲均已通过实机验证，补源仍受客户端请求行为及来源收录限制。

## 安装与更新

已安装的用户更新原模块或重写引用，再重新打开 Spotify；原来的导入地址继续有效。

[SpotifyLyrics.conf 原始地址](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/SpotifyLyrics.conf)

1. 在 Quantumult X「重写 → 引用」中添加上面的地址并启用。建议 build 934 或更新版本；旧版自动 Cookie 行为不同。
2. 使用已安装、信任并开启的 HTTPS 解密证书。仅加入 `spclient.wg.spotify.com` 和 `*-spclient.spotify.com`。
3. 同时只启用一个 Spotify 歌词处理插件，重新加载代理配置并重新打开 Spotify。

客户端自动下载固定版本运行脚本，只需安装这个入口文件。无需下载源码、运行测试、查看诊断或开启通知。

## 设置

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `TRANSLATION_ENABLED` | `true` | 以插件译文替换全部官方译文列表 |
| `TARGET_LANGUAGE` | `zh-CN` | 默认简体；`zh-TW` 繁体、`en` 英文、`ja` 日文、`ko` 韩文 |
| `FALLBACK_PROVIDER` | `auto` | 无词时核对六源；官方静态歌词尝试升级为真实同步歌词；可选 `lrclib` / `qq` / `netease` / `kugou` / `kuwo` / `lyricsovh` / `off` |
| `DISCOVER_MISSING` | `true` | 尝试适配原生入口，不保证客户端发起歌词请求 |
| `PREFERRED_SOURCE` | `auto` | 仅 auto 补词模式生效；优先尝试所选来源，其他来源继续兜底，已有成功缓存优先。 可选：`auto`, `lrclib`, `qq`, `netease`, `kugou`, `kuwo`, `lyricsovh`。 |
| `MEMORY_MODE` | `standard` | standard 为 128 条和 64000 字符；compact 为 64 条和 32000 字符，旧歌更早淘汰，较长记录可能不缓存。 可选：`standard`, `compact`。 |
| `FETCH_ARTWORK_COLOR` | `true` | 关闭可省去额外取色请求；已有配色仍可复用，否则使用中性灰，补词和翻译保留。 可选：`true`, `false`。 |
| `FALLBACK_OFFSET_MS` | `0` | 仅影响所有备用来源的逐行同步歌词。正数延后、负数提前，默认 0；不影响官方原词，无时间轴歌词不移动。 可选：`0`, `-500`, `-1000`, `-2000`, `-5000`, `500`, `1000`, `2000`, `5000`。 |
| `FALLBACK_MODE` | `synced` | synced 默认继续寻找逐行时间轴；fast 找到首份经过身份核对的歌词即返回，可能无滚动时间轴。切回 synced 不复用 fast 专用的纯文本缓存。 可选：`synced`, `fast`。 |
| `NETWORK_MODE` | `online` | online 正常补词与翻译；cache-only 仅使用有效缓存，未缓存的歌曲无法补词，未缓存的句子不联网翻译。不影响 Spotify 自身联网。 可选：`online`, `cache-only`。 |
| `SOURCE_TRANSLATIONS` | `true` | 简体中文目标下，复用补词响应中严格对齐的中文译文；关闭后忽略此类缓存并使用翻译服务。 |

如需繁体中文或指定来源，将资源保存为本地重写后，同步修改三条脚本 URL 的 `#` 参数。例如把三处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。

在已处理的歌词响应中，翻译开启后不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源核对歌名、艺人和时长，优先同专辑，跨专辑列表搜索要求唯一，LRCLIB 签名结果需通过严格身份、时长与版本校验；来源没有收录时不能凭空补全歌词。

## 当前验证范围

补充歌词优先保留歌词接口已有的有效配色；没有配色时，读取同一歌曲 Spotify 公开嵌入页的背景色，验证歌曲 ID 与颜色范围。普通句用黑色、高亮句用白色，过暗或过亮的背景在保留色调的基础上调整明度，使生成颜色的普通文字 / 背景对比度至少 3.2:1、高亮文字 / 背景至少 4.8:1；这些数值针对颜色字段，不包含客户端动画或透明度。旧缓存同样在读取时修正，不增加联网和缓存写入。

取得补充歌词后才取色，单次最多占用现有总预算中的 1.5 秒；公开元数据页已提供颜色时直接复用。成功缓存一天，失败短暂缓存五分钟并使用中性灰色。取色失败仍可返回已经找到的歌词。

Quantumult X 的响应体重写在原响应体为空时不会执行，所以空体 404 无法经这一入口补词。这是本版本额外的客户端限制；不会通过拦截所有正常请求来伪造成功。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/eb45d9ea239fdd649d4d22c0695435531f986de3/QuantumultX/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/eb45d9ea239fdd649d4d22c0695435531f986de3/Surge/Development/VerseLyrics312)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[官方二进制脚本示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js) · [官方 HTTP 示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js) · [空响应体限制](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf#L290)

[其他客户端](../../README.md) · [返回 Quantumult X](../README.md)

2026-10-19：1515 项自动测试通过。每版实际改动、完整测量数据和重现命令见固定源码 README；测试不等同于 iPhone 实机 VPN 验收。
