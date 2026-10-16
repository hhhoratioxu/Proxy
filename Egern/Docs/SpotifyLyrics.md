# Spotify 双语歌词 · VerseLyrics

0.4.13 重点减少首次加载和连续切歌的内存开销：Loon 按官方接口直接接收歌词源、公开元数据和翻译的 UTF-8 文本，在检查字节上限后使用，避免强制二进制再逐字解码；无效 UTF-8 的二进制返回仍走严格校验。Spotify 原生 Protobuf 元数据继续使用二进制。

五个客户端共用的官方歌词处理改为保留原始字节和文字列表，替换译文时只分配一个最终字节缓冲区；原词、时间轴、未知字段及官方配色按原字节保留。繁简匹配仍覆盖原有 6,447 对 Unicode 映射，字表缩小并只在需要核对汉字歌名时初始化，不展开整张映射表。

六个补词源、插件替换官方译文、短句合批、同曲请求复用及高亮修复继续保留。没有扩大缓存、延长超时或增加预加载；缓存仍为 128 条 / 64,000 个 JSON UTF-16 字符。来源没有收录的歌仍可能无词。

本地 Node 模拟覆盖首次独立进程、完全空缓存、中英文歌曲和 120 次切歌。首次加载十种场景的堆增量中位数均下降；网络为模拟回调，耗时变化不能等同手机加载速度。Loon 120 次切歌中 Protobuf 堆采样峰值约 15.0 → 13.1 MB，JSON 约 15.1 → 13.5 MB，输出字节校验一致。完整方法和所有测量保存在固定源码目录；这些数据不代表 iPhone 的 VPN 进程峰值或实机稳定性保证。

当前模块：0.4.13，适用于支持原生 `ctx` 脚本 API 的 Egern。

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

补充歌词优先保留歌词接口已有的有效配色；没有配色时，读取同一歌曲 Spotify 公开嵌入页的背景色，验证歌曲 ID 与颜色范围。普通句用黑色、高亮句用白色，过暗或过亮的背景在保留色调的基础上调整明度，使生成颜色的普通文字 / 背景对比度至少 3.2:1、高亮文字 / 背景至少 4.8:1；这些数值针对颜色字段，不包含客户端动画或透明度。旧缓存同样在读取时修正，不增加联网和缓存写入。

取得补充歌词后才取色，单次最多占用现有总预算中的 1.5 秒；公开元数据页已提供颜色时直接复用。成功缓存一天，失败短暂缓存五分钟并使用中性灰色。取色失败仍可返回已经找到的歌词。

取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。脚本不保存或记录 Spotify 授权令牌；歌词来源收到歌曲信息，翻译服务收到待翻译歌词文本。

正式模块没有诊断通知或定时监测。无需运行开发测试或收集诊断通知来安装。

## 来源与许可

插件逻辑独立编写。Unihan 简繁体映射的许可保存在运行版本对应的 [NOTICE-UNICODE.txt](https://raw.githubusercontent.com/hhhoratioxu/Proxy/d0bfd0e3b0d42dbee0e813a22aece7747fbb1d33/Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt)。

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/d0bfd0e3b0d42dbee0e813a22aece7747fbb1d33/Egern/script/SpotifyLyrics/spotify-lyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/d0bfd0e3b0d42dbee0e813a22aece7747fbb1d33/Surge/Development/VerseLyrics0413) · [Egern 原生 API](https://egernapp.com/docs/javascript-api/)

[其他客户端](../../README.md) · [返回 Egern](../README.md)

2026-10-16：731 项自动测试通过；包含独立 Protobuf 字节校验、分配计数、短句合批及失败退回、五客户端同曲重叠请求、六源及翻译保留、颜色与连续切歌模拟。记录见固定源码目录；未进行手机实机验收。
