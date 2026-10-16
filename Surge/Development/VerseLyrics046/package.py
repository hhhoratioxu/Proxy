from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent;base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT';count=sys.argv[2] if len(sys.argv)>2 else '待验证';files={}
host=r'^https://(?:spclient\.wg|[a-z0-9-]+-spclient)\.spotify\.com(?::443)?/'
lyric=host+r'color-lyrics/v2/track/[0-9A-Za-z]{22}(?:/image/[^?#\s]+)?/?(?:\?.*)?$'
entry=host+r'(?:metadata/4/track/[0-9a-f]{32}|extended-metadata/v0/extended-metadata/?|scrollsita/v1/scroll/spotify(?::|%3[aA])track(?::|%3[aA])[0-9A-Za-z]{22}/?|user-customization-service/v1/customize/?|bootstrap/v1/bootstrap/?|v1/customize/?|context-resolve/v1/spotify(?::|%3[aA])[^?#\s/]+/?|connect-state/v1/devices/[0-9A-Za-z_-]{16}[0-9A-Za-z_-]*/?)(?:\?.*)?$'
size=r'^(?:[0-9]{1,5}|1[0-9]{5}|2[0-5][0-9]{4}|26[01][0-9]{3}|2620[0-9]{2}|2621[0-3][0-9]|26214[0-4])$'
entry_size=r'^(?:[0-9]{1,5}|1[0-2][0-9]{4}|130[0-9]{3}|1310[0-6][0-9]|13107[0-2])$'
summary='核心 0.4.6 · 适配 5。优先控制内存：入口轻量脚本、串行补词、共享联网准入、同歌手来源优先；保留原生歌词与配色。需 HTTPS 解密。'
for client,ext in [('Egern','yaml'),('Surge','sgmodule'),('Loon','plugin'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}';s=base[path].replace('0.4.5','0.4.6').replace('适配 4','适配 5').replace('两条 Script','三条 Script').replace('两个 URL','三个 URL');s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 if client=='Egern':
  s=re.sub(r'^description: .*$',lambda m:'description: '+summary,s,flags=re.M)
  s=s.replace('auto 依次 LRCLIB、QQ、网易云、酷狗、酷我、lyrics.ovh；','auto 按六源顺序查询，优先同歌手近期成功的同步源；')
  prefix,block=s.split('- http_response:',1);blocks=[]
  for kind,regex,timeout in [('歌词',lyric,12),('入口',entry,3)]:
   b='- http_response:'+block
   if kind=='入口':b=b.replace('spotify-lyrics.js','spotify-lyrics-entry.js').replace('max_size: 2097152','max_size: 131072')
   b=re.sub(r'(?m)^    match: .*$',lambda m:'    match: '+json.dumps(regex),b)
   b=re.sub(r'(?m)^    name: .*$',lambda m:'    name: VerseLyrics · '+kind,b)
   b=b.replace('max_size: 2097152','max_size: 262144').replace('timeout: 25','timeout: '+str(timeout));blocks.append(b)
  s=prefix+''.join(blocks)
 else:
  s=re.sub(r'(?m)^#!desc = .*$',lambda m:'#!desc = '+summary,s);lines=[]
  for line in s.splitlines():
   if not ('type=http-response' in line or line.startswith('response if ') or ' url script-response-body ' in line):lines.append(line);continue
   for kind,regex,timeout in [('Lyrics',lyric,12),('Entry',entry,3)]:
    b=line
    if client=='Loon':
     action=line.split(' then ',1)[1];status='(${response.status} == 200 || ${response.status} == 404)' if kind=='Lyrics' else '${response.status} == 200'
     gate="(${response.header['Content-Length']} == null || ${response.header['Content-Length']} ~= /"+(size if kind=='Lyrics' else entry_size)+'/)'
     b='response if ${url} ~= /'+regex.replace('/','\\/')+'/ && '+status+' && '+gate+' then '+action
     b=b.replace('timeout=25','timeout='+str(timeout)).replace('tag="VerseLyrics 歌词"','tag="VerseLyrics '+kind+'"')
    elif client=='QuantumultX':b=regex+' url script-response-body '+line.split(' url script-response-body ',1)[1]
    else:
     b=re.sub(r'pattern=[^,]+',lambda m:'pattern='+regex,line).replace('VerseLyrics-Response','VerseLyrics-'+kind).replace('max-size=2097152','max-size=262144').replace('timeout=25','timeout='+str(timeout))
    if kind=='Entry':b=b.replace('SpotifyLyrics.js','SpotifyLyrics.Entry.js').replace('max-size=262144','max-size=131072')
    lines.append(b)
  s='\n'.join(lines)+'\n'
 files[path]=s
 path=f'{client}/Docs/SpotifyLyrics.md';old=base[path]
 # Preserve install instructions and limitations; replace only versioned release prose.
 s=old.replace('核心 **0.4.5**','核心 **0.4.6**').replace('客户端适配 **4**','客户端适配 **5**').replace('当前模块：0.4.5','当前模块：0.4.6').replace('两条','三条').replace('两个 URL','三个 URL')
 s=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,s).replace('/VerseLyrics045','/VerseLyrics046')
 paras=s.split('\n\n');paras=[p for p in paras if not p.startswith(('**0.4.5','备用源仍为','缓存总上限仍为','客户端适配改为','2026-10-16：','每次补词最多'))];s='\n\n'.join(paras)
 note='''**0.4.6 首次加载与内存保护：** 高频播放器、元数据和歌词入口由独立小脚本处理，不加载六源、翻译或汉字映射。汉字匹配直接查询 6,447 组静态映射；不再为每次运行建立整张 Map。相同元数据不重复写入缓存，15 秒内连续相同状态记录合并。\n\n`auto` 首次仍依次查询 LRCLIB、QQ、网易云、酷狗、酷我、lyrics.ovh；同一组歌手近期成功的同步源会提前，提示有效 6 小时。每首歌仍核对标题、歌手、时长和版本；其他来源继续保留。配色、翻译、歌词源全程串行。\n\n原始歌词响应上限 256 KiB，播放器与入口响应 128 KiB，普通外部服务响应 96 KiB，配色 256 KiB；单次补源累计 256 KiB、最多 12 个请求，输出最多 512 KiB。歌词缓存最多 128 条、64,000 个 JSON 字符，旧缓存自动缩减；译文保留和重复行展开各最多 60,000 个字符。缓存量不等于总进程内存。\n\n完整歌词处理预算 10 秒，单次 HTTP 最多 2.5 秒。共享存储检查最多两个联网歌词任务；忙时使用已有缓存或保留原响应，不建立等待队列，也不缓存为“此歌无词”。该存储无原子锁，跨实例准入是尽力保护；不能给宿主网络缓冲或 VPN 总内存提供硬上限。未确认取消的超时请求保留短期名额，不继续堆请求。\n\nLoon 在响应头阶段跳过超过对应 128/256 KiB 上限的已知大响应；Egern、Surge、Shadowrocket 同时设置宿主大小限制。所有客户端在脚本内再次检查；Egern 的响应流超限即停止读取。超限或繁忙时，部分歌曲可能暂时不能补词或翻译，优先让原响应继续通过。'''
 s=s.replace('\n\n', '\n\n'+note+'\n\n',1)
 s += f'\n\n2026-10-16：{count} 项自动检查；具体性能、压力和真实来源验证见固定源码目录中的记录。手机 VPN 稳定性和峰值内存仍需实机验证，不能由 Node 测试替代。\n'
 # Remove stale earlier memory/source budgeting prose anywhere it remains.
 s=s.replace('20 秒','10 秒').replace('512 KiB 解码','256 KiB 解码').replace('2 MiB','512 KiB').replace('LRCLIB 重复记录仅按上述相同歌词证据合并','LRCLIB 重复记录仅在完整歌词、时间戳与时长全部相同的情况下合并')
 files[path]=s
files['README.md']=base['README.md'].replace('统一为 **0.4.5**，优化连续切歌时的歌词和译文缓存、按需读取响应，减少重复请求；保留六源补词与同曲配色。','统一为 **0.4.6**，分离轻量入口脚本、静态汉字索引、同歌手来源优先，并收紧响应与缓存大小、限制重叠联网任务；保留六源补词与原生配色。').replace('core 0.4.5 with per-track translation caching, compact fallback storage, lazy bounded response reads, six sequential sources, and song-specific colors.','core 0.4.6 with lightweight entry scripts, static Han lookup, artist source hints, stricter body/cache bounds and shared network admission checks; six sequential sources and native colors remain.')
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.5，优化连续切歌缓存和响应读取，保留六源补词与同曲配色','0.4.6，分离轻量入口脚本、收紧内存和联网预算，保留六源补词与同曲配色')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
