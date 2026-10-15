# 共用图标库 · Horatio Icons

所有客户端共用这一处图标目录。PNG 素材、图标索引和各客户端的图标导入配置集中维护；Loon 与 Quantumult X 共用同一份 App 和旗帜索引。

## 导入入口

[各客户端一键导入与使用说明](./Import/README.md)

| 用途 | 文件 |
| --- | --- |
| Loon / Quantumult X App 图标 | [AppIcons.json](./AppIcons.json) |
| Loon / Quantumult X 国家与地区旗帜 | [CountryFlags.json](./CountryFlags.json) |
| Egern 图标预览配置 | [App](./Egern.yaml) · [旗帜](./EgernFlags.yaml) |
| Shadowrocket 图标预览配置 | [App](./Shadowrocket.conf) · [旗帜](./ShadowrocketFlags.conf) |

Egern 和 Shadowrocket 导入的是独立预览配置，用来查看图标与复制图标地址。请按导入说明使用，不会自动把图标合并进当前配置。

## 目录用途

| 路径 | 内容 |
| --- | --- |
| [App/](./App/) | App 和服务图标。 |
| [App/Transparent/](./App/Transparent/) | 透明背景 Logo。 |
| [App/Variants/](./App/Variants/) | Full、Alt 等样式，以及相关服务图标。 |
| [Flags/](./Flags/) | 249 个国家与地区旗帜，包含 CN、HK、MO、TW。 |
| [Compat/](./Compat/) | 兼容性处理后的 PNG；索引直接引用这些素材。 |
| [Import/](./Import/) | 各客户端的导入链接和方法。 |

旗帜为 512 × 512 透明画布，文件名使用 ISO 3166-1 alpha-2 代码。不同国家与地区可能共用旗面，但仍按各自代码保留文件名。

Weverse 的旧图标样式位于 [Weverse_Classic.png](./App/Variants/Weverse/Weverse_Classic.png)。

## 来源与许可

素材整理自 Koolson/Qure、fmz200/wool_scripts、homarr-labs/dashboard-icons、官方项目素材、Wikimedia Commons、R-Store 和 Toperlock/Quantumult。品牌名称与商标归各自权利人所有，上游素材保留各自许可。

国家与地区旗帜来源为 [lipis/flag-icons](https://github.com/lipis/flag-icons)，许可见 [LICENSE-flag-icons](./Flags/LICENSE-flag-icons)。

[返回仓库首页](../README.md)
