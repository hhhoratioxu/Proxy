from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'base.json').read_text())['files']
pin=sys.argv[1] if len(sys.argv)>1 else 'RUNTIME_COMMIT'
count=sys.argv[2] if len(sys.argv)>2 else '待验证'
files={}
summary='核心 0.4.10 · 适配 8。修正补充歌词高亮不明显：深色普通句、白色高亮句，背景按封面调整明度；旧颜色缓存离线修正。保留六源补词与插件翻译。需 HTTPS 解密。'
intro='''**0.4.10 歌词高亮修复：** 旧版把 Spotify 嵌入播放页的浅色正文和浅灰辅助文字用作歌词颜色，导致普通歌词与高亮句过于相近。补充歌词现在使用黑色普通句、白色高亮句；背景保留封面色调，只在过暗或过亮时调整明度。《那页夏天》的补词背景由 `#4d545c` 调整为 `#585f66`。切句、滚动和已唱句的淡化继续由 Spotify 原生界面根据原时间轴处理。

旧版补词颜色缓存读取时自动修正，沿用原键和有效期，无需清空歌词、翻译或重新查词。此次颜色修正不新增 HTTP、计时器、脚本入口或缓存记录，最多进行八次固定颜色计算。Spotify 官方歌词响应已有的有效配色继续保留。

保留 0.4.9 的六源顺序补词、中文源优先、候选下载预算、公开元数据回退、有限等待和插件译文替换。持久缓存仍不超过 128 条 / 64,000 JSON 字符，歌词 / 入口正文上限仍为 256 / 128 KiB。Loon 继续使用原生请求头 Rewrite 和两个响应脚本，不为颜色修正增加脚本启动。

更新整个远程插件 / 模块 / 重写文件，以加载新的固定脚本；随后重新打开 Spotify，让歌词页获取新响应。无需查看诊断或手动删除缓存。自动测试不等同于 iPhone 原生界面或 VPN 内存稳定性验收。
'''
palette='''补充歌词优先保留歌词接口已有的有效配色；没有配色时，读取同一歌曲 Spotify 公开嵌入页的背景色，验证歌曲 ID 与颜色范围。普通句用黑色、高亮句用白色，过暗或过亮的背景在保留色调的基础上调整明度，使生成颜色的普通文字 / 背景对比度至少 3.2:1、高亮文字 / 背景至少 4.8:1；这些数值针对颜色字段，不包含客户端动画或透明度。旧缓存同样在读取时修正，不增加联网和缓存写入。

取得补充歌词后才取色，单次最多占用现有总预算中的 1.5 秒；公开元数据页已提供颜色时直接复用。成功缓存一天，失败短暂缓存五分钟并使用中性灰色。取色失败仍可返回已经找到的歌词。'''
for client,ext in [('Egern','yaml'),('Loon','plugin'),('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
 path=f'{client}/script/SpotifyLyrics.{ext}'
 s=base[path].replace('0.4.9','0.4.10')
 s=re.sub(r'(?<=Proxy/)[0-9a-f]{40}(?=/)',pin,s)
 pattern=r'^description: .*$' if client=='Egern' else r'^#!desc = .*$'
 s=re.sub(pattern,lambda _:('description: ' if client=='Egern' else '#!desc = ')+summary,s,flags=re.M)
 files[path]=s
 old=base[f'{client}/Docs/SpotifyLyrics.md']
 start=old.index('当前模块：0.4.9' if client=='Egern' else '核心 **0.4.9**')
 rest=old[start:]
 rest='\n\n'.join(p for p in rest.split('\n\n') if not p.lstrip().startswith('2026-10-16：'))
 rest=rest.replace('0.4.9','0.4.10').replace('VerseLyrics049','VerseLyrics0410')
 rest=re.sub(r'(?<=Proxy/)(?:tree/)?[0-9a-f]{40}(?=/)',lambda m:('tree/' if m[0].startswith('tree/') else '')+pin,rest)
 rest=re.sub(r'补充歌词优先保留歌词接口已有的有效配色[^\n]+',lambda _:palette,rest)
 files[f'{client}/Docs/SpotifyLyrics.md']=old.split('\n\n')[0]+'\n\n'+intro+'\n'+rest+f'\n\n2026-10-16：{count} 项自动测试通过；包含颜色对比度、旧缓存离线修正、五客户端 JSON / Protobuf 输出及连续切歌模拟。记录见固定源码目录；未进行手机实机验收。\n'
s=base['README.md']
s=s.replace('统一为 **0.4.9**，修复超时后中断补词、连续切歌丢弃最新请求的问题，中文源优先、候选歌词下载独立预算，增加公开元数据回退并限制慢翻译等待；保留有限缓存、六源、插件翻译和原生配色。','统一为 **0.4.10**，修正补充歌词普通句与高亮句过于相近的问题：黑色普通句、白色高亮句，封面背景按需调整明度，旧颜色缓存离线修正；保留有限缓存、六源补词与插件翻译。')
s=s.replace('core 0.4.9 with recovery after settled timeouts, bounded admission waiting, Chinese source prioritization, verified-candidate download budgets, public metadata fallback and bounded translation latency. Small scoped caches, sequential sources, plugin translations and native colors remain.','core 0.4.10 with distinct dark ordinary lyrics and white highlights, artwork-derived backgrounds adjusted for contrast, and offline correction of old fallback palette caches. Small scoped caches, sequential sources, plugin translations and official lyric colors remain.')
files['README.md']=s
files['Clash/Docs/SpotifyLyrics.md']=base['Clash/Docs/SpotifyLyrics.md'].replace('0.4.9，修复超时中断补词、切歌丢弃新请求，优化来源顺序并增加公开元数据回退；保留六源补词、翻译与原生配色','0.4.10，修正补充歌词高亮不明显的问题，旧配色缓存离线修正；保留六源补词、翻译及原有内存限制')
for path,content in files.items():
 p=root/'publish'/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(root/'production-files.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'pin':pin,'tests':count},ensure_ascii=False))
