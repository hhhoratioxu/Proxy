# Loon 官方文档适配记录

核对日期：2026-10-19。用户指定本分类后续项目优先采用这些官方资料。本文件记录实现要点和仓库工程约定；涉及新能力时重新核对原页。

| 官方入口 | 使用时机 |
| --- | --- |
| [总览](https://nsloon.app/docs/intro/) | 确认产品范围和文档入口 |
| [Script](https://nsloon.app/docs/Script/script_v2/) | 声明触发条件、脚本参数和运行选项 |
| [Script API](https://nsloon.app/docs/Script/script_api/) | 实现网络、存储、二进制和完成回调 |
| [Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/) | 原生请求头、响应头、正文与 URL 修改 |
| [插件](https://nsloon.app/docs/Plugin/) | 组织插件、用户可选参数和最低版本 |

## Script

新版语法从 3.5.1（983）开始。每条 HTTP Script 只有一个 script Action；请求与响应各自按顺序选第一条完整命中的规则。Response 必须有覆盖所有成功分支的 URL Guard。声明 requires_body 才读取正文；binary_body_mode 仅选择表示方式。仅使用文档列明的 with 字段，不能移植其他客户端的 engine 或 max_size。Header 条件值为字符串或 null；不使用未支持的大小比较或 Body 条件。Script 条件不提供 Rewrite 的命名捕获。见 [官方 Script](https://nsloon.app/docs/Script/script_v2/)。

## Script API

每次执行只完成一次；异步回调结束后再调用 $done。HTTP timeout 单位为毫秒，二进制使用 Uint8Array；文本模式仍可能返回二进制。存储读写为同步字符串接口；remove 会清空全部脚本存储，不能用于单个插件的清理。不要依赖可靠的 clearTimeout/clearInterval，setInterval 也不是周期循环。gzip、AES 和 DNS 新 API 有 Build 988 要求。DNS 查询的超时与脚本总超时分别控制。见 [官方 API](https://nsloon.app/docs/Script/script_api/)。

## Rewrite

新版语法从 3.5.1（978）开始。多个匹配规则按顺序执行，Action 管道从左到右处理。条件捕获与 Action 内正则捕获有不同作用域。URL 替换需要唯一必选 URL 条件。响应 Mock 在请求阶段生成，不能依赖尚不存在的响应值。修改 Body 可能使对应 Script 不再执行，设计组合时需检查冲突；仅修改请求头不会新增这种禁用。见 [官方 Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/) 和 [Script 执行顺序](https://nsloon.app/docs/Script/script_v2/)。

## 插件

input/select 支持 string 或 number，switch 使用 boolean；select 首项是默认值。类型必须显式匹配使用位置。script 的对象参数只引用当前插件已声明的参数，保持原类型。用户保存值优先于声明默认值，参数更改经配置重载发布。minimum version 取实际使用能力的最高要求，不照抄模板。见 [官方插件文档](https://nsloon.app/docs/Plugin/)。

## 本仓库的工程约定

以下是项目实践，不是官方提供的内存保证：

- 只改请求头时优先评估原生 Rewrite，避免额外脚本实例；需要解析正文时按格式设置读取范围。
- 对输入、缓存、请求数和总处理时间设上限；避免并行抓取、轮询等待及不必要的字符串/字节数组副本。
- 原生网络回调可能已持有完整响应，JavaScript 内的长度检查不等于限制宿主进程的峰值内存。
- 保留原始 Headers 与未修改字段；超限、未知格式和失败路径应有测试。
- 验证真实发布配置中的参数传递、重复回调、超时、连续请求和失败恢复；桌面模拟测试不能称为 iPhone VPN 验收。
- 发布时提供固定版本源码与测量证据，并核对主分支导入文件实际字节。


## VerseLyrics 3.0.0 核对记录

2026-10-19 重新核对 Script、Script API 与插件官方页面。NETWORK_MODE 是插件自有 string select 参数，默认 online，通过现有参数对象传入；cache-only 只控制插件查询，不修改 Loon 路由或 Spotify 本身联网。没有新增宿主 API、计时器或权限，最低版本继续为 3.5.1（983）。请求头继续使用官方原生 Rewrite；不再生成未被导入文件引用的 Loon 请求脚本。存储仍使用文档公开的同步字符串读写，保持原有容量与并发边界，不假设事务或原子交换能力。


## VerseLyrics 3.1.0 共享歌词行为

2026-10-19 核对 Script API 的异步完成与二进制约定。本次只改共享歌词判断与来源选择，不改 Loon 语法、宿主 API、最低版本或参数。简繁中文原词不互译；官方 UNSYNCED 静态歌词可在原有串行查询和容量边界内换为身份核对通过的真实同步歌词，无匹配则保留原词。无时间轴搜索结果与完全无词结果使用不同的短期缓存键，避免相互阻断。完整自动测试和 macOS 测量见对应版本固定源码；仍不能作为 iPhone VPN 稳定性结论。


## VerseLyrics 3.1.1 简繁输出拦截

2026-10-19：仅修改共享翻译判断，不新增或改变 Loon 语法、宿主 API、参数、最低版本或原生超时。中文夹英文与注音保留原句；缓存、来源和网络结果输出前再核对简繁与排版等价，服务明确识别为中文的结果复用原文身份记录。没有新增计时器、并行查询或缓存容量。保持异步回调结束后再完成脚本；本地编译产物回归与 iPhone VPN 实机结论继续分开报告。


## YouTube Clean 1.2.5 字幕恢复

2026-10-19 重新核对 [Script](https://nsloon.app/docs/Script/script_v2/)、[Script API](https://nsloon.app/docs/Script/script_api/) 与[插件](https://nsloon.app/docs/Plugin/)。保持原有 URL Guard、原生对象参数、Uint8Array 表示及 3.5.1（983）最低版本。字幕 HTTP 请求使用官方字段：timeout=4000 毫秒、binary-mode=true、auto-cookie=false、auto-redirect=false、insecure=false。只有真实取得合法字幕时，Response Script 才用官方支持的数字 status=200、正文和对应 Content-Type 恢复失败响应；未获取成功时保留原错误状态。

每次字幕响应最多一次附加请求、无自动重试，完成回调仅一次；不依赖 clearTimeout 生效。原字幕、附加字幕与合成结果均限 1 MiB，宿主已经读取的正文仍不受 JavaScript 长度检查限制。HTTP 429 的同步存储只保留一个到期时间和状态，默认退避 60 秒、Retry-After 限制在 30–300 秒；无字幕、签名或账号缓存。读写不具备事务保证，短时并发可能各自发出一次请求；存储失败时保持原字幕处理并放弃跨请求退避。自动检查不能证明真实 iPhone VPN 稳定性或服务端翻译已恢复。
