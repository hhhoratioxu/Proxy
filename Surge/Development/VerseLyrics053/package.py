from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else '0'*40
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.5.3 · 适配 12。降低播放器入口解析内存：JSON 单次扫描、Protobuf 按字段范围改写；搜索后仅保留候选 ID。保留六源补词、插件翻译与原生高亮，不增加缓存、预取或并发。需 HTTPS 解密。'
intro=(root/'release-intro.txt').read_text()
def update(s):
 s=s.replace('0.5.2','0.5.3').replace('VerseLyrics052','VerseLyrics053').replace('适配 **11**','适配 **12**')
 s=re.sub(r'(?<=Proxy/)(tree/)?a3a2314449c54404f14fd70050b5bc12abda3060(?=/)',lambda m:('tree/' if m[1] else '')+pin,s)
 return s
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=update(base[path]);pattern=r'^description: .*$' if client=='Egern' else r'^#!desc = .*$'
 s=re.sub(pattern,lambda _:('description: ' if client=='Egern' else '#!desc = ')+summary,s,flags=re.M)
 s=re.sub(r'^#!date = .*$', '#!date = 2026-10-17',s,flags=re.M)
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md'];start=old.index('当前模块：0.5.2' if client=='Egern' else '核心 **0.5.2**');rest=old[start:]
 rest='\n\n'.join(p for p in rest.split('\n\n') if not p.lstrip().startswith('2026-10-16：'))
 files[f'{client}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+update(rest)+f'\n\n2026-10-17：{count} 项自动测试通过；包括五端实际打包入口的 JSON / Protobuf、500 组 JSON 与 200 组 Protobuf 差分样本、慢回调重叠请求、补词和译文缓存。macOS JavaScriptCore 首次加载及重复加载对照、Node 五端连续切歌报告均随固定源码保存。测试不等同于 iPhone 实机 VPN 验收。\n'
s=update(base['README.md'])
s=re.sub(r'统一为 \*\*0\.5\.3\*\*，[^\n]+?(?=Shadowrocket)', '统一为 **0.5.3**，降低播放器入口解析内存：JSON 单次扫描、Protobuf 按字段范围改写，搜索后仅保留候选 ID。保留六源补词、插件翻译、源译文复用和原生高亮；缓存与并发不增加。macOS JavaScriptCore 对照不代表 iPhone VPN 稳定性保证。',s)
s=re.sub(r'All five clients now use core 0\.5\.3[^\n]+?(?=Complete official Shadowrocket)', 'All five clients now use core 0.5.3. Player entries use selective JSON scanning and Protobuf range edits; catalog searches retain only accepted IDs. Six sources, plugin translations, optional source translations and native highlighting remain. Cache and concurrency budgets are unchanged. macOS JavaScriptCore measurements do not establish iPhone VPN stability. ',s)
files['README.md']=s
s=update(base['Clash/Docs/SpotifyLyrics.md']);s=s.replace('新增复用同次补词响应中的精确对齐简体译文，LRC 改为逐行解析；保留六源、翻译及原生高亮，缓存和联网预算不变','优化播放器入口的 JSON / Protobuf 解析内存；保留六源、翻译及原生高亮，缓存和联网预算不变');files['Clash/Docs/SpotifyLyrics.md']=s
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'files':len(files),'pin':pin,'tests':count}))
