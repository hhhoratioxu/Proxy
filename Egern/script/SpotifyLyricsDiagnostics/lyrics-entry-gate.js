// Original, narrowly scoped iOS lyric-entry configuration adapter.
// Uses public Protobuf field facts; never changes account attributes or other
// feature assignments. Appended to the self-contained diagnostic bundle.
const LYRICS_GATE_URL = new RegExp("^https://(" + HOST + ")(?::443)?/(?:user-customization-service/v1/customize|bootstrap/v1/bootstrap|v1/customize)/?(?:\\?.*)?$");
const LYRICS_GATE_SCOPE = "ios-feature-lyrics";
const LYRICS_GATE_NAME = "enable_has_lyrics_check_bypass";
function lyricGateConfiguration(bytes) {
  // Configuration.assigned_values(3) -> AssignedValue.property_id(1)
  // -> Identifier.scope(1), name(2). AssignedValue.bool_value(3).value(1).
  // Recognize only a configuration containing an actual iOS lyrics namespace.
  const fs = fields(bytes), entries = fs.filter(f => f.number === 3 && f.wire === 2);
  if (!entries.length || entries.length > 5000) return null;
  const id = fs.filter(f => f.number === 1), time = fs.filter(f => f.number === 2);
  if (id.length !== 1 || id[0].wire !== 2 || !word(fs, 1) || time.some(f => f.wire !== 0)) return null;
  let iosLyrics = false; const targets = [];
  for (const entry of entries) {
    let ef, identifier;
    try {
      ef = fields(entry.payload);
      const ids = ef.filter(f => f.number === 1);
      if (ids.length !== 1 || ids[0].wire !== 2) continue;
      identifier = fields(ids[0].payload);
      if (identifier.filter(f => f.number === 1).length !== 1 || identifier.filter(f => f.number === 2).length !== 1) continue;
      if (word(identifier, 1) !== LYRICS_GATE_SCOPE) continue;
      iosLyrics = true;
      if (word(identifier, 2) !== LYRICS_GATE_NAME) continue;
    } catch { continue; }
    const values = ef.filter(f => [3, 4, 5].includes(f.number));
    if (values.length !== 1 || values[0].number !== 3 || values[0].wire !== 2) throw new Error("lyrics-gate-type");
    const bool = fields(values[0].payload), value = bool.filter(f => f.number === 1);
    if (value.length > 1 || value.some(f => f.wire !== 0 || ![0, 1].includes(f.value))) throw new Error("lyrics-gate-value");
    targets.push({ entry, ef, bool, value: value[0]?.value ?? 0 });
  }
  if (!iosLyrics) return null;
  return { fs, entries, targets };
}
function nativeLyricGate(bytes, envelope = "customize") {
  if (bytes.length > LIMIT) throw new Error("body-limit");
  if (envelope === "bootstrap") {
    // Native BootstrapMessage.wrapper(2) -> oneMoreWrapper(1) ->
    // message(1) -> CustomizeMessage. These are protocol field facts,
    // not a recursive scan of arbitrary embedded messages.
    let current = bytes; const wrappers = [];
    for (const number of [2, 1, 1]) {
      let fs; try { fs = fields(current); } catch { return { changed: false, body: bytes, unsupported: true }; }
      const target = fs.filter(f => f.number === number);
      if (target.length !== 1 || target[0].wire !== 2) return { changed: false, body: bytes, unsupported: true };
      wrappers.push({ fs, number }); current = target[0].payload;
    }
    const result = nativeLyricGate(current);
    if (!result.changed) return { ...result, body: bytes, ...(result.depth !== undefined ? { depth: result.depth + 3 } : {}) };
    let body = result.body;
    for (let i = wrappers.length - 1; i >= 0; i--) {
      const { fs, number } = wrappers[i]; body = replaceField(fs, number, dataField(number, body));
    }
    return { ...result, body, depth: result.depth + 3 };
  }
  // Known configurations can be direct Configuration, ResolveResponse,
  // UcsResponse, or UcsResponseWrapper. Only descend their unique field 1;
  // arbitrary byte searches and unknown container rewrites are not used.
  let current = bytes; const parents = [];
  for (let depth = 0; depth <= 3; depth++) {
    let candidate;
    try { candidate = lyricGateConfiguration(current); }
    catch (e) { if (/^lyrics-gate-/.test(e.message)) throw e; }
    if (candidate) {
      const replacements = new Map(); let updated = 0, added = 0;
      for (const t of candidate.targets) {
        if (t.value === 1) continue;
        const bool = replaceField(t.bool, 1, numberField(1, 1));
        replacements.set(t.entry, dataField(3, replaceField(t.ef, 3, dataField(3, bool)))); updated++;
      }
      const parts = candidate.fs.map(f => replacements.get(f) || f.raw);
      if (!candidate.targets.length) {
        const identifier = join([stringField(1, LYRICS_GATE_SCOPE), stringField(2, LYRICS_GATE_NAME)]);
        parts.push(dataField(3, join([dataField(1, identifier), dataField(3, numberField(1, 1))]))); added = 1;
      }
      if (!updated && !added) return { changed: false, body: bytes, matched: candidate.targets.length, added, updated, depth };
      let body = join(parts);
      for (let i = parents.length - 1; i >= 0; i--) body = replaceField(parents[i], 1, dataField(1, body));
      return { changed: true, body, matched: candidate.targets.length, added, updated, depth };
    }
    if (depth === 3) break;
    let fs; try { fs = fields(current); } catch { break; }
    const next = fs.filter(f => f.number === 1);
    if (next.length !== 1 || next[0].wire !== 2) break;
    // A success and an error in the same oneof is not a supported envelope.
    if (fs.some(f => f.number === 2 && f.wire === 2)) break;
    parents.push(fs); current = next[0].payload;
  }
  return { changed: false, body: bytes, unsupported: true };
}
async function handleLyricGate(ctx) {
  let config; try { config = settings(ctx.env); } catch { return; }
  if (!config.discover || config.provider === "off") return;
  if (!ctx.response) {
    const h = ctx.request.headers;
    for (const name of ["If-None-Match", "If-Modified-Since", "Accept-Encoding", "Cache-Control"]) h.delete(name);
    h.set("Accept-Encoding", "identity"); h.set("Cache-Control", "no-cache");
    return { headers: h };
  }
  const code = ctx.response.status;
  if (code !== 200) {
    status(ctx, code === 304 ? "客户端歌词配置仍返回 304，未取得配置正文；请确认诊断模块已更新后重新打开 Spotify。" : "客户端歌词配置 HTTP " + code + "；保留原响应，未改写。");
    return;
  }
  const bytes = new Uint8Array(await ctx.response.arrayBuffer());
  if (header(ctx.response.headers, MARKER)) { status(ctx, "客户端配置已有处理标记；保留原响应。"); return { body: bytes }; }
  try {
    if (/json/i.test(header(ctx.response.headers, "Content-Type"))) {
      status(ctx, "客户端配置返回 JSON，当前候选适配仅支持已核对的原生二进制结构；保留原响应。"); return { body: bytes };
    }
    const envelope = /\/bootstrap\/v1\/bootstrap\/?(?:\?|$)/.test(str(ctx.request.url)) ? "bootstrap" : "customize";
    const result = nativeLyricGate(bytes, envelope);
    if (result.unsupported) { status(ctx, "客户端配置已命中，但没有识别到 iOS 歌词配置容器；保留原响应。"); return { body: bytes }; }
    if (!result.changed) { status(ctx, "客户端歌词检查跳过标记已经开启；配置无需改写，等待后续 lyrics 请求。"); return { body: bytes }; }
    status(ctx, "客户端歌词配置 " + envelope + "：已写入无词检查跳过标记（新增 " + result.added + "，修改 " + result.updated + "）；其他配置保持原字节，等待后续 lyrics 请求。");
    return { headers: responseHeaders(ctx, "protobuf"), body: result.body };
  } catch (error) {
    try { ctx.diagnosticError?.(error); } catch { }
    status(ctx, "客户端歌词配置结构不支持或字段类型不符；保留原响应。"); return { body: bytes };
  }
}
function batchKinds(bytes) {
  try { return [...new Set(fields(bytes).filter(f => f.number === 2 && f.wire === 2).map(f => last(fields(f.payload), 2, 0)?.value ?? 0).filter(n => Number.isInteger(n) && n >= 0 && n <= 2147483647))].slice(0, 12); }
  catch { return []; }
}
export { LYRICS_GATE_URL, nativeLyricGate, batchKinds };
