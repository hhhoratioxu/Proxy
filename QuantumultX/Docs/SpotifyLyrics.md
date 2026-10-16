# Spotify 双语歌词 · VerseLyrics · Quantumult X

核心 **0.4.2**，客户端适配 **1**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。

**0.4.2 配色修正：** 补充歌词使用同一首歌曲的 Spotify 公开配色，普通文字和高亮文字分别设色；替换旧版固定的深绿黑背景。旧缓存会自动应用新配色，原词、时间轴及已有官方歌词的配色保持不变。

用户已确认《那页夏天》在 Loon 能显示补充歌词；Egern 此前的无词问题仍未解决。本次同步配色不代表所有客户端、所有无词歌曲均已通过实机验证，补源仍受客户端请求行为及来源收录限制。

## 安装与更新

已安装的用户更新原模块或重写引用，再重新打开 Spotify；原来的导入地址继续有效。

[SpotifyLyrics.conf 原始地址](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/SpotifyLyrics.conf)

1. 在 Quantumult X「重写 → 引用」中添加上面的地址并启用。建议 build 934 或更新版本；旧版自动 Cookie 行为不同。
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

如需繁体中文或指定来源，将资源保存为本地重写后，同步修改两条脚本 URL 的 `#` 参数。例如把两处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。

翻译开启后，不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源严格核对歌名、艺人、专辑和时长；来源没有收录时不能凭空补全歌词。

## 当前验证范围

补充歌词优先保留歌词接口已有的有效配色，否则读取同一歌曲公开嵌入页面的 `visualIdentity`，核对歌曲 ID、颜色范围和文字对比度。取色与补词并行，最多使用现有总预算中的 1.5 秒；成功缓存一天，失败使用中性灰并缓存五分钟，仍可返回已经找到的歌词。

2026-10-16：281 项自动检查通过，覆盖核心回归、五客户端打包接口、JSON / Protobuf、缓存换色、翻译替换及原生配置。五个运行版本均在接口模拟环境中完成了真实公开取色，并返回预期的原生 Protobuf 颜色。新版的各客户端实际导入和 iPhone 最终画面尚未实测。

Quantumult X 的响应体重写在原响应体为空时不会执行，所以空体 404 无法经这一入口补词。这是本版本额外的客户端限制；不会通过拦截所有正常请求来伪造成功。

脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。没有诊断通知或定时监测。

## 运行版本与接口

[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/86a6f4f3e28d4819ad3e820f2a8d3e3ac562fb91/QuantumultX/script/SpotifyLyrics.js) · [适配源码与构建记录](https://github.com/hhhoratioxu/Proxy/tree/86a6f4f3e28d4819ad3e820f2a8d3e3ac562fb91/Surge/Development/VerseLyrics042)

原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。[官方二进制脚本示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js) · [官方 HTTP 示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js) · [空响应体限制](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf#L290)

[其他客户端](../../README.md) · [返回 Quantumult X](../README.md)
