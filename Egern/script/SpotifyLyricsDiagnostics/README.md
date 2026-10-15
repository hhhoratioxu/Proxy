# Spotify 歌词通知诊断版

**0.3.3-diag.1 · 2026-10-15**

用户反馈 0.3.3 的原本无词歌曲仍没有歌词，而且在 Egern 中找不到「最近处理状态」。本模块将原有 0.3.3 歌词处理器与原创通知适配层打包为独立脚本，直接在播放时发通知，点通知即可复制诊断记录。**这是获取手机实际运行证据的诊断版，无词显示问题尚未解决或验收。**

## 导入与使用

1. 在 Egern 的模块列表中临时关闭原来的「Spotify 双语歌词 · VerseLyrics」。
2. 导入并启用 [通知诊断模块](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyricsDiagnostics/SpotifyLyrics.Diagnostics.yaml?v=0.3.3-diag.1)。脚本会自动下载，无需另找或手动运行状态脚本。
3. 保持原有的 Egern HTTPS 解密运行，重新打开 Spotify，播放 [《那页夏天》](https://open.spotify.com/track/76XUZSb13QUuj1HECY4Hvo)，并打开播放页，等待约 1 分钟。
4. 收到「Spotify 歌词诊断」通知后，**点通知复制记录，再粘贴回对话**。通知截图也可以。若出现多条，优先复制最新的 `lyrics` 或 `player-cards` 通知。

诊断模块默认启用插件翻译、`auto` 补源和无词发现；需要其他目标语言时可在模块中选择。通知不需要手动运行脚本；每分钟的定时项还会在开始阶段最多发送两次「诊断已运行」提示。定时项启动不等于已捕获 Spotify 请求。若只有此提示，没有接口通知，也请发回提示内容。

如果没有任何通知，请检查 iPhone「设置 → 通知 → Egern」是否允许通知，并告知 Egern 版本号。通知显示、点通知复制，以及定时执行在当前用户设备上均待验证。

排查结束后，关闭诊断模块，再恢复普通模块。诊断模块与普通模块各自包含完整的歌词处理，不宜同时开启。

## 通知能说明什么

| 通知记录 | 说明 |
| --- | --- |
| `heartbeat` | 诊断脚本的定时项确实执行；不证明 MITM 或歌词接口已经命中。 |
| `player-cards` | 当前曲目的卡片响应已命中，并显示本次处理结果。 |
| `metadata` / `extended-metadata` | 已识别的歌曲信息接口已命中。 |
| `lyrics`，已收到实际歌词请求 | 客户端确实发出了歌词请求；如果之后没有完成记录，需继续排查执行中断或超时。 |
| `lyrics`，HTTP 404 → 200、备用来源和行数 | 脚本已生成歌词响应；不等于 Spotify 已在界面显示。 |
| 某接口类别加 `-other`，或 `other-spotify` | 已看到其他 Spotify 流量；这条未进入现有歌词适配逻辑，不会修改正文。 |
| 响应已被另一份 VerseLyrics 处理 | 同时启用了另一份处理器；临时只保留诊断版后重试。 |

记录包含诊断版本、实际处理器版本、Egern/Spotify 版本、时间、接口类别、公开曲目 ID、HTTP 状态、处理说明、已识别错误代码、歌词行数、请求是否携带鉴权、是否已有歌曲信息缓存、来源服务的返回状态和标准编码类型。诊断记录不包含完整请求头、鉴权令牌、Cookie、完整 URL、查询参数、账号标识或歌词正文。普通歌词处理仍仅在请求时向同一 Spotify 主机复用其鉴权，并向选定来源发送歌曲信息或待翻译文本；诊断通知没有额外的网络请求。

同一 HTTP 响应脚本处理已适配的四类接口，并在本次执行中直接获取处理状态，不依赖另一脚本的存储范围。诊断脚本对其他 `spclient` 响应只分类，不消费其正文；Egern 按模块配置为脚本提供至多 2 MiB 的响应。通知会对重复结果限频，保留最多 12 条诊断事件，复制时提供最近 10 条；其他 Spotify 流量每分钟至多通知一次，给实际歌词记录留出空间。

## 源码与验证

[`notification-layer.js`](./notification-layer.js) 是独立编写的通知层；[`build.mjs`](./build.mjs) 将本仓库的原始 0.3.3 处理器重命名为内部入口，补充已识别处理错误的回报，再拼接通知层。没有运行时远程导入，也没有复制其他插件实现。原处理器及适配层的哈希见 [`build-info.json`](./build-info.json)。Unicode 变体数据仍按 [NOTICE-UNICODE.txt](./NOTICE-UNICODE.txt) 的许可提供。

模块和脚本使用 Egern 官方记录的 [通知与剪贴板动作 API](https://egernapp.com/docs/javascript-api/)、[定时脚本](https://egernapp.com/docs/configuration/scriptings/)和[模块组件](https://egernapp.com/docs/configuration/modules/)。

```sh
node build.mjs
ruby build-module.rb
node --test test/diagnostics.test.mjs
node test/run-core-regression.mjs
ruby test/validate-module.rb
```

本地测试覆盖通知复制文本、触发顺序、无请求时的提示、限频、敏感信息排除、存储或通知失败时的响应保留、真实公开卡片样本，以及原有歌词处理回归。测试结果见 `Evidence/`。**Node 模拟的通知调用不证明 iPhone 已收到通知，也不证明原生歌词已显示；本版正是为了收集这一步证据。**
