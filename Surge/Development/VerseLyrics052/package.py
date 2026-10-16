from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else '0'*40
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.5.2 · 适配 11。新增复用歌词源中文译文，精确对齐后减少翻译请求；LRC 逐行解析，减少临时数组与排序。保留六源补词、插件翻译及原生高亮，缓存和联网预算不变。需 HTTPS 解密。'
intro=(root/'release-intro.txt').read_text()
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.5.1','0.5.2')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 pattern=r'^description: .*$' if client=='Egern' else r'^#!desc = .*$'
 s=re.sub(pattern,lambda _:('description: ' if client=='Egern' else '#!desc = ')+summary,s,flags=re.M)
 if client=='Egern':
  schema="  SOURCE_TRANSLATIONS:\n    name: 复用歌词源译文\n    description: 简体中文目标下采用同次补词响应中精确对齐的中文译文，其余行继续翻译；关闭则全部使用翻译服务。\n    default_value: 'true'\n    options:\n    - 'true'\n    - 'false'\n"
  s=s.replace('  TARGET_LANGUAGE:\n',schema+'  TARGET_LANGUAGE:\n')
  s=s.replace("      DISCOVER_MISSING: 'true'","      DISCOVER_MISSING: 'true'\n      SOURCE_TRANSLATIONS: 'true'")
 elif client=='Loon':
  s=s.replace('TARGET_LANGUAGE = ', 'SOURCE_TRANSLATIONS = switch,true,type=boolean,tag=复用歌词源译文,desc=精确对齐的简体译文可省去翻译请求；关闭则使用翻译服务\nTARGET_LANGUAGE = ')
  s=s.replace('${DISCOVER_MISSING}})', '${DISCOVER_MISSING}, ${SOURCE_TRANSLATIONS}})')
 else:
  s=s.replace('&DISCOVER_MISSING=true','&DISCOVER_MISSING=true&SOURCE_TRANSLATIONS=true')
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md']
 start=old.index('当前模块：0.5.1' if client=='Egern' else '核心 **0.5.1**')
 rest=old[start:]
 rest='\n\n'.join(p for p in rest.split('\n\n') if not p.lstrip().startswith('2026-10-16：'))
 rest=rest.replace('0.5.1','0.5.2').replace('VerseLyrics051','VerseLyrics052').replace('适配 **10**','适配 **11**').replace('上述四项','上述五项')
 rest=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,rest)
 rest=re.sub(r'(^\| `DISCOVER_MISSING`[^\n]+)',r'\1\n| `SOURCE_TRANSLATIONS` | `true` | 简体中文目标下，复用补词响应中严格对齐的中文译文；关闭后忽略此类缓存并使用翻译服务。 |',rest,flags=re.M)
 files[f'{client}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+rest+f'\n\n2026-10-16：{count} 项自动测试通过；覆盖五客户端 JSON / Protobuf、同响应译文及开关与缓存、时间戳歧义、500 组解析兼容对照和慢回调重叠请求。固定源码目录包含对照测量和实际公开响应验证；未进行手机实机验收。\n'
s=base['README.md'].replace('0.5.1','0.5.2')
s=re.sub(r'统一为 \*\*0\.5\.2\*\*，[^\n]+?(?=Shadowrocket)', '统一为 **0.5.2**，新增复用歌词源同次响应中的中文译文，只采用精确对齐的简体中文行，其余继续翻译；可关闭该选项。LRC 改为逐行解析并按需排序，保留六源、原生高亮和原有内存预算。自动测试不代表手机 VPN 稳定性保证。',s)
s=re.sub(r'All five clients now use core 0\.5\.2[^\n]+?(?=Complete official Shadowrocket)', 'All five clients now use core 0.5.2. Optional source translations reuse exactly aligned Simplified Chinese rows from the same fallback response, with translator fallback for other rows. Incremental LRC parsing reduces temporary arrays and avoids sorting already ordered rows. Six sources, native timing/highlighting and existing budgets remain. Device VPN stability is unverified. ',s)
files['README.md']=s
s=base['Clash/Docs/SpotifyLyrics.md'].replace('0.5.1','0.5.2')
s=s.replace('共用单个联网名额并取消拥堵排队，缓存命中照常返回；拥堵期间未命中的补词与翻译需等待后续请求，保留六源及原生高亮','新增复用同次补词响应中的精确对齐简体译文，LRC 改为逐行解析；保留六源、翻译及原生高亮，缓存和联网预算不变')
files['Clash/Docs/SpotifyLyrics.md']=s
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
