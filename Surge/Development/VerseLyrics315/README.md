# VerseLyrics 3.1.5

Five native Spotify lyric response rewriters. Core 3.1.5, adapter 15. Original code; see core/NOTICE-UNICODE.txt for the Unicode data license.

This release reduces temporary decoding, short protobuf-field and mixed-language classification work. A synchronous UTF-8 decoder reuses at most 4097 UTF-16 units (8194 bytes); returned strings do not alias it. Single-byte wire tags/lengths/values no longer allocate a varint result object. Lazy Latin/vocal scanners are reused synchronously and ordinary words reject impossible filler spellings before scanner-match allocation. Classifying a mixed row no longer builds a service query string.

It also corrects static lyric upgrades: a verified full artist name equivalent and explicit soundtrack suffix normalization resolve the provided 后会无期 case without relaxing artist, recording, album/duration or ambiguity guards. Same-source timed-only lookup continues after a plain first candidate, within the original budgets. Timed misses are separate from general no-lyric source records; old negative evidence is invalidated by source revision 7 while successful lyrics remain compatible. Multiple known LINE_SYNCED rows with all-zero timing also use the static upgrade path. See SOURCE-EVIDENCE.md for exact scope and primary references.

All 3.1.4 controls/behavior remain, including REPLACE_UNSYNCED (替换官方非同步歌词, default true), missing-lyric fallback, meaningful Chinese/English mixed translation, filler-only vocal suppression, simplified/traditional filtering, native color/timing preservation, preferred source, compact cache, artwork-color selection, offsets, fallback strategy and cache-only operation.

REPLACE_UNSYNCED=false preserves official static words even with a warm timed source cache. Completely missing lyrics and translations keep working independently. No matching timed source means original static words remain; no scrolling timestamps are invented.

## Build and verify

Use Node with the pinned Terser dependency in package.json/pnpm-lock.yaml. Install with pnpm install --frozen-lockfile. Run:

    node build.mjs
    python3 package.py RUNTIME_COMMIT_SHA TEST_COUNT
    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb

For measured comparisons, pass an unchanged 3.1.4 source/runtime stage:

    python3 run-measurements-315.py NODE_PATH BASELINE_314_STAGE

Reports preserve runtime hashes and use identical fixtures/codecs for both native versions. Downloaded third-party lyric text is never included in this source release; the focused live probe uses public Spotify metadata and QQ responses only in memory, and its official static input is self-written rather than captured phone traffic.

Loon minimum remains 3.5.1 (983), with its native Rewrite, two Response Scripts and typed plugin arguments. No new host API, timer, HTTP concurrency, cache capacity or service budget is introduced. Standard cache remains 128 entries/64000 serialized characters; compact 64/32000. Translation bounds remain 600 rows, 64 original rows per batch, 6800 URL characters, 96 KiB reply and a 2.5-second window. Source lookups retain the 12-request/256-KiB chain cap.

See MEASUREMENTS.md for complete improvements and regressions, and CLIENT-CONTRACTS.md for native limits. Desktop sampling and public service responses do not establish iPhone UI timing, native host buffers or VPN stability.
