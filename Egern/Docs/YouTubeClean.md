# YouTube Clean 1.2.4 · Egern

一个插件包含去广告、双语字幕及发布「＋」/Shorts 独立开关，默认开启深层过滤。此后统一使用下面这一个安装入口更新。

[安装 YouTubeClean.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/YouTubeClean.yaml)

## 本次主页广告修复

1.2.4 修复用户最新日志中的 `full_width_square_image_layout` 图片广告漏识别，并一并补齐图片、轮播、品牌及视频展示广告的 11 个完整布局标识。1.2.3 虽已解析卡片，但仅补齐两个视频广告布局，仍遗漏本次方形图片广告。普通视频 `video_lockup_with_attachment`、分隔项 `cell_divider` 和未知数据保留；社区帖子及普通购物列表不会仅凭名称被本次规则删除。广告布局用途与 [固定公开源码](https://github.com/PoomSmart/YouTube-X/blob/48b901532f9e12152684f3326d4250efcdea61e5/Tweak.x) 交叉核对，未引入其运行代码，MIT 许可保存在固定源码版本并嵌入运行脚本。

`matchedAdTemplates` 表示识别出的广告模板；结合 `reason=modified` 和 `removedParts` 可以确认这次响应产生了修改。主页卡片过滤不依赖播放密钥，`keyState=missing` 不会阻止本次图片广告处理。继续使用同一个安装入口，在客户端更新后确认名称为 1.2.4，再重启 YouTube、刷新主页。

## 安装和使用

在模块管理中添加远程模块，在模块设置调整开关。需要支持原生 ESM 和环境变量的当前版本。

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

2026-10-19：**127 项本地检查通过**，覆盖五种客户端接口、唯一 Loon 入口及默认深层参数、gzip、加密与明文播放元数据、字幕、底栏、错误恢复和日志隐私。此前公开主页样本加入自写广告的混合测试可以保留其余真实响应字节，原始匿名样本没有实际投放的主页广告。

已复现 1.2.3 的图片布局漏识别：新增 10 项回归检查中 8 项修复前失败、修复后通过。11 张卡片的首页和分页测试删除目标图片广告、精确保留其余 10 张及其他原始字段，缺少播放密钥时同样有效。数据按观察到的布局独立构造，尚未获得用户原始响应或修复后的手机结果。实际广告去除、字幕显示、Shorts 隐藏与连续播放仍需真机确认，本地检查不等同于 iPhone VPN 稳定性验收。

[源码、测试与许可](https://github.com/hhhoratioxu/Proxy/tree/34c2f9f6b143808b41f7e33ade24c833da0a8202/Surge/script/YouTubeClean) · [客户端说明](../README.md) · [所有客户端入口](../../README.md)
