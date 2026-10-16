# Spotify 双语歌词 · VerseLyrics

当前模块：0.4.3，适用于支持原生 `ctx` 脚本 API 的 Egern。

**0.4.3 内存与补词优化：** 请求阶段使用约 4–6 KB 的独立轻量脚本；歌词响应改为分块 UTF-8 解码，减少临时对象和二进制复制，翻译批次顺序执行。缓存按需加载，最多 192 条、约 96,000 个 JSON 字符；大缓存会自动裁剪，未变化时不反复写回。

补词先请求 LRCLIB 的单条匹配结果，再按需搜索；为后续来源预留查询时间。优先核对同专辑结果；仅当歌名、歌手一致、时长差不超过 1 秒且结果唯一时，允许单曲、合集或本地化专辑名不同，仍排除现场、混音及翻唱。查无结果缓存 90 秒，请求失败缓存 15 秒，限流遵守 Retry-After。

外部服务响应最多解析 384 KiB；播放上下文超过 512 KiB 时保留原响应，其余原生响应上限仍为 2 MiB。仅在取得补充歌词后查询公开配色。来源没有收录、匹配有歧义或客户端没有发起歌词请求时，仍可能没有歌词。

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
| `FALLBACK_PROVIDER` | `auto` | 官方无词时依次核对 LRCLIB、QQ 音乐和网易云来源。 |
| `DISCOVER_MISSING` | `true` | 处理已适配的歌词检查、元数据和原生歌词入口。 |

Spotify 已有的原词和时间轴继续保留。备用源优先核对同专辑结果；跨专辑必须满足唯一同曲匹配，未收录的歌曲无法生成歌词。译文由插件处理，翻译服务不可用时保留原词。

## 兼容性

用户已确认《那页夏天》在 Loon 能显示补充歌词；Egern 此前的无词问题仍未解决。本次优化不代表所有客户端、所有无词歌曲均已通过实机验证，补源仍受客户端请求行为及来源收录限制。

补充歌词优先保留歌词接口已有的有效配色，否则读取同一歌曲公开嵌入页面的 `visualIdentity`，核对歌曲 ID、颜色范围和文字对比度。取得补充歌词后才取色，最多使用现有总预算中的 1.5 秒；成功缓存一天，失败使用中性灰并缓存五分钟，仍可返回已经找到的歌词。

2026-10-16：340 项自动检查通过，覆盖原生 JSON / Protobuf、译文替换、同曲配色、五客户端接口、轻量请求行为、匹配边界、缓存、超时预算和大响应保护。同一份约 1.5 MiB 的合成 JSON 解码并写入译文，本地 Node.js 测试中解码后 JS 堆占用由约 105 MiB 降至约 13 MiB，0.4.3 在 32 MiB JS 堆限制下也完成处理。这些数值来自 macOS 上的 Node.js，不代表 iPhone 代理进程的实际内存或实机验收。

取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。脚本不保存或记录 Spotify 授权令牌；歌词来源收到歌曲信息，翻译服务收到待翻译歌词文本。

正式模块没有诊断通知或定时监测。无需运行开发测试或收集诊断通知来安装。

## 来源与许可

插件逻辑独立编写。Unihan 简繁体映射的许可保存在运行版本对应的 [NOTICE-UNICODE.txt](https://raw.githubusercontent.com/hhhoratioxu/Proxy/ea770b61e11392e371a8dbb74f0d3379e69b7b09/Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt)。

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/ea770b61e11392e371a8dbb74f0d3379e69b7b09/Egern/script/SpotifyLyrics/spotify-lyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/ea770b61e11392e371a8dbb74f0d3379e69b7b09/Surge/Development/VerseLyrics043) · [Egern 原生 API](https://egernapp.com/docs/javascript-api/)

[其他客户端](../../README.md) · [返回 Egern](../README.md)
