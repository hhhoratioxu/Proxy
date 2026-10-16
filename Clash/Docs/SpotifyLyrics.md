# Spotify 歌词与 Clash / Mihomo

VerseLyrics 需要读取并改写 Spotify HTTPS 响应中的 JSON / Protobuf 歌词。Clash / Mihomo 本身不提供这种 HTTPS 解密加 JavaScript 响应体改写接口，Clash Verge Rev 扩展脚本用于生成配置，不能当作歌词处理器。因此本仓库不提供一个只导入配置却不能补词的 Clash 版本。

可用安装入口见[仓库首页的五客户端表](../../README.md#spotify-双语歌词--verselyrics)。五个受支持客户端已统一更新到 0.5.3，优化播放器入口的 JSON / Protobuf 解析内存；保留六源、翻译及原生高亮，缓存和联网预算不变。Loon 已有用户确认补词成功；Egern 的无词问题仍未解决，其他客户端的实际显示效果尚未实机验证。

依据：[Mihomo 配置文档](https://wiki.metacubex.one/config/)。

[返回 Clash](../README.md)
