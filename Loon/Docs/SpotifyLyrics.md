# Spotify 双语歌词 · VerseLyrics · Loon

**0.4.8 连续切歌与内存优化：** 请求头处理改用 [Loon 官方原生 Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/)，不再为每条请求启动 JavaScript；仅保留歌词和入口两个响应脚本。内部元数据查询在响应规则阶段跳过，避免再开入口脚本。仍使用官方条件语法过滤 URL、状态、已知 Content-Length，等待原生 HTTP 回调后再结束，不添加未公开的引擎或内存参数。需要 Loon 3.5.1（983）及以上。

歌词运行包去除仅供播放器入口使用的代码。当前歌曲处理期间只保留相关歌词、译文、配色及必要来源提示；入口缓存视图只保留元数据。保存时与完整缓存合并，其他歌曲的成功缓存不会因视图缩小而丢失。持久缓存总上限仍为 128 条 / 64,000 JSON 字符。

不同歌曲的新歌词响应到来后，旧任务不再追加歌词源、配色或翻译请求；已发出的原生请求正常回调后结束，不调用未公开取消接口、不增加等待队列。它跟踪响应到达顺序，不能判断 Spotify 的真实播放位置。已获得歌词和可用译文继续返回，暂缓任务不写成“该歌无词”。

六源补词、严格同曲核对、插件替换官方译文、原生时间轴和配色均保留。正文预算为歌词 256 KiB、入口 128 KiB、普通服务 96 KiB；补源累计 256 KiB / 12 请求。共享存储的两个联网名额是尽力控制，不能当成原子锁。

这些是脚本预算和减少分配的措施，不是 VPN 进程内存上限。未知长度响应可能先由宿主缓冲；超限或繁忙时使用缓存或原响应，可能暂时缺少补词或译文。尚未完成 iPhone VPN 峰值内存及连续切歌实机验收。

核心 **0.4.8**，客户端适配 **7**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 重复记录仅在完整歌词、时间戳与时长全部相同的情况下合并），排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

用户已确认《那页夏天》在 Loon 能显示补充歌词。此前 Egern 无词问题仍未解决；这个反馈不代表所有歌曲、所有客户端都已支持，补源仍需来源收录及客户端发起歌词请求。

## 安装与更新

[SpotifyLyrics.plugin 原始地址](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/SpotifyLyrics.plugin)

1. 在 Loon「插件」中添加上面的远程地址并启用。需要 Loon 3.5.1（983）或更新版本。已安装的用户更新原插件即可。
2. 使用已安装、信任并开启的 HTTPS 解密证书。仅加入 `spclient.wg.spotify.com` 和 `*-spclient.spotify.com`。
3. 同时只启用一个 Spotify 歌词处理插件，重新加载代理配置并重新打开 Spotify；切换歌曲后重新进入歌词页。

客户端自动下载固定版本运行脚本，只需安装这个入口文件。无需下载源码、运行测试、查看诊断或开启通知。

## 设置

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `TRANSLATION_ENABLED` | `true` | 以插件译文替换全部官方译文列表 |
| `TARGET_LANGUAGE` | `zh-CN` | 默认简体；`zh-TW` 繁体、`en` 英文、`ja` 日文、`ko` 韩文 |
| `FALLBACK_PROVIDER` | `auto` | 无词时顺序尝试六源；可选 `lrclib` / `qq` / `netease` / `kugou` / `kuwo` / `lyricsovh` / `off` |
| `DISCOVER_MISSING` | `true` | 尝试适配原生入口，不保证客户端发起歌词请求 |

可以直接在插件参数中调整上述四项设置。

在已处理的歌词响应中，翻译开启后不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源核对歌名、艺人和时长，优先同专辑，跨专辑需要唯一且严格的同曲匹配；来源没有收录时不能凭空补全歌词。

## 配色与验证范围

补充歌词优先保留歌词接口已有的有效配色；没有配色时，读取该歌曲 Spotify 公开嵌入页面的 `visualIdentity`。检查歌曲 ID、颜色范围和文字对比度，不复用其他歌曲的颜色。取得补充歌词后才取色，单次最多占用现有总预算中的 1.5 秒；成功缓存一天，失败短暂缓存五分钟并使用中性灰色。取色失败仍可返回已经找到的歌词。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色请求仅向 `open.spotify.com` 发送歌曲 ID，不附带当前 Spotify 请求的授权、客户端令牌或 Cookie，也无需增加解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/661010d356abacfad6f2bfb910db65958b357315/Loon/script/SpotifyLyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/661010d356abacfad6f2bfb910db65958b357315/Surge/Development/VerseLyrics048)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[Script 语法](https://nsloon.app/docs/Script/script_v2/) · [Script API](https://nsloon.app/docs/Script/script_api/) · [目标歌曲公开配色来源](https://open.spotify.com/embed/track/76XUZSb13QUuj1HECY4Hvo)

[其他客户端](../../README.md) · [返回 Loon](../README.md)

2026-10-16：585 项自动测试；源码、官方依据、缓存与切歌模拟记录见固定源码目录。模拟测试不代表实机 VPN 稳定性验收。
