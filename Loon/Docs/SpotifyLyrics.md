# Spotify 双语歌词 · VerseLyrics · Loon

核心 **0.4.2**，客户端适配 **1**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

**0.4.2 配色修正：** 补充歌词使用同一首歌曲的 Spotify 公开页面配色，普通文字与高亮文字分别设色，替换旧版固定的深绿黑色背景。对旧版已经缓存的补充歌词也会重新应用配色，无需手动清除缓存。Spotify 原有歌词的配色继续保留。

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
| `FALLBACK_PROVIDER` | `auto` | 无词时依次尝试 LRCLIB、QQ 音乐、网易云；可选 `lrclib` / `qq` / `netease` / `off` |
| `DISCOVER_MISSING` | `true` | 尝试适配原生入口，不保证客户端发起歌词请求 |

可以直接在插件参数中调整上述四项设置。

翻译开启后，不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源严格核对歌名、艺人、专辑和时长；来源没有收录时不能凭空补全歌词。

## 配色与验证范围

补充歌词优先保留歌词接口已有的有效配色；没有配色时，读取该歌曲 Spotify 公开嵌入页面的 `visualIdentity`。检查歌曲 ID、颜色范围和文字对比度，不复用其他歌曲的颜色。取色与补词并行，单次最多占用现有总预算中的 1.5 秒；成功缓存一天，失败短暂缓存五分钟并使用中性灰色。取色失败仍可返回已经找到的歌词。

2026-10-16：205 项本地检查通过，包括核心回归、配色边界与 Loon 接口模拟。三首歌曲的公开配色请求成功；打包后的 Loon 脚本也通过实际取色并写入原生 Protobuf 的验证。《那页夏天》的公开背景色为 `#4D545C`，普通文字为 `#C6CED7`，高亮文字为白色。这些验证不等同于新版在 iPhone 上的最终视觉验收，也不保证与每个 Spotify 版本的官方歌词配色完全一致。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色请求仅向 `open.spotify.com` 发送歌曲 ID，不附带当前 Spotify 请求的授权、客户端令牌或 Cookie，也无需增加解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/6214b6d5e3a1cb3cadccfdfc1af242bc63310c0f/Loon/script/SpotifyLyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/6214b6d5e3a1cb3cadccfdfc1af242bc63310c0f/Loon/Development/VerseLyricsColors)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[Script 语法](https://nsloon.app/docs/Script/script_v2/) · [Script API](https://nsloon.app/docs/Script/script_api/) · [目标歌曲公开配色来源](https://open.spotify.com/embed/track/76XUZSb13QUuj1HECY4Hvo)

[其他客户端](../../README.md) · [返回 Loon](../README.md)
