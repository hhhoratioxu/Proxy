# Egern 流媒体解锁查询

Egern 原生 `generic` 脚本 + Widget 模块。

**这一版不会给所有检测指定同一个代理策略。每一个请求都交给 Egern 当前 Rules 按顺序匹配，因此会自动继承你给不同服务配置的不同 policy。**

例如你的实际配置可以是：

- Apple → 台湾
- Spotify → 美国
- AI → 美国
- Netflix → 另一个流媒体策略
- Disney+ → 另一个策略
- YouTube → Google / YouTube 策略

插件会按这些分流分别检测，而不是拿 Final 或某个统一节点代表全部服务。

## 支持项目

### 分流地区自检

- Apple：请求 `gspe1-ssl.ls.apple.com/pep/gcc`，因此命中 Apple Rule Set
- AI：请求 `chatgpt.com/cdn-cgi/trace`，因此命中 AI Rule Set
- Spotify：使用 Spotify 自身接口返回地区，因此命中 Spotify Rule Set

Widget 顶部会类似显示：

```text
Apple TW · AI US · Spotify US
```

这三个结果是实际请求得到的地区，不是写死。

### 流媒体解锁

- Netflix（完整解锁 / 仅自制剧或受限）
- Disney+
- YouTube Premium
- Amazon Prime Video
- Spotify
- Max
- Paramount+
- Peacock
- BBC iPlayer
- Abema
- Bahamut Anime（巴哈姆特动画疯）
- KKTV

每一个检测请求都使用该服务自己的域名，所以会继续经过你现有的对应规则。如果没有对应 Rule Set，则按你的规则顺序继续匹配，最终才会落到 Final。

## 一键订阅

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/StreamingUnlock.yaml
```

在 Egern 中把上面的 URL 添加为远程 Module 并启用即可。

## 重要变化

旧版提供了 `POLICY` 参数，可以强制所有检测走同一个节点。

**新版已移除这个参数。**

原因是你的使用方式本身就是精细分流：Apple、Spotify、AI、Netflix、Disney+ 等服务可能使用完全不同的策略。统一 `POLICY` 会绕开你的 Rules，导致检测结果和真实 App 使用路径不一致。

现在脚本的 HTTP 请求不传 `policy`，由 Egern Rules 决定实际代理路径。

## TIMEOUT

默认：

```yaml
TIMEOUT: "8000"
```

单位为毫秒。网络较慢时可以改成 10000 或 12000。

## Widget

- Small：显示分流摘要 + 前 3 个流媒体项目
- Medium：显示分流摘要 + 前 5 个项目
- Large / Extra Large：显示全部流媒体项目
- Lock Screen：显示精简的分流摘要

默认约 30 分钟请求刷新一次。

## 状态

- ✅：确认解锁 / 可访问
- ⚠️：部分解锁、受限或只确认到地区
- ❌：明确地区限制
- ❓：接口异常、超时、服务风控或检测接口变化

## 关于“地区”和“账号区”

这里显示的是**该请求经过 Egern 分流后的网络出口 / 服务识别地区**，不是 Apple ID、Spotify 账号或其他账号本身注册的国家/地区。

例如 Apple 检测显示 `TW`，代表 Apple 的这个网络请求通过你的规则后被 Apple 识别为台湾地区。

## 文件

- `Egern/Modules/StreamingUnlock.yaml`
- `Egern/Scripts/StreamingUnlock.js`

流媒体服务可能修改页面、API 或风控逻辑，因此个别项目未来可能需要更新检测方式。
