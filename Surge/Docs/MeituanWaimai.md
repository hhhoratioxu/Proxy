# 美团外卖去广告 · Surge

版本：0.1.0 · 更新日期：2026-10-15

[配置文件](../script/MeituanWaimai.sgmodule) · [脚本源码](../script/MeituanWaimai.js) · [返回客户端入口](../README.md)

配置位置：`Surge/script/MeituanWaimai.sgmodule`。脚本位置：`Surge/script/MeituanWaimai.js`。配置中的脚本引用使用本仓库的对应目录，不跨用其他客户端的路径。配置文件与 JS 都归在小写 script/，文档归在 Docs/，分流列表归在 rule/。

## 安装

1. 在当前 Surge 配置的模块管理中新增模块，填写下方原始地址并启用。需要支持 HTTP Response Script 的版本。
2. 在客户端中安装并信任自己的 HTTPS 解密证书，启用 MitM。此配置只为 `wmapi.meituan.com` 添加解密主机。
3. 保存配置并重新加载。
4. 彻底退出美团外卖 App 后重新打开。如果 App 中有清理缓存入口，可先清理已有开屏广告缓存再复测。

配置原始地址：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/MeituanWaimai.sgmodule
```

## 当前范围

| 接口 | 处理 |
| --- | --- |
| `/api/v数字/loadInfo` | 清空 `data.startpicture.ad`、`data.startpicture.mk` 中已识别的广告数组；`startpicture` 本身为数组时清空它。 |
| `/api/v数字/startpicture` | 将正常 JSON 响应替换为 `{}`。 |
| `/api/v数字/openscreen?ad…` | 仅匹配查询字符串以 `ad` 开头的开屏请求，将正常 JSON 响应替换为 `{}`。 |

只处理 `wmapi.meituan.com`，支持 HTTP、HTTPS 和多位数 API 版本号。规则面向独立美团外卖 App 的已知开屏广告；尚未适配首页推广、红包弹窗、美团主 App 内嵌外卖和微信小程序。

这四个新增客户端版本都在**响应阶段**处理内容，上游请求仍会发生；处理时机与 Egern 版的 Map Local 不同。只处理 HTTP 200 和可解析 JSON，非零 `code`、未知结构、畸形 JSON、过大响应和解析异常均原样放行。

`loadInfo` 除目标广告数组外保留响应原文，包括长数字 ID、其他业务字段和数字原有写法；不对整个业务配置重新序列化。脚本不发起额外请求、不记录流量或账号信息，也不修改节点、DNS 或业务分流。

## 验证

本地使用人工构造的响应验证广告清理、两种广告数组同时存在、重复处理、长数字 ID 保留、未知结构与错误响应放行，以及订单、支付、商家列表等 URL 不被匹配。配置检查还核对了脚本原始地址和 MitM 主机范围。

测试源码见 [跨客户端验证](../Tests/MeituanWaimai.test.mjs)。在仓库根目录使用 Node.js 运行：

```sh
node --test Surge/Tests/MeituanWaimai.test.mjs
```

这些检查使用模拟的客户端脚本输入。**尚未完成 Surge 自身解析器的导入验证、真实手机流量命中和 App 界面验收**，不能将本地测试或发布成功视为真机去广告成功。接口变化、证书校验和已缓存广告都可能影响效果。

## 依据

- [Surge HTTP Response Script](https://manual.nssurge.com/scripting/http-response.html)与[HTTP 处理说明](https://manual.nssurge.com/http/overview.html)。
- [公开的美团外卖启动字段示例](https://github.com/blackmatrix7/ios_rule_script/blob/master/script/startup/startup.js)，用于核对 `loadInfo` 以及 `startpicture.ad`、`startpicture.mk`；脚本代码独立编写。
- [Clash/Mihomo 兼容性说明及其他客户端入口](../../Clash/Docs/MeituanWaimai.md)。
