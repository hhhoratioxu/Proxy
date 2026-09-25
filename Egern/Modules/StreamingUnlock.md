# Egern 流媒体解锁查询

Egern 原生 `generic` 脚本 + Widget 模块，用于查询当前网络出口或指定 Egern 策略的主流流媒体解锁状态。

## 支持项目

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

同时显示当前检测出口 IP 与国家/地区代码。

## 一键订阅

模块 Raw URL：

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/StreamingUnlock.yaml
```

在 Egern 中把上面的 URL 添加为远程 Module 并启用即可。模块启用后会同时注册 `Streaming Unlock` 通用脚本与 Widget。

## 使用方式

### 1. 检测当前实际分流

保持 `POLICY` 为空。每个检测请求会按照 Egern 当前配置的 Rules / Final 实际路由，因此最接近真实 App 使用结果。

### 2. 强制检测指定策略或节点

添加模块时设置兼容参数：

```yaml
modules:
  - name: "Streaming Unlock"
    url: "https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/StreamingUnlock.yaml"
    compat_arguments:
      POLICY: "你的策略组或节点名称"
      TIMEOUT: "8000"
```

`POLICY` 必须与 Egern 中的策略组/节点名称完全一致。

### 3. 手动查询

运行 Egern 中的 `Streaming Unlock` generic 脚本。手动执行时会发送一条汇总通知。

### 4. Widget

模块会注册同名 Widget：

- Small：显示汇总 + 前 4 项
- Medium：显示汇总 + 前 6 项
- Large / Extra Large：显示全部项目
- Lock Screen：显示精简汇总

Widget 默认约 30 分钟请求刷新一次。

## 状态说明

- ✅ 解锁：检测接口/测试内容确认可访问
- ⚠️ 部分：例如 Netflix 仅自制剧、Abema 仅海外内容，或服务返回地区但无法完全确认
- ❌ 不可用：检测到明确地区限制或拒绝
- ❓ 失败：接口变化、超时、风控或页面格式改变

## 说明

流媒体服务会随时修改接口、风控、页面结构和地区策略；检测结果只代表当次请求的网络出口与当时状态。不同服务若由你的 Egern Rules 分配到不同策略，保持 `POLICY` 为空时结果也会分别反映各自的实际分流出口。

检测逻辑参考了 Egern 官方 JavaScript API / Widget 能力，以及社区项目 `lmc999/RegionRestrictionCheck` 的公开检测思路；本实现为 Egern JavaScript 原生重写。
