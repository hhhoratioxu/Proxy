# Spotify 原生双语歌词 · VerseLyrics

**0.4.1 · 2026-10-15 · Egern 正式模块**

在 Spotify 自己的歌词页补充缺失歌词，并用插件译文接管官方译文列表。默认开启自动补源、无词入口适配和简体中文翻译。正常使用无需查看状态、收集日志或等待诊断通知；正式模块只有请求与响应两个处理项，没有定时任务或通知脚本。

仓库只保留当前正式版：一个脚本文件、一套在线／离线安装配置，以及一个最新离线包。旧版和诊断版可从 Git 历史查找。

## 安装或更新

导入 [正式模块 0.4.1](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml?v=0.4.1)：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml?v=0.4.1
```

1. 在 Egern 中关闭旧版 VerseLyrics 及所有 VerseLyrics 诊断模块，只启用这一份正式模块。
2. 更新模块本身并重新加载配置；脚本会自动下载。脚本统一使用 `spotify-lyrics.js?v=0.4.1` 地址，以查询参数更新缓存。
3. 将 Spotify 从后台彻底划掉后重新打开，正常播放并查看 Spotify 原生歌词页。

沿用已经安装、信任并开启的 Egern HTTPS 解密。仅处理 `spclient.wg.spotify.com` 和 `*-spclient.spotify.com`；不需要另外部署服务器、登录插件或购买 API Key。默认值已同时写入模块环境与脚本，导入即可使用。已有设置若显式关闭翻译，仍以用户保存的选项为准。

## 0.4.1：补齐播放器元数据的通用入口

用户明确反馈 0.4.0 中不止一首歌，而是官方无词歌曲普遍仍不显示。0.4.0 只处理曲库 `TRACK_V4` 和卡片，漏掉播放器自身的两条元数据路径：

- `context-resolve/v1/spotify:…` 的 `Context.pages[].tracks[].metadata.has_lyrics`，涵盖单曲、专辑、歌单、电台与收藏等上下文。
- `connect-state/v1/devices/…` 的 `Cluster.player_state`，包括当前曲目和前后队列各自的 `ProvidedTrack.metadata.has_lyrics`。

现在统一处理上述音乐曲目标记；原有标题、艺人、队列、播放时间、设备、限制和未知字段保持原样，播客与无效字段不改。JSON 仅按范围替换目标值或插入目标键，不通过重序列化改变大整数、空格或其他内容；Protobuf 按明确字段路径修改目标字符串映射，其他字段保留原始字节。入口阶段不访问歌词源，仍在实际歌词请求明确无词时补源。没有按歌名或曲目 ID 写特例。

已实时调用公开匿名 Spotify 会话的 context-resolve：旧处理器未覆盖，新处理器给真实上下文中的曲目补入 `has_lyrics=true`，其余响应文本完整保留。[验证摘要](./Evidence/player-entry-live.json)。另以多曲目、多上下文和独立构造的 Connect-state 二进制/JSON 样本验证通用路径。该证据不能确定用户手机所有会话的实际格式或最终 UI 行为；Connect-state 没有取得用户账号的真实响应。

## 0.4.1：修正无词补源的原生响应格式

0.4.0 在 `Accept: */*`、无词 404 返回 JSON 错误页时，错误地依据错误页 MIME 选择补词格式，向原生客户端返回了 JSON。0.4.1 改为依据客户端请求决定：显式 `format` 参数优先，明确的 Accept 格式其次；通配或省略 Accept 使用原生二进制，并在发起这类歌词请求时明确请求 Protobuf。错误页的 MIME 不再决定补词格式；已成功解析的 200 响应保留自己的格式，JSON 客户端继续支持。

同时修正二进制格式误判：明确的 Protobuf 内容不会因消息长度字节恰为 `{` 而被当作 JSON；原生 ARGB 颜色使用标准 uint32 编码。

已用《那页夏天》的真实 QQ 42 行歌词比较同一输入的旧版与新版：旧版输出 JSON，新版输出 Protobuf；独立的官方 `google.protobuf` 7.36.2 解码器拒绝旧 JSON 并成功读取新版 42 行时间轴。Spotify 404 错误输入为自行构造，不能据此认定用户手机收到过相同错误封装，或认定这是所有原生显示失败的唯一原因。验证见 [native-format-live.json](./Evidence/native-format-live.json)。Protobuf SDK 仅供独立测试，正式插件没有新增依赖；报文正文未上传。

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

- **159 项本地测试通过**：涵盖正式默认值、完整配置路径、六层 bootstrap、账号属性与未知字段保留、原生卡片、实际无词处理链、缓存复用、全部官方译文替换，以及不产生通知。
- 两种 YAML 模块均验证通过：只有请求与响应两个处理项、单一响应缓存、固定的版本脚本地址、默认选项、URL 范围及二进制限制。
- 对 [《那页夏天》](https://open.spotify.com/track/76XUZSb13QUuj1HECY4Hvo) 重新调用真实备用服务，QQ 返回 **42 行同步歌词**，再次请求复用缓存。Spotify 元数据和卡片使用先前保存的真实公开响应，歌词 404 为模拟输入。
- 0.4.0 的实时 Google 检查 5 项通过，本次保留相同翻译策略，涵盖单句连通性及简体中文、日语、阿拉伯语、法语的插件译文接管；这些用例的 Spotify 歌词输入为自写测试内容。
- 0.4.0 已对公开 iOS 9.1.88 配置数据在内存中验证，本次保留相同配置适配器：原有 **1,096 项**全部保留，追加一个歌词检查开关；customize 和自行构造的 bootstrap 封装均通过。没有保存或重新分发完整配置。

证据：[本地测试](./Evidence/local-tests.txt)、[模块校验](./Evidence/module-validation.json)、[本次真实补源与原生格式](./Evidence/native-format-live.json)、[0.4.0 真实翻译服务](./Evidence/production-translation-live.json)、[正式配置处理核验](./Evidence/production-config-validation.json)、[协议字段依据](./Evidence/production-protocol.json)。

用户之前的 iPhone 记录已确认 Egern 2.21.0、Spotify 9.1.92.3058 上诊断处理器实际执行、元数据与卡片改写，用户也已反馈翻译有效。**本次 0.4.1 尚未取得手机原生无词显示的成功证据；上述服务及本地检查不能替代该效果，也不宣称每首歌都已在手机显示。** 安装后可正常使用，无需执行诊断或回传通知。

## 源码、离线包与复验

[下载完整离线包](../VerseLyrics-Egern.zip)（[SHA-256 校验值](../VerseLyrics-Egern.zip.sha256)），包含当前源码、本地模块、测试和证据。离线模块 `SpotifyLyrics.local.yaml` 引用本地 `spotify-lyrics.js`，与远程版二选一使用。该模块使用 Egern 原生 `ctx` API，不适用于旧式 `$done` 脚本引擎。

```sh
node --test test/spotify-lyrics.test.mjs test/native-entry.test.mjs test/native-format.test.mjs test/player-entry.test.mjs
ruby test/validate-module.rb
# 构建模块，脚本保持同一个文件名
ruby build-module.rb
# 可选开发复验：真实服务，模拟 Spotify 歌词输入
node test/live-target.mjs
node test/live-smoke.mjs --translations-only
```

所有匹配、缓存、LRC 和二进制修改逻辑独立编写，没有复制其他歌词插件的算法，也没有第三方脚本运行库或运行时远程导入。Unicode 17.0.0 Unihan 的 6,447 个无歧义变体映射按 [NOTICE-UNICODE.txt](./NOTICE-UNICODE.txt) 许可使用；[生成器](./test/build-han-fold.py) 和 [数据依据](./Evidence/unicode-data.json) 保留。

接口与协议只参考字面路径、字段号、消息关系和公开数据，固定来源见 [production-protocol.json](./Evidence/production-protocol.json)。历史卡片、元数据、译文协议证据也保留于 `Evidence/`。Egern API 依据：[JavaScript](https://egernapp.com/docs/javascript-api/)、[模块](https://egernapp.com/docs/configuration/modules/)、[脚本](https://egernapp.com/docs/configuration/scriptings/)；备用源文档：[LRCLIB](https://lrclib.net/docs)。
