from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent;base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT';count=sys.argv[2] if len(sys.argv)>2 else '待验证';files={}
note='**0.4.5 原生显示与连续播放优化：** 译文按歌曲缓存，备用歌词使用紧凑存储；有效歌词缓存直接返回，不再先查元数据。连续切歌和回放可减少重复查词、翻译与取色请求，保留原生歌词排版、真实时间轴、插件译文和同曲配色。'
sources='备用源仍为 LRCLIB、QQ 音乐、网易云音乐、酷狗音乐、酷我音乐和 lyrics.ovh，`auto` 顺序查询、命中即停。酷狗与酷我提供来源时间轴；lyrics.ovh 纯文本以原生非同步歌词显示。LRCLIB 的重复发行候选仅在歌词文本/时间轴完全相同、时长也相同时合并，其他歧义仍拒绝。'
cache='缓存总上限仍为 192 条、96,000 个 JSON 字符，现在将冷却记录也计入总长度。旧歌词缓存自动压缩且保留到期时间；旧逐行译文可以复用，新译文按曲目和语言合并存储，按原文匹配以防换行顺序后错位。并发写入会合并同曲已成功的译文。查无结果缓存 90 秒，临时失败缓存 15 秒；网络失败和 HTTP 500/502/504 会短暂冷却对应主机 15 秒，429/503 继续遵守 Retry-After。'
memory='客户端适配改为按需读取字节，先检查长度再编码；支持的二进制视图直接复用原缓冲区。译文响应单次最多 96 KiB，译文内容和输出展开各限制 120,000 个字符，最终 UTF-8 输出限制 2 MiB，超限时保留原响应。请求脚本仍约 4–6 KB，已完成请求的计时器和 Promise 引用会及时释放。'
validation=f'2026-10-16：{count} 项自动测试通过，另通过 Egern YAML 配置检查。在相同的 12 首歌曲、每首 40 行自写歌词、两轮完整处理的模拟测试中，0.4.4 第二轮需 60 次 HTTP 请求，0.4.5 为 0 次；原词、译文、时间轴及配色一致。200 首歌曲遍历六源的压力测试和约 1.5 MiB JSON 改写均通过 32 MiB V8 老生代限制测试（不是总进程内存上限）。三个新增来源和同曲配色公开接口仍取词/取色成功，《那页夏天》由 QQ 音乐取得 42 行同步歌词。模拟请求耗时不能等同于实际网络延迟；这些检查不是 iPhone 实机验收。'
for client,ext in [('Egern','yaml'),('Surge','sgmodule'),('Loon','plugin'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}';s=base[path].replace('0.4.4','0.4.5').replace('适配 3','适配 4');s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 if client=='Egern':s=re.sub(r'^description: .*$', 'description: 优化连续切歌和内存开销，六源补词；保留原生时间轴与歌曲配色，以插件译文替换官方译文。需 HTTPS 解密。',s,flags=re.M)
 else:s=re.sub(r'(?m)^#!desc = .*$', '#!desc = 核心 0.4.5 · 适配 4。优化连续切歌与内存开销，六源补词；保留原生时间轴、同曲配色和插件译文。需 HTTPS 解密。',s)
 files[path]=s
 path=f'{client}/Docs/SpotifyLyrics.md';s=base[path].replace('核心 **0.4.4**','核心 **0.4.5**').replace('客户端适配 **3**','客户端适配 **4**').replace('当前模块：0.4.4','当前模块：0.4.5')
 s=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,s).replace('/Surge/Development/VerseLyrics044','/Surge/Development/VerseLyrics045')
 s=re.sub(r'(?m)^\*\*0\.4\.4 六源补词与内存限制：\*\*.*$',note+'\n\n'+sources,s)
 s=s.replace('跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一','跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一（LRCLIB 重复记录仅按上述相同歌词证据合并）')
 s=re.sub(r'(?m)^继续使用约 4–6 KB.*$',cache+'\n\n'+memory,s)
 s=re.sub(r'(?m)^2026-10-16：428 项.*$',validation,s)
 files[path]=s
files['README.md']=base['README.md'].replace('统一为 **0.4.4**，新增酷狗、酷我及 lyrics.ovh，六源按预算顺序补词，并保留同曲配色。','统一为 **0.4.5**，优化连续切歌时的歌词和译文缓存、按需读取响应，减少重复请求；保留六源补词与同曲配色。').replace('core 0.4.4 with six sequential lyric sources, bounded request/decoding budgets, and song-specific colors.','core 0.4.5 with per-track translation caching, compact fallback storage, lazy bounded response reads, six sequential sources, and song-specific colors.')
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.4，增加到六个备用歌词源并限制补词请求和解码开销，保留同曲配色','0.4.5，优化连续切歌缓存和响应读取，保留六源补词与同曲配色')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
