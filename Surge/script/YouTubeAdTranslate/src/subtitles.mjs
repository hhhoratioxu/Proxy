// Copyright 2026 Horatio Xu. Apache-2.0.
import { SUBTITLE_LIMIT } from './common.mjs';
const normal = s => s.replace(/\s+/g, ' ').trim();
const xmlEscape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function xmlText(s) {
  return s.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&(?:#(x[\da-f]+|\d+)|amp|lt|gt|quot|apos);/gi, (m, n) => {
    if (n) { const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m; }
    return ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[m.toLowerCase()] || m;
  });
}
function attributes(s) {
  const out = {}; for (const m of s.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1]] = m[2] ?? m[3];
  return out;
}
function time(s) {
  const parts = s.replace(',', '.').split(':').map(Number);
  return parts.reduce((n, p) => n * 60 + p, 0) * 1000;
}
export function parseSubtitles(source) {
  if (source.length > SUBTITLE_LIMIT) throw new Error('subtitle limit');
  if (/^\s*\{/.test(source)) {
    const json = JSON.parse(source); if (!Array.isArray(json.events)) throw new Error('unknown JSON subtitle');
    const cues = [];
    for (let i = 0; i < json.events.length; i++) {
      const event = json.events[i]; if (!Array.isArray(event.segs)) continue;
      const words = event.segs.map(s => s.utf8 || '').join(''); if (!normal(words)) continue;
      const cue = { start: Number(event.tStartMs), duration: Number(event.dDurationMs || 0), text: words, event, index: i };
      // Rolling ASR fragments are coalesced for matching, while original timings remain in output.
      if (event.aAppend && cues.length) {
        const previous = cues[cues.length - 1];
        previous.text += words; previous.duration = Math.max(previous.duration, cue.start + cue.duration - previous.start);
        previous.appendIndices.push(i);
      } else { cue.appendIndices = []; cues.push(cue); }
    }
    return { format: 'json3', cues, render(changes) {
      for (const [cue, value] of changes) {
        cue.event.segs = [{ utf8: value }]; cue.event.dDurationMs = cue.duration;
        delete cue.event.aAppend;
        for (const index of cue.appendIndices) json.events[index].segs = [];
      }
      return JSON.stringify(json);
    } };
  }
  if (/^\s*(?:<\?xml[^>]*>\s*)?<(?:timedtext|transcript)\b/.test(source)) {
    if (/<!DOCTYPE|<!ENTITY|<html/i.test(source)) throw new Error('unsupported XML');
    const cues = [];
    const pattern = /<(p|text)\b([^>]*)>([\s\S]*?)<\/\1>/g;
    for (const m of source.matchAll(pattern)) {
      const a = attributes(m[2]), srv3 = m[1] === 'p';
      const start = Number(srv3 ? a.t : Number(a.start) * 1000);
      const duration = Number(srv3 ? a.d : Number(a.dur) * 1000);
      if (!normal(xmlText(m[3]))) continue;
      cues.push({ start, duration: Number.isFinite(duration) ? duration : 0, text: xmlText(m[3]), begin: m.index, end: m.index + m[0].length, tag: m[1], attrs: m[2] });
    }
    return { format: 'xml', cues, render(changes) {
      let out = source;
      for (const [cue, value] of [...changes].sort((a, b) => b[0].begin - a[0].begin)) {
        const rendered = cue.tag === 'p' ? '<s>' + xmlEscape(value) + '</s>' : xmlEscape(value);
        out = out.slice(0, cue.begin) + '<' + cue.tag + cue.attrs + '>' + rendered + '</' + cue.tag + '>' + out.slice(cue.end);
      }
      return out;
    } };
  }
  if (/^\uFEFF?WEBVTT(?:\s|$)/.test(source)) {
    const cues = [], pattern = /(^|\r?\n)((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})[ \t]+-->[ \t]+((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})([^\r\n]*)\r?\n([^]*?)(?=\r?\n\r?\n|$)/g;
    for (const m of source.matchAll(pattern)) {
      const begin = m.index + m[0].length - m[5].length;
      cues.push({ start: time(m[2]), duration: time(m[3]) - time(m[2]), text: xmlText(m[5]), begin, end: begin + m[5].length });
    }
    return { format: 'vtt', cues, render(changes) {
      let out = source;
      for (const [cue, value] of [...changes].sort((a, b) => b[0].begin - a[0].begin)) out = out.slice(0, cue.begin) + xmlEscape(value) + out.slice(cue.end);
      return out;
    } };
  }
  throw new Error('unsupported subtitle format');
}
export function mergeSubtitles(translated, original) {
  const target = parseSubtitles(translated), source = parseSubtitles(original);
  if (!target.cues.length || !source.cues.length || target.cues.length > 20000 || source.cues.length > 20000) return null;
  const changes = new Map(); let cursor = 0;
  for (const cue of target.cues) {
    if (!Number.isFinite(cue.start)) continue;
    const end = cue.start + Math.max(cue.duration, 1);
    while (cursor < source.cues.length && source.cues[cursor].start + Math.max(source.cues[cursor].duration, 1) < cue.start - 100) cursor++;
    const matches = [];
    for (let i = cursor; i < source.cues.length && i < cursor + 80; i++) {
      const other = source.cues[i]; if (other.start >= end + 100) break;
      const overlap = Math.min(end, other.start + Math.max(other.duration, 1)) - Math.max(cue.start, other.start);
      if (overlap > 0 || Math.abs(other.start - cue.start) <= 100) matches.push(other.text);
    }
    const words = [...new Set(matches.map(normal).filter(Boolean))].join(' ');
    if (words && normal(words) !== normal(cue.text) && !normal(cue.text).startsWith(words)) changes.set(cue, words + '\n' + cue.text.trim());
  }
  return changes.size ? target.render(changes) : null;
}
