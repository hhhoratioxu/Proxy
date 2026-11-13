// Inspect known TRACK_V4 envelopes only. Export booleans/counts, never text.
export function metadataShape(input) {
  if(!input||!ArrayBuffer.isView(input)||input.byteLength>131072)return [];
  const bytes=new Uint8Array(input.buffer,input.byteOffset,input.byteLength),out=[];
  function fields(b){let at=0;const fs=[];function uint(){let v=0,m=1;for(let i=0;i<10;i++){if(at>=b.length)throw 0;const c=b[at++];v+=(c&127)*m;if(!(c&128))return v;m*=128;}throw 0;}
    while(at<b.length){const tag=uint(),n=Math.floor(tag/8),w=tag%8;if(!n)throw 0;let a,z,value;if(w===2){const len=uint();a=at;at+=len;z=at;}else if(w===0)value=uint();else if(w===1)at+=8;else if(w===5)at+=4;else throw 0;if(at>b.length||fs.length>10000)throw 0;fs.push({n,w,a,z,value});}return fs;}
  const children=(b,n)=>fields(b).filter(f=>f.n===n&&f.w===2).map(f=>b.subarray(f.a,f.z));
  const number=(b,n)=>fields(b).find(f=>f.n===n&&f.w===0)?.value;
  const str=(b,n)=>{const f=fields(b).find(f=>f.n===n&&f.w===2);return f&&f.z-f.a<=160?String.fromCharCode.apply(null,b.subarray(f.a,f.z)):'';};
  let ordinal=0;try {
    for(const group of children(bytes,2))for(const entity of children(group,3)){
      if(out.length>=24)return out;
      const any=children(entity,3)[0];if(!any)continue;
      const type=str(any,1),payload=children(any,2)[0];if(!payload)continue;
      const prefix='metadata.'+(ordinal++)+'.',uri=str(entity,2),known=/(?:^|\/)spotify\.metadata\.Track$/.test(type);
      const publicType=type.replace(/^type\.googleapis\.com\//,'');
      out.push({path:prefix+'kind',value:number(group,2)??-1},{path:prefix+'knownType',value:known},{path:prefix+'type',value:/^spotify\.[A-Za-z0-9_.]{1,120}$/.test(publicType)?publicType:'other'});
      if(!known)continue;
      const fs=fields(payload),gid=fs.find(f=>f.n===1&&f.w===2),title=fs.find(f=>f.n===2&&f.w===2),album=children(payload,3)[0],artists=children(payload,4);
      const duration=number(payload,7),flag=number(payload,18);
      out.push({path:prefix+'gid16',value:Boolean(gid&&gid.z-gid.a===16&&/^spotify:track:[0-9A-Za-z]{22}$/.test(uri))},
        {path:prefix+'title',value:Boolean(title&&title.z>title.a)},
        {path:prefix+'albumName',value:Boolean(album&&children(album,2).some(b=>b.length))},
        {path:prefix+'artistNames',value:artists.length>0&&artists.every(a=>children(a,2).some(b=>b.length))},
        {path:prefix+'durationRaw',value:Number.isSafeInteger(duration)&&duration<172800000?duration:-1},
        {path:prefix+'hasLyrics',value:flag===undefined?'omitted':flag===1?'true':flag===0?'false':'invalid'});
    }
  }catch{return out;}
  return out;
}
