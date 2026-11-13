// Diagnostic only: report numeric protobuf paths of literal availability maps.
// No body, string contents, account identifiers, or credentials leave the VM.
export function availabilityMapPaths(body,describe=false) {
  if(!body || !ArrayBuffer.isView(body) || body.byteLength>131072)return [];
  const bytes=new Uint8Array(body.buffer,body.byteOffset,body.byteLength),found=[];
  let work=0,nodes=0;
  function equal(b,a,z,s){if(z-a!==s.length)return false;for(let i=0;i<s.length;i++)if(b[a+i]!==s.charCodeAt(i))return false;return true;}
  function walk(b,path,depth){
    if(depth>12 || ++nodes>2000 || found.length>=16 || (work+=b.length)>1048576)return;
    let at=0;const fields=[];
    function uint(){let n=0,m=1;for(let i=0;i<5;i++){if(at>=b.length)throw 0;const v=b[at++];n+=(v&127)*m;if(!(v&128))return n;m*=128;}throw 0;}
    try {while(at<b.length){const tag=uint(),n=Math.floor(tag/8),w=tag%8;if(n===0)throw 0;
      if(w===2){const length=uint(),a=at;at+=length;if(at>b.length)throw 0;fields.push({n,w,a,z:at});}
      else if(w===0){let count=0;do{if(at>=b.length||++count>10)throw 0;}while(b[at++]&128);}
      else if(w===1)at+=8;else if(w===5)at+=4;else throw 0;if(w!==2)fields.push({n,w});if(at>b.length)throw 0;
    }}catch{if(depth===0&&describe)found.push({path:'root.valid',value:false});return;}
    if(depth===0&&describe)found.push({path:'root.fields',value:fields.slice(0,20).map(f=>f.n+':'+f.w).join(',')});
    if(describe)for(const f of fields)if(f.w===2&&f.z-f.a===36&&equal(b,f.a,f.a+14,'spotify:track:')){let valid=true;for(let i=f.a+14;i<f.z;i++)if(!((b[i]>=48&&b[i]<=57)||(b[i]>=65&&b[i]<=90)||(b[i]>=97&&b[i]<=122)))valid=false;if(valid)found.push({path:'track-uri.'+path.concat(f.n).join('.'),value:true});}
    const key=fields.find(f=>f.n===1&&equal(b,f.a,f.z,'has_lyrics'));
    if(key){const value=fields.find(f=>f.n===2);if(value){const yes=equal(b,value.a,value.z,'true'),no=equal(b,value.a,value.z,'false');if(yes||no)found.push({path:path.join('.'),value:yes});}return;}
    for(const f of fields)if(f.w===2)walk(b.subarray(f.a,f.z),path.concat(f.n),depth+1);
  }
  walk(bytes,[],0);return found;
}
