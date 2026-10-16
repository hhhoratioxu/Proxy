"""Release preparation; only YouTube installation files and documentation change."""
import re
import sys
from pathlib import Path

repo = Path(sys.argv[1])
source_ref = sys.argv[2]
clients = {"Egern": "yaml", "Surge": "sgmodule", "Loon": "plugin", "Shadowrocket": "sgmodule", "QuantumultX": "conf"}
raw = "https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/"
source = f"https://github.com/hhhoratioxu/Proxy/tree/{source_ref}/Surge/script/YouTubeClean"
for client, ext in clients.items():
    for path in [f"{client}/script/YouTubeAdTranslate.{ext}", f"{client}/Docs/YouTubeAdTranslate.md"]:
        (repo / path).unlink(missing_ok=True)
for path in ["Egern/script/YouTubeEnhance.yaml", "Egern/Docs/YouTubeEnhance.md", "Clash/Docs/YouTubeAdTranslate.md"]:
    (repo / path).unlink(missing_ok=True)

table = "| 客户端 | 合并插件安装入口 |\n| --- | --- |\n" + "\n".join(
    f"| {client.replace('QuantumultX', 'Quantumult X')} | [YouTubeClean.{ext}]({raw}{client}/script/YouTubeClean.{ext}) |" for client, ext in clients.items()
) + "\n| Clash / Mihomo | [能力限制与其他客户端入口](./Clash/Docs/YouTubeClean.md) |"
section = f"""## YouTube Clean · 去广告、双语字幕与底栏控制

**1.0.0 独立重写版**。旧 YouTubeAdTranslate 与 Egern YouTubeEnhance 已移除。去广告和翻译共用一个插件，默认原文＋简体中文；发布「＋」与 Shorts 底栏分别可选隐藏，默认隐藏发布「＋」、保留 Shorts。更改设置后强制退出并重新打开 YouTube。

{table}

61 项本地检查通过；公开原生播放器数据保留 52 条原字幕并新增 1 条轨道。公开底栏数据未出现发布「＋」与 Shorts；字幕下载返回 HTTP 429。手机客户端导入、实际去广告、按钮隐藏与字幕显示仍待真机验收。[源码与验证说明]({source})。

"""
readme_path = repo / "README.md"
readme = readme_path.read_text()
readme, count = re.subn(r"## YouTube[^\n]*\n.*?(?=## Spotify)", lambda _: section, readme, count=1, flags=re.S)
assert count == 1
english = "YouTube Clean 1.0.0 is an independently written combined plugin for ad removal, bilingual subtitles and separate bottom upload/Shorts controls. Upload is hidden by default; Shorts remains visible by default. The previous YouTube entries were removed. Sixty-one local checks and public native-response processing passed; public caption downloads returned HTTP 429. Native imports, actual ad removal, button visibility and subtitle display require device acceptance. [Compatibility guide](./Clash/Docs/YouTubeClean.md)."
readme, count = re.subn(r"YouTube AdTranslate 0\.1\.0[^\n]+", lambda _: english, readme, count=1)
assert count == 1
readme_path.write_text(readme)
for client, ext in clients.items():
    path = repo / client / "README.md"
    text = path.read_text()
    text = "\n".join(line for line in text.split("\n") if "YouTubeEnhance" not in line)
    text = text.replace("YouTubeAdTranslate", "YouTubeClean").replace("| YouTube 去广告与双语字幕 |", "| YouTube Clean · 去广告、双语字幕与底栏 |")
    path.write_text(text)

install = {
    "Egern": "在 Egern 的模块管理中新增远程模块，粘贴上方链接。进入该模块的设置，分别调整「隐藏底部发布＋」与「隐藏底部 Shorts」。使用支持原生 ESM 脚本和模块环境变量的当前版本。",
    "Surge": "在 Surge 的模块管理中添加上方远程模块。进入模块参数，分别修改 `HIDE_UPLOAD` 与 `HIDE_SHORTS`。填 `true` 隐藏，填 `false` 保留。",
    "Loon": "需要 Loon 3.5.1（983）或更新版本。在插件管理中添加上方链接，再进入插件设置，分别切换「隐藏底部发布＋」与「隐藏底部 Shorts」。",
    "Shadowrocket": "在 Shadowrocket 模块管理中添加上方链接。要调整设置，编辑模块中两条 `[Script]` 的 `argument`，将两处对应值同步修改。该客户端使用兼容脚本接口适配，完整官方规范尚未取得，未标为官方验证。",
    "QuantumultX": "需要 Quantumult X build 934 或更新版本。在「重写 → 引用」添加上方链接。要调整设置，编辑重写引用里两条脚本 URL 的 `#` 参数，保持两处值一致。`true` 表示开启，`false` 表示关闭。",
}
settings = """| 设置 | 默认 | 含义 |
| --- | --- | --- |
| `HIDE_UPLOAD` | `true` | 隐藏底部发布「＋」按钮 |
| `HIDE_SHORTS` | `false` | 隐藏底部 Shorts 按钮 |
| `REMOVE_ADS` | `true` | 清理已识别的播放器及信息流广告 |
| `TRANSLATE_CAPTIONS` | `true` | 为已有字幕添加翻译轨道 |
| `TARGET_LANGUAGE` | `zh-Hans` | 简体中文；可选 `zh-Hant`、`en`、`ja`、`ko` 等 |
| `BILINGUAL` | `true` | 原文在上，译文在下 |
| `AUTO_CAPTIONS` | `true` | 优先选择新增字幕轨道；仍受 App 行为影响 |"""
for client, ext in clients.items():
    text = f"""# YouTube Clean · {client.replace('QuantumultX', 'Quantumult X')}

**1.0.0 独立重写版**：一个插件包含去广告、双语字幕，以及底部发布「＋」和 Shorts 的独立隐藏开关。

[安装 YouTubeClean.{ext}]({raw}{client}/script/YouTubeClean.{ext})

## 安装与设置

{install[client]}

先删除或停用旧的 YouTubeAdTranslate、YouTubeEnhance，以及其他处理相同流量的 YouTube 插件。新入口不会自动删除手机上已经安装的旧模块。只保留这一套，确认客户端已开启 HTTPS 解密，并已安装和信任你自己的解密证书；运行脚本由客户端自动下载，无需单独安装 JS。

{settings}

两个底栏开关相互独立。想同时隐藏发布「＋」与 Shorts，设置 `HIDE_UPLOAD=true` 和 `HIDE_SHORTS=true`；全部保留则都设为 `false`。关闭广告和翻译后，底栏设置仍然生效。这两个设置只控制底栏按钮，保留普通 Shorts 视频内容。

保存后强制退出 YouTube，再重新打开。客户端可能缓存导航或字幕列表；如果立即切换仍未变化，请先确认新模块已重新加载、旧模块已停用，以及 `guide` 接口确实被 HTTPS 解密。

## 字幕与广告

默认在字幕菜单中新增「双语字幕 · 简体中文」轨道，保留原有轨道。原文在上、中文在下。视频必须已有原字幕或 YouTube 自动字幕，且对应字幕可翻译；本插件不能为无字幕视频生成语音识别。

清理已知播放器广告、广告断点参数和信息流广告卡片；处理支持的加密播放元数据。广告策略和字幕/底栏处理器由本实现编写，不加载旧 YouTube 插件。通用加密与压缩库及 MIT 协议字段声明有明确许可，见[源码、构建与许可]({source})。

## 工作范围与失败处理

只运行于已列出的 YouTube API、`initplayback` 与字幕 URL。解密主机为 `youtubei.googleapis.com`、`youtubei-att.googleapis.com`、`www.youtube.com`、`m.youtube.com`、`*.googlevideo.com`。普通 `videoplayback` 不运行响应脚本，模块不添加路由规则或替换代理策略。

二进制未知字段保留原始字节，错误数据、认证失败、缺少密钥、不支持的压缩或翻译下载失败保留原响应。播放密钥仅保存在当前代理客户端本地，不输出到日志。双语合成最多向同一 YouTube 原字幕地址额外请求一次，4 秒限时，不转发账号 Cookie 或 Authorization，无需付费翻译密钥。二进制上限 8 MiB，字幕上限 1 MiB。

服务端广告实验、不同 App 版本、缓存和 HTTP/3 可能影响命中，不能保证清除所有广告或所有布局的按钮。创作者口播推广不在清理范围内。

## 验证状态

2026-10-16：**61 项本地检查通过**，包括五种客户端接口模拟、开关组合、原始字段保留、独立加密校验、gzip、失败回退与字幕时间轴合成。真实公开 iOS 原生 player 响应由 71,245 字节改为 71,634 字节，52 条原字幕轨道逐字节保留，新增 1 条翻译轨道；除字幕和已知广告字段外的顶层数据逐字节保留。

匿名 guide 响应证实了在线/离线底栏结构，但该样本未出现发布「＋」与 Shorts；删除这两个按钮仅用结构一致的自写样本验证。真实 player 样本仅含广告心跳字段，没有投放中的广告视频。公开字幕下载返回 HTTP 429。

**尚未完成原生手机客户端导入、实际去广告、按钮隐藏、字幕显示、拖动和连续播放的真机验收。** 请以你当前客户端的实际流量和界面为准；出现播放异常时可停用模块并检查旧模块冲突及 HTTPS 解密状态。

[返回客户端说明](../README.md) · [所有客户端入口](../../README.md)
"""
    (repo / client / "Docs" / "YouTubeClean.md").write_text(text)

(repo / "Clash/Docs/YouTubeClean.md").write_text(f"""# YouTube Clean 与 Clash / Mihomo

Clash/Mihomo 标准核心没有这套功能所需的 HTTPS 响应体 JavaScript 改写能力，无法通过普通域名分流实现 YouTube 去广告、双语字幕或隐藏底部发布「＋」与 Shorts。本目录仅提供能力说明，不提供功能等价的配置。

可选择仓库中支持响应脚本的客户端，每个客户端只安装一个新插件：

{table.replace('./Clash/Docs/YouTubeClean.md', 'https://github.com/hhhoratioxu/Proxy/blob/main/Clash/Docs/YouTubeClean.md')}

新插件为 1.0.0 独立重写版；旧 YouTubeAdTranslate 与 Egern YouTubeEnhance 已移除。发布「＋」与 Shorts 分别设置，使用说明与未完成的真机验证项目见各客户端 Docs。

[Mihomo 官方项目相关能力讨论](https://github.com/MetaCubeX/mihomo/issues/2237) · [源码与验证范围]({source}) · [返回目录](../README.md)
""")
clash = repo / "Clash/README.md"
clash.write_text(clash.read_text().replace("YouTubeAdTranslate", "YouTubeClean").replace("YouTube 去广告与双语字幕能力说明", "YouTube Clean 去广告、双语字幕与底栏能力说明"))
print("Prepared YouTube docs, READMEs and 13 old-entry removals")
