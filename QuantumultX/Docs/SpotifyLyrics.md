# Spotify 双语歌词 · VerseLyrics · Quantumult X

当前发布 **0.5.3**（原生适配 12），重点降低 Loon 首次进入播放页及连续切歌时的入口处理内存。五端共用同一修复，原有六源补词、插件翻译、精确对齐的源译文复用、原生时间轴和高亮配色保留。

播放器 JSON 入口由「整树解析 + 为每个节点创建并序列化路径」改为一次字段扫描，只保留要改写的位置。Protobuf 入口只扫描必要字段并保存实际改动，未知字段不再展开成对象数组；未更改的内容保留原字节。网易云与 QQ 搜索处理仅向后续步骤传递最多两个已核对的候选 ID，避免搜索函数持有完整目录跨越歌词 HTTP 等待。没有新增预取、排队轮询或缓存容量。

首次加载与切歌都参与对照。macOS JavaScriptCore 中，大型 JSON / Protobuf 入口的进程内存峰值下降，普通歌词冷启动保持在测量波动范围内；详细数值、全部样本、运行脚本摘要和测量边界见固定源码的 `jsc-memory-results.json` 与 README。源码测试之外，还检查五端打包脚本实际执行，防止构建裁剪丢失必要函数。

单名额协同限制、128 条 / 64,000 JSON UTF-16 字符缓存及现有查询预算不变。网络忙碌时缓存仍可返回，未缓存结果依赖后续客户端请求；不会主动安排重试，也不会丢弃已经返回的有效歌词来降低内存。Loon 原生存储没有原子锁，原生网络缓冲不在 JS 预算内。**本地测量不等于 iPhone Loon 实机验证，不能据此保证 VPN 永不被系统终止。** 未收录的歌曲仍不能凭空补全。

核心 **0.5.3**，客户端适配 **12**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

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
| `FALLBACK_PROVIDER` | `auto` | 无词时顺序尝试六源；可选 `lrclib` / `qq` / `netease` / `kugou` / `kuwo` / `lyricsovh` / `off` |
| `DISCOVER_MISSING` | `true` | 尝试适配原生入口，不保证客户端发起歌词请求 |
| `SOURCE_TRANSLATIONS` | `true` | 简体中文目标下，复用补词响应中严格对齐的中文译文；关闭后忽略此类缓存并使用翻译服务。 |

如需繁体中文或指定来源，将资源保存为本地重写后，同步修改三条脚本 URL 的 `#` 参数。例如把三处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。

在已处理的歌词响应中，翻译开启后不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源核对歌名、艺人和时长，优先同专辑，跨专辑列表搜索要求唯一，LRCLIB 签名结果需通过严格身份、时长与版本校验；来源没有收录时不能凭空补全歌词。

## 当前验证范围

补充歌词优先保留歌词接口已有的有效配色；没有配色时，读取同一歌曲 Spotify 公开嵌入页的背景色，验证歌曲 ID 与颜色范围。普通句用黑色、高亮句用白色，过暗或过亮的背景在保留色调的基础上调整明度，使生成颜色的普通文字 / 背景对比度至少 3.2:1、高亮文字 / 背景至少 4.8:1；这些数值针对颜色字段，不包含客户端动画或透明度。旧缓存同样在读取时修正，不增加联网和缓存写入。

取得补充歌词后才取色，单次最多占用现有总预算中的 1.5 秒；公开元数据页已提供颜色时直接复用。成功缓存一天，失败短暂缓存五分钟并使用中性灰色。取色失败仍可返回已经找到的歌词。

Quantumult X 的响应体重写在原响应体为空时不会执行，所以空体 404 无法经这一入口补词。这是本版本额外的客户端限制；不会通过拦截所有正常请求来伪造成功。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/ae2ed2b9b3c5ae2a7922bfa003c2687c8c0310f3/QuantumultX/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/ae2ed2b9b3c5ae2a7922bfa003c2687c8c0310f3/Surge/Development/VerseLyrics053)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[官方二进制脚本示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js) · [官方 HTTP 示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js) · [空响应体限制](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf#L290)

[其他客户端](../../README.md) · [返回 Quantumult X](../README.md)

2026-10-17：961 项自动测试通过；包括五端实际打包入口的 JSON / Protobuf、500 组 JSON 与 200 组 Protobuf 差分样本、慢回调重叠请求、补词和译文缓存。macOS JavaScriptCore 首次加载及重复加载对照、Node 五端连续切歌报告均随固定源码保存。测试不等同于 iPhone 实机 VPN 验收。
