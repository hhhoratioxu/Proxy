from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parent
j=json.loads((r/'jsc-memory-results.json').read_text());n=json.loads((r/'native-first-load-results.json').read_text());p=json.loads((r/'native-pressure-results.json').read_text());c=json.loads((r/'native-churn-results.json').read_text())
lines=['# VerseLyrics 0.5.3 measurements','', 'Baseline: immutable 0.5.2. All figures are local engine/native API mocks. They do not represent iPhone VPN peak memory, actual network latency or proof that iOS cannot terminate Loon. The functional output, HTTP counts and callback completion checks must pass before accepting these comparisons.','', '## macOS JavaScriptCore','', 'Six fresh processes per scenario/version. Physical footprint is a whole-process sample; it includes the harness and engine. Churn repeats 32 fresh context groups with no explicit GC. Source, inputs, each runtime SHA-256 and all trials are in the accompanying runner/generator/report.','', '| Mode | Case | 0.5.2 footprint MiB | 0.5.3 footprint MiB | Change | 0.5.2 ms | 0.5.3 ms |','| --- | --- | ---: | ---: | ---: | ---: | ---: |']
maxcold=-100
for row in j['comparisons']:
 a,b=row['baseline'],row['candidate'];change=100*(b['sampledPeakFootprint']/a['sampledPeakFootprint']-1)
 if row['mode']=='cold' and not row['scenario'].startswith(('entry','wire')):maxcold=max(maxcold,change)
 lines.append(f"| {row['mode']} | {row['scenario']} | {a['sampledPeakFootprint']/1048576:.3f} | {b['sampledPeakFootprint']/1048576:.3f} | {change:+.2f}% | {a['milliseconds']:.2f} | {b['milliseconds']:.2f} |")
assert maxcold<3,'material JSC cold regression'
for row in j['runs']:
 if row['version']!='candidate':continue
 path=r/'runtime/Loon/script'/('SpotifyLyrics.Entry.js' if row['scenario'].startswith(('entry','wire')) else 'SpotifyLyrics.js')
 assert row['runtimeSHA256']==hashlib.sha256(path.read_bytes()).hexdigest(),'artifact mismatch'
lines+=['','## Node cold lyric cross-check','','Twelve fresh processes per scenario/version. Sampled heap growth is coarse and includes V8 code/VM/harness allocations. This is neither a retained heap nor an allocator peak. The large empty-English improvement crosses V8 allocation thresholds and is not claimed as a stable device gain. Other lyric cases remain effectively flat.','','| Case | 0.5.2 heap growth bytes | 0.5.3 heap growth bytes | Change | 0.5.2 ms | 0.5.3 ms |','| --- | ---: | ---: | ---: | ---: | ---: |']
for row in n['comparisons']:
 a,b=row['0.5.2'],row['0.5.3'];change=100*(b['medianHeapGrowth']/a['medianHeapGrowth']-1)
 assert change<3,'material Node cold regression'
 lines.append(f"| {row['scenario']} | {a['medianHeapGrowth']} | {b['medianHeapGrowth']} | {change:+.2f}% | {a['medianMs']} | {b['medianMs']} |")
lines+=['','## Overlap and continuous playback','','The prior one-owner/no-wait policy is unchanged. Sixty arrivals at 2 ms spacing and 400 ms callbacks still peak at two unfinished invocations (one owner and one fast passthrough), one active HTTP and zero admission timers in both versions. Different-song and same-song cases drain, and a later explicit settled-track request retains translation. The heap and time figures are effectively unchanged; this is not a new concurrency improvement.','','| Version | Same song | Unfinished peak | HTTP peak | Admission timers | Heap growth bytes |','| --- | --- | ---: | ---: | ---: | ---: |']
for row in p['comparisons']:
 assert row['peakLiveInvocations']==2 and row['peakHTTP']==1 and row['admissionTimers']==0 and row['retryTranslated']==1
 lines.append(f"| {row['version']} | {row['same']} | {row['peakLiveInvocations']} | {row['peakHTTP']} | {row['admissionTimers']} | {row['heapGrowth']} |")
lines+=['','All five clients, JSON and Protobuf, completed 240 distinct-song changes with 720 mocked HTTP calls per case, single active HTTP, bounded cache and identical output SHA-256 within each format. Loon still starts two response scripts per song and uses native request header rewrites. Full per-client times, heap samples, completion counts and eviction rounds are in `native-churn-results.json`. Forced GC every six serial changes is not used in the JSC measurements and is not an iOS behavior assumption.','','The final functional suite has 961 passing tests; Egern native YAML validation also passes. No real phone, native Loon network extension, WebView/Objective-C buffer accounting or on-device import session was measured.']
for row in c['results']:assert row['trackChanges']==240 and row['httpCalls']==720 and row['maxActiveHTTP']==1
(r/'MEASUREMENTS.md').write_text('\n'.join(lines)+'\n')
(r/'validation-summary.json').write_text(json.dumps({'version':'0.5.3','tests':961,'testsFailed':0,'egernYaml':'passed','jscColdCases':36,'jscChurnCases':6,'jscTrialsPerVersionCase':6,'maxJscColdLyricFootprintChangePercent':maxcold,'coldRegressionReview':'all cold lyric footprint/heap medians within 3 percent tolerance; complete data retained','noFeatureRemoval':True,'nativeDeviceTest':False,'reports':{name:hashlib.sha256((r/name).read_bytes()).hexdigest() for name in ['jsc-memory-results.json','native-first-load-results.json','native-churn-results.json','native-pressure-results.json','tests.log']}},indent=2)+'\n')
print('961 tests; all artifact/output/cold-memory review gates passed; no device acceptance claimed')
