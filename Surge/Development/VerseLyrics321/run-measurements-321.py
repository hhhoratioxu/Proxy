from pathlib import Path
import subprocess,sys,json,hashlib,os,time,statistics
p=Path(__file__).resolve().parent;node=sys.argv[1];baseline=Path(sys.argv[2]).resolve()
def hashes(root):return {str(f.relative_to(root/'runtime')):hashlib.sha256(f.read_bytes()).hexdigest() for f in (root/'runtime').rglob('*') if f.is_file()}
snapshot={'baseline':hashes(baseline),'candidate':hashes(p)}
(p/'bench-runtime-sha256.json').write_text(json.dumps(snapshot,indent=2)+'\n')
def step(name,args,env=None,timeout=360):
 assert hashes(p)==snapshot['candidate'] and hashes(baseline)==snapshot['baseline']
 print('BEGIN '+name,flush=True);t=time.monotonic()
 with (p/(name+'.log')).open('w') as out:r=subprocess.run(args,cwd=p,stdout=out,stderr=subprocess.STDOUT,env=env,timeout=timeout)
 if r.returncode:raise RuntimeError(name+' failed: '+(p/(name+'.log')).read_text()[-2000:])
 assert hashes(p)==snapshot['candidate'] and hashes(baseline)==snapshot['baseline']
 print('DONE '+name+' '+str(round(time.monotonic()-t,2))+'s',flush=True)
env={**os.environ,'BENCH_TRIALS':'6'}
step('first-load',[node,'native-first-load-bench.mjs',str(baseline)],env)
step('filled-first-load',[node,'native-first-load-bench.mjs',str(baseline),'--populated'],env)
step('lyric-startup',[node,'lyric-startup-bench.mjs',str(baseline)],{**env,'BENCH_TRIALS':'4'})
step('mixed-playlist',[node,'mixed-playlist-bench.mjs'])
step('pressure',[node,'native-pressure-bench.mjs',str(baseline)])
step('features',[node,'feature-check.mjs'])
step('lyric-jsc-fixtures',[node,'lyric-jsc-fixtures.mjs'])
step('jsc-compile',['/Library/Developer/CommandLineTools/usr/bin/clang','-isysroot','/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk','-O2','-framework','JavaScriptCore','jsc-startup-runner.c','-o','jsc-startup-runner'])
cases=[m+'-'+c for m in ['english-cached','english-cold','missing-cached','missing-cold'] for c in ['empty','filled']];runs=[]
for trial in range(6):
 for name in cases:
  versions=[('baseline',baseline),('candidate',p)]
  if trial%2:versions.reverse()
  for version,root in versions:
   r=subprocess.run([str(p/'jsc-startup-runner'),str(p/'jsc-lyric-fixtures'/(name+'.js')),str(root/'runtime/Loon/script/SpotifyLyrics.js'),'1'],capture_output=True,text=True,timeout=20)
   assert r.returncode==0,(version,name,r.stderr)
   data=json.loads(r.stdout);assert data['result']['synchronous']==(version=='candidate' and 'cached' in name),(version,name,data)
   runs.append({'trial':trial,'version':version,'case':name,**data})
summary=[]
for name in cases:
 assert len({r['result']['hash'] for r in runs if r['case']==name})==1
 for version in ['baseline','candidate']:
  rows=[r for r in runs if r['case']==name and r['version']==version]
  summary.append({'case':name,'version':version,**{key:statistics.median(r[key] for r in rows) for key in ['milliseconds','sampledPeakFootprint','maxRSS']},'synchronous':rows[0]['result']['synchronous']})
report={'scope':'96 fresh macOS JavaScriptCore processes, six alternating trials, four lyric modes, empty/populated cache. Actual compiled Loon scripts and identical self-written bodies, network fixtures and output hashes. Marker inside evaluation verifies local completion. Sampled footprint includes host harness, fixture arrays, JIT and process overhead; not iPhone VPN memory or captured scheduling.','summary':summary,'runs':runs}
(p/'lyric-jsc-results.json').write_text(json.dumps(report,indent=2)+'\n')
assert hashes(p)==snapshot['candidate'] and hashes(baseline)==snapshot['baseline']
print(json.dumps(summary),flush=True);print('ALL FINAL CHECKS COMPLETE',flush=True)
