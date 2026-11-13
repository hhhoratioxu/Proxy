# Shadowrocket

2026-11-13 分流复核：保留 **26 类、5,926 条**默认条件，规则、跨端差异与验证结果见[官方依据优化报告](../Docs/Official-Optimization-2026-11-13.md)。原有订阅地址及安装入口继续使用。

[分流规则](./rule/) · [可导入插件](./script/) · [共用图标](../Icons/)

**AI 分流复核（2026-11-13）：961 条。** [直接订阅 AI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/rule/AI.list) · [覆盖范围与使用说明](../Docs/AI-Routing.md) · [固定来源与授权](../Docs/AI-Sources.md)。原订阅地址继续使用，更新远程规则即可。

在 Shadowrocket 的模块管理中添加下方远程模块并启用；美团外卖模块需要已配置的 HTTPS 解密证书。

| 插件 | 安装文件原始地址 | 使用说明 |
| --- | --- | --- |
| YouTube Clean · 去广告、双语字幕与底栏 | [YouTubeClean.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/YouTubeClean.sgmodule) | [设置与验证范围](./Docs/YouTubeClean.md) |
| Spotify 双语歌词 · VerseLyrics | [SpotifyLyrics.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/SpotifyLyrics.sgmodule) | [设置与已知限制](./Docs/SpotifyLyrics.md) |
| 美团外卖去广告 | [MeituanWaimai.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/MeituanWaimai.sgmodule) | [说明](./Docs/MeituanWaimai.md) |

每个插件只提供一个当前安装入口。运行依赖由客户端自动下载，维护校验位于 `tools/` 与 `tests/`，不参与客户端运行；重复验证方法见[开发说明](../Docs/Development.md)。

[Parsec 分流说明](../Clash/Docs/Parsec.md) · [目录说明](../Clash/Docs/Directory-Migration.md) · [返回首页](../README.md)
