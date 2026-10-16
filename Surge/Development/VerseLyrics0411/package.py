from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.4.11 · 适配 9。压缩脚本、索引读取当前歌曲缓存、复用同曲重叠补词和翻译结果，减少切歌解析和存储写入；保留六源补词、插件翻译与高亮修复。需 HTTPS 解密。'
intro=(root/'release-intro.txt').read_text()
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.4.10','0.4.11')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 pattern=r'^description: .*$' if client=='Egern' else r'^#!desc = .*$'
 s=re.sub(pattern,lambda _:('description: ' if client=='Egern' else '#!desc = ')+summary,s,flags=re.M)
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md']
 start=old.index('当前模块：0.4.10' if client=='Egern' else '核心 **0.4.10**')
 rest=old[start:]
 rest='\n\n'.join(p for p in rest.split('\n\n') if not p.lstrip().startswith('2026-10-16：'))
 rest=rest.replace('0.4.10','0.4.11').replace('VerseLyrics0410','VerseLyrics0411').replace('**8**','**9**')
 rest=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,rest)
 files[f'{client}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+rest+f'\n\n2026-10-16：{count} 项自动测试通过；包含索引缓存、旧格式兼容、五客户端同曲重叠请求、JSON / Protobuf、六源及翻译保留、颜色修复和连续切歌模拟。记录见固定源码目录；未进行手机实机验收。\n'
s=base['README.md']
s=s.replace("0.4.10","0.4.11")
s=re.sub(r'统一为 \*\*0\.4\.11\*\*，[^\n]+?(?=Shadowrocket)', '统一为 **0.4.11**，压缩运行脚本、索引解析当前歌曲缓存、复用同曲重叠补词与翻译，减少解析和存储写入；保留有限缓存、六源补词、插件翻译与高亮修复。',s)
s=re.sub(r'All five clients now use core 0\.4\.11[^\n]+?(?=Complete official Shadowrocket)', 'All five clients now use core 0.4.11 with smaller compiled scripts, indexed current-track cache reads, same-track overlap coalescing and no production diagnostic-history writes. Bounded caches, six sequential sources, plugin translations and the lyric-highlight correction remain. ',s)
files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.10','0.4.11')
files['Clash/Docs/SpotifyLyrics.md']=files['Clash/Docs/SpotifyLyrics.md'].replace('修正补充歌词高亮不明显的问题，旧配色缓存离线修正；保留六源补词、翻译及原有内存限制','压缩脚本、索引读取缓存、复用同曲重叠联网结果；保留六源补词、翻译、高亮修复及原有内存限制')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
