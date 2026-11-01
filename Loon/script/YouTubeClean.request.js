/*! Horatio YouTube Clean 1.2.12
Horatio YouTube Clean 1.2.12
Copyright (c) 2026 Horatio Xu. MIT License.

The protobuf wire editor, advertisement policies, subtitle parser and alignment,
bottom-navigation controls, request handling and client adapters are written for
this implementation. No prebuilt YouTube proxy plugin or generated plugin bundle
is included or loaded.

Protocol field graph: generated from davidzeng0/innertube protocol declarations,
Copyright (c) 2024 David Zeng, MIT. https://github.com/davidzeng0/innertube
Observed iOS pivot-bar wire paths were verified against an anonymous public
YouTube guide response on 2026-10-16. Observed field facts are recorded in README.
The native newElement/type/component/template URI path was observed in public
iOS browse responses on 2026-10-17. Advertising template-name rules are this
implementation's heuristics, not a claim that every served advertisement is known.
The native advertising badge field number is from the same MIT protocol declarations.

UMP framing and AES-CTR/HMAC format are documented by LuanRT/GoogleVideo.
https://github.com/LuanRT/GoogleVideo/tree/main/examples/onesie-request
The framing reader/writer and metadata editor in this project are independently
implemented; no GoogleVideo runtime is bundled.

General-purpose libraries used for cryptography and compression:
@noble/ciphers 1.3.0 and @noble/hashes 1.8.0, MIT, Copyright Paul Miller.
fflate 0.8.2, MIT, Copyright Arjun Barrett.

esbuild and protobufjs are build-time tools. They are not runtime dependencies.

The advertising classification of eleven complete video, image, carousel and brand display-template identifiers was cross-checked against PoomSmart/YouTube-X, commit 48b901532f9e12152684f3326d4250efcdea61e5 (MIT). No upstream tweak code is included. See licenses/youtube-x-MIT.txt.

1.2.6 preserves native caption tracks, fetches a single companion transcript, and uses bounded rate-limit backoff. This implementation cannot override YouTube server-side caption availability or rate limits. No transcript, signed URL or account credential is persisted by the caption backoff mechanism.

1.2.6 adds one bounded Google Translate webpage-service fallback request, with no SDK, API key or paid-account creation. Only subtitle text and language codes are sent; no signed YouTube URL or account credential is forwarded. The public endpoint can change or rate-limit requests. The batch planner, positional validation and native adapters are independently written.

1.2.7 requests an identity-encoded fallback response, recognizes bounded gzip and explicit JSON protection prefixes, preserves empty translation slots without shifting neighboring captions, and reports only structural failure diagnostics. The user's 1.2.6 HTTP-200 invalid-batch response body was not captured; compatibility tests do not establish the device-side failure cause or acceptance.

1.2.8 reduces allocations with exactly sized UTF-8 encoding, a lazy 4096-unit synchronous UTF-16 scratch buffer, allocation-free opaque-text classification, explicit JSON mutation tracking, forward XML subtitle rendering and incremental HMAC updates. All parsing, advertisement policies, caption fallback, privacy and size/time boundaries remain. Performance evidence is a desktop Node/V8 interface simulation, not native Loon/iPhone memory or VPN acceptance.

1.2.9 adds independently written translation text layout: two bounded forward scans, punctuation-aware balanced wrapping and a native CAPTION_LAYOUT toggle. It does not change player fonts, backgrounds, screen position, subtitle timing, request counts or caches. Native target-only JSON3 append groups retain their original layout. Previously recorded memory measurements apply specifically to 1.2.8, not to this layout release.

1.2.12 adds independent, bounded parsing inside the homepage field 474376530 observed in a real Loon diagnostic on 2026-10-28. Its undocumented inner schema is not assigned a guessed type: only verified native Element template paths and protocol-declared ad renderers are filtered, preserving neighboring entries. All new envelopes share a limit of 8192 parsed nodes and 24 MiB of cumulative input visits, at depth 24. These are work limits, not native host memory guarantees. The user response body was not provided; synthetic matching-envelope and public-envelope checks do not establish device-side ad removal.

LICENSE
MIT License

Copyright (c) 2026 Horatio Xu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


licenses/protocol-MIT.txt
MIT License

Copyright (c) 2024 David Zeng

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

licenses/youtube-x-MIT.txt
MIT License

Copyright (c) 2022 - 2026 PoomSmart

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


licenses/noble-ciphers-MIT.txt
The MIT License (MIT)

Copyright (c) 2022 Paul Miller (https://paulmillr.com)
Copyright (c) 2016 Thomas Pornin <pornin@bolet.org>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

licenses/noble-hashes-MIT.txt
The MIT License (MIT)

Copyright (c) 2022 Paul Miller (https://paulmillr.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

licenses/fflate-MIT.txt
MIT License

Copyright (c) 2023 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
(()=>{var u="1.2.12";function w(e){if(typeof e=="string")return q(e);if(e instanceof Uint8Array)return e;if(ArrayBuffer.isView(e))return new Uint8Array(e.buffer,e.byteOffset,e.byteLength);if(e instanceof ArrayBuffer)return new Uint8Array(e);throw Error("body representation")}function B(e){let t=String(e),n=0;for(let s=0;s<t.length;s++){let o=t.charCodeAt(s);o<128?n++:o<2048?n+=2:o>=55296&&o<=56319&&t.charCodeAt(s+1)>=56320&&t.charCodeAt(s+1)<=57343?(n+=4,s++):n+=3}return n}function q(e){let t=String(e),n=new Uint8Array(B(t)),s=0;for(let o=0;o<t.length;o++){let r=t.charCodeAt(o);r>=55296&&r<=56319&&t.charCodeAt(o+1)>=56320&&t.charCodeAt(o+1)<=57343?r=65536+(r-55296<<10)+(t.charCodeAt(++o)-56320):r>=55296&&r<=57343&&(r=65533),r<128?n[s++]=r:r<2048?(n[s++]=192|r>>6,n[s++]=128|r&63):r<65536?(n[s++]=224|r>>12,n[s++]=128|r>>6&63,n[s++]=128|r&63):(n[s++]=240|r>>18,n[s++]=128|r>>12&63,n[s++]=128|r>>6&63,n[s++]=128|r&63)}return n}function _(e,t){if(e&&typeof e.get=="function")return String(e.get(t)||"");for(let n of Object.keys(e||{}))if(n.toLowerCase()===t.toLowerCase())return String(e[n]);return""}function S(e,t={}){let n=new Set(["content-length","content-encoding","etag","last-modified","content-md5","digest","cache-control"]);if(typeof e?.delete=="function"){for(let r of n)e.delete(r);for(let[r,i]of Object.entries(t))i==null?e.delete(r):e.set(r,i);return e.set("Cache-Control","no-store"),e.set("X-YouTubeClean",u),e}let s=new Set(Object.keys(t).map(r=>r.toLowerCase())),o={};for(let[r,i]of Object.entries(e||{}))!n.has(r.toLowerCase())&&!s.has(r.toLowerCase())&&(o[r]=i);for(let[r,i]of Object.entries(t))i!=null&&(o[r]=i);return o["Cache-Control"]="no-store",o["X-YouTubeClean"]=u,o}function E(e){try{return decodeURIComponent(e.replace(/\+/g," "))}catch{return e}}var h=class{constructor(t={}){if(typeof t=="string")if(t.trim().startsWith("{"))t=JSON.parse(t);else{let o={};for(let r of t.split("&")){let i=r.indexOf("=");i>0&&(o[E(r.slice(0,i))]=E(r.slice(i+1)))}t=o}if(t==null&&(t={}),typeof t!="object"||Array.isArray(t))throw Error("settings representation");let n=(o,r)=>t[o]==null?r:t[o]===!0||t[o]===1||/^(?:true|1)$/i.test(String(t[o]));this.ads=n("REMOVE_ADS",!0),this.translate=n("TRANSLATE_CAPTIONS",!0),this.dual=n("BILINGUAL",!0),this.auto=n("AUTO_CAPTIONS",!0),this.fallback=n("FALLBACK_TRANSLATION",!0),this.layout=n("CAPTION_LAYOUT",!0),this.hideCreate=n("HIDE_UPLOAD",!0),this.hideShorts=n("HIDE_SHORTS",!1),this.deep=n("DEEP_FILTER",!0),this.debug=n("DIAGNOSTICS",!0),this.profile=["elements","deep","tcp"].includes(t.PROFILE)?t.PROFILE:this.deep?"deep":"elements";let s=String(t.TARGET_LANGUAGE||"zh-Hans");this.target={"zh-CN":"zh-Hans","zh-TW":"zh-Hant"}[s]||s,/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(this.target)||(this.target="zh-Hans")}get active(){return this.ads||this.translate||this.hideCreate||this.hideShorts}},v="(?:youtubei(?:-att)?\\.googleapis\\.com|(?:www|m)\\.youtube\\.com)",$="^https://"+v+"(?::443)?/youtubei/v1/(?:player(?:/ad_break)?|browse|next|search|guide|navigation/resolve_url|reel/(?:reel_watch_sequence|reel_item_watch)|get_watch|config|log_event)(?:\\?.*)?$",F="^https://(?:www|m)\\.youtube\\.com(?::443)?/api/timedtext(?:\\?.*)?$",z="^https://[a-zA-Z0-9-]+\\.googlevideo\\.com(?::443)?/initplayback(?:\\?.*)?$";function g(e){return new RegExp($).test(e)?{kind:"api",name:e.split("?")[0].replace(/^.*\/youtubei\/v1\//,"")}:new RegExp(F).test(e)?{kind:"caption"}:new RegExp(z).test(e)?{kind:"ump"}:null}var p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";function b(e){let t="";for(let n=0;n<e.length;n+=3){let s=e[n]<<16|(e[n+1]||0)<<8|(e[n+2]||0);t+=p[s>>>18&63]+p[s>>>12&63]+(n+1<e.length?p[s>>>6&63]:"=")+(n+2<e.length?p[s&63]:"=")}return t}function y(e){if(typeof e!="string"||e.length%4||!/^[\w+/]*={0,2}$/.test(e))throw Error("base64");let t=[],n=0,s=0;for(let o of e.replace(/=+$/,"")){let r=p.indexOf(o);if(r<0)throw Error("base64");n=n<<6|r,s+=6,s>=8&&(s-=8,t.push(n>>>s&255))}return new Uint8Array(t)}var x="Horatio.YouTubeClean.session.v1",J="X-YouTubeClean-Internal";function T(e){return/music/i.test(_(e.requestHeaders,"User-Agent"))?"music":"video"}function A(e){try{let t=e.store.read(x);return t&&typeof t=="object"&&!Array.isArray(t)?t:{}}catch{return{}}}function k(e){let t=A(e)[T(e)];if(!t)return{state:"missing",key:null};if(!Number.isFinite(t.until)||t.until<Date.now())return{state:"expired",key:null};try{let n=y(t.key);if(n.length===32)return{state:"available",key:n}}catch{}return{state:"invalid",key:null}}function K(e){return k(e).key}function j(e,t){try{let n=t.key,s=t.encrypted;if(typeof t.clientKey=="string"&&(n=y(t.clientKey)),typeof t.encryptedClientKey=="string"&&(s=y(t.encryptedClientKey)),typeof t.encryptKey=="string"&&(s=y(t.encryptKey)),n?.length!==32||!s?.length||s.length>8192)return;let o=A(e),r=Number(t.ttl||t.keyExpiresInSeconds)||3600;return o[T(e)]={key:b(n),encrypted:b(s),until:Date.now()+Math.max(30,Math.min(r,86400))*1e3},e.store.write(x,o)!==!1}catch{}return!1}function M(e){try{let t=A(e);delete t[T(e)],e.store.write(x,t)}catch{}}function X(e,t,n){let s=[];["log_event","browse","guide"].includes(n)&&(t.ads||t.translate)&&!K(e)&&s.push("x-youtube-hot-hash-data");let o=n==="browse"&&t.ads||n==="guide"&&(t.hideCreate||t.hideShorts);if(o&&s.push("if-none-match","if-modified-since"),!s.length)return null;let r=e.requestHeaders;if(typeof r?.delete=="function"){for(let d of s)r.delete(d);return o&&r.set("Cache-Control","no-cache"),{headers:r}}let i={};for(let[d,m]of Object.entries(r||{}))s.includes(d.toLowerCase())||(i[d]=m);return o&&(i["Cache-Control"]="no-cache"),{headers:i}}function N(e,t){let n=g(e.url);if(!n||_(e.requestHeaders,J)||e.phase!=="request")return null;let s=t.debug?{removed:0,templates:new Set,matchedAdTemplates:new Set,unknown:new Set,feedCards:0}:null,o=Number(e.status),r=k(e),i={version:u,profile:t.profile,endpoint:n.name||(n.kind==="ump"?"initplayback":"timedtext"),phase:e.phase==="request"?"request":"response",adRemoval:t.ads,deepFilter:t.deep,format:n.kind==="ump"?"ump":"unknown",bytes:0,outputBytes:0,compression:"none",keyState:r.state,keySaved:!1,changed:!1,bypass:!1,reason:"unchanged"};Number.isInteger(o)&&o>=100&&o<=599&&(i.status=o);let d=a=>{j(e,a)&&(i.keySaved=!0)},m=!1;function H(a){i.bypass=!0;let c=a?.message;return c==="UMP authentication"||c==="UMP crypto dimensions"?(M(e),i.keyState="missing",i.reason="stream-auth-failed"):c==="body too large"?i.reason="body-too-large":c==="body representation"?i.reason="body-representation":c==="UMP compression"||c==="UMP gzip marker"?i.reason="stream-compression-unsupported":i.reason!=="caption-download-failed"&&(i.reason="decode-failed"),null}function U(){if(s&&typeof e.report=="function")try{e.report({...i,removedParts:i.changed?s.removed:0,feedCards:s.feedCards,templates:[...s.templates],matchedAdTemplates:[...s.matchedAdTemplates],unknownRendererTags:[...s.unknown],...s.feedEnvelopeFields?{feedEnvelopeFields:[...s.feedEnvelopeFields],feedEnvelopeNodes:s.feedEnvelopeNodes,feedEnvelopeElements:s.feedEnvelopeElements,feedEnvelopeBypasses:s.feedEnvelopeBypasses,feedEnvelopeShapes:s.feedEnvelopeShapes||[]}:{},...s.rootFields?{rootFields:s.rootFields}:{},...s.umpFrames!==void 0?{umpFrames:s.umpFrames,umpTypes:s.umpTypes,umpHeaderTypes:s.umpHeaderTypes,metadataParts:s.metadataParts,changedMetadataParts:i.changed?s.changedMetadataParts:0}:{}})}catch{}}try{if(!t.active)return i.reason="disabled",null;if(e.phase==="request"){let a=n.kind==="api"?X(e,t,n.name):null;return i.changed=!!a,i.reason=a?"request-updated":"request-unchanged",a}return _(e.responseHeaders,"X-YouTubeClean")&&(i.reason="already-processed"),null}catch(a){return H(a)}finally{m||U()}}var l=!1;var C=typeof $request>"u"?{}:$request,f=typeof $response>"u"?null:$response,L=!0;function R(e){try{typeof console<"u"&&typeof console.log=="function"&&console.log("[YouTubeClean] "+JSON.stringify(e))}catch{}}function D(e){let t=l?$prefs.valueForKey(e):$persistentStore.read(e);if(!t)return null;try{return JSON.parse(t)}catch{return null}}function G(e,t){let n=JSON.stringify(t);return l?$prefs.setValueForKey(n,e):$persistentStore.write(n,e)}function V(){let e=l?typeof $environment>"u"?{}:$environment.variables||{}:typeof $argument>"u"?{}:$argument,t=new h(e);L=t.debug;let n=N({url:C.url||"",phase:f?"response":"request",status:f?.statusCode??f?.status,requestHeaders:C.headers||{},responseHeaders:f?.headers||{},body:f?.bodyBytes??f?.body,store:{read:D,write:G},download:void 0,translate:void 0,report:R,captionRecovery:!l},t);return n&&typeof n.then=="function"?n.then(P):P(n)}function P(e){if(!e)return{};if(e.body){let t=w(e.body),n=S(f.headers,e.headers),s=e.status==null?{}:{status:l?"HTTP/1.1 "+e.status+" OK":e.status};return l?{bodyBytes:t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength),headers:n,...s}:{body:t,headers:n,...s}}return e}var I=!1;function O(e){I||(I=!0,$done(e))}function Y(){let e=g(C.url||"");L&&e&&R({version:u,endpoint:e.name||(e.kind==="ump"?"initplayback":"timedtext"),phase:f?"response":"request",changed:!1,bypass:!0,reason:"adapter-error"}),O({})}try{let e=V();e&&typeof e.then=="function"?e.then(O,Y):O(e)}catch{Y()}})();
