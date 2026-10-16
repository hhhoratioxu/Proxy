# YouTube Clean 与 Clash / Mihomo

Clash/Mihomo 标准核心没有这套功能所需的 HTTPS 响应体 JavaScript 改写能力，无法通过普通域名分流实现 YouTube 去广告、双语字幕或隐藏底部发布「＋」与 Shorts。本目录仅提供能力说明，不提供功能等价的配置。

可选择仓库中支持响应脚本的客户端，每个客户端只安装一个新插件：

| 客户端 | 合并插件安装入口 |
| --- | --- |
| Egern | [YouTubeClean.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/YouTubeClean.yaml) |
| Surge | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/YouTubeClean.sgmodule) |
| Loon | [YouTubeClean.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/YouTubeClean.plugin) |
| Shadowrocket | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/YouTubeClean.sgmodule) |
| Quantumult X | [YouTubeClean.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/YouTubeClean.conf) |
| Clash / Mihomo | [能力限制与其他客户端入口](https://github.com/hhhoratioxu/Proxy/blob/main/Clash/Docs/YouTubeClean.md) |

新插件为 1.0.0 独立重写版；旧 YouTubeAdTranslate 与 Egern YouTubeEnhance 已移除。发布「＋」与 Shorts 分别设置，使用说明与未完成的真机验证项目见各客户端 Docs。

[Mihomo 官方项目相关能力讨论](https://github.com/MetaCubeX/mihomo/issues/2237) · [源码与验证范围](https://github.com/hhhoratioxu/Proxy/tree/runtime/youtube-clean-1.0.0/Surge/script/YouTubeClean) · [返回目录](../README.md)
