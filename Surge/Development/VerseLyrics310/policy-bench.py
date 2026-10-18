"""Actual macOS JSC fresh-process comparisons against unchanged 3.0.0."""
from pathlib import Path
import subprocess,json,sys,statistics,platform,time,hashlib
p=Path(__file__).resolve().parent;baseline=Path(sys.argv[1]);trials=6;runs=[];rows=[]
names=['official-48-json','official-48-protobuf','official-120-protobuf','lrclib-48-protobuf','netease-half-48-protobuf','official-48-current-cache','official-120-current-cache','fallback-disabled-48-current-cache','official-48-unrelated-save','entry-context-1','entry-connect-200','wire-context-200']
manifest=json.loads((p/'jsc-fixtures/manifest.json').read_text());cases=[c for c in manifest if c['name'] in names or c.get('policy')]
for mode,repeats,selected in [('cold',1,cases),('sequence',32,[c for c in cases if c.get('policy') or c['name'] in ['official-48-protobuf','netease-half-48-protobuf']])]:
 for c in selected:
  group=[]
  for trial in range(trials):
   versions=[('baseline',baseline),('candidate',p)]
   if trial%2:versions.reverse()
   for version,directory in versions:
    runtime=directory/'runtime/Loon/script'/c['hook'];result=subprocess.run([str(p/'jsc-memory-runner'),str(p/'jsc-fixtures'/(c['name']+'.js')),str(runtime),str(repeats)],capture_output=True,text=True,timeout=30)
    if result.returncode:raise RuntimeError((mode,c['name'],version,result.stderr))
    row=dict(mode=mode,trial=trial,scenario=c['name'],version=version,runtimeSHA256=hashlib.sha256(runtime.read_bytes()).hexdigest(),**json.loads(result.stdout));group.append(row);runs.append(row)
  outputs={v:{(r['result']['hash'],r['result']['bytes'],r['result']['calls']) for r in group if r['version']==v} for v in ['baseline','candidate']}
  if any(len(v)!=1 for v in outputs.values()):raise RuntimeError(('inconsistent output',c['name'],outputs))
  if not c.get('policy') and outputs['baseline']!=outputs['candidate']:raise RuntimeError(('regressed output',c['name'],outputs))
  if c.get('policy'):
   expected=(1,0) if c['policy']=='chinese-conversion' else (1,2) if c['policy']=='static-cold' else (0,0)
   actual=tuple(next(iter(outputs[v]))[2] for v in ['baseline','candidate'])
   if actual!=expected:raise RuntimeError(('policy request count',c['name'],actual,expected))
  row={'mode':mode,'scenario':c['name'],'inputBytes':c['bytes'],'intentionalBehaviorChange':bool(c.get('policy'))}
  for version in ['baseline','candidate']:
   samples=[r for r in group if r['version']==version]
   row[version]={k:statistics.median(r[k] for r in samples) for k in ['sampledPeakFootprint','maxRSS','milliseconds','endFootprint']};row[version]['calls']=samples[0]['result']['calls'];row[version]['output']=samples[0]['result']
  rows.append(row);print(json.dumps(row),flush=True)
 report={'at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'platform':platform.platform(),'baselineVersion':'3.0.0','candidateVersion':'3.1.0','scope':'Six alternating fresh-process trials per case/version using the public macOS JavaScriptCore C API. Cold: one fresh context. Sequence: 32 serial fresh contexts/groups per process, no forced GC. Native HTTP mocks are zero-latency and callbacks drain before completion. Existing scenarios require identical byte fingerprints/request counts. Policy scenarios deliberately differ: Chinese conversion 1 to 0 HTTP, static cold 1 translation to 2 source HTTP, static cached 0 to 0. Measurements include harness/JIT/allocator overhead; they are not Loon iPhone memory, native network buffers, overlapped switching or VPN acceptance.','comparisons':rows,'runs':runs}
 (p/'policy-jsc-results.json').write_text(json.dumps(report,indent=2)+'\n')
