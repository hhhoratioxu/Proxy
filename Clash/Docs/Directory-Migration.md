# 目录迁移说明

更新日期：2026-10-15

六个客户端入口保持为 Clash、Egern、Loon、Surge、Shadowrocket、QuantumultX。每个客户端统一按以下用途分类：

| 目录 | 内容 |
| --- | --- |
| `script/` | JS、Egern YAML 模块、Loon 插件、Surge/Shadowrocket 模块、QuanX 重写和任务配置。 |
| `rule/` | 分流规则列表。 |
| `Docs/` | 安装、使用与兼容性说明。 |
| `Icons/` | 原有图标资源和图标导入配置。存在的目录继续保留。 |
| `Tests/` | 已有测试及新增的跨客户端脚本验证。 |

模块和插件在客户端中仍按各自原生方式导入；这里统一的是仓库目录名称，文件扩展名、配置节名称和运行方式保持各客户端要求。

## 旧路径与新路径

| 原路径 | 当前路径 |
| --- | --- |
| 六个客户端下的 `Rules/` | 同客户端的 `rule/` |
| `Clash/VergeRev.js` | [Clash/script/VergeRev.js](../script/VergeRev.js) |
| `Egern/Modules/*.yaml` | `Egern/script/*.yaml` |
| `Egern/Modules/*.md` | `Egern/Docs/*.md` |
| `Egern/Scripts/*.js`、`*.yaml` | `Egern/script/` 中对应文件 |
| `Egern/Scripts/MeituanWaimai.md` | [Egern/Docs/MeituanWaimai.md](../../Egern/Docs/MeituanWaimai.md) |
| `Loon/Script/`、`Loon/Plugin/` | `Loon/script/` |
| `QuantumultX/Scripts/`、`QuantumultX/Tasks/` | `QuantumultX/script/` |
| `QuantumultX/StreamingUnlock-README.md` | [QuantumultX/Docs/StreamingUnlock.md](../../QuantumultX/Docs/StreamingUnlock.md) |

仓库内的原始链接、URL 编码的导入链接、相对文档链接、模块脚本引用和测试读取路径均按新目录核对。原有 528 个文件全部保留，只迁移位置并修正路径引用；同时新增其他客户端的美团外卖模块、脚本、说明和验证文件。

## 已导入过旧资源时

GitHub 路径区分大小写。旧地址不会因目录改名自动跳转到新原始地址，因此之前手动添加的规则订阅、模块或脚本地址需要更新。

- 将自己保存的本仓库资源地址中的 `/Rules/` 改为 `/rule/`。
- 脚本、模块、插件和任务配置统一使用对应客户端的 `/script/` 地址；文件名保持原有大小写。
- 说明文档请从各客户端 README 的新入口打开。
- 已经导入旧 Egern 美团外卖模块的设备，请改用下方 Egern 新地址。

## 美团外卖去广告入口

| 客户端 | 当前可导入资源 |
| --- | --- |
| Egern | [MeituanWaimai.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/MeituanWaimai.yaml) |
| Loon | [MeituanWaimai.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/MeituanWaimai.plugin) |
| Surge | [MeituanWaimai.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/MeituanWaimai.sgmodule) |
| Shadowrocket | [MeituanWaimai.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/MeituanWaimai.sgmodule) |
| Quantumult X | [MeituanWaimai.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/MeituanWaimai.conf) |
| Clash/Mihomo | [能力限制及其他版本说明](./MeituanWaimai.md)，没有原生同等实现。 |

本地验证：336 项脚本与回归测试通过；16 个 JavaScript 文件通过语法检查，59 个 YAML 和 5 个 JSON 文件可解析；1470 处本仓库原始地址引用与 125 处相对文档链接检查无缺失。132 个分流列表的有效规则内容保持不变。上述检查不能代替手机上的客户端导入与去广告实测。

[返回仓库首页](../../README.md)
