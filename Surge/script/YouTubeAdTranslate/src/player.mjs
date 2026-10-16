// Copyright 2026 Horatio Xu. Apache-2.0.
import core from '../vendor/maasea-core.mjs';
import { TIMEDTEXT, query, equal } from './common.mjs';

function walk(root, visit) {
  const queue = [root]; let remaining = 30000;
  while (queue.length) {
    if (--remaining < 0) throw new Error('structure limit');
    const item = queue.pop();
    if (!item || typeof item !== 'object') continue;
    visit(item);
    for (const value of Object.values(item)) if (value && typeof value === 'object') queue.push(value);
  }
}
export function captions(root, cfg) {
  if (!cfg.translate) return;
  walk(root, container => {
    const tracks = container.captionTracks;
    if (!Array.isArray(tracks) || !tracks.length || tracks.length > 100) return;
    if (tracks.some(t => String(t.vssId || '').startsWith('.horatio.'))) return;
    const sources = tracks.filter(t => t.languageCode !== cfg.lang && TIMEDTEXT.test(t.baseUrl || ''));
    const source = sources.find(t => t.languageCode === 'en') || sources[0];
    if (!source) return;
    const label = cfg.lang === 'zh-Hans' ? '简体中文' : cfg.lang === 'zh-Hant' ? '繁體中文' : cfg.lang;
    const translated = {
      ...source, baseUrl: query(source.baseUrl, 'tlang', cfg.lang), languageCode: cfg.lang,
      vssId: '.horatio.' + cfg.lang, isTranslatable: true,
      name: { runs: [{ text: (cfg.bilingual ? '双语字幕 · ' : '翻译字幕 · ') + label }] }
    };
    const index = tracks.push(translated) - 1;
    if (cfg.autoCC) container.defaultCaptionTrackIndex = index;
    for (const track of tracks) track.isTranslatable = true;
    for (const audio of container.audioTracks || []) {
      if (!Array.isArray(audio.captionTrackIndices)) audio.captionTrackIndices = [];
      if (!audio.captionTrackIndices.includes(index)) audio.captionTrackIndices.push(index);
      if (cfg.autoCC) { audio.defaultCaptionTrackIndex = index; audio.captionsInitialState = 3; }
    }
  });
}
const AD_RENDERERS = new Set(['adSlotRenderer', 'displayAdRenderer', 'promotedSparklesWebRenderer', 'promotedSparklesTextSearchRenderer', 'inFeedAdLayoutRenderer', 'promotedVideoRenderer', 'compactPromotedVideoRenderer', 'searchPyvRenderer', 'adsEngagementPanelContentRenderer']);
function adItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (Object.keys(item).some(k => AD_RENDERERS.has(k))) return true;
  const content = item.richItemRenderer?.content;
  return !!content && Object.keys(content).some(k => AD_RENDERERS.has(k));
}
export function cleanJsonAds(root) {
  walk(root, item => {
    for (const key of ['adPlacements', 'adSlots', 'playerAds']) if (Array.isArray(item[key])) item[key] = [];
    if (item.playbackTracking) delete item.playbackTracking.pageadViewthroughconversion;
    for (const [key, value] of Object.entries(item)) if (Array.isArray(value)) item[key] = value.filter(x => !adItem(x));
  });
}
export function patchPlayer(message, cfg) {
  if (cfg.ads) core.removePlayerAds(message);
  captions(message, cfg);
}
export function patchMessage(endpoint, message, cfg) {
  if (endpoint === 'player') patchPlayer(message, cfg);
  else if (endpoint === 'get_watch') {
    for (const content of message.contents || []) {
      if (content.player) patchPlayer(content.player, cfg);
      if (content.next && cfg.ads) prune(content.next);
    }
  } else if (['browse', 'next', 'search'].includes(endpoint) && cfg.ads) prune(message);
  else if (endpoint === 'reel_watch_sequence' && cfg.ads && Array.isArray(message.entries)) {
    message.entries = message.entries.filter(entry => !entry.command?.reelWatchEndpoint?.adClientParams?.isAd);
  }
}
function prune(message) {
  core.prune(message, { whiteNo: [], blackNo: [], whiteEml: [], blackEml: ['inline_injection_entrypoint_layout.eml'], dirty: false });
}
export function transformProto(endpoint, raw, cfg) {
  const codec = core.schemas[endpoint]; if (!codec) return null;
  const message = codec.fromBinary(raw);
  const before = codec.toBinary(message);
  patchMessage(endpoint, message, cfg);
  const output = codec.toBinary(message);
  return equal(output, before) ? null : output;
}
export { core };
