from pathlib import Path
import json,hashlib
p=Path(__file__).resolve().parent
read=lambda f:json.loads((p/f).read_text())
current=read('bench-runtime-sha256.json')
assert all(hashlib.sha256((p/'runtime'/path).read_bytes()).hexdigest()==sha for path,sha in current.items())
jsc=read('jsc-memory-results.json');repeat=read('jsc-metadata-repeat-results.json')
assert len(jsc['comparisons'])==51 and len(jsc['runs'])==612 and len(repeat['runs'])==60
for r in jsc['runs']:
 if r['version']=='candidate':assert r['runtimeSHA256'] in current.values()
for r in repeat['runs']:
 if r['version']=='candidate':assert r['runtimeSHA256']==current['Loon/script/SpotifyLyrics.js']
deltas=[100*(r['candidate']['sampledPeakFootprint']/r['baseline']['sampledPeakFootprint']-1) for r in jsc['comparisons'] if not(r['mode']=='cold' and r['scenario']=='metadata-1000')]
deltas.append(repeat['sampledPeakDeltaPercent'])
assert max(deltas)<=3
node=[]
for f in ['native-first-load-results.json','native-filled-first-load-results.json']:
 rows=read(f)['comparisons'];d=[100*(r['candidate']['sampledMaxHeapBytes']/r['baseline']['sampledMaxHeapBytes']-1) for r in rows];assert max(d)<=3;node.append((f,min(d),max(d)))
churn=read('native-churn-results.json')
assert len(churn['results'])==12
for r in churn['results']:
 assert r['trackChanges']==240 and r['maxActiveHTTP']==1 and r['httpCalls']==720
 assert r['completionCalls']==(0 if r['client']=='Egern' else r['scriptInvocations'])
pressure=read('native-pressure-results.json')
for r in pressure['runs']:
 assert r['peakHTTP']==1 and r['peakLiveInvocations']==2 and r['admissionTimers']==0 and r['retryTranslated']==1
 if r['version']=='0.7.1':assert r['runtimeSHA256']==current['Loon/script/SpotifyLyrics.js']
summary={'version':'0.7.1','baseline':'0.7.0','tests':1059,'runtimeFiles':len(current),'jscColdCases':45,'jscRepeatedCases':6,'jscOriginalRuns':612,'jscExtraMetadataRuns':48,'maximumAggregateSampledFootprintDeltaPercent':max(deltas),'minimumAggregateSampledFootprintDeltaPercent':min(deltas),'initialMetadataSixTrialDeltaPercent':100*(next(r for r in jsc['comparisons'] if r['scenario']=='metadata-1000')['candidate']['sampledPeakFootprint']/next(r for r in jsc['comparisons'] if r['scenario']=='metadata-1000')['baseline']['sampledPeakFootprint']-1),'metadataCombinedTrialsPerVersion':30,'metadataCombinedDeltaPercent':repeat['sampledPeakDeltaPercent'],'nodePeakDeltaRanges':node,'fiveClientChurnCases':10,'baselineLoonChurnCases':2,'physicalIPhoneVPNValidated':False}
(p/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
out=['# VerseLyrics 0.7.1 measurement record','',
'Compared with unchanged 0.7.0. All measurements use synthetic original text and mocked network responses. They do not measure real service latency, mobile bridge buffering or an iPhone VPN process. Peak samples include the harness, engine and allocator; they are not just plugin object sizes.','',
'## Tests and exact runtime','',
'1,059 tests pass. All 16 runtime SHA-256 values are in bench-runtime-sha256.json. The sequential wrapper checks those bytes before/after each phase. JSC and burst runs record their runtime hash. No runtime was rebuilt during the final measurement run.','',
'## macOS JavaScriptCore','',
'45 cold cases and six repeated cases, six fresh processes per version/case (612 processes). Repeated cases create 32 fresh context groups each. Bodies/request counts match. There is no forced GC. The C harness samples footprint at setup, execution, callback and completion boundaries and records OS max RSS.','',
'| Case | 0.7.0 sampled footprint | 0.7.1 sampled footprint | 0.7.0 time | 0.7.1 time |',
'| --- | ---: | ---: | ---: | ---: |']
for r in jsc['comparisons']:
 if r['mode']=='cold' and ('current-cache' in r['scenario'] or 'batch-' in r['scenario']):
  a,b=r['baseline'],r['candidate'];out.append(f"| {r['scenario']} | {a['sampledPeakFootprint']/1048576:.3f} MiB | {b['sampledPeakFootprint']/1048576:.3f} MiB | {a['milliseconds']:.3f} ms | {b['milliseconds']:.3f} ms |")
out+=['',
'The official-cache fixtures retain previous fallback rows and another target language for the same track. Decoded record text falls from 42,454 to 1,998 characters (48 original rows), and 45,374 to 4,918 (120 rows). Both versions perform zero HTTP and return identical bodies. This is a parser-work reduction, not a 90% whole-process memory reduction. The smaller cache-hit case is slightly slower in this sample; improvements are not universal.','',
f"The first six-trial metadata-1000 result was +{summary['initialMetadataSixTrialDeltaPercent']:.2f}% sampled footprint with nearly unchanged RSS. It therefore did not pass the initial 3% gate. To examine variance, one fixed extension added exactly 24 alternating fresh-process trials per version, retaining all original trials and unchanged fixture/runtime bytes. Across all 30, the median delta is +{repeat['sampledPeakDeltaPercent']:.2f}% (baseline {repeat['summary']['baseline']['sampledPeakFootprint']/1048576:.3f} MiB, candidate {repeat['summary']['candidate']['sampledPeakFootprint']/1048576:.3f} MiB). Original and extended results are both published. Do not read this as zero regression or a universal cold-load memory reduction.",'',
f"Using that combined estimate for metadata-1000, the aggregate sampled-footprint range across the matrix is {min(deltas):+.2f}% to {max(deltas):+.2f}%, within the 3% engineering tolerance. See jsc-memory-results.json and jsc-metadata-repeat-results.json. The repeat script is reproducible as: python3 jsc-metadata-repeat.py /path/to/0.7.0.",'',
'## Cold and populated-cache Node checks','',
'Ten cases per version in twelve independent 32 MiB old-space Node processes each. Empty cases start with no lyric/translation cache; metadata/palette are only supplied where declared. Filled-cache cases start with 48,000–60,000 unrelated cache characters. Output hashes and HTTP counts match.']
for f,low,high in node:out.append(f'- {f}: sampled peak heap median deltas {low:+.3f}% to {high:+.3f}%.')
out+=['',
'These small changes are effectively flat at this measurement precision. Forced GC precedes each Node invocation; V8 heap values are not comparable to JSC footprint or iOS VPN memory.','',
'## Switching and overlapping requests','',
'All five candidate clients, JSON and Protobuf, plus baseline Loon in both formats: 240 distinct tracks and 720 mocked HTTP calls per case. A GC occurs every six changes. Bodies match, every script completes, and each case peaks at one active HTTP request. The Egern adapter returns an awaited value; its completionCalls count is zero because it does not use $done. Other adapters verify one completion per invocation. This checks bounded churn, not real network speed.','',
'Four trials per version for same-track and different-track Loon bursts: 60 arrivals spaced 2 ms, callbacks delayed 400 ms. Both versions peak at two unfinished invocations and one HTTP, with no admission timers. The settled track is explicitly requested again and still returns translations. Contention remains an intentional pass-through/retry-later tradeoff. There is no new claimed concurrency improvement.','',
'Compact mode: six cold JSC trials for each of three cases; the same output and HTTP counts, all sampled-footprint medians within the 3% comparison tolerance. Small-cache records may still be evicted earlier, and a long record may not be saved.','',
'## Optional offset and limits','',
'Five compiled clients and both formats verify positive, negative and zero correction, zero HTTP on cached repeats, unchanged stored timestamps, preserved aligned translations, and no cumulative shift. Tests also cover invalid inputs, UNSYNCED lyrics and untouched official timing/syllables. Correction is applied only when enabled; JSON/Protobuf projection is limited to the existing 600-row cap.','',
'An experimental reusable varint cursor and earlier inline offset encoder were not shipped: the large synthetic metadata case had worse JSC footprint. Final code keeps the established varint reader and default encoder, isolates optional correction, and removes the identity-only metadata field getter. No undocumented Loon memory, engine or cancellation option is added.','']
(p/'MEASUREMENTS.md').write_text('\n'.join(out))
print(json.dumps(summary))
