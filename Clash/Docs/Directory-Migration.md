# 目录用途与迁移说明

更新日期：2026-10-15

仓库根目录包含六个客户端目录、共用的 `Icons/` 和 `README.md`。所有图标集中在根目录维护，各客户端不再单独存放 `Icons/`。

## 每个目录是做什么的

| 位置 | 内容 | 正常使用是否需要导入 |
| --- | --- | --- |
| 客户端的 `rule/` | 分流规则列表。 | 按需订阅对应规则。 |
| 客户端的 `script/` | 正式脚本、模块、插件、重写和任务配置。 | 按客户端说明导入对应配置。 |
| 客户端的 `Docs/` | 安装步骤、设置解释和兼容性说明。 | 阅读即可。 |
| `script/test/` 或 `script/插件名/test/` | 开发者运行的测试代码，用来检查脚本的处理结果。 | 不需要导入；这些测试在 Node.js 等开发环境运行。 |
| 根目录的 [Icons/](../../Icons/) | 共用 PNG、图标索引和客户端图标预览配置。 | 按需从图标库选择导入入口。 |

`test/` 里的文件也是代码，但用途是验证正式脚本，而不是在代理软件里处理实际流量。测试跟随对应脚本存放在 `script/` 内，避免在客户端根目录另外放一层 `Tests/`。歌词插件自己的测试保留在 `Egern/script/SpotifyLyrics/test/`。

模块和插件仍按客户端的原生方式导入，文件扩展名、配置节名称和运行方式保持各客户端要求。

## 路径调整

| 原路径 | 当前路径 |
| --- | --- |
| `Loon/Icons/`、`QuantumultX/Icons/`、`Egern/Icons/`、`Shadowrocket/Icons/` | 根目录 [Icons/](../../Icons/)；相同的 JSON 索引合并为一份。 |
| `Egern/Tests/` | [Egern/script/test/](../../Egern/script/test/) |
| `Surge/Tests/` | [Surge/script/test/](../../Surge/script/test/) |
| 六个客户端下的 `Rules/` | 同客户端的 `rule/` |
| `Clash/VergeRev.js` | [Clash/script/VergeRev.js](../script/VergeRev.js) |
| `Egern/Modules/*.yaml` | `Egern/script/*.yaml` |
| `Egern/Modules/*.md` | `Egern/Docs/*.md` |
| `Egern/Scripts/*.js`、`*.yaml` | `Egern/script/` 中对应文件 |
| `Egern/Scripts/MeituanWaimai.md` | [Egern/Docs/MeituanWaimai.md](../../Egern/Docs/MeituanWaimai.md) |
| `Loon/Script/`、`Loon/Plugin/` | `Loon/script/` |
| `QuantumultX/Scripts/`、`QuantumultX/Tasks/` | `QuantumultX/script/` |
| `QuantumultX/StreamingUnlock-README.md` | [QuantumultX/Docs/StreamingUnlock.md](../../QuantumultX/Docs/StreamingUnlock.md) |

## 已订阅过旧资源时

GitHub 路径区分大小写。旧原始地址不会因目录改名而自动跳转。图标订阅和预览配置请使用 [共用图标导入入口](../../Icons/Import/README.md) 中的当前地址。

- 规则订阅使用对应客户端的 `/rule/` 地址。
- 脚本、模块、插件和任务使用对应客户端的 `/script/` 地址。
- 说明文档从各客户端 README 打开。
- 开发者运行测试时，使用新的 `script/test/` 路径。

## 美团外卖去广告入口

| 客户端 | 当前可导入资源 |
| --- | --- |
| Egern | [MeituanWaimai.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/MeituanWaimai.yaml) |
| Loon | [MeituanWaimai.plugin](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/script/MeituanWaimai.plugin) |
| Surge | [MeituanWaimai.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/MeituanWaimai.sgmodule) |
| Shadowrocket | [MeituanWaimai.sgmodule](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/script/MeituanWaimai.sgmodule) |
| Quantumult X | [MeituanWaimai.conf](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/script/MeituanWaimai.conf) |
| Clash/Mihomo | [能力限制及其他版本说明](./MeituanWaimai.md) |

[返回仓库首页](../../README.md)
