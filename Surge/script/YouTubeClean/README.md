# Horatio YouTube Clean 1.0.0

独立编写的 YouTube 去广告、字幕翻译与底栏控制插件。每个支持的代理客户端只安装一个入口。项目不加载既有 YouTube 去广告或字幕插件，通用加密和压缩库随脚本打包，运行时无需翻译 API 密钥或外部 Worker。

## 设置

| 设置 | 默认 | 用途 |
| --- | --- | --- |
| `REMOVE_ADS` | `true` | 清理已识别的播放器广告字段与信息流广告卡片 |
| `TRANSLATE_CAPTIONS` | `true` | 为已有字幕添加 YouTube 翻译轨道 |
| `TARGET_LANGUAGE` | `zh-Hans` | 简体中文；可用 `zh-Hant`、`en`、`ja`、`ko` 等 |
| `BILINGUAL` | `true` | 原文在上、译文在下 |
| `AUTO_CAPTIONS` | `true` | 优先选择新增的字幕轨道，实际选择仍受 App 控制 |
| `HIDE_UPLOAD` | `true` | 隐藏底部发布「＋」按钮 |
| `HIDE_SHORTS` | `false` | 隐藏底部 Shorts 按钮 |

两个底栏开关相互独立，在去广告和字幕翻译关闭后仍可使用。它们只控制底栏，不移除正常 Shorts 视频。改变设置后强制退出 YouTube，再打开使导航重新加载。客户端可能缓存底栏，或使用不同的服务端布局。

## 实现

- `wire.mjs` 自行读取 protobuf 原始字段，未知字段与未修改的字段原样保留，不对整条响应重新编码。64 位数不会转成 JavaScript 浮点数。
- `edit.mjs` 只沿已知消息路径修改广告、字幕和底栏。播放器字段 7、23、25、27、38、44、45、48、68、69 与广告断点字段 2、3、6、9、10 单独处理；没有最低广告载荷长度门槛。创作者付费推广披露保留。
- 底栏确认路径为 guide 根字段 4（在线）或 6（离线）→ 117866661 → 重复字段 1 → 117501096。只在这一导航容器内识别 `FEuploads` / `FEshorts` 等标识，未知内容不扫描删除。
- `timeline.mjs` 自行解析 JSON3、srv3、旧 XML 和 WebVTT，通过时间重叠匹配原文和译文，保留时间轴与非字幕块。无现成字幕时不能生成语音识别字幕。
- `stream.mjs` 自行处理 UMP 长度帧，验证 HMAC 后再修改 Onesie 播放元数据，并重新签名。普通媒体帧保留；缺少密钥、认证失败、不支持的压缩或未知格式均保留原响应。
- 播放密钥仅短期存于本地代理客户端，不记录日志。每条翻译字幕最多额外向同一 YouTube 字幕 URL 下载一次原文，不转发账号 Cookie / Authorization，不跟随下载重定向。下载限时 4 秒。响应上限 8 MiB，字幕上限 1 MiB。
- Egern 使用原生 ESM / Fetch 接口；Surge、Loon、Shadowrocket 使用回调接口；Quantumult X 使用 `bodyBytes` 和脚本变量。Clash/Mihomo 没有对应的 HTTPS 响应体脚本功能。

## 构建与检查

需要 Node.js 20+ 和 pnpm。依赖版本记录在 `pnpm-lock.yaml`。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
node package-native.mjs <40位运行版本提交SHA> <安装文件输出目录>
```

`dist/egern.js` 与 `dist/clients.js` 是自包含脚本，SHA-256 见 `dist/SHA256.json`。安装入口放主分支，源码、测试和运行脚本放独立的固定版本分支。用户无需安装 Node.js 或执行构建。

可选的协议图再生成：检出 [davidzeng0/innertube](https://github.com/davidzeng0/innertube/tree/b04d48d000a84befa5d7b018553b04fa4f98ebd8)，然后运行 `node compile-schema.mjs /path/to/innertube/protos`。生产运行脚本不导入 protobufjs。

## 已验证的范围

截至 2026-10-16，61 项本地检查通过，包括五种客户端接口的模拟、独立 protobufjs 读写器构造的数据、原始字节保留、两个底栏开关的全部组合、单独关闭广告/翻译、Node.js 原生 AES/HMAC 交叉校验、两种加密元数据封装、gzip、无密钥与错误认证回退，以及字幕合成与下载失败。

匿名公共接口返回的原生 iOS player 数据为 71,245 字节，修改后为 71,634 字节；原有 52 条字幕轨道全部保持原始字节，新增 1 条轨道，非目标的顶层字段保持原始字节。该响应只有广告心跳字段 69，没有投放中的广告视频，不能作为实际跳过广告的证明。

匿名 iOS guide 的 4,888 字节响应证实上述在线/离线底栏路径。该响应没有发布「＋」与 Shorts，因此真实按钮删除只经过结构一致的自写样本检查，没有登录账号或真机界面验收。公开字幕下载返回 HTTP 429，真实字幕合成显示也未完成端到端验收。原始返回内容、访客信息、播放密钥及签名字幕地址不随源码发布。

**原生客户端导入、真实广告去除、真实按钮隐藏、字幕显示、拖动和连续播放均尚未进行真机验收。** HTTP/3、App 版本与服务端实验可能绕过代理脚本，不能保证全部广告。视频里创作者口播推广不属于自动清理范围。

## 来源与许可

核心编辑器、广告策略、底栏逻辑、字幕解析合成、UMP 编辑器和平台适配由本实现编写，以 MIT 发布。字段图来自 MIT 许可的 [davidzeng0/innertube 协议声明](https://github.com/davidzeng0/innertube/tree/b04d48d000a84befa5d7b018553b04fa4f98ebd8)；UMP 与加密封装依据 [LuanRT/GoogleVideo 的公开协议示例](https://github.com/LuanRT/GoogleVideo/tree/96d1418984d00ac2797a1dafe4625d1368b5b9aa/examples/onesie-request)，没有打包其运行时。

通用库为 `@noble/ciphers` 1.3.0、`@noble/hashes` 1.8.0 和 `fflate` 0.8.2（MIT）；全部许可随分发脚本嵌入，见 `NOTICE`、`LICENSE` 和 `licenses/`。

接口依据：[Egern JavaScript API](https://doc.egernapp.com/docs/javascript-api/)、[Surge HTTP Response](https://manual.nssurge.com/scripting/http-response.html)、[Loon Script](https://nsloon.app/docs/Script/script_v2)、[Quantumult X 官方样例](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)。Shadowrocket 使用兼容接口适配，尚未获得完整官方脚本规范，未标为官方验证。
