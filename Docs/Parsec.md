# Parsec 跨客户端分流 | Horatio

更新：2026-10-08

## 目的

- Parsec 控制平面（`parsec.app` 等自有域名，登录/API/WebSocket）→ **代理**。
- Parsec STUN → **DIRECT**。
- Parsec 客户端 UDP P2P → **尽量 DIRECT**；只在软件有足够规则匹配能力、且网络本身允许 P2P 时实现。
- 不代理或劫持所有 UDP 3478，不把所有 UDP 9000 **目标端口**强制直连。

## 规则集地址

| 客户端 | 代理规则（策略选 TAG / 你的节点组） | 直连规则（策略选 DIRECT） | UDP P2P 能力 |
|---|---|---|---|
| Loon | [Parsec.lsr](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Rules/Parsec.lsr) | [ParsecP2P.lsr](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Rules/ParsecP2P.lsr) | UDP + SRC-PORT 9000 |
| Egern | [Parsec.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Rules/Parsec.yaml) | [ParsecP2P.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Rules/ParsecP2P.yaml) | STUN 域名直连；未使用缺乏官方依据的源端口规则 |
| Quantumult X | [Parsec.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Rules/Parsec.list) | [ParsecP2P.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Rules/ParsecP2P.list) | STUN + SRC-PORT 9000（依赖客户端版本/实际接管） |
| Shadowrocket | [Parsec.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/Rules/Parsec.list) | [ParsecP2P.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/Rules/ParsecP2P.list) | STUN 域名直连；无法可靠匹配任意对端 IP 的 P2P UDP |
| Surge | [Parsec.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/Rules/Parsec.list) | [ParsecP2P.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/Rules/ParsecP2P.list) | Mac 上 PROCESS-NAME + UDP；另备 UDP SRC-PORT 9000 |
| Clash Verge / Mihomo | [Parsec.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Parsec.yaml) | [ParsecP2P.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/ParsecP2P.yaml) | PROCESS-NAME + UDP 或 UDP SRC-PORT 9000，需 TUN/UDP 流量被接管 |

## 正确使用

1. 若要按端口分流，在 **Parsec for macOS > Settings > Network > Client Port** 设置 **9000** 并 **Restart**（官方建议端口；原默认 0 为随机）。
2. **DIRECT 规则集要排在 PROXY 规则集之前**，且两者均要高于可能冲突的兜底 / 通用规则。
3. 这都是**规则集**，不是节点订阅。策略在客户端引用规则集时绑定。
4. 当 Loon / Quantumult X / Shadowrocket 运行在 **iPhone** 上时，不能自动决定 **Mac** 上的 Parsec 流量去向。除非你的 Mac 的流量实际经过其 VPN/代理网关。
5. SRC-PORT,9000 在一些软件中可能会误匹配其他使用相同源端口的进程；PROCESS-NAME 规则在能够读取进程信息的平台更精确。
6. STUN 成功不等于 UDP P2P 成功：CGNAT、运营商 NAT、主机防火墙仍可能阻碍直连。
7. Parsec 控制请求可能访问 AWS S3 / CloudFront 等共享域名，避免代理整个 AWS/CDN。需要更精确的启动/登录代理可使用 Parsec 官方的 **app-level HTTP proxy**（HTTP/WebSocket），其本身不要求将 P2P UDP 代理。

### Surge 配置示例

在 `[Rule]` 相对靠前的位置：

```ini
RULE-SET,https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/Rules/ParsecP2P.list,DIRECT
RULE-SET,https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/Rules/Parsec.list,TAG
```

将 `TAG` 改成实际存在的节点/策略组。

### Quantumult X 配置示例

在 `[filter_remote]`，先直连后代理：

```ini
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Rules/ParsecP2P.list, tag=Parsec P2P, force-policy=direct, enabled=true
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Rules/Parsec.list, tag=Parsec, force-policy=TAG, enabled=true
```

### Shadowrocket 配置示例

在 `[Rule]`：

```ini
RULE-SET,https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/Rules/ParsecP2P.list,DIRECT
RULE-SET,https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/Rules/Parsec.list,TAG
```

### Egern 配置示例

在配置中的 `rules:` 顶部追加（或使用 Egern 远程规则集 UI 绑定策略）：

```yaml
rules:
  - rule_set:
      match: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Rules/ParsecP2P.yaml
      policy: DIRECT
  - rule_set:
      match: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Rules/Parsec.yaml
      policy: TAG
```

若原文件已有 `rules:`，只插入下面两个 `- rule_set:` 项，不要重复顶层 `rules:`。

### Mihomo / Clash Verge Rev 配置示例

添加两个 `rule-providers`，并在已有 `rules:` 顶部引用：

```yaml
rule-providers:
  parsec-p2p:
    type: http
    behavior: classical
    format: yaml
    url: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/ParsecP2P.yaml
    path: ./ruleset/parsec-p2p.yaml
    interval: 86400
  parsec-control:
    type: http
    behavior: classical
    format: yaml
    url: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/Rules/Parsec.yaml
    path: ./ruleset/parsec-control.yaml
    interval: 86400

rules:
  - RULE-SET,parsec-p2p,DIRECT
  - RULE-SET,parsec-control,TAG
```

若已有 `rule-providers:` 或 `rules:` 顶层键，只合并**内部内容**，不要复制整个顶层键。这里的 `TAG` 也须改为你的实际策略组名称。本格式为 **Mihomo (Clash.Meta)**，不保证兼容旧 Clash 内核。

## 来源

- [Parsec 连接要求](https://support.parsec.app/hc/en-us/articles/32381460716180-Parsec-Connectivity-Requirements)
- [Parsec for macOS 网络设置](https://support.parsec.app/hc/en-us/articles/32381394408596-Parsec-App-for-macOS)
- [Parsec 内置 HTTP 代理](https://support.parsec.app/hc/en-us/articles/32381443626516-All-Advanced-Configuration-Options)
- [Egern 规则集文档](https://egernapp.com/docs/configuration/rules/)
- [Surge 端口规则文档](https://manual.nssurge.com/rules/source-and-port.html)
- [Mihomo 路由规则](https://wiki.metacubex.one/en/config/rules/)
- [Mihomo Rule Providers](https://wiki.metacubex.one/en/config/rule-providers/content/)
- [Quantumult X 参考配置](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)

**规则是静态配置，不保证在所有版本或所有运营商网络上实现实际 P2P 直连。**
