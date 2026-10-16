from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.5.1 · 适配 10。联网任务减为单名额，取消拥堵等待与轮询计时器。缓存命中照常显示，忙碌时保留原词或暂不补词，后续请求可重试。保留六源补词、插件翻译及原生高亮。需 HTTPS 解密。'
intro=(root/'release-intro.txt').read_text()
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.5.0','0.5.1')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 pattern=r'^description: .*$' if client=='Egern' else r'^#!desc = .*$'
 s=re.sub(pattern,lambda _:('description: ' if client=='Egern' else '#!desc = ')+summary,s,flags=re.M)
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md']
 start=old.index('当前模块：0.5.0' if client=='Egern' else '核心 **0.5.0**')
 rest=old[start:]
 rest='\n\n'.join(p for p in rest.split('\n\n') if not p.lstrip().startswith('2026-10-16：'))
 rest=rest.replace('0.5.0','0.5.1').replace('VerseLyrics050','VerseLyrics051')
 rest=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,rest)
 files[f'{client}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+rest+f'\n\n2026-10-16：{count} 项自动测试通过；包括五客户端慢回调下的 80 请求重叠测试、繁简与翻译、六源、缓存及原生 JSON / Protobuf。另有 Loon 新旧版重叠请求对照、首次加载与顺序切歌模拟。记录见固定源码目录；未进行手机实机验收。\n'
s=base['README.md'].replace('0.5.0','0.5.1')
s=re.sub(r'统一为 \*\*0\.5\.1\*\*，[^\n]+?(?=Shadowrocket)', '统一为 **0.5.1**，补词与翻译共用单个联网名额，取消拥堵排队和轮询计时器。缓存命中照常显示；忙碌时保留原词或暂不补词，后续请求可以重试。保留六源补词、插件翻译及原生高亮；没有实机不掉线保证。',s)
s=re.sub(r'All five clients now use core 0\.5\.1[^\n]+?(?=Complete official Shadowrocket)', 'All five clients now use core 0.5.1 with one advisory network slot and no admission polling or waiting queue. Cached results remain available; overloaded responses keep original words or defer missing lyrics until a later request. Six sources, plugin translations and native highlighting remain. Device VPN stability is unverified. ',s)
files['README.md']=s
s=base['Clash/Docs/SpotifyLyrics.md'].replace('0.5.0','0.5.1')
s=s.replace('压缩脚本、索引读取缓存、复用同曲重叠联网结果；保留六源补词、翻译、高亮修复及原有内存限制','共用单个联网名额并取消拥堵排队，缓存命中照常返回；拥堵期间未命中的补词与翻译需等待后续请求，保留六源及原生高亮')
files['Clash/Docs/SpotifyLyrics.md']=s
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
