# Horatio Proxy

<p align="center">点击下方标题切换语言 · Select a language below</p>

<details open>
<summary><strong>🇨🇳 简体中文</strong></summary>

按 Clash、Loon、Egern、Surge、Shadowrocket、QuanX 六个客户端分类的个人规则、模块、脚本与图标配置。

各客户端统一使用 `rule/` 存放分流规则，`script/` 存放脚本、模块、插件、重写和任务配置；`Docs/` 存放安装与使用说明，测试代码放在对应的 `script/test/` 或 `script/插件名/test/`。共用图标统一保存在根目录 [Icons](./Icons/)。

## 客户端入口

| 客户端 | 内容 |
| --- | --- |
| Clash | [分流规则](./Clash/rule/) · [配置说明](./Clash/README.md) |
| Loon | [规则与插件](./Loon/) · [使用说明](./Loon/README.md) |
| Egern | [规则、模块与脚本](./Egern/) · [使用说明](./Egern/README.md) |
| Surge | [分流规则](./Surge/rule/) · [使用说明](./Surge/README.md) |
| Shadowrocket | [规则、脚本与模块](./Shadowrocket/) · [使用说明](./Shadowrocket/README.md) |
| QuanX / Quantumult X | [规则、脚本与任务](./QuantumultX/) · [使用说明](./QuantumultX/README.md) |

每个客户端内，同一插件只保留当前正式版；脚本使用固定文件名，旧版通过 Git 历史查找。

[共用图标库与导入入口](./Icons/) · [目录用途与迁移说明](./Clash/Docs/Directory-Migration.md)。Parsec 分流文档保存在 `Clash/Docs/`。

图标素材、索引和各客户端图标导入配置只保留根目录 `Icons/` 一处。`Docs/` 是给人阅读的说明；`test/` 是开发者检查脚本行为的代码，正常使用只需按说明导入对应模块。

> 配置仅供个人使用，请根据客户端版本和实际网络环境调整。图标及品牌名称归各自权利人所有。

</details>

<details>
<summary><strong>🇺🇸 English</strong></summary>

A personal collection of rules, modules, scripts and icon configurations organized by six clients.

Each client uses `rule/` for routing lists and `script/` for JavaScript, modules, plugins, rewrites and tasks. `Docs/` contains installation and usage guides. Development tests live under `script/test/` or a plugin's own `script/<plugin>/test/` directory. All shared icons live in the root [Icons](./Icons/) directory.

## Client directories

| Client | Content |
| --- | --- |
| Clash | [Rules](./Clash/rule/) · [Setup](./Clash/README.md) |
| Loon | [Rules and plugins](./Loon/) · [Guide](./Loon/README.md) |
| Egern | [Rules, modules and scripts](./Egern/) · [Guide](./Egern/README.md) |
| Surge | [Rules](./Surge/rule/) · [Guide](./Surge/README.md) |
| Shadowrocket | [Rules, scripts and modules](./Shadowrocket/) · [Guide](./Shadowrocket/README.md) |
| QuanX / Quantumult X | [Rules, scripts and tasks](./QuantumultX/) · [Guide](./QuantumultX/README.md) |

Each client keeps only the current production version of a plugin, using stable script filenames. Previous versions remain available in Git history.

[Shared icons and import links](./Icons/) · [Directory and migration guide](./Clash/Docs/Directory-Migration.md). The Parsec routing guide is in `Clash/Docs/`.

Icon images, shared indexes and client import profiles are maintained once under the root `Icons/` directory. `Docs/` files explain setup; `test/` files validate script behavior during development and do not need to be imported into proxy clients.

> These configurations are for personal use. Adjust them for your client version and network environment. All icons and brand names belong to their respective owners.

</details>
