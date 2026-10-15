# Spotify 原生双语歌词 · VerseLyrics

**0.4.0 · 2026-10-15 · Egern 正式模块**

在 Spotify 自己的歌词页补充缺失歌词，并用插件译文接管官方译文列表。默认开启自动补源、无词入口适配和简体中文翻译。正常使用无需查看状态、收集日志或等待诊断通知；正式模块只有请求与响应两个处理项，没有定时任务或通知脚本。

## 安装或更新

导入 [正式模块 0.4.0](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml?v=0.4.0)：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml?v=0.4.0
```

1. 在 Egern 中关闭旧版 VerseLyrics 及所有 VerseLyrics 诊断模块，只启用这一份正式模块。
2. 更新模块本身并重新加载配置；脚本会自动下载。模块使用独立的 `spotify-lyrics-0.4.0.js` 地址，避免沿用旧文件缓存。
3. 将 Spotify 从后台彻底划掉后重新打开，正常播放并查看 Spotify 原生歌词页。

沿用已经安装、信任并开启的 Egern HTTPS 解密。仅处理 `spclient.wg.spotify.com` 和 `*-spclient.spotify.com`；不需要另外部署服务器、登录插件或购买 API Key。默认值已同时写入模块环境与脚本，导入即可使用。已有设置若显式关闭翻译，仍以用户保存的选项为准。

## 0.4.0 的完整处理链

| 环节 | 正式版行为 |
| --- | --- |
| 客户端歌词检查 | 处理完整的 `/user-customization-service/v1/customize` 和 `/bootstrap/v1/bootstrap` 配置路径；按已核对的原生封装，仅启用 `ios-feature-lyrics` 下的 `enable_has_lyrics_check_bypass`。 |
| 歌曲有词标记 | 解析旧元数据和批量 `TRACK_V4`，缓存歌曲信息，更新已识别的无词标记，包括 proto2 字段省略时的默认 `false`。 |
| 原生歌词卡片 | 为当前曲目立即补入带完整 section 标识的歌词卡片，不等待联网查词。 |
| 实际歌词缺失 | 已识别空歌词或实际歌词请求返回 404 时，自动按歌名、完整歌手、专辑、时长匹配备用源。 |
| 已有原词 | 继续使用 Spotify 原词，保留时间轴、音节、颜色、方向等原生字段。 |
| 译文接管 | 由插件从原词生成译文，整体替换 Spotify 官方译文列表；不会混用官方译文填补失败行。 |
| 日常运行 | 所有响应在同一个处理器中执行，共用歌曲与歌词缓存，正常运行不发通知。 |

0.3.3 普通模块只覆盖卡片和元数据，未整合客户端配置路径。历史 diag.2 将配置路径后缀误作完整路径；diag.3 修正了路径及 bootstrap 封装。0.4.0 将这些入口适配并入正式处理链，保留原有补源和译文策略，默认开启翻译。

配置改写只涉及上述歌词检查开关，其他配置项、账号属性和未知字段保留原字节。customize 支持 `Configuration`、`ResolveResponse`、`UcsResponse`、`UcsResponseWrapper`；bootstrap 使用已核对的外层路径 `2 → 1 → 1`，完整路径可为 `2 → 1 → 1 → 1 → 1 → 1`。未知结构、JSON 配置、错误封装及类型不符时保留上游内容。

## 设置与歌词来源

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| `TRANSLATION_ENABLED` | `true` | 用插件译文替换全部官方译文；失败行留空，全部失败时仅保留原词。 |
| `TARGET_LANGUAGE` | `zh-CN` | 简体中文；可选繁体中文、英语、日语、韩语等，共 25 个语言选项。 |
| `FALLBACK_PROVIDER` | `auto` | 无词时依次尝试 LRCLIB、QQ 音乐、网易云；可指定单个来源或设为 `off`。 |
| `DISCOVER_MISSING` | `true` | 自动处理客户端检查、原生卡片和已识别的无词标记。 |

原词与译文使用 Spotify 原生的独立列表，不把译文拼进原词行。原生翻译按钮负责显示或隐藏译文，字号、高亮、滚动和点击跳转由 Spotify 客户端渲染。

补源严格核对歌曲版本，时长差不超过 2 秒，支持 Unicode Unihan 的无歧义简繁体歌手名比较。不将翻唱、现场版、重制版或其他专辑当成原曲。来源只有纯文本时标记为 `UNSYNCED`，不制造时间轴。Spotify 有原词时不替换原词；备用歌词保留真实提供商名称。

备用源也未收录相同版本的歌曲，仍无法凭空生成歌词。客户端使用尚未适配的网络结构时，也可能无法显示。401、403、429、5xx 和账号权限提示保留上游结果；不会将鉴权或服务错误当成无词。单次共享约 20 秒网络预算，每个来源请求最长 5.5 秒，成功结果会缓存。

Google 网页翻译接口无需 Key，但没有开发者服务承诺，可能限流或调整。仅发送待翻译文本和目标语言；备用源仅收到歌曲信息，不接收 Spotify 令牌。仅在同一次请求内向相同 Spotify 主机复用其鉴权以取得可核对的歌曲元数据，不保存鉴权值。

## 本次自行完成的验证

- **125 项本地测试通过**：涵盖正式默认值、完整配置路径、六层 bootstrap、账号属性与未知字段保留、原生卡片、实际无词处理链、缓存复用、全部官方译文替换，以及不产生通知。
- 两种 YAML 模块均验证通过：只有请求与响应两个处理项、单一响应缓存、固定的版本脚本地址、默认选项、URL 范围及二进制限制。
- 对 [《那页夏天》](https://open.spotify.com/track/76XUZSb13QUuj1HECY4Hvo) 重新调用真实备用服务，QQ 返回 **42 行同步歌词**，再次请求复用缓存。Spotify 元数据和卡片使用先前保存的真实公开响应，歌词 404 为模拟输入。
- 实时 Google 检查 5 项通过，涵盖单句连通性及简体中文、日语、阿拉伯语、法语的插件译文接管；这些用例的 Spotify 歌词输入为自写测试内容。
- 公开 iOS 9.1.88 配置数据在内存中验证：原有 **1,096 项**全部保留，追加一个歌词检查开关；customize 和自行构造的 bootstrap 封装均通过。没有保存或重新分发完整配置。

证据：[本地测试](./Evidence/local-tests.txt)、[模块校验](./Evidence/module-validation.json)、[本次真实目标歌曲补源](./Evidence/production-target-live.json)、[本次真实翻译服务](./Evidence/production-translation-live.json)、[正式配置处理核验](./Evidence/production-config-validation.json)、[协议字段依据](./Evidence/production-protocol.json)。

用户之前的 iPhone 记录已确认 Egern 2.21.0、Spotify 9.1.92.3058 上诊断处理器实际执行、元数据与卡片改写，用户也已反馈翻译有效。**本次 0.4.0 尚未取得手机原生无词显示的成功证据；上述服务及本地检查不能替代该效果，也不宣称每首歌都已在手机显示。** 安装后可正常使用，无需执行诊断或回传通知。

## 源码、离线包与复验

[下载完整离线包](../VerseLyrics-Egern-0.4.0.zip)，包含源码、本地模块、测试和证据。离线模块 `SpotifyLyrics.local.yaml` 引用本地 `spotify-lyrics.js`，与远程版二选一使用。该模块使用 Egern 原生 `ctx` API，不适用于旧式 `$done` 脚本引擎。

```sh
node --test test/spotify-lyrics.test.mjs test/native-entry.test.mjs
ruby test/validate-module.rb
# 模块及固定版本脚本的构建
ruby build-module.rb
# 可选开发复验：真实服务，模拟 Spotify 歌词输入
node test/live-target.mjs
node test/live-smoke.mjs --translations-only
```

所有匹配、缓存、LRC 和二进制修改逻辑独立编写，没有复制其他歌词插件的算法，也没有第三方脚本运行库或运行时远程导入。Unicode 17.0.0 Unihan 的 6,447 个无歧义变体映射按 [NOTICE-UNICODE.txt](./NOTICE-UNICODE.txt) 许可使用；[生成器](./test/build-han-fold.py) 和 [数据依据](./Evidence/unicode-data.json) 保留。

接口与协议只参考字面路径、字段号、消息关系和公开数据，固定来源见 [production-protocol.json](./Evidence/production-protocol.json)。历史卡片、元数据、译文协议证据也保留于 `Evidence/`。Egern API 依据：[JavaScript](https://egernapp.com/docs/javascript-api/)、[模块](https://egernapp.com/docs/configuration/modules/)、[脚本](https://egernapp.com/docs/configuration/scriptings/)；备用源文档：[LRCLIB](https://lrclib.net/docs)。
