// Frozen original VerseLyrics 0.5.2 parser, differential test oracle only.
function playerEntryWire(bytes, connect) {
  let changed = 0, visited = 0;
  function track(body, mapNumber) {
    const fs = fields(body), uri = word(fs, 1);
    if (!/^spotify:track:[0-9A-Za-z]{22}$/.test(uri)) return body;
    if (++visited > 300) throw new Error("player-track-limit");
    const maps = fs.filter(f => f.number === mapNumber);
    if (maps.some(f => f.wire !== 2)) return body;
    const targets = maps.map(f => ({f, fs:fields(f.payload)})).filter(t => word(t.fs,1) === "has_lyrics");
    if (targets.some(t => !["true", "false"].includes(word(t.fs,2)))) return body;
    const replacements = new Map();
    for (const t of targets) if (word(t.fs,2) === "false") {
      replacements.set(t.f, dataField(mapNumber, replaceField(t.fs,2,stringField(2,"true")))); changed++;
    }
    if (!replacements.size && targets.length) return body;
    const parts = fs.map(f => replacements.get(f) || f.raw);
    if (!targets.length) { parts.push(dataField(mapNumber,join([stringField(1,"has_lyrics"),stringField(2,"true")]))); changed++; }
    return join(parts);
  }
  function repeated(body, number, transform) {
    const initial = changed;
    const parts = fields(body).map(f => {
      if(f.number!==number||f.wire!==2)return f.raw;
      const before=changed, value=transform(f.payload);return before===changed?f.raw:dataField(number,value);
    });
    return initial === changed ? body : join(parts);
  }
  let body;
  if (connect) {
    // Cluster.player_state(3) -> PlayerState.track(7), prev(19), next(20).
    body = repeated(bytes,3,state => {
      const fs = fields(state), initial = changed;
      const parts = fs.map(f => {
        if(![7,19,20].includes(f.number)||f.wire!==2)return f.raw;
        const before=changed,value=track(f.payload,3);return before===changed?f.raw:dataField(f.number,value);
      });
      return initial === changed ? state : join(parts);
    });
  } else {
    // Context.pages(5) -> ContextPage.tracks(4) -> ContextTrack.metadata(4).
    if(!/^spotify:[^\s?#]{1,512}$/.test(word(fields(bytes),1)))return {body:bytes,changed:0,visited:0};
    body = repeated(bytes,5,page => repeated(page,4,t => track(t,4)));
  }
  return {body:changed ? body : bytes,changed,visited};
}
function playerEntryJSON(bytes, connect) {
  const source = text(bytes), obj = JSON.parse(source), plans = new Map();let visited = 0;
  function target(value,path) {
    if (!goodObject(value) || !/^spotify:track:[0-9A-Za-z]{22}$/.test(str(value.uri))) return;
    if (++visited > 300) throw new Error("player-track-limit");
    if (!Object.hasOwn(value,"metadata")) { plans.set(JSON.stringify(path),{add:'"metadata":{"has_lyrics":"true"}'}); return; }
    if (!goodObject(value.metadata)) return;
    const meta = value.metadata;
    if (!Object.hasOwn(meta,"has_lyrics")) plans.set(JSON.stringify([...path,"metadata"]),{add:'"has_lyrics":"true"'});
    else if (meta.has_lyrics === "false" || meta.has_lyrics === false) plans.set(JSON.stringify([...path,"metadata","has_lyrics"]),{value:typeof meta.has_lyrics === "string" ? '"true"' : 'true'});
  }
  if (connect) {
    const state = obj?.player_state;
    if (goodObject(state)) {
      target(state.track,["player_state","track"]);
      for (const key of ["prev_tracks","next_tracks"]) if (Array.isArray(state[key])) state[key].forEach((v,i)=>target(v,["player_state",key,i]));
    }
  } else if (goodObject(obj) && /^spotify:[^\s?#]{1,512}$/.test(str(obj.uri)) && Array.isArray(obj.pages)) {
    obj.pages.forEach((page,i)=>{if(Array.isArray(page?.tracks))page.tracks.forEach((v,j)=>target(v,["pages",i,"tracks",j]));});
  }
  if (!plans.size) return {body:bytes,changed:0,visited};
  // Splice only selected JSON tokens. Preserve all other text, escaped strings,
  // numeric IDs, whitespace and unknown data without JSON reserialization.
  const edits=[];let at=0,nodes=0;
  function space(){while(/\s/.test(source[at]||"x"))at++;}
  function string(){const begin=at++;while(at<source.length){const ch=source[at++];if(ch==='\\')at++;else if(ch==='"')return source.slice(begin,at);}throw new Error("player-json-string");}
  function scan(path,depth){
    if(depth>64||++nodes>100000)throw new Error("player-json-limit");space();const begin=at,plan=plans.get(JSON.stringify(path));
    if(source[at]==='{'){
      at++;space();const empty=source[at]==='}';
      while(source[at]!=='}'){const key=JSON.parse(string());space();if(source[at++]!==':')throw new Error("player-json-colon");scan([...path,key],depth+1);space();if(source[at]===','){at++;space();}else break;}
      if(source[at]!=='}')throw new Error("player-json-object");if(plan?.add)edits.push({begin:at,end:at,value:(empty?'':',')+plan.add});at++;
    }else if(source[at]==='['){at++;space();let i=0;while(source[at]!==']'){scan([...path,i++],depth+1);space();if(source[at]===','){at++;space();}else break;}if(source[at++]!==']')throw new Error("player-json-array");}
    else if(source[at]==='"')string();else{while(at<source.length&&!/[\s,}\]]/.test(source[at]))at++;}
    if(plan?.value)edits.push({begin,end:at,value:plan.value});
  }
  scan([],0);space();if(at!==source.length||edits.length!==plans.size)throw new Error("player-json-shape");
  const parts=[];let end=0;
  for(const e of edits.sort((a,b)=>a.begin-b.begin)){parts.push(source.slice(end,e.begin),e.value);end=e.end;}
  parts.push(source.slice(end));return {body:utf8(parts.join("")),changed:edits.length,visited};
}
