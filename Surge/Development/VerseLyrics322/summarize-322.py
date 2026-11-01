from pathlib import Path
import json,re,hashlib

p=Path(__file__).resolve().parent
def read(name):return json.loads((p/name).read_text())
def pct(a,b):return (b/a-1)*100
def pair(rows,selector):
    return {r['version']:r for r in rows if selector(r)}
tests=(p/'tests.log').read_text()
count=int(re.search(r'^# tests (\d+)$',tests,re.M)[1])
assert f'# pass {count}\n' in tests and '# fail 0\n' in tests
burst=read('lyric-startup-results.json');first=read('native-first-load-results.json');filled=read('native-filled-first-load-results.json');jsc=read('lyric-jsc-results.json');churn=read('mixed-native-churn-results.json');pressure=read('native-pressure-results.json');features=read('feature-results.json')
frozen=read('bench-runtime-sha256.json')['candidate']
assert frozen==features['runtimeSHA256']
assert frozen=={str(f.relative_to(p/'runtime')):hashlib.sha256(f.read_bytes()).hexdigest() for f in (p/'runtime').rglob('*') if f.is_file()}
loon=[]
for populated in [False,True]:
    for mode in ['english-cached','english-cold','missing-cached','missing-cold']:
        q=pair(burst['comparisons'],lambda r:r['client']=='Loon' and r['filled']==populated and r['mode']==mode)
        a,b=q['baseline'],q['candidate']
        loon.append({'mode':mode,'populated':populated,'baselineHeapGrowth':a['heapGrowth'],'candidateHeapGrowth':b['heapGrowth'],'heapChangePercent':pct(a['heapGrowth'],b['heapGrowth']),'baselineMilliseconds':a['ms'],'candidateMilliseconds':b['ms'],'peakLiveBefore':a['peakLive'],'peakLiveAfter':b['peakLive'],'pendingAfterDispatchBefore':a['pending'],'pendingAfterDispatchAfter':b['pending']})
summary={'version':'3.2.2','adapter':18,'baseline':'3.2.1','baselineSourceCommit':'d76f8aa7785e023b9901dbf97e44e274295a0ed8','tests':count,'addedMissingResponseCases':30,'addedBuildScopeCases':4,'universalFirstLoadMemoryReduction':False,'lyricBurstFreshNodeProcesses':len(burst['runs']),'firstLoadFreshNodeProcesses':len(first['runs'])+len(filled['runs']),'lyricJSCFreshProcesses':len(jsc['runs']),'mixedNativeResponses':sum(r['lyricResponses'] for r in churn['results']),'networkPressureProcesses':len(pressure['runs']),'featureInvocations':features['invocations'],'peakNetworkHTTP':max(r['maxActiveHTTP'] for r in churn['results']),'warmHTTP':sum(r['warmHTTP'] for r in churn['results']),'loonBurstSamples':loon,'phoneCrashCapture':False,'phoneUIAndVPNAcceptance':False,'runtimeHashes':'bench-runtime-sha256.json','fullMeasurements':'MEASUREMENTS.md','languagePolicy':'Only English songs translate to zh-CN/zh-TW; other songs retain English fragments. Untagged Latin lyrics use a conservative heuristic, not authoritative language identification.'}
(p/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
lines=['# VerseLyrics 3.2.2 measurements','',
'Measured 2026-11-01 on macOS arm64, Node v24.22.1 and the macOS public JavaScriptCore C API. Baseline is immutable 3.2.1 source/runtime commit d76f8aa7785e023b9901dbf97e44e274295a0ed8. Runtime hashes are frozen in bench-runtime-sha256.json and matched before/after every stage. All lyrics are self-written fixtures, all HTTP responses are mocks. This is not captured Spotify scheduling, native iPhone memory, device UI or VPN stability acceptance. No phone termination record was obtained.','',
f'{count} regression tests pass, including 30 new missing-response/recovery cases and four build-scope cases. Functional verification covers 60 native feature invocations and 4800 lyric responses across five clients, JSON/protobuf and both cache sizes. Warm reopen HTTP is zero; sampled active HTTP is at most one in these fixtures. Storage leases are advisory, not a native atomic-concurrency guarantee.','',
'## Lyric burst retention','',
'256 fresh Node processes: four alternating trials per version/client/cache/mode. Each dispatches 72 invocations in one JavaScript turn before microtasks drain, with no forced GC during the burst. Input references are released at completion. Both versions already finish cached paths in the same evaluation. This is retained behavior, not a new concurrency improvement. Cold paths leave one actual network owner; busy responses finish immediately and retain the existing retry-on-next-request behavior. Output hashes and request counts match 3.2.1. This adverse scheduler model exposes retention but does not assert that Loon schedules scripts this way.','',
'Loon medians below. Heap growth includes V8, VM, harness and compilation. A reduction is not a total-VPN memory reduction.','',
'| Mode | Unrelated cache | Heap growth KiB, 3.2.1 → 3.2.2 | Change | Time ms, before → after | Peak unfinished | Pending after dispatch |','|---|---|---:|---:|---:|---:|---:|']
for r in loon:
    lines.append(f"| {r['mode']} | {'populated' if r['populated'] else 'empty'} | {r['baselineHeapGrowth']/1024:.1f} → {r['candidateHeapGrowth']/1024:.1f} | {r['heapChangePercent']:+.1f}% | {r['baselineMilliseconds']:.3f} → {r['candidateMilliseconds']:.3f} | {r['peakLiveBefore']} → {r['peakLiveAfter']} | {r['pendingAfterDispatchBefore']} → {r['pendingAfterDispatchAfter']} |")
lines+=['','All four native-client results, including slower samples, are retained in lyric-startup-results.json. There is no universal burst wall-time improvement claim.','',
'## Fresh lyric load in Node/V8','',
'540 fresh 32 MiB old-space processes: nine alternating trials per version for 15 scenarios, with empty and unrelated populated caches. Each process compiles/invokes only one version. Zero HTTP latency; exact outputs and request counts must match. The zh cases with no pure qualifier explicitly select English as their target and therefore retain their previous behavior; pure-zh cases use the default Chinese target. Both versions have the same English-only Chinese translation policy.','',
'The full table includes regressions. V8 allocation/GC thresholds can affect sampled heap growth; these samples are neither a hard bound nor evidence that all cold paths allocate less. In particular, the empty-cache 120-line English official/fallback cases use more sampled V8 heap. Preliminary empty official-en-24 baseline trials also showed two allocation clusters; these samples should not be treated as native-device savings.','']
for label,data in [('Empty caches',first),('Populated caches',filled)]:
    lines += [f'### {label}','','| Scenario | Time ms, before → after | Heap growth KiB, before → after | Heap change | HTTP |','|---|---:|---:|---:|---:|']
    for q in data['comparisons']:
        a,b=q['baseline'],q['candidate']
        lines.append(f"| {q['scenario']} | {a['medianMs']:.3f} → {b['medianMs']:.3f} | {a['medianHeapGrowth']/1024:.1f} → {b['medianHeapGrowth']/1024:.1f} | {pct(a['medianHeapGrowth'],b['medianHeapGrowth']):+.1f}% | {b['httpCalls']} |")
    lines.append('')
lines+=['## Fresh lyric load in macOS JavaScriptCore','',
'160 fresh processes, ten alternating trials for four modes and two unrelated-cache conditions. The marker inside the evaluation verifies local completion rather than completion after a microtask checkpoint. Cached paths are synchronous in both versions; real-HTTP paths are asynchronous. All output hashes and HTTP counts match. Sampled process footprint includes fixture data, native runner and JSC. It is not the Loon extension footprint.','',
'| Case | Time ms, before → after | Sampled footprint KiB, before → after | Footprint change |','|---|---:|---:|---:|']
for case in dict.fromkeys(r['case'] for r in jsc['summary']):
    q=pair(jsc['summary'],lambda r:r['case']==case);a,b=q['baseline'],q['candidate']
    lines.append(f"| {case} | {a['milliseconds']:.3f} → {b['milliseconds']:.3f} | {a['sampledPeakFootprint']/1024:.1f} → {b['sampledPeakFootprint']/1024:.1f} | {pct(a['sampledPeakFootprint'],b['sampledPeakFootprint']):+.2f}% |")
lines+=['',
'Cold missing-lyrics/populated-cache JSC footprint rises about 8 KiB in these medians; cached English/empty-cache execution is slightly slower. These results are retained rather than described as universal improvement. No cache, concurrency, response-size budget or prefetch capacity was increased. A token-scanning cache parser, no-inline build and manual host continuation were rejected. The final build moves online source helpers into a static lazy scope and removes redundant Chinese checks after the English-song gate; cached fallback decoding stays outside that scope. The cache parser and local completion runner retain their 3.2.1 design.','',
'## Delayed HTTP and consecutive songs','',
'The 16 delayed-HTTP processes send 60 requests spaced 2 ms with 400 ms callbacks, covering repeated and distinct tracks. Both versions peak at two live invocations, one HTTP owner and zero admission timers; callbacks drain before owner completion and a follow-up request recovers the settled translation. This scheduling case is unchanged in concurrency. Delayed-HTTP heap growth rises about 3.6% in both modes; busy-response timings can regress; native-pressure-results.json retains every comparison.','',
'The twenty mixed-playlist processes process 120 songs twice each: 80 English songs translate and 40 Chinese songs with English fragments remain original. All 4800 responses complete once. Standard storage peaks at 117 entries / 63928 characters (budget 128 / 64000); compact peaks at 58 / 31888 (budget 64 / 32000). These are stored string budgets, not live native memory ceilings. Original lines, timing, replacement switch, source fallback and filler filtering are asserted independently.','',
'## Reproduction and scope','',
'Run the commands in README.md. run-measurements-322.py executes measurements sequentially and checks runtime hashes at every boundary; summarize-322.py generates this document and validation-summary.json. Raw reports retain every trial. The final reports contain 832 fresh Node processes plus 160 fresh JSC processes. Earlier-version reports and preliminary prototypes are not included as 3.2.2 release evidence.','',
'The phone disconnection remains a reported failure with unconfirmed cause. Sampled memory costs are mixed, so this release does not establish lower memory for every first load. Preventing temporary negative caching fixes a distinct missing-lyrics path; it cannot force Spotify to request again or cover songs absent from source catalogs. Actual iPhone playback/UI, VPN continuity, system peak memory, real network latency and every-source coverage remain unverified.']
(p/'MEASUREMENTS.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'tests':count,'nodeProcesses':len(burst['runs'])+len(first['runs'])+len(filled['runs'])+len(pressure['runs'])+len(churn['results']),'jscProcesses':len(jsc['runs']),'loonHeapChangeRange':[min(r['heapChangePercent'] for r in loon),max(r['heapChangePercent'] for r in loon)]}))
