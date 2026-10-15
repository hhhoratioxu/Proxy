# Spotify 双语歌词 · VerseLyrics · Surge

核心 **0.4.1**，客户端适配 **1**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

**已知问题：官方原本没有歌词的歌曲，仍可能完全不显示歌词。用户在 Egern / iOS Spotify 9.1.92.3058 已反馈此问题未解决；本次发布移植了相同核心，没有把移植视为修复。**

## 安装

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

翻译开启后，不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源严格核对歌名、艺人、专辑和时长；来源没有收录时不能凭空补全歌词。

## 当前验证范围

四种客户端接口模拟测试与 0.4.1 核心回归通过，覆盖 JSON / Protobuf、替换译文、共享缓存、二进制 HTTP 与错误透传。没有完成四种客户端的实际导入和 iPhone Spotify 播放验证。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/c35a07c9a851cba4c9f33c9d421cb68cf36b0784/Surge/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/c35a07c9a851cba4c9f33c9d421cb68cf36b0784/Surge/Development/VerseLyricsPorts)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[HTTP Response Script](https://manual.nssurge.com/scripting/http-response.html) · [HTTP / Storage API](https://manual.nssurge.com/scripting/api.html)

[其他客户端](../../README.md) · [返回 Surge](../README.md)
