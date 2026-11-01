# VerseLyrics 3.2.1 measurements

Measured 2026-11-01 on macOS arm64, Node v24.22.1 and the macOS public JavaScriptCore C API. Baseline is immutable 3.2.0 source/runtime commit c6ccfb93c1fb8e1140d5bd69d3b54f0a9f6e9e78. Runtime hashes are frozen in bench-runtime-sha256.json and matched before/after every stage. All lyrics are self-written fixtures, all HTTP responses are mocks. This is not captured Spotify scheduling, native iPhone memory, device UI or VPN stability acceptance. No phone termination record was obtained.

2214 regression tests pass, including 43 new local-flow tests and revised five-client language-policy cases. Functional verification covers 60 native feature invocations and 4800 lyric responses across five clients, JSON/protobuf and both cache sizes. Warm reopen HTTP is zero; sampled active HTTP is at most one in these fixtures. Storage leases are advisory, not a native atomic-concurrency guarantee.

## Lyric burst retention

256 fresh Node processes: four alternating trials per version/client/cache/mode. Each dispatches 72 invocations in one JavaScript turn before microtasks drain, with no forced GC during the burst. Input references are released at completion. Cached paths now finish in the same evaluation. Cold paths leave one actual network owner; busy responses finish immediately and retain the existing retry-on-next-request behavior. Output hashes and request counts match 3.2.0. This adverse scheduler model exposes retention but does not assert that Loon schedules scripts this way.

Loon medians below. Heap growth includes V8, VM, harness and compilation. A reduction is not a total-VPN memory reduction.

| Mode | Unrelated cache | Heap growth KiB, 3.2.0 → 3.2.1 | Change | Time ms, before → after | Peak unfinished | Pending after dispatch |
|---|---|---:|---:|---:|---:|---:|
| english-cached | empty | 17414.4 → 13240.9 | -24.0% | 70.864 → 71.069 | 72 → 1 | 72 → 0 |
| english-cold | empty | 18206.0 → 12583.8 | -30.9% | 60.875 → 57.903 | 72 → 2 | 72 → 1 |
| missing-cached | empty | 23768.6 → 13840.9 | -41.8% | 92.403 → 90.764 | 72 → 1 | 72 → 0 |
| missing-cold | empty | 15227.3 → 10991.0 | -27.8% | 44.384 → 43.461 | 72 → 2 | 72 → 1 |
| english-cached | populated | 18032.4 → 13247.9 | -26.5% | 72.907 → 71.327 | 72 → 1 | 72 → 0 |
| english-cold | populated | 18644.4 → 12902.5 | -30.8% | 58.545 → 58.299 | 72 → 2 | 72 → 1 |
| missing-cached | populated | 24434.1 → 13806.9 | -43.5% | 92.075 → 93.973 | 72 → 1 | 72 → 0 |
| missing-cold | populated | 15851.5 → 11237.6 | -29.1% | 47.150 → 46.423 | 72 → 2 | 72 → 1 |

All four native-client results, including slower samples, are retained in lyric-startup-results.json. There is no universal burst wall-time improvement claim.

## Fresh lyric load in Node/V8

360 fresh 32 MiB old-space processes: six alternating trials per version for 15 scenarios, with empty and unrelated populated caches. Each process compiles/invokes only one version. Zero HTTP latency; exact outputs and request counts must match. The zh cases with no pure qualifier explicitly select English as their target and therefore retain their previous behavior; pure-zh cases use the default Chinese target. Superseded mixed-language-to-Chinese behavior is tested separately and excluded from equal-work timing comparisons.

The full table includes regressions. V8 allocation/GC thresholds can affect sampled heap growth; these samples are neither a hard bound nor evidence that all cold paths allocate less. In particular, some fallback and chorus cases use more sampled V8 heap.

### Empty caches

| Scenario | Time ms, before → after | Heap growth KiB, before → after | Heap change | HTTP |
|---|---:|---:|---:|---:|
| official-en-24 | 7.518 → 7.227 | 1147.4 → 1130.7 | -1.5% | 1 |
| fallback-en-24 | 9.440 → 9.285 | 1180.7 → 1350.0 | +14.3% | 2 |
| official-en-48 | 7.738 → 7.365 | 990.0 → 973.2 | -1.7% | 1 |
| fallback-en-48 | 9.652 → 9.618 | 1217.7 → 1322.4 | +8.6% | 2 |
| official-en-120 | 8.893 → 8.276 | 1279.7 → 1242.3 | -2.9% | 2 |
| fallback-en-120 | 11.173 → 11.023 | 1492.2 → 1466.0 | -1.8% | 3 |
| official-zh-48 | 8.131 → 7.658 | 977.2 → 971.0 | -0.6% | 1 |
| fallback-zh-48 | 9.838 → 9.386 | 1260.9 → 1153.6 | -8.5% | 2 |
| empty-fallback-en-48 | 10.222 → 10.301 | 1288.0 → 1212.3 | -5.9% | 3 |
| empty-fallback-zh-48 | 10.067 → 9.849 | 1322.4 → 1321.0 | -0.1% | 3 |
| official-chorus-120 | 7.727 → 7.459 | 897.1 → 1187.0 | +32.3% | 1 |
| official-pure-zh-48 | 5.245 → 4.110 | 691.6 → 643.4 | -7.0% | 0 |
| official-en-600 | 15.850 → 15.774 | 2923.0 → 2733.2 | -6.5% | 10 |
| official-zh-600 | 12.891 → 13.185 | 2877.1 → 2871.0 | -0.2% | 10 |
| official-pure-zh-600 | 6.534 → 5.233 | 1342.2 → 1090.6 | -18.7% | 0 |

### Populated caches

| Scenario | Time ms, before → after | Heap growth KiB, before → after | Heap change | HTTP |
|---|---:|---:|---:|---:|
| official-en-24 | 8.293 → 7.647 | 1324.4 → 1317.8 | -0.5% | 1 |
| fallback-en-24 | 9.826 → 9.658 | 1445.1 → 1468.6 | +1.6% | 2 |
| official-en-48 | 8.270 → 7.893 | 1417.3 → 1401.0 | -1.1% | 1 |
| fallback-en-48 | 10.191 → 10.588 | 1558.0 → 1576.0 | +1.1% | 2 |
| official-en-120 | 9.433 → 8.841 | 1859.0 → 1713.4 | -7.8% | 2 |
| fallback-en-120 | 11.261 → 11.378 | 1964.5 → 1992.9 | +1.4% | 3 |
| official-zh-48 | 8.731 → 8.462 | 1405.7 → 1399.9 | -0.4% | 1 |
| fallback-zh-48 | 10.212 → 9.964 | 1573.7 → 1568.7 | -0.3% | 2 |
| empty-fallback-en-48 | 10.938 → 10.778 | 1706.2 → 1736.4 | +1.8% | 3 |
| empty-fallback-zh-48 | 10.784 → 10.065 | 1641.4 → 1636.1 | -0.3% | 3 |
| official-chorus-120 | 8.534 → 8.134 | 1373.5 → 1370.2 | -0.2% | 1 |
| official-pure-zh-48 | 5.099 → 4.108 | 693.7 → 645.5 | -7.0% | 0 |
| official-en-600 | 14.001 → 13.652 | 3143.3 → 2983.4 | -5.1% | 10 |
| official-zh-600 | 13.780 → 13.681 | 2654.1 → 2633.1 | -0.8% | 10 |
| official-pure-zh-600 | 6.531 → 5.293 | 1342.9 → 1091.6 | -18.7% | 0 |

## Fresh lyric load in macOS JavaScriptCore

96 fresh processes, six alternating trials for four modes and two unrelated-cache conditions. The marker inside the evaluation verifies local completion rather than completion after a microtask checkpoint. Cached candidate paths are synchronous; baseline cached paths and real-HTTP paths are asynchronous. All output hashes and HTTP counts match. Sampled process footprint includes fixture data, native runner and JSC. It is not the Loon extension footprint.

| Case | Time ms, before → after | Sampled footprint KiB, before → after | Footprint change |
|---|---:|---:|---:|
| english-cached-empty | 9.261 → 8.968 | 6736.7 → 6680.7 | -0.83% |
| english-cached-filled | 9.472 → 9.233 | 7632.7 → 7536.7 | -1.26% |
| english-cold-empty | 9.726 → 9.479 | 6856.7 → 6864.7 | +0.12% |
| english-cold-filled | 10.541 → 10.187 | 7672.7 → 7632.7 | -0.52% |
| missing-cached-empty | 9.427 → 8.936 | 6824.7 → 6848.7 | +0.35% |
| missing-cached-filled | 9.709 → 9.298 | 7568.7 → 7496.7 | -0.95% |
| missing-cold-empty | 13.156 → 11.576 | 7184.7 → 7312.7 | +1.78% |
| missing-cold-filled | 12.012 → 11.881 | 7968.7 → 7944.7 | -0.30% |

Cold missing-lyrics/empty-cache JSC footprint rises about 128 KiB (1.8%) in these medians; it is recorded rather than described as an across-the-board memory decrease. No cache, concurrency, response-size budget or prefetch capacity was increased. The broader all-helper generator prototype was rejected after fresh-load measurements. The final build lowers only four local-capable functions and removes the retired Chinese mixed-fragment production branch.

## Delayed HTTP and consecutive songs

The 16 delayed-HTTP processes send 60 requests spaced 2 ms with 400 ms callbacks, covering repeated and distinct tracks. Both versions peak at two live invocations, one HTTP owner and zero admission timers; callbacks drain before owner completion and a follow-up request recovers the settled translation. This scheduling case is unchanged in concurrency. Busy-response timings can regress; native-pressure-results.json retains every comparison.

The twenty mixed-playlist processes process 120 songs twice each: 80 English songs translate and 40 Chinese songs with English fragments remain original. All 4800 responses complete once. Standard storage peaks at 117 entries / 63928 characters (budget 128 / 64000); compact peaks at 58 / 31888 (budget 64 / 32000). These are stored string budgets, not live native memory ceilings. Original lines, timing, replacement switch, source fallback and filler filtering are asserted independently.

## Reproduction and scope

Run the commands in README.md. run-measurements-321.py executes measurements sequentially and checks runtime hashes at every boundary; summarize-321.py generates this document and validation-summary.json. Raw reports retain every trial. Earlier 3.2.0 startup-entry measurements and preliminary prototypes are not included as 3.2.1 release evidence.

The phone disconnection is still a real reported failure. The reproduced retention defect is fixed, but its relationship to that OS termination has not been established. Actual iPhone playback/UI, VPN continuity, system peak memory, real network latency and every-source coverage remain unverified.
