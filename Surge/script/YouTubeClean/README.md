# Horatio YouTube Clean 1.2.0

独立编写的 YouTube 去广告、双语字幕与底栏控制脚本，支持 Egern、Loon、Surge、Shadowrocket 与 Quantumult X。Loon 提供 A、B、C 三种测试方案，每次只启用一个；其他客户端保留一个当前入口，可通过 `DEEP_FILTER` 切换过滤强度。

用户确认 1.0.0 可隐藏 Loon 中的发布「＋」，但 1.0.0、1.0.1 仍显示主页广告。1.2.0 是继续排查时提供的三个候选方案，**没有完成在用户手机上清除全部广告的验收**。

## 三个 Loon 方案

| 文件 | 方案 | 处理差异 |
| --- | --- | --- |
| `YouTubeClean.plugin` | A 元素版 | 传统广告字段、首页与分页路径，加上原生元素广告模板识别 |
| `YouTubeClean.Deep.plugin` | B 深层版 | A 的能力，加上单张卡片中的新封装、原生广告徽标与推广/试用模板 |
| `YouTubeClean.TCP.plugin` | C 连接兼容版 | B 的过滤策略，加上四个 YouTube API 主机的 UDP/443 拒绝规则，测试客户端是否回退到可解密的 TCP |

B 更适合目前仍显示主页广告的排查。C 版规则只针对 `youtubei.googleapis.com`、`youtubei-att.googleapis.com`、`www.youtube.com`、`m.youtube.com`，不会拦截 `googlevideo.com` 媒体主机或其他域名的 UDP。客户端是否回退、规则是否被已有本地规则覆盖，需要实际验证；可能出现加载延迟。语法依据 [Loon 逻辑规则](https://nsloon.app/docs/Rule/logic_rule/) 与 [协议规则](https://nsloon.app/docs/Rule/protocol_rule/)。

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
| `DEEP_FILTER` | A 为 `false`；B/C 为 `true` | 深查卡片封装和广告徽标，也会隐藏推广与试用卡片 |
| `DIAGNOSTICS` | `true` | 输出一行主页结构诊断，可关闭 |

日志以 `[YouTubeClean]` 开头，仅含版本、方案、开关布尔值、格式、大小、删除部件数、最多 16 个模板标识与 12 个未知渲染器字段号，以及是否整体回退。**不记录 Cookie、Authorization、账号、视频标题、完整 URL、访客标识、字幕签名或播放密钥。** 没有通知弹窗、定时任务或后台轮询。

## 实现与识别边界

`wire.mjs` 自行编辑 protobuf 原始字段，未修改字段保持原始字节和 64 位整数精度。`edit.mjs` 沿确认的首页、分页、播放器与导航路径处理数据，`timeline.mjs` 合成 JSON3、srv3、旧 XML 与 WebVTT 字幕。UMP 元数据在本地验证 HMAC 后编辑并重新签名，普通媒体帧保留。

公开 iOS 返回确认的元素路径：`ElementRenderer(153515154) → newElement(172660663) → type(1) → componentType(168777401) → templateConfig(3) → uriTemplateConfig(172035250) → uri(1)`。`elements.mjs` 在这个结构中读取模板名称，匹配广告/推广命名。**命名规则是本实现的启发式策略，并不证明所有实际投放的广告都有这些名称。** 强模式另识别 MIT 协议声明中的原生广告徽标字段 138592202，对单张卡片内部限深、限节点检查；不把普通标题中出现广告字样当作广告，不深扫账号响应或全局模板资源。

元素子节点可单独移除，混合列表保留普通卡片，广告专用分组随内容删除。错误、未知格式、认证失败、缺少密钥与不支持的压缩保持原响应。二进制上限 8 MiB，字幕上限 1 MiB；原字幕下载限时 4 秒，省略账号凭证并拒绝重定向。无字幕视频不能生成语音识别字幕，不依赖收费翻译密钥或外部 Worker。

## 构建与验证

需要 Node.js 20+ 和 pnpm：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
node package-native.mjs <40位运行脚本提交SHA> <输出目录>
```

生成五个客户端入口和两个额外 Loon 方案。运行脚本固定提交，用户无需编译。源码、测试和构建脚本位于独立运行版本分支，主分支只放可导入入口与说明。

2026-10-17：**92 项本地检查通过**，包含播放器、字幕、加密封装、底栏、字节保留、原生元素、新封装、广告徽标、推广过滤、诊断隐私和三份实际生成的 Loon 配置。三个配置的默认参数送入待发布的同一自包含脚本执行，确认策略差异。C 版四条规则检查了域名、协议和端口限制，未在真实 Loon 网络栈中运行。

对 763,872 字节的公开初始主页与 763,991 字节的继续加载响应加入自写传统广告、原生元素广告和新封装广告，处理后可逐字节恢复其余真实响应。匿名返回没有实际投放的主页广告，属于真实信封与自写广告的混合验证，**不能当作用户主页广告已消失的证明**。可运行 `node test/probe-home.mjs <初始主页文件> <继续加载文件>` 重做；抓取、访客信息和签名链接不随源码发布。

旧播放器样本保留 52 条字幕并新增一条轨道；公开字幕下载返回 HTTP 429。1.2.0 的真实广告去除、字幕显示、Shorts 隐藏、拖动和连续播放均待真机确认，不能承诺所有服务端广告实验均可清除。创作者口播推广不在自动处理范围内。

## 来源与许可

核心编辑器、策略、字幕处理、UMP 编辑器与客户端适配自行编写，MIT 发布。字段图来自 [davidzeng0/innertube 的 MIT 协议声明](https://github.com/davidzeng0/innertube/tree/b04d48d000a84befa5d7b018553b04fa4f98ebd8)；元素 URI 路径在公开数据中确认。UMP 依据 [LuanRT/GoogleVideo 的公开协议示例](https://github.com/LuanRT/GoogleVideo/tree/96d1418984d00ac2797a1dafe4625d1368b5b9aa/examples/onesie-request)，没有打包其运行时。

通用库为 `@noble/ciphers` 1.3.0、`@noble/hashes` 1.8.0 与 `fflate` 0.8.2（MIT）。全部许可嵌入脚本，见 `NOTICE`、`LICENSE` 与 `licenses/`。没有加载之前的 YouTube 去广告或字幕插件。
