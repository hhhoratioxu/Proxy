# Spotify 双语歌词 · VerseLyrics · Loon

核心 **0.4.4**，客户端适配 **3**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

**0.4.4 六源补词与内存限制：** 新增酷狗音乐、酷我音乐和 lyrics.ovh。`auto` 依次查询 LRCLIB → QQ 音乐 → 网易云音乐 → 酷狗音乐 → 酷我音乐 → lyrics.ovh，找到结果立即停止。酷狗与酷我使用来源的真实时间轴；lyrics.ovh 仅提供纯文本，按 Spotify 原生非同步歌词显示，不伪造滚动时间。

补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一，排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。

每次补词最多发起 12 个外部请求，依次执行；保留原有总处理 20 秒预算并给后续来源预留时间。累计允许解码的补词响应不超过 512 KiB；三个新增来源单次响应限制 96 KiB，酷狗 Base64 解码后的歌词限制 64 KiB，歌词最多 600 行。已知超大 Content-Length 会在读取正文前拒绝；没有长度的响应收到后检查，不解码超限正文。宿主 HTTP 层可能先缓存响应，脚本不能据此保证整个代理进程的内存硬上限。

继续使用约 4–6 KB 的独立请求脚本、分块 UTF-8 解码、顺序翻译和按需加载缓存；缓存最多 192 条、96,000 个 JSON 字符。查无结果缓存 90 秒，临时失败缓存 15 秒，遵守 Retry-After。客户端支持时立即清除已完成请求的计时器；无论是否支持，都释放计时器引用的已完成 Promise，减少响应缓冲区滞留。仅取得补充歌词后查询同曲配色。

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

翻译开启后，不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源核对歌名、艺人和时长，优先同专辑，跨专辑需要唯一且严格的同曲匹配；来源没有收录时不能凭空补全歌词。

## 配色与验证范围

补充歌词优先保留歌词接口已有的有效配色；没有配色时，读取该歌曲 Spotify 公开嵌入页面的 `visualIdentity`。检查歌曲 ID、颜色范围和文字对比度，不复用其他歌曲的颜色。取得补充歌词后才取色，单次最多占用现有总预算中的 1.5 秒；成功缓存一天，失败短暂缓存五分钟并使用中性灰色。取色失败仍可返回已经找到的歌词。

2026-10-16：428 项自动测试通过，覆盖六个来源的匹配、错误和预算边界，以及五客户端的 JSON / Protobuf 输出、原生译文替换、配色、缓存和请求脚本。三个新增来源均完成公开接口实测取词；《那页夏天》仍由 QQ 音乐匹配。0.4.4 的约 1.5 MiB 合成 JSON 解码/写回及六源压力测试均在 Node.js 的 32 MiB 老生代堆限制下完成；这不是 iPhone 代理进程总内存或实机验收。详见源码目录的测试记录、内存数据与公开接口验证记录。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色请求仅向 `open.spotify.com` 发送歌曲 ID，不附带当前 Spotify 请求的授权、客户端令牌或 Cookie，也无需增加解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/50b2adf2bc8d36d43d9999302af4ab1b8d3a9e95/Loon/script/SpotifyLyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/50b2adf2bc8d36d43d9999302af4ab1b8d3a9e95/Surge/Development/VerseLyrics044)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[Script 语法](https://nsloon.app/docs/Script/script_v2/) · [Script API](https://nsloon.app/docs/Script/script_api/) · [目标歌曲公开配色来源](https://open.spotify.com/embed/track/76XUZSb13QUuj1HECY4Hvo)

[其他客户端](../../README.md) · [返回 Loon](../README.md)
