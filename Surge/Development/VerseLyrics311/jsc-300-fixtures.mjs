import {readFileSync,writeFileSync} from 'node:fs';
const dir=new URL('./jsc-fixtures/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
for(const count of [48,120])for(const official of [true,false]){
 const template=(official?'official':'lrclib')+'-'+count+'-protobuf',name=(official?'official':'fallback')+'-'+count+'-unrelated-save';
 let source=readFileSync(new URL(template+'.js',dir),'utf8');
 source+='\nvar unrelated=[],expiry=Date.now()+60000;\n'+
 'for(var n=200;n<220;n++){var other=String(n).padStart(22,"0"),rows=Array.from({length:24},(_,i)=>"Other original lantern "+n+" line "+i);unrelated.push({key:"lyrics:auto:"+other,value:{v:1,p:"qq",t:true,l:rows.map((s,i)=>[i*2100,s])},expires:expiry});unrelated.push({key:"translations:v1:zh-CN:"+other,value:{pairs:rows.map(s=>[s,"自写译文 "+s])},expires:expiry});}\n'+
 'var cacheRaw;do{var savedParts=unrelated.map(e=>JSON.stringify(e));cacheRaw=\'{"sizes":\'+JSON.stringify(savedParts.map(s=>s.length))+\',"entries":[\'+savedParts.join(",")+\'],"cooldowns":{}}\';if(cacheRaw.length>56000)unrelated.splice(0,2);}while(cacheRaw.length>56000);if(cacheRaw.length<44000)throw Error("fixture cache too small");store.set("VerseLyrics.v1.cache",cacheRaw);var seededCharacters=cacheRaw.length;unrelated=null;savedParts=null;cacheRaw=null;\n'+
 'var decodedSavedRecordCharacters=0,oldParse=JSON.parse;JSON.parse=function(s){if(typeof s==="string"&&s.startsWith(\'{"key":\'))decodedSavedRecordCharacters+=s.length;return oldParse(s);};var oldVerify=__verify;__verify=function(){var result=oldVerify();result.decodedSavedRecordCharacters=decodedSavedRecordCharacters;result.seededCharacters=seededCharacters;return result;};\n';
 writeFileSync(new URL(name+'.js',dir),source);manifest.push({name,bytes:0,hook:'SpotifyLyrics.js',unrelatedSave:true});
}
writeFileSync(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({coldCases:manifest.length,newCases:4}));

