// Desktop JSC fixture host. HTTP replies are immediate self-written data;
// timers do not fire. This does not emulate Loon's native buffers/scheduler.
var __fixture=JSON.parse(__fixtureJSON),__calls=0,__requests=0,__result=null,__logs=[];
var __alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function __decode(s){var size=s.length/4*3-(s.endsWith('==')?2:s.endsWith('=')?1:0),out=new Uint8Array(size),acc=0,bits=0,at=0;for(var i=0;i<s.length;i++){var n=__alphabet.indexOf(s[i]);if(n<0)break;acc=(acc<<6)|n;bits+=6;if(bits>=8){bits-=8;out[at++]=(acc>>>bits)&255;}}return out;}
function __encode(bytes){var out='';for(var i=0;i<bytes.length;i+=3){var n=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);out+=__alphabet[n>>>18&63]+__alphabet[n>>>12&63]+(i+1<bytes.length?__alphabet[n>>>6&63]:'=')+(i+2<bytes.length?__alphabet[n&63]:'=');}return out;}
var __body=__decode(__readBase64(__fixture.name+'.body'));
var __download=__fixture.download?__decode(__readBase64(__fixture.download)):new Uint8Array();
var __translation=__fixture.translation?__decode(__readBase64(__fixture.translation)):new Uint8Array();
var __store={};if(__fixture.sessionKey)__store['Horatio.YouTubeClean.session.v1']=JSON.stringify({video:{key:__fixture.sessionKey,until:Date.now()+60000}});
var $loon='macOS JavaScriptCore fixture',TextEncoder=undefined,TextDecoder=undefined;
var $argument={BILINGUAL:false,TARGET_LANGUAGE:'zh-Hant'};
var $request={url:__fixture.url,headers:__fixture.requestHeaders||{}};
var $response=__fixture.phase==='request'?undefined:{status:200,headers:{'Content-Type':__fixture.contentType||'application/x-protobuf','Content-Encoding':__fixture.encoding||''},body:__body};
var $persistentStore={read:function(key){return __store[key];},write:function(value,key){__store[key]=value;return true;}};
var $httpClient={get:function(req,cb){__requests++;cb(null,{status:__fixture.downloadStatus||503,headers:{}},__download);},post:function(req,cb){__requests++;if(!__fixture.translation)throw Error('unexpected translation');cb(null,{status:200,headers:{'Content-Type':'application/json'}},__translation);}};
var console={log:function(s){__logs.push(JSON.parse(s.slice(15)));}},setTimeout=function(){return 1;};
function $done(result){__calls++;__result=result;}
