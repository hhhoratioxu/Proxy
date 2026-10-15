# Spotify 原生双语歌词 · VerseLyrics for Egern

版本 **0.3.1** · 2026-10-15 · 优先适配 iPhone／iPad

本版向 Spotify 的独立译文字段提供数据：**原歌词留在 `lyrics.lines`，译文写入 `lyrics.alternatives`，界面的字体、颜色、原词/译文层级、滚动、高亮和翻译开关继续由 Spotify 自己控制。** 原词不会被改成“原词 + 换行 + 译文”。

**用户已反馈 iPhone 版 Spotify 9.1.92.3058 的原有歌词翻译能够工作；本轮修正无歌词补源。** 已用用户提供的歌曲取得真实 Spotify 元数据与 QQ 同版本歌词；手机补词界面的最终显示尚未独立验收。

[远程模块](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml) · [完整 ZIP](../VerseLyrics-Egern-0.3.1.zip) · [ZIP SHA-256](../VerseLyrics-Egern-0.3.1.zip.sha256) · [原创脚本](./spotify-lyrics.js)

## 0.3.1：用《那页夏天》实际复现并修正补词失败

用户提供的 [《那页夏天》](https://open.spotify.com/track/76XUZSb13QUuj1HECY4Hvo) 在 Spotify 原本没有歌词。实际核对得到：

| 字段 | Spotify 原生元数据 | QQ 音乐对应版本 |
| --- | --- | --- |
| 歌名 | 那页夏天 | 那页夏天 |
| 歌手 | 王俊凱 | 王俊凯 |
| 专辑 | WJK | WJK |
| 时长 | 246.099 秒 | 246 秒 |

旧代码把「凱」和「凯」当成不同歌手，因此拒绝 QQ 的正确结果；Spotify 此曲的 `has_lyrics` 字段还被省略了。这个字段属于 proto2 的可选 bool，省略后的默认值是 `false`，旧代码却将它视为未知并跳过发现流程。

本版修正这两个原因：元数据比较使用 Unicode Unihan 的无歧义汉字简繁变体映射；已识别的 proto2 曲目按照默认布尔值处理。歌名、完整歌手集合、专辑与时长仍全部核对，不将翻唱或不同版本当成原曲。原歌词和译文比较保留原有逻辑。

实际查源中 LRCLIB 返回 429，随后 QQ 搜索与取词均返回 200，取到 **42 行带时间戳歌词**，查源约 **1.95 秒**。同一份真实 Spotify 元数据已覆盖本地回归；原生卡片与歌词 404 的处理仍通过模拟响应验证，不等于用户手机已经显示成功。证据见 [目标歌曲核验](./Evidence/target-song-live.json)。

该修复适用于所有经过相同处理路径的歌曲，并非按这一个 track ID 特判。自动补词仍依赖至少一个备用源收录对应版本的歌词；源中也没有内容的歌曲无法保证补齐。

## 修正「Spotify 原本没歌词，仍然不显示」

0.2.0 遗漏了播放器的原生歌词卡片入口，只监听歌词响应和旧版 `metadata/4`；无词发现还默认关闭。歌曲没有歌词卡片、客户端没有发起歌词请求时，这条旧处理链无法可靠介入。

0.3.0 新增 `scrollsita/v1/scroll/spotify:track:…` 卡片列表处理和 `extended-metadata/v0/extended-metadata` 批量元数据处理，并匹配显式 `:443` 与 URL 编码的曲目 URI。无词发现默认开启，**已有模块保存的 `false` 不会自动变为 `true`，需要在设置中手动开启**。

播放器未下发歌词卡片时，先确认 Spotify 原词状态。只有 Spotify 原词可用，或已从备用源找到并缓存同一版本的歌词，才插入该曲目的原生歌词卡片。后续真实歌词请求仍优先使用 Spotify 原词，明确无词时读取备用缓存。0.3.1 也处理已识别 proto2 元数据省略布尔字段的默认无词状态。批量元数据只解析 `TRACK_V4` 中的曲目信息；音频、可播放性和其他扩展数据保持原样。

**上述链路已有独立模拟样本和真实 QQ 备用服务测试，仍没有当前 iPhone／iPad 的实际流量与界面验收。** 如果备用服务没有同版本歌词、原词状态无法确认，或客户端采用尚未适配的接口，歌曲仍可能不显示。当前不支持批量元数据的 JSON 响应；遇到它会保留原响应，等待卡片路径。

## 在 Egern 导入

在「工具 → 模块」新建远程模块，将以下地址填入 URL：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml
```

模块自动获取同目录的 `spotify-lyrics.js`，无需手动创建脚本。这是模块片段，请添加到现有配置中。

1. 启用模块，设置 **「无词时的备用源」为 `auto`**、**「尝试显示原本无歌词的歌曲」为 `true`**。需要双语时再打开「开启歌词翻译」；默认目标为简体中文 `zh-CN`。
2. 确认你的设备已安装并信任 Egern HTTPS 解密证书，且已启用 MITM。模块只涉及 `spclient.wg.spotify.com` 和 `*-spclient.spotify.com`。
3. 更新模块后还要更新其远程脚本缓存，重新加载配置，并退出再打开 Spotify。
4. 切到另一首歌再切回，打开 Spotify 自己的播放页和歌词页；如果出现原生翻译按钮，使用那个按钮显示或隐藏译文。首次补源会增加加载时间；找到备用歌词后会缓存，后续请求可直接使用。

**Egern 的开关决定是否补充译文数据，Spotify 的原生按钮决定是否显示译文。** 脚本不能替用户点击按钮，也不会修改账号权益、客户端实验配置或伪造功能开放状态。语言选择也受 Spotify 自己的界面能力和 App／设备语言影响。

没有歌词或翻译按钮时，在 Egern 运行「VerseLyrics · 最近处理状态」。0.3.0 显示实际设置和最近 6 个处理阶段，保留最多 8 条历史；包含版本、接口类别、曲目 ID 和 HTTP 状态，不记录完整 URL、令牌或 Cookie。

| 状态或阶段 | 意义与下一步 |
| --- | --- |
| 仍显示旧版本或始终「等待 Spotify」 | 模块/脚本缓存未更新，或相关请求没有命中；检查模块启用与 HTTPS 解密。 |
| `player-cards`，无词发现已关闭 | 将「尝试显示原本无歌词的歌曲」设为 `true`。 |
| `player-cards`，未能确认 Spotify 原词状态 | 可能没有可复用的请求鉴权，或服务/响应不兼容；保留原列表，不能据此认定备用源没有歌词。 |
| 未取得可核对的歌曲信息 | 旧版/批量元数据都未提供可核验信息，无法安全匹配备用源。 |
| LRCLIB/QQ/网易云「未找到同版本」或 HTTP 错误 | 显示分别匹配失败、限流、网络/格式失败或耗尽预算的原因。 |
| 已补入原生歌词卡片，随后没有 `lyrics` | 脚本写入了卡片，但客户端未继续请求歌词；需要当前客户端版本与已去除凭据的卡片响应继续适配。 |
| `lyrics`，备用来源或已提供独立译文 | 歌词响应处理已完成，不能单凭状态认定手机界面显示成功。 |

## 与 0.1.0 的差别

| 项目 | 0.2.0 的行为 |
| --- | --- |
| 原词与译文 | 原词与独立译文列表分开，不将机器译文追加到 `words`。 |
| 字体和布局 | 保留原歌词字体、方向、颜色、预览行和全屏标记，由 Spotify 现有视图渲染。 |
| 同步和跳转 | 保留每条原词的时间戳、行数和音节数据，不额外发送播放控制命令。 |
| Spotify 自带翻译 | 已有同语种且行数匹配的译文时，保持响应原样，不再调用 Google。 |
| 不认识的译文结构 | 保留原响应，不猜测结构，也不自动降级成拼接文本。 |
| 部分翻译失败 | 独立译文列表在失败位置留空，保持与原词行号一一对应。 |

0.1.0 的显示处理是将译文拼进单条原词文本，因此不能保证达到原生双语的排版和交互。旧版本 ZIP 保留；当前模块沿用 0.2.0 的独立译文实现，并加入 0.3.0 的无词入口处理。

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
| `DISCOVER_MISSING` | `true` | 发现无词歌曲；确认可用歌词后补入原生卡片或更改已识别的无词元数据标记。旧模块保存的关闭值需要手动开启。 |

语言包括简体/繁体中文、英语、日语、韩语、法语、德语、西班牙语、葡萄牙语、意大利语、俄语、阿拉伯语、印地语、印尼语、越南语、泰语、土耳其语、荷兰语、波兰语、瑞典语、乌克兰语、希伯来语、波斯语、马来语和希腊语。

Spotify 有原词时始终使用原词。只有明确返回 404、已识别的空歌词或已识别元数据的无词状态时才查询备用源。备用匹配核对歌名、完整歌手集合、专辑和时长，时长差值不超过 2 秒；0.3.1 在元数据比较中统一无歧义的汉字简繁变体，不翻译人名或省略版本后缀。不会放宽到翻唱、现场版、重制版或其他专辑。只有纯文本时标记 `UNSYNCED`，不制造同步时间轴。备用歌词显示真实提供商。

登录/权限提示、401、403、429、5xx、未知结构和处理错误会保留原响应。翻译服务限流会按 `Retry-After` 冷却；单次共享约 20 秒网络预算，每个网络请求最长 5.5 秒。首次翻译可能让歌词加载变慢。

有些无词歌曲不会发起歌词请求。`DISCOVER_MISSING` 通过播放器卡片列表、旧版元数据以及批量 `TRACK_V4` 元数据提供入口；已识别元数据的 `has_lyrics=false`（含该 proto2 字段省略时的默认值）且已找到备用歌词时才改变标记。损坏的布尔字段不会被当成无词。批量请求最多为 3 首已明确无词的曲目查源，其余只缓存元数据，避免一次预取产生无限查询。改写过的批量实体移除旧 ETag，缩短在线缓存 TTL，不建立可离线使用的有词标记。内置歌曲信息查询在旧接口不可用时尝试原生批量接口；401/403/429 不尝试通过另一接口绕开。

## 离线安装

压缩包中的 `SpotifyLyrics.local.yaml` 引用 Egern 本地的 `spotify-lyrics.js`。

1. 在 Egern「工具 → 脚本」新增本地脚本，类型 `generic`，文件名填 `spotify-lyrics.js`，完整粘贴交付脚本并保存。
2. 在「工具 → 模块」导入 `SpotifyLyrics.local.yaml`。
3. 按前述设置开启补充翻译，并确认 HTTPS 解密和 Spotify 原生界面表现。

远程版和离线版选择一种使用，避免同时改写同一歌词响应。本版依赖 Egern 当前原生 `ctx` 脚本 API、`env_schema`、`arrayBuffer()` 和 `Headers`，不适用于只支持旧式 `$done` 的脚本引擎。Egern 的 `default_value` 只是界面占位，代码中也实现了相同默认值。

## 已完成的验证

2026-10-15：

- **100 项离线测试通过**，新增用户目标歌曲的真实 Spotify 元数据回归、简繁歌手/专辑匹配、默认 false 的旧版与批量元数据发现、原歌词简繁翻译保留，以及损坏布尔字段回退；保留原有无卡片补全、严格版本匹配、未知字段保留与损坏输入测试。
- 两种模块的 YAML、脚本路径、默认值、25 个语言选项、URL 匹配范围和大小/超时限制校验通过。
- 本版针对《那页夏天》：Spotify 原生元数据来自匿名公开会话的真实服务器响应，使用其中的歌名/完整歌手/专辑/时长查源，QQ 实际取到 42 行带时间戳歌词。卡片与歌词 404 仍为模拟响应，未取得用户手机的界面证据。
- 0.3.0 的 QQ 63 行链路作为历史记录保留，其 Spotify 元数据和响应为模拟。本版没有重复那组旧查询。
- Google 单句及简体中文、日语、阿拉伯语、法语的独立译文服务记录来自 0.2.0；本版保留原生翻译逻辑，本轮未重复该组网络请求。
- 备用服务连通性记录来自 0.1.0 的真实查询：QQ 音乐和网易云分别取到 63 行、43 行同步歌词；LRCLIB 在完整调用中遇到 429。这是历史服务记录，本轮没有把它当成 iOS 原生界面证据。

验证记录：[离线测试](./Evidence/local-tests.txt)、[模块校验](./Evidence/module-validation.json)、[目标歌曲真实查源](./Evidence/target-song-live.json)、[汉字变体数据依据](./Evidence/unicode-data.json)、[0.3.0 补源链路](./Evidence/missing-lyrics-live.json)、[无词入口协议依据](./Evidence/missing-lyrics-protocol.json)、[0.2.0 翻译服务记录](./Evidence/native-translation-live.json)、[译文协议核对](./Evidence/native-protocol.json)、[0.1.0 备用源记录](./Evidence/live-services.json)。

**尚未完成：Egern 在设备中的导入与脚本运行、当前 iPhone/iPad Spotify 对注入译文的识别、翻译按钮出现条件、原词/译文的实际字号及高亮、点击跳转和真实无词补全。** 本机此前检测到 Egern 2.20.0 安装包但启动未成功；没有访问用户手机。不能据本地测试或上游服务成功宣称与手机原生效果完全一致。

## 最小实机验收

1. 只开启本模块，更新模块及脚本后重新打开 Spotify。
2. 选择你遇到的无歌词歌曲，复制分享链接，并查看状态中的 `player-cards`、`metadata`/`extended-metadata` 和 `lyrics` 阶段。确认卡片写入后是否真的出现歌词请求和界面。
3. 再选一首原本有英文歌词、没有当前目标语种翻译的歌曲，确认歌词响应处理成功、是否出现翻译入口。验证原词/译文层级、滚动、高亮和点击歌词，并用原生按钮切回原词。
4. 如果处理状态成功但界面仍无入口，需要核对 Spotify 版本、App/设备语言和去掉凭据后的实际响应。不要发送 Authorization、Cookie、Client-Token 或完整账号流量。

原生界面本来不支持的控件不能单靠响应改写创造。Egern 模块也不提供 VerseDock 的悬浮窗、状态栏或灵动岛。

## 开发复验与依据

无 npm 依赖：

```sh
cd Egern/script/SpotifyLyrics
node --test test/spotify-lyrics.test.mjs
ruby test/validate-module.rb
# 可选；只核验真实翻译服务和模拟的 Spotify 响应：
node test/live-smoke.mjs --translations-only
# 可选；QQ 服务为真实，Spotify 元数据/卡片/404 为模拟：
node test/live-smoke.mjs --missing-only
# 可选；使用保存的真实 Spotify 元数据，实时查询用户报告歌曲的歌词源：
node test/live-target.mjs
```

所有脚本、缓存、匹配、LRC 和二进制改写逻辑独立编写；没有复制其他歌词插件的实现，也没有引入第三方脚本或 Protobuf 运行库。0.3.1 使用 Unicode 17.0.0 Unihan 的公开标准变体数据，选取 6,447 个单目标映射生成静态表；不引入运行时依赖。数据许可完整保留于 [NOTICE-UNICODE.txt](./NOTICE-UNICODE.txt)，生成器见 [build-han-fold.py](./test/build-han-fold.py)，来源与哈希见 [unicode-data.json](./Evidence/unicode-data.json)。核对的接口与字段依据：

- [Spotify 官方原生歌词翻译说明](https://newsroom.spotify.com/2026-02-04/lyric-translations-offline-previews/)。
- [Egern JavaScript API](https://egernapp.com/docs/javascript-api/)、[模块设置](https://egernapp.com/docs/configuration/modules/)。
- [Protobuf 官方编码格式](https://protobuf.dev/programming-guides/encoding/)。
- [Protobuf proto2 默认值说明](https://protobuf.dev/programming-guides/proto2/)、[Unicode Unihan 标准](https://www.unicode.org/reports/tr38/)。
- [公开原生协议描述符参考](https://github.com/dompling/Script/blob/12ad6fa351525e9c527071fcafa65dab04f6eb8f/spotify/spotify-lyric.ios.js)：仅核对生成的 `Alternative` 和 `LyricsResponse` 字段描述；未使用该插件的实现和运行库。
- [Spotify 元数据字段参考](https://github.com/librespot-org/librespot/blob/dev/protocol/proto/metadata.proto)、[LRCLIB 官方 API](https://lrclib.net/docs)。
- 批量元数据与原生卡片的逐字段描述符链接、哈希及平台限制见 [无词入口协议依据](./Evidence/missing-lyrics-protocol.json)。仅依据接口与生成的字段事实独立实现，没有复制其他插件的查源或注入算法。
