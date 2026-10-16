from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.4.7 · 适配 6。按客户端 API 处理超时、二进制和响应头；保留轻量入口、串行六源、有限缓存。需 HTTPS 解密。'
notes={
'Egern':'按 [Egern 官方 API](https://egernapp.com/docs/javascript-api/) 使用原生 async ctx、Headers、流读取和毫秒 HTTP 超时；配置使用 [max_size](https://egernapp.com/docs/configuration/scriptings/) 在宿主阶段限制响应体。缓存内容写入前后有界，超限外部流取消读取，不套用其他客户端的 $done 接口。',
'Loon':'按 [Loon 官方 API](https://nsloon.app/docs/Script/script_api/) 使用毫秒 HTTP 超时，等原生请求回调结束后再调用一次 $done。移除逐请求计时器和手动结束计时器，不依赖 clearTimeout。保留 [官方条件语法](https://nsloon.app/docs/Script/script_v2/) 的 URL、状态与已知 Content-Length 过滤，不添加不支持的 max_size 或 engine 字段。未知长度或压缩响应仍可能先由宿主缓冲。',
'Surge':'按 [Surge 官方引擎建议](https://manual.nssurge.com/scripting/overview.html)，两个响应脚本显式使用 engine=webview，使脚本引擎在独立进程中执行；请求脚本使用 engine=jsc。保持官方 max-size 和 Uint8Array 二进制接口。HTTP timeout 按秒传入，依赖原生请求回调和脚本 timeout 结束，不再叠加 JavaScript 超时竞速。需要支持 WebView 引擎的 Surge iOS 5.9.0+ / Mac 5.5.0+；不适用于仅有 JSC 的 tvOS。',
'QuantumultX':'按 [官方二进制示例](https://github.com/crossutility/Quantumult-X/blob/master/sample-bytes-rewrite.js) 使用 ArrayBuffer bodyBytes；按 [响应改写示例](https://github.com/crossutility/Quantumult-X/blob/master/sample-rewrite-with-script.js) 保留原 Content-Length、Content-Type、Content-Encoding 字段，由客户端处理正文替换。仅保留一个首次联网才创建的整体退出计时器；迟到的 fetch 完成不再读取 bodyBytes。官方示例未公开单次 fetch 取消/毫秒超时/响应体硬上限参数，不伪造这些字段，也不声称计时器取消了原生网络请求。',
'Shadowrocket':'保留现有独立兼容适配，移除额外 JavaScript 超时竞速，等待原生 HTTP 回调；不添加 Surge 的 engine 参数。通过 [App Store](https://apps.apple.com/us/app/shadowrocket/id932747118) 核对的 [开发者官网](https://shadowlaunch.com/) 没有公开完整脚本 API 文档，因此现有 max-size、HTTP 超时单位和二进制兼容行为仍属于待实机核对项目，不能标为已获官方规范确认。社区手册没有被当成官方依据。'
}
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.4.6','0.4.7').replace('适配 5','适配 6')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 if client=='Egern':s=re.sub(r'^description: .*$',lambda m:'description: '+summary,s,flags=re.M)
 else:s=re.sub(r'^#!desc = .*$',lambda m:'#!desc = '+summary,s,flags=re.M)
 if client=='Surge':
  lines=[]
  for line in s.splitlines():
   if line.startswith('VerseLyrics-'):
    assert 'engine=' not in line
    line+=',engine='+('jsc' if 'type=http-request,' in line else 'webview')
   lines.append(line)
  s='\n'.join(lines)+'\n'
 if client=='Shadowrocket':s=s.replace('#!desc = '+summary,'#!desc = '+summary+' 兼容适配；完整官方脚本规范尚未取得。')
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md'].split('\n\n')
 assert old[1].startswith('**0.4.6')
 # Retain client installation, matching and privacy instructions from the tested base.
 rest='\n\n'.join(p for p in old[6:] if not p.lstrip().startswith('2026-10-16：'))
 rest=rest.replace('0.4.6','0.4.7').replace('适配 **5**','适配 **6**').replace('VerseLyrics046','VerseLyrics047')
 rest=rest.replace('例如把两处 `TARGET_LANGUAGE=', '例如把三处 `TARGET_LANGUAGE=')
 rest=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,rest)
 rest=rest.replace('翻译开启后，不回填 Spotify 官方译文；','在已处理的歌词响应中，翻译开启后不回填 Spotify 官方译文；')
 intro='**0.4.7 客户端规范与内存保护：** 保留请求、入口、歌词三个独立脚本；按各客户端能力处理运行结束、HTTP 和二进制数据。\n\n'+notes[client]
 intro+='\n\n六源和同歌手同步来源优先保持不变。歌词、配色、翻译串行，不增加预加载或等待队列。缓存命中无需联网；共享存储对两个联网任务进行尽力准入检查，但存储不提供原子锁。超时或繁忙不会被误记成该歌无词。'
 intro+='\n\n正文预算继续为歌词 256 KiB、入口 128 KiB、普通服务 96 KiB、配色 256 KiB；补源累计 256 KiB / 12 请求；输出 512 KiB。主缓存最多 128 条 / 64,000 JSON 字符。上述值是脚本处理预算，不是 VPN 进程总内存上限。'
 intro+='\n\n核心以 10 秒为继续发起网络请求的预算；Egern/Loon 原生 HTTP 使用毫秒超时，Surge 使用秒超时，最多 2.5 秒。Quantumult X 不宣称有单次 2.5 秒原生超时，只在首次联网后保留一个整体 12 秒退出计时器。宿主可能先缓冲未知长度响应，结束脚本也不等于取消网络；无法据此保证整台设备的 VPN 永不因内存退出。超限或繁忙时保留原响应，可能暂时不补词或不翻译。'
 files[f'{client}/Docs/SpotifyLyrics.md']=old[0]+'\n\n'+intro+'\n\n'+rest+f'\n\n2026-10-16：{count} 项自动测试；官方依据与验证范围见固定源码目录的 CLIENT-CONTRACTS.md。实机 VPN 峰值内存尚未验收。\n'
s=base['README.md']
s=s.replace('统一为 **0.4.6**，分离轻量入口脚本、静态汉字索引、同歌手来源优先，并收紧响应与缓存大小、限制重叠联网任务；保留六源补词与原生配色。','统一为 **0.4.7**，核对各客户端 API，移除额外超时竞速、保留 Quantumult X 受保护响应头，并为 Surge 响应脚本指定 WebView；保留有限缓存、串行六源与原生配色。Shadowrocket 完整官方脚本规范尚未取得，其兼容适配未标为官方验证。')
s=s.replace('core 0.4.6 with lightweight entry scripts, static Han lookup, artist source hints, stricter body/cache bounds and shared network admission checks; six sequential sources and native colors remain.','core 0.4.7 with client-specific timeout handling, protected Quantumult X response headers and explicit Surge WebView response engines. Bounded caches, sequential sources and native colors remain. Complete official Shadowrocket scripting documentation was not found; its compatibility adapter is not claimed to be officially verified.')
files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.6，分离轻量入口脚本、收紧内存和联网预算，保留六源补词与同曲配色','0.4.7，按客户端能力修正超时和二进制处理；Surge 响应脚本使用 WebView，保留有限缓存、六源与配色')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
