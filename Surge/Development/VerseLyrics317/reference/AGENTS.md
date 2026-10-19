# Proxy 仓库工作约定

用户指定：本仓库后续所有涉及 Loon 的项目，以以下官方文档作为首要依据。此要求也适用于其他目录中的共享源码，只要其产物包含 Loon 版本。

- 总览：https://nsloon.app/docs/intro/
- Script：https://nsloon.app/docs/Script/script_v2/
- Script API：https://nsloon.app/docs/Script/script_api/
- Rewrite：https://nsloon.app/docs/Rewrite/rewrite_v2/
- 插件：https://nsloon.app/docs/Plugin/

开始 Loon 工作前阅读 [Loon 官方文档适配记录](Loon/Docs/OfficialReference.md)；改动语法、运行时 API 或最低版本时重新核对对应官方页面，记录核对日期。仓库记录是实践摘要，官方更新优先。

各客户端使用自己的原生语法和 API，不把其他代理软件的参数直接移植到 Loon。不要猜测内存上限、取消请求能力或未公开的配置字段。对正文、缓存、并发、超时和异步完成做明确的边界处理；自动测试与真实设备的 VPN 稳定性结论分开报告。

发布前核对实际生成的导入文件和运行脚本；使用最新远端主分支并保护并发修改。GitHub 资源路径遵循现有大小写，插件与脚本放在各客户端的 `script` 下，路由列表放在 `rule` 下。
