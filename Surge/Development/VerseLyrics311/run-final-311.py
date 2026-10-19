from pathlib import Path
import subprocess,hashlib,json,sys
p=Path(__file__).resolve().parent;node=sys.argv[1];baseline=str(Path(sys.argv[2]).resolve())
def hashes():return {str(f.relative_to(p/'runtime')):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((p/'runtime').rglob('*')) if f.is_file()}
snapshot=hashes();(p/'bench-runtime-sha256.json').write_text(json.dumps(snapshot,indent=2)+'\n')
steps=[('conversion-jsc',[sys.executable,'conversion-memory-bench.py',baseline]),('native-cold-final',[node,'native-first-load-bench.mjs',baseline]),('native-filled-final',[node,'native-first-load-bench.mjs',baseline,'--populated']),('native-churn-final',[node,'native-playlist-bench.mjs',baseline,'--churn']),('native-pressure-final',[node,'native-pressure-bench.mjs',baseline]),('policy-native-churn',[node,'policy-playlist-bench.mjs'])]
for name,command in steps:
 assert hashes()==snapshot,'runtime changed before '+name
 with (p/(name+'.log')).open('w') as out:subprocess.run(command,cwd=p,stdout=out,stderr=subprocess.STDOUT,check=True)
 assert hashes()==snapshot,'runtime changed during '+name
 print(name+' passed; final runtime hashes unchanged',flush=True)
