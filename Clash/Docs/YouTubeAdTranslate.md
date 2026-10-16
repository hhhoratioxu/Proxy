# YouTube 去广告与双语字幕 · Clash / Mihomo

标准 Clash / Mihomo 核心没有本插件所需的 HTTPS 解密及响应体脚本执行接口，不能直接运行其他客户端的合并插件。Clash Verge Rev 的订阅扩展脚本用于改配置，无法处理 YouTube 的实时加密播放响应或合成字幕；因此此目录不提供同等功能的伪配置。

可在支持 HTTPS 响应改写的客户端中安装下列合并版：

| 客户端 | 合并插件安装入口 |
| --- | --- |
| Egern | [YouTubeAdTranslate.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/YouTubeAdTranslate.yaml) |
| Surge | [YouTubeAdTranslate.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/YouTubeAdTranslate.sgmodule) |
| Loon | [YouTubeAdTranslate.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/YouTubeAdTranslate.plugin) |
| Shadowrocket | [YouTubeAdTranslate.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/YouTubeAdTranslate.sgmodule) |
| Quantumult X | [YouTubeAdTranslate.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/YouTubeAdTranslate.conf) |
| Clash / Mihomo | [能力限制与其他客户端入口](https://github.com/hhhoratioxu/Proxy/blob/main/Clash/Docs/YouTubeAdTranslate.md) |

上述插件默认开启去广告与原文＋简体中文双语字幕，可独立调整功能。使用说明、证书要求及验证范围见各客户端 `Docs/YouTubeAdTranslate.md`。

2026-10-16：本地协议与接口测试 80 项通过；真实公开播放器数据已成功加入双语轨道。字幕下载遭遇 HTTP 429，手机客户端导入、实际去广告和字幕显示仍未验收。

[返回 Clash](../README.md)
