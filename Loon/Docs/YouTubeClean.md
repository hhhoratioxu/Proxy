# YouTube Clean 1.2.9 · Loon

一个插件包含去广告、字幕翻译（默认仅译文，可选双语）及发布「＋」/Shorts 独立开关，默认开启深层过滤。此后统一使用下面这一个安装入口更新。

[安装 YouTubeClean.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/YouTubeClean.plugin)

## 1.2.9 译文排版

默认开启「译文智能换行」（`CAPTION_LAYOUT=true`）：短句单行，长句优先在句号、逗号或词边界均衡换成两行；最多插入一个换行，全部文字与开始/结束时间保留。中文标点周围多余空格会整理，不简繁转换。英文词、数字、URL 和 emoji 不在内部拆分。

YouTube 与 Google 备用译文使用同一规则；双语模式只处理译文，原文保持。仅译文模式手动选中的目标译文可在本地排版，不增加请求；JSON3 滚动追加组保留原样以保护事件时间。原生中文作者字幕保留。关闭此开关可恢复原译文排版，安装入口仍只有一个。

每行软目标约 18 个汉字宽度；特别长的句子仍保留全部内容，播放器可能继续自动折行。字体、字号、背景和屏幕位置由 YouTube 原生 CC 控制，视频画面内嵌的韩文等文字无法通过字幕正文去除。最终行数也取决于屏幕和字号。

新增 44 项检查，累计 **259 项自动检查通过**，覆盖四种字幕格式及五客户端实际构建脚本中的 YouTube/Google 两条路径。两种短句字幕场景共 12 次独立桌面进程检查，输出字节、请求数与单次完成一致；排版存在少量开销，2500 句字幕峰值 RSS 中位数 69.20 → 70.05 MiB、耗时 53.68 → 58.67 ms，备用翻译 60.17 → 60.78 MiB、14.64 → 15.01 ms。该结果包含 Node/V8 和接口模拟，不是手机内存；本版最终手机视觉效果尚待确认。见[本版源码及检查记录](https://github.com/hhhoratioxu/Proxy/tree/06b0b47bb86f0e326d83a1fc04f5606f53ec8710/Surge/script/YouTubeClean)。

## 1.2.8 内存与分配优化

JSON 仅在实际变化时序列化一次；UTF-8 直接写入精确长度的字节数组，并复用最多 8 KiB 的同步解码临时缓冲；深层卡片文字判断不再解码完整字串。XML 字幕一次前向拼接，HMAC 分段更新密文与 IV。没有新增请求、并发或持久缓存，原有大小、时间、退避、广告规则和字幕行为保持。

**215 项本地检查通过**。9 个自写场景以旧/新脚本交错执行，每场景每版 3 个独立桌面进程，共 54 次，输出字节全部对应一致。macOS ARM64 / Node v24.19.0 峰值 RSS 中位数：JSON 主页 190.09 → 88.30 MiB（-53.6%），gzip JSON 主页 203.08 → 86.38 MiB（-57.5%），2500 句仅译文字幕 109.16 → 68.89 MiB（-36.9%），加密 protobuf 播放数据 84.89 → 79.77 MiB（-6.0%）。原生 protobuf 主页 93.98 → 94.17 MiB（+0.2%），没有测得内存改善，但耗时约少三分之一；超限放行耗时约增加 0.2 ms。

这些数值包含 Node/V8、接口模拟和输入缓冲，**不是 Loon/iPhone 或插件独占内存**。宿主可能已读取整份正文，脚本限制不能保证宿主峰值；手机上的 1.2.8 内存和 VPN 连续播放仍待确认。完整方法、全部场景和逐次原始记录见[固定源码中的测量](https://github.com/hhhoratioxu/Proxy/blob/5fd57ddda63380d5c9c608ae2f26b6becb97dc12/Surge/script/YouTubeClean/bench/memory-1.2.8.json)。


## 仅显示译文

Loon 当前入口默认 `BILINGUAL=false`：成功取得译文后只显示目标语言，不附加原文。已经安装的插件请进入参数设置，关闭「原文与译文双语」，保持「字幕翻译」及「Google 备用翻译」开启，保存后重开视频并选择原语言 CC。Loon 会保留已有用户参数；更新远程文件不一定覆盖之前保存的开关。想恢复双语时重新开启该开关。

2026-10-19 用户已确认 1.2.7 在 Loon 3.5.3(1008) 上显示原文＋中文。1.2.8 保持 Loon 默认仅译文，并使用本次优化后的运行脚本；安装入口仍为一个。现有仅译文检查通过：输出包含译文、排除已翻译句的原文并保留时间。翻译失败或某句没有可用译文时仍保留原字幕，避免播放出现空字幕；仅译文设置的实际手机显示仍待确认。

## 1.2.7 备用翻译回复修正

实际 Loon 1.2.6 日志确认：韩文原字幕 HTTP 200，YouTube 译文 HTTP 429，Google 备用 HTTP 200，但旧版统一报 `invalid-batch`，因此只显示原文。没有取得这次备用回复正文，具体失败分支尚未确认。

1.2.7 明确请求 identity 编码，保留原始 gzip 和宿主已解压回复的支持；兼容 JSON 开头的 BOM 与明确保护前缀。数组数量严格对应时，空字符串/null 保留本句原文，其他译文继续显示，避免一个空项使整批丢弃。数量或未知结构不符时保留完整原响应，不猜测错位拼接。

在 YouTube **打开 CC 并选择视频原语言字幕**。YouTube 译文可用时使用原服务；被限流、超时或不可用时，最多一次 Google 批量 POST。成功后默认按原格式和时间轴仅显示译文；开启双语后显示“原文在上、译文在下”。目标语言使用已保存设置，包括繁体中文。

`FALLBACK_TRANSLATION` 可关闭备用服务。开启时只向 `translate.googleapis.com` 发送字幕文字和语言，**不发送视频 ID、字幕签名链接、Cookie、Authorization、POT 或播放密钥，不持久缓存字幕/译文**。无需付费密钥；公开网页接口可能变化或限流。

每次原字幕响应最多一次 YouTube GET 和一次 Google POST，总网络预算 6.5 秒、单次最多 4 秒，无并行或自动重试。两个服务分别使用 30–300 秒退避，只保存到期状态。单批最多 2048 条独立文字，总文字 UTF-8 48000 字节、单条 4000 字符、表单 192000 字节；回复和合成结果限 1 MiB。数量不符、未知格式、超限、超时或服务失败时保留可用原文；明确空项仅保留该句。

更新后确认 **脚本日志** 中 `version` 为 `1.2.9`。此前安装的是固定 1.2.6 地址时，单纯刷新无法升级，必须替换远程地址；只启用一个当前插件。保存后重启 YouTube，打开原语言 CC。

## 保留的主页广告处理

1.2.4 修复用户最新日志中的 `full_width_square_image_layout` 图片广告漏识别，并一并补齐图片、轮播、品牌及视频展示广告的 11 个完整布局标识。1.2.3 虽已解析卡片，但仅补齐两个视频广告布局，仍遗漏本次方形图片广告。普通视频 `video_lockup_with_attachment`、分隔项 `cell_divider` 和未知数据保留；社区帖子及普通购物列表不会仅凭名称被本次规则删除。广告布局用途与 [固定公开源码](https://github.com/PoomSmart/YouTube-X/blob/48b901532f9e12152684f3326d4250efcdea61e5/Tweak.x) 交叉核对，未引入其运行代码，MIT 许可保存在固定源码版本并嵌入运行脚本。

`matchedAdTemplates` 表示识别出的广告模板；结合 `reason=modified` 和 `removedParts` 可以确认这次响应产生了修改。主页卡片过滤不依赖播放密钥，`keyState=missing` 不会阻止本次图片广告处理。继续使用同一个安装入口，在客户端更新后确认名称为 1.2.9，再重启 YouTube、刷新主页。

## 安装和使用

需要 Loon 3.5.1(983) 或更新版本。在「插件」中添加下方远程地址，在插件设置调整开关。

停用之前安装的分版及其他处理相同请求的 YouTube 插件，仅启用 YouTube Clean。原有分版订阅需要移除，GitHub 删除文件不会自动停用手机上的旧配置。确认已安装并信任你自己的 HTTPS 解密证书，并开启客户端解密。保存后强制退出 YouTube，再重新打开并下拉刷新主页。

| 设置 | 默认 | 用途 |
| --- | --- | --- |
| `REMOVE_ADS` | `true` | 广告处理 |
| `TRANSLATE_CAPTIONS` | `true` | 已有字幕翻译 |
| `FALLBACK_TRANSLATION` | `true` | YouTube 译文失败时把字幕文字发送至 Google 备用翻译，可关闭 |
| `TARGET_LANGUAGE` | `zh-Hans` | 简体中文，可选繁体等 |
| `BILINGUAL` | `false` | 默认仅显示译文；开启后原文在上、译文在下 |
| `CAPTION_LAYOUT` | `true` | 译文按标点均衡换行，不修改字体或位置 |
| `AUTO_CAPTIONS` | `true` | 为缺少合法默认字幕的音轨选择已有可翻译轨道，仍需打开 CC |
| `HIDE_UPLOAD` | `true` | 隐藏底部发布「＋」 |
| `HIDE_SHORTS` | `false` | 隐藏底部 Shorts，普通 Shorts 视频保留 |
| `DEEP_FILTER` | `true` | 检查单张卡片内部的广告封装、徽标及推广/试用模板 |
| `DIAGNOSTICS` | `true` | 输出处理结果，可关闭 |

用户以前保存的开关可能优先于新的默认值，更新时可检查「深层广告与推广过滤」是否开启。

## 处理范围

保留原始 gzip、明文 Onesie 与经过认证的加密播放元数据处理。主页沿已确认的首页/分页路径识别传统广告字段和元素模板；深层模式只检查单张卡片，不扫描整个账号或全局模板资源。命名规则属于启发式识别，仍可能漏掉不同的服务端广告实验，也会隐藏推广与试用卡片。创作者口播推广不在自动处理范围内。

翻译依赖视频已有字幕及 YouTube 翻译或已开启的 Google 备用服务，原轨道保留；没有字幕时无法生成语音识别字幕。YouTube 附加下载与备用 POST 各最多一次，总预算 6.5 秒，单次最多 4 秒，不转发账号凭证、不跟随重定向，无需购买翻译 API。

二进制处理上限 8 MiB、字幕 1 MiB。未修改时保留原响应；未知格式、错误数据、认证失败或不支持的压缩直接放行，缺少密钥时保留加密元数据。普通 videoplayback 不运行响应脚本。客户端可能已读取完整正文，脚本内的长度限制不代表宿主进程峰值内存保证。

## 仍显示广告时

开启「输出结构诊断日志」，刷新主页后复制以 `[YouTubeClean]` 开头的行。主页广告优先看 `endpoint` 为 `browse` 的记录；`initplayback` 是播放封装接口，执行完成本身不能证明主页卡片已被清理。

字幕优先看 `endpoint=timedtext`。`captionLayout=balanced` 表示开启智能换行，`off` 表示关闭；`reason=caption-layout` 表示只对已有译文做本地排版。`reason=caption-fallback-translated`、`captionProvider=google` 和 `captionFallbackStatus=200` 表示备用译文已经实际合成；`captionFallbackReason` 记录备用服务失败或跳过原因。1.2.7 同时记录请求/回复条数、回复字节数和固定结构/编码类别；失败原因区分 HTML、JSON、UTF-8、压缩、数量不符和非法条目，不再统一报 invalid-batch。`captionFallbackTranslatedItems` 是合成的独立译文数，`captionFallbackEmptyItems` 是保持原位置的空项数。`caption-rate-limited` 表示译文 HTTP 429，`caption-cooldown` 表示暂停 YouTube 额外译文请求，`caption-fallback-original` 表示已取得并恢复原字幕；`captionDownloadStatus` 与原响应 `status` 分别记录，`captionRetryAfterSeconds` 是插件本地等待时间。`reason=modified` 表示修改了响应，`unchanged` 表示未产生改动，`key-missing`/`key-expired` 表示缺少有效播放密钥，`decode-failed` 表示解析失败。诊断只输出固定接口名称、处理原因、布尔开关、大小、密钥状态和有限结构标识，不含 Cookie、Authorization、账号、视频标题、完整 URL、字幕签名或密钥内容。没有弹窗、定时任务或外部上报。

## Loon 官方依据

核对日期：2026-10-20。依据 [官方插件](https://nsloon.app/docs/Plugin/)、[Script](https://nsloon.app/docs/Script/script_v2/) 与 [Script API](https://nsloon.app/docs/Script/script_api/)。使用原生对象参数与二进制正文，最低版本仍为 3.5.1(983)。字幕网络请求超时按 API 单位采用 4000 毫秒；完成回调只调用一次，不依赖 clearTimeout。参见 [仓库适配记录](./OfficialReference.md)。

## 验证与源码

2026-10-20：**259 项本地检查通过**，覆盖实际字幕错误的语言/格式/HTTP 状态组合、原轨道保留、限流退避、客户端状态与 MIME 回退、一次完成回调，以及原有主页、播放封装、底栏和日志隐私。此前公开主页样本加入自写广告的混合测试可以保留其余真实响应字节，原始匿名样本没有实际投放的主页广告。

已复现 1.2.3 的图片布局漏识别：新增 10 项回归检查中 8 项修复前失败、修复后通过。11 张卡片的首页和分页测试删除目标图片广告、精确保留其余 10 张及其他原始字段，缺少播放密钥时同样有效。数据按观察到的布局独立构造，尚未获得用户原始响应或修复后的手机结果。1.2.6 新增 18 项检查。真实 Google 请求已对自写韩文取得繁体译文，并对 32 条带不同数字标记的自写文本核验顺序；实际构建的 Loon 适配器已通过模拟 YouTube 429 加真实备用 HTTP 200 的双语/时间保持验证。该验证使用自写数据和桌面接口模拟；用户随后确认 1.2.7 的手机双语显示正常。1.2.7 新增 19 项回复兼容与诊断检查，构建后的 Loon 脚本通过 180 条自写韩文的真实 Google 请求，逐条核对原文、繁体译文位置标记和时间。该批量验证不能确认用户 1.2.6 失败的具体分支。实际广告去除、仅译文显示、Shorts 隐藏与连续播放仍需真机确认，本地检查不等同于 iPhone VPN 稳定性验收。

[源码、测试与许可](https://github.com/hhhoratioxu/Proxy/tree/06b0b47bb86f0e326d83a1fc04f5606f53ec8710/Surge/script/YouTubeClean) · [客户端说明](../README.md) · [所有客户端入口](../../README.md)
