# YouTube Clean 1.2.3 · Surge

一个插件包含去广告、双语字幕及发布「＋」/Shorts 独立开关，默认开启深层过滤。此后统一使用下面这一个安装入口更新。

[安装 YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/YouTubeClean.sgmodule)

## 本次主页广告修复

1.2.3 补齐 `video_display_full_buttoned_layout` 和 `video_display_full_layout` 两个广告布局的完整标识匹配。前者实际出现在用户的主页响应日志中，旧版已解析卡片但没有删除。普通视频 `video_lockup_with_attachment`、分隔项 `cell_divider` 及未知数据保留。广告布局用途与 [固定公开源码](https://github.com/PoomSmart/YouTube-X/blob/48b901532f9e12152684f3326d4250efcdea61e5/Tweak.x) 交叉核对，未引入该项目运行代码，MIT 许可保存在固定源码版本并嵌入运行脚本。

新版诊断增加 `matchedAdTemplates`，表示识别出的广告模板；结合 `reason=modified` 和 `removedParts` 可以确认这次响应产生了修改。继续使用同一个安装入口，在客户端更新后确认名称为 1.2.3，再重启 YouTube、刷新主页。

## 安装和使用

在模块管理中添加远程模块，在模块参数中调整开关。

停用之前安装的分版及其他处理相同请求的 YouTube 插件，仅启用 YouTube Clean。原有分版订阅需要移除，GitHub 删除文件不会自动停用手机上的旧配置。确认已安装并信任你自己的 HTTPS 解密证书，并开启客户端解密。保存后强制退出 YouTube，再重新打开并下拉刷新主页。

| 设置 | 默认 | 用途 |
| --- | --- | --- |
| `REMOVE_ADS` | `true` | 广告处理 |
| `TRANSLATE_CAPTIONS` | `true` | 已有字幕翻译 |
| `TARGET_LANGUAGE` | `zh-Hans` | 简体中文，可选繁体等 |
| `BILINGUAL` | `true` | 原文在上、译文在下 |
| `AUTO_CAPTIONS` | `true` | 优先新增字幕轨道 |
| `HIDE_UPLOAD` | `true` | 隐藏底部发布「＋」 |
| `HIDE_SHORTS` | `false` | 隐藏底部 Shorts，普通 Shorts 视频保留 |
| `DEEP_FILTER` | `true` | 检查单张卡片内部的广告封装、徽标及推广/试用模板 |
| `DIAGNOSTICS` | `true` | 输出处理结果，可关闭 |

用户以前保存的开关可能优先于新的默认值，更新时可检查「深层广告与推广过滤」是否开启。

## 处理范围

保留原始 gzip、明文 Onesie 与经过认证的加密播放元数据处理。主页沿已确认的首页/分页路径识别传统广告字段和元素模板；深层模式只检查单张卡片，不扫描整个账号或全局模板资源。命名规则属于启发式识别，仍可能漏掉不同的服务端广告实验，也会隐藏推广与试用卡片。创作者口播推广不在自动处理范围内。

翻译依赖视频已有字幕及 YouTube 翻译，原轨道保留；没有字幕时无法生成语音识别字幕。原字幕下载最多一次，限时 4 秒，不转发账号凭证、不跟随重定向，无需购买翻译 API。

二进制处理上限 8 MiB、字幕 1 MiB。未修改时保留原响应；未知格式、错误数据、认证失败或不支持的压缩直接放行，缺少密钥时保留加密元数据。普通 videoplayback 不运行响应脚本。客户端可能已读取完整正文，脚本内的长度限制不代表宿主进程峰值内存保证。

## 仍显示广告时

开启「输出结构诊断日志」，刷新主页后复制以 `[YouTubeClean]` 开头的行。主页广告优先看 `endpoint` 为 `browse` 的记录；`initplayback` 是播放封装接口，执行完成本身不能证明主页卡片已被清理。

`reason=modified` 表示修改了响应，`unchanged` 表示未产生改动，`key-missing`/`key-expired` 表示缺少有效播放密钥，`decode-failed` 表示解析失败。诊断只输出固定接口名称、处理原因、布尔开关、大小、密钥状态和有限结构标识，不含 Cookie、Authorization、账号、视频标题、完整 URL、字幕签名或密钥内容。没有弹窗、定时任务或外部上报。

## 验证与源码

2026-10-19：**117 项本地检查通过**，覆盖五种客户端接口、唯一 Loon 入口及默认深层参数、gzip、加密与明文播放元数据、字幕、底栏、错误恢复和日志隐私。此前公开主页样本加入自写广告的混合测试可以保留其余真实响应字节，原始匿名样本没有实际投放的主页广告。

已根据用户的实际主页日志定位并修复一个明确的广告模板漏识别。回归数据按观察到的布局独立构造，尚未获得用户原始响应或修复后的手机结果。实际广告去除、字幕显示、Shorts 隐藏与连续播放仍需真机确认，本地检查不等同于 iPhone VPN 稳定性验收。

[源码、测试与许可](https://github.com/hhhoratioxu/Proxy/tree/5a6b71f48e19df72498173b938d32a45c1143849/Surge/script/YouTubeClean) · [客户端说明](../README.md) · [所有客户端入口](../../README.md)
