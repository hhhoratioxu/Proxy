# Spotify 双语歌词 · VerseLyrics

**0.4.10 歌词高亮修复：** 旧版把 Spotify 嵌入播放页的浅色正文和浅灰辅助文字用作歌词颜色，导致普通歌词与高亮句过于相近。补充歌词现在使用黑色普通句、白色高亮句；背景保留封面色调，只在过暗或过亮时调整明度。《那页夏天》的补词背景由 `#4d545c` 调整为 `#585f66`。切句、滚动和已唱句的淡化继续由 Spotify 原生界面根据原时间轴处理。

旧版补词颜色缓存读取时自动修正，沿用原键和有效期，无需清空歌词、翻译或重新查词。此次颜色修正不新增 HTTP、计时器、脚本入口或缓存记录，最多进行八次固定颜色计算。Spotify 官方歌词响应已有的有效配色继续保留。

保留 0.4.9 的六源顺序补词、中文源优先、候选下载预算、公开元数据回退、有限等待和插件译文替换。持久缓存仍不超过 128 条 / 64,000 JSON 字符，歌词 / 入口正文上限仍为 256 / 128 KiB。Loon 继续使用原生请求头 Rewrite 和两个响应脚本，不为颜色修正增加脚本启动。

更新整个远程插件 / 模块 / 重写文件，以加载新的固定脚本；随后重新打开 Spotify，让歌词页获取新响应。无需查看诊断或手动删除缓存。自动测试不等同于 iPhone 原生界面或 VPN 内存稳定性验收。

当前模块：0.4.10，适用于支持原生 `ctx` 脚本 API 的 Egern。

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

插件逻辑独立编写。Unihan 简繁体映射的许可保存在运行版本对应的 [NOTICE-UNICODE.txt](https://raw.githubusercontent.com/hhhoratioxu/Proxy/28dd199f61b8dc21bc557ace2aef3ebf1331f107/Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt)。

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/28dd199f61b8dc21bc557ace2aef3ebf1331f107/Egern/script/SpotifyLyrics/spotify-lyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/28dd199f61b8dc21bc557ace2aef3ebf1331f107/Surge/Development/VerseLyrics0410) · [Egern 原生 API](https://egernapp.com/docs/javascript-api/)

[其他客户端](../../README.md) · [返回 Egern](../README.md)

2026-10-16：620 项自动测试通过；包含颜色对比度、旧缓存离线修正、五客户端 JSON / Protobuf 输出及连续切歌模拟。记录见固定源码目录；未进行手机实机验收。
