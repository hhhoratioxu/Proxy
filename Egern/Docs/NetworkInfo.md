# Network Info · Liquid Glass

Egern 网络信息与流媒体解锁模块，版本 **1.1.1**。一个订阅链接提供原生小组件及 Safari 详细面板。无需 API Key、额外服务器或安装 MITM 证书。

1.1.1 清除了脚本绘制的所有小组件容器填充、渐变与投影；根容器和所有 stack 显式使用 0% 不透明度，仅留极淡细边框。脚本链接增加版本参数，更新模块后可避开旧脚本地址的缓存。**这是无填充布局，不能称为已实现 Apple 原生 Liquid Glass More Clear 材质。**

### 系统 More Clear 与桌面 Clear

- iOS 27 的系统外观：**Settings → Appearance → Liquid Glass**，滑块向左可让系统材质更清透；“Reduce Transparency / Increase Contrast”会影响可调整性。参见 [Apple 设置说明](https://support.apple.com/en-ae/guide/iphone/iphd6804774e/27/ios/27)。
- 主屏幕：长按空白处 → **Edit → Customize → Clear**，可切换系统提供的清透外观。参见 [Apple 主屏幕说明](https://support.apple.com/en-ke/guide/iphone/iph385473442/27/ios/27)。这属于全局系统设置，插件不能代替你修改。
- Egern [公开 DSL](https://egernapp.com/zh-CN/docs/configuration/widgets/) 提供背景颜色/图片/渐变，没有公开 `glassEffect(.clear)`、系统 Liquid Glass 材质选择或 `containerBackground` 移除开关。如果 1.1.1 仍显示大块系统底色，插件绘制层已清空；剩余宿主底色无法通过当前已公开脚本接口控制。不要把降低 Alpha 当成成功开启了系统 More Clear。

1.1.0 增加 Netflix 与 YouTube Premium 检测；小组件移除原有不透明浅色背景，卡片使用更低透明度的渐变、描边和阴影，在大尺寸中间加入两张流媒体卡片。最终是否透出墙纸仍取决于 iOS / Egern 小组件宿主的背景处理。

## 安装

在 **Egern → 工具 → 模块 → +** 中粘贴以下 URL 并启用：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/NetworkInfo.yaml
```

[一键添加模块](egern:/modules/new?name=Network%20Info&url=https%3A%2F%2Fraw.githubusercontent.com%2Fhhhoratioxu%2FProxy%2Fmain%2FEgern%2Fscript%2FNetworkInfo.yaml)

- **App 内小组件**：分析 → 左上角小组件画廊 → 模块小组件 → Network Info。
- **主屏幕**：长按桌面 → 添加 Egern 小组件 → 编辑小组件 → 选择 Network Info。支持小、中、大尺寸，以及锁定屏幕三种尺寸。
- **完整面板**：保持 Egern 连接，在 Safari 地址栏输入 **`http://network.horatio.test/`**，或点击模块打开按钮/小组件。请保留 `http://`；该保留域名由本模块拦截生成本地响应，不是公网网站。

完整面板需要 Egern 的 HTTP 请求脚本功能生效。如果使用 TUN Only / `vif_only` 导致页面不被拦截，请检查 HTTP 脚本/系统代理设置；仍可通过原生小组件读取信息。Safari 强制 HTTPS 时，请手动输入完整 HTTP 地址。

使用支持 `export default async function(ctx)`、`ctx.device` 与 Widget DSL 的当前 Egern 版本。旧版脚本引擎如不支持这些接口，请先更新 Egern。

## 显示内容

| 区域 | 信息 |
| --- | --- |
| 直连出口 | 使用 `DIRECT` 检测公网 IPv4 / IPv6 |
| 规则或指定策略出口 | 按当前规则，或按模块中指定的策略检测公网 IPv4 / IPv6 |
| IP 信息 | 国家/地区、城市、ASN、ISP、组织、GeoIP 来源和时区 |
| Cloudflare | 接入 POP、HTTP 协议、检测请求总耗时 |
| 本地网络 | SSID、BSSID、蜂窝 SIM 运营商/制式、LAN 地址、网关、接口、设备 DNS |
| 流媒体 | Netflix 非自制片源/原创片源抽样、YouTube Premium 地区可用性、服务地区与检测策略 |

小尺寸显示出口和两项流媒体状态；中尺寸并列展示两种出口，增加流媒体状态条；大尺寸增加 IPv6、两张流媒体卡片、本地地址和 DNS。完整面板显示所有字段，支持手动刷新、复制摘要、跳转 Egern 连接列表。

## 模块设置

| Env | 默认 | 作用 |
| --- | --- | --- |
| `PROBE_POLICY` | 空 | 填写你在 Egern 中已有策略组或节点的**完整名称**，例如 `TAG`、`bwg`。空值按检测域名的现有规则访问。脚本不主动回退到直连；名称必须与现有策略一致。 |
| `NETFLIX_POLICY` | 空 | 空值按 Netflix 域名现有分流；可填写已有节点/策略组，独立于 `PROBE_POLICY`。 |
| `YOUTUBE_POLICY` | 空 | 空值按 YouTube 域名现有分流；可填写已有节点/策略组，独立于 `PROBE_POLICY`。 |
| `TIMEOUT` | `4000` | 每个检测请求超时，毫秒，限制 1500–7000。GeoIP 最多等待 3000 毫秒。 |
| `GEO_LOOKUP` | `true` | 在线查询 IPv4 城市和 ISP。关闭后仅使用 Egern 本地 GeoIP / ASN，城市未提供。 |
| `SHOW_LOCAL` | `true` | 显示本地网络标识；关闭后隐藏 SSID/BSSID、LAN 地址、网关、接口和 DNS。 |

此模块不增加全局分流规则，不创建策略组，不修改 DNS 配置。仅 `DIRECT` 检测和显式填写的 `PROBE_POLICY` 会为本模块请求指定策略。

## 结果含义

- **规则出口不是所有 App 的出口**：ipify 与 Cloudflare 是不同域名，可能命中不同分流。要比较 TAG 与搬瓦工，请将 `PROBE_POLICY` 填成相应现有策略并刷新。界面显示所指定的策略名；策略组最终选中的节点请在“查看实际连接”中确认。
- **IPv6 未确认不等于没有 IPv6**：专用 IPv6 接口失败、超时、代理不支持或 DNS 配置问题都会造成“未确认”。双栈 Cloudflare 返回 IPv4 时不会被当成 IPv6 证据。
- **HTTP 耗时不是 Ping**：包含 DNS、连接建立、TLS 和读取响应，只用于该次请求连通性参考；不是带宽测速、ICMP RTT、抖动或丢包检测。
- **CF POP 不是 IP 所在地**：`LAX` 等代码表示此次 Cloudflare 请求接入的边缘机房。它与节点地址、GeoIP 城市可能不同。
- **GeoIP 不是 GPS**：数据库估计地点，不保证与 Instagram / Google 的地区或解锁判断一致。不评定 IP 住宅属性或信誉；流媒体地区单独从服务页面识别，拿不到时显示“地区未确认”。
- **设备 DNS 不是实际上游**：`ctx.device.dnsServers` 是设备提供的列表，不能据此判断 Egern 内部实际使用的 DoH/DoQ、DNS 泄漏或 ECS。
- **SIM 信息不是活动网络**：蜂窝运营商/制式可在 Wi-Fi 下仍有值；界面分别标注。iOS 未提供 SSID 或相关权限不足时显示“未提供”，不会编造 Wi-Fi 名称。

## Liquid Glass

详细面板使用系统字体、背景色晕、无填充圆角容器、低强度 CSS `backdrop-filter` 模糊、细边缘高光和浅色/深色自动切换，布局适配 iPhone。它是网页实现的清透视觉，不调用 Apple 原生 Liquid Glass 材质或私有 API。

1.1.1 原生小组件只保留透明容器和细描边，已移除透明渐变与投影。DSL 没有公开的系统 `material/blur` 属性；桌面背景和材质由 iOS 与 Egern 宿主渲染，脚本无法保证墙纸透出。

## 流媒体检测

- **Netflix**：并发请求两个非自制测试片源（`81280792` / `70143836`）及一个原创片源（`80057281`）。必须识别到影片结构化元数据才能确认片源页面可访问；HTTP 200、登录页、验证码页不等于解锁。任一非自制片源可访问显示“非自制片源可用（抽样）”；两项均明确不可用且原创片源可访问才显示“仅自制剧（抽样）”。不保证所有片源或实际播放。
- **YouTube Premium**：请求 Premium 页面，区分明确地区不可用、可识别地区且存在 Premium/ad-free 页面特征、页面未知、HTTP 403 和 HTTP 429。检测地区支持情况，不检查账户会员订阅，也不保证视频播放。
- 两项默认按各自服务域名分流，和网络出口测试独立。想检测指定策略时填写 `NETFLIX_POLICY` / `YOUTUBE_POLICY`。不继承 `PROBE_POLICY`，避免误测分流场景。
- 不缓存解锁状态，刷新时重新检测。网站页面和测试片源可能变化，未确认结果不冒充解锁。

## 请求与隐私

仅打开面板、点击刷新或 Egern 刷新小组件时检测；没有定时后台脚本。单次最多 6 个出口/连通性请求 + 4 个流媒体请求 + 2 个在线 GeoIP 查询，独立并发。小组件建议 15 分钟后刷新，实际调度由 iOS 决定。

- `api.ipify.org` / `api6.ipify.org`：获取服务器观察到的 IPv4 / IPv6。
- `www.cloudflare.com/cdn-cgi/trace`：获取此次 Cloudflare 请求的地址、地区、POP 和协议信息。
- `www.netflix.com/title/...` 与 `www.youtube.com/premium`：读取服务自己的片源/地区页面，不提交账号 Cookie。
- `ipwho.is/<IPv4>`：仅在线 GeoIP 开启时提交对应公网 IPv4；不发送 SSID、BSSID、局域网地址或 DNS 列表。
- 查询请求省略 Cookie；最多缓存 12 个 IPv4 的 GeoIP 元数据 24 小时以减少限流。当前出口地址每次重新检测，缓存不用于伪造在线状态。
- Safari 本地面板不加载外部字体、图片、统计脚本。所有设备/接口数据通过 `textContent` 渲染；接口和页面不允许第三方 CORS 访问。复制摘要包含公网 IP 和当前连接名称，分享前可关闭 `SHOW_LOCAL`。

## 更新与验证

更新 Egern 模块即可获取对应版本。模块自动下载固定版本脚本，无需另外安装 JS 或运行开发工具。

已做 JavaScript/页面脚本语法、YAML 引用、模拟 Egern ctx 行为及模拟 DOM 页面交互检查，共 23 项。检查包含不同策略、IPv6 失败、GeoIP 限流、离线、隐私开关、HTTP 入口、文本安全渲染、刷新错误、复制回退、Netflix 片源证据和 YouTube Premium 地区证据。用户的 1.0.0 截图已确认大尺寸小组件在其设备上成功显示。浏览器运行包受当前环境限制，**1.1.1 尚未完成浏览器截图与 iPhone 真机解锁/布局验收**；最终透明度受 iOS 和 Egern 宿主背景影响。

## 官方接口参考

- [Egern JavaScript API](https://egernapp.com/zh-CN/docs/javascript-api/)
- [Egern Widget DSL](https://egernapp.com/zh-CN/docs/configuration/widgets/)
- [Egern 模块](https://egernapp.com/zh-CN/docs/configuration/modules/)
- [Egern URL Scheme](https://egernapp.com/zh-CN/docs/url-scheme/)
- [ipify IPv4 / IPv6](https://www.ipify.org/)
- [ipwho.is 文档](https://ipwhois.io/documentation)
- [Cloudflare cdn-cgi](https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/)
