# Spotify 双语歌词 · VerseLyrics for Egern

版本 **0.1.0** · 2026-10-15 · 原创脚本

在 Egern 中改写 Spotify 的歌词响应，把译文以 `原词\n译文` 的形式写回每句歌词，使 Spotify 自己的歌词页有机会直接显示双语。无需运行 VerseDock，也不需要复制 Cookie 或填写 Spotify Client ID。**本版提供源码、协议测试、真实上游服务核验记录和完整安装包；尚未完成 Egern 实际导入及 Spotify 手机端显示验收。**

## 文件

- `SpotifyLyrics.yaml`：远程导入用 Egern 原生模块，自动从本仓库获取脚本。
- `SpotifyLyrics.local.yaml`：离线模块，引用 Egern 本地 `spotify-lyrics.js` 文件。
- `spotify-lyrics.js`：独立编写的 ES Module；使用 Egern 原生 `export default async function(ctx)` API。
- `test/`：离线协议与行为测试、模块校验及可选联网核验脚本。
- `Evidence/`：实际测试日志与联网核验结果。

仓库分发版 `SpotifyLyrics.yaml` 的四处脚本引用均指向本仓库的远程 JavaScript。离线版 `SpotifyLyrics.local.yaml` 引用 **`spotify-lyrics.js`**，表示 Egern 自己的本地脚本文件。两种模块选择一种使用。

[下载完整安装包](../VerseLyrics-Egern-0.1.0.zip) · [安装包 SHA-256](../VerseLyrics-Egern-0.1.0.zip.sha256) · [直接查看脚本](./spotify-lyrics.js)

## 已实现的行为

| 场景 | 行为 |
| --- | --- |
| Spotify 正常返回歌词 | 使用原词；开启翻译后，在同一条歌词中追加换行和译文。保留原有行数、开始时间、音节数据、原词来源、颜色和未知字段。 |
| Spotify 明确返回 404 或已识别的空歌词 | 读取同一 Spotify 主机的歌曲元数据，再按设置查询备用源。 |
| 备用源选择 `auto` | 依次尝试 LRCLIB → QQ 音乐 → 网易云音乐；指定一家时只尝试该家。Spotify 有词时不会查询备用源。 |
| 备用源匹配 | 核对歌名、完整歌手集合、专辑和时长（差值不超过 2 秒）；不主动放宽到翻唱、现场版、重制版或其他专辑。歌手别名未被提供时可能匹配不到。 |
| 只有纯文本歌词 | 标记为 `UNSYNCED`，时间全部为 0，不制造同步时间轴。 |
| 翻译返回不完整或顺序无法核对 | 该批原词原样保留；其他成功批次仍可显示译文。相同行只翻译一次。 |
| 已有多行双语的歌词 | 保留原来的双语内容，避免重复叠加翻译。 |
| Spotify 登录/权限提示或 401、403、429、5xx | 保留原响应，不将其当成“Spotify 无词”。 |
| 网络失败、未知协议、损坏响应 | 保留原响应。 |

支持 JSON 与 Protobuf 两种歌词响应；二进制修改仅替换歌词文本字段，其他已知和未知字段以原始字节保留。新增备用歌词才会生成新的歌词响应，且保留真实备用来源标识。

**翻译服务使用 Google 的网页翻译接口，不是苹果系统翻译。** 本次无需 API Key 即可完成真实请求，但该接口不是有服务承诺的公开开发者 API，未来可能限流或变动。脚本不创建付费账号或调用付费 API。

## 从仓库导入（推荐）

在 Egern「工具 → 模块」新增远程模块，将下面的地址填入 URL：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml
```

也可以先[打开模块原始文件](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/SpotifyLyrics.yaml)，复制其地址。模块会自动获取 [JavaScript 原始文件](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/spotify-lyrics.js)，无需单独创建本地脚本。

保存并启用模块后，在模块设置打开 **「开启歌词翻译」**，目标语言默认 **`zh-CN`（简体中文）**。确认你的设备已安装并信任 Egern HTTPS 解密证书且已启用 MITM，再重新打开 Spotify 的歌词页。这是模块片段，请作为模块添加到现有配置。

## 离线安装到 Egern

1. 把压缩包解压，将 `spotify-lyrics.js` 和 `SpotifyLyrics.local.yaml` 传到运行 Egern 的设备。
2. 在 Egern「工具 → 脚本」点 `+`，创建一个本地脚本：名称可填 `VerseLyrics 本地文件`，类型选 `generic`，文件位置选 **Local/本地**，文件名填 **`spotify-lyrics.js`**。点「编辑文件」，将交付 JavaScript 的**完整内容**粘贴保存。这个 generic 条目仅用于保存文件和手动查看状态，不会处理网络流量。
3. 在「工具 → 模块」中新建本地模块，将 `SpotifyLyrics.local.yaml` 完整内容保存进去；如果 Egern 提供文件导入，也可直接导入 YAML。它是模块片段，不是完整代理配置。
4. 打开模块设置，将 **「开启歌词翻译」设为开启**，目标语言默认 **`zh-CN`（简体中文）**。需要繁体中文选 `zh-TW`，英语选 `en`，日语选 `ja`，韩语选 `ko`。
5. 由你在设备上确认 Egern 的 HTTPS 解密证书已安装并受信任，然后启用模块与 MITM。模块仅增加 `spclient.wg.spotify.com` 和 `*-spclient.spotify.com` 两类主机。
6. 重新加载配置，退出并重开 Spotify，播放有歌词的歌曲，再打开 Spotify 原生歌词页。

这里没有自动改动本机正在使用的节点、分流、系统代理、证书或 Spotify 安装包。需要支持当前官方文档所述原生脚本 API、模块 `env_schema`、响应 `arrayBuffer()` 与 `Headers` 的 Egern 版本。旧式 `$done` 脚本引擎不能直接运行本文件。

Egern 官方安装本地脚本的界面说明见[创建本地脚本](https://egernapp.com/docs/configuration/widgets/)，模块环境变量界面见[模块文档](https://egernapp.com/docs/configuration/modules/)。本机检测到 Egern 2.20.0 安装包，但启动未成功；上述导入流程尚未在该实例内逐项验收。

## 用户设置

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| 开启歌词翻译 `TRANSLATION_ENABLED` | `false` | 由用户自己开启；开启后原词文本将发送给 Google 翻译。 |
| 目标语言 `TARGET_LANGUAGE` | `zh-CN` | 25 个语言/地区选项。 |
| 无词备用源 `FALLBACK_PROVIDER` | `auto` | `auto`、`lrclib`、`qq`、`netease`、`off`。 |
| 尝试显示原本无歌词的歌曲 `DISCOVER_MISSING` | `false` | 可选；只在旧版歌曲信息接口明确标记无词、并且已找到严格匹配备用歌词后，才把该次响应改成“有歌词”。 |

语言包括简体中文、繁体中文、英语、日语、韩语、法语、德语、西班牙语、葡萄牙语、意大利语、俄语、阿拉伯语、印地语、印尼语、越南语、泰语、土耳其语、荷兰语、波兰语、瑞典语、乌克兰语、希伯来语、波斯语、马来语和希腊语。具体翻译质量与语言支持以服务实际响应为准。

Egern 的 `env_schema.default_value` 只是界面占位提示，脚本本身也实现了相同默认值。不开启翻译时不会把歌词发送到翻译服务；备用源 `auto` 仍可在明确无词时工作。要完全停止改写，直接停用整个模块。

## 原本没有歌词入口的歌曲

有些 Spotify 客户端在服务端标记无词时，根本不会请求 `color-lyrics`。此时仅改写歌词响应无法凭空创建入口。

可选的 `DISCOVER_MISSING` 针对 `/metadata/4/track/<32 位 hex>`：

1. 校验返回的歌曲 ID、歌名、专辑、歌手与时长。
2. 只在 `has_lyrics` 字段明确为 false 时寻找备用歌词。
3. **先找到并缓存歌词，再将该次元数据响应的 `has_lyrics` 改为 true**。未找到则保持 false。
4. 客户端随后请求歌词时，从缓存返回真实备用歌词。

此功能默认关闭，因为可能对预取的无词歌曲产生额外搜索；开启后也只适用于仍使用该接口和字段的客户端。新版客户端换用其他接口、没有请求经过 Egern、连接无法被 MITM、或者本地已经缓存结果时，插件可能无法介入。**它不会修改账号权益字段，也没有解锁会员功能。**

本版没有接入 YouTube Music 或 Apple Music 歌词。Egern 只能改变网络内容，无法添加 VerseDock 的状态栏、悬浮窗、系统翻译面板或灵动岛；点击歌词跳转继续取决于 Spotify 客户端自身已有的功能。脚本保留时间戳，不主动发送播放控制命令。

## 数据与缓存

- 翻译请求仅包含待翻译文本、自动识别源语言和目标语言；不附带 Spotify Authorization、Cookie 或 Client-Token。
- 无词补源的元数据查询只把当前请求中的 Bearer 和必要客户端头发回**同一个 Spotify 主机**，不保存令牌；拒绝跟随重定向。Cookie 不转发。
- 备用歌词搜索使用歌名、歌手和专辑；不发送 Spotify 凭据。
- 本地缓存只保存元数据、歌词、译文和限流时间：歌词/元数据 1 天，译文 7 天；最多 700 项并限制持久化大小。
- 遇到 429 或 503 时读取 `Retry-After`，在相应主机的冷却期内跳过请求。缓存保存时合并重叠调用的冷却时间。
- 失败时保留原文；单次处理共享约 20 秒网络预算，每个请求最长 5.5 秒。网络延迟可能让首次打开歌词变慢。
- 可在「VerseLyrics · 最近处理状态」generic 脚本中查看最近一次处理结果；状态不包含账号令牌或完整歌词。

## 已完成的验证

2026-10-15 本机实际执行：

- **56 项离线测试全部通过**，含 180 组损坏二进制样本、独立编码的 Protobuf 对照数据、JSON/二进制字段保留、翻译缓存、按句对应、超时、限流、错误状态、严格匹配与无词入口处理。
- Ruby 标准库 YAML 解析与模块校验通过：远程模块的脚本 URL 与仓库路径一致，离线模块能解析到交付脚本，默认值和 25 个语言选项一致，脚本超时、大小限制及 URL 范围检查通过。
- 真实 Google 请求及脚本处理链通过：简体中文、日语、阿拉伯语、法语，各 2 句自写测试文字；另外单句批量响应格式验证通过。
- 真实 QQ 音乐和网易云搜索/歌词请求成功，分别返回 63 行、43 行同步歌词。这里使用各服务自己的歌曲元数据验证适配器，**不能代替 Spotify 跨库匹配或设备端验收**。
- LRCLIB 的真实搜索初次有响应，随后适配器查询触发 HTTP 429；本轮不计作完整实时取词通过。离线测试已验证自动方案遇到它限流时继续走 QQ 音乐，并保留冷却时间。

原始证据：[`local-tests.txt`](./Evidence/local-tests.txt)、[`module-validation.json`](./Evidence/module-validation.json)、[`live-services.json`](./Evidence/live-services.json)。Protobuf 样本是独立构造的协议样本，未使用你的账号抓包。

**未完成：Egern 实际导入、脚本在 Egern 引擎中的执行、Spotify iPhone/iPad 歌词页双语排版、点击跳转、真实无词入口补全，以及当前客户端对新行/新接口的支持。** 本机的 Egern 没有成功启动，且没有访问你的手机；这些不能用本地测试和上游请求成功代替。

## 安装后的最小验收

1. 先选一首 Spotify 本来有歌词的英文歌，目标语言设为简体中文，确认 `color-lyrics` 请求被匹配、原词仍在、译文位于对应句下方。
2. 关闭翻译后切歌再进入歌词页，确认恢复原词；改变目标语言后确认使用新目标语言。
3. 测试 Spotify 本身无词但备用源确有同版歌词的歌曲，确认来源真实显示；不匹配时保持无词，不应换成其他歌手或版本。
4. 如果没有歌词入口，再考虑开启可选无词发现，检查客户端是否请求适配的 `/metadata/4/track/`。

如果显示没变，先看模块是否启用、同名本地脚本是否保存、证书是否受信任、请求是否经过 Egern，以及最近处理状态。Spotify 缓存可能需要切歌或重开应用才会更新。不要同时启用多个改写同一歌词接口的模块。分享诊断信息时只需接口路径、HTTP 状态和去掉令牌的结构，不需要账号 Cookie 或完整流量。

## 开发者复验

无 npm 依赖，无需安装第三方脚本运行库：

```sh
cd Egern/script/SpotifyLyrics
node --test test/spotify-lyrics.test.mjs
ruby test/validate-module.rb
# 可选；会联网查询真实公共服务，有可能遭限流：
node test/live-smoke.mjs
```

联网脚本把 Egern `ctx.http` 适配到系统 curl，并使用自写翻译句、模拟 Spotify 响应和公开歌曲搜索。它没有连接你的 Spotify 会话；真实服务失败会记录失败并返回非零状态，不会用模拟结果填充成功记录。

## 格式与协议依据

本插件脚本、缓存、匹配逻辑、LRC 解析与二进制字段改写均独立编写。没有复制 DualSubs 等现成插件的实现，也没有引入第三方 Protobuf 运行库。参考的是公开接口说明与字段编号：

- [Egern 原生 JavaScript API](https://egernapp.com/docs/javascript-api/)、[脚本配置](https://egernapp.com/docs/configuration/scriptings/)、[模块和设置 UI](https://egernapp.com/docs/configuration/modules/)。
- [Protocol Buffers 官方 wire encoding](https://protobuf.dev/programming-guides/encoding/)。
- [公开提取的 Spotify ColorLyrics 字段](https://github.com/mIwr/SwiftySpot/blob/master/Proto/Lyrics.proto)与[行/音节字段](https://github.com/mIwr/SwiftySpot/blob/master/Proto/public/LyricsModel.proto)。这里只按协议编号实现互通，没有复制生成代码。
- [公开提取的 Spotify metadata 字段](https://github.com/librespot-org/librespot/blob/dev/protocol/proto/metadata.proto)，用于 ID、歌名、专辑、歌手、ZigZag 时长和 `has_lyrics` 的协议核对。
- [LRCLIB 官方 API 文档](https://lrclib.net/docs)。QQ 音乐和网易云为非公开客户端接口，本次以实际响应核验；后续可能调整。
- Google `translate.googleapis.com/translate_a/t`：本次直接用自写句子核验，属于网页接口，不冒充 Google Cloud Translation 官方付费 API。
