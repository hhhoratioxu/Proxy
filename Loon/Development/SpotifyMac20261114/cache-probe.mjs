// Controlled test for the documented ExtensionQuery.etag field. This is not a
// production cache policy: it only targets the one public regression track.
export function refreshTestMetadata(request,output,codec,inspect) {
  try {
    if(!output?.headers || request.method!=='POST' || !/^https:\/\/(?:spclient\.wg|[a-z0-9-]+-spclient)\.spotify\.com(?::443)?\/extended-metadata\/v0\/extended-metadata\/?(?:\?.*)?$/.test(request.url))return output;
    const input=request.body;
    if(!ArrayBuffer.isView(input)||input.byteLength>65536)return output;
    const headers=output.headers;
    if(Array.isArray(headers))return output;
    for(const key of Object.keys(headers))if(/^(?:content-md5|digest|content-digest|signature|signature-input)$/i.test(key))return output;
    const encoding=Object.keys(headers).find(k=>k.toLowerCase()==='content-encoding');
    if(encoding&&String(headers[encoding]).toLowerCase()!=='identity')return output;
    const bytes=new Uint8Array(input.buffer,input.byteOffset,input.byteLength),root=codec.fields(bytes);
    let changed=0,queries=0,entities=0;
    const parts=root.map(entity=>{
      if(entity.number!==2)return entity.raw;
      if(entity.wire!==2 || ++entities>100)throw Error('entity-limit');
      const ef=codec.fields(entity.payload),uris=ef.filter(f=>f.number===1);
      if(uris.length!==1||uris[0].wire!==2||codec.text(uris[0].payload)!=='spotify:track:76XUZSb13QUuj1HECY4Hvo')return entity.raw;
      let count=0;
      const ep=ef.map(query=>{
        if(query.number!==2)return query.raw;
        if(query.wire!==2)throw Error('query-wire');
        const qf=codec.fields(query.payload),kind=qf.filter(f=>f.number===1),tags=qf.filter(f=>f.number===2);
        if(kind.length!==1||kind[0].wire!==0||kind[0].value!==10)return query.raw;
        queries++;
        if(tags.length!==1||tags[0].wire!==2||tags[0].payload.length===0||tags[0].payload.length>4096)return query.raw;
        count++;return codec.dataField(2,codec.replaceField(qf,2,null));
      });
      changed+=count;return count?codec.dataField(2,codec.join(ep)):entity.raw;
    });
    inspect?.({queries,changed});
    if(!changed)return output;
    const resultHeaders={...headers};
    for(const key of Object.keys(resultHeaders))if(/^(?:content-length|transfer-encoding)$/i.test(key))delete resultHeaders[key];
    return {...output,headers:resultHeaders,body:codec.join(parts)};
  } catch{return output;}
}
