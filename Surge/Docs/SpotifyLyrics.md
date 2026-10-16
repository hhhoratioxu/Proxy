# Spotify 双语歌词 · VerseLyrics · Surge

**0.4.7 客户端规范与内存保护：** 保留请求、入口、歌词三个独立脚本；按各客户端能力处理运行结束、HTTP 和二进制数据。

按 [Surge 官方引擎建议](https://manual.nssurge.com/scripting/overview.html)，两个响应脚本显式使用 engine=webview，使脚本引擎在独立进程中执行；请求脚本使用 engine=jsc。保持官方 max-size 和 Uint8Array 二进制接口。HTTP timeout 按秒传入，依赖原生请求回调和脚本 timeout 结束，不再叠加 JavaScript 超时竞速。需要支持 WebView 引擎的 Surge iOS 5.9.0+ / Mac 5.5.0+；不适用于仅有 JSC 的 tvOS。

六源和同歌手同步来源优先保持不变。歌词、配色、翻译串行，不增加预加载或等待队列。缓存命中无需联网；共享存储对两个联网任务进行尽力准入检查，但存储不提供原子锁。超时或繁忙不会被误记成该歌无词。

正文预算继续为歌词 256 KiB、入口 128 KiB、普通服务 96 KiB、配色 256 KiB；补源累计 256 KiB / 12 请求；输出 512 KiB。主缓存最多 128 条 / 64,000 JSON 字符。上述值是脚本处理预算，不是 VPN 进程总内存上限。

核心以 10 秒为继续发起网络请求的预算；Egern/Loon 原生 HTTP 使用毫秒超时，Surge 使用秒超时，最多 2.5 秒。Quantumult X 不宣称有单次 2.5 秒原生超时，只在首次联网后保留一个整体 12 秒退出计时器。宿主可能先缓冲未知长度响应，结束脚本也不等于取消网络；无法据此保证整台设备的 VPN 永不因内存退出。超限或繁忙时保留原响应，可能暂时不补词或不翻译。

核心 **0.4.7**，客户端适配 **6**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 重复记录仅在完整歌词、时间戳与时长全部相同的情况下合并），排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

用户已确认《那页夏天》在 Loon 能显示补充歌词；Egern 此前的无词问题仍未解决。本次优化不代表所有客户端、所有无词歌曲均已通过实机验证，补源仍受客户端请求行为及来源收录限制。

## 安装与更新

已安装的用户更新原模块或重写引用，再重新打开 Spotify；原来的导入地址继续有效。

[SpotifyLyrics.sgmodule 原始地址](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/SpotifyLyrics.sgmodule)

1. 在 Surge「模块」中添加远程模块，粘贴上面的地址并启用。建议 Surge iOS 5.9.0+ / Mac 5.5.0+。
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

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/41cadc7d0fe005932fa9f80e28ec439ca2e2a466/Surge/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/41cadc7d0fe005932fa9f80e28ec439ca2e2a466/Surge/Development/VerseLyrics047)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[HTTP Response Script](https://manual.nssurge.com/scripting/http-response.html) · [HTTP / Storage API](https://manual.nssurge.com/scripting/api.html)

[其他客户端](../../README.md) · [返回 Surge](../README.md)

2026-10-16：568 项自动测试；官方依据与验证范围见固定源码目录的 CLIENT-CONTRACTS.md。实机 VPN 峰值内存尚未验收。
