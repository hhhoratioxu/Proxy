# Proxy 开发与验证

保留现有六端目录和用户绑定策略；2026-11-26 新增独立 StarDesk 分类，当前共 27 类。历史 26 类审计数据保留原样。正式资源在客户端的 `rule/`、`script/`，当前使用说明在 `Docs/`。这里的工具只供维护者使用，安装插件无需运行。接手基准见[第一阶段审计](./Audit-2026-11-13.md)，当前规则与官方依据见[第二阶段优化](./Official-Optimization-2026-11-13.md)。本轮已获用户授权提交并推送 main；不创建 GitHub Release。

## 重复执行本地检查

需要 Python 3.9+、Node.js 24 和完整 Git 历史。Python 依赖锁定在根目录 `requirements-dev.txt`，不需要系统级安装。以下命令在 Proxy 根目录执行：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python tools/validate_rules.py
.venv/bin/python tools/optimize_rules.py --check
.venv/bin/python tools/check_domain_overlaps.py
.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/verge-rev.test.mjs
.venv/bin/python tools/check_repository_links.py
.venv/bin/python tools/check_script_references.py --node "$(command -v node)"
git diff --check
```

`validate_rules.py --json /tmp/proxy-rules.json` 可写出完整清单与风险统计，不修改规则。`check_script_references.py` 只核验 Git 跟踪的正式安装入口及其固定运行对象，不会执行真实脚本或请求服务；可选 `--node` 只做 JavaScript 语法检查。浅克隆必须先取得完整历史，否则缺少旧运行对象会明确失败。

`optimize_rules.py` 默认只生成变更计划，`--check` 要求重复执行无变化，`--apply` 才写入已核对的 [固定策略](../tools/official-routing-policy.json)。工具不联网、不自动吸收上游；应用前后检查输入字节，遇到并发修改立即停止。只移除同组后缀或相同 DNS 旗标父网段完整覆盖的对象，不合并相邻网段、不扩大范围。新增依据须先人工审阅并加入正反例，再更改固定策略。

`check_domain_overlaps.py` 检查全部跨类别字面域名交集，包括相同精确域名和父子后缀。当前 161 组已在[交集目录](../tools/reviewed-domain-overlaps.json)记录，扩展脚本另测试 221 个代表主机的实际第一命中类别。新交集或失效记录会失败；不要自动重建目录来绕过审核。其他客户端的主配置不由这个目录自动排序。

`check_repository_links.py` 按 Git 路径的真实大小写检查相对链接、当前仓库 blob/tree 链接和 Raw 链接。新增公共文件需加入 Git 索引；开发中可对明确要发布的文件使用 `git add -N -- 文件`，不需要先创建提交。不要把本地私人配置或旧开发目录批量加入索引。

本地 `.local.yaml`、`.local.yml`、依赖和虚拟环境已忽略。MapKit、WeatherKit 是独立仓库，继续在各自仓库中维护。本项目的只读工作流 [validate-rules.yml](../.github/workflows/validate-rules.yml) 执行上述核心检查，不更新目录、不提交或发布资源。

## 可选 Mihomo 原生解析

独立安装并核对官方 Mihomo 文件后：

```sh
.venv/bin/python tools/check_mihomo.py /absolute/path/to/mihomo --json /tmp/proxy-mihomo.json
```

工具复制当前真实提供者字节到临时目录，分别验证当前全部 `classical` 文件提供者、全部规则内联、独立可选 Parsec 来源埠列表三种配置。只有 `-t`，没有启用监听端口、TUN、DNS 或用户配置；所有临时测试策略均为 DIRECT。它验证语法，不能证明请求经过了正确的真实节点。

## 原有脚本回归

当前运行脚本及其测试源码仍保存在固定历史提交中，继续使用各项目原有工具；不把旧开发包复制到正式安装目录。2026-11-13 已重跑：

| 脚本 | 原始源码与测试位置 | 结果 |
| --- | --- | --- |
| VerseLyrics 3.2.2 | `10049053ce86bd992e3ebb6511ffb28312ba86fb:Surge/Development/VerseLyrics322` | 2248 项通过，重建运行文件与实际固定运行对象同字节 |
| YouTube Clean 1.2.12 | `53e4351e1cbd892803554b698ef3e5fe46767d9a:Surge/script/YouTubeClean` | 315 项通过 |
| 美团外卖 0.2.0 | `0ab4530cf4c96408e4d81f5896a6d694a49be571:Source/MeituanWaimai` | 构建后 687 项断言、五端产物通过；原生导入及手机流量未验收 |
| NetworkInfo | `fdb2f8cfc2701a7959d7ee58c1f2ab01ce368fc1:Egern/script/test` | 23 项通过 |

在工作区外用 `git archive` 展开固定提交。每个项目先使用其 `pnpm-lock.yaml` 执行 `pnpm install --frozen-lockfile --ignore-scripts`，保留原锁定依赖。本次使用 pnpm 10.14.0。

VerseLyrics 在 `Surge/Development/VerseLyrics322` 中运行：

```sh
node build.mjs
python3 package.py 10049053ce86bd992e3ebb6511ffb28312ba86fb 2248
node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
```

`build.mjs` 生成测试需要的 `request-core.js`、`runtime/`；`package.py` 生成 `publish/`。测试正式入口时，还应把当前实际安装文件和固定 Git 对象分别与这些产物核对。本轮使用真实当前安装文件作为 publish 输入，没有改写主工作区的脚本。

YouTube Clean 在其源码目录运行：

```sh
node --test --test-reporter=tap test/*.test.mjs
```

这组测试使用存档构建文件；需要改动源码时，先按原 README 执行构建和打包，再测试实际即将使用的运行文件。Script、Rewrite、Plugin 或最低版本变更须先核对各客户端官方资料；Loon 必须先阅读并更新 [官方适配记录](../Loon/Docs/OfficialReference.md)。

美团在完整固定源码快照的 `Source/MeituanWaimai` 内先运行 `node build.mjs 0ab4530cf4c96408e4d81f5896a6d694a49be571`，再运行 `node test.mjs`。仅展开源码却直接使用快照中的旧发布目录会产生版本不一致。NetworkInfo 在完整固定快照根运行 `node --test Egern/script/test/NetworkInfo*.test.mjs`。StreamingUnlock 的固定快照没有同类原始回归套件；本轮只对它做入口、运行对象、语法及既有 API/边界审阅，不声称已完成服务连通性测试。

## 规则维护边界

编辑原生规则，不把其他客户端的字段直接改名搬入。先为服务正例、无关域名和共享基础设施反例增加 `tests/routing-cases.json`，确认旧规则的问题，再同步各端能表达的条件及 `# RULES` 条数。ParsecP2P 保留客户端专属实现；不能强行追求相同条数。

无策略规则文件无法决定用户的节点、地区或所有集合之间的顺序。建议 LAN、ParsecP2P、NTP 在前；SiriAI 独立策略先于 AI，AI 先于一般服务；专用服务主机先于通用 Google、Apple、Microsoft 云域。Apple、Disney 已有的专属 Adobe 租户主机也要先于 Adobe 通用集合。Clash 扩展脚本已实现这一顺序，其他客户端需在主配置的原生规则入口调整。用户已有的具体覆盖策略应先明确评估，不自动清空。

Egern 的 `no_resolve` 仍是集合级开关。本轮将有文档依据的纯 IP 条件统一为不额外解析，消除第一阶段记录的 21 项混合旗标差异；Quantumult X 不加入官方参考未记载的 `no-resolve`，Shadowrocket 保留既有不带选项的 ASN 形状。条件一致不等于各宿主 DNS 行为完全相同。域名规则本身不区分 IPv4/IPv6 或 TCP/UDP；能否识别主机仍取决于客户端实际 DNS、TUN、嗅探和协议可见性。QUIC 流量不能依赖未解密的 HTTP User-Agent。不要为弥补不可见主机而猜测共享 IP、扩大 ASN、关闭全部 IPv6 或拒绝所有 UDP 443。

ParsecP2P 默认不再按来源埠识别任意程序；Loon/Surge 的 Mac 进程 UDP 条件与 Mihomo 的原生进程条件继续保留，移动平台按原生能力处理。依赖旧来源埠兼容方式时，明确选择三个 `rule/optional/ParsecP2P-Port9000` 文件之一；它们独立校验，不增加默认类别或自动启用。要求与示例见 [Parsec 说明](../Clash/Docs/Parsec.md)。

离线模型只计算提供的主机、IP、ASN、进程与端口；不会做 DNS、真实网络请求或模仿完整客户端调度。新增自动测试、原生语法解析、手机运行、VPN 稳定性和设备耗电结论必须分别报告。

## 本地修改与发布

先检查未提交修改及远端主分支，按文件保护并发编辑。Git 差异中可能包含接手时已存在的修改，不能全部归成本轮新增。修复原文件时保留来源、许可、未知字段和用户参数；超时、容量、并发与异步完成均需有明确边界。

本轮用户已授权提交并推送 main，且明确不创建 Release；后续新一轮发布继续遵守届时的授权范围。到发布阶段再重新核对远端最新 main、待发布入口、固定运行字节和实际产物，不能以本轮本地检查替代届时的核验。

`Docs/RuleFinder-Catalog.json` 表示已提交的规则快照；既有目录工作流在规则推送后更新。带日期的审计数据独立保留，验证结果与目录快照分别核对。
