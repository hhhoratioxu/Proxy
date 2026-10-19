from pathlib import Path
import subprocess,sys,hashlib,json,time,os
p=Path(__file__).resolve().parent;node=sys.argv[1];baseline=Path(sys.argv[2])
def hashes(root):return {str(f.relative_to(root/'runtime')):hashlib.sha256(f.read_bytes()).hexdigest() for f in (root/'runtime').rglob('*') if f.is_file()}
snapshot={'baseline':hashes(baseline),'candidate':hashes(p)};(p/'bench-runtime-sha256.json').write_text(json.dumps(snapshot,indent=2)+'\n')
def step(name,args,env=None,timeout=180):
 assert hashes(p)==snapshot['candidate'] and hashes(baseline)==snapshot['baseline'],'runtime changed'
 print('BEGIN '+name,flush=True);start=time.monotonic()
 with (p/(name+'.log')).open('w') as out:r=subprocess.run(args,cwd=p,stdout=out,stderr=subprocess.STDOUT,env=env,timeout=timeout)
 if r.returncode:raise RuntimeError(name+' failed: '+(p/(name+'.log')).read_text()[-2000:])
 assert hashes(p)==snapshot['candidate'] and hashes(baseline)==snapshot['baseline'],'runtime changed'
 print('DONE '+name+' '+str(round(time.monotonic()-start,2))+'s',flush=True)
env={**os.environ,'BENCH_TRIALS':'6'}
step('first-load',[node,'native-first-load-bench.mjs',str(baseline)],env)
step('filled-first-load',[node,'native-first-load-bench.mjs',str(baseline),'--populated'],env)
step('mixed-playlist',[node,'mixed-playlist-bench.mjs',str(baseline)])
step('pressure',[node,'native-pressure-bench.mjs',str(baseline)])
step('features',[node,'feature-check.mjs'])
for name in ['jsc-fixtures.mjs','mixed-fixtures.mjs','vocal-jsc-fixtures.mjs']:step(name[:-4],[node,name])
step('jsc-compile',['/Library/Developer/CommandLineTools/usr/bin/clang','-isysroot','/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk','-O2','-framework','JavaScriptCore','jsc-memory-runner.c','-o','jsc-memory-runner'])
step('jsc',['python3','vocal-jsc-check.py',str(baseline)])
print('ALL FINAL RUNTIME CHECKS COMPLETE',flush=True)
