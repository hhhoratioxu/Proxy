from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
note='**0.4.3 内存与补词优化：** 请求阶段使用约 4–6 KB 的独立轻量脚本；歌词响应改为分块 UTF-8 解码，减少临时对象和二进制复制，翻译批次顺序执行。缓存按需加载，最多 192 条、约 96,000 个 JSON 字符；大缓存会自动裁剪，未变化时不反复写回。'
coverage='补词先请求 LRCLIB 的单条匹配结果，再按需搜索；为后续来源预留查询时间。优先核对同专辑结果；仅当歌名、歌手一致、时长差不超过 1 秒且结果唯一时，允许单曲、合集或本地化专辑名不同，仍排除现场、混音及翻唱。查无结果缓存 90 秒，请求失败缓存 15 秒，限流遵守 Retry-After。'
limits='外部服务响应最多解析 384 KiB；播放上下文超过 512 KiB 时保留原响应，其余原生响应上限仍为 2 MiB。仅在取得补充歌词后查询公开配色。来源没有收录、匹配有歧义或客户端没有发起歌词请求时，仍可能没有歌词。'
validation=f'2026-10-16：{count} 项自动检查通过，覆盖原生 JSON / Protobuf、译文替换、同曲配色、五客户端接口、轻量请求行为、匹配边界、缓存、超时预算和大响应保护。同一份约 1.5 MiB 的合成 JSON 解码并写入译文，本地 Node.js 测试中解码后 JS 堆占用由约 105 MiB 降至约 13 MiB，0.4.3 在 32 MiB JS 堆限制下也完成处理。这些数值来自 macOS 上的 Node.js，不代表 iPhone 代理进程的实际内存或实机验收。'
for client,ext in [('Egern','yaml'),('Surge','sgmodule'),('Loon','plugin'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.4.2','0.4.3').replace('适配 1','适配 2')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 if client=='Egern':
  s=s.replace('/spotify-lyrics.js?', '/spotify-lyrics-request.js?',1)
  s=re.sub(r'^description: .*$', 'description: 优化内存和补词匹配，按歌曲配色显示原生歌词，以插件译文替换官方译文。需 HTTPS 解密。',s,flags=re.M)
 else:
  s=s.replace('/SpotifyLyrics.js','/SpotifyLyrics.Request.js',1)
  s=re.sub(r'(?m)^#!desc = .*$', '#!desc = 核心 0.4.3 · 适配 2。降低内存占用，改进补词匹配；保留歌曲配色并以插件译文替换官方译文。需 HTTPS 解密。',s)
 files[path]=s
 path=f'{client}/Docs/SpotifyLyrics.md';s=base[path]
 s=s.replace('核心 **0.4.2**','核心 **0.4.3**').replace('客户端适配 **1**','客户端适配 **2**').replace('当前模块：0.4.2','当前模块：0.4.3')
 s=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,s)
 s=s.replace('/Loon/Development/VerseLyricsColors','/Surge/Development/VerseLyrics043').replace('/Surge/Development/VerseLyrics042','/Surge/Development/VerseLyrics043')
 s=re.sub(r'(?m)^\*\*0\.4\.2 配色修正：\*\*.*$',note+'\n\n'+coverage+'\n\n'+limits,s)
 s=s.replace('备用源严格核对歌名、艺人、专辑与时长；未收录的歌曲无法生成歌词。','备用源优先核对同专辑结果；跨专辑必须满足唯一同曲匹配，未收录的歌曲无法生成歌词。')
 s=s.replace('本次同步配色不代表','本次优化不代表')
 s=s.replace('取色与补词并行，','取得补充歌词后才取色，')
 s=s.replace('补源严格核对歌名、艺人、专辑和时长；来源没有收录时不能凭空补全歌词。','补源核对歌名、艺人和时长，优先同专辑，跨专辑需要唯一且严格的同曲匹配；来源没有收录时不能凭空补全歌词。')
 s=re.sub(r'(?m)^2026-10-16：(?:205|281) 项.*$',validation,s)
 # Egern wording carries a different cache/install section, keep its native settings and limitations.
 if note not in s:
  s=s.replace('## 安装与更新',note+'\n\n'+coverage+'\n\n'+limits+'\n\n## 安装与更新',1)
 files[path]=s
s=base['README.md'].replace('Egern、Surge、Loon、Shadowrocket、Quantumult X 已统一为 **0.4.2**，同步修正补充歌词的背景与文字配色。','Egern、Surge、Loon、Shadowrocket、Quantumult X 已统一为 **0.4.3**，降低内存占用、改进补词匹配，并保留同曲配色。').replace('All five clients now use core 0.4.2 with the fallback lyric color correction.','All five clients now use core 0.4.3 with bounded-memory processing, improved fallback matching, and song-specific colors.')
files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('已统一更新到 0.4.2，修正补充歌词配色','已统一更新到 0.4.3，优化内存占用与补词匹配并保留补充歌词配色')
for path,text in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'checks':count},ensure_ascii=False))
