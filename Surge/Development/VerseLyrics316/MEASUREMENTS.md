# VerseLyrics 3.1.6 measurements

Compiled native host mocks, desktop Node and macOS JSC sampling. Not actual iPhone Spotify UI, all transient allocations, native buffers or VPN acceptance. All final report regressions are retained; synthetic service latency is zero.

Final runtime SHA256 values are checked before and after each measurement step. Both versions use this same fixture codec, cache priming and native host harness; only their actual compiled runtimes differ. Deterministic allocation counters are separate from uninstrumented heap/timing runs.

## Actual work reduction

| Operation | 3.1.5 | 3.1.6 |
| --- | ---: | ---: |
| 128 plain indexed keys: JSON.parse calls | 131 | 3 |
| Unused cache: Map containers | 1 | 0 |
| Unused cache: WeakMap containers | 1 | 0 |

These are scoped cache-read/bookkeeping counts, not whole-process peaks. Saved values retain validation and escaped keys retain JSON.parse. Track/language fragments are lazily built once per cache view. The rejected range parser is absent; final 600-row byte-view counts remain the same as 3.1.5, with the established 8194-byte scratch limit.

## First load: fresh Node processes

Each table uses twelve alternating fresh-process trials per version/scenario, 32 MiB old-space, one script/VM per process. The matrix includes 24/48/120-row ordinary cases and four new 600-row cases covering English, Chinese translation, Chinese preservation and mixed fragments. The filled table starts with 48000-60000 unrelated serialized cache characters. Samples include compiler/code-cache/harness overhead at invocation, HTTP and completion boundaries. Heap growth is sampled peak minus pre-compilation heap, distinct from absolute process heap.

### native-first-load-results.json

408 fresh processes.

| Scenario | Baseline ms | Candidate ms | Time change | Absolute sampled heap change | Sampled heap-growth change |
| --- | ---: | ---: | ---: | ---: | ---: |
| official-en-24 | 7.371 | 7.334 | -0.502% | +0.007% | +0.037% |
| fallback-en-24 | 9.018 | 9.090 | +0.798% | -0.820% | -4.947% |
| official-en-48 | 7.918 | 7.658 | -3.284% | +0.007% | +0.036% |
| fallback-en-48 | 9.489 | 9.467 | -0.232% | +0.001% | -0.014% |
| official-en-120 | 8.354 | 8.755 | +4.800% | +0.007% | +0.027% |
| fallback-en-120 | 10.847 | 11.151 | +2.803% | +0.652% | +2.996% |
| official-zh-48 | 7.564 | 7.859 | +3.900% | +0.005% | +0.033% |
| fallback-zh-48 | 9.394 | 9.905 | +5.440% | +0.002% | +0.003% |
| empty-fallback-en-48 | 10.255 | 10.056 | -1.941% | +0.004% | +0.015% |
| empty-fallback-zh-48 | 9.964 | 9.952 | -0.120% | +0.004% | +0.012% |
| official-chorus-120 | 7.553 | 7.260 | -3.879% | +2.665% | +17.724% |
| official-mixed-48 | 12.849 | 12.301 | -4.265% | +0.006% | +0.019% |
| official-pure-zh-48 | 4.964 | 4.902 | -1.249% | -0.002% | -0.027% |
| official-en-600 | 15.709 | 15.882 | +1.101% | -0.085% | -0.236% |
| official-zh-600 | 13.525 | 13.858 | +2.462% | +0.014% | -0.032% |
| official-pure-zh-600 | 6.422 | 6.499 | +1.199% | +0.003% | +0.008% |
| official-mixed-600 | 26.090 | 25.639 | -1.729% | -0.018% | +0.167% |

### native-filled-first-load-results.json

408 fresh processes.

| Scenario | Baseline ms | Candidate ms | Time change | Absolute sampled heap change | Sampled heap-growth change |
| --- | ---: | ---: | ---: | ---: | ---: |
| official-en-24 | 7.864 | 7.646 | -2.772% | -0.159% | -0.848% |
| fallback-en-24 | 9.773 | 9.443 | -3.377% | -0.211% | -1.044% |
| official-en-48 | 8.250 | 8.678 | +5.188% | -0.266% | -1.317% |
| fallback-en-48 | 9.991 | 9.919 | -0.721% | -0.205% | -0.950% |
| official-en-120 | 9.139 | 9.718 | +6.335% | -0.104% | -0.419% |
| fallback-en-120 | 11.169 | 11.085 | -0.752% | -0.074% | -0.279% |
| official-zh-48 | 8.492 | 8.257 | -2.767% | -0.221% | -1.102% |
| fallback-zh-48 | 10.026 | 9.966 | -0.598% | -0.195% | -0.891% |
| empty-fallback-en-48 | 10.806 | 10.600 | -1.906% | -0.106% | -0.463% |
| empty-fallback-zh-48 | 10.743 | 10.636 | -0.996% | -0.209% | -0.925% |
| official-chorus-120 | 8.327 | 7.991 | -4.035% | -0.273% | -1.372% |
| official-mixed-48 | 13.225 | 14.026 | +6.057% | -0.248% | -0.970% |
| official-pure-zh-48 | 4.960 | 5.013 | +1.069% | -0.002% | -0.027% |
| official-en-600 | 14.527 | 14.318 | -1.439% | +0.069% | +0.188% |
| official-zh-600 | 14.174 | 14.536 | +2.554% | +0.118% | +0.425% |
| official-pure-zh-600 | 6.318 | 6.667 | +5.524% | -0.004% | +0.014% |
| official-mixed-600 | 26.298 | 27.841 | +5.867% | +0.348% | +1.031% |

## Loon repeated playlist comparison

Five alternating fresh process pairs for each of four cases, 40 processes. Plain: 240 cold songs and 720 HTTP calls. Mixed: 120 song IDs, 240 lyric responses and 120 HTTP calls including a zero-HTTP warm reopen per song. GC runs every six songs. Output hashes and request counts agree.

| Case | Format | Baseline ms | Candidate ms | Time change | Sampled heap change | Retained heap change |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| plain | json | 955.000 | 943.000 | -1.257% | -0.414% | +0.016% |
| plain | protobuf | 932.000 | 914.000 | -1.931% | -1.359% | +0.020% |
| mixed | json | 744.582 | 740.313 | -0.573% | +0.036% | +0.019% |
| mixed | protobuf | 709.312 | 705.620 | -0.521% | -0.202% | +0.015% |

The separate native-churn report keeps one functional baseline Loon run and all five candidate clients; the five-pair medians above give the repeated Loon comparison.

## macOS JavaScriptCore

Six alternating fresh-process trials per case/version. Cold uses one context; sequence uses 32 fresh contexts without forced GC. The range matrix additionally covers 600 English and Chinese rows, including removal of official translation alternatives without Chinese conversion. All output hashes, bytes and HTTP counts match between versions. Footprints include harness/JIT/allocator overhead.

| Mode | Scenario | Baseline ms | Candidate ms | Time change | Peak footprint change |
| --- | --- | ---: | ---: | ---: | ---: |
| cold | official-48-json | 10.729 | 11.116 | +3.602% | +0.000% |
| cold | official-48-protobuf | 9.547 | 9.317 | -2.404% | -0.111% |
| cold | official-120-protobuf | 11.018 | 11.246 | +2.069% | -0.209% |
| cold | lrclib-48-protobuf | 11.632 | 11.825 | +1.655% | -0.211% |
| cold | netease-half-48-protobuf | 16.581 | 15.883 | -4.210% | +0.104% |
| cold | entry-context-1 | 5.392 | 5.292 | -1.855% | -0.557% |
| cold | entry-connect-200 | 47.365 | 46.698 | -1.409% | +0.436% |
| cold | wire-context-200 | 21.933 | 22.627 | +3.164% | -0.243% |
| cold | official-48-current-cache | 9.145 | 9.167 | +0.246% | +0.000% |
| cold | fallback-disabled-48-current-cache | 7.646 | 7.377 | -3.512% | -0.572% |
| cold | official-120-current-cache | 10.252 | 10.609 | +3.477% | +0.206% |
| cold | official-48-unrelated-save | 11.796 | 11.986 | +1.606% | +0.463% |
| cold | mixed-cold-json | 11.883 | 12.587 | +5.920% | +0.210% |
| cold | mixed-stale-cache-json | 13.149 | 13.064 | -0.646% | +0.205% |
| cold | mixed-no-op-json | 11.810 | 10.802 | -8.539% | -0.326% |
| cold | mixed-dense-json | 20.280 | 19.474 | -3.979% | +0.267% |
| cold | mixed-cold-protobuf | 13.014 | 13.198 | +1.414% | +0.734% |
| cold | mixed-stale-cache-protobuf | 14.496 | 14.326 | -1.169% | +0.203% |
| cold | mixed-no-op-protobuf | 10.154 | 9.675 | -4.717% | +0.217% |
| cold | mixed-dense-protobuf | 16.300 | 16.133 | -1.025% | +0.090% |
| cold | range-en-600 | 22.065 | 22.204 | +0.630% | +3.893% |
| cold | range-han-600 | 13.697 | 13.704 | +0.047% | -0.224% |
| sequence | official-48-protobuf | 212.699 | 213.757 | +0.498% | +0.205% |
| sequence | netease-half-48-protobuf | 375.155 | 375.356 | +0.053% | +0.291% |
| sequence | mixed-cold-json | 301.974 | 299.249 | -0.903% | +0.200% |
| sequence | mixed-stale-cache-json | 330.094 | 329.385 | -0.215% | -0.197% |
| sequence | mixed-no-op-json | 243.370 | 244.353 | +0.404% | -0.102% |
| sequence | mixed-dense-json | 471.418 | 472.038 | +0.131% | +1.022% |
| sequence | mixed-cold-protobuf | 283.130 | 284.426 | +0.458% | -0.100% |
| sequence | mixed-stale-cache-protobuf | 318.400 | 316.702 | -0.534% | -0.395% |
| sequence | mixed-no-op-protobuf | 239.184 | 238.575 | -0.254% | +0.000% |
| sequence | mixed-dense-protobuf | 448.916 | 449.313 | +0.088% | +0.850% |
| sequence | range-en-600 | 642.279 | 641.501 | -0.121% | -1.788% |
| sequence | range-han-600 | 373.979 | 375.745 | +0.472% | +0.225% |

## Interpretation and retained behavior

These changes remove repeated allocations and parsing; they do not establish a universal timing or memory improvement. Ordinary first-load medians remain close to 3.1.5 and include slower cases. Playlist and JSC tables also contain both improvements and regressions. Differences of a few percent in millisecond cold processes should not be treated as reliable real-world network-latency gains. Reduced key parsing and unused containers are deterministic, but absolute process peaks include much larger common runtime costs. The range-parser prototype was rejected after repeatable filled-cache mixed-row heap growth; its reduced view counts are not a shipped improvement.

Loon lyric runtime grows from 90439 to 90477 bytes; Loon entry from 30605 to 30643 bytes. Every compiled lyric script remains below 100000 bytes and every entry below 32000 bytes. No cache, body, timeout, request or concurrency limit grows.

- 1741 automated tests pass, 7 new since 3.1.5; native Egern YAML validation passes.
- Twenty client/format/cache-mode mixed playlists produce 4800 native lyric responses. Warm reopen HTTP remains zero, with at most one service request active.
- Sixteen rapid-arrival processes keep at most two live script invocations, one active HTTP request and zero admission timers in the fixture; retired callbacks settle before completion. Admission uses synchronous non-atomic native storage, so these mock counts are not a native concurrency guarantee.
- Sixty compiled native feature invocations preserve missing fallback, static replacement on/off, mixed-English translation, Chinese shape, filler filtering, colors and existing cache bounds.
- Source matching/revision behavior from 3.1.5 remains covered, including the previously supplied static case. No new live catalog-coverage or phone UI claim is made in 3.1.6.

## Reproduction

Use README.md commands with an unchanged 3.1.5 stage. run-measurements-316.py records runtime hashes and runs measurements serially. The full JSON reports contain every trial in the final matrix. The matrix includes 600-row first loads and filled caches because they exposed a prototype regression. Pilot reports and pilot-core.diff retain the rejected evidence separately. Final reports use the revised runtime hashes. Pure function instrumentation is in reproduce-316-work.mjs. No third-party lyric text is needed for these fixtures. No desktop result measures iPhone host response buffers or proves VPN stability.
