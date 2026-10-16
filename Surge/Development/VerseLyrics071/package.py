from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
meta=json.loads((root/'release.json').read_text());base=json.loads((root/'base.json').read_text())['files'];files={}
v,prev=meta['version'],meta['previous'];pin=sys.argv[1] if len(sys.argv)>1 else '0'*40;count=sys.argv[2] if len(sys.argv)>2 else '待验证'
oldpin=re.search(r'Proxy/([0-9a-f]{40})/',base['Loon/script/SpotifyLyrics.plugin'])[1]
def update(s):
 return s.replace(prev,v).replace('VerseLyrics'+prev.replace('.',''),'VerseLyrics'+v.replace('.','')).replace(oldpin,pin)
intro=f"当前发布 **{v}**（原生适配 12）。"+meta['intro']+'\n\n保留六源补词、插件翻译、原生时间轴与高亮。缓存和网络都有明确上限；未收录的歌曲仍不能凭空补全。本地自动测试与 macOS JavaScriptCore 测量不等于 iPhone Loon 实机 VPN 验收，不能保证所有设备都不会被系统终止。\n'
for c,e in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{c}/script/SpotifyLyrics.{e}';s=update(base[path]);s=re.sub(r'^description: .*$' if c=='Egern' else r'^#!desc = .*$',lambda _:('description: ' if c=='Egern' else '#!desc = ')+f'核心 {v} · 适配 12。'+meta['summary']+' 保留补词、翻译与原生高亮。需 HTTPS 解密。',s,flags=re.M)
 s=re.sub(r'^#!date = .*$', '#!date = 2026-10-17',s,flags=re.M);files[path]=s
 old=base[f'{c}/Docs/SpotifyLyrics.md'];start=old.index('当前模块：'+prev if c=='Egern' else '核心 **'+prev+'**');rest=old[start:];rest='\n\n'.join(p for p in rest.split('\n\n') if not re.match(r'2026-10-\d\d：',p.lstrip()))
 files[f'{c}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+update(rest)+f'\n\n2026-10-17：{count} 项自动测试通过。每版实际改动、完整测量数据和重现命令见固定源码 README；测试不等同于 iPhone 实机 VPN 验收。\n'
s=update(base['README.md']);s=re.sub(r'统一为 \*\*'+re.escape(v)+r'\*\*，[^\n]+?(?=Shadowrocket)',f'统一为 **{v}**，'+meta['summary']+' 保留六源补词、插件翻译与原生高亮。性能测量范围见固定源码，未做 iPhone VPN 验收。',s)
s=re.sub(r'All five clients now use core '+re.escape(v)+r'[^\n]+?(?=Complete official Shadowrocket)',f'All five clients now use core {v}. '+meta['english']+' Six sources, plugin translations and native highlighting remain. Measurements do not establish iPhone VPN stability. ',s);files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=update(base['Clash/Docs/SpotifyLyrics.md'])
from options import apply_options
apply_options(files,meta.get("options",[]))
for path in ["AGENTS.md","Loon/Docs/OfficialReference.md"]:
 files[path]=(root/"reference"/path).read_text()
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'version':v,'tests':count}))
