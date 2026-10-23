# Spotify 歌词与 Clash / Mihomo

VerseLyrics 需要读取并改写 Spotify HTTPS 响应中的 JSON / Protobuf 歌词。Clash / Mihomo 本身不提供这种 HTTPS 解密加 JavaScript 响应体改写接口，Clash Verge Rev 扩展脚本用于生成配置，不能当作歌词处理器。因此本仓库不提供一个只导入配置却不能补词的 Clash 版本。

可用安装入口见[仓库首页的五客户端表](../../README.md#spotify-双语歌词--verselyrics)。五个受支持客户端已统一更新到 3.1.9，中文夹英文按片段翻译，中文原字形保留，纯简繁互译过滤，旧缓存自动按行重查；官方静态歌词仍寻找真实同步来源，六源补词与原生高亮保留。Loon 已有用户确认补词成功；Egern 的无词问题仍未解决，其他客户端的实际显示效果尚未实机验证。

依据：[Mihomo 配置文档](https://wiki.metacubex.one/config/)。

[返回 Clash](../README.md)
