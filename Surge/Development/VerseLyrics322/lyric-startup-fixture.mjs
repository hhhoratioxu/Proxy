import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {encodeDocument,parseDocument} from './core/spotify-lyrics.js';
export const KEY='VerseLyrics.v1.cache',id='0000000000000000000001';
export const words=Array.from({length:48},(_,i)=>'I watch the paper lantern '+i+'.');
export const answers=words.map((_,i)=>'自写中文译文 '+i);
export const colors={background:-10985626,text:-16777216,highlightText:-1};
export function fixture(mode,format='protobuf',filled=false){
  const mixed=mode==='chinese-mixed',missing=mode.startsWith('missing'),cached=mode.endsWith('cached');
  const rows=mixed?words.map((_,i)=>'第'+i+'句 我等 I miss you'):words;
  const doc={lyrics:{syncType:'LINE_SYNCED',language:mixed?'zh':'en',provider:'TEST',providerDisplayName:'TEST',lines:rows.map((words,i)=>({words,startTimeMs:String(i*2100+1000)})),alternatives:[]},colors};
  const body=missing?Buffer.from('missing'):encodeDocument(doc,format),entries=[],expires=Date.now()+600000;
  if(filled)for(let i=20;i<38;i++)entries.push({key:'lyrics:auto:'+String(i).padStart(22,'0'),value:{v:1,p:'lrclib',t:true,l:words.map((w,j)=>[j*2100,w+' other '+i])},expires});
  if(missing){entries.push({key:'meta:'+id,value:{id,title:'Paper Lantern',artists:['Ada North'],album:'Quiet Walk',duration:180},expires},{key:'palette:v1:'+id,value:{colors},expires});}
  if(cached){
    entries.push({key:'translations:v1:zh-CN:'+id,value:{pairs:rows.map((w,i)=>[w,answers[i]])},expires});
    if(missing)entries.push({key:'lyrics:auto:'+id,value:{v:1,p:'lrclib',t:true,l:words.map((w,i)=>[i*2100+1000,w])},expires});
  }
  let raw;
  do {const parts=entries.map(e=>JSON.stringify(e));raw='{"sizes":'+JSON.stringify(parts.map(s=>s.length))+',"entries":['+parts.join(',')+'],"cooldowns":{}}';if(raw.length>60000)entries.shift();}while(raw.length>60000);
  return {mode,format,body,status:missing?404:200,type:format==='json'?'application/json':'application/x-protobuf',store:new Map([[KEY,raw]]),rows};
}
export function host(root,client,f,{sample=()=>{}}={}){
  const qx=client==='QuantumultX',source=readFileSync(root+'/runtime/'+client+'/script/SpotifyLyrics.js','utf8');
  const state={live:0,peak:0,done:0,synchronous:0,calls:0,active:0,peakHTTP:0,timers:0,retained:0,peakRetained:0,contexts:new Set(),pending:[],outputs:[]};
  function request(o,cb){state.calls++;state.active++;state.peakHTTP=Math.max(state.peakHTTP,state.active);state.pending.push(()=>{
    state.active--;let data;
    if(o.url.includes('lrclib.net/api/get'))data={trackName:'Paper Lantern',artistName:'Ada North',albumName:'Quiet Walk',duration:180,syncedLyrics:words.map((w,i)=>{const t=i*2100+1000;return '['+String(Math.floor(t/60000)).padStart(2,'0')+':'+(t%60000/1000).toFixed(2).padStart(5,'0')+']'+w;}).join('\n')};
    else if(o.url.includes('translate.googleapis.com'))data=new URL(o.url).searchParams.getAll('q').map(q=>answers[words.indexOf(q)]||'译文');
    else throw Error('Unexpected host '+o.url);
    const text=JSON.stringify(data),bytes=new Uint8Array(Buffer.from(text));sample();cb(null,{status:200,headers:{}},o['binary-mode']===false?text:bytes);
  });sample();}
  state.invoke=()=>{
    const input=new Uint8Array(f.body);let returned=false,completions=0;
    const ctx={$argument:{FALLBACK_PROVIDER:'lrclib',TARGET_LANGUAGE:'zh-CN',FETCH_ARTWORK_COLOR:false},$environment:{variables:{FALLBACK_PROVIDER:'lrclib',TARGET_LANGUAGE:'zh-CN',FETCH_ARTWORK_COLOR:false}},
      $request:{url:'https://spclient.wg.spotify.com/color-lyrics/v2/track/'+id,headers:{Accept:f.type}},$response:qx?{statusCode:f.status,headers:{'Content-Type':f.type},bodyBytes:input.buffer}:{status:f.status,headers:{'Content-Type':f.type},body:input},
      $persistentStore:{read:k=>f.store.get(k),write:(v,k)=>{f.store.set(k,v);return true;}},$prefs:{valueForKey:k=>f.store.get(k),setValueForKey:(v,k)=>{f.store.set(k,v);return true;}},
      setTimeout(){state.timers++;return 1;},clearTimeout(){},$httpClient:{get:request,post:request},
      $task:{fetch:o=>new Promise((resolve,reject)=>request(o,(e,r,b)=>e?reject(e):resolve({statusCode:r.status,headers:r.headers,bodyBytes:b.buffer})))},
      $done:r=>{if(++completions!==1)throw Error('duplicate completion');state.done++;state.live--;if(!returned)state.synchronous++;state.retained-=input.length;state.outputs.push(Buffer.from((qx?r.bodyBytes:r.body)||input));state.contexts.delete(ctx);delete ctx.$response;sample();}};
    state.contexts.add(ctx);state.live++;state.retained+=input.length;state.peak=Math.max(state.peak,state.live);state.peakRetained=Math.max(state.peakRetained,state.retained);
    new vm.Script(source).runInNewContext(ctx,{timeout:1000});returned=true;sample();
  };
  state.drain=async()=>{for(let i=0;i<30&&state.live;i++){await new Promise(setImmediate);const work=state.pending.splice(0);for(const done of work)done();}if(state.live||state.active||state.contexts.size)throw Error('Unsettled lyric host');};
  return state;
}
