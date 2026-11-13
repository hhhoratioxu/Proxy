# Loon

2026-11-13 分流复核：保留 **26 类、5,927 条**默认条件，规则、跨端差异与验证结果见[官方依据优化报告](../Docs/Official-Optimization-2026-11-13.md)。原有订阅地址及安装入口继续使用。

[分流规则](./rule/) · [可导入插件](./script/) · [共用图标](../Icons/)

**AI 分流复核（2026-11-13）：961 条。** [直接订阅 AI.lsr](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/rule/AI.lsr) · [覆盖范围与使用说明](../Docs/AI-Routing.md) · [固定来源与授权](../Docs/AI-Sources.md)。原订阅地址继续使用，更新远程规则即可。

在 Loon「插件」中新增远程插件，粘贴对应安装文件的原始地址并启用。美团外卖插件要求 Loon 3.5.1 (983) 或更新版本，并启用对应 MitM；流媒体插件在查询入口中运行。

| 插件 | 安装文件原始地址 | 使用说明 |
| --- | --- | --- |
| YouTube Clean | [YouTubeClean.lpx](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/YouTubeClean.lpx) | [设置与验证范围](./Docs/YouTubeClean.md) |
| Spotify 双语歌词 · VerseLyrics | [SpotifyLyrics.lpx](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/SpotifyLyrics.lpx) | [设置与已知限制](./Docs/SpotifyLyrics.md) |
| 美团外卖去广告 | [MeituanWaimai.lpx](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/MeituanWaimai.lpx) | [说明](./Docs/MeituanWaimai.md) |
| 流媒体解锁查询 | [StreamingUnlock.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/StreamingUnlock.plugin) | 导入后使用客户端对应功能 |

每个插件只提供一个当前安装入口。运行依赖由客户端自动下载，维护校验位于 `tools/` 与 `tests/`，不参与客户端运行；重复验证方法见[开发说明](../Docs/Development.md)。

[Parsec 分流说明](../Clash/Docs/Parsec.md) · [目录说明](../Clash/Docs/Directory-Migration.md) · [返回首页](../README.md)

YouTube Clean 的正式入口使用 `.lpx`；已存在的 `.plugin` 仅兼容旧订阅，与正式入口内容相同，只启用一个。
