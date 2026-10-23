# coding: utf-8
from pathlib import Path
import json, re, subprocess, urllib.parse, tempfile, hashlib
root=Path(tempfile.mkdtemp(prefix='verselyrics-public-source-'))
def get(name,url,headers=None,limit=98304):
    out=root/(name+'.txt')
    args=['curl','-fsS','--compressed','--max-time','15','--max-filesize',str(limit),'-o',str(out),url]
    for k,v in (headers or {}).items(): args += ['-H',k+': '+v]
    subprocess.run(args,check=True,capture_output=True)
    return out.read_text()
html=get('spotify','https://open.spotify.com/embed/track/5gjHrjV4IhqPqoDHQUAriQ',limit=262144)
m=re.search(r'<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>',html)
entity=json.loads(m.group(1))['props']['pageProps']['state']['data']['entity']
meta={k:entity[k] for k in ['id','title','duration','artists']}
(root/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
query=urllib.parse.urlencode({'w':meta['title']+' '+meta['artists'][0]['name'],'format':'json','n':10,'p':1,'t':0})
get('qq','https://c.y.qq.com/soso/fcgi-bin/client_search_cp?'+query,{'Referer':'https://y.qq.com/'})
# This is a verification fixture for the public candidate observed on 2026-10-24,
# not a production track/artist override. Keep the returned lyric text local.
query=urllib.parse.urlencode({'songmid':'002tNDTi2bE19B','format':'json','nobase64':1,'g_tk':5381})
get('qq-lyrics','https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?'+query,{'Referer':'https://y.qq.com/'})
# Public embed session data is not required to replay the identity/source repair.
(root/'spotify.txt').unlink()
print(root)
