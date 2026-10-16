# VerseLyrics 0.6.1

切换 auto 与指定歌词源时，同一首歌已验证且未过期的成功缓存可直接复用，避免重复搜索和下载；固定来源仅复用该来源的歌词，不共享失败缓存、不延长有效期。新增 PREFERRED_SOURCE，默认 auto 保持自动排序；用户可选择优先尝试哪一家，仍保留其他来源兜底。

This release follows 0.6.0. The five native imports are built from the same core. No host API, concurrent HTTP slot, polling queue, prefetch, or diagnostic notification is added. Original lyrics, timestamps and complete plugin-owned translation replacement remain. The source/runtime commit is immutable; the following production commit updates the existing five import URLs and documentation only.

## Validation

989 automated tests pass. Native harnesses execute the packaged Loon, Egern, Surge, Shadowrocket and Quantumult X scripts. Test fixtures contain original synthetic lyrics and fake test credentials only. These tests do not establish native iPhone behavior or Loon VPN stability. Loon persistent storage has no atomic compare-and-swap; native transport/body buffers are outside JavaScript memory accounting. A busy uncached request can still remain unchanged until a later Spotify request; no automatic retry is scheduled.

```sh
node build.mjs
python3 package.py <runtime-commit-sha> 989
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
```

Node and pinned Terser 5.51.2 are build-time dependencies. See CLIENT-CONTRACTS.md for client API references. Loon HTTP completion occurs before the single done callback; no unsupported Loon engine, max-size or cancellation parameter is used. The single sequential network lane, 12 source requests / 256 KiB combined source response budget, 96 KiB service-response limit and 256 KiB lyric-input limit remain.

## Actual changes in this series

- 0.5.4: selective track metadata decoding with lazy edit fields; large audio/catalog fields stay opaque. No cache growth. A separate cache-scanning experiment was rejected because it increased latency.
- 0.6.0: on-demand translation batch construction; no eager nested batch list, no second translated-values array. The 64-row / 6800-character URL bounds and one downgrade to 32 rows remain.
- 0.6.1: compatible same-track successful cache reuse across source modes, with strict provider/expiry checks and no duplicate cache entry; optional source priority preserves fallback to all other sources.

Source preference changes search order only and never bypasses identity/version checks. No source can provide songs it does not hold, and client lyric entry requests remain required.

## Measurements and evidence boundaries

Five packaged-client tests switch from a populated NetEase cache to auto and verify byte-identical lyrics/translation with zero network calls, no TTL extension and no extra saved record. Preference tests exercise six priorities without reducing the fallback set. Cold/runtime and burst results for the complete series will accompany 0.7.0. No fresh real-service or device-performance claim is made.

The Unicode Unihan license is retained in NOTICE-UNICODE.txt and all applicable runtime files. No runtime JavaScript dependency is downloaded beyond the pinned plugin scripts.

Cross-source reuse in auto mode accepts only LINE_SYNCED caches. Plain text from a fixed source never prevents a fresh search for real timestamps.
