"""Compare fresh macOS JSC processes; do not infer iOS/VPN acceptance."""
from pathlib import Path
import subprocess,json,sys,statistics,platform,time,hashlib
root=Path(__file__).resolve().parent
baseline=Path(sys.argv[1]);manifest=json.loads((root/'jsc-fixtures/manifest.json').read_text())
trials=8;runs=[]
for mode,repeats,cases in [('cold',1,manifest),('churn',32,[c for c in manifest if c['name'] in ['official-48-protobuf','netease-half-48-protobuf','entry-connect-200','entry-context-200','wire-connect-200','wire-context-200']])]:
 for trial in range(trials):
  for case in cases:
   versions=[('baseline',baseline),('candidate',root)]
   if trial%2:versions.reverse()
   for version,directory in versions:
    r=subprocess.run([str(root/'jsc-memory-runner'),str(root/'jsc-fixtures'/ (case['name']+'.js')),str(directory/'runtime/Loon/script'/case['hook']),str(repeats)],capture_output=True,text=True,timeout=20)
    if r.returncode:raise RuntimeError((mode,case,version,r.stderr))
    runs.append(dict(mode=mode,trial=trial,scenario=case['name'],version=version,runtimeSHA256=hashlib.sha256((directory/'runtime/Loon/script'/case['hook']).read_bytes()).hexdigest(),**json.loads(r.stdout)))
 rows=[]
 for case in cases:
  group=[r for r in runs if r['mode']==mode and r['scenario']==case['name']]
  if len({(r['result']['hash'],r['result']['bytes'],r['result']['calls']) for r in group})!=1:raise RuntimeError(('output-or-http-mismatch',case['name'],group))
  row={'mode':mode,'scenario':case['name'],'inputBytes':case['bytes']}
  for version in ['baseline','candidate']:
   v=[r for r in group if r['version']==version]
   row[version]={key:statistics.median(r[key] for r in v) for key in ['sampledPeakFootprint','maxRSS','milliseconds','endFootprint']}
  rows.append(row)
  print(json.dumps(row),flush=True)
 report={'platform':platform.platform(),'at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'scope':'Eight fresh-process trials per scenario/version. Public macOS JavaScriptCore C API, distinct context group per invocation, no forced GC, callback/passthrough validation and byte fingerprint/HTTP-count comparison. Cold lyric cases start with completely empty stores, including metadata and palette. NetEase search has 45k unrelated catalog characters. Entry cases include unrelated player data, all below 128 KiB. Churn runs 32 independently empty contexts serially, no queue/timers. Native HTTP is mocked and zero-latency, OS allocation high-water includes harness/engine/JIT and current samples. Not iOS Loon, native bridge buffers, rapid-overlap or VPN acceptance.','comparisons':locals().get('allrows',[])+rows,'runs':runs}
 allrows=report['comparisons'];(root/'jsc-memory-results.json').write_text(json.dumps(report,indent=2)+'\n')
