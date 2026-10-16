from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.4.9 · 适配 8。修复超时中断补词与切歌丢弃新请求；中文源优先、公开元数据回退、翻译等待限时。保留有限缓存与原生歌词。需 HTTPS 解密。'
notes={
'Loon':'保留官方原生 Rewrite 与两个响应脚本，减少脚本启动。只有联网名额用满时才使用 [官方 setTimeout](https://nsloon.app/docs/Script/script_api/) 等待；每次等完再继续，不使用超时竞速、setInterval 或 clearTimeout。HTTP 仍使用原生毫秒超时并等待回调。需要 Loon 3.5.1（983）及以上。',
'Egern':'保留原生异步 ctx、Headers、流读取与 max_size；只在宿主存在 setTimeout 时启用短等待，否则繁忙请求按原响应返回。官方 JavaScript API 未列出该全局计时器，因此不将 Egern 的等待能力标为已验证。',
'Surge':'保留官方 max-size、WebView 响应引擎、JSC 请求脚本、秒制 HTTP 超时及 setTimeout；没有并发竞速请求。需要 Surge iOS 5.9.0+ / Mac 5.5.0+。',
'Shadowrocket':'保留独立兼容适配，仅在存在 setTimeout 时短等待；不添加 Surge 的 engine。开发者尚无完整公开脚本规范，兼容桥接不标为官方验证。',
'QuantumultX':'保留 ArrayBuffer bodyBytes、受保护响应头与单个整体退出计时器。短等待只在名额用满时发生；整体退出不是 fetch 取消，仍不假设有未公开的单次 HTTP 超时或硬内存上限。'
}
intro='''**0.4.9 补词与等待修复：** 普通网络超时回调结束后立即释放名额并继续下一个歌词源，不再把已结束的请求误判为仍在运行。两个名额用满时，只登记最新一个等待者，最多等待 2.6 秒；旧请求回调后停止追加工作，最新请求可在本次响应中继续补词。普通重叠响应和预取不会再仅因到达顺序互相取消；没有无限队列，也不在结束后后台联网。

中文标题或歌手优先 QQ、网易、酷狗、酷我，再查 LRCLIB / lyrics.ovh；已有成功来源提示继续优先。已核对到候选曲目后，为下载歌词保留独立时间，且仍受总预算约束。QQ / 网易查询统一简繁搜索词；核对歌名、歌手、版本与时长的要求不放宽。只有完整查询全部来源且均未匹配才缓存“无词”；旧版失败缓存自动失效，成功缓存保留。

未缓存且拿不到 Spotify 元数据时，增加同一歌曲公开 embed 页回退，一次读取歌名、歌手、时长与配色。页面没有专辑，必须按原有唯一同曲规则核对，不能将同名歌曲直接当作匹配。Spotify 鉴权或权限错误仍保留原响应。

翻译阶段最多使用剩余总预算中的 2.5 秒，慢服务不再长期拖住已有歌词；成功译文保留，未完成部分可在后续歌词请求继续补齐。原词、时间轴、插件替换官方译文和原生配色保留。

持久缓存仍不超过 128 条 / 64,000 JSON 字符，仅保留当前歌曲相关工作数据；两个联网名额和一个等待记录均为尽力控制，存储没有原子锁。歌词 / 入口正文 256 / 128 KiB，普通服务 96 KiB，补源累计 256 KiB / 12 请求，等待时不发 HTTP。宿主缓冲与 VM 内存不受这些数字直接限制，尚无 iPhone VPN 实机内存或稳定性验收。
'''
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.4.8','0.4.9').replace('适配 7','适配 8')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 pattern=r'^description: .*$' if client=='Egern' else r'^#!desc = .*$'
 s=re.sub(pattern,lambda _:('description: ' if client=='Egern' else '#!desc = ')+summary,s,flags=re.M)
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md'];start=old.index('当前模块：0.4.8' if client=='Egern' else '核心 **0.4.8**');rest=old[start:]
 rest='\n\n'.join(p for p in rest.split('\n\n') if not p.lstrip().startswith('2026-10-16：'))
 rest=rest.replace('0.4.8','0.4.9').replace('适配 **7**','适配 **8**').replace('VerseLyrics048','VerseLyrics049')
 rest=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,rest)
 files[f'{client}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+notes[client]+'\n\n'+rest+f'\n\n2026-10-16：{count} 项自动测试；延迟故障模型、五客户端连续切歌模拟和真实公开来源记录见固定源码目录。自动测试不代替手机验收。\n'
s=base['README.md'];s=s.replace('统一为 **0.4.8**，Loon 请求头改用原生 Rewrite、减少脚本启动，精简歌词运行包、只保留当前歌曲的缓存视图，并停止旧任务继续追加网络请求；保留六源补词、插件翻译和原生配色。','统一为 **0.4.9**，修复超时后中断补词、连续切歌丢弃最新请求的问题，中文源优先、候选歌词下载独立预算，增加公开元数据回退并限制慢翻译等待；保留有限缓存、六源、插件翻译和原生配色。')
s=s.replace('core 0.4.8 with native Loon request-header rewrites, smaller lyrics bundles, scoped live caches and no further HTTP from superseded lyric jobs. Bounded sequential sources, plugin translations and native colors remain.','core 0.4.9 with recovery after settled timeouts, bounded admission waiting, Chinese source prioritization, verified-candidate download budgets, public metadata fallback and bounded translation latency. Small scoped caches, sequential sources, plugin translations and native colors remain.')
files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.8，减少 Loon 脚本启动、精简歌词运行包并缩小运行中的缓存视图','0.4.9，修复超时中断补词、切歌丢弃新请求，优化来源顺序并增加公开元数据回退')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
