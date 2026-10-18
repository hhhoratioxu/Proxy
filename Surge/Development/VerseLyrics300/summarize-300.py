from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parent
baseline=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'100'
load=lambda n:json.loads((root/n).read_text())
actual={str(p.relative_to(root/'runtime')):hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'runtime').rglob('*') if p.is_file()}
assert actual==load('bench-runtime-sha256.json')
assert len(actual)==15 and 'Loon/script/SpotifyLyrics.Request.js' not in actual
log=(root/'tests.log').read_text();assert re.search(r'^# tests 1148$',log,re.M) and re.search(r'^# pass 1148$',log,re.M) and re.search(r'^# fail 0$',log,re.M)
jsc=load('jsc-memory-results.json');fixtures={x['name']:x for x in load('jsc-fixtures/manifest.json')}
for row in jsc['runs']:
 if row['version']=='candidate':assert row['runtimeSHA256']==actual['Loon/script/'+fixtures[row['scenario']]['hook']]
for row in json.loads((baseline/'runtime-manifest.json').read_text()):
 data=(baseline/'runtime'/row['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==row['sha256'],'changed 1.0.0 baseline runtime'
delta=lambda a,b:(b/a-1)*100
peak=[delta(r['baseline']['sampledPeakFootprint'],r['candidate']['sampledPeakFootprint']) for r in jsc['comparisons']]
above=[{'mode':r['mode'],'scenario':r['scenario'],'peakDeltaPercent':delta(r['baseline']['sampledPeakFootprint'],r['candidate']['sampledPeakFootprint'])} for r in jsc['comparisons'] if delta(r['baseline']['sampledPeakFootprint'],r['candidate']['sampledPeakFootprint'])>3]
nodes={}
for name in ['native-first-load-results.json','native-filled-first-load-results.json']:
 report=load(name);values=[delta(r['baseline']['sampledMaxHeapBytes'],r['candidate']['sampledMaxHeapBytes']) for r in report['comparisons']]
 nodes[name]=[min(values),max(values)]
churn=load('native-churn-results.json')['results']
assert len(churn)==12 and len([x for x in churn if x['version']=='candidate'])==10
for row in churn:
 assert row['trackChanges']==240 and row['httpCalls']==720 and row['maxActiveHTTP']==1
 assert all(x['cacheCharacters']<=64000 for x in row['rounds'])
 assert row['client']=='Egern' or row['completionCalls']==row['scriptInvocations']
pressure=load('native-pressure-results.json')
assert all(x['peakHTTP']==1 and x['peakLiveInvocations']==2 and x['admissionTimers']==0 and x['retryTranslated']==1 for x in pressure['comparisons'])
progress=load('source-progress-results.json')
assert [x['retryCalls'] for x in progress['runs']]==[5,2]
assert len({x['outputSHA256'] for x in progress['runs']})==1
summary={'version':'3.0.0','baseline':'1.0.0','tests':1148,'runtimeFiles':15,'jscColdCases':len(fixtures),'jscRepeatedCases':len([x for x in jsc['comparisons'] if x['mode']=='churn']),'jscProcesses':len(jsc['runs']),'jscSampledPeakDeltaRangePercent':[min(peak),max(peak)],'casesAbovePriorThreePercentComparisonThreshold':above,'nodeSampledPeakDeltaRangePercent':nodes,'sourceProgressRetryRequests':[5,2],'candidateChurnCases':10,'physicalIPhoneVPNValidated':False}
(root/'validation-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
old=json.loads((baseline/'runtime-manifest.json').read_text());new=load('runtime-manifest.json')
oldbytes={x['path']:x['bytes'] for x in old};newbytes={x['path']:x['bytes'] for x in new}
lines=['# VerseLyrics 3.0.0 measurement record','',
'Baseline: unchanged 1.0.0, verified against its immutable manifest. All benchmark words are synthetic and HTTP is mocked. These measurements do not establish iPhone native buffering, source latency, Spotify UI acceptance or VPN stability.','',
'## Final bytes and functional checks','',
'1,148 automated tests pass. The sequential wrapper verified all fifteen final runtime hashes before and after every completed phase. No runtime was rebuilt during this final matrix. A tokenizer proposal was rejected during development for slower cache saves; the final cache serializer is the 1.0.0 implementation. The churn harness was corrected to avoid trying to load the removed, unconfigured Loon request script; both versions already use Rewrite and have the same two invocations per track.','',
'## Functional source progression','',
'In source-progress-results.json, the initial explicit search makes seven requests in both versions. One source is transiently unavailable; five other sources return verified no-match results. After the existing server cooldown, an explicit retry makes five requests in 1.0.0 and two in 3.0.0, with the same packed-lyric SHA256. No real-latency speedup is claimed. The per-source proofs add 522 cache characters in this fixture, within the same cache cap. The optimization applies to auto source mode; a fixed source keeps its existing whole-search cache without redundant per-source records.','',
'Five compiled adapters and both formats separately test cache-only: warm fallback and plugin translations remain, cold uncached fallback stays missing, cached official translations replace Spotify alternatives, missing palette cache does not become a false failure, and all cases make zero plugin HTTP. Returning online resumes uncached translation.','',
'## macOS JavaScriptCore','',
f'{len(fixtures)} cold scenarios plus six repeated-context scenarios, eight alternating fresh-process trials per version/scenario, {len(jsc["runs"])} processes total. Repeated cases contain 32 distinct context groups and no forced GC. All compared output fingerprints and HTTP counts match. Samples include harness, engine and allocator at execution/callback/completion boundaries.','',
f'Sampled peak median changes range from {min(peak):+.2f}% to {max(peak):+.2f}%. This is a mixed result, not a universal first-load memory reduction. The following cases exceed the older 3% engineering comparison threshold (which is not a documented Loon memory limit):','']
for row in above:lines.append('- '+row['mode']+' / '+row['scenario']+': '+f'{row["peakDeltaPercent"]:+.2f}%')
lines+=['','| Scenario | 1.0.0 footprint | 3.0.0 footprint | 1.0.0 time | 3.0.0 time |','| --- | ---: | ---: | ---: | ---: |']
selected=['official-24-protobuf','official-48-json','entry-context-1','metadata-1000','official-48-unrelated-save','fallback-48-unrelated-save','official-120-unrelated-save','fallback-120-unrelated-save']
for name in selected:
 r=next(x for x in jsc['comparisons'] if x['mode']=='cold' and x['scenario']==name);a,b=r['baseline'],r['candidate']
 lines.append(f'| {name} | {a["sampledPeakFootprint"]/1048576:.3f} MiB | {b["sampledPeakFootprint"]/1048576:.3f} MiB | {a["milliseconds"]:.3f} ms | {b["milliseconds"]:.3f} ms |')
lines+=['','## Node cold loads and switching','',
'Twelve independent 32 MiB old-space processes per version for each of ten cold scenarios; GC before each invocation. Populated cases contain 48,000–60,000 unrelated cache characters. Native request counts and output hashes match. This Node old-space setting is a harness parameter, not a Loon limit.','']
for f,values in nodes.items():lines.append(f'- {f}: sampled heap median changes {values[0]:+.3f}% to {values[1]:+.3f}%.')
lines+=['','Ordinary first-load and populated-cache results remain broadly similar; no across-the-board reduction is established. Churn uses ten candidate/client/format cases plus two baseline Loon cases, each with 240 tracks, 720 HTTP, one maximum active HTTP, and a cache below 64,000 characters. Explicit GC every six changes bounds this harness; it does not model an iPhone process lifetime.','',
'| Loon format | 1.0.0 elapsed | 3.0.0 elapsed | 1.0.0 sampled heap | 3.0.0 sampled heap |','| --- | ---: | ---: | ---: | ---: |']
for format in ['json','protobuf']:
 a=next(x for x in churn if x['client']=='Loon' and x['version']=='baseline' and x['format']==format)
 b=next(x for x in churn if x['client']=='Loon' and x['version']=='candidate' and x['format']==format)
 lines.append(f'| {format} | {a["elapsedMs"]} ms | {b["elapsedMs"]} ms | {a["sampledMaxHeapBytes"]} bytes | {b["sampledMaxHeapBytes"]} bytes |')
lines+=['','Loon completes all 480 invocations and uses no timers; Egern returns awaited values and therefore does not call $done. Other hosts also verify every completion. Both burst versions peak at two unfinished invocations and one HTTP with no admission timers; same-track work is retained, different-track retired work stops, and a later settled-track retry translates successfully. No stronger concurrency bound or automatic retry is claimed. Compact-mode data remains in compact-first-load-results.json; smaller cache capacity does not guarantee lower first-invocation native memory.','',
'## Bundle sizes','',
'| Resource | 1.0.0 | 3.0.0 |','| --- | ---: | ---: |']
for path in ['Loon/script/SpotifyLyrics.js','Loon/script/SpotifyLyrics.Entry.js']:
 lines.append(f'| {path} | {oldbytes[path]} bytes | {newbytes[path]} bytes |')
lines+=['','The entry script shrinks while the lyric script grows to carry new behavior. Removing the unused Loon request resource reduces distributed artifacts; it does not remove an invocation from the already-Rewrite-based 1.0.0 configuration. See README.md for reproduction and CLIENT-CONTRACTS.md for API evidence.','']
(root/'MEASUREMENTS.md').write_text('\n'.join(lines))
print(json.dumps(summary,ensure_ascii=False))

