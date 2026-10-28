# Rule Finder 自动规则目录

公开目录：[RuleFinder-Catalog.json](./RuleFinder-Catalog.json)

此目录供 [分流规则定位器](https://hhhoratioxu.github.io/Toolbox/RuleFinder/) 读取，收录六个客户端 `rule/` 中的分流文件。它只描述文件路径、大小、Git blob SHA 和来源提交，不包含节点或用户配置，不改变现有订阅地址和任何规则内容。

向 main 提交新增、修改或删除的规则文件后，`Update Rule Finder catalog` 工作流自动重建目录。通常需要等待该工作流完成，再在工具里点击「更新规则库」。网页优先读取这个公开 Raw 文件，不要求 GitHub 登录，也不依赖匿名目录 API 的额度；公开目录不可用时才尝试 API。

`commit` 是构建目录时包含规则原文的提交；后续的目录更新提交只更改目录自身。工具按此固定提交下载原文并校验文件 SHA，同时保留指向 main 的订阅地址。

新增分类会自动出现在工具选择列表；已添加的修改文件会同步，已删除来源保留旧原文并标为不可用。配置文件的规则 URL 跟随 main，可在代理客户端刷新内容；新增分类需要回到工具重新选择生成。

工作流只提交 `Docs/RuleFinder-Catalog.json`。如果 main 并发前进，会获取最新分支后重新生成，最多重试三次；不强推、不改写分流文件。目录刷新不代表真实客户端、节点或流量已验收。
