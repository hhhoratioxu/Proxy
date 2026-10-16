from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
note='**0.4.4 六源补词与内存限制：** 新增酷狗音乐、酷我音乐和 lyrics.ovh。`auto` 依次查询 LRCLIB → QQ 音乐 → 网易云音乐 → 酷狗音乐 → 酷我音乐 → lyrics.ovh，找到结果立即停止。酷狗与酷我使用来源的真实时间轴；lyrics.ovh 仅提供纯文本，按 Spotify 原生非同步歌词显示，不伪造滚动时间。'
coverage='补词优先核对同专辑；跨专辑需歌名、歌手一致、时长差不超过 1 秒且结果唯一，排除混淆的现场、混音及翻唱版本。酷狗不提供专辑信息，仅接受同名、同歌手、时长吻合且录音时长唯一的结果；同一录音的重复歌词上传可合并候选。酷我的长标题只缩短搜索关键词，最终仍核对完整曲名和所有歌手。旧版本的失败缓存会自动失效，已有成功缓存继续使用。'
limits='每次补词最多发起 12 个外部请求，依次执行；保留原有总处理 20 秒预算并给后续来源预留时间。累计允许解码的补词响应不超过 512 KiB；三个新增来源单次响应限制 96 KiB，酷狗 Base64 解码后的歌词限制 64 KiB，歌词最多 600 行。已知超大 Content-Length 会在读取正文前拒绝；没有长度的响应收到后检查，不解码超限正文。宿主 HTTP 层可能先缓存响应，脚本不能据此保证整个代理进程的内存硬上限。'
cache='继续使用约 4–6 KB 的独立请求脚本、分块 UTF-8 解码、顺序翻译和按需加载缓存；缓存最多 192 条、96,000 个 JSON 字符。查无结果缓存 90 秒，临时失败缓存 15 秒，遵守 Retry-After。客户端支持时立即清除已完成请求的计时器；无论是否支持，都释放计时器引用的已完成 Promise，减少响应缓冲区滞留。仅取得补充歌词后查询同曲配色。'
validation=f'2026-10-16：{count} 项自动测试通过，覆盖六个来源的匹配、错误和预算边界，以及五客户端的 JSON / Protobuf 输出、原生译文替换、配色、缓存和请求脚本。三个新增来源均完成公开接口实测取词；《那页夏天》仍由 QQ 音乐匹配。0.4.4 的约 1.5 MiB 合成 JSON 解码/写回及六源压力测试均在 Node.js 的 32 MiB 老生代堆限制下完成；这不是 iPhone 代理进程总内存或实机验收。详见源码目录的测试记录、内存数据与公开接口验证记录。'
for client,ext in [('Egern','yaml'),('Surge','sgmodule'),('Loon','plugin'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.4.3','0.4.4').replace('适配 2','适配 3')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 if client=='Egern':
  s=re.sub(r'^description: .*$', 'description: 六源顺序补词，限制请求与内存开销；保留歌曲配色，以插件译文替换官方译文。需 HTTPS 解密。',s,flags=re.M)
  s=s.replace('auto 依次 LRCLIB、QQ 音乐、网易云；off 不补源。','auto 依次 LRCLIB、QQ、网易云、酷狗、酷我、lyrics.ovh；off 不补源。')
  s=s.replace("    - netease\n    - 'off'", "    - netease\n    - kugou\n    - kuwo\n    - lyricsovh\n    - 'off'")
 else:
  s=re.sub(r'(?m)^#!desc = .*$', '#!desc = 核心 0.4.4 · 适配 3。六源顺序补词，限制请求与内存开销；保留同曲配色和插件译文。需 HTTPS 解密。',s)
  if client=='Loon':s=s.replace('"netease","off"','"netease","kugou","kuwo","lyricsovh","off"')
 files[path]=s
 path=f'{client}/Docs/SpotifyLyrics.md';s=base[path].replace('核心 **0.4.3**','核心 **0.4.4**').replace('客户端适配 **2**','客户端适配 **3**').replace('当前模块：0.4.3','当前模块：0.4.4')
 s=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,s)
 s=s.replace('/Surge/Development/VerseLyrics043','/Surge/Development/VerseLyrics044')
 start=s.index('**0.4.3 内存与补词优化：**');end=s.index('\n\n',s.index('外部服务响应最多解析',start))
 s=s[:start]+'\n\n'.join([note,coverage,limits,cache])+s[end:]
 s=s.replace('无词时依次尝试 LRCLIB、QQ 音乐、网易云；可选 `lrclib` / `qq` / `netease` / `off`','无词时顺序尝试六源；可选 `lrclib` / `qq` / `netease` / `kugou` / `kuwo` / `lyricsovh` / `off`')
 s=s.replace('官方无词时依次核对 LRCLIB、QQ 音乐和网易云来源。','官方无词时依次核对六源；也可选 `lrclib` / `qq` / `netease` / `kugou` / `kuwo` / `lyricsovh` / `off`。')
 s=re.sub(r'(?m)^2026-10-16：340 项.*$',validation,s)
 files[path]=s
files['README.md']=base['README.md'].replace('统一为 **0.4.3**，降低内存占用、改进补词匹配，并保留同曲配色。','统一为 **0.4.4**，新增酷狗、酷我及 lyrics.ovh，六源按预算顺序补词，并保留同曲配色。').replace('core 0.4.3 with bounded-memory processing, improved fallback matching, and song-specific colors.','core 0.4.4 with six sequential lyric sources, bounded request/decoding budgets, and song-specific colors.')
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.3，优化内存占用与补词匹配并保留补充歌词配色','0.4.4，增加到六个备用歌词源并限制补词请求和解码开销，保留同曲配色')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
