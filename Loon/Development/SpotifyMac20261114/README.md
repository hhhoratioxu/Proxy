# VerseLyrics：Spotify Mac 适配核对

日期：2026-11-14。作者：Horatio。这里是基于正常工作的 **VerseLyrics 3.2.2 / 原生适配 18** 的本地 Mac 开发候选，不是正式发布，也不替换手机插件。

恢复基线为 `10049053ce86bd992e3ebb6511ffb28312ba86fb:Surge/Development/VerseLyrics322`。构建时从 Git 对象读取既有源码，保留六源、翻译、匹配标准、时间轴、颜色、缓存和所有 12 个默认参数。没有使用 `SpotifyLyricsPlus/src` 的实验核心，也没有关闭正常补词来源。

手机版另有用户指定的严格低于 50 MB 运行峰值要求，[独立内存验收记录](../SpotifyMobileMemory20261114/README.md)管理该约束；Mac 产品不受此上限限制。Mac 双语 JSON 显示转换不合并进手机版，以免额外复制正文影响手机内存预算。

## 当前实测

环境：Spotify macOS **1.3.9.2055**，Loon macOS **0.5.0 (1011)**。测试前系统输出静音，Spotify 音量设为 **0**，目标为当前 Mac。没有向其他 Connect 设备发起播放。

| 场景 | 结果与边界 |
| --- | --- |
| 原生歌词对照 | 关闭歌词插件时，《Perfect》原生歌词正常显示；来源标记 Musixmatch。 |
| 原版核心在 Mac 执行 | 本机诊断确认真实歌词 GET 200 能进入旧核心，完成后交回 Uint8Array；入口脚本也能完成回调。不能仅凭早期加载延迟认定旧核心故障。 |
| Mac 双语显示 | `DisplayMac.lpx` 的《Take on Me》原生歌词视图实测呈现 **37 个含中文的文本行**，保留原词及 Musixmatch 来源标记。 |
| 前后跳转 | 暂停后跳至 **90000 ms**，再退至 **10000 ms**；界面进度对应 1:30 / 0:10，37 个中文文本行及歌词视图仍可用。尚未测量逐毫秒高亮误差。 |
| 《那页夏天》补词 | Mac 上未成功，不能宣称与手机补词一致。UI 最终禁用 Show lyrics；需要继续核对桌面可用性入口，不能据此认定第三方来源不收录。 |
| 逐字歌词 | 适配器检测到逐字/音节同步或任何非空 syllables 时原样交回，不伪造时间戳；尚无 Mac 逐字场景验收。 |
| Surge macOS | 本机没有安装 Surge；未做实机验证。不能用 Loon 的结果代替 Surge 验收。 |
| 中文、日文、韩文、Live、Remix、翻唱及各种来源组合 | 旧核心有自动回归；本轮没有完成 Mac 全部实机矩阵。 |
| 稳定性与能耗 | 未完成长时间播放、CPU、内存、电池或 iPhone VPN 验收；不据短测作保证。 |

早期只做了少量未携带登录凭据的 401 探针，观察到不同延迟；这不是稳定的性能基准，不能据此证明原生 Rewrite 有缺陷。

## Mac 候选的改动

`Mac.lpx` 用旧构建器已有的轻量 Request Hook 传递请求头，排除 OPTIONS、HEAD 等非内容请求。保留 JSON 请求的格式、Spotify 同源请求头及已有安全边界。主歌词和 Entry 脚本均与固定正式版本逐字节一致；`build-manifest.json` 记录来源和产物 SHA-256。

`DisplayMac.lpx` 在此基础上使用 `runtime/SpotifyLyrics.Mac.js`：旧核心完成处理后，仅对自己标记为 3.2.2 的 JSON LINE_SYNCED / UNSYNCED 响应，将准确对齐的已有译文加到原词下方。它不执行另一套匹配或翻译请求，不写另一个缓存。起止时间、行数、来源、颜色及未知 JSON 字段保持原值；原缓存仍保存核心格式。

`runtime/SpotifyLyrics.Entry.Mac.js` 对旧核心仅增加一处条件：HTTP 200 的 ConnectState 未声明 Content-Type 时，可以进入原有严格二进制结构解析；只有已识别的曲目 URI 和播放器结构能产生修改。实测观察到的响应含相同 `3 → 7 → 1` / `3 → 20 → 1` 路径，旧处理会跳过它；Mac 条件修正后成功交回改写字节。未知正文、其他非空类型、错误状态、超限及发现开关关闭均原样放行。这项改动本身没有使《那页夏天》的桌面歌词按钮恢复，不能把内部字节处理成功等同于用户功能完成。

显示转换限 600 行和 256 KiB，目标语言和译文行数必须严格对应。未知同步类型、逐字时间轴、非 JSON、格式错误、转换超限或无译文时保留原核心结果。这个候选只改变 Mac 配置；正式 iOS `.lpx` 和 Surge `.sgmodule` 没有改动。

## 本地构建和测试

需要 Node.js 和 Git 中已有的固定基线对象。Terser 固定为 5.51.2；`package-lock.json` 固定依赖。工作目录为本文件所在目录：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
```

本轮旧基线完整回归 **2248 / 2248** 通过；Mac 新增自动检查 **73 / 73** 通过。测试包含实际生成的 Mac 脚本、UTF-8、时间轴与未知字段保留、逐字保护、过大输出恢复、请求头保留、预检放行、缺少类型声明的严格 ConnectState 处理、重复回调和诊断不含凭据。真实设备结果单独列在上表。

## 临时导入

```sh
python3 serve.py
```

在本机 Loon 添加 `http://127.0.0.1:18765/DisplayMac.lpx`，只启用一份 Spotify 歌词处理配置，再重新打开 Spotify。12 个原有设置默认不变。这里的回环地址用于本机开发，不适合 iPhone，也不是 GitHub 发布地址。测试服务器只监听本机，正式运行候选没有诊断上传或后台任务；退出测试前停用临时插件，再用 Ctrl-C 停止服务器。

现有 Spotify 解密范围仍仅 `spclient.wg.spotify.com`、`*-spclient.spotify.com`。没有添加其他解密域名、安装新证书、降低证书验证或收集用户登录凭据。构建/测试不会 Push 或发布版本。

`Observe.lpx` 和 `DebugMac.lpx` 只用于受控排查。前者不接管既有生产响应路由；后者包含自己的完整处理链，不能与正式版或其他候选同时启用。诊断只向回环服务器发送路由模板、状态、长度、格式与歌词可用性结构，不记录原始请求头、Token、Cookie、歌词正文或账号内容；单条 4 KiB、最多 400 条驻留内存，脚本网络超时 300 ms，回调后单次完成。原生宿主已经缓冲的正文不能由 JS 上限倒推为峰值内存保证。

`CacheProbe.lpx` 是单曲条件缓存对照，限《那页夏天》的公开测试 URI。字段依据当前已安装 Spotify 程序的 protobuf 描述事实：`BatchedEntityRequest.entity_request(2) → EntityRequest.query(2) → ExtensionQuery.etag(2)`，仅 TRACK_V4 查询去掉条件验证值，其他扩展及头部原字节保留。带完整性签名/摘要、压缩、未知/歧义结构或超限时不改正文；不提取凭据，不向其他目的地转发原请求头，原 Spotify 同源请求沿用现有授权。它不属于正式候选的缓存策略。未带登录凭据的受控探针实机确认请求 Hook、生效的二进制正文和单次回调，Spotify 仍正常返回 401。实际客户端启动的对照尚未触发这首测试歌的 TRACK_V4 缓存刷新，不能据此宣称已经证明缓存是根因。

`inspect-protocol.py` 只读取已安装程序的描述事实，输出字段名称、编号、类型和程序 SHA-256，不复制程序或完整描述块，不读取账号数据。相关最小事实在 `evidence/installed-protocol-facts.json`；只供本版本互操作核对，不能据此臆测尚未观察到的请求或修改权限字段。

缓存清理仍是待确认的排查方案。当前设置页显示约 1.7 GB 临时缓存，另有单独的下载管理；本轮未清理这些数据。[Spotify 官方缓存操作说明](https://support.spotify.com/us/article/storage-information/)支持从设置的 Storage 使用 Clear cache，但不能据此保证清缓存会解决歌词入口问题。

## 后续必做

先重现桌面无词曲目的真实可用性请求、响应容器和后续歌词请求，依据实际字段建立严格测试，再补桌面入口。不能猜测桌面 feature flag，不能直接照搬 iOS namespace，也不能为提高覆盖率放宽版本/时长匹配。完成无词补全、失败回退、多语种与逐字场景以及持续播放验收后，才评估发布和 Surge macOS 适配。

官方依据（2026-11-14 重新核对）：[Script](https://nsloon.app/docs/Script/script_v2/)、[Script API](https://nsloon.app/docs/Script/script_api/)、[Plugin](https://nsloon.app/docs/Plugin/)。`#!system = macOS`、方法条件、Uint8Array、原生毫秒超时与单次完成均使用官方字段。这里只实测上述 Mac 版本，尚未确定更低 Mac 版本的兼容下限；不能把 iOS 产品版本号直接当作 Mac 最低版本。
