# Spotify 双语歌词 · VerseLyrics

当前模块：0.4.4，适用于支持原生 `ctx` 脚本 API 的 Egern。

**0.4.4 六源补词与内存限制：** 新增酷狗音乐、酷我音乐和 lyrics.ovh。`auto` 依次查询 LRCLIB → QQ 音乐 → 网易云音乐 → 酷狗音乐 → 酷我音乐 → lyrics.ovh，找到结果立即停止。酷狗与酷我使用来源的真实时间轴；lyrics.ovh 仅提供纯文本，按 Spotify 原生非同步歌词显示，不伪造滚动时间。

补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一，排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

每次补词最多发起 12 个外部请求，依次执行；保留原有总处理 20 秒预算并给后续来源预留时间。累计允许解码的补词响应不超过 512 KiB；三个新增来源单次响应限制 96 KiB，酷狗 Base64 解码后的歌词限制 64 KiB，歌词最多 600 行。已知超大 Content-Length 会在读取正文前拒绝；没有长度的响应收到后检查，不解码超限正文。宿主 HTTP 层可能先缓存响应，脚本不能据此保证整个代理进程的内存硬上限。

继续使用约 4–6 KB 的独立请求脚本、分块 UTF-8 解码、顺序翻译和按需加载缓存；缓存最多 192 条、96,000 个 JSON 字符。查无结果缓存 90 秒，临时失败缓存 15 秒，遵守 Retry-After。客户端支持时立即清除已完成请求的计时器；无论是否支持，都释放计时器引用的已完成 Promise，减少响应缓冲区滞留。仅取得补充歌词后查询同曲配色。

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

2026-10-16：428 项自动测试通过，覆盖六个来源的匹配、错误和预算边界，以及五客户端的 JSON / Protobuf 输出、原生译文替换、配色、缓存和请求脚本。三个新增来源均完成公开接口实测取词；《那页夏天》仍由 QQ 音乐匹配。0.4.4 的约 1.5 MiB 合成 JSON 解码/写回及六源压力测试均在 Node.js 的 32 MiB 老生代堆限制下完成；这不是 iPhone 代理进程总内存或实机验收。详见源码目录的测试记录、内存数据与公开接口验证记录。

取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。脚本不保存或记录 Spotify 授权令牌；歌词来源收到歌曲信息，翻译服务收到待翻译歌词文本。

正式模块没有诊断通知或定时监测。无需运行开发测试或收集诊断通知来安装。

## 来源与许可

插件逻辑独立编写。Unihan 简繁体映射的许可保存在运行版本对应的 [NOTICE-UNICODE.txt](https://raw.githubusercontent.com/hhhoratioxu/Proxy/50b2adf2bc8d36d43d9999302af4ab1b8d3a9e95/Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt)。

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/50b2adf2bc8d36d43d9999302af4ab1b8d3a9e95/Egern/script/SpotifyLyrics/spotify-lyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/50b2adf2bc8d36d43d9999302af4ab1b8d3a9e95/Surge/Development/VerseLyrics044) · [Egern 原生 API](https://egernapp.com/docs/javascript-api/)

[其他客户端](../../README.md) · [返回 Egern](../README.md)
