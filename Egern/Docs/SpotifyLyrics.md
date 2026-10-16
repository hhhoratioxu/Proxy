# Spotify 双语歌词 · VerseLyrics

**0.4.9 补词与等待修复：** 普通网络超时回调结束后可继续下一个歌词源，整个处理任务结束时释放名额，不再遗留失效占位。两个名额用满时，只登记最新一个等待者，最多等待 2.6 秒；旧请求回调后停止追加工作，最新请求可在本次响应中继续补词。普通重叠响应和预取不会再仅因到达顺序互相取消；没有无限队列，也不在结束后后台联网。

中文标题或歌手优先 QQ、网易、酷狗、酷我，再查 LRCLIB / lyrics.ovh；已有成功来源提示继续优先。已核对到候选曲目后，为下载歌词保留独立时间，且仍受总预算约束。QQ / 网易查询统一简繁搜索词；核对歌名、歌手、版本与时长的要求不放宽。只有完整查询全部来源且均未匹配才缓存“无词”；旧版失败缓存自动失效，成功缓存保留。

未缓存且拿不到 Spotify 元数据时，增加同一歌曲公开 embed 页回退，一次读取歌名、歌手、时长与配色。页面没有专辑，必须按原有唯一同曲规则核对，不能将同名歌曲直接当作匹配。Spotify 鉴权或权限错误仍保留原响应。

翻译阶段最多使用剩余总预算中的 2.5 秒，慢服务不再长期拖住已有歌词；成功译文保留，未完成部分可在后续歌词请求继续补齐。原词、时间轴、插件替换官方译文和原生配色保留。

持久缓存仍不超过 128 条 / 64,000 JSON 字符，仅保留当前歌曲相关工作数据；两个联网名额和一个等待记录均为尽力控制，存储没有原子锁。歌词 / 入口正文 256 / 128 KiB，普通服务 96 KiB，补源累计 256 KiB / 12 请求，等待时不发 HTTP。宿主缓冲与 VM 内存不受这些数字直接限制，尚无 iPhone VPN 实机内存或稳定性验收。

保留原生异步 ctx、Headers、流读取与 max_size；只在宿主存在 setTimeout 时启用短等待，否则繁忙请求按原响应返回。官方 JavaScript API 未列出该全局计时器，因此不将 Egern 的等待能力标为已验证。

当前模块：0.4.9，适用于支持原生 `ctx` 脚本 API 的 Egern。

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

插件逻辑独立编写。Unihan 简繁体映射的许可保存在运行版本对应的 [NOTICE-UNICODE.txt](https://raw.githubusercontent.com/hhhoratioxu/Proxy/d485cd3194964a92017967f7d7bcdf2f6fe7df0e/Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt)。

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/d485cd3194964a92017967f7d7bcdf2f6fe7df0e/Egern/script/SpotifyLyrics/spotify-lyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/d485cd3194964a92017967f7d7bcdf2f6fe7df0e/Surge/Development/VerseLyrics049) · [Egern 原生 API](https://egernapp.com/docs/javascript-api/)

[其他客户端](../../README.md) · [返回 Egern](../README.md)

2026-10-16：606 项自动测试；延迟故障模型、五客户端连续切歌模拟和真实公开来源记录见固定源码目录。自动测试不代替手机验收。
