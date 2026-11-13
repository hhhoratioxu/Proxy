# 官方依据优化 · 2026-11-13

状态：用户已授权将本轮优化提交并推送到 GitHub main；本轮不创建 GitHub Release。保留现有 **26 类 × 6 端 = 156 份主规则**；另有 **3 份明确选用的 Parsec 来源埠兼容文件**，不是新增默认类别。公共 `main` 订阅在包含本次提交后提供更新规则。

本轮接续[接手第一阶段](./Audit-2026-11-13.md)，默认序列化条件从 **45,548 → 35,513**，净减少 **10,035 条（22.03%）**。这表示六端合计的条目数量，不能换算成设备性能、省电、准确率或 VPN 稳定性百分比。本轮规则候选相对第一阶段备份修改 106 份主规则；与 Git main 的总差异还包含接手时原有修改及第一阶段修复，不能全部归因于本阶段。

机器可读的逐项撤出原因、等价覆盖关系、106 份文件修改前后 SHA-256、完整当前清单和离线验证结果见[差异数据](./Rule-Optimization-2026-11-13.json)。固定维护策略见[official-routing-policy.json](../tools/official-routing-policy.json)，不会自动抓取、信任或合并上游。旧快照继续保留，所有改动可追溯。

## 已处理的规则问题

| 项目 | 结果与依据 |
| --- | --- |
| 无边界关键词 | 移除余下 16 条逻辑条件的六端版本：AI 1、Apple 7、Netflix 4、Telegram 2、TikTok/Twitter 各 1。保留专用精确域名和有标签边界的后缀。默认清单不再有 DOMAIN-KEYWORD / HOST-KEYWORD。 |
| 共享云/CDN 命名空间 | 撤出 12 项没有该服务专属依据的匹配：AI 的 byteoversea 根及一个旧平台主机；Apple 的 Crashlytics；Disney/HBOMAX 的区域 API Gateway 根；Disney 的通用 Adobe/Optimizely 主机；Microsoft 的通用 Akamai 与 Optimizely 根。详见固定策略每项来源。 |
| Netflix 历史 IP | 旧 1115 条 IPv4 中只保留 14 条经过全范围注册核对的既有网络，4 条 IPv6 保留。其余 1101 条 IPv4 不再默认认作 Netflix 专属；1088 条与当日 AWS 官方地址数据重叠，其余含 ISP/CDN/其他组织资源。重叠或注册归属不是“从未服务 Netflix”的证明，而是不足以默认专属归类。 |
| 其他服务历史 IP/ASN | 审核 165 项：保留有第一方地址清单或完整注册区间依据的 50 项旧条件；撤出 115 项旧条件，包括 Meta 31、Bilibili 8、WeChat 68、Apple 1、Telegram 7。不是凭 IP 片段补网段。Google 现有 5 段由当前官方地址清单覆盖；Meta 的 108.177.8.0/21 实为 Google 清单范围。 |
| Telegram 当前地址 | 收录官方 CIDR 文本的全部 14 段，并保留另外核对的 109.239.140.0/24 与 5 个 Telegram 注册 ASN。91.108.0.0/16 等旧范围换成明确列出的范围，IPv6 保持官方边界；没有把 ASN 改成其他组织的猜测范围。 |
| 同组冗余 | 删除 429 条被本组现有后缀完整覆盖的域名条件，以及 11 条被同 DNS 旗标父网络完整覆盖的 CIDR。共 440 份等价覆盖记录；不合并相邻网络，不扩张地址范围，不跨策略组删条件。 |
| DNS 旗标 | Loon/Surge/Mihomo 按原生 no-resolve 处理纯 IP；Egern 使用官方集合级 no_resolve。消除第一阶段记录的 21 项混合旗标差异。Quantumult X 不移植未记载的 no-resolve；Shadowrocket 保留其原有 ASN 无选项形状。 |
| 优先级 | SiriAI → AI → 一般服务；NTP、Parsec STUN 在对应通用集合前；GitHub 专属 Azure 租户在 Microsoft 前；Apple/Disney 已有的专属 Adobe 租户在 Adobe 前。Clash 扩展脚本已实现，保留原有节点、策略组、提供者选项、自定义规则与绑定策略。其他五端由各自主配置确定顺序。 |

Netflix 的[官方域名文本](https://openconnect.netflix.com/mobiledeliverydomains.txt)由 [Open Connect FAQ](https://openconnect.netflix.com/en/faq)提供；七个根域全部保留。Netflix 的[官方互联说明](https://openconnect.netflix.com/en/peering/)区分 Open Connect 网络与云端控制服务，不能把 IXP 互联地址或整个 AWS 区域等同于播放目的地址。注册核对包含完整 CIDR 区间，不只查询第一 IP 就假设整个网段归属；响应摘要保存在固定策略中。

其他 IP 的逐项裁决、网络名称、第一方 URL 与响应 SHA-256 见[注册与地址清单记录](../tools/reviewed-service-networks.json)。公开记录排除联系人资料。Bilibili/WeChat 的旧地址落在云商或电信网络，当前没有取得服务专属第一方绑定，不能仅凭注册人、历史观察或腾讯云 ASN 把全部流量视作该 App。域名与原有可见 UA 条件继续保留；仅提供 IP、没有主机信息的真实请求如需补回，必须先取得明确的当前绑定依据。

Telegram 使用[官方 CIDR 清单](https://core.telegram.org/resources/cidr.txt)。Google 使用[官方地址 JSON](https://www.gstatic.com/ipranges/goog.json)，保留的五段与当日[Google Cloud 公共地址清单](https://www.gstatic.com/ipranges/cloud.json)没有交集；这项比对与响应摘要已记录。地址注册依据来自 IANA 引导的 ARIN/RIPE/APNIC 等权威注册接口；ARIN 的 RDAP 部分请求失败时，用其仍支持的 [Whois-RWS](https://www.arin.net/resources/registry/whois/rws/)核对完整区间与组织，没有把网络错误当作归属证据。

Nicegram 的原关键词缩小到 nicegram.me 和既有品牌入口 nicegram.app；前者以[产品官网](https://nicegram.me/features)和 [Apple 商店发布者信息](https://apps.apple.com/us/app/nicegram-ai-for-telegram/id1608870673)核对，后者仅作为旧品牌入口的有界兼容，并不声称本轮已确认其当前服务可用。其他迁移产品保留既有明确域名，不按名称相似随意补域名。

## 有意保留的交集

没有把所有跨组重叠一律删除。完整审核了 **161 组字面域名交集**，记录在[交集目录](../tools/reviewed-domain-overlaps.json)，扩展脚本对 **221 个代表主机**验证实际第一命中分类；包括相同精确主机、父子后缀与多组同时匹配。新增交集或失效记录会使维护检查失败。

- AI 中的 Gemini、Copilot、Firefly、Grok、Meta AI 等专属主机先于其平台兜底；SiriAI 的既有独立策略继续优先。
- Apple 与 Disney 的具名 Adobe 租户仍保留，Adobe 通用 demdex/omtrdc 范围放在后面。Adobe 对 [demdex 的第一方说明](https://experienceleague.adobe.com/en/docs/audience-manager/user-guide/reference/demdex-calls)支持其作为 Adobe 范围，不支持把整个域名默认归为某一家下游媒体服务。
- Disney 自有站点当日公开资源仍引用 bamgrid/dssott 中的媒体端点；保留其现有服务家族范围，未据此加入第三方整个 CDN。Microsoft/Google 通用云域保留为现有平台兜底，由前置的专用主机分流。
- muse.ai 按当日 [Muse 官方条款](https://platform.muse.ai/terms)确认属于 Meta AI，保留 AI/Meta 的有意重叠；没有根据旧品牌记忆错误移除。

这里只验证主机名可见时的列表逻辑与推荐顺序，不模拟客户端 DNS 调度、规则来源优先级或任意用户主配置。Loon 本地规则、插件、订阅的原生来源优先级仍然适用。

## Parsec 的功能保留与迁移

控制连接代理、STUN 直连两组均保留。Loon 和 Surge 的 Mac 版本使用 parsecd + UDP；Mihomo 保留 parsecd / parsecd.exe + UDP；Egern、Quantumult X、Shadowrocket 默认保留两个 STUN 主机。

原先来源埠 9000 不能识别进程身份，移到三个 `rule/optional/ParsecP2P-Port9000` 文件，必须额外引用并明确绑定 DIRECT。Loon 要求 3.1.7+；Surge SRC-PORT 要求 iOS 5.8.4+ / Mac 5.4.4+。它们均限定 UDP，仍会匹配其他程序使用的同一来源埠，因此不会由扩展脚本自动启用。Quantumult X 官方开发者参考未记载该条件，移除旧未限定 UDP 的 SRC-PORT，没有猜测替代字段。

Loon 的进程规则按当前官方文档仅适用于 macOS，iOS/tvOS 忽略含进程子条件的整个逻辑规则。没有编造进程规则的最低版本，亦未把进程条件写成移动设备能识别任意远端进程。详细原生引用示例与可选文件见 [Parsec 说明](../Clash/Docs/Parsec.md)。

## 六端能力依据

核对日期均为 2026-11-13；固定策略保存本轮来源。官方文档后续更新优先于本记录。

| 客户端 | 本轮采用的第一方依据与实际边界 |
| --- | --- |
| Loon | [Rule](https://nsloon.app/docs/Rule/)、[IP](https://nsloon.app/docs/Rule/ip_rule/)、[逻辑](https://nsloon.app/docs/Rule/logic_rule/)、[进程](https://nsloon.app/docs/Rule/process_rule/)、[订阅](https://nsloon.app/docs/Rule/sub_rule/)。先读并更新[官方适配记录](../Loon/Docs/OfficialReference.md)，保留原生无策略行；AND/端口能力按 3.1.7+。 |
| Surge | [规则](https://manual.nssurge.com/rules/overview.html)、[进程](https://manual.nssurge.com/rules/process.html)、[端口](https://manual.nssurge.com/rules/source-and-port.html)。使用自己的规则类型与版本要求。 |
| Egern | [Rules / Rule Sets](https://egernapp.com/docs/configuration/rules/)。YAML 字段、字符串值与集合级 no_resolve，不制造逐项旗标。 |
| Quantumult X | [开发者 sample.conf](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)与同仓库参考。保留 HOST/HOST-SUFFIX/IP6-CIDR/USER-AGENT 等原生词汇；不将“公开示例未记载”写成“所有版本绝不支持”，但预设资源排除未确认的 SRC-PORT/no-resolve。沿用现有无策略资源加 force-policy 的绑定方式；官方示例带有策略列，当前无策略资源组合仍需真机核验，未擅自写入可能改变用户路由的预设策略。 |
| Shadowrocket | [Apple 商店开发者信息](https://apps.apple.com/us/app/shadowrocket/id932747118)指向[开发者网站](https://shadowlaunch.com/)。没有找到完整公开官方语法/API 规范，保留既有规则词汇和 ASN 选项形状，只同步已审核数据；没有声称六端全部获得同等官方语法证明。 |
| Mihomo | [原生规则](https://wiki.metacubex.one/config/rules/)与[规则提供者](https://wiki.metacubex.one/config/rule-providers/)。classical YAML、NETWORK 与原生进程条件；省略不支持的 47 条 USER-AGENT，不伪装为其他条件。 |

无策略清单本身不能决定节点、地区或主配置的全部顺序。域名条件在主机可见时适用于 IPv4/IPv6、TCP/UDP/QUIC；不能从未解密的 QUIC 猜测 HTTP User-Agent。保留用户 DNS、IPv6、UDP、TUN、嗅探与 MITM 设置；不通过禁用全部 IPv6、拒绝全部 UDP 443 或增加解密来掩盖分流问题。

## 脚本、Rewrite、Plugin 与 Module

23 个正式导入入口、31 份固定运行对象均核对；原有脚本版本、发布 URL、用户参数、容量、并发和完成边界保持原样。Loon 的 Script、Script API、Rewrite、Plugin 页面按仓库约定复核，没有引入未公开的取消 API、内存保证或其他客户端字段。

| 原有脚本 | 本轮隔离重跑 |
| --- | --- |
| VerseLyrics 3.2.2 | 2248 / 2248，锁定依赖、重建运行文件与固定运行对象同字节 |
| YouTube Clean 1.2.12 | 315 / 315，原固定源码与存档构建文件 |
| 美团外卖 0.2.0 | 构建后 687 项断言、五端产物、41 URL / 20 正文场景；原生导入与手机流量标记仍为 false |
| NetworkInfo | 23 / 23，固定源码原始套件 |
| StreamingUnlock 等其他正式工具 | 导入引用、固定运行字节、JavaScript 语法和既有边界审阅；没有把不存在的原始回归套件说成通过 |

旧目录中未跟踪的 145 份 JavaScript 另作只读语法检查，全部通过；这不是原生 API、功能或流量验收。旧 Script/Scripts/Plugin/Module、开发包、诊断文件和独立 MapKit/WeatherKit 工作树没有清理或重写。正式小写 script 的入口继续使用原有版本；本轮未解决或声称解决任何未经实机复现的手机 VPN 断连。

## 当前文件数量与验证

| 分类 | Loon | Surge | Egern | Shadowrocket | Quantumult X | Mihomo |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| AI | 961 | 961 | 961 | 961 | 961 | 961 |
| Adobe | 142 | 142 | 142 | 142 | 142 | 142 |
| Apple | 1596 | 1596 | 1596 | 1596 | 1596 | 1573 |
| Bilibili | 124 | 124 | 124 | 124 | 124 | 120 |
| Disney | 232 | 232 | 232 | 232 | 232 | 231 |
| GitHub | 59 | 59 | 59 | 59 | 59 | 59 |
| Google | 865 | 865 | 865 | 865 | 865 | 855 |
| HBOMAX | 88 | 88 | 88 | 88 | 88 | 86 |
| Infuse | 13 | 13 | 13 | 13 | 13 | 13 |
| LAN | 143 | 143 | 143 | 143 | 143 | 143 |
| Meituan | 24 | 24 | 24 | 24 | 24 | 24 |
| Meta | 572 | 572 | 572 | 572 | 572 | 572 |
| Microsoft | 716 | 716 | 716 | 716 | 716 | 713 |
| NTP | 84 | 84 | 84 | 84 | 84 | 84 |
| Netflix | 48 | 48 | 48 | 48 | 48 | 47 |
| Parsec | 3 | 3 | 3 | 3 | 3 | 3 |
| ParsecP2P | 3 | 3 | 2 | 2 | 2 | 4 |
| SiriAI | 6 | 6 | 6 | 6 | 6 | 6 |
| Spotify | 30 | 30 | 30 | 30 | 30 | 29 |
| Telegram | 52 | 52 | 52 | 52 | 52 | 52 |
| TikTok | 36 | 36 | 36 | 36 | 36 | 36 |
| Twitter | 33 | 33 | 33 | 33 | 33 | 33 |
| WeChat | 32 | 32 | 32 | 32 | 32 | 30 |
| Weverse | 14 | 14 | 14 | 14 | 14 | 14 |
| Wikimedia | 22 | 22 | 22 | 22 | 22 | 22 |
| Xiaohongshu | 29 | 29 | 29 | 29 | 29 | 29 |
| 合计 | 5927 | 5927 | 5926 | 5926 | 5926 | 5881 |

- 默认 156 份与可选 3 份均按原生格式检查：26 类完整性、UTF-8/LF、YAML 重复键、规则条数、CIDR 边界、重复对象、策略混入、原生词汇、跨端可表达对象及旗标。
- **245 个分流案例、1418 项断言**：服务正反例、关键词伪装、共享云/CDN、IPv4/IPv6 边界、默认/可选 Parsec UDP/TCP、Mac 与移动端进程差异。模型不会做 DNS 或真实代理连接。
- **28 项 Python、9 项扩展脚本测试**通过；161 组交集 / 221 个代表主机的优先级验证通过；优化再次运行无变化。
- 官方 Mihomo **v1.19.34**：26 个真实提供者、全部规则内联、可选端口列表三种隔离 `-t` 均通过；没有启动 DNS、监听端口、TUN 或用户配置。
- **23 个导入入口 / 31 份固定运行对象**检查通过；366 个仓库文档链接及其实际大小写、Git 空白检查通过。

复跑方式见[开发说明](./Development.md)和[只读 CI](../.github/workflows/validate-rules.yml)。机器记录把桌面测试、原生语法与设备观察分开；不把本机 `-t`、HTTP 能获取或旧测试通过写成六端真实流量验收。

尚待外部证据的是具体客户端/版本的真机导入、真实账号与服务请求、HTTPDNS/IP-only 请求、UDP/QUIC 接管、长期 VPN、手机峰值内存和耗电。当前没有这些完整设备数据，因此不声称所有潜在问题已经消失。待获得明确设备与流量证据后，继续在现有分类和本地候选上做有依据的定点修正。

## 提交前复核

2026-11-13 按用户授权提交并推送 main，不创建 GitHub Release。重新获取 18 份第一方文档与地址清单，复核 Loon Script/API/Rewrite/Plugin 及规则原生能力、Surge/Egern/Mihomo 规则、Quantumult X 开发者样例。Netflix/Telegram 清单与审核快照一致，既有五段 Google 网络仍受官方清单覆盖且与当日 Google Cloud 清单无交集。正式安装入口和 31 份固定运行对象不变，四套历史脚本回归重新通过。

本提交保留 GitHub 原有安装表格与使用入口；没有将接手前无关的本地 README 改动、WeatherKit 工作记录或旧开发目录一并提交。完整当前规则检查、28 项 Python、9 项扩展脚本、三种 Mihomo 原生解析、366 个文档链接及 Git 空白检查通过。GitHub Actions 结果与公共资源字节在推送后另外核对，不能预先写成已通过。
