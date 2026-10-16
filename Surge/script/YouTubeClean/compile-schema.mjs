// Build-time protocol facts, not a proxy-plugin dependency.
import protobuf from 'protobufjs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const base = process.argv[2]; if (!base) throw Error('protocol-reference/protos path required');
const types=new Map(), enums=new Set(), extensions=[]; let files=0;
async function collect(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const path=join(dir,entry.name); if(entry.isDirectory()){await collect(path);continue;}if(!path.endsWith('.proto'))continue;
    const root=protobuf.parse(await readFile(path,'utf8'),{keepCase:true}).root; files++;
    function visit(node){
      if(node instanceof protobuf.Type)types.set(node.fullName,{name:node.fullName,fields:node.fieldsArray.map(f=>({no:f.id,name:f.name,type:f.type,scope:node.fullName,repeat:f.repeated}))});
      else if(node instanceof protobuf.Enum)enums.add(node.fullName);
      else if(node instanceof protobuf.Field && node.extend)extensions.push({no:node.id,name:node.name,type:node.type,scope:node.parent.fullName,target:node.extend,repeat:node.repeated});
      for(const child of node.nestedArray||[])visit(child);
    } visit(root);
  }
}
await collect(base);
function resolve(name,scope){if(name.startsWith('.'))return name;let prefix=scope;while(prefix){const candidate=prefix+'.'+name;if(types.has(candidate)||enums.has(candidate))return candidate;prefix=prefix.slice(0,prefix.lastIndexOf('.'));}return '.'+name;}
for(const field of extensions){const owner=resolve(field.target,field.scope);if(types.has(owner))types.get(owner).fields.push(field);}
const roots=['PlayerResponse','BrowseResponse','SearchResponse','WatchNextResponse','GetWatchResponse','ConfigResponse','AdBreakResponse'];
const reachable=new Set();function reach(name){if(reachable.has(name)||!types.has(name))return;reachable.add(name);for(const f of types.get(name).fields)reach(resolve(f.type,f.scope));}
for(const root of roots)reach('.youtube.api.innertube.'+root);
const map={};
for(const name of reachable){const row={};for(const f of types.get(name).fields){const target=resolve(f.type,f.scope);if(types.has(target))row[f.no]=target;}
 if(Object.keys(row).length)map[name]=row;
}
const adIds={};
const adName=/^(?:ad_slot|display_ad|in_feed_ad_layout|search_pyv|promoted|compact_promoted|grid_promoted|carousel_ad|video_masthead_ad|brand_video_singleton|brand_video_shelf|ad_placement|companion_ad|ad_break)\w*renderer$/;
for(const type of types.values())for(const f of type.fields)if(f.no>=1000&&adName.test(f.name))adIds[f.no]=f.name;
const out='// Generated protocol field graph from davidzeng0/innertube (MIT).\n// Used only to navigate known message fields; unknown fields remain opaque.\nexport const graph='+JSON.stringify(map)+';\nexport const rendererAds='+JSON.stringify(adIds)+';\n';
await writeFile('src/protocol.mjs',out);
console.log(JSON.stringify({files,types:types.size,reachable:reachable.size,graphTypes:Object.keys(map).length,adRendererIds:Object.keys(adIds).length,bytes:out.length}));
