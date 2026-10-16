# VerseLyrics 0.7.1 measurement record

Compared with unchanged 0.7.0. All measurements use synthetic original text and mocked network responses. They do not measure real service latency, mobile bridge buffering or an iPhone VPN process. Peak samples include the harness, engine and allocator; they are not just plugin object sizes.

## Tests and exact runtime

1,059 tests pass. All 16 runtime SHA-256 values are in bench-runtime-sha256.json. The sequential wrapper checks those bytes before/after each phase. JSC and burst runs record their runtime hash. No runtime was rebuilt during the final measurement run.

## macOS JavaScriptCore

45 cold cases and six repeated cases, six fresh processes per version/case (612 processes). Repeated cases create 32 fresh context groups each. Bodies/request counts match. There is no forced GC. The C harness samples footprint at setup, execution, callback and completion boundaries and records OS max RSS.

| Case | 0.7.0 sampled footprint | 0.7.1 sampled footprint | 0.7.0 time | 0.7.1 time |
| --- | ---: | ---: | ---: | ---: |
| official-48-current-cache | 7.126 MiB | 6.954 MiB | 7.902 ms | 8.091 ms |
| fallback-disabled-48-current-cache | 6.704 MiB | 6.626 MiB | 6.718 ms | 6.999 ms |
| official-120-current-cache | 7.422 MiB | 7.282 MiB | 9.157 ms | 8.790 ms |
| fallback-disabled-120-current-cache | 6.797 MiB | 6.688 MiB | 7.437 ms | 7.212 ms |
| metadata-batch-50 | 7.219 MiB | 7.227 MiB | 12.517 ms | 11.802 ms |
| metadata-batch-100 | 8.196 MiB | 8.219 MiB | 20.542 ms | 18.354 ms |

The official-cache fixtures retain previous fallback rows and another target language for the same track. Decoded record text falls from 42,454 to 1,998 characters (48 original rows), and 45,374 to 4,918 (120 rows). Both versions perform zero HTTP and return identical bodies. This is a parser-work reduction, not a 90% whole-process memory reduction. The smaller cache-hit case is slightly slower in this sample; improvements are not universal.

The first six-trial metadata-1000 result was +3.60% sampled footprint with nearly unchanged RSS. It therefore did not pass the initial 3% gate. To examine variance, one fixed extension added exactly 24 alternating fresh-process trials per version, retaining all original trials and unchanged fixture/runtime bytes. Across all 30, the median delta is +1.30% (baseline 9.008 MiB, candidate 9.126 MiB). Original and extended results are both published. Do not read this as zero regression or a universal cold-load memory reduction.

Using that combined estimate for metadata-1000, the aggregate sampled-footprint range across the matrix is -2.41% to +1.31%, within the 3% engineering tolerance. See jsc-memory-results.json and jsc-metadata-repeat-results.json. The repeat script is reproducible as: python3 jsc-metadata-repeat.py /path/to/0.7.0.

## Cold and populated-cache Node checks

Ten cases per version in twelve independent 32 MiB old-space Node processes each. Empty cases start with no lyric/translation cache; metadata/palette are only supplied where declared. Filled-cache cases start with 48,000–60,000 unrelated cache characters. Output hashes and HTTP counts match.
- native-first-load-results.json: sampled peak heap median deltas -0.069% to +0.133%.
- native-filled-first-load-results.json: sampled peak heap median deltas +0.099% to +0.188%.

These small changes are effectively flat at this measurement precision. Forced GC precedes each Node invocation; V8 heap values are not comparable to JSC footprint or iOS VPN memory.

## Switching and overlapping requests

All five candidate clients, JSON and Protobuf, plus baseline Loon in both formats: 240 distinct tracks and 720 mocked HTTP calls per case. A GC occurs every six changes. Bodies match, every script completes, and each case peaks at one active HTTP request. The Egern adapter returns an awaited value; its completionCalls count is zero because it does not use $done. Other adapters verify one completion per invocation. This checks bounded churn, not real network speed.

Four trials per version for same-track and different-track Loon bursts: 60 arrivals spaced 2 ms, callbacks delayed 400 ms. Both versions peak at two unfinished invocations and one HTTP, with no admission timers. The settled track is explicitly requested again and still returns translations. Contention remains an intentional pass-through/retry-later tradeoff. There is no new claimed concurrency improvement.

Compact mode: six cold JSC trials for each of three cases; the same output and HTTP counts, all sampled-footprint medians within the 3% comparison tolerance. Small-cache records may still be evicted earlier, and a long record may not be saved.

## Optional offset and limits

Five compiled clients and both formats verify positive, negative and zero correction, zero HTTP on cached repeats, unchanged stored timestamps, preserved aligned translations, and no cumulative shift. Tests also cover invalid inputs, UNSYNCED lyrics and untouched official timing/syllables. Correction is applied only when enabled; JSON/Protobuf projection is limited to the existing 600-row cap.

An experimental reusable varint cursor and earlier inline offset encoder were not shipped: the large synthetic metadata case had worse JSC footprint. Final code keeps the established varint reader and default encoder, isolates optional correction, and removes the identity-only metadata field getter. No undocumented Loon memory, engine or cancellation option is added.
