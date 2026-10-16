from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.4.15 · 适配 10。优化所有歌曲共用的翻译流程：已是目标语言的可靠行跳过联网，空格变体合并请求。保留六源补词、插件翻译、高亮和原有内存限制。需 HTTPS 解密。'
intro=(root/'release-intro.txt').read_text()
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.4.14','0.4.15')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 pattern=r'^description: .*$' if client=='Egern' else r'^#!desc = .*$'
 s=re.sub(pattern,lambda _:('description: ' if client=='Egern' else '#!desc = ')+summary,s,flags=re.M)
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md']
 start=old.index('当前模块：0.4.14' if client=='Egern' else '核心 **0.4.14**')
 rest=old[start:]
 rest='\n\n'.join(p for p in rest.split('\n\n') if not p.lstrip().startswith('2026-10-16：'))
 rest=rest.replace('0.4.14','0.4.15').replace('VerseLyrics0414','VerseLyrics0415')
 rest=rest.replace('补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 重复记录仅在完整歌词、时间戳与时长全部相同的情况下合并）', '补词优先核对同专辑。列表搜索中的跨专辑结果要求歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 完全相同的重复歌词可合并）；LRCLIB 签名接口直接返回的候选经相同身份、时长与版本校验后可用，不要求 Spotify 提供专辑名，但不代表已证明全库唯一')
 rest=rest.replace('跨专辑必须满足唯一同曲匹配', '跨专辑的列表搜索要求唯一同曲匹配，LRCLIB 签名结果需通过身份、时长与版本校验')
 rest=rest.replace('跨专辑需要唯一且严格的同曲匹配', '跨专辑列表搜索要求唯一，LRCLIB 签名结果需通过严格身份、时长与版本校验')
 rest=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,rest)
 files[f'{client}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+rest+f'\n\n2026-10-16：{count} 项自动测试通过；包含多语言及混合歌词、空格变体缓存、独立 Protobuf 字节校验、短句合批及失败退回、五客户端同曲重叠请求、六源、颜色与连续切歌模拟。记录见固定源码目录；未进行手机实机验收。\n'
s=base['README.md']
s=s.replace("0.4.14","0.4.15")
s=re.sub(r'统一为 \*\*0\.4\.15\*\*，[^\n]+?(?=Shadowrocket)', '统一为 **0.4.15**，减少公共翻译流程中的无效请求：按明确语言和逐行文字判断目标语言，合并重复句的空格变体。保留六源补词、插件翻译、高亮及原有内存限制。',s)
s=re.sub(r'All five clients now use core 0\.4\.15[^\n]+?(?=Complete official Shadowrocket)', 'All five clients now use core 0.4.15 with a shared translation fast path for verified target-language lines and whitespace-equivalent repeated rows. Six sequential sources, plugin translations, highlighting and the existing memory limits remain. ',s)
files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.14','0.4.15')
files['Clash/Docs/SpotifyLyrics.md']=files['Clash/Docs/SpotifyLyrics.md'].replace('优化 Loon 文本直读、原生译文单缓冲区写回及按需字表；保留六源补词、翻译、高亮和原有缓存上限','减少已是目标语言和重复句的无效翻译请求；保留六源、翻译、高亮和原有内存上限')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
