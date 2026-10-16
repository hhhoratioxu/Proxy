# Spotify 双语歌词 · VerseLyrics · Surge

**0.4.6 首次加载与内存保护：** 高频播放器、元数据和歌词入口由独立小脚本处理，不加载六源、翻译或汉字映射。汉字匹配直接查询 6,447 组静态映射；不再为每次运行建立整张 Map。相同元数据不重复写入缓存，15 秒内连续相同状态记录合并。

`auto` 首次仍依次查询 LRCLIB、QQ、网易云、酷狗、酷我、lyrics.ovh；同一组歌手近期成功的同步源会提前，提示有效 6 小时。每首歌仍核对标题、歌手、时长和版本；其他来源继续保留。配色、翻译、歌词源全程串行。

原始歌词响应上限 256 KiB，播放器与入口响应 128 KiB，普通外部服务响应 96 KiB，配色 256 KiB；单次补源累计 256 KiB、最多 12 个请求，输出最多 512 KiB。歌词缓存最多 128 条、64,000 个 JSON 字符，旧缓存自动缩减；译文保留和重复行展开各最多 60,000 个字符。缓存量不等于总进程内存。

完整歌词处理预算 10 秒，单次 HTTP 最多 2.5 秒。共享存储检查最多两个联网歌词任务；忙时使用已有缓存或保留原响应，不建立等待队列，也不缓存为“此歌无词”。该存储无原子锁，跨实例准入是尽力保护；不能给宿主网络缓冲或 VPN 总内存提供硬上限。未确认取消的超时请求保留短期名额，不继续堆请求。

Loon 在响应头阶段跳过超过对应 128/256 KiB 上限的已知大响应；Egern、Surge、Shadowrocket 同时设置宿主大小限制。所有客户端在脚本内再次检查；Egern 的响应流超限即停止读取。超限或繁忙时，部分歌曲可能暂时不能补词或翻译，优先让原响应继续通过。

核心 **0.4.6**，客户端适配 **5**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

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

如需繁体中文或指定来源，将模块保存为本地副本后，同步修改三条 `[Script]` 的 `argument=` 参数。例如把两处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。

翻译开启后，不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源核对歌名、艺人和时长，优先同专辑，跨专辑需要唯一且严格的同曲匹配；来源没有收录时不能凭空补全歌词。

## 当前验证范围

补充歌词优先保留歌词接口已有的有效配色，否则读取同一歌曲公开嵌入页面的 `visualIdentity`，核对歌曲 ID、颜色范围和文字对比度。取得补充歌词后才取色，最多使用现有总预算中的 1.5 秒；成功缓存一天，失败使用中性灰并缓存五分钟，仍可返回已经找到的歌词。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/6c0c30e4e7dced3c86b0ae07124db1dc52b27e23/Surge/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/6c0c30e4e7dced3c86b0ae07124db1dc52b27e23/Surge/Development/VerseLyrics046)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[HTTP Response Script](https://manual.nssurge.com/scripting/http-response.html) · [HTTP / Storage API](https://manual.nssurge.com/scripting/api.html)

[其他客户端](../../README.md) · [返回 Surge](../README.md)


2026-10-16：556 项自动检查；具体性能、压力和真实来源验证见固定源码目录中的记录。手机 VPN 稳定性和峰值内存仍需实机验证，不能由 Node 测试替代。
