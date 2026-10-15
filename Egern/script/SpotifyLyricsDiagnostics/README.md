# Spotify 歌词通知诊断版

> 正式使用请导入 [VerseLyrics 0.4.0](../SpotifyLyrics/README.md)。本目录保留历史诊断实现，不需要用户继续收集诊断通知。构建与回归现固定使用 `legacy/` 中的 0.3.3 源码和测试输入，避免正式处理器升级改变历史诊断包。

**0.3.3-diag.3 · 2026-10-15 · iOS 歌词入口候选适配**

用户在 iOS Spotify 9.1.92.3058、Egern 2.21.0 上的记录及后续截图，确认脚本实际运行，改写了歌词卡片，并至少有一条批量元数据记录缓存 4 首歌曲、修改 2 首无词歌曲的标记。用户仍未看到 `lyrics` 或 `lyrics-gate` 通知。截图看不到诊断版本，不能据此认定已运行 diag.2。

核对发现 diag.2 有明确的配置分派错误：把 `v1/customize` 这个路径后缀误作完整路径，漏掉 `/user-customization-service/v1/customize`，也没有适配 `/bootstrap/v1/bootstrap` 及其外层封装。diag.3 修正这些遗漏；仅凭截图，仍不能证明手机实际请求过这些配置端点或已读取候选开关。

diag.3 保留原 0.3.3 歌词处理器及「用插件翻译替换官方译文」策略，修正配置入口，通知正文增加版本和批量扩展类型。**原生无词歌曲显示仍待用户手机验收；端点分派错误已复现和修正，不等于原生歌词问题已解决。**

## 更新与使用

1. 原普通模块「Spotify 双语歌词 · VerseLyrics」保持关闭。**更新现有诊断模块本身**为 [0.3.3-diag.3](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyricsDiagnostics/SpotifyLyrics.Diagnostics.yaml?v=0.3.3-diag.3)。此次匹配规则也有修改，仅刷新旧脚本不足以完成更新。若 Egern 将其导入为另一项，请关闭旧诊断项，只启用新版一项。
2. 保持原有的 Egern HTTPS 解密运行，将 Spotify 从后台彻底划掉后重新打开。模块默认开启插件翻译、`auto` 备用源和无词发现，无需重新开关这些设置。
3. 播放 [《那页夏天》](https://open.spotify.com/track/76XUZSb13QUuj1HECY4Hvo)，打开播放页并继续播放约 30 秒。
4. 优先查看 **`Spotify 歌词诊断 · lyrics-gate`** 和 **`Spotify 歌词诊断 · lyrics`** 通知，点最新通知复制记录。若仍没有这两类，查看最新 `extended-metadata` 通知：新正文应能直接看见 `diag.3` 和扩展类型，无需先复制才能确认版本。

版本行应显示 `VerseLyrics 诊断 0.3.3-diag.3`。新版模块改用独立文件 `spotify-lyrics-diagnostics-3.js`，防止继续使用旧脚本缓存；旧 diag.1 和 diag.2 脚本文件均保留原字节。模块中的每分钟定时项只在开始阶段最多发两次提示，定时项运行不等于歌词接口命中。通知会限频，最新通知的复制记录也包含之前已记录的事件。

排查结束后，关闭诊断模块，再恢复普通模块。诊断模块本身包含完整歌词处理，不宜与另一份普通或诊断处理器同时开启。

## 候选适配实际改什么

仅在已允许的 Spotify `spclient` 主机、精确 `/user-customization-service/v1/customize` 和 `/bootstrap/v1/bootstrap` 端点上处理配置（兼容保留旧 `/v1/customize` 别名）。customize 支持已核对的二进制 `Configuration` 或外层 `ResolveResponse` / `UcsResponse` / `UcsResponseWrapper`；bootstrap 按明确字段路径 `2 → 1 → 1` 进入 customize，再按上述结构处理，完整路径可为 `2 → 1 → 1 → 1 → 1 → 1`。不递归搜索任意正文。配置必须包含真实的 `ios-feature-lyrics` 命名空间，才会将其 `enable_has_lyrics_check_bypass` 布尔值设为 `true`；若该命名空间存在但此键被省略，则追加这一项。该字段名对应 iOS 客户端的歌词可用性检查开关；是否对用户当前版本生效，需要随后实际 `lyrics` 请求及界面结果确认。

其他已有配置字段、账号属性和未知字段保留原字节。配置请求移除条件缓存头并请求 `identity` 编码，改写响应移除旧长度和 ETag，避免沿用旧配置。`DISCOVER_MISSING=false` 或备用源为 `off` 时不改该配置。401、403、429、其他非 200 状态，以及未识别的结构、错误封装、字段类型冲突或 JSON 配置均保留上游结果。

此开关与原来的歌词卡片及逐曲目 `has_lyrics` 元数据是不同路径。它不创建备用源没有收录的歌词，也不保证每首歌都能补到词。进入实际歌词处理后，仍按原来的匹配标准查询备用来源并生成 Spotify 歌词响应；已有词歌曲的翻译继续由插件提供。

## 通知能说明什么

| 通知记录 | 说明 |
| --- | --- |
| `heartbeat` | 定时诊断运行；不证明歌词接口命中。 |
| `lyrics-gate`，新增或修改数量 | 已识别配置并生成候选改写；下一步看是否出现 `lyrics` 请求。 |
| `lyrics-gate`，标记已经开启 | 该配置字段原本已为真；配置无需改写。 |
| `lyrics-gate`，未识别、JSON 或非 200 | 配置已命中但未改写；应根据这条具体结果继续排查。 |
| `player-cards` | 当前曲目的卡片响应命中，并显示本次处理结果。入口本身不证明有歌词。 |
| `metadata` / `extended-metadata` | 歌曲信息接口命中；批量通知正文与复制记录均报告扩展类型。`TRACK_V4` 类型为 `10`，其他类型可能正常缓存 0 首。 |
| `lyrics`，已收到实际歌词请求 | 客户端确实发出歌词请求；如果之后没有完成记录，需排查执行中断或超时。 |
| `lyrics`，HTTP 404 → 200、备用来源和行数 | 脚本已生成歌词响应；仍需确认 Spotify 是否显示。 |
| 某接口类别加 `-other`，或 `other-spotify` | 已看到其他 Spotify 流量；不修改正文。 |
| 响应已被另一份 VerseLyrics 处理 | 同时存在另一份处理器，应临时只启用这一份诊断模块。 |

记录仅包含版本、时间、接口类别、公开曲目 ID、HTTP 状态、安全处理说明、已识别错误代码、歌词行数、鉴权或歌曲缓存是否存在、来源服务状态、扩展类型编号和标准编码类型。不记录完整请求头、令牌、Cookie、完整 URL、查询参数、账号标识、配置正文或歌词正文。其他 `spclient` 响应只分类，不消费其正文；通知不增加网络请求。模块为响应脚本提供至多 2 MiB 的正文。最多保留 12 条事件，复制最近 10 条；其他流量每分钟至多通知一次，每分钟最多 6 次普通接口通知，重复结果限频。

## 原创源码与验证证据

[`lyrics-entry-gate.js`](./lyrics-entry-gate.js) 是本仓库独立编写的配置适配器；[`notification-layer.js`](./notification-layer.js) 为独立编写的通知层。构建器将原 0.3.3 处理器重命名为内部入口、补充安全错误回报，再拼接上述两部分。没有运行时远程导入，也没有复制其他插件的配置修改或 Hook 实现。哈希见 [`build-info.json`](./build-info.json) 与 [`SHA256.json`](./SHA256.json)。Unicode 数据沿用 [NOTICE-UNICODE.txt](./NOTICE-UNICODE.txt) 许可。

核对字段和端点只使用公开协议描述及公开数据，固定到具体提交：

- [Configuration 与 AssignedValue 协议](https://github.com/librespot-org/librespot/blob/4a005903e078d512456fb008aaa9ba6246881bd9/protocol/proto/resolve.proto)、[UCS 外层协议](https://github.com/librespot-org/librespot/blob/4a005903e078d512456fb008aaa9ba6246881bd9/protocol/proto/ucs.proto)。
- [iOS 编译开关表第 972 行](https://github.com/zbzxbg/EeveeSpotifyEvolved/blob/292b93c78ba1770cb6e96f8bee719e9e6b2d0275/.spotify-ipa/flag-table.txt#L972) 的作用域和键名。仅参考这些事实，不使用该项目的功能实现。
- [完整 customize 和 bootstrap 端点](https://github.com/app2smile/rules/blob/df6366a7024e0b3f0aa3510c5b791eea6f3cba89/module/spotify.module) 只提取字面路径事实，未复制正则或脚本；[原生 bootstrap 的生成式协议字段](https://github.com/zbzxbg/EeveeSpotifyEvolved/blob/292b93c78ba1770cb6e96f8bee719e9e6b2d0275/Sources/EeveeSpotify/Premium/Models/Protobuf/Account.pb.swift#L1227) 只核对字段号和消息关系。[端点回归记录](./Evidence/native-endpoint-regression.json) 显示这两条路径在 diag.2 均漏掉，diag.3 均进入配置适配。
- 同提交的公开 iOS 9.1.88 配置数据仅在内存中验证：原有 1,096 项、未含此键，候选适配追加 1 项；直接配置及按协议自行构造的 bootstrap 外层均通过，所有已有字段逐字节保持，再次处理不变。bootstrap 外层不是实机抓包。只保存 [验证摘要](./Evidence/public-ios-configuration-validation.json)，不保存或重新分发完整配置。**该样本不是用户的 9.1.92 手机响应。**
- 对目标歌曲实时调用公开匿名 Spotify 元数据会话的批量接口，确认 `TRACK_V4=10` 的响应可被现有处理器识别；[结果摘要](./Evidence/target-batch-validation.json) 不包含会话令牌或响应正文。这也不证明用户日志中的批量响应包含类型 10。

Egern API 参考官方 [通知与剪贴板动作](https://egernapp.com/docs/javascript-api/)、[定时脚本](https://egernapp.com/docs/configuration/scriptings/) 和 [模块组件](https://egernapp.com/docs/configuration/modules/)。

```sh
node build.mjs
ruby build-module.rb
node --test test/diagnostics.test.mjs test/lyrics-gate.test.mjs
node test/run-core-regression.mjs
ruby test/validate-module.rb
```

本地诊断与配置适配测试 58 项通过，原处理器回归 112 项通过。配置测试覆盖完整端点分派、六层 bootstrap 路径、原有四种容器、已有字段与账号属性字节保留、追加/修改/重复目标项、幂等、错误结构、非 200、开关关闭及无关扩展类型；通知测试覆盖复制内容、限频、隐私字段排除及通知或存储失败时保留响应。结果保存在 `Evidence/`。**这些检查证明本地逻辑和已知数据结构，不能替代 iPhone 原生歌词显示验收。普通 0.3.3 模块及旧 diag.1、diag.2 脚本没有随本次适配改写。**
