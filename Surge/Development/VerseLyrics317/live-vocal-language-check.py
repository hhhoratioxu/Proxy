# coding: utf-8
from pathlib import Path
import subprocess,urllib.parse,json,time,hashlib
p=Path(__file__).resolve().parent
cases=[('ja',['手紙','ラララ']),('ko',['나','오']),('fr',['la','oh']),('pl',['na'])]
rows=[]
for source,words in cases:
 url='https://translate.googleapis.com/translate_a/t?'+urllib.parse.urlencode([('client','dict-chrome-ex'),('sl',source),('tl','zh-CN')]+[('q',s) for s in words])
 start=time.monotonic();r=subprocess.run(['curl','-fsSL','--max-time','10','--max-filesize','98304','-H','Accept-Encoding: identity',url],capture_output=True)
 assert r.returncode==0,(source,r.stderr.decode(errors='replace'))
 data=json.loads(r.stdout);assert isinstance(data,list) and len(data)==len(words)
 values=[v if isinstance(v,str) else v[0] for v in data];assert all(isinstance(v,str) and v.strip() for v in values)
 rows.append({'source':source,'words':words,'translations':values,'replyBytes':len(r.stdout),'replySHA256':hashlib.sha256(r.stdout).hexdigest(),'seconds':round(time.monotonic()-start,3)})
report={'at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'scope':'Four actual public requests with self-written short words, no song lyrics/account data. Confirms current source-code query/array shape on this route, not native phone UI, future availability or catalog coverage. Filler no-request behavior is tested in compiled native mocks.','results':rows}
(p/'live-vocal-language-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
