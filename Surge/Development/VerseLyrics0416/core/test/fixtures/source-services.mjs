const meta={title:'Paper Lantern',album:'Quiet Walk',artists:['Ada North'],duration:180};
const verse='[00:01.20]A paper lantern floats.\n[00:03.40]Our evening light returns.';
export function sourceFixture(provider,url){
 const path=new URL(url).pathname;
 if(provider==='kugou')return path==='/search'?{status:200,candidates:[{id:42,accesskey:'public-test-key',song:meta.title,singer:'Ada North',duration:180000}]}:{status:200,id:42,fmt:'lrc',charset:'utf8',content:Buffer.from(verse).toString('base64')};
 if(provider==='kuwo')return path==='/r.s'?{abslist:[{MUSICRID:'MUSIC_42',SONGNAME:meta.title,ARTIST:'Ada North',ALBUM:meta.album,DURATION:'180'}]}:{code:200,success:true,data:{songinfo:{id:42,songName:meta.title,artist:'Ada North',duration:'180'},lrclist:[{time:'1.20',lineLyric:'A paper lantern floats.'},{time:'3.40',lineLyric:'Our evening light returns.'}]}};
 return path.startsWith('/suggest/')?{data:[{title:meta.title,artist:{name:'Ada North'},album:{title:meta.album},duration:180}]}:{lyrics:'A paper lantern floats.\nOur evening light returns.'};
}
