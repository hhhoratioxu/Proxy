# Spotify 原生双语歌词 · VerseLyrics for Egern

版本 **0.2.0** · 2026-10-15 · 优先适配 iPhone／iPad

本版向 Spotify 的独立译文字段提供数据：**原歌词留在 `lyrics.lines`，译文写入 `lyrics.alternatives`，界面的字体、颜色、原词/译文层级、滚动、高亮和翻译开关继续由 Spotify 自己控制。** 原词不会被改成“原词 + 换行 + 译文”。

**已完成协议实现、本地测试与真实翻译服务核验；尚未在 iPhone／iPad 上验收实际排版和翻译按钮。** 有些歌曲没有译文时不会显示翻译按钮；也可能是客户端版本或功能开放状态不支持。补入译文后是否出现原生按钮，需要在实际设备上确认。

[远程模块](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml) · [完整 ZIP](../VerseLyrics-Egern-0.2.0.zip) · [ZIP SHA-256](../VerseLyrics-Egern-0.2.0.zip.sha256) · [原创脚本](./spotify-lyrics.js)

## 在 Egern 导入

在「工具 → 模块」新建远程模块，将以下地址填入 URL：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml
```

模块自动获取同目录的 `spotify-lyrics.js`，无需手动创建脚本。这是模块片段，请添加到现有配置中。

1. 启用模块，在模块设置中打开 **「开启歌词翻译」**。默认目标为简体中文 `zh-CN`。
2. 确认你的设备已安装并信任 Egern HTTPS 解密证书，且已启用 MITM。模块只涉及 `spclient.wg.spotify.com` 和 `*-spclient.spotify.com`。
3. 更新模块后还要更新其远程脚本缓存，重新加载配置，并退出再打开 Spotify。
4. 播放歌曲并打开 Spotify 自己的歌词页；如果出现原生翻译按钮，使用那个按钮显示或隐藏译文。

**Egern 的开关决定是否补充译文数据，Spotify 的原生按钮决定是否显示译文。** 脚本不能替用户点击按钮，也不会修改账号权益、客户端实验配置或伪造功能开放状态。语言选择也受 Spotify 自己的界面能力和 App／设备语言影响。

没有按钮时，先在 Egern 中检查歌词请求是否匹配，并运行「VerseLyrics · 最近处理状态」。状态显示已提供独立译文，只代表响应写入成功；不能单凭这条状态认定手机已经显示成功。

## 与 0.1.0 的差别

| 项目 | 0.2.0 的行为 |
| --- | --- |
| 原词与译文 | 原词与独立译文列表分开，不将机器译文追加到 `words`。 |
| 字体和布局 | 保留原歌词字体、方向、颜色、预览行和全屏标记，由 Spotify 现有视图渲染。 |
| 同步和跳转 | 保留每条原词的时间戳、行数和音节数据，不额外发送播放控制命令。 |
| Spotify 自带翻译 | 已有同语种且行数匹配的译文时，保持响应原样，不再调用 Google。 |
| 不认识的译文结构 | 保留原响应，不猜测结构，也不自动降级成拼接文本。 |
| 部分翻译失败 | 独立译文列表在失败位置留空，保持与原词行号一一对应。 |

0.1.0 的显示处理是将译文拼进单条原词文本，因此不能保证达到原生双语的排版和交互。原 0.1.0 ZIP 作为旧版本保留；当前模块和源码已使用 0.2.0 的独立译文实现。

## 实现方式

Spotify 读取歌词响应时，Egern 解析对应的 JSON 或 Protobuf 内容。开启补充翻译后：

1. 先检查 Spotify 是否已提供目标语种的原生译文；存在且行数匹配时直接保留。
2. 缺少目标译文时，按原词行调用 Google 网页翻译接口，并缓存结果。
3. JSON 中添加 `{ language, lines: [逐行译文] }` 到 `lyrics.alternatives`。
4. 二进制中添加 `LyricsResponse` 的第 9 号字段；其中 `Alternative` 第 1 号字段为语言，第 2 号字段为重复的 UTF-8 字符串。
5. 原歌词行、时间戳、音节数据及其他字段不重写；Protobuf 中已有字段保留原始字节，仅为添加的新内容重算容器长度。

当前官方网页播放器直接读取 `alternatives` 并按原词行号显示译文；这一点已从 Spotify 官方分发的客户端资源核对。原生二进制字段另参考公开的生成描述符。**这两种证据都不能代替当前 iOS App 的实际响应和界面验收。** 证据路径见 [`native-protocol.json`](./Evidence/native-protocol.json)。

翻译使用 Google 的网页接口，不需要购买 API Key；它不属于有服务承诺的公开开发者 API，可能限流或调整。只发送待翻译文本和语言，不发送 Spotify 令牌或 Cookie。现有 Spotify 同语种翻译优先保留；简繁体选择用于补充缺失的译文，不覆盖服务端已经提供的同语种内容。

## 歌词来源与设置

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| `TRANSLATION_ENABLED` | `false` | 由用户开启；允许补充独立译文。 |
| `TARGET_LANGUAGE` | `zh-CN` | 25 个语言/地区选项；实际展示由 Spotify 原生界面决定。 |
| `FALLBACK_PROVIDER` | `auto` | 明确无词时依次 LRCLIB → QQ 音乐 → 网易云；也可指定 `lrclib`、`qq`、`netease` 或 `off`。 |
| `DISCOVER_MISSING` | `false` | 可选旧版元数据接口补源；先找到严格匹配歌词，再把该次元数据响应标记为有词。 |

语言包括简体/繁体中文、英语、日语、韩语、法语、德语、西班牙语、葡萄牙语、意大利语、俄语、阿拉伯语、印地语、印尼语、越南语、泰语、土耳其语、荷兰语、波兰语、瑞典语、乌克兰语、希伯来语、波斯语、马来语和希腊语。

Spotify 有原词时始终使用原词。只有明确返回 404 或已识别的空歌词时才查询备用源。备用匹配核对歌名、完整歌手集合、专辑和时长，时长差值不超过 2 秒；不主动放宽到翻唱、现场版、重制版或其他专辑。只有纯文本时标记 `UNSYNCED`，不制造同步时间轴。备用歌词显示真实提供商。

登录/权限提示、401、403、429、5xx、未知结构和处理错误会保留原响应。翻译服务限流会按 `Retry-After` 冷却；单次共享约 20 秒网络预算，每个网络请求最长 5.5 秒。首次翻译可能让歌词加载变慢。

有些无词歌曲不会发起歌词请求。可选 `DISCOVER_MISSING` 仅适配 `/metadata/4/track/<hex>`，且只有明确 `has_lyrics=false` 并已找到可核验备用歌词后才改变该次标记。新版客户端不用此接口时不能介入。此功能默认关闭，避免为预取歌曲产生额外查询。

## 离线安装

压缩包中的 `SpotifyLyrics.local.yaml` 引用 Egern 本地的 `spotify-lyrics.js`。

1. 在 Egern「工具 → 脚本」新增本地脚本，类型 `generic`，文件名填 `spotify-lyrics.js`，完整粘贴交付脚本并保存。
2. 在「工具 → 模块」导入 `SpotifyLyrics.local.yaml`。
3. 按前述设置开启补充翻译，并确认 HTTPS 解密和 Spotify 原生界面表现。

远程版和离线版选择一种使用，避免同时改写同一歌词响应。本版依赖 Egern 当前原生 `ctx` 脚本 API、`env_schema`、`arrayBuffer()` 和 `Headers`，不适用于只支持旧式 `$done` 的脚本引擎。Egern 的 `default_value` 只是界面占位，代码中也实现了相同默认值。

## 已完成的验证

2026-10-15：

- **68 项离线测试通过**，含独立编码的 JSON/Protobuf 样本、原始行字节保留、独立字符串译文列表、官方译文优先、未知结构回退、音节/颜色/字体/预览标记保留、失败空位对齐、限流、备用源匹配与 180 组损坏二进制输入。
- 两种模块的 YAML、脚本路径、默认值、25 个语言选项、URL 匹配范围和大小/超时限制校验通过。
- 真实 Google 单句请求以及简体中文、日语、阿拉伯语、法语的处理链通过：自写原句保持不变，译文独立写入 `alternatives`。
- 备用服务连通性记录来自 0.1.0 的真实查询：QQ 音乐和网易云分别取到 63 行、43 行同步歌词；LRCLIB 在完整调用中遇到 429。这是历史服务记录，本轮没有把它当成 iOS 原生界面证据。

验证记录：[离线测试](./Evidence/local-tests.txt)、[模块校验](./Evidence/module-validation.json)、[本版真实翻译请求](./Evidence/native-translation-live.json)、[协议核对](./Evidence/native-protocol.json)、[历史备用源记录](./Evidence/live-services.json)。

**尚未完成：Egern 在设备中的导入与脚本运行、当前 iPhone/iPad Spotify 对注入译文的识别、翻译按钮出现条件、原词/译文的实际字号及高亮、点击跳转和真实无词补全。** 本机此前检测到 Egern 2.20.0 安装包但启动未成功；没有访问用户手机。不能据本地测试或上游服务成功宣称与手机原生效果完全一致。

## 最小实机验收

1. 只开启本模块，更新模块及脚本后重新打开 Spotify。
2. 选一首原本有英文歌词、没有当前目标语种翻译的歌曲，确认 Egern 命中 `/color-lyrics/v2/track/…`，状态显示提供独立译文。
3. 检查 Spotify 是否出现翻译入口。出现后验证原词/译文层级、滚动、高亮和点击歌词的行为，并用原生按钮切回原词。
4. 如果请求命中且独立译文已写入，仍没有入口，需要核对 Spotify 版本、App/设备语言及去掉令牌后的实际歌词响应。不要发送 Authorization、Cookie、Client-Token 或完整账号流量。

原生界面本来不支持的控件不能单靠响应改写创造。Egern 模块也不提供 VerseDock 的悬浮窗、状态栏或灵动岛。

## 开发复验与依据

无 npm 依赖：

```sh
cd Egern/script/SpotifyLyrics
node --test test/spotify-lyrics.test.mjs
ruby test/validate-module.rb
# 可选；只核验真实翻译服务和模拟的 Spotify 响应：
node test/live-smoke.mjs --translations-only
```

所有脚本、缓存、匹配、LRC 和二进制改写逻辑独立编写；没有复制其他歌词插件的实现，也没有引入第三方脚本或 Protobuf 运行库。核对的是接口与字段事实：

- [Spotify 官方原生歌词翻译说明](https://newsroom.spotify.com/2026-02-04/lyric-translations-offline-previews/)。
- [Egern JavaScript API](https://egernapp.com/docs/javascript-api/)、[模块设置](https://egernapp.com/docs/configuration/modules/)。
- [Protobuf 官方编码格式](https://protobuf.dev/programming-guides/encoding/)。
- [公开原生协议描述符参考](https://github.com/dompling/Script/blob/12ad6fa351525e9c527071fcafa65dab04f6eb8f/spotify/spotify-lyric.ios.js)：仅核对生成的 `Alternative` 和 `LyricsResponse` 字段描述；未使用该插件的实现和运行库。
- [Spotify 元数据字段参考](https://github.com/librespot-org/librespot/blob/dev/protocol/proto/metadata.proto)、[LRCLIB 官方 API](https://lrclib.net/docs)。
