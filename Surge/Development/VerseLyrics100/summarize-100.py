from pathlib import Path
import json,hashlib,re
p=Path(__file__).resolve().parent
read=lambda name:json.loads((p/name).read_text())
hashes=read('bench-runtime-sha256.json')
assert len(hashes)==16 and all(hashlib.sha256((p/'runtime'/path).read_bytes()).hexdigest()==sha for path,sha in hashes.items())
tests=(p/'tests.log').read_text();assert '# tests 1094\n' in tests and '# pass 1094\n' in tests and '# fail 0\n' in tests
j=read('jsc-memory-results.json');assert len(j['comparisons'])==61 and len(j['runs'])==976
for row in j['runs']:
 if row['version']=='candidate':assert row['runtimeSHA256'] in hashes.values()
deltas=[100*(r['candidate']['sampledPeakFootprint']/r['baseline']['sampledPeakFootprint']-1) for r in j['comparisons']];assert max(deltas)<3
retired={v:sorted(set(r['result']['decodedCatalogCharacters'] for r in j['runs'] if r['scenario']=='retired-catalog-90000' and r['version']==v)) for v in ['baseline','candidate']}
assert retired['candidate']==[0] and retired['baseline'][0]>90000
node={}
for file in ['native-first-load-results.json','native-filled-first-load-results.json']:
 rows=read(file)['comparisons'];changes=[100*(r['candidate']['sampledMaxHeapBytes']/r['baseline']['sampledMaxHeapBytes']-1) for r in rows];assert max(changes)<3;node[file]=[min(changes),max(changes)]
churn=read('native-churn-results.json')['results'];assert len(churn)==12
for r in churn:
 assert r['trackChanges']==240 and r['httpCalls']==720 and r['maxActiveHTTP']==1
 assert r['completionCalls']==(0 if r['client']=='Egern' else r['scriptInvocations'])
 assert max(x['cacheCharacters'] for x in r['rounds'])<=64000
pressure=read('native-pressure-results.json')
for r in pressure['runs']:
 assert r['peakHTTP']==1 and r['peakLiveInvocations']==2 and r['admissionTimers']==0 and r['retryTranslated']==1
 if r['version']=='1.0.0':assert r['runtimeSHA256']==hashes['Loon/script/SpotifyLyrics.js']
compact=read('compact-first-load-results.json');assert compact['runtimeSHA256']==hashes['Loon/script/SpotifyLyrics.js']
assert all(r['compact']['sampledPeakFootprint']/r['standard']['sampledPeakFootprint']<1.03 for r in compact['comparisons'])
summary={'version':'1.0.0','baseline':'0.7.1','tests':1094,'runtimeFiles':16,'jscColdCases':55,'jscRepeatedCases':6,'jscProcesses':976,'jscSampledPeakDeltaRangePercent':[min(deltas),max(deltas)],'retiredCatalogDecodedCharacters':retired,'nodePeakDeltaRangesPercent':node,'candidateChurnCases':10,'baselineChurnCases':2,'physicalIPhoneVPNValidated':False}
(p/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
out=['# VerseLyrics 1.0.0 measurement record','','Baseline: unchanged 0.7.1. All text is synthetic and HTTP is mocked. The tests do not measure real provider latency, iPhone native buffering or VPN termination. A version number does not establish physical-device acceptance.','','## Exact bytes and tests','','1,094 automated tests pass. bench-runtime-sha256.json covers all sixteen final resources. The sequential wrapper checked these bytes before and after every benchmark phase. No final runtime was rebuilt during measurement.','','## macOS JavaScriptCore','','55 cold scenarios and six repeated-context scenarios; eight alternating fresh-process trials per version/scenario, 976 processes total. Repeated scenarios use 32 distinct context groups per process. No forced GC. Footprint includes harness, engine and allocator and is sampled at execution/callback/completion boundaries. Every baseline/candidate body fingerprint and HTTP count matches in this default-mode matrix.','','| Scenario | 0.7.1 footprint | 1.0.0 footprint | 0.7.1 time | 1.0.0 time |','| --- | ---: | ---: | ---: | ---: |']
selected=['extended-lookup-10','extended-lookup-50','extended-lookup-100','retired-catalog-90000','official-48-protobuf','official-120-protobuf','metadata-1000','kugou-catalog-120','kuwo-catalog-120','lyricsovh-catalog-120']
for name in selected:
 r=next(r for r in j['comparisons'] if r['scenario']==name and r['mode']=='cold');a,b=r['baseline'],r['candidate'];out.append(f"| {name} | {a['sampledPeakFootprint']/1048576:.3f} MiB | {b['sampledPeakFootprint']/1048576:.3f} MiB | {a['milliseconds']:.3f} ms | {b['milliseconds']:.3f} ms |")
out+=['',f"Across all 61 comparisons, sampled-peak median changes range from {min(deltas):+.2f}% to {max(deltas):+.2f}%. All fall within the existing 3% engineering tolerance; that tolerance is not a Loon memory limit. The retired-catalog fixture decodes {retired['baseline'][0]:,} catalog characters in 0.7.1 and zero in 1.0.0. Neither version launches another transport. The three compacted provider frames show small mixed peak/time changes; no universal memory or speed improvement is claimed.",'','## Fresh and populated-cache Node processes','','Each of ten cases runs twelve independent 32 MiB old-space processes per version. A GC occurs before each invocation; no VM or process is reused. Populated-cache cases contain 48,000–60,000 unrelated cache characters. Output hashes and HTTP counts match.']
for name,limits in node.items():out.append(f'- {name}: sampled heap median changes {limits[0]:+.3f}% to {limits[1]:+.3f}%.')
out+=['','These small positive differences are retained in the evidence. Ordinary cold-load memory is effectively similar at this precision, not a demonstrated overall reduction.','','## Switching and overlap','','Ten candidate cases cover all five clients and both formats; baseline Loon adds two comparisons. Each case switches through 240 tracks, makes 720 mocked HTTP calls, and peaks at one active transport. Cache stays within 64,000 characters. A GC occurs every six changes. Egern completes by returning awaited values and therefore records zero $done calls; other clients verify every completion. This is a bounded churn check, not a network-speed test.','','Four trials per version and burst type send 60 arrivals spaced 2 ms with callbacks delayed 400 ms. Both versions peak at two unfinished invocations and one HTTP; no admission timers. In different-track bursts, 1.0.0 intentionally skips the retired first response translation, whereas 0.7.1 completed it. A later explicit request for the settled track returns translations in both. No automatic retry or improved concurrency bound is claimed.','','Compact mode uses six fresh processes for each of three scenarios; output fingerprints and request counts match standard mode. Peak medians remain within 3%. A smaller cache can evict old songs earlier; it is not an assurance of lower first-invocation native memory.','','## Optional fast strategy','','Five compiled adapters and both formats verify first verified plain results, translations, cache hits with zero HTTP, mode changes that allow synchronization upgrades, default behavior for invalid values, and bounded storage. The default matrix above does not turn fast mode on. Fast mode changes the deliberate timing/lookup tradeoff; it does not invent timestamps or widen identity matching.','','## Reproduction','','Follow README.md. jsc-release-fixtures.mjs adds the new scenarios to the existing cold/cache matrix. The raw JSON reports contain every trial; measurements were not selectively rerun or discarded.','']
(p/'MEASUREMENTS.md').write_text('\n'.join(out))
print(json.dumps(summary))
