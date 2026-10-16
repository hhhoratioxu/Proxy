"""One fixed extension: combine six existing and 24 new trials, keep every run."""
from pathlib import Path
import json,subprocess,statistics,hashlib,sys
root=Path(__file__).resolve().parent;baseline=Path(sys.argv[1]).resolve()
initial=json.loads((root/'jsc-memory-results.json').read_text())
scenario='metadata-1000';runs=[r for r in initial['runs'] if r['mode']=='cold' and r['scenario']==scenario]
assert len(runs)==12
for trial in range(6,30):
 versions=[('baseline',baseline),('candidate',root)]
 if trial%2:versions.reverse()
 for version,folder in versions:
  script=folder/'runtime/Loon/script/SpotifyLyrics.js'
  result=subprocess.run([str(root/'jsc-memory-runner'),str(root/'jsc-fixtures'/(scenario+'.js')),str(script),'1'],capture_output=True,text=True,check=True)
  runs.append(dict(mode='cold',trial=trial,scenario=scenario,version=version,runtimeSHA256=hashlib.sha256(script.read_bytes()).hexdigest(),**json.loads(result.stdout)))
assert len({(r['result']['hash'],r['result']['bytes'],r['result']['calls']) for r in runs})==1
summary={}
for version in ['baseline','candidate']:
 group=[r for r in runs if r['version']==version]
 assert len({r['runtimeSHA256'] for r in group})==1
 summary[version]={k:statistics.median(r[k] for r in group) for k in ['sampledPeakFootprint','maxRSS','milliseconds','endFootprint']}
delta=100*(summary['candidate']['sampledPeakFootprint']/summary['baseline']['sampledPeakFootprint']-1)
report={'reason':'The initial six-trial metadata-1000 case exceeded the 3% sampled-footprint gate while RSS was flat. Extend once by exactly 24 alternating fresh-process trials and aggregate all 30 per version; no discarded trials, changed fixture or runtime. This examines variability, not a physical iPhone memory guarantee.','summary':summary,'sampledPeakDeltaPercent':delta,'runs':runs}
(root/'jsc-metadata-repeat-results.json').write_text(json.dumps(report,indent=2))
print(json.dumps({**summary,'deltaPercent':delta}),flush=True)
