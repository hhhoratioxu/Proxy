# Parsec 跨客户端分流 | Horatio

官方资料复核：2026-11-13。本页描述本次优化后的规则；公共 `main` 地址保持不变，在包含本次提交后提供更新内容。保留原有控制连接代理与 P2P 直连两组分类，不改用户的节点或策略名称。

## 默认行为

- Parsec 控制平面（`parsec.app` 等自有域名，登录/API/WebSocket）绑定代理策略。
- `stun.parsec.app`、`stun6.parsec.app` 绑定 DIRECT，排在控制规则之前。
- 能可靠读取本机进程的原生客户端，通过 Parsec 进程与 UDP 的 AND 条件补充 P2P 直连。
- UDP 来源埠 9000 无法证明进程身份，已移到独立可选文件；默认主列表不再匹配其他程序恰好使用该来源埠的流量。

| 客户端 | 控制连接（绑定你的代理组） | P2P（绑定 DIRECT） | 当前默认条件 |
| --- | --- | --- | --- |
| Loon | [Parsec.lsr](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/rule/Parsec.lsr) | [ParsecP2P.lsr](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/rule/ParsecP2P.lsr) | 两个 STUN；macOS `parsecd` + UDP。iOS/tvOS 忽略完整进程组合规则 |
| Surge | [Parsec.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Parsec.list) | [ParsecP2P.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/ParsecP2P.list) | 两个 STUN；Mac `parsecd` + UDP。iOS 不应用进程条件 |
| Egern | [Parsec.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/rule/Parsec.yaml) | [ParsecP2P.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/rule/ParsecP2P.yaml) | 两个 STUN；不添加缺少官方依据的端口/进程字段 |
| Quantumult X | [Parsec.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/rule/Parsec.list) | [ParsecP2P.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/rule/ParsecP2P.list) | 两个 STUN；开发者公开参考未记载 SRC-PORT，移除旧未限定 UDP 的条件 |
| Shadowrocket | [Parsec.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/rule/Parsec.list) | [ParsecP2P.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/rule/ParsecP2P.list) | 两个 STUN；保留原有语法，不根据其他软件猜测新条件 |
| Mihomo / Clash Verge Rev | [Parsec.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/rule/Parsec.yaml) | [ParsecP2P.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/rule/ParsecP2P.yaml) | 两个 STUN；`parsecd` / `parsecd.exe` + UDP，需要流量接管及进程识别 |

Loon 的进程规则依据现行[官方进程文档](https://nsloon.app/docs/Rule/process_rule/)；逻辑 AND 需要 3.1.7+，进程规则没有据此另猜最低版本。[Surge 进程规则](https://manual.nssurge.com/rules/process.html)仅适用于 Mac。Mihomo 使用自己的 `NETWORK,udp`，Loon/Surge 使用 `PROTOCOL,UDP`，不互相复制字段。

## 可选的来源埠兼容方式

已有用户如果明确依赖原来的 9000 兼容方式，可额外引用对应的本地文件，绑定 DIRECT 并排在控制规则之前。这三份文件不由扩展脚本自动启用，不计入原有 26 个类别：

| 客户端 | 可选规则文件 | 官方能力要求 |
| --- | --- | --- |
| Loon | [ParsecP2P-Port9000.lsr](../../Loon/rule/optional/ParsecP2P-Port9000.lsr) | Loon 3.1.7+，原生 AND / PROTOCOL / SRC-PORT |
| Surge | [ParsecP2P-Port9000.list](../../Surge/rule/optional/ParsecP2P-Port9000.list) | SRC-PORT：iOS 5.8.4+ / Mac 5.4.4+；原生 AND / PROTOCOL |
| Mihomo | [ParsecP2P-Port9000.yaml](../rule/optional/ParsecP2P-Port9000.yaml) | classical YAML；原生 AND / NETWORK / SRC-PORT |

先在 **Parsec > Settings > Network > Client Port** 设为 **9000**，然后按 Parsec 官方说明重启。只匹配 UDP 来源埠；不会把所有 UDP 3478 或目标埠 9000 强制直连。但同一来源埠也可能由其他程序使用，启用就接受这项边界。Quantumult X、Egern、Shadowrocket 没有增加未经官方资料确认的对应文件。

## 引用原有主规则

这些是规则集，策略在主配置引用时绑定。不要把规则集当作节点订阅；将 `TAG` 替换成你已有的节点或策略组。规则必须位于兜底之前，P2P 位于控制连接之前。

Surge / Shadowrocket，在已有 `[Rule]` 插入（这里以 Surge 地址示例，Shadowrocket 改用其自己的目录）：

```ini
RULE-SET,https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/ParsecP2P.list,DIRECT
RULE-SET,https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/Parsec.list,TAG
```

Quantumult X，在已有 `[filter_remote]` 插入：

```ini
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/rule/ParsecP2P.list, tag=Parsec P2P, force-policy=direct, enabled=true
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/rule/Parsec.list, tag=Parsec, force-policy=TAG, enabled=true
```

Egern，合并到已有 `rules:` 内部，不重复顶层键：

```yaml
rules:
  - rule_set:
      match: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/rule/ParsecP2P.yaml
      policy: DIRECT
  - rule_set:
      match: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/rule/Parsec.yaml
      policy: TAG
```

Mihomo，合并已有 `rule-providers:` 和 `rules:` 的内部内容：

```yaml
rule-providers:
  parsec-p2p:
    type: http
    behavior: classical
    format: yaml
    url: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/rule/ParsecP2P.yaml
    path: ./ruleset/parsec-p2p.yaml
    interval: 86400
  parsec-control:
    type: http
    behavior: classical
    format: yaml
    url: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/rule/Parsec.yaml
    path: ./ruleset/parsec-control.yaml
    interval: 86400
rules:
  - RULE-SET,parsec-p2p,DIRECT
  - RULE-SET,parsec-control,TAG
```

本格式针对 Mihomo，不保证旧 Clash 内核兼容。Clash Verge Rev 的扩展脚本继续管理原有主列表，保留已有策略绑定。

## 连接与验证边界

iPhone 上的 VPN 不能自动决定 Mac 的 Parsec 流量，除非 Mac 流量确实通过该网关。STUN 能通也不代表任意 NAT、防火墙、CGNAT 都允许 UDP P2P。需要进程判断时应核对连接日志中的真实可执行文件名，不能把缺少进程信息当成 Parsec。

控制连接可能访问共享 AWS S3 / CloudFront，不能代理整个 AWS/CDN。可按 Parsec 官方配置使用内置 app-level HTTP proxy 来处理 HTTP/WebSocket；不要据此扩大到全部 P2P UDP。规则模型、Mihomo 原生 `-t` 与真实连线结果分别记录，见[本轮优化报告](../../Docs/Official-Optimization-2026-11-13.md)。

## 官方依据

- [Parsec 连接要求](https://support.parsec.app/hc/en-us/articles/32381460716180-Parsec-Connectivity-Requirements) · [macOS 设置](https://support.parsec.app/hc/en-us/articles/32381394408596-Parsec-App-for-macOS) · [内置 HTTP 代理](https://support.parsec.app/hc/en-us/articles/32381443626516-All-Advanced-Configuration-Options)。
- [Loon 逻辑规则](https://nsloon.app/docs/Rule/logic_rule/) · [端口](https://nsloon.app/docs/Rule/port_rule/) · [进程](https://nsloon.app/docs/Rule/process_rule/)。
- [Surge 进程](https://manual.nssurge.com/rules/process.html) · [来源与端口](https://manual.nssurge.com/rules/source-and-port.html)。
- [Egern Rules](https://egernapp.com/docs/configuration/rules/) · [Quantumult X 开发者示例](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)。
- [Mihomo 路由规则](https://wiki.metacubex.one/en/config/rules/) · [规则提供者](https://wiki.metacubex.one/en/config/rule-providers/content/)。
