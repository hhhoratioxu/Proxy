# Egern

**StarDesk（2026-11-26）：** [直接订阅 StarDesk.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/rule/StarDesk.yaml) · [使用说明](../Docs/StarDesk-Routing.md)。建议 DIRECT；当前共 27 类，之前带日期的审核统计保留历史范围。

2026-11-13 分流复核：保留 **26 类、5,926 条**默认条件，规则、跨端差异与验证结果见[官方依据优化报告](../Docs/Official-Optimization-2026-11-13.md)。原有订阅地址及安装入口继续使用。

[分流规则](./rule/) · [可导入插件](./script/) · [共用图标](../Icons/)

**AI 分流复核（2026-11-13）：961 条。** [直接订阅 AI.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/rule/AI.yaml) · [覆盖范围与使用说明](../Docs/AI-Routing.md) · [固定来源与授权](../Docs/AI-Sources.md)。原订阅地址继续使用，更新远程规则即可。

在 Egern「模块」中新增远程模块，粘贴对应安装文件的原始地址并启用。模块会自动下载运行依赖；涉及 HTTPS 改写的模块需要已安装并信任的 HTTPS 解密证书。

| 插件 | 安装文件原始地址 | 使用说明 |
| --- | --- | --- |
| YouTube Clean · 去广告、双语字幕与底栏 | [YouTubeClean.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/YouTubeClean.yaml) | [设置与验证范围](./Docs/YouTubeClean.md) |
| 局域网绕过 | [LAN-Bypass.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/LAN-Bypass.yaml) | 导入后使用客户端对应功能 |
| 美团外卖去广告 | [MeituanWaimai.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/MeituanWaimai.yaml) | [说明](./Docs/MeituanWaimai.md) |
| 网络信息 | [NetworkInfo.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/NetworkInfo.yaml) | [说明](./Docs/NetworkInfo.md) |
| Spotify 双语歌词 | [SpotifyLyrics.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics.yaml) | [说明](./Docs/SpotifyLyrics.md) |
| 流媒体解锁查询 | [StreamingUnlock.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/StreamingUnlock.yaml) | [说明](./Docs/StreamingUnlock.md) |

每个插件只提供一个当前安装入口。运行依赖由客户端自动下载，维护校验位于 `tools/` 与 `tests/`，不参与客户端运行；重复验证方法见[开发说明](../Docs/Development.md)。

[Parsec 分流说明](../Clash/Docs/Parsec.md) · [目录说明](../Clash/Docs/Directory-Migration.md) · [返回首页](../README.md)
