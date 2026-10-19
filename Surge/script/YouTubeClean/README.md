# Horatio YouTube Clean 1.2.9

独立编写的 YouTube 去广告、双语字幕与底栏控制脚本。每个支持客户端只提供一个当前安装入口，统一默认开启深层广告过滤，不再提供测试方案选择。

| 客户端 | 安装文件 |
| --- | --- |
| Egern | `Egern/script/YouTubeClean.yaml` |
| Loon | `Loon/script/YouTubeClean.plugin` |
| Surge | `Surge/script/YouTubeClean.sgmodule` |
| Shadowrocket | `Shadowrocket/script/YouTubeClean.sgmodule` |
| Quantumult X | `QuantumultX/script/YouTubeClean.conf` |

1.2.9 新增默认开启的 `CAPTION_LAYOUT`（译文智能换行），继续保留 1.2.8 的分配优化。Loon 默认仅显示译文，其他客户端已有默认与用户保存设置继续生效。

## 1.2.9 译文排版

短译文保持一行，长译文按句号、逗号和词边界选择一个均衡断点，最多插入一次换行。中文标点周围多余空格会整理，不改简繁、不删字、不摘要，也不改变字幕开始/结束时间。单行软目标为 36 个视觉单位（汉字约占两个），不是播放器硬字符上限；特别长的句子、单个不可拆分的长词仍完整保留，YouTube 可能继续自动折行。

YouTube 译文与 Google 备用译文使用同一规则；只排译文，双语模式的原文保持。仅译文模式手动选中的目标翻译轨道可在本地排版，不附加联网；JSON3 滚动追加组保留原样，避免仅为排版合并事件。中文原生作者字幕仍保留原排版。`CAPTION_LAYOUT=false` 可关闭；Loon 是原生 boolean switch，其他客户端使用各自已有参数机制。

字体、字号、背景、屏幕位置由 YouTube 原生 CC 控制；视频画面内嵌文字不属于可改写字幕。没有添加或假设未公开的样式参数。界面最终行宽也取决于屏幕方向和播放器字号。

独立实现的格式化器在已有 1 MiB 字幕边界内做两次前向扫描，不构建候选/分词数组或字幕缓存，不增加请求数、并发或计时器。新增 44 项排版与构建产物检查，累计 **259 项自动检查通过**；覆盖四种字幕格式、标点、英文词/数字/URL、emoji/扩展汉字、仅译文/双语、关闭开关、JSON3 追加组，以及五客户端实际构建脚本的两种翻译来源。手机上的最终视觉效果和原生内存尚待实机确认。

另以 1.2.8/1.2.9 对两个已有短句字幕场景做 12 次交错独立进程检查，输出字节、网络次数和单次完成全部一致。2500 句字幕桌面峰值 RSS 中位数 69.20 → 70.05 MiB，处理 53.68 → 58.67 ms；180 句备用翻译 60.17 → 60.78 MiB，14.64 → 15.01 ms。排版有少量处理开销，不宣称这次继续降低内存；原始记录见 [layout-1.2.9.json](./bench/layout-1.2.9.json)。这些是 Node/V8 整进程测量，不能推断手机数值。

复现此开销检查：用 `node bench/prepare.mjs /tmp/youtube-layout-fixtures` 生成自写输入，下载 `5fd57ddda63380d5c9c608ae2f26b6becb97dc12/Loon/script/YouTubeClean.js` 作基线，对 `caption-translation-only` 与 `caption-fallback` 分别以两版交错执行 `node --expose-gc bench/worker.mjs <bundle> /tmp/youtube-layout-fixtures <case>` 各三次，比较正文 SHA-256、requests、completions 与 peakRss 中位数。


## 1.2.8 分配与内存优化

保留去广告、字幕、播放加密封装和底栏控制。UTF-8 编码先计算长度后一次分配，不再创建按字节增长的普通数字数组；仅检查编码后大小时直接计算字节数。UTF-8 解码在同次同步脚本中复用最多 4096 个 UTF-16 单元（8192 字节），返回值为已复制字符串，临时视图不暴露给调用方或跨 await 保留。长串非法 UTF-8 也经过分块输出，修正旧实现非法首字节连续跳过分块检查的问题。

JSON 编辑器显式记录实际语义变化，未修改时保留原始正文，不再为了比较而序列化整份文档；修改时只序列化一次。已处理及加密播放元数据中的 JSON 使用同一策略。深层卡片的二进制/文字判断扫描字节，不再构造完整标题或签名字串；组件字段复用解析结果。原始未知字节、64 位整数、广告模板与扫描边界继续保留。

XML 字幕按原文位置前向拼接一次，避免每句反复复制完整正文；字幕顺序、时间、未知属性、转义及未修改片段保持。HMAC 分别更新密文与 IV，不再拼出一份完整密文副本。没有增加网络请求、并发、正文/字幕上限、退避记录或持久缓存。Loon 入口保持用户要求的 `BILINGUAL=false`，其他客户端的已有默认设置保持。

新增 19 项字符边界、长非法 UTF-8、JSON 变化、XML 源顺序和大正文认证检查；共 **215 项本地检查通过**。

### 可复现的桌面测量

2026-10-19，macOS ARM64 / Node.js v24.19.0。基线是已发布的 1.2.7（`8cfd57baf23480d1f8ee84e4fea129741bd50dc6`）回调脚本，候选是实际 1.2.8 构建脚本。9 个自写场景，分别以旧/新版本交错执行，每项每版 3 个新进程，共 54 次；每个进程包含脚本初始化及一次请求。夹具在独立进程生成，测量前 GC；完成时读取操作系统峰值 RSS，中位数列于下表。哈希及断言在读取峰值后执行，未包含在处理耗时内。`process.resourceUsage().maxRSS` 按 [Node 官方文档](https://nodejs.org/docs/latest-v24.x/api/process.html#processresourceusage) 的 KiB 转换为 MiB。

**这些是桌面进程峰值，包含 Node/V8、模拟接口和输入缓冲；不是插件独占堆、Loon 或 iPhone 的内存。** 所有 54 次输出正文哈希与基线对应相同，并核对预期修改/放行状态、完成一次及网络请求数。仅译文样本为 2500 句，gzip 主页解压后约 1.39 MiB。

| 自写场景 | 1.2.7 峰值 RSS / MiB | 1.2.8 峰值 RSS / MiB | 变化 | 耗时 / ms |
| --- | ---: | ---: | ---: | ---: |
| 未修改 JSON 主页 | 88.42 | 78.80 | -10.9% | 62.45 → 50.18 |
| JSON 主页去广告 | 190.09 | 88.30 | -53.6% | 143.42 → 61.66 |
| gzip JSON 主页去广告 | 203.08 | 86.38 | -57.5% | 170.65 → 90.25 |
| 原生 protobuf 主页去广告 | 93.98 | 94.17 | +0.2% | 45.87 → 30.31 |
| 2500 句字幕，仅译文 | 109.16 | 68.89 | -36.9% | 160.35 → 51.09 |
| 180 句字幕，备用翻译 | 63.16 | 60.61 | -4.0% | 16.64 → 14.46 |
| 加密 UMP / JSON 播放元数据 | 204.11 | 88.52 | -56.6% | 194.96 → 105.14 |
| 加密 UMP / protobuf 播放元数据 | 84.89 | 79.77 | -6.0% | 69.18 → 68.70 |
| 超出 8 MiB 直接保留 | 67.06 | 66.86 | -0.3% | 9.10 → 9.30 |

原生 protobuf 主页峰值增加 0.2%，没有测得内存改善；其处理时间下降约三分之一。超限放行耗时增加约 0.2 ms。小幅差异可能受进程、JIT 和 GC 波动影响；不概括成所有路径都下降。宿主可能已读入整份正文，脚本检查不能限制宿主缓冲峰值，也不提供请求取消或稳定性保证。用户已确认 1.2.7 的 Loon 原文＋中文显示；1.2.8 的手机内存、仅译文显示和 VPN 连续播放仍待实机确认。

[完整测量数据与逐次记录](./bench/memory-1.2.8.json)。以下为 1.2.8 的历史测量，复现时固定检出该版本，不能把新排版正文与旧版要求为逐字节相同。复现方式：

```sh
git clone --single-branch --branch runtime/youtube-clean-1.2.8 https://github.com/hhhoratioxu/Proxy.git /tmp/proxy-youtube-memory-1.2.8
cd /tmp/proxy-youtube-memory-1.2.8/Surge/script/YouTubeClean
# Verify git rev-parse HEAD = 5fd57ddda63380d5c9c608ae2f26b6becb97dc12
curl -fL https://raw.githubusercontent.com/hhhoratioxu/Proxy/8cfd57baf23480d1f8ee84e4fea129741bd50dc6/Loon/script/YouTubeClean.js -o /tmp/youtube-clean-1.2.7.js
node bench/run-memory.mjs /tmp/youtube-clean-1.2.7.js dist/clients.js /tmp/youtube-clean-memory 3
```

## 1.2.7 备用回复兼容与定位

实际 Loon 1.2.6 日志确认：原韩文字幕可用，YouTube 译文 HTTP 429，Google 备用 HTTP 200，但旧解析器只报 `invalid-batch`，没有生成译文。未取得这次备用回复正文，不能把具体原因断定为压缩、保护前缀或空项。

本版明确请求 `Accept-Encoding: identity`，降低宿主交付未解压 br/deflate 的差异；继续支持通过长度和 CRC 检查的原始 gzip，以及宿主已解压但保留压缩响应头的 JSON。严格 UTF-8 解码后，兼容开头的 BOM 和明确的 `)]}'` 换行保护前缀；不从 HTML 中搜索或截取数组。

回复数组长度仍必须与去重后的提交条数完全一致。空字符串和明确的 null 只保留该位置原字幕，其他有效译文继续合成，不删除数组项、不移动邻近字幕。未知对象、非法条目或数量不符时保留完整原响应，不猜测映射。无任何有效译文时保持原文。

新增的 `captionFallbackRequestItems`、`captionFallbackResponseItems`、`captionFallbackResponseBytes`、`captionFallbackShape`、`captionFallbackEncoding` 与 `captionFallbackContentType` 仅记录数量和固定结构类别。失败原因区分 `html-response`、`invalid-json`、`unexpected-shape`、`item-count`、`invalid-entry`、`invalid-utf8`、`unsupported-encoding`、`invalid-compression` 等；`captionFallbackTranslatedItems` 和 `captionFallbackEmptyItems` 分别记录成功及空项数。不记录字幕文字、原始回复、任意头值或完整 URL。

本版新增 19 项检查，累计 **196 项通过**。实际构建的 Loon 脚本使用 180 条带唯一位置标记的自写韩文 srv3，模拟 YouTube 429 后真实请求 Google，得到 180 条繁体译文；每条原文、译文位置标记和时间轴均核对通过，单次完成。另核对公开服务在 gzip 与 identity 请求下的真实返回。此处是桌面接口模拟加真实备用服务请求；该批成功不能确认 1.2.6 的失败分支；用户随后确认 1.2.7 在 Loon 上显示原文＋中文。1.2.8 手机性能和 iPhone VPN 稳定性仍待确认。

## 1.2.6 Google 备用翻译

实际 Loon 1.2.5 日志确认：韩文原字幕 HTTP 200、srv3 14962 字节，额外繁体中文译文下载 HTTP 429，原文回退正常但没有译文。继续重试同一 YouTube 地址不能解决此情况。

新增默认开启的 `FALLBACK_TRANSLATION` 开关。只有 YouTube 译文失败或处于其本地退避期时，才向 `translate.googleapis.com` 的公开网页翻译接口发送一次表单 POST；无需密钥，没有开通或调用付费账户。这个公开接口可能限流、变化或停用，没有可用性保证。关闭该开关可完全停止备用服务请求。

备用请求只包含规范化的原字幕文字、源语言和目标语言，不含视频 ID、字幕 URL/签名、POT、Cookie、Authorization 或播放密钥。不会持久保存字幕及译文。翻译后的数组必须与提交的独立文字数量精确一致，每个有效项必须是文字；1.2.7 对明确空项保留原位置，其他结构不匹配时保留原字幕。重复文字只提交一次，按原位置复用译文。原文、目标语言设置、字幕格式、每条时间及未知字段保持；`BILINGUAL=false` 时仅替换文字。

每次原字幕响应最多一次 YouTube 附加下载加一次 Google 批量请求；YouTube 已退避时直接尝试备用服务。字幕网络处理预算 6.5 秒，单次请求最多 4 秒，并受原生脚本 8 秒限制。无并行请求、后台重试或定时轮询。Google HTTP 429 使用独立的 30–300 秒退避，只保存一个到期时间；存储不提供跨执行事务保证。

备用单批限制：最多 2048 条独立文字，总文字 UTF-8 不超过 48000 字节，单条不超过 4000 个 JavaScript 字符，表单正文不超过 192000 字节；回复和合成结果不超过 1 MiB。超出范围、等待预算不足、接口失败或映射不一致时保留原字幕；不截断文本或拼接不完整译文。这些是实现边界，不是宿主内存保证。

诊断新增 `captionProvider=google`、`captionFallbackStatus`、`captionFallbackReason` 和 `captionFallbackItems`。`reason=caption-fallback-translated` 表示备用翻译已实际合成，`captionFallbackReason=cooldown/http-status/invalid-batch/input-limit/deadline` 等表示保留原文的原因。日志不含字幕正文和完整请求。

公开服务验证：两条自写韩文真实请求返回繁体中文；另用 32 条带不同数字标签的自写韩文核验返回顺序，全部对应。通过实际构建的 Loon 适配器，把模拟 YouTube 429 与真实 Google HTTP 200 串起来，验证韩文原文上方/繁体译文下方及原 srv3 时间保持。该验证使用自写字幕和桌面客户端接口模拟，不是用户视频或真实 iPhone VPN 验收。

新增 18 项本地检查；最先加入的 10 项中，4 项在 1.2.5 上失败、6 项保留行为已通过，修复后全部通过。该版共 177 项本地检查通过。

## 1.2.5 字幕请求修复

2026-10-19：实际 Loon 3.5.3(1008) 日志显示，韩文原字幕翻译为繁体中文、srv3 请求返回 HTTP 429，错误正文 1103 字节。旧版在状态检查时直接放行，没有进入字幕合成。这证明是字幕服务拒绝请求，不能据此判断视频无字幕或用户语言设置错误。未保存或发布用户视频标识、签名链接或账号信息。

旧策略克隆原轨道、添加 `tlang`、改为自有轨道标识并设为默认；也没有先检查原轨道是否允许翻译。现在所有原生字幕轨道的数量、URL、语言、标识和可翻译标记保持原样。`AUTO_CAPTIONS` 仅在音轨缺少合法默认字幕时，从该音轨已有的可翻译字幕中选择；不强制打开 CC，不跨音轨添加索引。

在 YouTube 打开 CC 并选择视频原语言字幕。插件只在收到可解析的原字幕后，使用该次真实请求的完整参数获取一次目标译文，保留签名、客户端查询和证明参数，只修改未受签名保护的 `tlang`；内部请求最多一次、限时 4 秒，无自动重试。使用用户保存的目标语言，包括繁体中文；1.2.5 不含备用服务；1.2.6 的默认备用及数据流见上文。

- 正常取得译文：按原字幕时间和原格式合成，原文在上、译文在下。关闭双语时只替换文字；即使译文使用另一种已支持格式，也保留原字幕格式和时间。
- 译文下载失败、超时、空正文、格式错误或合成后超出 1 MiB：保留完整原字幕。原字幕/译文均无有效时间轴时不生成假字幕。
- 译文 HTTP 429：根据 `Retry-After` 暂停额外翻译请求，默认 60 秒，限制在 30–300 秒；没有后台轮询。仅保存一个到期时间和原字幕是否也被限流的布尔状态，不缓存字幕、URL、签名或视频 ID。存储不可用时仍保留原字幕，但无法保证跨请求退避；同步读写不是事务，短时并发可能各自发出一次请求。
- 已缓存或手动选中的目标译文地址先返回 HTTP 错误时，Loon、Egern 与 Surge 兼容适配可尝试一次原字幕恢复。只有真实下载到合法字幕才返回 HTTP 200 和对应正文类型；原字幕也失败时保留原错误。Quantumult X 使用原字幕优先处理，不跨错误响应修改其托管 MIME 字段。
- 其他手动翻译语言、已是目标语言的字幕和未知字幕格式保留。请求只发给原 YouTube 字幕接口，只转发有限的 User-Agent/Accept-Language，不转发 Cookie 或 Authorization、不跟随重定向。

诊断新增 `captionRequest`、`captionSource`、`captionTarget`、`captionFormat`、`captionDownloadStatus`、`captionMode`、`captionRetryAfterSeconds` 和 `captionOutputStatus` 等有限状态。`caption-rate-limited` 表示译文被限流，`caption-cooldown` 表示暂时不请求译文，`caption-fallback-original` 表示已恢复原字幕。源响应状态与附加下载状态分别记录。

新增 32 项本地检查，其中最先加入的 15 项在 1.2.4 上全部失败，修复后全部通过。覆盖实际日志的语言/格式/状态组合、回退、退避到期、格式保持、原轨道保留、大小限制和真实构建产物的客户端接口。晚到的网络回调不会重复完成。数据全部独立构造，不能替代手机上的真实字幕结果。匿名公开播放器接口可返回字幕轨道，但本地字幕下载也收到 HTTP 429，已停止重复请求；没有获得当前环境中的真实翻译成功证明。

## 已定位的主页漏识别

2026-10-19：Loon 1.2.3 实际主页诊断显示，正文 191444 字节、解析 11 张卡片，未发生跳过或解析错误，但修改为零；模板为 `cell_divider`、`full_width_square_image_layout` 与 `video_lockup_with_attachment`。此前 1.2.2 日志还出现 `video_display_full_buttoned_layout`。这些展示广告布局没有 ad/promoted 关键词，旧策略遗漏了它们；1.2.3 仅补视频布局，仍未覆盖图片广告。主页处理不依赖播放会话密钥，本次日志中的 `keyState=missing` 不会阻止广告卡片处理。

1.2.4 使用 11 个完整模板标识覆盖已确认的图片、轮播、品牌及视频展示广告：

- 图片：`full_width_square_image_layout`、`full_width_portrait_image_layout`、`landscape_image_wide_button_layout`、`square_image_layout`、`text_image_button_layout`、`grid_ads_image_layout`。
- 轮播与品牌：`carousel_headered_layout`、`carousel_footered_layout`、`brand_video_shelf`。
- 视频：`video_display_full_buttoned_layout`、`video_display_full_layout`。

方形图片与带按钮视频布局分别来自用户两次实际日志；相关广告布局用途与 [PoomSmart/YouTube-X 固定版本](https://github.com/PoomSmart/YouTube-X/blob/48b901532f9e12152684f3326d4250efcdea61e5/Tweak.x) 交叉核对。只使用模板标识事实，没有引入上游 tweak 代码；MIT 声明见 `licenses/youtube-x-MIT.txt`，也嵌入构建产物。

匹配只发生在已解析的原生元素模板位置，不按视频标题或任意字节搜索。普通视频 `video_lockup_with_attachment`、分隔项 `cell_divider`、社区帖子和普通商品/购物列表不会仅凭名称被本次规则删除。`matchedAdTemplates` 最多输出 16 个规范化静态标识，用于确认哪些广告模板命中；应同时检查 `reason=modified` 和 `removedParts`。

新增 10 项独立 protobuf/JSON 回归检查，其中 8 项在旧 1.2.3 上失败、修复后全部通过。11 张卡片的首页和分页样本可删除方形图片广告，精确保留其余 10 张及根部其他字段，且不需要播放密钥。还覆盖混合分组、嵌套子元素、全局模板资源、关闭去广告和相似名称保留。实际生成的唯一 Loon 入口执行自包含脚本，同时移除自写图片与视频广告并只完成一次回调。测试数据不是用户的原始 191444 字节响应，也不是手机广告已消失的证明。未发布用户抓包、账号信息或完整 URL。

## 设置

| 设置 | 默认 | 含义 |
| --- | --- | --- |
| `REMOVE_ADS` | `true` | 开启广告处理 |
| `TRANSLATE_CAPTIONS` | `true` | 为已加载的原字幕获取译文 |
| `FALLBACK_TRANSLATION` | `true` | YouTube 译文失败时把字幕文字发送给 Google 备用翻译，可关闭 |
| `TARGET_LANGUAGE` | `zh-Hans` | 简体中文，可用 `zh-Hant`、`en`、`ja`、`ko` 等 |
| `BILINGUAL` | `true`，Loon 为 `false` | 开启时原文在上、译文在下；Loon 默认仅译文 |
| `CAPTION_LAYOUT` | `true` | 译文按标点均衡换行，可关闭；不修改字体和位置 |
| `AUTO_CAPTIONS` | `true` | 为缺少合法默认字幕的音轨选择已有可翻译轨道，仍需 App 打开 CC |
| `HIDE_UPLOAD` | `true` | 隐藏底部发布「＋」 |
| `HIDE_SHORTS` | `false` | 隐藏底部 Shorts；正常 Shorts 内容保留 |
| `DEEP_FILTER` | `true` | 深查卡片封装和广告徽标，也会隐藏推广与试用卡片 |
| `DIAGNOSTICS` | `true` | 每个命中的受支持请求/响应输出一行处理结果，可关闭 |

日志以 `[YouTubeClean]` 开头，仅含版本、方案、固定接口名称（如 `browse`/`initplayback`）、开关布尔值、状态码、数据格式/大小、改动结果与固定原因、密钥状态（缺少/过期/可用等状态，不含密钥本身）、删除部件数、主页卡片数，以及有限的模板标识和 protobuf/UMP 数字类型。**不记录 Cookie、Authorization、账号、视频标题、完整 URL、访客标识、字幕签名或播放密钥。** 没有通知弹窗、定时任务或后台轮询。

## 1.2.1 修复

- 1.2.0 仅给 `browse` 输出诊断，`initplayback` 缺少密钥会静默放行。现在受支持接口的空正文、大小限制、解析失败、密钥缺失/过期、认证失败、无目标元数据、正常未修改和已修改都会有明确结果；不再把脚本执行完成等同于修改成功。
- 客户端交付原始 gzip 时，先在大小限制内解压并验证长度与 CRC，再处理主页、配置或字幕。已解压但仍保留 gzip 响应头的正文根据真实字节识别。没有修改时保留原响应；损坏、多成员或超限压缩包直接放行。
- `CryptoParams` 缺省的明文 Onesie 播放器封装，确认成功状态与正文后即可处理，无需会话密钥；加密封装仍必须验签。未识别和媒体帧保留。
- 本地没有有效密钥时，启动阶段的 `browse`/`guide` 也请求刷新热配置；已有有效密钥时保留热配置哈希。仅认证失败使当前密钥失效，普通帧格式错误保留它。

上述问题通过独立构造的 gzip、协议封装和本地客户端接口测试复现。用户这条日志缺少响应正文，**不能据此断言实际广告由其中某一个问题导致**。

## 实现与识别边界

`wire.mjs` 自行编辑 protobuf 原始字段，未修改字段保持原始字节和 64 位整数精度。`edit.mjs` 沿确认的首页、分页、播放器与导航路径处理数据，`timeline.mjs` 合成 JSON3、srv3、旧 XML 与 WebVTT 字幕。UMP 元数据在本地验证 HMAC 后编辑并重新签名，普通媒体帧保留。

公开 iOS 返回确认的元素路径：`ElementRenderer(153515154) → newElement(172660663) → type(1) → componentType(168777401) → templateConfig(3) → uriTemplateConfig(172035250) → uri(1)`。`elements.mjs` 在这个结构中读取模板名称，匹配广告/推广命名。**命名规则是本实现的启发式策略，并不证明所有实际投放的广告都有这些名称。** 强模式另识别 MIT 协议声明中的原生广告徽标字段 138592202，对单张卡片内部限深、限节点检查；不把普通标题中出现广告字样当作广告，不深扫账号响应或全局模板资源。

元素子节点可单独移除，混合列表保留普通卡片，广告专用分组随内容删除。未知格式、认证失败与不支持的压缩保持原响应；缺少密钥时保留加密元数据。二进制上限 8 MiB，字幕及合成结果上限 1 MiB；附加字幕下载限时 4 秒，省略账号凭证并拒绝重定向。无字幕视频不能生成语音识别字幕，不依赖收费翻译密钥或外部 Worker。

## 构建与验证

需要 Node.js 20+ 和 pnpm：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
node package-native.mjs <40位运行脚本提交SHA> <输出目录>
```

为五个支持客户端各生成一个入口。运行脚本固定提交，用户无需编译。源码、测试和构建脚本位于独立运行版本分支，主分支只放可导入入口与说明。

2026-10-19：**215 项本地检查通过**，包含播放器、字幕、加密封装、底栏、字节保留、元素/卡片过滤、gzip、密钥状态和诊断隐私。实际生成的唯一 Loon 入口用默认参数执行自包含脚本，验证深层过滤和原生对象参数。字幕请求验证 4000 毫秒超时、HTTP 错误恢复、MIME 修正和一次完成回调，不依赖 clearTimeout。自动检查不等同于真实 iPhone VPN 验收。

官方核对日期：2026-10-19。依据 [Loon 插件](https://nsloon.app/docs/Plugin/)、[Script](https://nsloon.app/docs/Script/script_v2/) 和 [Script API](https://nsloon.app/docs/Script/script_api/)，最低版本仍为 3.5.1(983)。只使用文档支持的参数、二进制表示和 with 字段。

先前对 763,872 字节的公开初始主页与 763,991 字节的继续加载响应加入自写传统广告、原生元素广告和新封装广告，处理后可逐字节恢复其余真实响应。匿名返回没有实际投放的主页广告，属于真实信封与自写广告的混合验证，**不能当作用户主页广告已消失的证明**。可运行 `node test/probe-home.mjs <初始主页文件> <继续加载文件>` 重做；抓取、访客信息和签名链接不随源码发布。

历史播放器样本曾验证字幕字段处理；1.2.5 继续保留原生轨道数量和 URL。当前公开字幕下载返回 HTTP 429。当前版本的真实广告去除、字幕显示、Shorts 隐藏、拖动和连续播放均待真机确认，不能承诺所有服务端广告实验均可清除。创作者口播推广不在自动处理范围内。

## 来源与许可

核心编辑器、策略、字幕处理、UMP 编辑器与客户端适配自行编写，MIT 发布。字段图来自 [davidzeng0/innertube 的 MIT 协议声明](https://github.com/davidzeng0/innertube/tree/b04d48d000a84befa5d7b018553b04fa4f98ebd8)；元素 URI 路径在公开数据中确认。UMP 依据 [LuanRT/GoogleVideo 的公开协议示例](https://github.com/LuanRT/GoogleVideo/tree/96d1418984d00ac2797a1dafe4625d1368b5b9aa/examples/onesie-request)，没有打包其运行时。

通用库为 `@noble/ciphers` 1.3.0、`@noble/hashes` 1.8.0 与 `fflate` 0.8.2（MIT）。全部许可嵌入脚本，见 `NOTICE`、`LICENSE` 与 `licenses/`。没有加载之前的 YouTube 去广告或字幕插件。
