"""Fresh macOS JSC comparisons against the actually published 3.1.0."""
from pathlib import Path
import subprocess,json,sys,statistics,platform,time,hashlib
p=Path(__file__).resolve().parent;baseline=Path(sys.argv[1]);trials=6;runs=[];rows=[]
names=['official-48-json','official-48-protobuf','official-120-protobuf','lrclib-48-protobuf','netease-half-48-protobuf','official-48-current-cache','official-120-current-cache','fallback-disabled-48-current-cache','official-48-unrelated-save','entry-context-1','entry-connect-200','wire-context-200']
manifest=json.loads((p/'jsc-fixtures/manifest.json').read_text());cases=[c for c in manifest if c['name'] in names or c.get('policy') or c.get('conversionPolicy')]
for mode,repeats,selected in [('cold',1,cases),('sequence',32,[c for c in cases if c.get('conversionPolicy') or c['name'] in ['official-48-protobuf','netease-half-48-protobuf']])]:
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
  if not c.get('conversionPolicy') and outputs['baseline']!=outputs['candidate']:raise RuntimeError(('existing behavior changed',c['name'],outputs))
  if c.get('conversionPolicy'):
   expected=(1,0) if c['conversionPolicy']=='mixed-zh' else (0,0) if c['conversionPolicy']=='stale-cache' else (1,1)
   actual=tuple(next(iter(outputs[v]))[2] for v in ['baseline','candidate'])
   if actual!=expected:raise RuntimeError(('HTTP count',c['name'],actual,expected))
   if any(r['result']['sameAsOriginal']!=(r['version']=='candidate') for r in group):raise RuntimeError(('conversion leaked',c['name']))
  row={'mode':mode,'scenario':c['name'],'inputBytes':c['bytes'],'intentionalBehaviorChange':bool(c.get('conversionPolicy'))}
  for version in ['baseline','candidate']:
   samples=[r for r in group if r['version']==version];row[version]={k:statistics.median(r[k] for r in samples) for k in ['sampledPeakFootprint','maxRSS','milliseconds','endFootprint']};row[version]['calls']=samples[0]['result']['calls'];row[version]['output']=samples[0]['result']
  rows.append(row);print(json.dumps(row),flush=True)
 report={'at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'platform':platform.platform(),'baselineVersion':'3.1.0','candidateVersion':'3.1.1','scope':'Six alternating fresh-process trials per case/version using macOS public JSC. Cold: one context. Sequence: 32 serial fresh contexts/groups without forced GC. Native HTTP mocks have zero latency and drain before completion. Unchanged cases require the same bytes/request counts. New conversion cases require original words with no alternative translation: mixed Chinese/Latin 1 to 0 HTTP, stale conversion cache 0 to 0, service-detected Chinese 1 to 1 cold. Runtime hashes retained per trial. Includes harness/JIT/allocator costs, not iPhone Loon, host buffers or VPN acceptance.','comparisons':rows,'runs':runs}
 (p/'conversion-jsc-results.json').write_text(json.dumps(report,indent=2)+'\n')
