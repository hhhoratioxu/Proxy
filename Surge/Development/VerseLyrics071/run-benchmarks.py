"""Sequential final-byte measurements; abort if any runtime changes."""
from pathlib import Path
import subprocess,hashlib,json,sys,time
root=Path(__file__).resolve().parent
node=sys.argv[1];baseline=str(Path(sys.argv[2]).resolve())
def hashes():
 return {str(p.relative_to(root/'runtime')):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((root/'runtime').rglob('*')) if p.is_file()}
snapshot=hashes()
(root/'bench-runtime-sha256.json').write_text(json.dumps(snapshot,indent=2))
steps=[
 ('jsc',[sys.executable,'jsc-memory-bench.py',baseline]),
 ('native-cold',[node,'native-first-load-bench.mjs',baseline]),
 ('native-filled',[node,'native-first-load-bench.mjs',baseline,'--populated']),
 ('native-churn',[node,'native-playlist-bench.mjs',baseline,'--churn']),
 ('native-pressure',[node,'native-pressure-bench.mjs',baseline]),
 ('compact-cold',[sys.executable,'compact-cold-bench.py'])
]
for name,command in steps:
 assert hashes()==snapshot,'runtime changed before '+name
 with (root/(name+'-final.log')).open('w') as out:
  subprocess.run(command,cwd=root,stdout=out,stderr=subprocess.STDOUT,check=True)
 assert hashes()==snapshot,'runtime changed during '+name
 print(name+' finished; final bytes unchanged',flush=True)
print('All final-byte measurements complete',flush=True)
