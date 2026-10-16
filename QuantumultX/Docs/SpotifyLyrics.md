# Spotify 双语歌词 · VerseLyrics · Quantumult X

**0.4.9 补词与等待修复：** 普通网络超时回调结束后立即释放名额并继续下一个歌词源，不再把已结束的请求误判为仍在运行。两个名额用满时，只登记最新一个等待者，最多等待 2.6 秒；旧请求回调后停止追加工作，最新请求可在本次响应中继续补词。普通重叠响应和预取不会再仅因到达顺序互相取消；没有无限队列，也不在结束后后台联网。

中文标题或歌手优先 QQ、网易、酷狗、酷我，再查 LRCLIB / lyrics.ovh；已有成功来源提示继续优先。已核对到候选曲目后，为下载歌词保留独立时间，且仍受总预算约束。QQ / 网易查询统一简繁搜索词；核对歌名、歌手、版本与时长的要求不放宽。只有完整查询全部来源且均未匹配才缓存“无词”；旧版失败缓存自动失效，成功缓存保留。

未缓存且拿不到 Spotify 元数据时，增加同一歌曲公开 embed 页回退，一次读取歌名、歌手、时长与配色。页面没有专辑，必须按原有唯一同曲规则核对，不能将同名歌曲直接当作匹配。Spotify 鉴权或权限错误仍保留原响应。

翻译阶段最多使用剩余总预算中的 2.5 秒，慢服务不再长期拖住已有歌词；成功译文保留，未完成部分可在后续歌词请求继续补齐。原词、时间轴、插件替换官方译文和原生配色保留。

持久缓存仍不超过 128 条 / 64,000 JSON 字符，仅保留当前歌曲相关工作数据；两个联网名额和一个等待记录均为尽力控制，存储没有原子锁。歌词 / 入口正文 256 / 128 KiB，普通服务 96 KiB，补源累计 256 KiB / 12 请求，等待时不发 HTTP。宿主缓冲与 VM 内存不受这些数字直接限制，尚无 iPhone VPN 实机内存或稳定性验收。

保留 ArrayBuffer bodyBytes、受保护响应头与单个整体退出计时器。短等待只在名额用满时发生；整体退出不是 fetch 取消，仍不假设有未公开的单次 HTTP 超时或硬内存上限。

核心 **0.4.9**，客户端适配 **8**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

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

补充歌词优先保留歌词接口已有的有效配色，否则读取同一歌曲公开嵌入页面的 `visualIdentity`，核对歌曲 ID、颜色范围和文字对比度。取得补充歌词后才取色，最多使用现有总预算中的 1.5 秒；成功缓存一天，失败使用中性灰并缓存五分钟，仍可返回已经找到的歌词。

Quantumult X 的响应体重写在原响应体为空时不会执行，所以空体 404 无法经这一入口补词。这是本版本额外的客户端限制；不会通过拦截所有正常请求来伪造成功。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/9031436e2e6ad7a70a69eaaa00ffffeb848eeb65/QuantumultX/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/9031436e2e6ad7a70a69eaaa00ffffeb848eeb65/Surge/Development/VerseLyrics049)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[官方二进制脚本示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js) · [官方 HTTP 示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js) · [空响应体限制](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf#L290)

[其他客户端](../../README.md) · [返回 Quantumult X](../README.md)

2026-10-16：606 项自动测试；延迟故障模型、五客户端连续切歌模拟和真实公开来源记录见固定源码目录。自动测试不代替手机验收。
