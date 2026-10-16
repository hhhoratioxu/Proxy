// Copyright 2026 Horatio Xu. MIT. Independent, loss-preserving protobuf editing.
// Fields that are not edited retain their exact original tag, payload and length bytes.
export function join(parts) {
  const out = new Uint8Array(parts.reduce((n,p) => n + p.length, 0));
  let at = 0; for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}
export function encodeVarint(value) {
  let n = BigInt(value); if (n < 0n || n > 0xffffffffffffffffn) throw Error('varint range');
  const result = [];
  do { const low = Number(n & 127n); n >>= 7n; result.push(low | (n ? 128 : 0)); } while (n);
  return new Uint8Array(result);
}
function varint(data, pos) {
  let value = 0n;
  for (let shift = 0n; shift < 70n; shift += 7n) {
    if (pos >= data.length) throw Error('truncated varint');
    const b = data[pos++];
    if (shift === 63n && b > 1) throw Error('overflow varint');
    value |= BigInt(b & 127) << shift;
    if (!(b & 128)) return { value, pos };
  }
  throw Error('overflow varint');
}
export function decodeMessage(data, maxFields = 100000) {
  const list = []; let pos = 0;
  while (pos < data.length) {
    if (list.length >= maxFields) throw Error('field count');
    const begin = pos, key = varint(data, pos); pos = key.pos;
    if (key.value > 0xffffffffn) throw Error('invalid field number');
    const no = Number(key.value >> 3n), wire = Number(key.value & 7n), tag = data.subarray(begin, pos);
    if (!no || no > 536870911) throw Error('invalid field number');
    let payload, value;
    if (wire === 0) { const scalar = varint(data, pos); value = scalar.value; pos = scalar.pos; }
    else if (wire === 1 || wire === 5) pos += wire === 1 ? 8 : 4;
    else if (wire === 2) {
      const length = varint(data, pos); pos = length.pos;
      if (length.value > BigInt(data.length - pos)) throw Error('truncated message');
      const size = Number(length.value); payload = data.subarray(pos, pos + size); pos += size;
    } else throw Error('unsupported group wire');
    if (pos > data.length) throw Error('truncated fixed field');
    list.push({ no, wire, payload, value, tag, raw: data.subarray(begin, pos) });
  }
  return list;
}
export const nested = field => field?.wire === 2 ? decodeMessage(field.payload) : [];
export const findField = (list, no) => list.find(f => f.no === no);
export function withPayload(field, payload) { return join([field.tag, encodeVarint(payload.length), payload]); }
export function makeBytes(no, payload) { return join([encodeVarint(BigInt(no) * 8n + 2n), encodeVarint(payload.length), payload]); }
export function makeInt(no, value) { return join([encodeVarint(BigInt(no) * 8n), encodeVarint(value)]); }
export function replaceAll(list, no, replacements) {
  let written = false; const out = [];
  for (const field of list) {
    if (field.no !== no) out.push(field.raw);
    else if (!written) { out.push(...replacements); written = true; }
  }
  if (!written) out.push(...replacements);
  return join(out);
}
export function readPacked(field) {
  if (field.wire === 0) return [field.value];
  if (field.wire !== 2) throw Error('wrong packed type');
  const values = []; let pos = 0;
  while (pos < field.payload.length) { const v = varint(field.payload, pos); values.push(v.value); pos = v.pos; }
  return values;
}
export function same(a,b) { if (a.length !== b.length) return false; for (let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }
