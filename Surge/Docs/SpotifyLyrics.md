# Spotify 双语歌词 · VerseLyrics · Surge

核心 **0.4.3**，客户端适配 **2**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

**0.4.3 内存与补词优化：** 请求阶段使用约 4–6 KB 的独立轻量脚本；歌词响应改为分块 UTF-8 解码，减少临时对象和二进制复制，翻译批次顺序执行。缓存按需加载，最多 192 条、约 96,000 个 JSON 字符；大缓存会自动裁剪，未变化时不反复写回。

补词先请求 LRCLIB 的单条匹配结果，再按需搜索；为后续来源预留查询时间。优先核对同专辑结果；仅当歌名、歌手一致、时长差不超过 1 秒且结果唯一时，允许单曲、合集或本地化专辑名不同，仍排除现场、混音及翻唱。查无结果缓存 90 秒，请求失败缓存 15 秒，限流遵守 Retry-After。

外部服务响应最多解析 384 KiB；播放上下文超过 512 KiB 时保留原响应，其余原生响应上限仍为 2 MiB。仅在取得补充歌词后查询公开配色。来源没有收录、匹配有歧义或客户端没有发起歌词请求时，仍可能没有歌词。

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
| `FALLBACK_PROVIDER` | `auto` | 无词时依次尝试 LRCLIB、QQ 音乐、网易云；可选 `lrclib` / `qq` / `netease` / `off` |
| `DISCOVER_MISSING` | `true` | 尝试适配原生入口，不保证客户端发起歌词请求 |

如需繁体中文或指定来源，将模块保存为本地副本后，同步修改两条 `[Script]` 的 `argument=` 参数。例如把两处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。

翻译开启后，不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源核对歌名、艺人和时长，优先同专辑，跨专辑需要唯一且严格的同曲匹配；来源没有收录时不能凭空补全歌词。

## 当前验证范围

补充歌词优先保留歌词接口已有的有效配色，否则读取同一歌曲公开嵌入页面的 `visualIdentity`，核对歌曲 ID、颜色范围和文字对比度。取得补充歌词后才取色，最多使用现有总预算中的 1.5 秒；成功缓存一天，失败使用中性灰并缓存五分钟，仍可返回已经找到的歌词。

2026-10-16：340 项自动检查通过，覆盖原生 JSON / Protobuf、译文替换、同曲配色、五客户端接口、轻量请求行为、匹配边界、缓存、超时预算和大响应保护。同一份约 1.5 MiB 的合成 JSON 解码并写入译文，本地 Node.js 测试中解码后 JS 堆占用由约 105 MiB 降至约 13 MiB，0.4.3 在 32 MiB JS 堆限制下也完成处理。这些数值来自 macOS 上的 Node.js，不代表 iPhone 代理进程的实际内存或实机验收。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/ea770b61e11392e371a8dbb74f0d3379e69b7b09/Surge/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/ea770b61e11392e371a8dbb74f0d3379e69b7b09/Surge/Development/VerseLyrics043)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[HTTP Response Script](https://manual.nssurge.com/scripting/http-response.html) · [HTTP / Storage API](https://manual.nssurge.com/scripting/api.html)

[其他客户端](../../README.md) · [返回 Surge](../README.md)
