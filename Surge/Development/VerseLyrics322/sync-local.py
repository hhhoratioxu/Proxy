# coding: utf-8
from pathlib import Path
import json,re,hashlib
p=Path(__file__).resolve().parent;root=Path('/Users/hhhoratioxu/Documents/CodeX/Proxy')
base=json.loads((p/'base.json').read_text())['files'];files=json.loads((p/'production-files.json').read_text())
report={'updated':[],'unchanged':[],'merged':[],'preserved':[]}
for rel,new in files.items():
 f=root/rel;before=f.read_text() if f.exists() else None
 if before==new:report['unchanged'].append(rel);continue
 after=None
 if before is None or before==base.get(rel):after=new
 elif rel=='Loon/Docs/OfficialReference.md':
  marker='## VerseLyrics 3.2.2'
  if marker not in before:
   after=before.rstrip()+'\n\n'+new[new.index(marker):]
   after=re.sub(r'^核对日期：[0-9-]+。','核对日期：2026-11-01。',after,count=1,flags=re.M)
 elif rel=='README.md':
  after=before;changed=False
  for prefix in ['Egern、Surge、Loon、Shadowrocket、Quantumult X 已统一为','VerseLyrics entries for Egern, Surge, Loon, Shadowrocket and Quantumult X']:
   a=next((x for x in base[rel].split('\n\n') if x.startswith(prefix)),None);b=next((x for x in new.split('\n\n') if x.startswith(prefix)),None)
   if a and b and a in after:after=after.replace(a,b,1);changed=True
  if not changed:after=None
 if after is None:
  report['preserved'].append({'path':rel,'sha256':hashlib.sha256(before.encode()).hexdigest()});continue
 assert not f.exists() or f.read_text()==before,'Local concurrent edit '+rel
 f.parent.mkdir(parents=True,exist_ok=True);f.write_text(after)
 report['updated' if before is None or before==base.get(rel) else 'merged'].append(rel)
(p/'local-sync.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
