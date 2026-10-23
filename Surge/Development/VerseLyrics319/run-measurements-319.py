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
step('mixed-playlist',[node,'mixed-playlist-bench.mjs',str(baseline)])
step('pressure',[node,'native-pressure-bench.mjs',str(baseline)])
step('features',[node,'feature-check.mjs'])
step('artist-jsc-fixtures',[node,'artist-jsc-fixtures.mjs'])
step('jsc-compile',['/Library/Developer/CommandLineTools/usr/bin/clang','-isysroot','/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk','-O2','-framework','JavaScriptCore','jsc-memory-runner.c','-o','jsc-memory-runner'])
cases=['exact-artist-48','bilingual-artist-48','bilingual-artist-600','bilingual-warm-48'];runs=[]
for trial in range(6):
 for name in cases:
  versions=[('baseline',baseline),('candidate',p)]
  if trial%2:versions.reverse()
  for version,root in versions:
   r=subprocess.run([str(p/'jsc-memory-runner'),str(p/'jsc-artist-fixtures'/(name+'.js')),str(root/'runtime/Loon/script/SpotifyLyrics.js'),'1'],capture_output=True,text=True,timeout=20)
   assert r.returncode==0,(version,name,r.stderr)
   data=json.loads(r.stdout);out=data['result'];assert out['calls']<=3 and out['cacheCharacters']<=64000
   expected=600 if name=='bilingual-artist-600' else 48
   if version=='baseline' and name in ['bilingual-artist-48','bilingual-artist-600']:expected=0
   assert out['rows']==expected,(name,version,out)
   assert out['calls']==(0 if name=='bilingual-warm-48' else 1 if expected==0 else 2),(name,version,out)
   runs.append({'trial':trial,'version':version,'case':name,**data})
assert hashes(p)==snapshot['candidate'] and hashes(baseline)==snapshot['baseline'],'runtime changed'
summary=[]
for name in cases:
 for version in ['baseline','candidate']:
  rows=[r for r in runs if r['case']==name and r['version']==version]
  assert len({(r['result']['hash'],r['result']['calls'],r['result']['rows']) for r in rows})==1
  summary.append({'case':name,'version':version,**{key:statistics.median(r[key] for r in rows) for key in ['milliseconds','sampledPeakFootprint','maxRSS']},'calls':rows[0]['result']['calls'],'rows':rows[0]['result']['rows'],'cacheCharacters':statistics.median(r['result']['cacheCharacters'] for r in rows)})
report={'at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'scope':'48 fresh macOS JavaScriptCore processes with compiled Loon scripts and identical self-written lyric fixtures, inline source translations and exact or bilingual catalog labels. Six alternating trials per version/case. Bilingual cold baseline cases intentionally miss lyrics; candidate extra work is reported, not represented as a memory reduction. Includes harness/VM/JIT/process overhead, no network latency; not iPhone/VPN acceptance.','summary':summary,'runs':runs}
(p/'artist-jsc-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(summary),flush=True)
print('ALL FINAL RUNTIME CHECKS COMPLETE',flush=True)

