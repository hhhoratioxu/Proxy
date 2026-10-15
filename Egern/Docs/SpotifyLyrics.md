# Spotify 双语歌词 · VerseLyrics

当前模块：0.4.1，适用于支持原生 `ctx` 脚本 API 的 Egern。

## 安装

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

Spotify 已有的原词和时间轴继续保留。备用源严格核对歌名、艺人、专辑与时长；未收录的歌曲无法生成歌词。译文由插件处理，翻译服务不可用时保留原词。

## 兼容性

0.4.1 已完成本地协议和真实歌词来源检查，但手机上官方无词歌曲的最终显示尚未取得成功实机证据，不能承诺所有歌曲都显示。当前原生二进制、播放上下文和播放状态适配依赖 Spotify 实际使用的网络格式。

正式模块没有诊断通知或定时监测。无需运行开发测试或收集诊断通知来安装。

## 来源与许可

插件逻辑独立编写。Unihan 简繁体映射的许可保存在运行版本对应的 [NOTICE-UNICODE.txt](https://raw.githubusercontent.com/hhhoratioxu/Proxy/fdb2f8cfc2701a7959d7ee58c1f2ab01ce368fc1/Egern/script/SpotifyLyrics/NOTICE-UNICODE.txt)。

[返回 Egern](../README.md)
