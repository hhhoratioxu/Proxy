# VerseLyrics 1.0.0 measurement record

Baseline: unchanged 0.7.1. All text is synthetic and HTTP is mocked. The tests do not measure real provider latency, iPhone native buffering or VPN termination. A version number does not establish physical-device acceptance.

## Exact bytes and tests

1,094 automated tests pass. bench-runtime-sha256.json covers all sixteen final resources. The sequential wrapper checked these bytes before and after every benchmark phase. No final runtime was rebuilt during measurement.

## macOS JavaScriptCore

55 cold scenarios and six repeated-context scenarios; eight alternating fresh-process trials per version/scenario, 976 processes total. Repeated scenarios use 32 distinct context groups per process. No forced GC. Footprint includes harness, engine and allocator and is sampled at execution/callback/completion boundaries. Every baseline/candidate body fingerprint and HTTP count matches in this default-mode matrix.

| Scenario | 0.7.1 footprint | 1.0.0 footprint | 0.7.1 time | 1.0.0 time |
| --- | ---: | ---: | ---: | ---: |
| extended-lookup-10 | 7.610 MiB | 7.547 MiB | 11.052 ms | 10.555 ms |
| extended-lookup-50 | 8.126 MiB | 8.063 MiB | 16.351 ms | 13.186 ms |
| extended-lookup-100 | 9.376 MiB | 8.829 MiB | 21.335 ms | 16.220 ms |
| retired-catalog-90000 | 6.790 MiB | 6.563 MiB | 10.891 ms | 6.760 ms |
| official-48-protobuf | 6.860 MiB | 6.891 MiB | 7.794 ms | 7.894 ms |
| official-120-protobuf | 7.087 MiB | 7.118 MiB | 9.086 ms | 9.162 ms |
| metadata-1000 | 9.962 MiB | 9.446 MiB | 18.197 ms | 18.224 ms |
| kugou-catalog-120 | 7.751 MiB | 7.751 MiB | 14.677 ms | 15.000 ms |
| kuwo-catalog-120 | 7.704 MiB | 7.719 MiB | 13.800 ms | 13.934 ms |
| lyricsovh-catalog-120 | 7.665 MiB | 7.672 MiB | 13.556 ms | 13.608 ms |

Across all 61 comparisons, sampled-peak median changes range from -5.83% to +0.51%. All fall within the existing 3% engineering tolerance; that tolerance is not a Loon memory limit. The retired-catalog fixture decodes 90,021 catalog characters in 0.7.1 and zero in 1.0.0. Neither version launches another transport. The three compacted provider frames show small mixed peak/time changes; no universal memory or speed improvement is claimed.

## Fresh and populated-cache Node processes

Each of ten cases runs twelve independent 32 MiB old-space processes per version. A GC occurs before each invocation; no VM or process is reused. Populated-cache cases contain 48,000–60,000 unrelated cache characters. Output hashes and HTTP counts match.
- native-first-load-results.json: sampled heap median changes +0.141% to +0.249%.
- native-filled-first-load-results.json: sampled heap median changes +0.126% to +0.208%.

These small positive differences are retained in the evidence. Ordinary cold-load memory is effectively similar at this precision, not a demonstrated overall reduction.

## Switching and overlap

Ten candidate cases cover all five clients and both formats; baseline Loon adds two comparisons. Each case switches through 240 tracks, makes 720 mocked HTTP calls, and peaks at one active transport. Cache stays within 64,000 characters. A GC occurs every six changes. Egern completes by returning awaited values and therefore records zero $done calls; other clients verify every completion. This is a bounded churn check, not a network-speed test.

Four trials per version and burst type send 60 arrivals spaced 2 ms with callbacks delayed 400 ms. Both versions peak at two unfinished invocations and one HTTP; no admission timers. In different-track bursts, 1.0.0 intentionally skips the retired first response translation, whereas 0.7.1 completed it. A later explicit request for the settled track returns translations in both. No automatic retry or improved concurrency bound is claimed.

Compact mode uses six fresh processes for each of three scenarios; output fingerprints and request counts match standard mode. Peak medians remain within 3%. A smaller cache can evict old songs earlier; it is not an assurance of lower first-invocation native memory.

## Optional fast strategy

Five compiled adapters and both formats verify first verified plain results, translations, cache hits with zero HTTP, mode changes that allow synchronization upgrades, default behavior for invalid values, and bounded storage. The default matrix above does not turn fast mode on. Fast mode changes the deliberate timing/lookup tradeoff; it does not invent timestamps or widen identity matching.

## Reproduction

Follow README.md. jsc-release-fixtures.mjs adds the new scenarios to the existing cold/cache matrix. The raw JSON reports contain every trial; measurements were not selectively rerun or discarded.
