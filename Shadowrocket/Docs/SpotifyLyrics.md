# Spotify 双语歌词 · VerseLyrics · Shadowrocket

**0.4.8 连续切歌与内存优化：** 保留独立兼容适配，歌词脚本精简并使用当前歌曲缓存视图；不添加 Surge 的 engine 参数。[开发者官网](https://shadowlaunch.com/) 未提供完整公开脚本 API，现有二进制及超时兼容行为仍未获完整官方规范核验。

歌词运行包去除仅供播放器入口使用的代码。当前歌曲处理期间只保留相关歌词、译文、配色及必要来源提示；入口缓存视图只保留元数据。保存时与完整缓存合并，其他歌曲的成功缓存不会因视图缩小而丢失。持久缓存总上限仍为 128 条 / 64,000 JSON 字符。

不同歌曲的新歌词响应到来后，旧任务不再追加歌词源、配色或翻译请求；已发出的原生请求正常回调后结束，不调用未公开取消接口、不增加等待队列。它跟踪响应到达顺序，不能判断 Spotify 的真实播放位置。已获得歌词和可用译文继续返回，暂缓任务不写成“该歌无词”。

六源补词、严格同曲核对、插件替换官方译文、原生时间轴和配色均保留。正文预算为歌词 256 KiB、入口 128 KiB、普通服务 96 KiB；补源累计 256 KiB / 12 请求。共享存储的两个联网名额是尽力控制，不能当成原子锁。

这些是脚本预算和减少分配的措施，不是 VPN 进程内存上限。未知长度响应可能先由宿主缓冲；超限或繁忙时使用缓存或原响应，可能暂时缺少补词或译文。尚未完成 iPhone VPN 峰值内存及连续切歌实机验收。

核心 **0.4.8**，客户端适配 **7**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 重复记录仅在完整歌词、时间戳与时长全部相同的情况下合并），排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

用户已确认《那页夏天》在 Loon 能显示补充歌词；Egern 此前的无词问题仍未解决。本次优化不代表所有客户端、所有无词歌曲均已通过实机验证，补源仍受客户端请求行为及来源收录限制。

## 安装与更新

已安装的用户更新原模块或重写引用，再重新打开 Spotify；原来的导入地址继续有效。

[SpotifyLyrics.sgmodule 原始地址](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/SpotifyLyrics.sgmodule)

1. 在 Shadowrocket 当前配置的「模块」中添加上面的远程地址并启用。使用当前版本的 Shadowrocket。
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

如需繁体中文或指定来源，将模块保存为本地副本后，同步修改三条 `[Script]` 的 `argument=` 参数。例如把三处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。

在已处理的歌词响应中，翻译开启后不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源核对歌名、艺人和时长，优先同专辑，跨专辑需要唯一且严格的同曲匹配；来源没有收录时不能凭空补全歌词。

## 当前验证范围

补充歌词优先保留歌词接口已有的有效配色，否则读取同一歌曲公开嵌入页面的 `visualIdentity`，核对歌曲 ID、颜色范围和文字对比度。取得补充歌词后才取色，最多使用现有总预算中的 1.5 秒；成功缓存一天，失败使用中性灰并缓存五分钟，仍可返回已经找到的歌词。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/661010d356abacfad6f2bfb910db65958b357315/Shadowrocket/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/661010d356abacfad6f2bfb910db65958b357315/Surge/Development/VerseLyrics048)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[开发者网站](https://shadowlaunch.com/)；使用 Shadowrocket 的模块与脚本兼容接口，尚未在客户端完成导入或播放验证。

[其他客户端](../../README.md) · [返回 Shadowrocket](../README.md)

2026-10-16：585 项自动测试；源码、官方依据、缓存与切歌模拟记录见固定源码目录。模拟测试不代表实机 VPN 稳定性验收。
