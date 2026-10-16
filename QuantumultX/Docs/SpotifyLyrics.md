# Spotify 双语歌词 · VerseLyrics · Quantumult X

核心 **0.4.5**，客户端适配 **4**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

**0.4.5 原生显示与连续播放优化：** 译文按歌曲缓存，备用歌词使用紧凑存储；有效歌词缓存直接返回，不再先查元数据。连续切歌和回放可减少重复查词、翻译与取色请求，保留原生歌词排版、真实时间轴、插件译文和同曲配色。

备用源仍为 LRCLIB、QQ 音乐、网易云音乐、酷狗音乐、酷我音乐和 lyrics.ovh，`auto` 顺序查询、命中即停。酷狗与酷我提供来源时间轴；lyrics.ovh 纯文本以原生非同步歌词显示。LRCLIB 的重复发行候选仅在歌词文本/时间轴完全相同、时长也相同时合并，其他歧义仍拒绝。

补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 重复记录仅按上述相同歌词证据合并），排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

每次补词最多发起 12 个外部请求，依次执行；保留原有总处理 20 秒预算并给后续来源预留时间。累计允许解码的补词响应不超过 512 KiB；三个新增来源单次响应限制 96 KiB，酷狗 Base64 解码后的歌词限制 64 KiB，歌词最多 600 行。已知超大 Content-Length 会在读取正文前拒绝；没有长度的响应收到后检查，不解码超限正文。宿主 HTTP 层可能先缓存响应，脚本不能据此保证整个代理进程的内存硬上限。

缓存总上限仍为 192 条、96,000 个 JSON 字符，现在将冷却记录也计入总长度。旧歌词缓存自动压缩且保留到期时间；旧逐行译文可以复用，新译文按曲目和语言合并存储，按原文匹配以防换行顺序后错位。并发写入会合并同曲已成功的译文。查无结果缓存 90 秒，临时失败缓存 15 秒；网络失败和 HTTP 500/502/504 会短暂冷却对应主机 15 秒，429/503 继续遵守 Retry-After。

客户端适配改为按需读取字节，先检查长度再编码；支持的二进制视图直接复用原缓冲区。译文响应单次最多 96 KiB，译文内容和输出展开各限制 120,000 个字符，最终 UTF-8 输出限制 2 MiB，超限时保留原响应。请求脚本仍约 4–6 KB，已完成请求的计时器和 Promise 引用会及时释放。

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

如需繁体中文或指定来源，将资源保存为本地重写后，同步修改两条脚本 URL 的 `#` 参数。例如把两处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。

翻译开启后，不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源核对歌名、艺人和时长，优先同专辑，跨专辑需要唯一且严格的同曲匹配；来源没有收录时不能凭空补全歌词。

## 当前验证范围

补充歌词优先保留歌词接口已有的有效配色，否则读取同一歌曲公开嵌入页面的 `visualIdentity`，核对歌曲 ID、颜色范围和文字对比度。取得补充歌词后才取色，最多使用现有总预算中的 1.5 秒；成功缓存一天，失败使用中性灰并缓存五分钟，仍可返回已经找到的歌词。

2026-10-16：481 项自动测试通过，另通过 Egern YAML 配置检查。在相同的 12 首歌曲、每首 40 行自写歌词、两轮完整处理的模拟测试中，0.4.4 第二轮需 60 次 HTTP 请求，0.4.5 为 0 次；原词、译文、时间轴及配色一致。200 首歌曲遍历六源的压力测试和约 1.5 MiB JSON 改写均通过 32 MiB V8 老生代限制测试（不是总进程内存上限）。三个新增来源和同曲配色公开接口仍取词/取色成功，《那页夏天》由 QQ 音乐取得 42 行同步歌词。模拟请求耗时不能等同于实际网络延迟；这些检查不是 iPhone 实机验收。

Quantumult X 的响应体重写在原响应体为空时不会执行，所以空体 404 无法经这一入口补词。这是本版本额外的客户端限制；不会通过拦截所有正常请求来伪造成功。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/b5aba2b016b4049ded282b1909f1502ba78a63c1/QuantumultX/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/b5aba2b016b4049ded282b1909f1502ba78a63c1/Surge/Development/VerseLyrics045)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[官方二进制脚本示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js) · [官方 HTTP 示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js) · [空响应体限制](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf#L290)

[其他客户端](../../README.md) · [返回 Quantumult X](../README.md)
