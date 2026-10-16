from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.4.8 · 适配 7。减少脚本启动和当前歌曲的常驻缓存；六源补词、插件翻译与原生配色保留。需 HTTPS 解密。'
notes={
'Loon':'请求头处理改用 [Loon 官方原生 Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/)，不再为每条请求启动 JavaScript；仅保留歌词和入口两个响应脚本。内部元数据查询在响应规则阶段跳过，避免再开入口脚本。仍使用官方条件语法过滤 URL、状态、已知 Content-Length，等待原生 HTTP 回调后再结束，不添加未公开的引擎或内存参数。需要 Loon 3.5.1（983）及以上。',
'Egern':'保留 Egern 原生异步 ctx、Headers、流读取和 max_size；歌词脚本仅加载歌词路径需要的代码，入口保持独立脚本。',
'Surge':'保留官方 max-size 与 WebView 响应脚本引擎；请求脚本使用 JSC。歌词脚本去除入口路径代码，并采用当前歌曲缓存视图。需要 Surge iOS 5.9.0+ / Mac 5.5.0+。',
'Shadowrocket':'保留独立兼容适配，歌词脚本精简并使用当前歌曲缓存视图；不添加 Surge 的 engine 参数。[开发者官网](https://shadowlaunch.com/) 未提供完整公开脚本 API，现有二进制及超时兼容行为仍未获完整官方规范核验。',
'QuantumultX':'保留官方 ArrayBuffer bodyBytes 与受保护响应头规则；仍只有一个首次联网才创建的整体退出计时器。歌词脚本精简并使用当前歌曲缓存视图，不声称计时器取消了原生 fetch。'
}
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.4.7','0.4.8').replace('适配 6','适配 7')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 s=re.sub(r'^description: .*$',lambda _: 'description: '+summary,s,flags=re.M) if client=='Egern' else re.sub(r'^#!desc = .*$',lambda _: '#!desc = '+summary,s,flags=re.M)
 if client=='Shadowrocket':s=s.replace('#!desc = '+summary,'#!desc = '+summary+' 兼容适配，完整官方脚本规范尚未取得。')
 if client=='Loon':
  lines=s.splitlines();request=next(l for l in lines if l.startswith('request if '));responses=[l for l in lines if l.startswith('response if ')]
  lyric=responses[0].split(' ~= /',1)[1].split('/ && ',1)[0]
  entry=responses[1].split(' ~= /',1)[1].split('/ && ',1)[0]
  internal="(${request.header['x-verselyrics-internal']} == null || ${request.header['x-verselyrics-internal']} == \"\")"
  providers='${FALLBACK_PROVIDER} ~= /^(?:auto|lrclib|qq|netease|kugou|kuwo|lyricsovh)$/'
  languages='${TARGET_LANGUAGE} ~= /^(?:zh-CN|zh-TW|en|ja|ko|fr|de|es|pt|it|ru|ar|hi|id|vi|th|tr|nl|pl|sv|uk|he|fa|ms|el)$/'
  valid='(${FALLBACK_PROVIDER} == "off" || '+providers+') && '+languages
  active='(${TRANSLATION_ENABLED} == true || '+providers+')'
  common='request.header.del("If-None-Match") | request.header.del("If-Modified-Since") | request.header.set("Accept-Encoding", "identity") | request.header.set("Cache-Control", "no-cache")'
  lyric_condition='${url} ~= /'+lyric+'/ && '+internal+' && '+valid+' && '+active
  # First recognized format query wins, matching the JavaScript request hook.
  not_json=r'${url} ~= /^(?![^?]*\?(?:(?!format=(?:json|protobuf)(?:&|$))[^&]*&)*format=json(?:&|$))/i'
  accept="(${request.header['Accept']} == null || ${request.header['Accept']} ~= /^(?![\\s\\S]*(?:protobuf|octet-stream|json))[\\s\\S]*$/i)"
  rewrites=['request if '+lyric_condition+' && '+not_json+' && '+accept+' then '+common+' | request.header.set("Accept", "application/x-protobuf")',
    'request if '+lyric_condition+' then '+common,
    'request if ${url} ~= /'+entry+'/ && '+internal+' && '+valid+' && ${DISCOVER_MISSING} == true && '+providers+' then '+common]
  lines=[l for l in lines if l!=request]
  for i,l in enumerate(lines):
   if l.startswith('response if '):lines[i]=l.replace(' then script(', ' && '+internal+' then script(')
  s='\n'.join(lines)+'\n'
  s=s.replace('[Script]','[Rewrite]\n'+'\n'.join(rewrites)+'\n\n[Script]')
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md']
 start=old.index('当前模块：0.4.7' if client=='Egern' else '核心 **0.4.7**')
 rest=old[start:]
 rest='\n\n'.join(p for p in rest.split('\n\n') if not p.lstrip().startswith('2026-10-16：'))
 rest=rest.replace('0.4.7','0.4.8').replace('适配 **6**','适配 **7**').replace('VerseLyrics047','VerseLyrics048')
 rest=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,rest)
 intro='**0.4.8 连续切歌与内存优化：** '+notes[client]
 intro+='\n\n歌词运行包去除仅供播放器入口使用的代码。当前歌曲处理期间只保留相关歌词、译文、配色及必要来源提示；入口缓存视图只保留元数据。保存时与完整缓存合并，其他歌曲的成功缓存不会因视图缩小而丢失。持久缓存总上限仍为 128 条 / 64,000 JSON 字符。'
 intro+='\n\n不同歌曲的新歌词响应到来后，旧任务不再追加歌词源、配色或翻译请求；已发出的原生请求正常回调后结束，不调用未公开取消接口、不增加等待队列。它跟踪响应到达顺序，不能判断 Spotify 的真实播放位置。已获得歌词和可用译文继续返回，暂缓任务不写成“该歌无词”。'
 intro+='\n\n六源补词、严格同曲核对、插件替换官方译文、原生时间轴和配色均保留。正文预算为歌词 256 KiB、入口 128 KiB、普通服务 96 KiB；补源累计 256 KiB / 12 请求。共享存储的两个联网名额是尽力控制，不能当成原子锁。'
 intro+='\n\n这些是脚本预算和减少分配的措施，不是 VPN 进程内存上限。未知长度响应可能先由宿主缓冲；超限或繁忙时使用缓存或原响应，可能暂时缺少补词或译文。尚未完成 iPhone VPN 峰值内存及连续切歌实机验收。'
 files[f'{client}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n\n'+rest+f'\n\n2026-10-16：{count} 项自动测试；源码、官方依据、缓存与切歌模拟记录见固定源码目录。模拟测试不代表实机 VPN 稳定性验收。\n'
s=base['README.md']
s=s.replace('统一为 **0.4.7**，核对各客户端 API，移除额外超时竞速、保留 Quantumult X 受保护响应头，并为 Surge 响应脚本指定 WebView；保留有限缓存、串行六源与原生配色。','统一为 **0.4.8**，Loon 请求头改用原生 Rewrite、减少脚本启动，精简歌词运行包、只保留当前歌曲的缓存视图，并停止旧任务继续追加网络请求；保留六源补词、插件翻译和原生配色。')
s=s.replace('core 0.4.7 with client-specific timeout handling, protected Quantumult X response headers and explicit Surge WebView response engines. Bounded caches, sequential sources and native colors remain.','core 0.4.8 with native Loon request-header rewrites, smaller lyrics bundles, scoped live caches and no further HTTP from superseded lyric jobs. Bounded sequential sources, plugin translations and native colors remain.')
files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.7，按客户端能力修正超时和二进制处理；Surge 响应脚本使用 WebView，保留有限缓存、六源与配色','0.4.8，减少 Loon 脚本启动、精简歌词运行包并缩小运行中的缓存视图；保留六源补词、翻译与原生配色')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
