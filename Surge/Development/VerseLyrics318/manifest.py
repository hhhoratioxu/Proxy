# coding: utf-8
from pathlib import Path
import json,hashlib,sys
p=Path(__file__).resolve().parent
def row(path,file):
 data=file.read_bytes()
 return {'path':path,'local':str(file),'bytes':len(data),'sha':hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest(),'sha256':hashlib.sha256(data).hexdigest()}
if '--production' in sys.argv:
 files=json.loads((p/'production-files.json').read_text());items=[row(path,p/'publish'/path) for path in files];name='production-manifest.json'
else:
 prefix='Surge/Development/VerseLyrics318/'
 names=['README.md','CLIENT-CONTRACTS.md','MEASUREMENTS.md','SOURCE-EVIDENCE.md','package.json','pnpm-lock.yaml','build.mjs','native-adapter.js','package.py','base.json','release.json','options.py','feature-host.mjs','validate-egern.rb','runtime-manifest.json','tests.log','generate-han-blocks.mjs','feature-check.mjs','feature-results.json','validation-summary.json','manifest.py','run-measurements-318.py','summarize-318.py','live-translation-check.mjs','live-translation-results.json','target-track-evidence.json','reproduce-recovery.mjs','recovery-reproduction-results.json','bench-runtime-sha256.json','native-first-load-bench.mjs','native-first-load-results.json','native-filled-first-load-results.json','mixed-playlist-bench.mjs','mixed-native-churn-results.json','native-pressure-bench.mjs','native-pressure-results.json','jsc-memory-runner.c','recovery-jsc-fixtures.mjs','recovery-jsc-results.json']
 source=[p/n for n in names]+list(p.glob('*.test.mjs'))
 for directory in ['core','reference']:source.extend(f for f in (p/directory).rglob('*') if f.is_file())
 assert all(f.is_file() for f in source)
 items=[row(prefix+str(f.relative_to(p)),f) for f in source]+[row(str(f.relative_to(p/'runtime')),f) for f in (p/'runtime').rglob('*') if f.is_file()];name='upload-manifest.json'
items.sort(key=lambda x:x['path']);assert len(set(x['path'] for x in items))==len(items)
(p/name).write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'manifest':name,'files':len(items),'bytes':sum(x['bytes'] for x in items)}))
