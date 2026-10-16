import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import request from './request-core.js';
const cfg=readFileSync(new URL('./publish/Loon/script/SpotifyLyrics.plugin',import.meta.url),'utf8');
const rewrite=cfg.split('[Rewrite]\n')[1].split('\n[Script]')[0].trim().split('\n');
const scripts=cfg.split('[Script]\n')[1].split('\n[Mitm]')[0].trim().split('\n');
// An independent interpreter for the documented conditional/header subset.
// This checks generated semantics; it is not Loon's native configuration parser.
function condition(source,values){
 const tokens=[];let at=0;
 while(at<source.length){
  if(/\s/.test(source[at])){at++;continue;}
  const rest=source.slice(at),variable=/^\$\{([^}]+)\}/.exec(rest),string=/^"(?:\\.|[^"\\])*"/.exec(rest),op=/^(\&\&|\|\||==|~=|\(|\))/.exec(rest),word=/^(true|false|null)\b/.exec(rest),number=/^\d+/.exec(rest);
  if(variable){tokens.push({value:values(variable[1])});at+=variable[0].length;}
  else if(string){tokens.push({value:JSON.parse(string[0])});at+=string[0].length;}
  else if(op){tokens.push({op:op[1]});at+=op[0].length;}
  else if(word){tokens.push({value:JSON.parse(word[0])});at+=word[0].length;}
  else if(number){tokens.push({value:Number(number[0])});at+=number[0].length;}
  else if(source[at]==='/'){
   let end=at+1,inClass=false;
   for(;end<source.length;end++){const c=source[end];if(c==='\\'){end++;continue;}if(c==='[')inClass=true;if(c===']')inClass=false;if(c==='/'&&!inClass)break;}
   assert.ok(end<source.length);const flags=/^[ims]*/.exec(source.slice(end+1))[0];tokens.push({value:new RegExp(source.slice(at+1,end),flags)});at=end+1+flags.length;
  }else throw Error('Unexpected condition token '+rest.slice(0,30));
 }
 let i=0;
 function atom(){if(tokens[i]?.op==='('){i++;const v=or();assert.equal(tokens[i++]?.op,')');return v;}assert.ok(tokens[i]&&Object.hasOwn(tokens[i],'value'));return tokens[i++].value;}
 function comparison(){const left=atom(),op=tokens[i++]?.op,right=atom();assert.ok(op==='=='||op==='~=');return op==='=='?left===right:typeof left==='string'&&right.test(left);}
 function factor(){return tokens[i]?.op==='('?atom():comparison();}
 function and(){let v=factor();while(tokens[i]?.op==='&&'){i++;const b=factor();v=v&&b;}return v;}
 function or(){let v=and();while(tokens[i]?.op==='||'){i++;const b=and();v=v||b;}return v;}
 const result=or();assert.equal(i,tokens.length);return result;
}
function values(url,headers,env,response){return key=>{
 if(key==='url')return url;if(key==='request.method')return 'GET';if(key==='response.status')return response?.status;
 const h=/^(request|response)\.header\['([^']+)'\]$/.exec(key);
 if(h)return(h[1]==='request'?headers:response.headers).get(h[2]);
 assert.ok(Object.hasOwn(env,key),'declared plugin variable '+key);return env[key];
};}
function apply(url,headers,env){
 let matched=0;
 for(const rule of rewrite){const [left,actions]=rule.slice('request if '.length).split(' then ');if(!condition(left,values(url,headers,env)))continue;matched++;
  for(const action of actions.split(' | ')){const m=/^request\.header\.(set|del)\(("[^"]+")(?:, ("[^"]*"))?\)$/.exec(action);assert.ok(m,'documented header action');if(m[1]==='del')headers.delete(JSON.parse(m[2]));else headers.set(JSON.parse(m[2]),JSON.parse(m[3]));}
 }
 return matched;
}
const id='76XUZSb13QUuj1HECY4Hvo',defaultEnv={TRANSLATION_ENABLED:true,TARGET_LANGUAGE:'zh-CN',FALLBACK_PROVIDER:'auto',DISCOVER_MISSING:true};
const paths=['color-lyrics/v2/track/'+id,'color-lyrics/v2/track/'+id+'/image/abcd','metadata/4/track/'+'0'.repeat(32),'extended-metadata/v0/extended-metadata','scrollsita/v1/scroll/spotify:track:'+id,'user-customization-service/v1/customize','bootstrap/v1/bootstrap','v1/customize','context-resolve/v1/spotify%3Aplaylist%3Atest','connect-state/v1/devices/abcdefghijklmnop'];
test('Loon uses native header rewrites and exactly two disjoint response scripts',()=>{
 assert.equal(rewrite.length,3);assert.equal(scripts.length,2);assert.ok(rewrite.every(x=>x.startsWith('request if ')));assert.ok(scripts.every(x=>x.startsWith('response if ')));assert.doesNotMatch(cfg,/SpotifyLyrics\.Request\.js|request if[^\n]+then script\(/);
 for(const line of scripts){for(const option of line.split(' with ')[1].split(','))assert.ok(['tag','timeout','requires_body','binary_body_mode'].includes(option.trim().split('=')[0]));assert.match(line,/requires_body=true, binary_body_mode=true/);assert.match(line,/x-verselyrics-internal/);}
 assert.match(scripts[0],/timeout=12/);assert.match(scripts[1],/timeout=3/);
 for(const p of paths)for(const host of ['spclient.wg.spotify.com','gew1-spclient.spotify.com','gae2-spclient.spotify.com:443']){
  const url='https://'+host+'/'+p,headers=new Headers(),response={status:200,headers:new Headers({'Content-Length':'20'})};
  const matches=scripts.map(l=>condition(l.slice('response if '.length).split(' then ')[0],values(url,headers,defaultEnv,response)));
  assert.equal(matches.filter(Boolean).length,1);assert.equal(matches[0],p.startsWith('color-lyrics/'));
 }
 for(const name of ['SpotifyLyrics.js','SpotifyLyrics.Entry.js']){const code=readFileSync(new URL('./runtime/Loon/script/'+name,import.meta.url),'utf8');new vm.Script(code);assert.ok(Buffer.byteLength(code)<(name.includes('Entry')?53000:126000));}
});
test('Loon native header rules preserve request-hook behavior across paths, options, MIME types and format queries',async()=>{
 for(const path of paths)for(const suffix of ['', '?format=json','?format=protobuf','?market=US&format=JSON','?format=protobuf&format=json','?format=json&format=protobuf'])for(const accept of [null,'*/*','application/json','application/x-protobuf','application/vnd.google.protobuf','application/octet-stream','text/plain'])for(const settings of [{},{TRANSLATION_ENABLED:false},{FALLBACK_PROVIDER:'off'},{FALLBACK_PROVIDER:'off',TRANSLATION_ENABLED:false},{DISCOVER_MISSING:false},{TARGET_LANGUAGE:'invalid'}]){
  const env={...defaultEnv,...settings},url='https://spclient.wg.spotify.com/'+path+suffix;
  const original=new Headers({'If-None-Match':'tag','If-Modified-Since':'yesterday','Cache-Control':'cached','Accept-Encoding':'br','X-Keep':'untouched',...(accept?{Accept:accept}:{})});
  const native=new Headers(original),ctx={env,request:{url,headers:new Headers(original)}};
  const output=await request(ctx);apply(url,native,env);
  assert.deepEqual([...native],[...(output?.headers||ctx.request.headers)],url+' '+accept+' '+JSON.stringify(settings));
 }
});
test('Loon internal metadata fetches, unrelated hosts and known oversized bodies never select a response script',()=>{
 const safe='https://spclient.wg.spotify.com/metadata/4/track/'+'0'.repeat(32);
 for(const url of [safe,'https://accounts.spotify.com/authorize','https://spclient.wg.spotify.com.evil.test/metadata/4/track/'+'0'.repeat(32)]){
  const headers=new Headers({'x-verselyrics-internal':'1','Accept-Encoding':'gzip'});assert.equal(apply(url,headers,defaultEnv),0);assert.equal(headers.get('Accept-Encoding'),'gzip');
  for(const line of scripts)assert.equal(condition(line.slice('response if '.length).split(' then ')[0],values(url,headers,defaultEnv,{status:200,headers:new Headers()})),false);
 }
 for(const [path,length] of [[paths[0],262145],[paths[2],131073]])for(const line of scripts)assert.equal(condition(line.slice('response if '.length).split(' then ')[0],values('https://spclient.wg.spotify.com/'+path,new Headers(),defaultEnv,{status:200,headers:new Headers({'content-length':String(length)})})),false);
});
