# Loon

[分流规则](./rule/) · [可导入插件](./script/) · [共用图标](../Icons/)

在 Loon「插件」中新增远程插件，粘贴对应安装文件的原始地址并启用。美团外卖插件要求 Loon 3.5.1 (983) 或更新版本，并启用对应 MitM；流媒体插件在查询入口中运行。

| 插件 | 安装文件原始地址 | 使用说明 |
| --- | --- | --- |
| Spotify 双语歌词 · VerseLyrics | [SpotifyLyrics.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/SpotifyLyrics.plugin) | [设置与已知限制](./Docs/SpotifyLyrics.md) |
| 美团外卖去广告 | [MeituanWaimai.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/MeituanWaimai.plugin) | [说明](./Docs/MeituanWaimai.md) |
| 流媒体解锁查询 | [StreamingUnlock.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/StreamingUnlock.plugin) | 导入后使用客户端对应功能 |

每个插件只提供一个当前安装入口。运行依赖由客户端自动下载，主分支不放测试、构建工具、开发压缩包或单独的依赖源码。

[Parsec 分流说明](../Clash/Docs/Parsec.md) · [目录说明](../Clash/Docs/Directory-Migration.md) · [返回首页](../README.md)
