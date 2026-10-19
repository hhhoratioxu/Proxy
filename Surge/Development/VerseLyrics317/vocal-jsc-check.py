from pathlib import Path
import subprocess,json,sys,statistics,time,hashlib
p=Path(__file__).resolve().parent;baseline=Path(sys.argv[1]);runs=[]
for name in ['official-48-protobuf','mixed-cold-protobuf','vocal-english-600','vocal-foreign-600']:
 for trial in range(6):
  versions=[('candidate',p)] if name.startswith('vocal-') else [('baseline',baseline),('candidate',p)]
  if trial%2:versions.reverse()
  for version,root in versions:
   runtime=root/'runtime/Loon/script/SpotifyLyrics.js'
   r=subprocess.run([str(p/'jsc-memory-runner'),str(p/'jsc-fixtures'/(name+'.js')),str(runtime),'1'],capture_output=True,text=True,timeout=30)
   assert r.returncode==0,(name,version,r.stderr)
   runs.append({'scenario':name,'trial':trial,'version':version,'runtimeSHA256':hashlib.sha256(runtime.read_bytes()).hexdigest(),**json.loads(r.stdout)})
summary=[]
for name in ['official-48-protobuf','mixed-cold-protobuf','vocal-english-600','vocal-foreign-600']:
 rows=[r for r in runs if r['scenario']==name];assert len({json.dumps(r['result'],sort_keys=True) for r in rows})==1
 item={'scenario':name}
 for version in sorted({r['version'] for r in rows}):
  group=[r for r in rows if r['version']==version];item[version]={key:statistics.median(r[key] for r in group) for key in ['milliseconds','sampledPeakFootprint','maxRSS']};item[version]['result']=group[0]['result']
 summary.append(item)
report={'at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'scope':'36 fresh macOS JSC processes, six alternating trials per case/version. Same codec/fixture/native host mocks; zero service latency. Ordinary and mixed unchanged cases require identical outputs. Candidate-only English/foreign vocal cases deliberately exercise repaired behavior on 600 rows. Includes harness/VM/JIT/native process overhead, not phone or VPN acceptance.','comparisons':summary,'runs':runs}
(p/'vocal-jsc-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(summary))
