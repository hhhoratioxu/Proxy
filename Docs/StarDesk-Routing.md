# StarDesk 跨客户端分流

更新：2026-11-26，版本 1.1.0。独立分类，Loon/Surge 各 2 条，Clash 3 条，其余三端各 1 条。保留原有分类，共 27 类；原订阅 URL 不变。

## 直接订阅

| 客户端 | Raw 订阅 | 建议策略 |
| --- | --- | --- |
| Loon | [StarDesk.lsr](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/rule/StarDesk.lsr) | DIRECT |
| Surge | [StarDesk.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/StarDesk.list) | DIRECT |
| Shadowrocket | [StarDesk.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/rule/StarDesk.list) | DIRECT |
| QuantumultX | [StarDesk.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/rule/StarDesk.list) | DIRECT |
| Egern | [StarDesk.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/rule/StarDesk.yaml) | DIRECT |
| Clash | [StarDesk.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/rule/StarDesk.yaml) | DIRECT |

## 范围和依据

- `stardesk.net`：StarDesk 官网及其子域名，官网公开的 Windows/macOS 下载链接指向 `api.stardesk.net`。使用一个边界明确的后缀条件即可，无需重复列出子域名。
- 官方连接说明确认 P2P 优先，失败后使用加密 Relay；支持 IPv6。没有公开完整的信令、STUN、Relay 端点及地址清单，故不声称覆盖全部会话流量。
- 官网还引用共享 CDN 和第三方服务。未将 `adl.guinfra.com`、整个 GearUP 域名、共享云地址、通用 STUN/UDP 端口或猜测的域名加入规则。
- 官方依据：[StarDesk 官网](https://www.stardesk.net/) · [连接与安全说明](https://www.stardesk.net/lp/main/) · [登录说明](https://www.stardesk.net/help/step-2.html)。

## 桌面进程匹配

- Loon for Mac / Surge Mac：`PROCESS-NAME,StarDesk`，macOS 已观察到的应用进程名；匹配该进程可识别的 TCP 与 UDP，不限定端口。iOS 不使用进程规则。
- Mihomo：`PROCESS-NAME,StarDesk` 与 `PROCESS-NAME,StarDesk.exe`。Windows 名称有第三方[启动项数据库记录](https://www.glarysoft.com/startups/stardesk/stardeskexe/641483)，尚未核对实际安装版本的可执行文件和辅助进程。需启用适当的流量接管及进程识别，不能保证路由器转发流量有进程信息。
- Egern、Quantumult X、Shadowrocket：保留已验证的域名格式，不猜测进程规则字段。
- 规则依据：[Loon 进程规则](https://nsloon.app/docs/Rule/process_rule/) · [Surge 进程规则](https://manual.nssurge.com/rules/process.html) · [Mihomo 路由规则](https://wiki.metacubex.one/en/config/rules/) · [Egern 规则字段](https://egernapp.com/docs/configuration/rules/)。

## 使用方法

Loon：在远程规则中新增链接，策略选 DIRECT，启用并排在通用代理/兜底规则之前。规则文件不写死策略。

```ini
[Remote Rule]
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/rule/StarDesk.lsr, policy=DIRECT, tag=StarDesk, enabled=true
```

Surge / Shadowrocket：在已有 [Rule] 中使用 RULE-SET 引用各自链接并指定 DIRECT。

Quantumult X：在已有 [filter_remote] 中引用其 HOST-SUFFIX 列表，设 `force-policy=direct`。

Egern：在已有 rules 中添加 rule_set，match 为 Egern 链接，policy 为 DIRECT。

Mihomo：使用 classical YAML provider，RULE-SET 指向 DIRECT；仓库 Clash Verge Rev 扩展脚本已包含 StarDesk，保留已存在的自定义策略和提供者设置。

## P2P 排查及限制

域名直连只影响客户端能识别并匹配的域名请求，不会自动识别原始 IP 上的点对点媒体流或保证 NAT 穿透。使用 StarDesk 时检查两端连接日志和实际 P2P/Relay 状态；若登录或控制连接无法直连，可自行改为可用代理策略。桌面主进程规则已加入；若媒体流仍被错误代理，核对日志中的实际辅助进程及其流量归属后再扩充，不假定所有流量都来自主进程。不要将全部 UDP、共享 IP、Tailscale 出口节点或其他服务统一改为直连作为此规则的一部分。

本次添加离线进程匹配正反例、平台限制和 TCP/UDP 用例；未完成真实设备抓包、客户端导入和 NAT 穿透测试。
