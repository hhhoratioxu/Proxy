# YouTube Clean · Loon

**1.0.0 独立重写版**：一个插件包含去广告、双语字幕，以及底部发布「＋」和 Shorts 的独立隐藏开关。

[安装 YouTubeClean.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/YouTubeClean.plugin)

## 安装与设置

需要 Loon 3.5.1（983）或更新版本。在插件管理中添加上方链接，再进入插件设置，分别切换「隐藏底部发布＋」与「隐藏底部 Shorts」。

先删除或停用旧的 YouTubeAdTranslate、YouTubeEnhance，以及其他处理相同流量的 YouTube 插件。新入口不会自动删除手机上已经安装的旧模块。只保留这一套，确认客户端已开启 HTTPS 解密，并已安装和信任你自己的解密证书；运行脚本由客户端自动下载，无需单独安装 JS。

| 设置 | 默认 | 含义 |
| --- | --- | --- |
| `HIDE_UPLOAD` | `true` | 隐藏底部发布「＋」按钮 |
| `HIDE_SHORTS` | `false` | 隐藏底部 Shorts 按钮 |
| `REMOVE_ADS` | `true` | 清理已识别的播放器及信息流广告 |
| `TRANSLATE_CAPTIONS` | `true` | 为已有字幕添加翻译轨道 |
| `TARGET_LANGUAGE` | `zh-Hans` | 简体中文；可选 `zh-Hant`、`en`、`ja`、`ko` 等 |
| `BILINGUAL` | `true` | 原文在上，译文在下 |
| `AUTO_CAPTIONS` | `true` | 优先选择新增字幕轨道；仍受 App 行为影响 |

两个底栏开关相互独立。想同时隐藏发布「＋」与 Shorts，设置 `HIDE_UPLOAD=true` 和 `HIDE_SHORTS=true`；全部保留则都设为 `false`。关闭广告和翻译后，底栏设置仍然生效。这两个设置只控制底栏按钮，保留普通 Shorts 视频内容。

保存后强制退出 YouTube，再重新打开。客户端可能缓存导航或字幕列表；如果立即切换仍未变化，请先确认新模块已重新加载、旧模块已停用，以及 `guide` 接口确实被 HTTPS 解密。

## 字幕与广告

默认在字幕菜单中新增「双语字幕 · 简体中文」轨道，保留原有轨道。原文在上、中文在下。视频必须已有原字幕或 YouTube 自动字幕，且对应字幕可翻译；本插件不能为无字幕视频生成语音识别。

清理已知播放器广告、广告断点参数和信息流广告卡片；处理支持的加密播放元数据。广告策略和字幕/底栏处理器由本实现编写，不加载旧 YouTube 插件。通用加密与压缩库及 MIT 协议字段声明有明确许可，见[源码、构建与许可](https://github.com/hhhoratioxu/Proxy/tree/749d68f4530323f924b3bd7a9cf1bc272d4bfeff/Surge/script/YouTubeClean)。

## 工作范围与失败处理

只运行于已列出的 YouTube API、`initplayback` 与字幕 URL。解密主机为 `youtubei.googleapis.com`、`youtubei-att.googleapis.com`、`www.youtube.com`、`m.youtube.com`、`*.googlevideo.com`。普通 `videoplayback` 不运行响应脚本，模块不添加路由规则或替换代理策略。

二进制未知字段保留原始字节，错误数据、认证失败、缺少密钥、不支持的压缩或翻译下载失败保留原响应。播放密钥仅保存在当前代理客户端本地，不输出到日志。双语合成最多向同一 YouTube 原字幕地址额外请求一次，4 秒限时，不转发账号 Cookie 或 Authorization，无需付费翻译密钥。二进制上限 8 MiB，字幕上限 1 MiB。

服务端广告实验、不同 App 版本、缓存和 HTTP/3 可能影响命中，不能保证清除所有广告或所有布局的按钮。创作者口播推广不在清理范围内。

## 验证状态

2026-10-16：**61 项本地检查通过**，包括五种客户端接口模拟、开关组合、原始字段保留、独立加密校验、gzip、失败回退与字幕时间轴合成。真实公开 iOS 原生 player 响应由 71,245 字节改为 71,634 字节，52 条原字幕轨道逐字节保留，新增 1 条翻译轨道；除字幕和已知广告字段外的顶层数据逐字节保留。

匿名 guide 响应证实了在线/离线底栏结构，但该样本未出现发布「＋」与 Shorts；删除这两个按钮仅用结构一致的自写样本验证。真实 player 样本仅含广告心跳字段，没有投放中的广告视频。公开字幕下载返回 HTTP 429。

**尚未完成原生手机客户端导入、实际去广告、按钮隐藏、字幕显示、拖动和连续播放的真机验收。** 请以你当前客户端的实际流量和界面为准；出现播放异常时可停用模块并检查旧模块冲突及 HTTPS 解密状态。

[返回客户端说明](../README.md) · [所有客户端入口](../../README.md)
