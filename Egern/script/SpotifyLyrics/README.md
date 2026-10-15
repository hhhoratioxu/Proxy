# Spotify 原生双语歌词 · VerseLyrics for Egern

版本 **0.3.3** · 2026-10-15 · 优先适配 iPhone／iPad

本版向 Spotify 的独立译文字段提供数据：**原歌词留在 `lyrics.lines`，译文写入 `lyrics.alternatives`，界面的字体、颜色、原词/译文层级、滚动、高亮和翻译开关继续由 Spotify 自己控制。** 原词不会被改成“原词 + 换行 + 译文”。

**用户已反馈 iPhone 版 Spotify 9.1.92.3058 的原有歌词翻译能够工作，但 0.3.2 的无词歌曲仍不显示歌词。** 0.3.3 修正入口等待联网和卡片信息不完整的问题，保留全部使用插件译文的策略；本次修正尚待手机实际显示验收。

[远程模块](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml) · [完整 ZIP](../VerseLyrics-Egern-0.3.3.zip) · [ZIP SHA-256](../VerseLyrics-Egern-0.3.3.zip.sha256) · [原创脚本](./spotify-lyrics.js)

## 0.3.3：入口立即返回，实际歌词请求再补源

0.3.2 会先额外请求 Spotify 检查原词，再获取元数据、搜索备用源，找到歌词后才返回卡片列表或更改无词标记。任何前置校验失败都会继续返回无卡片列表，成功路径也可能等待多次联网，最长共享 20 秒预算。该流程无法保证播放器及时获得入口。

0.3.3 改为：

1. 开启无词发现且备用源未关闭时，对已识别、缺少歌词项的原生卡片列表立即添加当前曲目的歌词项，并写入 `Section.section_info(23).section_id(1)`。保留其他卡片及未知字段；已有歌词项不重复插入。
2. 已识别的旧版或 `TRACK_V4` 元数据立即缓存曲目身份，并将无词标记改为可发起歌词请求。两个入口阶段都不联网查词、不需要额外的鉴权预检。
3. 客户端真正请求歌词后，仍优先返回 Spotify 原词；只对实际 404 或已识别的空歌词严格查询备用源。入口出现表示允许尝试加载，不代表来源一定收录；未匹配时保留原无词结果。
4. 远程脚本 URL 增加 `?v=0.3.3`，使此版本不再复用旧 URL 的脚本缓存；检查更新周期设为 1 小时。四个响应脚本明确启用二进制处理。

取得了目标曲目的真实 `scrollsita` 响应：247 字节、HTTP 200、`application/x-protobuf`，确实没有歌词项。该请求使用公开嵌入页的匿名会话并携带 iOS 和 9.1.92.3058 请求头，**不是用户手机的流量**。回归样本只保留原卡片结构，移除生成的请求标识，不包含凭据；见 [目标卡片样本](./test/fixtures/target-scroll.json)。歌词 section 标识另按公开 iOS 流量字段事实核对，仅使用协议事实，独立实现。

原词、译文、来源匹配和错误处理策略继续保留。原生卡片数据被正确写入仍不等于 iPhone 界面验收；若状态已有 `player-cards` 写入却没有后续 `lyrics`，需要用端上记录核对其他入口或客户端本地缓存。

## 0.3.2：全部使用插件译文（继续保留）

开启「开启歌词翻译」后，插件接管已识别歌词响应的整个原生译文列表。**Spotify 原有的所有语言译文都会被移除，列表中只保留插件按「翻译目标语言」生成的译文**，即使 Spotify 已有同语种翻译也会替换。原词、时间戳和原生歌词界面继续保留。

当前插件翻译服务为 Google 网页接口，译文也可能来自该接口此前生成的插件缓存。不会从 Spotify 官方译文中取值填入缓存。部分翻译失败时对应译文留空，行号与原词对齐；全部失败或未取得有区别的译文时，官方译文仍会移除，暂时只显示原词，状态中会说明原因。关闭插件翻译开关时保留 Spotify 原响应。

JSON 中整体重写 `lyrics.alternatives`；Protobuf 中移除歌词容器内全部第 9 号字段，再写入唯一的插件译文变体。旧译文内部即使采用无法识别的格式，也会整体替换；原歌词本身结构无法识别时会保留原响应。

0.3.2 的真实 Google 核验覆盖简体中文、日语、阿拉伯语、法语：输入包含模拟官方译文，输出只包含插件生成的目标语言译文，原词和时间戳保持原样。证据见 [译文接管核验](./Evidence/translation-ownership-live.json)。这是服务与处理链测试，Spotify 响应为模拟，不等于手机界面验收。

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

0.3.0–0.3.2 在查词成功后才返回入口，这个历史流程已被 0.3.3 的立即返回策略替换。0.3.1 的简繁体匹配和 proto2 默认无词处理继续保留。批量元数据只解析 `TRACK_V4` 中的曲目信息；音频、可播放性和其他扩展数据保持原样。

**上述链路已有独立模拟样本和真实 QQ 备用服务测试，仍没有当前 iPhone／iPad 的实际流量与界面验收。** 如果备用服务没有同版本歌词，或客户端采用尚未适配的接口，歌曲仍可能不显示。当前不支持批量元数据的 JSON 响应；遇到它会保留原响应，等待卡片路径。

## 在 Egern 导入

在「工具 → 模块」新建远程模块，将以下地址填入 URL：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml
```

模块自动获取同目录的 `spotify-lyrics.js`，无需手动创建脚本。这是模块片段，请添加到现有配置中。

1. 启用模块，设置 **「无词时的备用源」为 `auto`**、**「尝试显示原本无歌词的歌曲」为 `true`**。需要双语时再打开「开启歌词翻译」；默认目标为简体中文 `zh-CN`。
2. 确认你的设备已安装并信任 Egern HTTPS 解密证书，且已启用 MITM。模块只涉及 `spclient.wg.spotify.com` 和 `*-spclient.spotify.com`。
3. 更新模块并重新加载配置，退出再打开 Spotify。0.3.3 的模块会使用带版本参数的新脚本地址；运行「VerseLyrics · 最近处理状态」时，实际版本必须显示 0.3.3。
4. 切到另一首歌再切回，打开 Spotify 自己的播放页和歌词页；如果出现原生翻译按钮，使用那个按钮显示或隐藏译文。首次补源会增加加载时间；找到备用歌词后会缓存，后续请求可直接使用。

**Egern 的翻译开关决定是否用插件译文接管整个译文列表，Spotify 的原生按钮决定是否显示译文。** 原生列表只提供所选目标语言。脚本不能替用户点击按钮，也不会修改账号权益、客户端实验配置或伪造功能开放状态；实际展示仍受 Spotify 界面能力和 App／设备语言影响。

没有歌词或翻译按钮时，在 Egern「工具 → 脚本」运行「VerseLyrics · 最近处理状态」。它显示实际脚本版本、设置和最近 6 个处理阶段，保留最多 8 条历史；包含接口类别、曲目 ID 和 HTTP 状态，不记录完整 URL、令牌或 Cookie。

| 状态或阶段 | 意义与下一步 |
| --- | --- |
| 仍显示旧版本或始终「等待 Spotify」 | 模块/脚本缓存未更新，或相关请求没有命中；检查模块启用与 HTTPS 解密。 |
| `player-cards`，无词发现已关闭 | 将「尝试显示原本无歌词的歌曲」设为 `true`。 |
| 0.3.3 模块仍出现「未能确认 Spotify 原词状态」 | 这是旧版流程的消息。核对事件时间、实际脚本版本和远程脚本地址；0.3.3 已移除此预检。 |
| 未取得可核对的歌曲信息 | 旧版/批量元数据都未提供可核验信息，无法安全匹配备用源。 |
| LRCLIB/QQ/网易云「未找到同版本」或 HTTP 错误 | 显示分别匹配失败、限流、网络/格式失败或耗尽预算的原因。 |
| 已补入完整原生歌词入口，随后没有 `lyrics` | 脚本写入了卡片，但客户端未继续请求歌词；需要当前客户端版本与已去除凭据的卡片响应继续适配。 |
| `lyrics`，备用来源或已提供独立译文 | 歌词响应处理已完成，不能单凭状态认定手机界面显示成功。 |

## 与 0.1.0 的差别

| 项目 | 当前行为 |
| --- | --- |
| 原词与译文 | 原词与独立译文列表分开，不将机器译文追加到 `words`。 |
| 字体和布局 | 保留原歌词字体、方向、颜色、预览行和全屏标记，由 Spotify 现有视图渲染。 |
| 同步和跳转 | 保留每条原词的时间戳、行数和音节数据，不额外发送播放控制命令。 |
| Spotify 自带翻译 | 开启插件翻译后，全部替换为插件生成的所选语言译文。 |
| 不认识的旧译文结构 | 原歌词已识别时，整体清除旧译文槽位再写入插件结果。 |
| 部分翻译失败 | 失败位置留空，保持行号对应，不混入官方译文。 |
| 全部翻译失败 | 清除官方译文，暂时保留原词，状态中显示失败。 |

0.1.0 的显示处理是将译文拼进单条原词文本，因此不能保证达到原生双语的排版和交互。旧版本 ZIP 保留；当前模块沿用 0.2.0 的独立译文实现，并加入 0.3.0 的无词入口处理。

## 实现方式

Spotify 读取歌词响应时，Egern 解析对应的 JSON 或 Protobuf 内容。开启插件翻译后：

1. 从原词读取每一行，不使用官方译文作为翻译结果或缓存。
2. 按原词行调用 Google 网页翻译接口，复用已生成的插件译文缓存。
3. JSON 中将 `lyrics.alternatives` 重写为唯一的 `{ language, lines: [逐行译文] }`；没有可用结果时写入空列表。
4. 二进制中替换 `LyricsResponse` 的全部第 9 号字段；其中 `Alternative` 第 1 号字段为语言，第 2 号字段为重复的 UTF-8 字符串。没有可用结果时移除全部旧译文字段。
5. 原歌词行、时间戳、音节数据及其他字段不重写；Protobuf 中非译文字段保留原始字节，仅为改动后的歌词容器重算长度。

当前官方网页播放器直接读取 `alternatives` 并按原词行号显示译文；这一点已从 Spotify 官方分发的客户端资源核对。原生二进制字段另参考公开的生成描述符。**这两种证据都不能代替当前 iOS App 的实际响应和界面验收。** 证据路径见 [`native-protocol.json`](./Evidence/native-protocol.json)。

翻译使用 Google 的网页接口，不需要购买 API Key；它不属于有服务承诺的公开开发者 API，可能限流或调整。只发送待翻译文本和语言，不发送 Spotify 令牌或 Cookie。0.3.2 会覆盖现有同语种译文，简繁体选择也应用到重新生成的插件译文。

## 歌词来源与设置

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| `TRANSLATION_ENABLED` | `false` | 由用户开启；用插件译文替换全部官方译文，翻译失败时仅保留原词。 |
| `TARGET_LANGUAGE` | `zh-CN` | 25 个语言/地区选项；实际展示由 Spotify 原生界面决定。 |
| `FALLBACK_PROVIDER` | `auto` | 明确无词时依次 LRCLIB → QQ 音乐 → 网易云；也可指定 `lrclib`、`qq`、`netease` 或 `off`。 |
| `DISCOVER_MISSING` | `true` | 立即补入原生入口和更改已识别的无词标记；实际歌词请求再严格补源。入口不代表来源必有歌词。 |

语言包括简体/繁体中文、英语、日语、韩语、法语、德语、西班牙语、葡萄牙语、意大利语、俄语、阿拉伯语、印地语、印尼语、越南语、泰语、土耳其语、荷兰语、波兰语、瑞典语、乌克兰语、希伯来语、波斯语、马来语和希腊语。

Spotify 有原词时始终使用原词。只有实际歌词请求明确返回 404 或已识别的空歌词时才查询备用源。备用匹配核对歌名、完整歌手集合、专辑和时长，时长差值不超过 2 秒；0.3.1 在元数据比较中统一无歧义的汉字简繁变体，不翻译人名或省略版本后缀。不会放宽到翻唱、现场版、重制版或其他专辑。只有纯文本时标记 `UNSYNCED`，不制造同步时间轴。备用歌词显示真实提供商。

登录/权限提示、401、403、429、5xx、未知结构和处理错误会保留原响应。翻译服务限流会按 `Retry-After` 冷却；单次共享约 20 秒网络预算，每个网络请求最长 5.5 秒。首次翻译可能让歌词加载变慢。

有些无词歌曲不会发起歌词请求。`DISCOVER_MISSING` 通过播放器卡片列表、旧版元数据以及批量 `TRACK_V4` 元数据立即提供入口；已识别元数据的 `has_lyrics=false`（含该 proto2 字段省略时的默认值）会在发现开启时改变为允许请求。损坏的布尔字段不会被当成无词。批量入口阶段只缓存元数据和更改标记，不向备用服务发起预取。改写过的批量实体移除旧 ETag，缩短在线缓存 TTL，不建立可离线使用的有词标记。实际歌词缺失时的内置歌曲信息查询在旧接口不可用时尝试原生批量接口；401/403/429 不通过另一接口绕开。

## 离线安装

压缩包中的 `SpotifyLyrics.local.yaml` 引用 Egern 本地的 `spotify-lyrics.js`。

1. 在 Egern「工具 → 脚本」新增本地脚本，类型 `generic`，文件名填 `spotify-lyrics.js`，完整粘贴交付脚本并保存。
2. 在「工具 → 模块」导入 `SpotifyLyrics.local.yaml`。
3. 按前述设置开启补充翻译，并确认 HTTPS 解密和 Spotify 原生界面表现。

远程版和离线版选择一种使用，避免同时改写同一歌词响应。本版依赖 Egern 当前原生 `ctx` 脚本 API、`env_schema`、`arrayBuffer()` 和 `Headers`，不适用于只支持旧式 `$done` 的脚本引擎。Egern 的 `default_value` 只是界面占位，代码中也实现了相同默认值。

## 已完成的验证

2026-10-15：

- **112 项离线测试通过**，覆盖 JSON/Protobuf 全量官方译文替换、多语言与重复项清除、未知旧译文结构、插件缓存、部分/全部失败不回退官方译文、原词和其他二进制字段保留；保留真实目标歌曲元数据、简繁匹配、无词补源及损坏输入回归。
- 两种模块的 YAML、脚本路径、默认值、25 个语言选项、URL 匹配范围和大小/超时限制校验通过。
- 0.3.2 的真实 Google 服务测试通过，作为保留译文策略的历史记录：简体中文、日语、阿拉伯语、法语均覆盖「已有模拟官方译文 → 只保留插件译文」。另有单句服务连通性测试，共 5 项通过。
- 0.3.3 使用目标曲目的真实公开元数据和新取得的卡片结构，验证入口无网络等待，再对模拟歌词 404 进行真实 QQ 补源并复用缓存。具体请求和耗时见 [本次入口与补源核验](./Evidence/entry-flow-live.json)。仍不是手机 UI 验收。
- 0.3.1 针对《那页夏天》的真实查源记录保留：Spotify 原生元数据来自匿名公开会话的真实服务器响应，使用其中的歌名/完整歌手/专辑/时长查源，QQ 实际取到 42 行带时间戳歌词。卡片与歌词 404 为模拟响应。本轮保留这项修复，没有重复该组网络请求。
- 0.3.0 的 QQ 63 行链路作为历史记录保留，其 Spotify 元数据和响应为模拟。本版没有重复那组旧查询。
- 0.2.0 的 Google 独立译文服务记录作为历史证据保留；当前接管策略以本版核验记录为准。
- 备用服务连通性记录来自 0.1.0 的真实查询：QQ 音乐和网易云分别取到 63 行、43 行同步歌词；LRCLIB 在完整调用中遇到 429。这是历史服务记录，本轮没有把它当成 iOS 原生界面证据。

验证记录：[本次入口改动核验](./Evidence/entry-flow-regression.json)、[本次真实补源](./Evidence/entry-flow-live.json)、[离线测试](./Evidence/local-tests.txt)、[模块校验](./Evidence/module-validation.json)、[本版译文接管核验](./Evidence/translation-ownership-live.json)、[0.3.1 目标歌曲真实查源](./Evidence/target-song-live.json)、[汉字变体数据依据](./Evidence/unicode-data.json)、[0.3.0 补源链路](./Evidence/missing-lyrics-live.json)、[无词入口协议依据](./Evidence/missing-lyrics-protocol.json)、[0.2.0 翻译服务记录](./Evidence/native-translation-live.json)、[译文协议核对](./Evidence/native-protocol.json)、[0.1.0 备用源记录](./Evidence/live-services.json)。

**尚未完成：Egern 在设备中的导入与脚本运行、当前 iPhone/iPad Spotify 对注入译文的识别、翻译按钮出现条件、原词/译文的实际字号及高亮、点击跳转和真实无词补全。** 本机此前检测到 Egern 2.20.0 安装包但启动未成功；没有访问用户手机。不能据本地测试或上游服务成功宣称与手机原生效果完全一致。

## 最小实机验收

1. 只开启本模块，更新模块及脚本后重新打开 Spotify。
2. 选择你遇到的无歌词歌曲，复制分享链接，并查看状态中的 `player-cards`、`metadata`/`extended-metadata` 和 `lyrics` 阶段。确认卡片写入后是否真的出现歌词请求和界面。
3. 再选一首原本已有目标语种官方译文的歌曲，确认状态显示插件译文替换，原生列表仅提供所选语言的插件结果。验证原词/译文层级、滚动、高亮和点击歌词，并用原生按钮切回原词。
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
# 可选；使用保存的真实 Spotify 元数据和匿名卡片结构，实时查询目标歌曲的歌词源：
node test/live-target.mjs
```

所有脚本、缓存、匹配、LRC 和二进制改写逻辑独立编写；没有复制其他歌词插件的实现，也没有引入第三方脚本或 Protobuf 运行库。0.3.1 使用 Unicode 17.0.0 Unihan 的公开标准变体数据，选取 6,447 个单目标映射生成静态表；不引入运行时依赖。数据许可完整保留于 [NOTICE-UNICODE.txt](./NOTICE-UNICODE.txt)，生成器见 [build-han-fold.py](./test/build-han-fold.py)，来源与哈希见 [unicode-data.json](./Evidence/unicode-data.json)。核对的接口与字段依据：

- [Spotify 官方原生歌词翻译说明](https://newsroom.spotify.com/2026-02-04/lyric-translations-offline-previews/)。
- [Egern JavaScript API](https://egernapp.com/docs/javascript-api/)、[模块设置](https://egernapp.com/docs/configuration/modules/)、[脚本更新周期与二进制配置](https://egernapp.com/docs/configuration/scriptings/)。
- [Protobuf 官方编码格式](https://protobuf.dev/programming-guides/encoding/)。
- [Protobuf proto2 默认值说明](https://protobuf.dev/programming-guides/proto2/)、[Unicode Unihan 标准](https://www.unicode.org/reports/tr38/)。
- [公开原生协议描述符参考](https://github.com/dompling/Script/blob/12ad6fa351525e9c527071fcafa65dab04f6eb8f/spotify/spotify-lyric.ios.js)：仅核对生成的 `Alternative` 和 `LyricsResponse` 字段描述；未使用该插件的实现和运行库。
- [Spotify 元数据字段参考](https://github.com/librespot-org/librespot/blob/dev/protocol/proto/metadata.proto)、[LRCLIB 官方 API](https://lrclib.net/docs)。
- [公开 iOS 卡片流量中的 section 字段事实](https://github.com/zbzxbg/EeveeSpotifyEvolved/blob/292b93c78ba1770cb6e96f8bee719e9e6b2d0275/Sources/EeveeSpotify/Premium/Helpers/ScrollsitaLyricsElementInjector.swift)：只核对注释记录的协议字段与标识，没有复制其实现。
- 批量元数据与原生卡片的逐字段描述符链接、哈希及平台限制见 [无词入口协议依据](./Evidence/missing-lyrics-protocol.json)。仅依据接口与生成的字段事实独立实现，没有复制其他插件的查源或注入算法。
