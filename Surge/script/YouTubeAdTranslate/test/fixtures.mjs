// Self-written protocol fixtures; no captured accounts, tokens or user history.
import { Buffer } from 'node:buffer';
export function vi(value) { let n = BigInt(value), out = []; do { const b = Number(n & 127n); n >>= 7n; out.push(b | (n ? 128 : 0)); } while (n); return Buffer.from(out); }
export const cat = (...xs) => Buffer.concat(xs.map(x => Buffer.from(x)));
export const field = (no, payload) => cat(vi(no * 8 + 2), vi(payload.length), payload);
export const number = (no, n) => cat(vi(no * 8), vi(n));
export const string = (no, s) => field(no, Buffer.from(s));
export function fields(raw) {
  const data = Buffer.from(raw), out = []; let at = 0;
  function read() { let n = 0n, shift = 0n, b; do { if (at >= data.length || shift > 70n) throw Error('invalid wire'); b = data[at++]; n |= BigInt(b & 127) << shift; shift += 7n; } while (b & 128); return n; }
  while (at < data.length) {
    const start = at, key = Number(read()), no = Math.floor(key / 8), wire = key & 7; let payload, value;
    if (wire === 0) value = read();
    else if (wire === 2) { const length = Number(read()); payload = data.subarray(at, at + length); at += length; }
    else if (wire === 1) at += 8;
    else if (wire === 5) at += 4;
    else throw Error('unsupported fixture wire');
    if (at > data.length) throw Error('truncated fixture');
    out.push({ no, wire, payload, value, raw: data.subarray(start, at) });
  }
  return out;
}
export const subtitleURL = 'https://www.youtube.com/api/timedtext?v=SELF_WRITTEN&lang=en&fmt=json3&signature=A%2BB%2FC';
export const unknown = cat(string(777, 'keep-opaque'), number(778, '18446744073709551615'));
export function player() {
  // Native caption track: URL=1, name=2, vssId=3, languageCode=4, translatable=7.
  const track = cat(string(1, subtitleURL), field(2, field(1, string(1, 'English'))), string(3, '.en'), string(4, 'en'), number(7, 1));
  const renderer = cat(field(1, track), field(2, cat(number(2, 0), number(3, 0))));
  return cat(field(7, string(1, 'self-written-ad')), field(68, string(1, 'self-written-ad-slot')), field(10, field(51621377, renderer)), unknown);
}
export const translatedJSON = JSON.stringify({ wireMagic: 'pb3', events: [{ tStartMs: 1000, dDurationMs: 1500, segs: [{ utf8: '一行自写字幕' }] }, { tStartMs: 3000, dDurationMs: 1200, segs: [{ utf8: '另一行自写字幕' }] }] });
export const originalJSON = JSON.stringify({ wireMagic: 'pb3', events: [{ tStartMs: 1000, dDurationMs: 1500, segs: [{ utf8: 'A self-written line' }] }, { tStartMs: 3000, dDurationMs: 1200, segs: [{ utf8: 'Another self-written line' }] }] });
