// Desktop JSON presentation only. Translation/matching/cache stay in 3.2.2.
export function macDisplay(response,output,argument,codec) {
  try {
    if (!output || !output.headers || output.body === undefined || Number(output.status ?? response.status) !== 200) return output;
    const args = typeof argument === 'string' ? Object.fromEntries(argument.split('&').map(p=>p.split('=').map(decodeURIComponent))) : argument || {};
    if (args.TRANSLATION_ENABLED === false || args.TRANSLATION_ENABLED === 'false') return output;
    const language = args.TARGET_LANGUAGE || 'zh-CN';
    const headers = output.headers;
    const value = name => {const key=Object.keys(headers).find(k=>k.toLowerCase()===name);return key?String(headers[key]):'';};
    if (value('x-verselyrics') !== '3.2.2' || !/json/i.test(value('content-type'))) return output;
    const body=output.body;
    if (typeof body !== 'string' && !ArrayBuffer.isView(body)) return output;
    if (body.length > 262144 || body.byteLength > 262144) return output;
    const doc=JSON.parse(typeof body==='string'?body:codec.text(new Uint8Array(body.buffer,body.byteOffset,body.byteLength)));
    const lyrics=doc.lyrics,lines=lyrics?.lines;
    if (!lyrics || !['LINE_SYNCED','UNSYNCED'].includes(lyrics.syncType) || !Array.isArray(lines) || lines.length>600) return output;
    // Never change the word/syllable relationship when it carries real timing.
    if (lines.some(row=>!row || typeof row.words!=='string' || row.syllables && (!Array.isArray(row.syllables) || row.syllables.length))) return output;
    const candidates=lyrics.alternatives?.filter(a=>a && a.language===language);
    if (!candidates || candidates.length!==1 || !Array.isArray(candidates[0].lines) || candidates[0].lines.length!==lines.length) return output;
    const translated=candidates[0].lines;
    if (translated.some(s=>typeof s!=='string'||s.length>4096||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s))) return output;
    let changed=false;
    for(let i=0;i<lines.length;i++){
      const t=translated[i].trim(),word=lines[i].words;
      if(!t || !word.trim() || t===word.trim() || word.endsWith('\n'+t)) continue;
      lines[i].words=word+'\n'+t;changed=true;
    }
    if(!changed)return output;
    const encoded=codec.utf8(JSON.stringify(doc),262144);
    return {...output,body:encoded};
  } catch {return output;}
}
