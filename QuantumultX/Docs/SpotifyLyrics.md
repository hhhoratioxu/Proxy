# Spotify 双语歌词 · VerseLyrics · Quantumult X

**0.4.11 加载与内存优化：** 正式运行脚本移除调试历史写入并压缩构建；Loon 歌词脚本由约 129 KB 降到 91 KB，入口脚本由约 52 KB 降到 28 KB。保留原生请求头 Rewrite 与两个响应脚本，不增加切歌入口。

缓存增加小型长度索引，读取时直接定位当前歌曲，避免把其他歌曲的歌词和译文全部解析成对象。沿用原缓存键与有效期，旧缓存可直接使用，并在下一次正常写入时自动建立索引。索引同样计入 128 条 / 64,000 JSON 字符的总上限，无需清空缓存。

同一首歌的重叠请求复用已完成的补词、翻译缓存，减少重复联网；仍保留最多两个活动任务、仅等待最新请求的有限等待机制。准入依赖同步存储，没有跨进程原子锁，不是客户端进程内存的硬上限。Egern 若缺少计时器能力，忙碌时安全放行原响应。

六个歌词源、插件译文替换官方翻译、原始时间轴和 0.4.10 的黑色普通句 / 白色高亮句均保留。首次未缓存歌曲仍受歌词源和翻译服务网络耗时影响；来源未收录或客户端不请求歌词时，不能保证补齐。

更新整个远程插件 / 模块 / 重写文件以加载固定的新脚本，再重新打开 Spotify。无需查看诊断或手动删除缓存。自动测试与模拟内存测量不等同于 iPhone 的原生界面或 VPN 稳定性验收。

核心 **0.4.11**，客户端适配 **9**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 重复记录仅在完整歌词、时间戳与时长全部相同的情况下合并），排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

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

如需繁体中文或指定来源，将资源保存为本地重写后，同步修改三条脚本 URL 的 `#` 参数。例如把三处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。

在已处理的歌词响应中，翻译开启后不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源核对歌名、艺人和时长，优先同专辑，跨专辑需要唯一且严格的同曲匹配；来源没有收录时不能凭空补全歌词。

## 当前验证范围

补充歌词优先保留歌词接口已有的有效配色；没有配色时，读取同一歌曲 Spotify 公开嵌入页的背景色，验证歌曲 ID 与颜色范围。普通句用黑色、高亮句用白色，过暗或过亮的背景在保留色调的基础上调整明度，使生成颜色的普通文字 / 背景对比度至少 3.2:1、高亮文字 / 背景至少 4.8:1；这些数值针对颜色字段，不包含客户端动画或透明度。旧缓存同样在读取时修正，不增加联网和缓存写入。

取得补充歌词后才取色，单次最多占用现有总预算中的 1.5 秒；公开元数据页已提供颜色时直接复用。成功缓存一天，失败短暂缓存五分钟并使用中性灰色。取色失败仍可返回已经找到的歌词。

Quantumult X 的响应体重写在原响应体为空时不会执行，所以空体 404 无法经这一入口补词。这是本版本额外的客户端限制；不会通过拦截所有正常请求来伪造成功。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/9cc578381e45abd0844d7002422f995baddcc28f/QuantumultX/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/9cc578381e45abd0844d7002422f995baddcc28f/Surge/Development/VerseLyrics0411)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[官方二进制脚本示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js) · [官方 HTTP 示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js) · [空响应体限制](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf#L290)

[其他客户端](../../README.md) · [返回 Quantumult X](../README.md)

2026-10-16：650 项自动测试通过；包含索引缓存、旧格式兼容、五客户端同曲重叠请求、JSON / Protobuf、六源及翻译保留、颜色修复和连续切歌模拟。记录见固定源码目录；未进行手机实机验收。
