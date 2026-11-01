from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
meta=json.loads((root/'release.json').read_text());base=json.loads((root/'base.json').read_text())['files'];files={}
v,prev=meta['version'],meta['previous'];pin=sys.argv[1] if len(sys.argv)>1 else '0'*40;count=sys.argv[2] if len(sys.argv)>2 else '待验证'
oldpin=re.search(r'Proxy/([0-9a-f]{40})/',base['Loon/script/SpotifyLyrics.lpx'])[1]
def update(s):
 return (s.replace(prev,v).replace('VerseLyrics'+prev.replace('.',''),'VerseLyrics'+v.replace('.','')).replace(oldpin,pin)
  .replace('name: 无词时的备用源','name: 补词与同步歌词来源')
  .replace('始终优先 Spotify 原词，指定一家仅影响无词后的选择。','官方同步歌词保持原样；官方无词或只有静态歌词时按所选来源补充或升级。')
  .replace('官方无词时依次核对六源','官方无词时核对六源；只有静态歌词时搜索真实同步来源')
  .replace('无词时顺序尝试六源','无词时核对六源；官方静态歌词尝试升级为真实同步歌词')
  .replace('Spotify 已有的原词和时间轴继续保留。','Spotify 已有同步歌词的原词和时间轴继续保留；官方只有静态歌词时尝试真实同步来源，未匹配则保留原词。')
  .replace('关闭则全部使用翻译服务。','关闭则使用翻译服务；中文目标仅翻译英语歌曲。')
  .replace('客户端适配 **17**','客户端适配 **18**')
  .replace('以插件译文替换全部官方译文列表','中文目标仅翻译英语歌曲；非英语歌曲中的英文保持原样，移除旧官方译文')
  .replace('使用插件译文替换官方译文列表。','中文目标仅翻译英语歌曲；非英语歌曲中的英文保持原样，移除旧官方译文。')
  .replace('简体中文目标下，复用补词响应中严格对齐的中文译文；关闭后忽略此类缓存并使用翻译服务。','仅英语歌曲且目标为简体中文时，复用严格对齐的来源译文；关闭后使用翻译服务。'))
intro=f"当前发布 **{v}**（原生适配 18）。"+meta['intro']+'\n\n保留六源补词、插件翻译、原生时间轴与高亮。缓存和网络都有明确上限；未收录的歌曲仍不能凭空补全。本地自动测试与 macOS JavaScriptCore 测量不等于 iPhone Loon 实机 VPN 验收，不能保证所有设备都不会被系统终止。\n'
intro+='\n中文翻译按整首歌词判断：中文、日语、韩语等歌曲即使夹英文也不翻译；旧官方、来源及缓存译文均受此规则限制。英语歌曲仍过滤 oh 等语气词。来源未给语言时只接受有明确英文用词且无其他文字体系的歌词，不确定时保留原词；此轻量判断不是权威语言检测。用户手动选择非中文目标时保留原有翻译行为。\n'
for c,e in [('Egern','yaml'),('Loon','lpx'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{c}/script/SpotifyLyrics.{e}';s=update(base[path]);s=re.sub(r'^description: .*$' if c=='Egern' else r'^#!desc = .*$',lambda _:('description: ' if c=='Egern' else '#!desc = ')+f'核心 {v} · 适配 18。'+meta['summary']+' 保留补词、翻译与原生高亮。需 HTTPS 解密。',s,flags=re.M)
 s=re.sub(r'^#!date = .*$', '#!date = 2026-11-01',s,flags=re.M);s=s.replace('开启后用插件译文替换官方译文','中文目标仅翻译英语歌曲；中文及其他语言歌曲夹英文不翻译');files[path]=s
 old=base[f'{c}/Docs/SpotifyLyrics.md'];start=old.index('当前模块：'+prev if c=='Egern' else '核心 **'+prev+'**');rest=old[start:];rest='\n\n'.join(p for p in rest.split('\n\n') if not re.match(r'\d{4}-\d{2}-\d{2}：',p.lstrip()))
 files[f'{c}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+update(rest)+f'\n\n2026-11-01：{count} 项自动测试通过。每版实际改动、完整测量数据和重现命令见固定源码 README；测试不等同于 iPhone 实机 VPN 验收。\n'
s=update(base['README.md']);s=re.sub(r'统一为 \*\*'+re.escape(v)+r'\*\*，[^\n]+?(?=Shadowrocket)',f'统一为 **{v}**，'+meta['summary']+' 保留六源补词、插件翻译与原生高亮。性能测量范围见固定源码，未做 iPhone VPN 验收。',s)
s=re.sub(r'All five clients now use core '+re.escape(v)+r'[^\n]+?(?=Complete official Shadowrocket)',f'All five clients now use core {v}. '+meta['english']+' Six sources, plugin translations and native highlighting remain. Measurements do not establish iPhone VPN stability. ',s);files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=re.sub(r'中文夹英文按片段翻译[^。]+。','中文目标仅翻译英语歌曲，其他语言歌曲中的英文保持原样；保留同步补词、原生高亮和缓存边界。',update(base['Clash/Docs/SpotifyLyrics.md']))
from options import apply_options
apply_options(files,meta.get("options",[]))
files["Loon/README.md"]=base["Loon/README.md"]
for path in ["AGENTS.md","Loon/Docs/OfficialReference.md"]:
 files[path]=(root/"reference"/path).read_text()
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'version':v,'tests':count}))
