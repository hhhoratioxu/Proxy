# 美团外卖去广告 · Clash/Mihomo 兼容性

核对日期：2026-10-15

Clash/Mihomo 标准核心当前不能原生运行本项目的美团外卖响应改写脚本，因此本目录没有可导入的同等去广告模块。

本项目已知的开屏接口位于 `wmapi.meituan.com`，其中 `loadInfo` 同时包含其他启动配置，需要按 JSON 字段清理。Mihomo 的域名、IP、进程等路由规则不能直接完成这项操作；域名嗅探用于获取路由所需的主机信息，也不等于 HTTPS 解密和响应改写。

Clash Verge Rev 的扩展脚本用于生成或修改订阅配置，不是处理每个 HTTP 响应的脚本运行时，无法直接执行其他客户端的 `$request` / `$response` / `$done` 脚本。

## 已发布的客户端版本

| 客户端 | 配置与说明 |
| --- | --- |
| Egern | [模块](../../Egern/script/MeituanWaimai.yaml) · [安装说明](../../Egern/Docs/MeituanWaimai.md) |
| Loon | [插件](../../Loon/script/MeituanWaimai.plugin) · [安装说明](../../Loon/Docs/MeituanWaimai.md) |
| Surge | [模块](../../Surge/script/MeituanWaimai.sgmodule) · [安装说明](../../Surge/Docs/MeituanWaimai.md) |
| Shadowrocket | [模块](../../Shadowrocket/script/MeituanWaimai.sgmodule) · [安装说明](../../Shadowrocket/Docs/MeituanWaimai.md) |
| Quantumult X | [重写资源](../../QuantumultX/script/MeituanWaimai.conf) · [安装说明](../../QuantumultX/Docs/MeituanWaimai.md) |
| Clash Verge Rev / Mihomo | 本文的兼容性说明；没有原生同等实现。 |

上述模块均针对已知开屏广告，未宣称覆盖所有广告，且仍需要客户端与手机实测。

## 使用边界

不能通过拒绝整个 `meituan.com`、`wmapi.meituan.com` 或美团共用图片域名替代这项功能，否则可能连正常页面和点餐请求一起阻断。仓库已有的 `Rules/Meituan.yaml` 是业务分流规则，也不应当作为广告规则整体拒绝。

如果将来有独立广告域名的真实流量证据，可以再制作仅针对这些域名的有限规则。在没有该证据时，本仓库不提供声称能去除上述开屏广告的空规则文件。

## 依据

- [Mihomo 官方路由规则](https://wiki.metacubex.one/config/rules/)。
- [Mihomo 官方域名嗅探说明](https://wiki.metacubex.one/config/sniff/)。
- [仓库现有 Clash Verge Rev 扩展脚本](../script/VergeRev.js)，其 `main(config)` 仅处理配置。
- [返回 Clash 入口](../README.md)。
