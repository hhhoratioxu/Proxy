# Streaming Unlock for Egern

一个只保留 **Netflix / Max / YouTube Premium / ChatGPT** 的 Egern 原生流媒体解锁查询小组件。

## 设计

- iOS 原生风格动态浅色 / 深色
- 2×2 圆角卡片布局
- SF Symbols + iOS 系统色
- 每项显示：
  - 解锁状态
  - 服务识别地区
  - 对应 Egern 策略组
  - 策略与出口信息（手动填写节点名时显示节点）
- 点击任意服务卡片会打开 Egern **Connections**，可直接查看该请求实际使用的连接和节点

## 检测逻辑

这一版采用“**能确认才报已解锁**”的严格判定：

- **Netflix**：检测两个非 Originals 测试片源。两个都返回 `Oh no!` 才判“仅自制剧”；至少一个测试片源正常返回才判“完整片库”。网络或页面异常不会冒充解锁。
- **Max**：读取 Max 返回的 `countryCode`，再与页面公布的可用国家列表比对。**拿不到地区直接显示检测失败**，不会因为首页返回 200 就判解锁。
- **YouTube Premium**：同时检查 `www.google.cn`、`Premium is not available in your country`、`INNERTUBE_CONTEXT_GL` 和 `ad-free`。只有出现 Premium 的 `ad-free` 页面特征才判“Premium 可用”；页面结构异常显示检测失败。
- **ChatGPT**：同时请求 OpenAI 的 `compliance/cookie_requirements` 与 `ios.chat.openai.com`，分别判断 `unsupported_country` 和 `VPN` 限制，可区分：
  - Web + App 可用
  - 仅 Web 可用
  - 仅 App 可用
  - Web + App 不可用

ChatGPT 的地区与出口 IP 另外通过 `chatgpt.com/cdn-cgi/trace` 获取，只用于显示出口，不单独作为“已解锁”的判据。

## 分流逻辑

脚本不会指定统一 `policy`，所有请求都交给你当前的 Egern Rules 继续匹配：

| 服务 | 对应规则 / 策略提示 |
| --- | --- |
| Netflix | Netflix |
| Max | HBOMAX |
| YouTube Premium | Google / YouTube |
| ChatGPT | AI |

因此你给这四类服务设置不同国家或不同策略时，检测也会分别走自己的线路。

## 关于“节点名称”

Egern 当前公开的 JavaScript API 支持给请求指定 `policy`，但没有提供 API 让 generic/widget 脚本读取“某个策略组最终选中的具体代理节点名称”。

因此本模块不会伪造节点名：

- ChatGPT：可自动显示通过 AI 规则后的真实出口 IP + 地区
- Netflix / Max / YouTube：显示各服务自己识别到的地区 + 对应策略；未手动填写节点名时，界面明确标为“出口”，不会把策略名冒充节点名
- 点击卡片：直接进入 `egern:/connections` 查看真实节点；Widget 内无法从公开脚本 API 自动读取策略组最终选中的节点名称
- 如果你希望 Widget 固定显示你的节点名字，可以在模块设置里填写 `NETFLIX_NODE` / `MAX_NODE` / `YOUTUBE_NODE` / `CHATGPT_NODE`
- 这些字段**只负责显示，不会改变路由**

## 一键订阅

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/StreamingUnlock.yaml
```

也可以使用 Egern URL Scheme：

```text
egern:/modules/new?name=Streaming%20Unlock&url=https%3A%2F%2Fraw.githubusercontent.com%2Fhhhoratioxu%2FProxy%2Fmain%2FEgern%2FModules%2FStreamingUnlock.yaml
```

## 状态

- 绿色：已解锁
- 橙色：部分可用
- 红色：不可用
- 灰色：检测失败

## 文件

- `Egern/Modules/StreamingUnlock.yaml`
- `Egern/Scripts/StreamingUnlock.js`

流媒体网站会修改页面和接口，因此未来个别检测项可能需要随服务更新。
