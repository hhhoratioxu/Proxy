# VerseLyrics 订阅入口更新 · 2026.11.14

用户已授权更新并推送实际订阅。本次直接修改既有 `Loon/script/SpotifyLyrics.lpx`，原始 URL 不变；核心仍为正常工作的 3.2.2，新增的是 Loon 的平台配置与 Mac 显示适配，不把配置日期冒充核心版本升级。

在 Loon 更新远程插件后，打开插件参数中的**运行平台**：

- iPhone / iPad 使用 `mobile`（默认）。原有十二个设置的默认值和类型、三条原生 Rewrite、两条 Response Script、正文边界及其固定运行版本保持原样；不会选中或执行 Mac Request / Response Script。
- Mac 使用 `macOS`。加载已有静音实测的 Request / Lyrics / Entry 三个脚本，JSON 逐行歌词显示已有的原词及译文。完全无词的桌面入口仍未完成，逐字场景不伪造时间戳。

没有新增后台请求、运行时脚本下载器、诊断上传、解密域名或账号权限。运行脚本由 Loon 从固定 Git 提交加载，不需要本地 Python 服务。原插件名称和十二个参数键不变，用户已保存的设置继续由 Loon 保留；新平台参数默认 `mobile`，Mac 用户需要选择一次 `macOS` 并保存。

手机 **< 50,000,000 字节**仍是部署验收目标，iOS 整个代理扩展的峰值尚无实机证据；本次不会用版本号或缓存设置暗示手机已经达标。此前 288 个桌面 JSC 进程的测量保持原范围。Mac 产品没有 50 MB 上限。

## 来源与构建

手机基线：`10049053ce86bd992e3ebb6511ffb28312ba86fb`。Mac 源码及已测试产物：`9f7399dda1279689d2436e981a547b1ea45513b3:Loon/Development/SpotifyMac20261114`。三个公开 JS 与对应测试产物逐字节相同，不包含 Debug / CacheProbe / Observe。

先运行 `node build-subscription.mjs artifacts` 写入三份客户端 `script` 产物，再将它们提交到 Git。随后用产物提交的完整哈希生成入口：

```sh
node build-subscription.mjs profile <40位运行产物提交>
npm test
```

`artifacts-manifest.json` 与 `subscription-manifest.json` 记录来源、实际大小、SHA-256 和未验收状态。只有产物提交中三份脚本与已测试产物逐字节一致时才能生成入口；插件引用完整提交，避免入口与运行文件版本不一致。

自动检查包括原有手机路径和参数不变、手机不选择执行 Mac 代码、状态/容量/内部请求守卫、Mac 的请求方法和唯一响应路径、无本地服务依赖、固定 Git 对象及配置哈希。客户端仍可能按自己的机制预下载并缓存未选中分支的远程文件；这里不将未选中等同于文件不下载，也不据此保证宿主峰值。条件解释器复用原基线的离线夹具，不冒充 Loon 原生解析器；Mac 真实界面证据与 iOS / Surge 待验证状态分开报告。

依据：[Loon Script](https://nsloon.app/docs/Script/script_v2/)、[Plugin](https://nsloon.app/docs/Plugin/)、[Script API](https://nsloon.app/docs/Script/script_api/)，2026-11-14 重新核对。平台选项是插件自己的 string select，通过官方条件表达式选择固定脚本；没有臆造系统条件变量，也没有把不同客户端 API 混用。
