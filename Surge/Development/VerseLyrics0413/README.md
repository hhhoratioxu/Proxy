# VerseLyrics 0.4.13 — first-load allocation and Loon text transport

This release reduces first-invocation work as well as continuous-switch allocations. All six sequential fallback sources, strict recording matching, plugin translation replacement, original timestamps and the native highlight correction remain. Cache capacity, request/body limits, time budgets and admission rules are unchanged. Native adapter 10 retains each client's own configuration and binary output contracts.

## Changes

- Loon text-service GETs use its documented valid-UTF-8 string callback instead of forcing a binary body followed by JavaScript decoding. A strict UTF-8 sizing pass checks the same byte ceiling without allocating a byte buffer. Binary callbacks, including invalid UTF-8, still use the existing bounded reader and strict decoder. Spotify Protobuf metadata stays binary. Other clients retain their existing transport; this change does not assume they support Loon APIs.
- Official Protobuf lyric parsing retains the original byte view and word list instead of field objects with two views for every row. Translation replacement computes the final size and writes one output buffer. Original line/timestamp bytes, unknown fields and official colors are copied unchanged; all previous official alternative blocks are replaced at their original first position.
- The same 6,447 Unicode 17.0 Han mappings are packed by source/target plane with two UTF-16 units per record. Fixed-width binary lookup needs no expanded Map. Tables initialize only when a Han name needs matching. The generator and unchanged independent reference fixture are included; the full Unicode license remains in every lyric runtime.
- Entry-only bundles no longer construct unused HTTP closures or a text-reader method. Loon still uses native request-header rewrites and two response scripts. No prefetch, extra response hook, larger persistent cache, parallel network request or longer timeout is added.

Loon lyric script size is **88,444 B**, down from **92,820 B**. Its entry script is **27,987 B**, down from **28,061 B**. Request script size is 4,018 B; Loon does not load that script because its request stage uses native Rewrite.

The cache remains 128 entries / 64,000 serialized JSON UTF-16 characters. Lyric/entry input limits remain 256/128 KiB, typical source/translation responses 96 KiB, public embed 256 KiB, and a source chain twelve requests / 256 KiB. Two-active-job admission is advisory because native storage has no atomic locking. These limits do not cap a complete VPN process or native HTTP buffering. See [client contracts](CLIENT-CONTRACTS.md).

## Reproduce

Use Node 24, pnpm, Python 3 and Ruby:

```sh
pnpm install --frozen-lockfile --ignore-scripts
node generate-han-tables.mjs
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 731
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node native-first-load-bench.mjs /path/to/unchanged/0.4.12
node native-first-load-bench.mjs /path/to/unchanged/0.4.12 --sequence
node native-startup-bench.mjs /path/to/unchanged/0.4.12
node native-playlist-bench.mjs /path/to/unchanged/0.4.12
node official-wire-bench.mjs /path/to/unchanged/0.4.12/core/spotify-lyrics.js
node wire-bench.mjs /path/to/unchanged/0.4.12/core/spotify-lyrics.js
node live-loon-public-flow.mjs
node live-public-flow.mjs
node live-translation-batch.mjs
```

The zero pin is a test placeholder. Publication replaces it with the immutable runtime commit. Source/runtime artifacts live at that commit; main changes only the twelve established import/documentation files. Build-only Terser is pinned; runtime scripts require no external JavaScript library.

## Validation

**731 automated tests pass, zero failures or skips**, plus Egern YAML validation. Coverage includes all six sources, native five-client requests and overlap handling, Unicode and malformed/oversized native text, binary fallback, one-buffer official replacement, unknown-field preservation, 0–600-line wire fixtures, every Han mapping and sampled unmapped keys across planes, lazy initialization, cache merge/limits, timeouts, burst drain, batching/downgrade, translations and colors.

All performance figures below use Node 24.19 arm64 and mock native APIs. They are script/harness measurements, not phone timings or VPN-process peaks. Outputs are byte-hash matched with 0.4.12. No heap cap was raised: processes retain the 32 MiB old-space setting.

### First invocation

`native-first-load-results.json` contains twelve independent process trials per version/scenario, in alternating order: 240 fresh processes total. Each process runs exactly one fresh script/VM and no lyric/translation cache. This avoids retaining previous VM/code-cache work in a first-load comparison. Seeded fallback scenarios supply only metadata/palette as normally obtained by the player; empty scenarios start with no stored data and perform public metadata lookup. HTTP latency is zero. Heap growth is sampled from before compilation through HTTP/completion boundaries; it is not every allocation or a native-buffer measurement.

| First invocation | 0.4.12 median time | 0.4.13 median time | Heap growth before | Heap growth after |
| --- | ---: | ---: | ---: | ---: |
| Official English, 24 rows | 5.348 ms | 5.183 ms | 1,128,792 B | 867,184 B |
| Seeded fallback English, 24 rows | 6.836 ms | 6.796 ms | 1,222,224 B | 1,205,320 B |
| Official English, 48 rows | 5.760 ms | 5.541 ms | 966,928 B | 912,088 B |
| Seeded fallback English, 48 rows | 7.370 ms | 7.214 ms | 1,363,960 B | 1,345,488 B |
| Official English, 120 rows | 6.886 ms | 6.501 ms | 1,312,376 B | 1,199,152 B |
| Seeded fallback English, 120 rows | 8.975 ms | 8.341 ms | 1,572,320 B | 1,381,232 B |
| Official Chinese, 48 rows | 6.124 ms | 6.071 ms | 1,023,008 B | 946,168 B |
| Seeded fallback Chinese, 48 rows | 7.630 ms | 7.643 ms | 1,440,168 B | 1,423,968 B |
| Empty fallback English, 48 rows | 7.936 ms | 7.882 ms | 1,502,688 B | 1,399,336 B |
| Empty fallback Chinese, 48 rows | 8.454 ms | 8.106 ms | 1,659,456 B | 1,493,680 B |

Heap-growth medians decrease in all ten scenarios; process-peak medians also decrease. Time changes are modest, with seeded Chinese fallback effectively unchanged. No universal loading-time guarantee follows: service latency remains the largest factor for an uncached song.

Both earlier multi-VM cold harness reports are retained (`native-startup-results.json`, `native-cold-sequence-results.json`). Some whole-process peaks increase despite lower per-invocation growth, because these runs retain multiple unique scripts and VM/code-cache generations before engine GC. They must not be described as universal memory reductions. The first-invocation comparison above starts a new process per trial; the playlist and burst tests separately exercise sustained activity.

### Sustained and wire work

`native-playlist-results.json` exercises 120 changes across twelve songs, with metadata and lyric processing on each change, in both formats and all five clients. Loon schedules no timers in this uncontended test. All clients retain 36 HTTP requests for the cold songs and zero further requests on revisits; maximum HTTP concurrency is one per job.

| Loon 120 changes | 0.4.12 | 0.4.13 |
| --- | ---: | ---: |
| Protobuf elapsed | 226 ms | 224 ms |
| Protobuf sampled heap peak | 14,986,336 B | 13,127,520 B |
| Protobuf retained heap | 6,437,304 B | 6,398,064 B |
| JSON elapsed | 239 ms | 230 ms |
| JSON sampled heap peak | 15,146,856 B | 13,519,136 B |

The playlist report uses the final entry and lyric runtimes. Heap samples vary with engine GC; they do not establish a hard process-memory ceiling. All final outputs match the baseline in both formats.

`official-wire-results.json`: one 120-line official translation replacement goes from nine explicit typed-array constructions / 29,139 requested bytes to one / 7,873 bytes. Output remains exactly 7,873 bytes. Two hundred parse/replace cycles take 141.69 versus 103.12 ms. Constructor counting excludes engine-created views and other JS objects. Fallback encoding still uses the 0.4.12 exact output buffer and compact numeric sizing plan.

## Live public endpoint checks

On 2026-10-16 the compiled Loon runtime, under a mock host bridge with an empty cache and simulated Spotify 404, fetched 42 synced rows for 那页夏天 and 49 rows plus 49 plugin translations for Blinding Lights. Public metadata, source and translation requests were real; repeats used no HTTP. Loon text calls stayed sequential, completed before `$done`, and oversized LRCLIB search text was rejected at the existing limit. The Egern compiled module found the same two songs. Never Gonna Give You Up remained unmatched in its probe; coverage is not universal.

The public translation endpoint also accepted 64 synthetic original sentences in one HTTP 200 response. It is not an official paid Cloud Translation API contract; existing bounded downgrade handling is preserved. Reports store counts/status/timings only, not lyrics, private credentials or public-page session fields.

Native Spotify UI, phone memory, VPN stability and the previously reported Egern missing-lyrics behavior have not been verified on a device in this release.
