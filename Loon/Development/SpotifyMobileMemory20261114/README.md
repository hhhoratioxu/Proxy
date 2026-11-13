# Spotify 手机版 50 MB 内存验收

2026-11-14，按用户的实际手机代理环境，把 **严格低于 50,000,000 字节**设为手机版的内存验收条件；50 MB 按十进制解释。该约束适用于 Loon iOS 优先、Surge iOS 随后的完整运行环境，不是对所有代理客户端官方上限的推断。Mac 产品不设此上限。脚本文件大小、缓存字符数、单个 JS 堆大小都不能代替代理扩展进程的运行峰值。

这里直接测试正常的 **VerseLyrics 3.2.2 / 原生适配 18**，来自 Git 固定对象 `10049053ce86bd992e3ebb6511ffb28312ba86fb`；不改动旧源码，不替换正式手机插件，不强制用户开启 compact，也不关闭现有歌词来源或翻译功能。Mac 显示转换继续在独立目录开发。

## 自动筛查

需要 macOS、Command Line Tools、Node.js，以及本地已有的上述 Git 对象；不安装第三方测量依赖。工作目录为本文件所在目录：

```sh
npm test
npm run screen
node check-budget.mjs
```

`run-screen.mjs` 把固定的 Loon / Surge 正式运行脚本、核心及自写测试材料复制到临时目录，编译 macOS JavaScriptCore C 宿主，逐个运行后删除临时文件。不会打开 Spotify、播放音乐、请求网络、读取账户凭据或修改代理配置。报告只保存合成场景名称、字节数、输出校验值、请求计数与内存数值，不保存真实歌词和账户资料。

18 种场景分别运行 Loon / Surge、standard / compact、首次及连续 20 次、每组 2 个独立进程，共 288 个进程、3024 次脚本执行：

| 范围 | 自动覆盖 |
| --- | --- |
| 启动、翻译及补词 | 原生英文歌词 / 原生无词；各自缓存命中、冷搜索；各自空缓存、60,000–63,900 字符已填充缓存；compact 兼容读取既有 standard 缓存 |
| 输入与解码 | 600 行中日韩繁简混合文本 Protobuf、600 行英文翻译路径、大 JSON、超过 256 KiB 的歌词输入、错误 Protobuf |
| 服务降级 | 补词 HTTP 超时错误回调、超过 96 KiB 的翻译服务响应；断言保留原始字节 |
| 入口处理 | 约 120 KiB 的 Extended Metadata / Connect JSON / Connect Protobuf，断言同步完成且零网络 |
| 回调与输出 | 单次完成、无未结束回调、串行请求、缓存不额外膨胀；Node 与 JSC 的输出校验值及请求数一致；原词与原始时间轴保留 |

补词成功使用旧基线已有的 LRCLIB 合成材料，失败场景是同一提供方的错误回调；这轮内存筛查没有模拟六源全部搜索成功或真实网络延迟。旧核心的六源功能回归与本筛查分开，不能把单一来源的内存结果概括为所有网络路径的手机峰值。

测量器读取本机内核的 `task_vm_info`：`ledger_phys_footprint_peak` 和 `resident_size_peak`，单位为字节。物理 footprint 和 resident 都与 50 MB 参考线比较；字段不可用时筛查不通过，不能用稀疏采样最大值冒充进程峰值。报告计入合成宿主、正文、脚本解析、JSC/JIT 和脚本分配；未模拟 iOS 代理扩展、真实 TLS/HTTP 缓冲、其他脚本或实机原生调度。连续执行使用新的 JSC context/group，不代表手机同时切歌时的真实并发，也不代表长期能耗验收。

原始结果见 [evidence/memory-screen.json](evidence/memory-screen.json)。每次筛查从新进程开始，内核峰值属于该进程整个生命周期；不会通过减去测量器或 JSC 启动开销降低结果。

2026-11-14 本机筛查结果：288 个进程、3024 次执行均完成，内核峰值字段均可用。另有 8 项内存政策测试通过。

| 手机版运行代码在本机 JSC 中的筛查 | 最高物理 footprint（字节） | 最高 resident（字节） |
| --- | ---: | ---: |
| Loon / standard | 11,731,520 | 15,482,880 |
| Loon / compact | 11,764,288 | 15,515,648 |
| Surge / standard | 12,075,584 | 16,105,472 |
| Surge / compact | 12,091,944 | 16,187,392 |

本轮最高约 **12.09 MB / 16.19 MB**，发生在 600 行英文翻译连续 20 次的合成场景。所有测得数值低于 50 MB 参考线；仍缺原生 iOS 证据，手机验收状态为**未验证**。compact 的结果没有一致低于 standard，不能据此推断每个场景都会节省相同比例内存，也没有切换用户原有设置。

## 手机验收仍待实机证据

**本机 JSC 筛查通过也只能称为桌面筛查通过，不能认定手机已低于 50 MB。** `memory-policy.json` 始终要求原生 iOS 证据。`npm run release-check` 在只有本报告时以退出码 2 阻止把它当作手机验收；本目录不包含发布命令。

Loon iOS 与 Surge iOS 需要各自记录设备型号、iOS / 代理 / Spotify 版本、启用插件和设置、扩展初始内存、测试窗口及峰值来源，并覆盖以下矩阵：

1. 首次加载、已有原生歌词、原生无词的成功补全、全部来源失败、开启翻译。
2. 大歌词 / 大响应、填满缓存、过期和更新缓存、无效格式恢复原响应。
3. 快速切歌、前后跳转、慢网络 / 失败网络、重复播放与持续运行；保留其他原有代理任务的实际负载。

验收对象为**代理网络扩展的整体峰值**，包含宿主和网络缓冲；每个场景必须严格小于 50,000,000 字节。若取到的只是 JS heap、采样曲线或退出日志，应保留其测量范围；没有 jetsam 或没有 VPN 断开不能证明满足上限。证据不足继续标为未验证；发现超限后针对实际分配与并发路径修复、重跑功能回归及原生测量，不删功能换取合成测试通过。

已有正文 256 KiB / Entry 128 KiB、服务 96 KiB、600 行、缓存 standard 64,000 字符 / compact 32,000 字符、按需初始化和串行请求是分配控制，不能与整个扩展的 MB 值直接相加或换算。JS 对正文的检查发生在宿主取得响应之后，因此不能保证宿主之前没有缓冲更大的响应；必须以原生证据评估这一部分。

依据：[Loon Script API](https://nsloon.app/docs/Script/script_api/)、[Apple 内存测量范围说明](https://developer.apple.com/documentation/xcode/gathering-information-about-memory-use)、[Apple jetsam 报告说明](https://developer.apple.com/documentation/xcode/identifying-high-memory-use-with-jetsam-event-reports)。核对日期 2026-11-14；测量器只访问自己的 macOS 进程，没有给 Loon 脚本增加未经公开的内存或取消请求 API。
