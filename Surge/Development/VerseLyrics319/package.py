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
  .replace('关闭则全部使用翻译服务。','关闭则外语行使用翻译服务，中文原词不简繁互译。'))
intro=f"当前发布 **{v}**（原生适配 15）。"+meta['intro']+'\n\n保留六源补词、插件翻译、原生时间轴与高亮。缓存和网络都有明确上限；未收录的歌曲仍不能凭空补全。本地自动测试与 macOS JavaScriptCore 测量不等于 iPhone Loon 实机 VPN 验收，不能保证所有设备都不会被系统终止。\n'
for c,e in [('Egern','yaml'),('Loon','lpx'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{c}/script/SpotifyLyrics.{e}';s=update(base[path]);s=re.sub(r'^description: .*$' if c=='Egern' else r'^#!desc = .*$',lambda _:('description: ' if c=='Egern' else '#!desc = ')+f'核心 {v} · 适配 15。'+meta['summary']+' 保留补词、翻译与原生高亮。需 HTTPS 解密。',s,flags=re.M)
 s=re.sub(r'^#!date = .*$', '#!date = 2026-10-24',s,flags=re.M);files[path]=s
 old=base[f'{c}/Docs/SpotifyLyrics.md'];start=old.index('当前模块：'+prev if c=='Egern' else '核心 **'+prev+'**');rest=old[start:];rest='\n\n'.join(p for p in rest.split('\n\n') if not re.match(r'2026-10-\d\d：',p.lstrip()))
 files[f'{c}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+update(rest)+f'\n\n2026-10-24：{count} 项自动测试通过。每版实际改动、完整测量数据和重现命令见固定源码 README；测试不等同于 iPhone 实机 VPN 验收。\n'
s=update(base['README.md']);s=re.sub(r'统一为 \*\*'+re.escape(v)+r'\*\*，[^\n]+?(?=Shadowrocket)',f'统一为 **{v}**，'+meta['summary']+' 保留六源补词、插件翻译与原生高亮。性能测量范围见固定源码，未做 iPhone VPN 验收。',s)
s=re.sub(r'All five clients now use core '+re.escape(v)+r'[^\n]+?(?=Complete official Shadowrocket)',f'All five clients now use core {v}. '+meta['english']+' Six sources, plugin translations and native highlighting remain. Measurements do not establish iPhone VPN stability. ',s);files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=update(base['Clash/Docs/SpotifyLyrics.md']).replace('中文原词不再简繁互译，官方静态歌词自动寻找真实同步来源；保留六源、外语翻译及原生高亮，缓存和联网预算不变。','中文夹英文按片段翻译，中文原字形保留，纯简繁互译过滤，旧缓存自动按行重查；官方静态歌词仍寻找真实同步来源，六源补词与原生高亮保留。')
from options import apply_options
apply_options(files,meta.get("options",[]))
files["Loon/README.md"]=base["Loon/README.md"]
for path in ["AGENTS.md","Loon/Docs/OfficialReference.md"]:
 files[path]=(root/"reference"/path).read_text()
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'version':v,'tests':count}))
