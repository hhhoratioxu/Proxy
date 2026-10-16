from pathlib import Path
import json,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
oldpin='c35a07c9a851cba4c9f33c9d421cb68cf36b0784'
oldnative='fdb2f8cfc2701a7959d7ee58c1f2ab01ce368fc1'
files={}
color_note='**0.4.2 配色修正：** 补充歌词使用同一首歌曲的 Spotify 公开配色，普通文字和高亮文字分别设色；替换旧版固定的深绿黑背景。旧缓存会自动应用新配色，原词、时间轴及已有官方歌词的配色保持不变。'
limit_note='用户已确认《那页夏天》在 Loon 能显示补充歌词；Egern 此前的无词问题仍未解决。本次同步配色不代表所有客户端、所有无词歌曲均已通过实机验证，补源仍受客户端请求行为及来源收录限制。'
color_details='补充歌词优先保留歌词接口已有的有效配色，否则读取同一歌曲公开嵌入页面的 `visualIdentity`，核对歌曲 ID、颜色范围和文字对比度。取色与补词并行，最多使用现有总预算中的 1.5 秒；成功缓存一天，失败使用中性灰并缓存五分钟，仍可返回已经找到的歌词。'
validation='2026-10-16：281 项自动检查通过，覆盖核心回归、五客户端打包接口、JSON / Protobuf、缓存换色、翻译替换及原生配置。五个运行版本均在接口模拟环境中完成了真实公开取色，并返回预期的原生 Protobuf 颜色。新版的各客户端实际导入和 iPhone 最终画面尚未实测。'
privacy='取色仅向 `open.spotify.com` 发送歌曲 ID，不附带当前请求的 Spotify 授权、客户端令牌或 Cookie；无需新增解密域名。'
for client,ext in [('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
    path=f'{client}/script/SpotifyLyrics.{ext}'
    files[path]=base[path].replace('核心 0.4.1 · 适配 1。使用插件译文替换官方译文；官方无词歌曲仍可能不显示，本次未修复该问题。需 HTTPS 解密。','核心 0.4.2 · 适配 1。补充歌词跟随歌曲配色，区分普通文字与高亮文字；使用插件译文替换官方译文。需 HTTPS 解密。').replace(oldpin,pin)
    path=f'{client}/Docs/SpotifyLyrics.md';s=base[path].replace('核心 **0.4.1**','核心 **0.4.2**')
    s=s.replace('**已知问题：官方原本没有歌词的歌曲，仍可能完全不显示歌词。用户在 Egern / iOS Spotify 9.1.92.3058 已反馈此问题未解决；本次发布移植了相同核心，没有把移植视为修复。**',color_note+'\n\n'+limit_note)
    s=s.replace('## 安装\n','## 安装与更新\n\n已安装的用户更新原模块或重写引用，再重新打开 Spotify；原来的导入地址继续有效。\n')
    s=s.replace('四种客户端接口模拟测试与 0.4.1 核心回归通过，覆盖 JSON / Protobuf、替换译文、共享缓存、二进制 HTTP 与错误透传。没有完成四种客户端的实际导入和 iPhone Spotify 播放验证。',color_details+'\n\n'+validation)
    s=s.replace('没有诊断通知或定时监测。',privacy+'没有诊断通知或定时监测。')
    s=s.replace(oldpin,pin).replace('/Surge/Development/VerseLyricsPorts','/Surge/Development/VerseLyrics042')
    files[path]=s
path='Egern/script/SpotifyLyrics.yaml'
files[path]=base[path].replace('0.4.1','0.4.2').replace(oldnative,pin).replace('description: 自动补充缺失歌词，以插件中文译文替换官方译文，保留 Spotify 原生歌词显示；默认开启，无需诊断通知。需 HTTPS 解密。','description: 尝试补充缺失歌词并跟随歌曲配色，区分普通文字与高亮文字；以插件译文替换官方译文。需 HTTPS 解密。')
path='Egern/Docs/SpotifyLyrics.md';s=base[path].replace('当前模块：0.4.1','当前模块：0.4.2')
s=s.replace('## 安装\n',color_note+'\n\n## 安装与更新\n\n已安装的用户更新原模块，再重新打开 Spotify；原来的导入地址继续有效。\n')
s=s.replace('0.4.1 已完成本地协议和真实歌词来源检查，但用户在 iOS Spotify 9.1.92.3058 已确认官方无词歌曲仍不显示，此问题尚未解决。新增其他代理客户端版本沿用相同核心，并未修复该问题。当前原生二进制、播放上下文和播放状态适配依赖 Spotify 实际使用的网络格式。',limit_note+'\n\n'+color_details+'\n\n'+validation+'\n\n'+privacy+'脚本不保存或记录 Spotify 授权令牌；歌词来源收到歌曲信息，翻译服务收到待翻译歌词文本。')
s=s.replace(oldnative,pin)
s=s.replace('[返回 Egern](../README.md)',f'[固定运行脚本](https://raw.githubusercontent.com/hhhoratioxu/Proxy/{pin}/Egern/script/SpotifyLyrics/spotify-lyrics.js) · [源码与验证记录](https://github.com/hhhoratioxu/Proxy/tree/{pin}/Surge/Development/VerseLyrics042) · [Egern 原生 API](https://egernapp.com/docs/javascript-api/)\n\n[其他客户端](../../README.md) · [返回 Egern](../README.md)')
files[path]=s
s=base['README.md'].replace('Loon **0.4.2** 修正补充歌词的背景与文字配色；其余客户端保持核心 0.4.1。','Egern、Surge、Loon、Shadowrocket、Quantumult X 已统一为 **0.4.2**，同步修正补充歌词的背景与文字配色。')
s=s.replace('Loon 0.4.2 fixes fallback lyric colors; other clients remain on core 0.4.1.','All five clients now use core 0.4.2 with the fallback lyric color correction.')
files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('这些版本仍有官方无词歌曲不显示的已知问题。','五个受支持客户端已统一更新到 0.4.2，修正补充歌词配色。Loon 已有用户确认补词成功；Egern 的无词问题仍未解决，其他客户端的实际显示效果尚未实机验证。')
for path,text in files.items():
    p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
# The already published Loon bytes and its current runtime pin are deliberately retained.
p=root/'publish/Loon/script/SpotifyLyrics.plugin';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(base['Loon/script/SpotifyLyrics.plugin'])
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'production_files':list(files),'runtime_pin':pin},ensure_ascii=False))
