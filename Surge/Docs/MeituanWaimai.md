# 美团外卖去广告 · Surge

版本：**0.2.0** · 更新日期：2026-10-20

[配置文件](../script/MeituanWaimai.sgmodule) · [返回客户端入口](../README.md)

## 安装或升级

1. 在 Surge 模块管理中更新已有模块，或用下方地址新增。使用原生 Map Local 的内联文本和 tiny-gif，要求 **Surge iOS 5.9.1+ / Mac 5.5.1+**；运行脚本自动下载。
2. 确认 HTTPS 解密已启用，并已安装、信任自己的解密证书。本模块使用 `wmapi.meituan.com`、`img.meituan.net`、`p*.meituan.net`、`s3plus.meituan.net` 和 `flowplus.meituan.net`；只匹配下文所述广告路径。
3. 更新后检查模块说明显示 `v0.2.0`，仅启用一个版本及一套处理相同请求的规则，保存并重新加载。
4. 彻底退出美团外卖 App 后重新打开；若 App 提供清理缓存入口，可清理旧开屏素材后复测。网络规则无法删除 App 已存储的本地广告。

[直接导入的 Raw 地址](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/MeituanWaimai.sgmodule)

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/script/MeituanWaimai.sgmodule
```

模块和脚本位于各客户端的 `script/`，路由列表位于 `rule/`。只需导入一个配置文件；固定版本运行脚本会自动下载。

## 0.2.0 的改动

- 修复 `openscreen` 的 `ad` 前缀参数排在查询串后面时漏匹配，兼容多位 API 版本、默认端口和接口末尾斜杠。
- 独立开屏接口在请求阶段直接返回空 JSON；广告图片返回 1 像素 GIF，已知开屏视频/广告包返回空响应。
- 增加公开规则已标明的素材路径：`img.meituan.net/bizad/bizad_brandCpt_数字.jpg`、`p数字.meituan.net/(bizad|brandCpt)/文件.jpg`、`s3plus`/`flowplus` 的 `linglong` 图片和视频，以及 `s3plus` 的 `brandcpt-vedio` 广告包。支持这些路径的查询参数。
- 仅对 `loadInfo` 移除 `If-None-Match` 和 `If-Modified-Since`，请求重新验证配置；成功清理后的配置设为 `no-store` 并移除旧验证标识。Cookie、Authorization、If-Match 等其他请求头保留。
- 五客户端均使用原文范围替换，只清空已确认的广告数组，保留其他文本、长数字 ID、金额写法和业务字段；Egern 不再重序列化整份 JSON。

## 当前范围

| 请求或字段 | 行为 |
| --- | --- |
| `wmapi.meituan.com/api/v数字/loadInfo` | HTTP 200 且业务 `code` 为 0/`"0"` 或缺省时，清空 `data.startpicture.ad`、`data.startpicture.mk` 的非空数组；`startpicture` 本身为数组时清空它。 |
| `/api/v数字/startpicture` | 请求阶段返回 HTTP 200、JSON `{}`。 |
| `/api/v数字/openscreen?...&ad…=…` | 参数名以 `ad` 开头且处于完整参数边界时返回 `{}`，参数可位于查询串任意位置；不把参数值中的 `ad` 当成参数名。 |
| 已识别的广告素材 URL | 按完整主机与广告目录匹配，图片返回 GIF，视频和广告包返回空 HTTP 200。 |

本版针对独立美团外卖 App。广告素材的兜底拦截可以阻止已缓存配置再次从网络下载这些素材，但不会自动擦除 App 已保存在本地的图片，也不保证移除页面占位。

首页信息流中的推广商家、红包弹窗、悬浮活动、美团主 App 内嵌外卖和微信小程序还没有可靠的当前响应样本，未宣称已完整适配。不按 `ad`、`banner` 等名称递归删字段；商家列表、菜单、优惠券、购物车、订单和支付接口不在本版处理范围。`wmbanner`、`waimai-alita` 与通用配置资源没有加入拦截。

## 验证与边界

2026-10-20：**687 项本地断言通过**。检查实际生成的五客户端导入文件、41 组 URL 正反例、20 组 JSON/边界数据，以及广告参数顺序、业务字段、长数字、重复键、异常状态、UTF-8、单次完成和请求/响应头。测试使用人工构造的数据，不包含真实账号抓包。

运行脚本没有附加网络请求、后台任务、持久缓存或并行查询。客户端脚本超时为 8 秒。Egern/Surge/Shadowrocket 声明正文上限 2097152 字节；共享 JavaScript 还限制 2097152 个 UTF-16 单元、64 层结构、50000 个扫描节点，并在扫描中检查 250 毫秒的软预算。Loon 不使用未公开的正文大小配置字段；脚本检查不能限制宿主已经读取的正文或保证 VPN 峰值内存。

只改写 HTTP 200 且结构明确的正文。HTTP 304/错误状态、非零业务码、未知结构、畸形 JSON、歧义重复键或超限内容保留原响应。缓存头处理仅作用于实际发出的 `loadInfo` 请求，不把 304 伪装成 200。

**尚未完成原生客户端解析器导入、真实手机流量命中和 App 界面验收。** 本地测试和 GitHub 发布不能证明手机上的广告已经全部清除。MITM 未开启、证书未信任、证书校验、旧插件冲突和 App 本地缓存仍可能影响效果。

仍有广告时，定位到对应客户端、App 版本、广告出现位置及具体主机/路径后，才能继续扩展混合业务响应中的字段。提供响应样本前应移除 Cookie、Token、手机号、地址、经纬度和订单信息，无需分享完整账号流量。

## 接口与配置依据

- [公开启动字段示例](https://github.com/blackmatrix7/ios_rule_script/blob/master/script/startup/startup.js)及[公开广告素材路径](https://github.com/blackmatrix7/ios_rule_script/blob/master/rewrite/Surge/AdvertisingLite/AdvertisingLite.sgmodule)。这是作者维护的接口线索，不等于当前 App 实测；本项目运行代码独立编写。
- [固定版本源码和测试](https://github.com/hhhoratioxu/Proxy/tree/0ab4530cf4c96408e4d81f5896a6d694a49be571/Source/MeituanWaimai)：运行脚本按提交固定，主分支每客户端保留一个当前安装入口。
- [其他客户端与 Clash/Mihomo 能力说明](../../Clash/Docs/MeituanWaimai.md)。

- [Surge HTTP 处理](https://manual.nssurge.com/http/overview.html)与[Map Local](https://manual.nssurge.com/http/map-local.html)。
