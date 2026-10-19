# VerseLyrics 3.1.5 measurements

Real service source checks, compiled native host mocks, desktop Node and macOS JSC sampling. Not actual iPhone Spotify UI, every allocation, native buffers or VPN acceptance. All regressions are retained; synthetic service latency is zero.

The final runtime hashes are checked before and after every measurement step. The same fixture codec and host harness are used for both versions; only the compiled native runtime differs. Source/decoder work instrumentation is separate from uninstrumented heap/timing runs.

## Actual work reduction

| Operation | 3.1.4 | 3.1.5 |
| --- | ---: | ---: |
| 600-row generic varint result objects | 3612 | 601 |
| 600-row UTF-16 scratch allocations | 600 | 1 |
| Cumulative scratch bytes in that parse | 43200 | 72 |
| Mixed cold query strings constructed | 145 | 48 |
| Mixed cold Latin scanner objects | 193 | 1 |
| Mixed warm query strings constructed | 97 | 0 |

Both mixed cases still use one cold HTTP request with one deduplicated q and zero warm HTTP. The 43,200-to-72 byte row is cumulative scratch allocation in one deterministic 600-row parse, not whole-process peak memory. The reusable scratch is capped at 8,194 bytes and strings do not alias it.

## First load: fresh Node processes

Each table has twelve alternating trials per version and scenario (312 processes). One fresh native script/VM per child, 32 MiB old-space. Samples at invocation, HTTP and completion boundaries include common harness/code-cache overhead; they are not all transient peaks or actual network waiting time. The filled-cache table starts with 48,000-60,000 unrelated serialized characters.

### native-first-load-results.json

| Scenario | Baseline ms | Candidate ms | Time change | Sampled heap change |
| --- | ---: | ---: | ---: | ---: |
| official-en-24 | 8.321 | 7.213 | -13.316% | -0.874% |
| fallback-en-24 | 9.923 | 8.980 | -9.503% | -0.276% |
| official-en-48 | 8.622 | 7.647 | -11.308% | -0.595% |
| fallback-en-48 | 10.446 | 9.489 | -9.161% | -0.392% |
| official-en-120 | 9.861 | 8.470 | -14.106% | -1.344% |
| fallback-en-120 | 11.692 | 10.539 | -9.861% | -0.604% |
| official-zh-48 | 8.186 | 7.646 | -6.597% | -0.433% |
| fallback-zh-48 | 10.140 | 9.420 | -7.101% | +0.126% |
| empty-fallback-en-48 | 11.156 | 9.917 | -11.106% | -0.416% |
| empty-fallback-zh-48 | 10.418 | 9.875 | -5.212% | +0.125% |
| official-chorus-120 | 8.832 | 7.473 | -15.387% | +3.092% |
| official-mixed-48 | 13.772 | 12.271 | -10.899% | -2.119% |
| official-pure-zh-48 | 5.347 | 4.925 | -7.892% | -0.531% |

### native-filled-first-load-results.json

| Scenario | Baseline ms | Candidate ms | Time change | Sampled heap change |
| --- | ---: | ---: | ---: | ---: |
| official-en-24 | 9.739 | 8.527 | -12.445% | -0.305% |
| fallback-en-24 | 11.487 | 10.245 | -10.812% | -0.242% |
| official-en-48 | 10.068 | 8.723 | -13.359% | -0.522% |
| fallback-en-48 | 11.856 | 10.797 | -8.932% | -1.749% |
| official-en-120 | 11.414 | 9.933 | -12.975% | -0.178% |
| fallback-en-120 | 13.143 | 11.980 | -8.849% | -0.113% |
| official-zh-48 | 9.633 | 9.141 | -5.107% | -2.654% |
| fallback-zh-48 | 11.971 | 10.550 | -11.870% | +0.112% |
| empty-fallback-en-48 | 12.485 | 11.492 | -7.954% | -0.117% |
| empty-fallback-zh-48 | 11.948 | 11.042 | -7.583% | +0.134% |
| official-chorus-120 | 9.981 | 8.584 | -13.997% | -0.241% |
| official-mixed-48 | 15.291 | 13.812 | -9.672% | -2.821% |
| official-pure-zh-48 | 5.571 | 5.123 | -8.042% | -0.503% |

## Loon repeated playlist comparison

Five alternating fresh process pairs for each of the four cases (40 processes). Plain cases contain 240 cold songs and 720 HTTP calls; mixed cases contain 120 song IDs, 240 lyric responses and 120 HTTP calls, including a zero-HTTP warm reopen for every song. Both versions use the same codec and cache priming. GC runs every six songs. Output hashes and request counts agree.

| Case | Format | Baseline ms | Candidate ms | Time change | Sampled heap change | Retained heap change |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| plain | json | 1023.000 | 1016.000 | -0.684% | -1.212% | +0.111% |
| plain | protobuf | 1003.000 | 995.000 | -0.798% | -0.089% | +0.108% |
| mixed | json | 965.989 | 833.103 | -13.756% | -1.568% | +0.196% |
| mixed | protobuf | 858.101 | 795.394 | -7.308% | -1.747% | +0.111% |

The separate native-churn report retains a single functional run for baseline Loon and all five candidate clients. Use the five-pair medians above for the repeated Loon comparison; no individual outlier is discarded.

## macOS JavaScriptCore

Six alternating fresh-process trials per case/version (360 processes). Cold uses one context; sequence uses 32 fresh contexts without forced GC. Reported physical footprints include harness/JIT/allocator costs. All native output byte hashes and HTTP counts match between versions.

| Mode | Scenario | Time change | Peak footprint change |
| --- | --- | ---: | ---: |
| cold | official-48-json | -2.752% | +0.109% |
| cold | official-48-protobuf | +1.785% | -0.219% |
| cold | official-120-protobuf | -0.628% | -0.105% |
| cold | lrclib-48-protobuf | +2.671% | +0.954% |
| cold | netease-half-48-protobuf | +0.045% | +0.104% |
| cold | entry-context-1 | -6.594% | +0.000% |
| cold | entry-connect-200 | +0.296% | -0.645% |
| cold | wire-context-200 | -13.032% | -7.046% |
| cold | official-48-current-cache | -4.204% | -0.214% |
| cold | fallback-disabled-48-current-cache | +2.201% | +0.688% |
| cold | official-120-current-cache | +6.383% | -7.939% |
| cold | official-48-unrelated-save | -1.561% | -0.092% |
| cold | mixed-cold-json | +11.351% | -0.417% |
| cold | mixed-stale-cache-json | -2.415% | -9.444% |
| cold | mixed-no-op-json | +0.501% | -0.432% |
| cold | mixed-dense-json | -3.821% | +0.892% |
| cold | mixed-cold-protobuf | -2.243% | -1.650% |
| cold | mixed-stale-cache-protobuf | -13.367% | -0.998% |
| cold | mixed-no-op-protobuf | +0.816% | -0.536% |
| cold | mixed-dense-protobuf | -7.211% | +0.089% |
| sequence | official-48-protobuf | -0.538% | +0.409% |
| sequence | netease-half-48-protobuf | +0.196% | -0.289% |
| sequence | mixed-cold-json | -0.481% | -0.099% |
| sequence | mixed-stale-cache-json | -3.509% | -8.445% |
| sequence | mixed-no-op-json | +0.644% | -0.102% |
| sequence | mixed-dense-json | -4.532% | -0.083% |
| sequence | mixed-cold-protobuf | +5.184% | -0.396% |
| sequence | mixed-stale-cache-protobuf | -2.653% | -6.549% |
| sequence | mixed-no-op-protobuf | -0.828% | -0.101% |
| sequence | mixed-dense-protobuf | -6.023% | +0.419% |

There are regressions as well as improvements in these tables, including a roughly 3.1% sampled Node heap increase in the cold repeated-chorus case and some JSC time/footprint increases. Runtime bytes also grow: Loon lyrics 89,305 to 90,439 bytes, entry 30,410 to 30,605. Smaller allocation counts do not prove every process peak or device wait decreases.

## Preserved behavior, rapid arrivals and real source check

- 1,734 automated tests pass, including 51 new cases. Egern native YAML checks pass.
- Twenty client/format/cache-mode mixed playlists produce 4,800 native responses; warm reopen HTTP remains zero and at most one service request is active.
- Sixteen rapid-arrival processes retain at most two live invocations, one active HTTP request and zero admission timers in the fixture. Retired callbacks settle before completion. These counts are mocks, not an atomic native storage guarantee.
- Sixty compiled native feature invocations preserve static replacement on/off, missing fallback, filler filtering, useful mixed-English translation, colors and the existing cache limits.
- For the supplied track, real public Spotify metadata and QQ catalog/lyric responses reproduce the old mismatch. Baseline 3.1.4 keeps the self-written static fixture; 3.1.5 obtains 65 real timed rows in two QQ requests. Ten native replays preserve those replies and reuse warm lyrics without requests. The static input is a fixture, not captured Spotify phone traffic. Translation is disabled only in this focused source probe. Downloaded lyric text is excluded from the release; counts/hashes are in user-track-live-results.json.

## Rejected experiment

A strict JavaScript scanner for opaque cache values was tried and removed. Some filled-cache samples allocated less, but playlist processing became substantially slower and entry scripts exceeded the existing size budget. The final runtime hashes match the pre-experiment verified parser; the slower scanner is not shipped.

## Reproduction

Run the commands in README.md with an unchanged 3.1.4 stage. run-measurements-315.py records all final runtime SHA256 values and runs each measurement serially. The full JSON reports preserve individual trials. First-load and paired playlist timing are desktop script processing with zero service latency. iPhone Spotify UI, native response buffers and VPN stability have not been measured.
