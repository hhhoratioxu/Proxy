// Self-written fixtures only. This runs outside every measured child process.
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createCipheriv,createHmac} from 'node:crypto';
import {combine,binary,integer,string,homeFirstPage,homeSection} from '../test/fixtures.mjs';
const [directory]=process.argv.slice(2);if(!directory)throw Error('fixture directory required');
await mkdir(directory,{recursive:true});const cases=[];
async function save(name,body,options={}){
 await writeFile(join(directory,name+'.body'),body);
 const record={name,url:'https://youtubei.googleapis.com/youtubei/v1/browse',expectedChanged:true,...options};
 for(const key of ['download','translation'])if(record[key]){await writeFile(join(directory,name+'.'+key),record[key]);record[key]=name+'.'+key;}
 cases.push(record);
}
const cards=Array.from({length:3500},(_,i)=>({videoRenderer:{videoId:'SELF_'+i,title:{runs:[{text:('自写标题 '+i+' 🎬 example & punctuation. ').repeat(7)}]},unknown:'opaque_'+i}}));
const normal=Buffer.from(JSON.stringify({contents:{items:cards},adPlacements:[]}));
await save('json-unchanged',normal,{contentType:'application/json',expectedChanged:false});
const mixed=cards.slice();mixed.splice(1700,0,{adSlotRenderer:{advertiser:'self-written'}});
const changed=Buffer.from(JSON.stringify({contents:{items:mixed},adPlacements:[{selfWritten:true}]}));
await save('json-ad',changed,{contentType:'application/json'});
await save('json-gzip',gzipSync(changed),{contentType:'application/json',encoding:'gzip'});
function node(name){return binary(1,binary(168777401,binary(3,binary(172035250,string(1,name+'.eml-fe|fixture')))));}
const text=('自写普通视频说明 🎬 abcdef ').repeat(220);
const video=i=>binary(153515154,binary(172660663,combine(node('video_lockup_with_attachment'),string(55,text+i))));
const pb=Array.from({length:220},(_,i)=>video(i));pb.splice(100,0,binary(153515154,binary(172660663,node('full_width_square_image_layout'))));
await save('protobuf-ad',homeFirstPage([homeSection(pb)]));
const caption=(count,translated)=>Buffer.from('<timedtext format="3"><body>'+Array.from({length:count},(_,i)=>'<p t="'+i*2500+'" d="2000"><s>'+ (translated?'[YX'+i+'] 繁體中文範例。':'[YX'+i+'] 안녕하세요. example &amp; text.')+'</s></p>').join('')+'</body></timedtext>');
const captionUrl='https://www.youtube.com/api/timedtext?lang=ko&format=srv3';
await save('caption-translation-only',caption(2500,false),{url:captionUrl,download:caption(2500,true),downloadStatus:200});
await save('caption-fallback',caption(180,false),{url:captionUrl,downloadStatus:429,translation:Buffer.from(JSON.stringify(Array.from({length:180},(_,i)=>'[YX'+i+'] 繁體中文範例。')))});
const jsonPlayer=Buffer.from(JSON.stringify({adPlacements:[{selfWritten:true}],videoDetails:{title:'self-written',description:'ordinary & 中文 '.repeat(90000)}}));
const key=Buffer.from(Array.from({length:32},(_,i)=>i)),iv=Buffer.alloc(16,7),plain=combine(integer(1,1),integer(2,200),binary(4,jsonPlayer));
const aes=createCipheriv('aes-128-ctr',key.subarray(0,16),iv),cipher=Buffer.concat([aes.update(plain),aes.final()]),mac=createHmac('sha256',key.subarray(16)).update(cipher).update(iv).digest();
// Independent compact-frame writer, rather than the production UMP encoder.
function frame(type,payload){let n=payload.length,width=n<128?1:n<16384?2:n<2097152?3:4;const size=Buffer.alloc(width);if(width===1)size[0]=n;else{const firstBits=8-width;size[0]=(256-(1<<(9-width)))|(n&((1<<firstBits)-1));for(let i=1;i<width;i++)size[i]=Math.floor(n/2**(firstBits+8*(i-1)))&255;}return Buffer.concat([Buffer.from([type]),size,payload]);}
const params=combine(binary(4,mac),binary(5,iv),integer(6,0));
await save('ump-encrypted-json',combine(frame(10,combine(integer(1,0),binary(4,params))),frame(11,cipher),frame(21,Buffer.alloc(1024*1024,83))),{url:'https://rr3---sn-fixture.googlevideo.com/initplayback',sessionKey:key.toString('base64')});
const protoPlayer=combine(binary(7,string(1,'self-written advertisement')),string(499,'ordinary & 中文 '.repeat(90000))),watchPlain=binary(4,binary(2,protoPlayer));
const watchAes=createCipheriv('aes-128-ctr',key.subarray(0,16),iv),watchCipher=Buffer.concat([watchAes.update(watchPlain),watchAes.final()]),watchMac=createHmac('sha256',key.subarray(16)).update(watchCipher).update(iv).digest();
await save('ump-encrypted-protobuf',combine(frame(10,integer(1,25)),frame(11,combine(binary(1,watchCipher),binary(2,watchMac),binary(3,iv))),frame(21,Buffer.alloc(1024*1024,83))),{url:'https://rr3---sn-fixture.googlevideo.com/initplayback',sessionKey:key.toString('base64')});
await save('oversize-bypass',Buffer.alloc(8388609,65),{expectedChanged:false});
await writeFile(join(directory,'cases.json'),JSON.stringify(cases,null,2)+'\n');
console.log('Prepared '+cases.length+' independent fixtures.');
