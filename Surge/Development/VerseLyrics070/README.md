# VerseLyrics 0.7.0

新增 MEMORY_MODE=compact，把缓存上限从 128 条 / 64,000 UTF-16 字符减为 64 条 / 32,000 字符，旧缓存会在下一次写入时按新上限收敛。默认 standard 保持现有行为。新增 FETCH_ARTWORK_COLOR，默认开启；关闭时仍可复用已有有效配色，无配色则使用经过对比度校验的中性灰，省去额外取色页面下载。歌曲身份元数据查询、六源补词、翻译和高亮保留；紧凑模式可能更早淘汰旧歌缓存，回听旧歌可能需要重新查询。

This release follows 0.6.1. The five native imports are built from the same core. No host API, concurrent HTTP slot, polling queue, prefetch, or diagnostic notification is added. Original lyrics, timestamps and complete plugin-owned translation replacement remain. The source/runtime commit is immutable; the following production commit updates the existing five import URLs and documentation only.

## Validation

1010 automated tests pass. Native harnesses execute the packaged Loon, Egern, Surge, Shadowrocket and Quantumult X scripts. Test fixtures contain original synthetic lyrics and fake test credentials only. These tests do not establish native iPhone behavior or Loon VPN stability. Loon persistent storage has no atomic compare-and-swap; native transport/body buffers are outside JavaScript memory accounting. A busy uncached request can still remain unchanged until a later Spotify request; no automatic retry is scheduled.

```sh
node build.mjs
python3 package.py <runtime-commit-sha> 1010
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
```

Node and pinned Terser 5.51.2 are build-time dependencies. See CLIENT-CONTRACTS.md for client API references. Loon HTTP completion occurs before the single done callback; no unsupported Loon engine, max-size or cancellation parameter is used. The single sequential network lane, 12 source requests / 256 KiB combined source response budget, 96 KiB service-response limit and 256 KiB lyric-input limit remain.

## Actual changes in this series

- 0.5.4: selective track metadata decoding with lazy edit fields; large audio/catalog fields stay opaque. No cache growth. A separate cache-scanning experiment was rejected because it increased latency.
- 0.6.0: on-demand translation batch construction; no eager nested batch list, no second translated-values array. The 64-row / 6800-character URL bounds and one downgrade to 32 rows remain.
- 0.6.1: compatible same-track successful cache reuse across source modes, with strict provider/expiry checks and no duplicate cache entry; optional source priority preserves fallback to all other sources.
- 0.7.0: selectable 64-record / 32,000 UTF-16-character compact cache and opt-out of extra artwork-page downloads. Defaults retain 128 records / 64,000 characters and artwork fetching. Compact mode can evict older songs sooner; its per-record limit is 16,000 serialized characters rather than 32,000, so a larger record may not be cached. Lyrics and translations are still returned. Artwork opt-out still needs metadata requests when identity is unknown and can reuse existing colors.

Source preference changes search order only and never bypasses identity/version checks. No source can provide songs it does not hold, and client lyric entry requests remain required.

## Measurements and evidence boundaries

The complete series is compared with unchanged 0.5.3. See MEASUREMENTS.md and the complete JSON reports for cold, populated-cache, serial five-client switching and overlapping-callback results. The optional controls have separate source and packaged five-client tests.

The Unicode Unihan license is retained in NOTICE-UNICODE.txt and all applicable runtime files. No runtime JavaScript dependency is downloaded beyond the pinned plugin scripts.

## Published predecessor releases

- [0.5.4 production commit](https://github.com/hhhoratioxu/Proxy/commit/2e617eb2b50e969d9117fb334e98095cbc7614d7) — [source and tests](https://github.com/hhhoratioxu/Proxy/tree/c5e05357633ea4d78bbd023f080388ea1d901b25/Surge/Development/VerseLyrics054).
- [0.6.0 production commit](https://github.com/hhhoratioxu/Proxy/commit/aa21549b4f72f62b4a616a7d1ec4a1d048c3b423) — [source and tests](https://github.com/hhhoratioxu/Proxy/tree/d67194ad204b6545997d2d07a5785323ff7e3e10/Surge/Development/VerseLyrics060).
- [0.6.1 production commit](https://github.com/hhhoratioxu/Proxy/commit/6f9a12d5ba80ea5bb9ec2e4f195f2ab84a2587f8) — [source and tests](https://github.com/hhhoratioxu/Proxy/tree/49ae0d505c4b9dd32caa8a7d270d6a608f0b7439/Surge/Development/VerseLyrics061).
