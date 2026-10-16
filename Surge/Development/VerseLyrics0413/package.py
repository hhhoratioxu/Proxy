from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.4.13 · 适配 10。Loon 文本直读、减少首次加载转换；原生译文单缓冲区写回，缩小并按需加载字表。保留六源补词、插件翻译、高亮和原有缓存上限。需 HTTPS 解密。'
intro=(root/'release-intro.txt').read_text()
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.4.12','0.4.13')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 pattern=r'^description: .*$' if client=='Egern' else r'^#!desc = .*$'
 s=re.sub(pattern,lambda _:('description: ' if client=='Egern' else '#!desc = ')+summary,s,flags=re.M)
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md']
 start=old.index('当前模块：0.4.12' if client=='Egern' else '核心 **0.4.12**')
 rest=old[start:]
 rest='\n\n'.join(p for p in rest.split('\n\n') if not p.lstrip().startswith('2026-10-16：'))
 rest=rest.replace('0.4.12','0.4.13').replace('VerseLyrics0412','VerseLyrics0413').replace('**9**','**10**')
 rest=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,rest)
 files[f'{client}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+rest+f'\n\n2026-10-16：{count} 项自动测试通过；包含独立 Protobuf 字节校验、分配计数、短句合批及失败退回、五客户端同曲重叠请求、六源及翻译保留、颜色与连续切歌模拟。记录见固定源码目录；未进行手机实机验收。\n'
s=base['README.md']
s=s.replace("0.4.12","0.4.13")
s=re.sub(r'统一为 \*\*0\.4\.13\*\*，[^\n]+?(?=Shadowrocket)', '统一为 **0.4.13**，Loon 文本直读减少首次加载转换，原生译文单缓冲区写回，缩小并按需加载繁简字表；保留六源补词、插件翻译、高亮及原有缓存上限。',s)
s=re.sub(r'All five clients now use core 0\.4\.13[^\n]+?(?=Complete official Shadowrocket)', 'All five clients now use core 0.4.13 with bounded native text responses on Loon, single-buffer official translation replacement and smaller lazily initialized Han tables. Six sequential sources, plugin translations, lyric highlighting and the existing cache limits remain. ',s)
files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.12','0.4.13')
files['Clash/Docs/SpotifyLyrics.md']=files['Clash/Docs/SpotifyLyrics.md'].replace('优化原生歌词编码和解析、合并短句翻译、复用缓存长度和匹配资料；保留六源补词、翻译、高亮修复及原有内存限制','优化 Loon 文本直读、原生译文单缓冲区写回及按需字表；保留六源补词、翻译、高亮和原有缓存上限')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
