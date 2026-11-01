# coding: utf-8
from pathlib import Path
import concurrent.futures,hashlib,json,subprocess,time
p=Path(__file__).resolve().parent;state=json.loads((p/'release-state.json').read_text());prod=json.loads((p/'production-manifest.json').read_text());runtime=json.loads((p/'runtime-manifest.json').read_text());source=json.loads((p/'upload-manifest.json').read_text());base='https://raw.githubusercontent.com/hhhoratioxu/Proxy/'
checks=[]
for row in prod:checks.append((base+state['commit']+'/'+row['path'],row))
for row in runtime:checks.append((base+state['runtime']+'/'+row['path'],{**row,'local':str(p/'runtime'/row['path'])}))
for name in ['README.md', 'MEASUREMENTS.md', 'validation-summary.json', 'CLIENT-CONTRACTS.md', 'STARTUP-EVIDENCE.md', 'lyric-startup-results.json', 'lyric-jsc-results.json']:
 row=next(r for r in source if r['path']==state['sourcePrefix']+'/'+name);checks.append((base+state['runtime']+'/'+row['path'],row))
for row in prod:
 if row['path'].endswith(('.lpx','.sgmodule','.yaml','.conf')):checks.append((base+'main/'+row['path'],row))
for row in runtime:
 if row['path'].startswith('Egern/') and row['path'].endswith('.js'):checks.append((base+state['runtime']+'/'+row['path']+'?v=3.2.2',{**row,'local':str(p/'runtime'/row['path'])}))
assert len(checks)==45
def verify(item):
 url,row=item;attempts=[]
 for wait in [0,2,5]:
  if wait:time.sleep(wait)
  r=subprocess.run(['curl','-fsSL','--max-time','20',url],capture_output=True);data=r.stdout;sha=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();sha256=hashlib.sha256(data).hexdigest();ok=r.returncode==0 and sha==row['sha'] and sha256==row['sha256'] and data==Path(row['local']).read_bytes();attempts.append({'status':r.returncode,'bytes':len(data),'sha':sha,'sha256':sha256,'match':ok})
  if ok:break
 return {'url':url,'ok':ok,'attempts':attempts}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(verify,checks))
report={'version':'3.2.2','at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'passed':sum(r['ok'] for r in results),'total':len(results),'results':results};(p/'public-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':report['passed'],'total':len(results),'failed':[r['url'] for r in results if not r['ok']]}));assert report['passed']==45

