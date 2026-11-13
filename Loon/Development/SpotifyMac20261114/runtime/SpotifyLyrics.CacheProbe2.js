(function(hostDone){
const LIMIT=65536;let TEXT_UNITS;
function utf8Size(text, maxBytes = LIMIT) {
  let size = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = text.charCodeAt(++i); if (!(d >= 0xdc00 && d <= 0xdfff)) throw new URIError("invalid-utf16"); size += 4;
    } else if (c >= 0xdc00 && c <= 0xdfff) throw new URIError("invalid-utf16");
    else size += c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
    if (size > maxBytes) { const error = new Error("body-limit"); error.bodyBytes = size; throw error; }
  }
  return size;
}
function putUTF8(out, at, text) {
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) c = 0x10000 + ((c - 0xd800) << 10) + text.charCodeAt(++i) - 0xdc00;
    if (c < 0x80) out[at++] = c;
    else if (c < 0x800) { out[at++] = 0xc0 | c >> 6; out[at++] = 0x80 | c & 63; }
    else if (c < 0x10000) { out[at++] = 0xe0 | c >> 12; out[at++] = 0x80 | c >> 6 & 63; out[at++] = 0x80 | c & 63; }
    else { out[at++] = 0xf0 | c >> 18; out[at++] = 0x80 | c >> 12 & 63; out[at++] = 0x80 | c >> 6 & 63; out[at++] = 0x80 | c & 63; }
  }
  return at;
}
function utf8(text, maxBytes = LIMIT) {
  const out = new Uint8Array(utf8Size(text,maxBytes));
  putUTF8(out,0,text); return out;
}
function text(bytes) {
  // No TextDecoder dependency in mobile engines. ASCII needs no intermediate
  // number array; all fromCharCode calls stay below the old argument ceiling.
  let ascii = true;
  for (let i = 0; i < bytes.length; i++) if (bytes[i] >= 128) { ascii = false; break; }
  if (ascii && bytes.length <= 4096) return String.fromCharCode.apply(null,bytes);
  if (ascii) {
    const chunks = [];
    for (let i = 0; i < bytes.length; i += 4096) chunks.push(String.fromCharCode.apply(null,bytes.subarray(i,i+4096)));
    return chunks.join("");
  }
  // Non-ASCII scratch is at most 8,194 bytes, not a growable array of JS
  // numbers. The extra unit keeps surrogate pairs together at a boundary.
  // Synchronous decoding returns copied strings, never this scratch view.
  // Reuse at most 8,194 bytes across the many short words in one execution.
  const capacity = Math.min(bytes.length,4097);
  if (!TEXT_UNITS || TEXT_UNITS.length < capacity) TEXT_UNITS = new Uint16Array(capacity);
  const units = TEXT_UNITS; let used = 0, chunks;
  for (let i = 0; i < bytes.length;) {
    const first = bytes[i++]; let cp, count, minimum;
    if (first < 0x80) { cp = first; count = 0; minimum = 0; }
    else if (first >= 0xc2 && first <= 0xdf) { cp = first & 31; count = 1; minimum = 0x80; }
    else if (first >= 0xe0 && first <= 0xef) { cp = first & 15; count = 2; minimum = 0x800; }
    else if (first >= 0xf0 && first <= 0xf4) { cp = first & 7; count = 3; minimum = 0x10000; }
    else throw new URIError("invalid-utf8");
    for (let j = 0; j < count; j++) { const b = bytes[i++]; if (!(b >= 0x80 && b <= 0xbf)) throw new URIError("invalid-utf8"); cp = cp * 64 + (b & 63); }
    if (cp < minimum || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) throw new URIError("invalid-utf8");
    if (cp < 0x10000) units[used++] = cp; else { cp -= 0x10000; units[used++] = 0xd800 | cp >> 10; units[used++] = 0xdc00 | cp & 1023; }
    if (used >= 4096) { (chunks || (chunks = [])).push(String.fromCharCode.apply(null, units.subarray(0,used))); used = 0; }
  }
  if (!chunks) return used ? String.fromCharCode.apply(null, units.subarray(0,used)) : "";
  if (used) chunks.push(String.fromCharCode.apply(null, units.subarray(0,used)));
  return chunks.join("");
}
function join(parts) {
  const size = parts.reduce((n, p) => n + p.length, 0);
  if (size > LIMIT) throw new Error("body-limit");
  const out = new Uint8Array(size); let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
function uint(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("integer");
  const a = [];
  do { const b = n % 128; n = Math.floor(n / 128); a.push(b + (n ? 128 : 0)); } while (n);
  return Uint8Array.from(a);
}
function vint(bytes, at) {
  let n = 0, factor = 1, safe = true;
  for (let i = 0; i < 10; i++) {
    if (at >= bytes.length) throw new Error("truncated-varint");
    const b = bytes[at++];
    if (i === 9 && b > 1) throw new Error("overflow-varint");
    n += (b & 127) * factor;
    safe = safe && Number.isSafeInteger(n);
    if (!(b & 128)) return { at, n: safe ? n : null };
    factor *= 128;
  }
  throw new Error("long-varint");
}
function scanFields(bytes, visit) {
  let at = 0, count = 0;
  while (at < bytes.length) {
    if (count++ >= 4096) throw new Error("field-limit");
    const start = at; let tag = bytes[at++];
    if (!(tag < 128)) { const parsed = vint(bytes,start); tag = parsed.n; at = parsed.at; }
    if (!tag || tag > 0xffffffff) throw new Error("bad-tag");
    const number = Math.floor(tag / 8), wire = tag % 8;
    if (number < 1) throw new Error("bad-field-number");
    let payloadStart, payloadEnd, value;
    if (wire === 0) {
      if (bytes[at] < 128) value = bytes[at++];
      else { const v = vint(bytes,at); value = v.n; at = v.at; }
    }
    else if (wire === 1 || wire === 5) { at += wire === 1 ? 8 : 4; }
    else if (wire === 2) {
      let length = bytes[at++];
      if (!(length < 128)) { const parsed = vint(bytes,at - 1); length = parsed.n; at = parsed.at; }
      if (length === null || length > LIMIT) throw new Error("bad-length");
      payloadStart = at; at += length; payloadEnd = at;
    } else throw new Error("unsupported-wire");
    if (at > bytes.length) throw new Error("truncated-field");
    visit(number,wire,payloadStart,payloadEnd,value,start,at);
  }
}
function fields(bytes) {
  const out = [];
  scanFields(bytes,(number,wire,a,b,value,start,end) => {
    out.push({number,wire,payload:wire === 2 ? bytes.subarray(a,b) : undefined,value,raw:bytes.subarray(start,end)});
  });
  return out;
}
function dataField(number, payload) { return join([uint(number * 8 + 2), uint(payload.length), payload]); }
function stringField(number, value) { return dataField(number, utf8(value)); }
function numberField(number, value) { return join([uint(number * 8), signedInt(value)]); }
function last(fs, n, wire) { for (let i = fs.length - 1; i >= 0; i--) if (fs[i].number === n && fs[i].wire === wire) return fs[i]; }
function word(fs, n) { const f = last(fs, n, 2); return f ? text(f.payload) : ""; }
function replaceField(fs, number, replacement) {
  let inserted = false; const parts = [];
  for (const f of fs) {
    if (f.number === number) { if (!inserted && replacement) parts.push(replacement); inserted = true; }
    else parts.push(f.raw);
  }
  if (!inserted && replacement) parts.push(replacement);
  return join(parts);
}
function replaceField(fs, number, replacement) {
  let inserted = false; const parts = [];
  for (const f of fs) {
    if (f.number === number) { if (!inserted && replacement) parts.push(replacement); inserted = true; }
    else parts.push(f.raw);
  }
  if (!inserted && replacement) parts.push(replacement);
  return join(parts);
}
function refreshTestMetadata(request,output,codec,inspect) {
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
let finished=false;
const $done=output=>{let stats={queries:0,changed:0};const result=refreshTestMetadata($request,output,{fields,text,dataField,replaceField,join},s=>stats=s);
function done(){if(!finished){finished=true;hostDone(result);}}
try{$httpClient.post({url:"http://127.0.0.1:18765/events",headers:{"Content-Type":"application/json"},body:JSON.stringify({phase:"cache-probe",route:"metadata-cache",method:$request.method,bytes:$request.body?.length||0,outputBytes:result?.body?.length||0,flags:[{path:"queries",value:stats.queries},{path:"removed",value:stats.changed},{path:"headerHook",value:Boolean(output?.headers)},{path:"responseGlobal",value:typeof $response!=="undefined"&&Boolean($response)},{path:"body.view",value:ArrayBuffer.isView($request.body)},{path:"body.type",value:typeof $request.body},{path:"url.type",value:typeof $request.url}]}),timeout:300,node:"DIRECT","auto-cookie":false,"auto-redirect":false,"binary-mode":false,insecure:false},done);}catch{done();}
};
(()=>{"use strict";
/* VerseLyrics 3.2.2 lightweight request hook. Generated from the shared core. */const e="(?:spclient\\.wg|[a-z0-9-]+-spclient)\\.spotify\\.com",t=new RegExp("^https://("+e+")(?::443)?/color-lyrics/v2/track/([0-9A-Za-z]{22})(?:/image/[^?#\\s]+)?/?(?:\\?.*)?$"),r=new RegExp("^https://("+e+")(?::443)?/metadata/4/track/([0-9a-f]{32})(?:\\?.*)?$"),s=new RegExp("^https://("+e+")(?::443)?/extended-metadata/v0/extended-metadata/?(?:\\?.*)?$"),o=new RegExp("^https://("+e+")(?::443)?/scrollsita/v1/scroll/spotify(?::|%3[aA])track(?::|%3[aA])([0-9A-Za-z]{22})/?(?:\\?.*)?$"),n=["zh-CN","zh-TW","en","ja","ko","fr","de","es","pt","it","ru","ar","hi","id","vi","th","tr","nl","pl","sv","uk","he","fa","ms","el"],i={lrclib:"LRCLIB",qq:"QQ 音乐",netease:"网易云音乐",kugou:"酷狗音乐",kuwo:"酷我音乐",lyricsovh:"lyrics.ovh"},a=new RegExp("^https://("+e+")(?::443)?/(?:user-customization-service/v1/customize|bootstrap/v1/bootstrap|v1/customize)/?(?:\\?.*)?$"),c=new RegExp("^https://("+e+")(?::443)?/(?:context-resolve/v1/spotify(?::|%3[aA])[^?#\\s/]{1,512}|connect-state/v1/devices/[0-9A-Za-z_-]{16,128})/?(?:\\?.*)?$"),u=e=>"string"==typeof e?e:"",l=e=>!0===e||"true"===e;function f(e,t){if("function"==typeof e?.get)return e.get(t)||"";const r=Object.keys(e||{}).find(e=>e.toLowerCase()===t.toLowerCase());return r?u(e[r]):""}let p,h=!1;function d(e){h||(h=!0,void 0!==p&&"function"==typeof clearTimeout&&clearTimeout(p),p=void 0,$done(e||{}))}class R{constructor(e){this.source=e||{},this.array=Array.isArray(e),this.pairs=null}get(e){if(e=e.toLowerCase(),this.pairs){const t=this.pairs.find(t=>t[0].toLowerCase()===e);return t?String(t[1]):null}if(this.array){const t=this.source.find(t=>t.field.toLowerCase()===e);return t?String(t.value):null}for(const t in this.source)if(Object.hasOwn(this.source,t)&&t.toLowerCase()===e)return String(this.source[t]);return null}materialize(){return this.pairs||(this.pairs=this.array?this.source.map(e=>[e.field,e.value]):Object.entries(this.source)),this.pairs}delete(e){const t=this.materialize(),r=e.toLowerCase();let s=0;for(let e=0;e<t.length;e++)t[e][0].toLowerCase()!==r&&(t[s++]=t[e]);t.length=s}set(e,t){this.delete(e),this.pairs.push([e,String(t)])}native(){return this.pairs?this.array?this.pairs.map(([e,t])=>({field:e,value:t})):Object.fromEntries(this.pairs):this.source}}try{if("undefined"==typeof $request||!$request?.url||!["GET","POST","PUT"].includes(String($request.method||"").toUpperCase())||"undefined"!=typeof $response&&$response)d({});else{const e=function(e){if(!e.request||e.response||f(e.request.headers,"x-verselyrics-internal"))return;const p=u(e.request.url),h=t.test(p);if(!h&&![r,s,o,a,c].some(e=>e.test(p)))return;let d;try{d=function(e={}){const t=u(e.FALLBACK_PROVIDER)||"auto",r=u(e.TARGET_LANGUAGE)||"zh-CN";if(!n.includes(r)||!["auto","off",...Object.keys(i)].includes(t))throw new Error("settings-invalid");const s=Object.hasOwn(i,u(e.PREFERRED_SOURCE))?u(e.PREFERRED_SOURCE):"auto";return{fetchArtwork:null==e.FETCH_ARTWORK_COLOR||""===e.FETCH_ARTWORK_COLOR||l(e.FETCH_ARTWORK_COLOR),preferred:s,translate:null==e.TRANSLATION_ENABLED||""===e.TRANSLATION_ENABLED||l(e.TRANSLATION_ENABLED),language:r,provider:t,discover:null==e.DISCOVER_MISSING||""===e.DISCOVER_MISSING||l(e.DISCOVER_MISSING),sourceTranslations:null==e.SOURCE_TRANSLATIONS||""===e.SOURCE_TRANSLATIONS||l(e.SOURCE_TRANSLATIONS)}}(e.env)}catch{return}if(h?!d.translate&&"off"===d.provider:!d.discover||"off"===d.provider)return;const R=e.request.headers;for(const e of["If-None-Match","If-Modified-Since","Accept-Encoding","Cache-Control"])R.delete(e);return R.set("Accept-Encoding","identity"),R.set("Cache-Control","no-cache"),h&&"protobuf"===function(e){const t=u(e.request.url),r=f(e.request.headers,"Accept"),s=/(?:^|[?&])format=(json|protobuf)(?:&|$)/i.exec(t)?.[1].toLowerCase();return s||(/protobuf|octet-stream/i.test(r)?"protobuf":/(?:^|[,;\s])application\/(?:[a-z0-9.+-]+\+)?json(?:[,;\s]|$)/i.test(r)?"json":"protobuf")}(e)&&!/protobuf|octet-stream|json/i.test(f(R,"Accept"))&&R.set("Accept","application/x-protobuf"),{headers:R}}
// Original VerseLyrics native host bridge, adapter 18 (core 3.2.2).
({request:{url:$request.url,headers:new R($request.headers)},env:function(){const e=["TRANSLATION_ENABLED","TARGET_LANGUAGE","FALLBACK_PROVIDER","DISCOVER_MISSING"],t=Object.create(null);return"undefined"!=typeof $argument&&function(r){if("string"==typeof r)for(const s of r.split("&")){const r=s.indexOf("=");if(r<1)continue;const o=decodeURIComponent(s.slice(0,r));e.includes(o)&&(t[o]=decodeURIComponent(s.slice(r+1)))}else if(r&&"object"==typeof r)for(const s of e)null!=r[s]&&(t[s]=String(r[s]))}($argument),t}()});d(e?.headers?{headers:e.headers.native()}:{})}}catch{d({})}})();

})($done);
