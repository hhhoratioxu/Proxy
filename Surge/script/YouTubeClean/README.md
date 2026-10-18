# Horatio YouTube Clean 1.2.4

独立编写的 YouTube 去广告、双语字幕与底栏控制脚本。每个支持客户端只提供一个当前安装入口，统一默认开启深层广告过滤，不再提供测试方案选择。

| 客户端 | 安装文件 |
| --- | --- |
| Egern | `Egern/script/YouTubeClean.yaml` |
| Loon | `Loon/script/YouTubeClean.plugin` |
| Surge | `Surge/script/YouTubeClean.sgmodule` |
| Shadowrocket | `Shadowrocket/script/YouTubeClean.sgmodule` |
| Quantumult X | `QuantumultX/script/YouTubeClean.conf` |

1.2.4 修复实际主页日志暴露的图片广告漏识别，并补齐相关展示广告布局，继续保持每个客户端一个入口。Loon 字幕请求超时为 4000 毫秒；其他客户端使用各自适配。修复后的实际广告结果及 VPN 稳定性仍需设备验证。

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
| `TRANSLATE_CAPTIONS` | `true` | 为已有字幕添加翻译轨道 |
| `TARGET_LANGUAGE` | `zh-Hans` | 简体中文，可用 `zh-Hant`、`en`、`ja`、`ko` 等 |
| `BILINGUAL` | `true` | 原文在上、译文在下 |
| `AUTO_CAPTIONS` | `true` | 优先新增字幕轨道，仍受 App 控制 |
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

元素子节点可单独移除，混合列表保留普通卡片，广告专用分组随内容删除。未知格式、认证失败与不支持的压缩保持原响应；缺少密钥时保留加密元数据。二进制上限 8 MiB，字幕上限 1 MiB；原字幕下载限时 4 秒，省略账号凭证并拒绝重定向。无字幕视频不能生成语音识别字幕，不依赖收费翻译密钥或外部 Worker。

## 构建与验证

需要 Node.js 20+ 和 pnpm：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
node package-native.mjs <40位运行脚本提交SHA> <输出目录>
```

为五个支持客户端各生成一个入口。运行脚本固定提交，用户无需编译。源码、测试和构建脚本位于独立运行版本分支，主分支只放可导入入口与说明。

2026-10-19：**127 项本地检查通过**，包含播放器、字幕、加密封装、底栏、字节保留、元素/卡片过滤、gzip、密钥状态和诊断隐私。实际生成的唯一 Loon 入口用默认参数执行自包含脚本，验证深层过滤和原生对象参数。字幕请求验证 4000 毫秒超时和一次完成回调，不依赖 clearTimeout。自动检查不等同于真实 iPhone VPN 验收。

官方核对日期：2026-10-19。依据 [Loon 插件](https://nsloon.app/docs/Plugin/)、[Script](https://nsloon.app/docs/Script/script_v2/) 和 [Script API](https://nsloon.app/docs/Script/script_api/)，最低版本仍为 3.5.1(983)。只使用文档支持的参数、二进制表示和 with 字段。

先前对 763,872 字节的公开初始主页与 763,991 字节的继续加载响应加入自写传统广告、原生元素广告和新封装广告，处理后可逐字节恢复其余真实响应。匿名返回没有实际投放的主页广告，属于真实信封与自写广告的混合验证，**不能当作用户主页广告已消失的证明**。可运行 `node test/probe-home.mjs <初始主页文件> <继续加载文件>` 重做；抓取、访客信息和签名链接不随源码发布。

旧播放器样本保留 52 条字幕并新增一条轨道；公开字幕下载返回 HTTP 429。当前版本的真实广告去除、字幕显示、Shorts 隐藏、拖动和连续播放均待真机确认，不能承诺所有服务端广告实验均可清除。创作者口播推广不在自动处理范围内。

## 来源与许可

核心编辑器、策略、字幕处理、UMP 编辑器与客户端适配自行编写，MIT 发布。字段图来自 [davidzeng0/innertube 的 MIT 协议声明](https://github.com/davidzeng0/innertube/tree/b04d48d000a84befa5d7b018553b04fa4f98ebd8)；元素 URI 路径在公开数据中确认。UMP 依据 [LuanRT/GoogleVideo 的公开协议示例](https://github.com/LuanRT/GoogleVideo/tree/96d1418984d00ac2797a1dafe4625d1368b5b9aa/examples/onesie-request)，没有打包其运行时。

通用库为 `@noble/ciphers` 1.3.0、`@noble/hashes` 1.8.0 与 `fflate` 0.8.2（MIT）。全部许可嵌入脚本，见 `NOTICE`、`LICENSE` 与 `licenses/`。没有加载之前的 YouTube 去广告或字幕插件。
