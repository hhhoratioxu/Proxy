// Copyright 2026 Horatio Xu. Apache-2.0.
// Framing and Onesie crypto follow LuanRT/GoogleVideo (MIT); see NOTICE.
import { ctr } from '@noble/ciphers/aes';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { gzipSync, gunzipSync } from 'fflate';
import { concat, equal, LIMIT, text, bytes, parseJson } from './common.mjs';
import { core, patchMessage, patchPlayer, cleanJsonAds, captions } from './player.mjs';

const scalar = (no, name, T) => ({ no, name, kind: 'scalar', T, opt: true });
export const CryptoParams = new core.Type('Horatio.CryptoParams', [scalar(4, 'hmac', 12), scalar(5, 'iv', 12), scalar(6, 'compressionType', 13)]);
export const Header = new core.Type('Horatio.OnesieHeader', [scalar(1, 'type', 13), { no: 4, name: 'cryptoParams', kind: 'message', T: () => CryptoParams }]);
export const Envelope = new core.Type('Horatio.OnesieInnertubeResponse', [scalar(1, 'status', 13), scalar(2, 'httpStatus', 13), scalar(4, 'body', 12)]);
const EncryptedRequest = new core.Type('Horatio.EncryptedRequest', [scalar(5, 'encryptedClientKey', 12)]);
export const Request = new core.Type('Horatio.OnesieRequest', [{ no: 3, name: 'encryptedRequest', kind: 'message', T: () => EncryptedRequest }]);

export function packInt(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('UMP integer');
  if (value < 128) return new Uint8Array([value]);
  if (value < 16384) return new Uint8Array([(value & 63) | 128, value >>> 6]);
  if (value < 2097152) return new Uint8Array([(value & 31) | 192, value >>> 5, value >>> 13]);
  if (value < 268435456) return new Uint8Array([(value & 15) | 224, value >>> 4, value >>> 12, value >>> 20]);
  return new Uint8Array([240, value, value >>> 8, value >>> 16, value >>> 24]);
}
export function readInt(data, offset) {
  if (offset >= data.length) throw new Error('truncated UMP');
  const first = data[offset], length = first < 128 ? 1 : first < 192 ? 2 : first < 224 ? 3 : first < 240 ? 4 : 5;
  if (offset + length > data.length) throw new Error('truncated UMP integer');
  let value;
  if (length === 1) value = first;
  else if (length === 5) value = new DataView(data.buffer, data.byteOffset + offset + 1, 4).getUint32(0, true);
  else {
    const bits = 8 - length; value = first & (2 ** bits - 1);
    for (let i = 1; i < length; i++) value += data[offset + i] * 2 ** (bits + 8 * (i - 1));
  }
  return [value, offset + length];
}
export const frame = (type, data) => concat(packInt(type), packInt(data.length), data);
export function frames(raw) {
  const out = []; let offset = 0;
  while (offset < raw.length) {
    if (out.length > 50000) throw new Error('UMP frame limit');
    const start = offset; let type, size;
    [type, offset] = readInt(raw, offset); [size, offset] = readInt(raw, offset);
    if (size > raw.length - offset) throw new Error('truncated UMP payload');
    out.push({ type, data: raw.subarray(offset, offset + size), raw: raw.subarray(start, offset + size) });
    offset += size;
  }
  return out;
}
export function authenticate(ciphertext, iv, key) {
  if (key.length !== 32 || iv.length !== 16) throw new Error('invalid crypto parameters');
  return hmac(sha256, key.subarray(16), concat(ciphertext, iv));
}
export function decrypt(part, key) {
  if (part.hmac?.length !== 32 || !part.encryptedContent?.length || !equal(authenticate(part.encryptedContent, part.iv, key), part.hmac)) throw new Error('invalid HMAC');
  return ctr(key.subarray(0, 16), part.iv).decrypt(part.encryptedContent);
}
export function encrypt(plain, iv, key) {
  const encryptedContent = ctr(key.subarray(0, 16), iv).encrypt(plain);
  return { encryptedContent, iv, hmac: authenticate(encryptedContent, iv, key) };
}
function inflate(data, algorithm = 0) {
  if (algorithm > 1) throw new Error('unsupported compression');
  const gzip = data[0] === 31 && data[1] === 139;
  if (algorithm === 1 && !gzip) throw new Error('invalid gzip');
  if (!gzip) return { data, gzip: false };
  if (data.length < 18) throw new Error('invalid gzip');
  const size = new DataView(data.buffer, data.byteOffset + data.length - 4, 4).getUint32(0, true);
  if (size > LIMIT) throw new Error('inflated size limit');
  const out = gunzipSync(data);
  if (out.length > LIMIT) throw new Error('inflated size limit');
  return { data: out, gzip: true };
}
function replaceEncrypted(part, key, transform, algorithm) {
  const { data, gzip } = inflate(decrypt(part, key), algorithm);
  const output = transform(data);
  if (equal(data, output)) return null;
  return encrypt(gzip ? gzipSync(output, { level: 1, mtime: 0 }) : output, part.iv, key);
}
export function transformUmp(raw, key, cfg) {
  const parts = frames(raw); let previous, previousIndex, changed = false;
  const output = parts.map(p => p.raw);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.type === 10) { previous = Header.fromBinary(part.data); previousIndex = i; continue; }
    if (part.type !== 11 || !previous) continue;
    if (previous.type === 25) {
      const encrypted = core.encrypted.fromBinary(part.data);
      const fresh = replaceEncrypted(encrypted, key, plain => {
        const message = core.stream.fromBinary(plain);
        const before = core.stream.toBinary(message);
        for (const content of message.contents || []) {
          if (content.player) patchPlayer(content.player, cfg);
          if (content.next) patchMessage('next', content.next, cfg);
        }
        const result = core.stream.toBinary(message);
        return equal(result, before) ? plain : result;
      }, encrypted.compressionAlgorithm);
      if (fresh) { Object.assign(encrypted, fresh); output[i] = frame(11, core.encrypted.toBinary(encrypted)); changed = true; }
    } else if (previous.type === 0 && previous.cryptoParams) {
      const crypto = previous.cryptoParams;
      const fresh = replaceEncrypted({ encryptedContent: part.data, ...crypto }, key, plain => {
        const envelope = Envelope.fromBinary(plain);
        if ((envelope.status ?? 1) !== 1 || envelope.httpStatus !== 200 || !envelope.body) return plain;
        if (/^\s*\{/.test(text(envelope.body).slice(0, 40))) {
          const json = parseJson(text(envelope.body)), before = JSON.stringify(json);
          if (cfg.ads) cleanJsonAds(json); captions(json, cfg);
          const rendered = JSON.stringify(json);
          if (rendered === before) return plain;
          envelope.body = bytes(rendered);
        } else {
          const player = core.schemas.player.fromBinary(envelope.body), before = core.schemas.player.toBinary(player); patchPlayer(player, cfg);
          const result = core.schemas.player.toBinary(player);
          if (equal(result, before)) return plain;
          envelope.body = result;
        }
        return Envelope.toBinary(envelope);
      }, crypto.compressionType);
      if (fresh) {
        crypto.hmac = fresh.hmac;
        output[previousIndex] = frame(10, Header.toBinary(previous)); output[i] = frame(11, fresh.encryptedContent); changed = true;
      }
    }
    previous = undefined;
  }
  return changed ? concat(...output) : null;
}
