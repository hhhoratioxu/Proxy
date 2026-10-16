from pathlib import Path
import json,subprocess,statistics,hashlib
root=Path(__file__).resolve().parent;runs=[];cases=['official-120-protobuf','metadata-1000','netease-half-120-protobuf']
for name in cases:
 original=(root/'jsc-fixtures'/ (name+'.js')).read_text();dest=root/'jsc-fixtures'/ (name+'-compact.js');dest.write_text(original.replace('var $response=',"$argument.MEMORY_MODE='compact';var $response="))
 for trial in range(6):
  for mode in (['standard','compact'] if trial%2==0 else ['compact','standard']):
   p=subprocess.run([str(root/'jsc-memory-runner'),str(root/'jsc-fixtures'/ (name+('-compact' if mode=='compact' else '')+'.js')),str(root/'runtime/Loon/script/SpotifyLyrics.js'),'1'],capture_output=True,text=True,check=True);runs.append(dict(scenario=name,mode=mode,trial=trial,**json.loads(p.stdout)))
comparisons=[]
for name in cases:
 group=[r for r in runs if r['scenario']==name];assert len({(r['result']['hash'],r['result']['bytes'],r['result']['calls']) for r in group})==1
 row={'scenario':name}
 for mode in ['standard','compact']:
  data=[r for r in group if r['mode']==mode];row[mode]={k:statistics.median(r[k] for r in data) for k in ['sampledPeakFootprint','milliseconds']}
 assert row['compact']['sampledPeakFootprint'] <= row['standard']['sampledPeakFootprint']*1.03
 comparisons.append(row)
report={'scope':'Six fresh macOS JSC processes per scenario/mode; same 0.7.1 runtime and empty store, zero-latency mocks. Identical output fingerprints and HTTP counts. Compact cache first-load check, not native phone/VPN evidence.','runtimeSHA256':hashlib.sha256((root/'runtime/Loon/script/SpotifyLyrics.js').read_bytes()).hexdigest(),'comparisons':comparisons,'runs':runs}
(root/'compact-first-load-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(comparisons))
