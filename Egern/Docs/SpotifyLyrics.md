# Spotify 双语歌词 · VerseLyrics

**0.4.8 连续切歌与内存优化：** 保留 Egern 原生异步 ctx、Headers、流读取和 max_size；歌词脚本仅加载歌词路径需要的代码，入口保持独立脚本。

歌词运行包去除仅供播放器入口使用的代码。当前歌曲处理期间只保留相关歌词、译文、配色及必要来源提示；入口缓存视图只保留元数据。保存时与完整缓存合并，其他歌曲的成功缓存不会因视图缩小而丢失。持久缓存总上限仍为 128 条 / 64,000 JSON 字符。

不同歌曲的新歌词响应到来后，旧任务不再追加歌词源、配色或翻译请求；已发出的原生请求正常回调后结束，不调用未公开取消接口、不增加等待队列。它跟踪响应到达顺序，不能判断 Spotify 的真实播放位置。已获得歌词和可用译文继续返回，暂缓任务不写成“该歌无词”。

六源补词、严格同曲核对、插件替换官方译文、原生时间轴和配色均保留。正文预算为歌词 256 KiB、入口 128 KiB、普通服务 96 KiB；补源累计 256 KiB / 12 请求。共享存储的两个联网名额是尽力控制，不能当成原子锁。

这些是脚本预算和减少分配的措施，不是 VPN 进程内存上限。未知长度响应可能先由宿主缓冲；超限或繁忙时使用缓存或原响应，可能暂时缺少补词或译文。尚未完成 iPhone VPN 峰值内存及连续切歌实机验收。

当前模块：0.4.8，适用于支持原生 `ctx` 脚本 API 的 Egern。

补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 重复记录仅在完整歌词、时间戳与时长全部相同的情况下合并），排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

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
| `FALLBACK_PROVIDER` | `auto` | 官方无词时依次核对六源；也可选 `lrclib` / `qq` / `netease` / `kugou` / `kuwo` / `lyricsovh` / `off`。 |
| `DISCOVER_MISSING` | `true` | 处理已适配的歌词检查、元数据和原生歌词入口。 |

Spotify 已有的原词和时间轴继续保留。备用源优先核对同专辑结果；跨专辑必须满足唯一同曲匹配，未收录的歌曲无法生成歌词。译文由插件处理，翻译服务不可用时保留原词。

## 兼容性

用户已确认《那页夏天》在 Loon 能显示补充歌词；Egern 此前的无词问题仍未解决。本次优化不代表所有客户端、所有无词歌曲均已通过实机验证，补源仍受客户端请求行为及来源收录限制。

补充歌词优先保留歌词接口已有的有效配色，否则读取同一歌曲公开嵌入页面的 `visualIdentity`，核对歌曲 ID、颜色范围和文字对比度。取得补充歌词后才取色，最多使用现有总预算中的 1.5 秒；成功缓存一天，失败使用中性灰并缓存五分钟，仍可返回已经找到的歌词。

取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。脚本不保存或记录 Spotify 授权令牌；歌词来源收到歌曲信息，翻译服务收到待翻译歌词文本。

正式模块没有诊断通知或定时监测。无需运行开发测试或收集诊断通知来安装。

## 来源与许可

插件逻辑独立编写。Unihan 简繁体映射的许可保存在运行版本对应的 [NOTICE-UNICODE.txt](https://raw.githubusercontent.com/hhhoratioxu/Proxy/661010d356abacfad6f2bfb910db65958b357315/Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt)。

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/661010d356abacfad6f2bfb910db65958b357315/Egern/script/SpotifyLyrics/spotify-lyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/661010d356abacfad6f2bfb910db65958b357315/Surge/Development/VerseLyrics048) · [Egern 原生 API](https://egernapp.com/docs/javascript-api/)

[其他客户端](../../README.md) · [返回 Egern](../README.md)

2026-10-16：585 项自动测试；源码、官方依据、缓存与切歌模拟记录见固定源码目录。模拟测试不代表实机 VPN 稳定性验收。
