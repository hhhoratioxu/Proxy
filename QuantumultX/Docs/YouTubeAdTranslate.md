# YouTube 去广告与双语字幕 · Quantumult X

**版本 0.1.0 · 2026-10-16。** 去广告和翻译合并为一个安装入口。

[安装 YouTubeAdTranslate.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/YouTubeAdTranslate.conf)

在「重写 → 引用」中添加上面的地址。建议使用 **build 934 或更新版本**，用于读取独立参数并关闭脚本请求的自动 Cookie。

安装后确认客户端的 HTTPS 解密已启用，并且你自己的解密证书已安装和信任。强制退出 YouTube 后重新打开。先停用其他 YouTube 去广告、字幕或增强模块（包括 DualSubs 和旧 YouTubeEnhance），以免同一请求被其他脚本抢先处理。

## 默认行为

- 清理已识别的播放器、推荐列表与 Shorts 广告字段；保留正常视频和 Shorts。
- 保留原字幕，另加「双语字幕 · 简体中文」轨道；可在 YouTube 的 CC / 字幕菜单选择。
- 默认原文在上、中文译文在下。关闭双语开关后只显示译文。
- 默认优先选择新增的翻译轨道；如果客户端没有自动切换，请在视频中手动开启 CC 并选择该轨道。
- 依赖视频本身已有字幕或 YouTube 自动字幕及其翻译服务；没有字幕时不能生成字幕。

## 设置

参数写在两条运行脚本地址的 `#` 后面；修改时保持两条一致，再更新重写资源。

| 参数 | 默认值 | 用途 |
| --- | --- | --- |
| `ADBLOCK_ENABLED` | `true` | 去广告 |
| `TRANSLATION_ENABLED` | `true` | 字幕翻译 |
| `TARGET_LANGUAGE` | `zh-Hans` | 翻译目标语言 |
| `BILINGUAL` | `true` | 显示原文与译文 |
| `AUTO_CC` | `true` | 优先选择翻译字幕轨道 |

目标语言：`zh-Hans` 简体中文、`zh-Hant` 繁体中文、`en` 英语、`ja` 日语、`ko` 韩语。去广告和翻译可以独立关闭。

## 请求处理与限制

广告与字幕轨道由同一个响应脚本处理，避免依赖多个脚本命中顺序。新版加密播放响应在设备本地处理；播放密钥只放在当前代理客户端的本地存储中，不记录到日志，也不转交外部 Worker。双语合成只额外向 YouTube 获取对应原字幕，不需要购买翻译 API 或填写密钥。

只匹配 YouTube 已知 API、`initplayback` 与字幕接口，解密主机为 `youtubei.googleapis.com`、`youtubei-att.googleapis.com`、`www.youtube.com`、`m.youtube.com`、`*.googlevideo.com`。不会添加分流规则或修改现有代理策略。普通 `videoplayback` 媒体请求不运行本脚本。

翻译失败、接口限流、缺少播放密钥、未知结构或不支持的压缩格式会保留原响应。二进制响应处理上限为 8 MiB，字幕为 1 MiB。YouTube 客户端、HTTP/3 流量、接口改版和服务端广告实验均可能影响命中。视频内创作者口播广告不在自动清理范围内。

这是本次请求的去广告与字幕合并版；原有增强模块的其他画质、下载或界面设置未迁入本插件。

## 验证与排查

2026-10-16 已通过 **80 项本地测试**，覆盖五种客户端接口、原生二进制字段保留、加密响应、字幕时间轴、设置开关和失败透传。已成功处理真实公开 YouTube 播放器数据，保留其 52 条字幕轨道并新增 1 条双语轨道。公开字幕下载返回 HTTP 429，因此 **真实字幕下载、手机客户端导入、实际去广告及播放效果仍待真机验收**。

验证时先打开一个有英文字幕的视频，确认 CC 菜单出现新增轨道，并检查字幕为原文＋中文；再测试播放、拖动、切换视频及原本有广告的推荐列表。出现播放或字幕异常时，先停用本模块确认能否恢复，再检查是否仍启用了其他 YouTube 模块，以及对应域名是否成功解密。不要重复安装多个版本。

## 来源与版本固定

协议字段及广告识别基于 [Maasea/sgmodule（Apache-2.0）](https://github.com/Maasea/sgmodule/tree/65075cdb388fc5e3094afd7e7314c67b243f3525)，本地加密播放处理参考 [LuanRT/GoogleVideo（MIT）](https://github.com/LuanRT/GoogleVideo)，使用 noble 与 fflate；合并逻辑、双语合成与客户端适配为本仓库集成代码。相关许可证和修改说明保留在运行脚本及[源码目录](https://github.com/hhhoratioxu/Proxy/tree/28ac3725fe8e753a666c92625b2c308042d32150/Surge/script/YouTubeAdTranslate)。

运行脚本固定到提交 `28ac3725fe8e753a666c92625b2c308042d32150`，由客户端自动加载。主分支只提供当前安装入口和说明，无需另行下载 JS 或运行开发工具。

[返回 QuantumultX](../README.md)
