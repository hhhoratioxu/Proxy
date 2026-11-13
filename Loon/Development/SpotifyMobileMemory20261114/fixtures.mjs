import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Fixtures contain only self-written lyrics and metadata. No account or network access.
export async function makeFixtures(root) {
  const {fixture,words,answers}=await import(new URL('./lyric-startup-fixture.mjs',root));
  const {encodeDocument,parseDocument,fields}=await import(new URL('./core/spotify-lyrics.js',root));
  const {startupFixture}=await import(new URL('./startup-fixtures.mjs',root));
  const cases=[];
  for(const mode of ['english-cached','english-cold','missing-cached','missing-cold'])for(const filled of [false,true]) {
    const f=fixture(mode,'protobuf',filled);
    if(filled){
      const key='VerseLyrics.v1.cache',cache=JSON.parse(f.store.get(key));
      const serialize=()=>{const entries=cache.entries.map(e=>JSON.stringify(e));return '{"sizes":'+JSON.stringify(entries.map(s=>s.length))+',"entries":['+entries.join(',')+'],"cooldowns":{}}';};
      for(let n=100;n<200;n++){
        const entry={key:'lyrics:auto:'+String(n).padStart(22,'0'),value:{v:1,p:'lrclib',t:true,l:words.map((w,i)=>[i*2100,w+' other '+n])},expires:Date.now()+600000};
        cache.entries.unshift(entry);if(serialize().length>63900){cache.entries.shift();break;}
      }
      f.store.set(key,serialize());
      assert.ok(f.store.get(key).length>=60000&&f.store.get(key).length<=64000);
    }
    cases.push({...f,name:mode+(filled?'-filled':'-empty')});
  }
  const doc={lyrics:{syncType:'LINE_SYNCED',language:'zh',provider:'TEST',providerDisplayName:'TEST',lines:Array.from({length:600},(_,i)=>({words:'自写内存测试第'+i+'句 繁體 한국어 日本語',startTimeMs:String(i*1000)})),alternatives:[]},colors:{background:-10985626,text:-16777216,highlightText:-1}};
  cases.push({...fixture('chinese-mixed'),name:'600-multilingual-protobuf',body:encodeDocument(doc,'protobuf'),rows:doc.lyrics.lines.map(l=>l.words)});
  const english={...doc,lyrics:{...doc.lyrics,language:'en',lines:doc.lyrics.lines.map((l,i)=>({...l,words:'Self written memory test row '+i+'. '+('I watch the paper lantern. '.repeat(5))}))}};
  cases.push({...fixture('english-cold'),name:'600-english-translation',body:encodeDocument(english,'protobuf'),rows:english.lyrics.lines.map(l=>l.words)});
  const json=JSON.stringify({...doc,opaque:'x'.repeat(180000)});
  assert.ok(Buffer.byteLength(json)<262144);
  cases.push({...fixture('chinese-mixed','json'),name:'large-json',body:Buffer.from(json),rows:doc.lyrics.lines.map(l=>l.words)});
  for(const [name,body] of [['over-body-limit',Buffer.alloc(262145)],['malformed-protobuf',Buffer.from([0xff,0xff,0xff])]])
    cases.push({...fixture('english-cold'),name,body,passThrough:true});
  cases.push({...fixture('missing-cold','protobuf',true),name:'fallback-network-fails',failure:true,passThrough:true});
  cases.push({...fixture('english-cold','protobuf',true),name:'translation-response-over-limit',oversizedService:true,passThrough:true});
  for(const kind of ['extended','connect-json','connect-protobuf']) {
    const f=startupFixture(kind,120000);
    assert.ok(f.body.length<131072);
    cases.push({...fixture('english-cold'),...f,name:'large-entry-'+kind,entry:true,status:200,rows:[]});
  }
  const core=readFileSync(new URL('./core/spotify-lyrics.js',root),'utf8');
  // Use the baseline's UTF-8 host bridge rather than assuming browser-only codecs.
  const codecs=core.slice(core.indexOf('function utf8Size('),core.indexOf('let TEXT_UNITS;'));
  const nativeRows=(bytes,type)=>/json/i.test(type)?parseDocument(bytes,type).lyrics.lines.map(l=>[l.startTimeMs,l.words]):fields(fields(bytes).find(f=>f.number===1).payload).filter(f=>f.number===2).map(f=>Buffer.from(f.raw).toString('hex'));
  return {cases,codecs,words,answers,parseDocument,nativeRows};
}

export function makeHarness(f,memoryMode,{codecs,words,answers},expected=null) {
  const rows=f.rows||words;
  const source={trackName:'Paper Lantern',artistName:'Ada North',albumName:'Quiet Walk',duration:180,syncedLyrics:words.map((w,i)=>{
    const t=i*2100+1000;return '['+String(Math.floor(t/60000)).padStart(2,'0')+':'+(t%60000/1000).toFixed(2).padStart(5,'0')+']'+w;
  }).join('\n')};
  const input={body:Buffer.from(f.body).toString('base64'),store:[...f.store],type:f.type,status:f.status,url:f.url||'https://spclient.wg.spotify.com/color-lyrics/v2/track/0000000000000000000001',mode:memoryMode,rows,words,answers,source,failure:!!f.failure,oversizedService:!!f.oversizedService,expected};
  // Base64 keeps large response fixtures from becoming giant JS numeric literals.
  return 'var input='+JSON.stringify(input)+';\n'+String.raw`
var LIMIT=524288;
`+codecs+String.raw`
function __decode(s){var alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',padding=s.endsWith('==')?2:s.endsWith('=')?1:0,out=new Uint8Array(s.length/4*3-padding),acc=0,bits=0,at=0;for(var i=0;i<s.length&&s[i]!=='=';i++){acc=(acc<<6)|alphabet.indexOf(s[i]);bits+=6;if(bits>=8){bits-=8;out[at++]=(acc>>bits)&255;}}return out;}
function __hash(b){var h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return h>>>0;}
var __done=false,__hostReturned=false,__synchronous=false,__output,completions=0,calls=0,active=0,peakActive=0,cacheWritten=false,jobs=[],store=new Map(input.store);
var $argument={FALLBACK_PROVIDER:'lrclib',TARGET_LANGUAGE:'zh-CN',MEMORY_MODE:input.mode,FETCH_ARTWORK_COLOR:false};
var $request={url:input.url,headers:{Accept:input.type}},$response={status:input.status,headers:{'Content-Type':input.type},body:__decode(input.body)};
var $persistentStore={read:k=>store.get(k),write:(v,k)=>{store.set(k,v);if(k==='VerseLyrics.v1.cache')cacheWritten=true;return true;}};
function request(o,cb){
  calls++;active++;peakActive=Math.max(peakActive,active);if(active!==1)throw Error('parallel HTTP');
  jobs.push(()=>{active--;if(input.failure){cb('mock native http timeout',{status:0,headers:{}},'');return;}
    var data;
    if(input.oversizedService)data='x'.repeat(98305);
    else if(o.url.includes('lrclib.net'))data=JSON.stringify(input.source);
    else if(o.url.includes('translate.googleapis.com')){var re=/[?&]q=([^&]*)/g,match,translated=[];while((match=re.exec(o.url))){var q=decodeURIComponent(match[1].replace(/\+/g,' ')),at=input.words.indexOf(q);translated.push(at>=0?input.answers[at]:'自写译文');}data=JSON.stringify(translated);}
    else throw Error('Unexpected synthetic HTTP target');
    cb(null,{status:200,headers:{}},o['binary-mode']===false?data:utf8(data));
  });
}
var $httpClient={get:request,post:request};
var $done=r=>{if(++completions!==1||active)throw Error('premature/duplicate done');__synchronous=!__hostReturned;__output=r;__done=true;};
function __step(){if(jobs.length)jobs.shift()();}
function __verify(){
  if(!__done||completions!==1||jobs.length||active)throw Error('unfinished work');
  var bytes=__output.body||$response.body,h=__hash(bytes),raw=store.get('VerseLyrics.v1.cache')||'',cap=input.mode==='compact'?32000:64000;
  // Pass-through work may leave a pre-existing cache untouched; mutations must obey the selected mode.
  if(raw.length>(cacheWritten?cap:Math.max(cap,(new Map(input.store).get('VerseLyrics.v1.cache')||'').length)))throw Error('cache grew beyond cap');
  if(input.expected&&(h!==input.expected.hash||calls!==input.expected.calls))throw Error('changed bytes or HTTP count across engines');
  return{hash:h,bytes:bytes.length,synchronous:__synchronous,completions,calls,peakActive,cacheCharacters:raw.length};
}
`;
}

export async function oracle(harness,runtime,f,{parseDocument,nativeRows,words}) {
  const context=vm.createContext({});
  new vm.Script(harness).runInContext(context,{timeout:2000});
  new vm.Script(runtime+'\n;__hostReturned=true;').runInContext(context,{timeout:2000});
  for(let i=0;i<1000&&!context.__done;i++){await new Promise(setImmediate);vm.runInContext('__step()',context,{timeout:2000});}
  const result=vm.runInContext('__verify()',context);
  const bytes=Buffer.from(context.__output.body||context.$response.body);
  if(f.passThrough)assert.deepEqual(bytes,Buffer.from(f.body),'failure/oversize must preserve original bytes');
  if(!f.entry&&!f.passThrough&&!f.mode.startsWith('missing')){
    assert.deepEqual(parseDocument(bytes,f.type).words,parseDocument(f.body,f.type).words,'native words must remain unchanged');
    assert.deepEqual(nativeRows(bytes,f.type),nativeRows(f.body,f.type),'native words and timestamps must remain unchanged');
  }
  if(f.entry){assert.equal(result.calls,0);assert.equal(result.synchronous,true);}
  if(f.mode.startsWith('missing')&&!f.passThrough)assert.deepEqual(parseDocument(bytes,f.type).words,words,'fallback must actually supply the expected lyric');
  if(f.name.startsWith('english-')||f.name==='600-english-translation')assert.equal(parseDocument(bytes,f.type).hasAlternatives,true,'translation must actually be written');
  assert.ok(result.peakActive<=1);
  return {hash:result.hash,calls:result.calls};
}
