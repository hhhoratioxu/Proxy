# Quantumult X（QuanX）

2026-11-13 分流复核：保留 **26 类、5,926 条**默认条件，规则、跨端差异与验证结果见[官方依据优化报告](../Docs/Official-Optimization-2026-11-13.md)。原有订阅地址及安装入口继续使用。

[分流规则](./rule/) · [可导入插件](./script/) · [共用图标](../Icons/)

**AI 分流复核（2026-11-13）：961 条。** [直接订阅 AI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/rule/AI.list) · [覆盖范围与使用说明](../Docs/AI-Routing.md) · [固定来源与授权](../Docs/AI-Sources.md)。原订阅地址继续使用，更新远程规则即可。

Spotify 歌词及美团外卖 `.conf` 添加到「重写 → 引用」；流媒体 `.json` 添加到「任务 → 资源库」。两者都通过对应资源入口导入，不用复制配置片段或另行安装 JS。

| 插件 | 安装文件原始地址 | 使用说明 |
| --- | --- | --- |
| YouTube Clean · 去广告、双语字幕与底栏 | [YouTubeClean.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/YouTubeClean.conf) | [设置与验证范围](./Docs/YouTubeClean.md) |
| Spotify 双语歌词 · VerseLyrics | [SpotifyLyrics.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/SpotifyLyrics.conf) | [设置与已知限制](./Docs/SpotifyLyrics.md) |
| 美团外卖去广告 | [MeituanWaimai.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/MeituanWaimai.conf) | [说明](./Docs/MeituanWaimai.md) |
| 流媒体解锁查询 | [StreamingUnlock.json](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/StreamingUnlock.json) | [说明](./Docs/StreamingUnlock.md) |

每个插件只提供一个当前安装入口。运行依赖由客户端自动下载，维护校验位于 `tools/` 与 `tests/`，不参与客户端运行；重复验证方法见[开发说明](../Docs/Development.md)。

[Parsec 分流说明](../Clash/Docs/Parsec.md) · [目录说明](../Clash/Docs/Directory-Migration.md) · [返回首页](../README.md)
