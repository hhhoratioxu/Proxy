# 美团外卖去广告 · Egern

版本：0.1.0 · 更新日期：2026-10-15

仓库位置：`Egern/script/MeituanWaimai.yaml`，模块放在 script/，分流列表放在 rule/，本文档放在 Docs/。

[GitHub 模块文件](https://github.com/hhhoratioxu/Proxy/blob/main/Egern/script/MeituanWaimai.yaml) · [模块原始地址](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/MeituanWaimai.yaml)

导入文件：[`MeituanWaimai.yaml`](../script/MeituanWaimai.yaml)。这是 Egern 原生 YAML 模块，使用内置 JSON 处理和 Map Local，不需要另外安装 JavaScript 文件，也没有远程脚本依赖。Egern 需要支持 `body_rewrites.response_jq` 与 `map_locals`。

## 当前处理范围

| 接口 | 处理方式 |
| --- | --- |
| `wmapi.meituan.com/api/v数字/loadInfo` | 清空 `data.startpicture` 中已识别的 `ad`、`mk` 广告数组；两者同时存在时一并清理。`startpicture` 本身是数组时清空该数组。 |
| `wmapi.meituan.com/api/v数字/startpicture` | 返回 HTTP 200 和空 JSON 对象 `{}`，阻止独立开屏素材请求。 |
| `wmapi.meituan.com/api/v数字/openscreen?ad…` | 仅匹配查询字符串以 `ad` 开头的已知开屏广告请求，返回 HTTP 200 和 `{}`。 |

规则兼容 HTTP、HTTPS 和多位数 API 版本号。`loadInfo` 的非广告字段、未识别的结构以及非零 `code` 响应在 JSON 数据层面保留；JSON 重写可能改变空白、数字表示等序列化细节。

本版面向独立的**美团外卖 App**。尚未适配首页信息流推广、红包弹窗、商家推荐卡片、美团主 App 内嵌外卖或微信小程序。美团服务端接口会调整，公开规则中的接口和字段不等于当前手机版本已经验证有效。

## 安装

1. 在 Egern 的「工具 → 模块」中新增远程模块，填写下方模块原始地址并启用。
2. 在 Egern 中生成、安装并信任自己的 HTTPS 解密证书，确认 MITM 已启用。模块的 MITM 主机列表仅包含 `wmapi.meituan.com`。
3. 保存并重新加载配置，彻底退出美团外卖 App 后重新打开。如果 App 中有清理缓存入口，可先清理已有的开屏广告缓存再复测。

模块原始地址：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/MeituanWaimai.yaml
```

也可以在已有 Egern 配置的 `modules` 列表中添加以下一项。若已有 `modules:`，只追加其中的列表项，避免重复定义同名顶级字段：

```yaml
modules:
  - name: 美团外卖去广告
    url: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/MeituanWaimai.yaml
    enabled: true
    update_interval: 86400
```

下载到本地后也可作为本地模块使用。模块文件是独立配置片段，需要添加到现有配置中。模块不包含代理节点、DNS 或分流规则；停用此模块即可撤销这些广告处理规则。

## 核验与限制

2026-10-15 本地验证通过：YAML 可解析，另有 **77 项断言全部通过**，包含 24 组人工构造的 JSON 数据及其重复处理、6 个应匹配 URL、17 个不应匹配 URL，以及 MITM 范围和 Map Local 返回值检查。覆盖广告数组同时存在、正常业务字段保留、未知结构与错误响应不被改写，以及 URL 不匹配订单、支付、商家列表和其他主机。测试未使用真实账号或用户抓包。

**尚未在 Egern 和真实美团外卖 App 上完成导入、请求命中及界面验证，不能据此承诺所有广告已去除。** 实际验收时，先检查 Egern 是否命中了上述接口，再确认首页加载、商家菜单、购物车、订单页等日常功能正常；本地规则测试不能替代这一步。

如果仍有广告，先在 Egern 中查看实际请求的主机、路径与对应响应结构，再按真实字段补充规则。分享抓包前应去掉 Cookie、Token、手机号、地址、经纬度和订单信息，不需要提交完整的账号流量。

## 格式与接口依据

- [Egern 官方模块格式](https://egernapp.com/docs/configuration/modules/)。
- [Egern 官方 JSON 响应处理文档](https://egernapp.com/docs/configuration/body_rewrites/)。
- [Egern 官方配置示例：Map Local 与 MITM](https://egernapp.com/docs/configuration/example/)。
- [blackmatrix7 的公开启动广告脚本](https://github.com/blackmatrix7/ios_rule_script/blob/master/script/startup/startup.js)：用于核对 `loadInfo`、`data.startpicture.ad` 和 `data.startpicture.mk` 字段。
- [blackmatrix7 的公开广告规则](https://github.com/blackmatrix7/ios_rule_script/blob/master/rewrite/Surge/AdvertisingLite/AdvertisingLite.sgmodule)：用于核对 `startpicture` 与 `openscreen?ad…` 接口形式。

本模块按上述已公开的接口信息独立编写，没有导入通用去广告整包或第三方 JavaScript 运行库。

