# coding: utf-8
from pathlib import Path
import subprocess,sys,hashlib,json,time,os,statistics
p=Path(__file__).resolve().parent;node=sys.argv[1];baseline=Path(sys.argv[2])
def hashes(root):return {str(f.relative_to(root/'runtime')):hashlib.sha256(f.read_bytes()).hexdigest() for f in (root/'runtime').rglob('*') if f.is_file()}
snapshot={'baseline':hashes(baseline),'candidate':hashes(p)};assert all(len(x)==15 for x in snapshot.values());(p/'bench-runtime-sha256.json').write_text(json.dumps(snapshot,indent=2)+'\n')
def step(name,args,env=None,timeout=180):
 assert hashes(p)==snapshot['candidate'] and hashes(baseline)==snapshot['baseline'],'runtime changed'
 print('BEGIN '+name,flush=True);start=time.monotonic()
 with (p/(name+'.log')).open('w') as out:r=subprocess.run(args,cwd=p,stdout=out,stderr=subprocess.STDOUT,env=env,timeout=timeout)
 if r.returncode:raise RuntimeError(name+' failed: '+(p/(name+'.log')).read_text()[-2500:])
 assert hashes(p)==snapshot['candidate'] and hashes(baseline)==snapshot['baseline'],'runtime changed'
 print('DONE '+name+' '+str(round(time.monotonic()-start,2))+'s',flush=True)
env={**os.environ,'BENCH_TRIALS':'6'}
step('first-load',[node,'native-first-load-bench.mjs',str(baseline)],env)
step('filled-first-load',[node,'native-first-load-bench.mjs',str(baseline),'--populated'],env)
step('startup-burst',[node,'startup-burst-bench.mjs',str(baseline)],env)
step('mixed-playlist',[node,'mixed-playlist-bench.mjs',str(baseline)])
step('pressure',[node,'native-pressure-bench.mjs',str(baseline)])
step('features',[node,'feature-check.mjs'])
step('startup-jsc-fixtures',[node,'startup-jsc-fixtures.mjs'])
step('jsc-startup-compile',['/Library/Developer/CommandLineTools/usr/bin/clang','-isysroot','/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk','-O2','-framework','JavaScriptCore','jsc-startup-runner.c','-o','jsc-startup-runner'])
cases=['metadata','extended','bootstrap','context-json'];runs=[]
for trial in range(6):
 for name in cases:
  versions=[('baseline',baseline),('candidate',p)]
  if trial%2:versions.reverse()
  for version,root in versions:
   r=subprocess.run([str(p/'jsc-startup-runner'),str(p/'jsc-startup-fixtures'/(name+'.js')),str(root/'runtime/Loon/script/SpotifyLyrics.Entry.js'),'1'],capture_output=True,text=True,timeout=20)
   assert r.returncode==0,(version,name,r.stderr)
   data=json.loads(r.stdout);out=data['result'];assert out['completions']==1 and out['cacheCharacters']<=64000
   assert out['synchronous']==(version=='candidate'),(version,name,out)
   runs.append({'trial':trial,'version':version,'case':name,**data})
assert hashes(p)==snapshot['candidate'] and hashes(baseline)==snapshot['baseline'],'runtime changed'
summary=[]
for name in cases:
 assert len({r['result']['hash'] for r in runs if r['case']==name})==1
 for version in ['baseline','candidate']:
  rows=[r for r in runs if r['case']==name and r['version']==version]
  summary.append({'case':name,'version':version,**{key:statistics.median(r[key] for r in rows) for key in ['milliseconds','sampledPeakFootprint','maxRSS']},'synchronous':rows[0]['result']['synchronous'],'cacheCharacters':statistics.median(r['result']['cacheCharacters'] for r in rows)})
report={'at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'scope':'48 fresh macOS JavaScriptCore processes with compiled Loon entry scripts and identical self-written fixtures. Six alternating trials per version/case. A marker appended inside the same evaluation distinguishes immediate completion from later Promise jobs; no HTTP/timer jobs are created. Input/output bytes are identical. Footprint/RSS includes fixture/JIT/process overhead and does not establish phone scheduling or VPN memory.','summary':summary,'runs':runs}
(p/'startup-jsc-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(summary),flush=True)
print('ALL FINAL RUNTIME CHECKS COMPLETE',flush=True)
