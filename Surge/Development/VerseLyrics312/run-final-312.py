from pathlib import Path
import subprocess,hashlib,json,sys
p=Path(__file__).resolve().parent;node=sys.argv[1];baseline=str(Path(sys.argv[2]).resolve())
def hashes():return {str(f.relative_to(p/'runtime')):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((p/'runtime').rglob('*')) if f.is_file()}
snapshot=hashes();resume=next((s.split('=',1)[1] for s in sys.argv[3:] if s.startswith('--from=')),None)
if resume:assert json.loads((p/'bench-runtime-sha256.json').read_text())==snapshot,'runtime changed since previous steps'
else:(p/'bench-runtime-sha256.json').write_text(json.dumps(snapshot,indent=2)+'\n')
steps=[('mixed-jsc',[sys.executable,'mixed-memory-bench.py',baseline]),('native-cold',[node,'native-first-load-bench.mjs',baseline]),('native-filled',[node,'native-first-load-bench.mjs',baseline,'--populated']),('mixed-native-churn',[node,'mixed-playlist-bench.mjs']),('native-pressure',[node,'native-pressure-bench.mjs',baseline])]
if resume:steps=steps[[s[0] for s in steps].index(resume):]
for name,command in steps:
 assert hashes()==snapshot,'runtime changed before '+name
 with (p/(name+'.log')).open('w') as out:subprocess.run(command,cwd=p,stdout=out,stderr=subprocess.STDOUT,check=True)
 assert hashes()==snapshot,'runtime changed during '+name
 print(name+' passed; runtime hashes unchanged',flush=True)
