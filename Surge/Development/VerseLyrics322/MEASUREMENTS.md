# VerseLyrics 3.2.2 measurements

Measured 2026-11-01 on macOS arm64, Node v24.22.1 and the macOS public JavaScriptCore C API. Baseline is immutable 3.2.1 source/runtime commit d76f8aa7785e023b9901dbf97e44e274295a0ed8. Runtime hashes are frozen in bench-runtime-sha256.json and matched before/after every stage. All lyrics are self-written fixtures, all HTTP responses are mocks. This is not captured Spotify scheduling, native iPhone memory, device UI or VPN stability acceptance. No phone termination record was obtained.

2248 regression tests pass, including 30 new missing-response/recovery cases and four build-scope cases. Functional verification covers 60 native feature invocations and 4800 lyric responses across five clients, JSON/protobuf and both cache sizes. Warm reopen HTTP is zero; sampled active HTTP is at most one in these fixtures. Storage leases are advisory, not a native atomic-concurrency guarantee.

## Lyric burst retention

256 fresh Node processes: four alternating trials per version/client/cache/mode. Each dispatches 72 invocations in one JavaScript turn before microtasks drain, with no forced GC during the burst. Input references are released at completion. Both versions already finish cached paths in the same evaluation. This is retained behavior, not a new concurrency improvement. Cold paths leave one actual network owner; busy responses finish immediately and retain the existing retry-on-next-request behavior. Output hashes and request counts match 3.2.1. This adverse scheduler model exposes retention but does not assert that Loon schedules scripts this way.

Loon medians below. Heap growth includes V8, VM, harness and compilation. A reduction is not a total-VPN memory reduction.

| Mode | Unrelated cache | Heap growth KiB, 3.2.1 → 3.2.2 | Change | Time ms, before → after | Peak unfinished | Pending after dispatch |
|---|---|---:|---:|---:|---:|---:|
| english-cached | empty | 13227.1 → 13981.4 | +5.7% | 72.530 → 73.575 | 1 → 1 | 0 → 0 |
| english-cold | empty | 12604.0 → 12563.5 | -0.3% | 56.892 → 54.970 | 2 → 2 | 1 → 1 |
| missing-cached | empty | 13459.1 → 13212.5 | -1.8% | 95.105 → 90.553 | 1 → 1 | 0 → 0 |
| missing-cold | empty | 10992.9 → 10969.5 | -0.2% | 45.773 → 43.743 | 2 → 2 | 1 → 1 |
| english-cached | populated | 13261.3 → 13668.3 | +3.1% | 73.153 → 72.995 | 1 → 1 | 0 → 0 |
| english-cold | populated | 12924.4 → 12252.0 | -5.2% | 58.402 → 56.971 | 2 → 2 | 1 → 1 |
| missing-cached | populated | 13822.1 → 13910.0 | +0.6% | 97.603 → 91.680 | 1 → 1 | 0 → 0 |
| missing-cold | populated | 11254.9 → 11391.6 | +1.2% | 45.282 → 47.075 | 2 → 2 | 1 → 1 |

All four native-client results, including slower samples, are retained in lyric-startup-results.json. There is no universal burst wall-time improvement claim.

## Fresh lyric load in Node/V8

540 fresh 32 MiB old-space processes: nine alternating trials per version for 15 scenarios, with empty and unrelated populated caches. Each process compiles/invokes only one version. Zero HTTP latency; exact outputs and request counts must match. The zh cases with no pure qualifier explicitly select English as their target and therefore retain their previous behavior; pure-zh cases use the default Chinese target. Both versions have the same English-only Chinese translation policy.

The full table includes regressions. V8 allocation/GC thresholds can affect sampled heap growth; these samples are neither a hard bound nor evidence that all cold paths allocate less. In particular, the empty-cache 120-line English official/fallback cases use more sampled V8 heap. Preliminary empty official-en-24 baseline trials also showed two allocation clusters; these samples should not be treated as native-device savings.

### Empty caches

| Scenario | Time ms, before → after | Heap growth KiB, before → after | Heap change | HTTP |
|---|---:|---:|---:|---:|
| official-en-24 | 7.149 → 6.778 | 1136.1 → 1114.4 | -1.9% | 1 |
| fallback-en-24 | 8.942 → 8.644 | 1350.0 → 1169.8 | -13.3% | 2 |
| official-en-48 | 7.353 → 7.086 | 973.3 → 936.1 | -3.8% | 1 |
| fallback-en-48 | 9.700 → 9.234 | 1315.1 → 1133.1 | -13.8% | 2 |
| official-en-120 | 8.340 → 7.784 | 1242.4 → 1289.9 | +3.8% | 2 |
| fallback-en-120 | 10.789 → 10.346 | 1464.8 → 1491.7 | +1.8% | 3 |
| official-zh-48 | 7.487 → 7.430 | 971.0 → 958.6 | -1.3% | 1 |
| fallback-zh-48 | 9.349 → 9.483 | 1153.6 → 1149.6 | -0.3% | 2 |
| empty-fallback-en-48 | 10.408 → 10.011 | 1211.1 → 1184.1 | -2.2% | 3 |
| empty-fallback-zh-48 | 9.895 → 9.820 | 1317.8 → 1294.3 | -1.8% | 3 |
| official-chorus-120 | 7.605 → 7.253 | 1187.7 → 1173.4 | -1.2% | 1 |
| official-pure-zh-48 | 4.100 → 4.182 | 643.4 → 634.2 | -1.4% | 0 |
| official-en-600 | 15.445 → 14.949 | 2734.2 → 2519.1 | -7.9% | 10 |
| official-zh-600 | 12.985 → 12.835 | 2870.0 → 2859.7 | -0.4% | 10 |
| official-pure-zh-600 | 5.293 → 5.172 | 1089.8 → 1081.9 | -0.7% | 0 |

### Populated caches

| Scenario | Time ms, before → after | Heap growth KiB, before → after | Heap change | HTTP |
|---|---:|---:|---:|---:|
| official-en-24 | 7.612 → 7.249 | 1317.8 → 1301.6 | -1.2% | 1 |
| fallback-en-24 | 9.506 → 9.341 | 1468.6 → 1449.2 | -1.3% | 2 |
| official-en-48 | 7.852 → 7.691 | 1401.0 → 1363.7 | -2.7% | 1 |
| fallback-en-48 | 10.278 → 9.766 | 1576.0 → 1547.2 | -1.8% | 2 |
| official-en-120 | 8.831 → 8.414 | 1713.5 → 1653.9 | -3.5% | 2 |
| fallback-en-120 | 11.226 → 10.835 | 1992.9 → 1823.7 | -8.5% | 3 |
| official-zh-48 | 8.483 → 8.270 | 1399.9 → 1387.4 | -0.9% | 1 |
| fallback-zh-48 | 9.945 → 9.783 | 1568.4 → 1564.6 | -0.2% | 2 |
| empty-fallback-en-48 | 10.956 → 10.493 | 1734.4 → 1607.4 | -7.3% | 3 |
| empty-fallback-zh-48 | 10.432 → 10.248 | 1636.0 → 1631.6 | -0.3% | 3 |
| official-chorus-120 | 8.212 → 7.807 | 1370.2 → 1352.3 | -1.3% | 1 |
| official-pure-zh-48 | 4.164 → 4.052 | 645.4 → 636.3 | -1.4% | 0 |
| official-en-600 | 13.884 → 13.072 | 2976.2 → 2778.1 | -6.7% | 10 |
| official-zh-600 | 13.604 → 13.484 | 2676.3 → 2644.4 | -1.2% | 10 |
| official-pure-zh-600 | 5.256 → 5.134 | 1091.7 → 1082.8 | -0.8% | 0 |

## Fresh lyric load in macOS JavaScriptCore

160 fresh processes, ten alternating trials for four modes and two unrelated-cache conditions. The marker inside the evaluation verifies local completion rather than completion after a microtask checkpoint. Cached paths are synchronous in both versions; real-HTTP paths are asynchronous. All output hashes and HTTP counts match. Sampled process footprint includes fixture data, native runner and JSC. It is not the Loon extension footprint.

| Case | Time ms, before → after | Sampled footprint KiB, before → after | Footprint change |
|---|---:|---:|---:|
| english-cached-empty | 8.428 → 8.617 | 6640.7 → 6640.7 | -0.00% |
| english-cached-filled | 8.848 → 8.811 | 7544.7 → 7552.7 | +0.11% |
| english-cold-empty | 9.506 → 9.445 | 6816.7 → 6752.7 | -0.94% |
| english-cold-filled | 9.840 → 9.505 | 7632.7 → 7600.7 | -0.42% |
| missing-cached-empty | 8.794 → 8.513 | 6824.7 → 6760.7 | -0.94% |
| missing-cached-filled | 9.188 → 8.880 | 7520.7 → 7472.7 | -0.64% |
| missing-cold-empty | 11.043 → 11.002 | 7264.8 → 7216.7 | -0.66% |
| missing-cold-filled | 11.391 → 11.244 | 7928.7 → 7936.7 | +0.10% |

Cold missing-lyrics/populated-cache JSC footprint rises about 8 KiB in these medians; cached English/empty-cache execution is slightly slower. These results are retained rather than described as universal improvement. No cache, concurrency, response-size budget or prefetch capacity was increased. A token-scanning cache parser, no-inline build and manual host continuation were rejected. The final build moves online source helpers into a static lazy scope and removes redundant Chinese checks after the English-song gate; cached fallback decoding stays outside that scope. The cache parser and local completion runner retain their 3.2.1 design.

## Delayed HTTP and consecutive songs

The 16 delayed-HTTP processes send 60 requests spaced 2 ms with 400 ms callbacks, covering repeated and distinct tracks. Both versions peak at two live invocations, one HTTP owner and zero admission timers; callbacks drain before owner completion and a follow-up request recovers the settled translation. This scheduling case is unchanged in concurrency. Delayed-HTTP heap growth rises about 3.6% in both modes; busy-response timings can regress; native-pressure-results.json retains every comparison.

The twenty mixed-playlist processes process 120 songs twice each: 80 English songs translate and 40 Chinese songs with English fragments remain original. All 4800 responses complete once. Standard storage peaks at 117 entries / 63928 characters (budget 128 / 64000); compact peaks at 58 / 31888 (budget 64 / 32000). These are stored string budgets, not live native memory ceilings. Original lines, timing, replacement switch, source fallback and filler filtering are asserted independently.

## Reproduction and scope

Run the commands in README.md. run-measurements-322.py executes measurements sequentially and checks runtime hashes at every boundary; summarize-322.py generates this document and validation-summary.json. Raw reports retain every trial. The final reports contain 832 fresh Node processes plus 160 fresh JSC processes. Earlier-version reports and preliminary prototypes are not included as 3.2.2 release evidence.

The phone disconnection remains a reported failure with unconfirmed cause. Sampled memory costs are mixed, so this release does not establish lower memory for every first load. Preventing temporary negative caching fixes a distinct missing-lyrics path; it cannot force Spotify to request again or cover songs absent from source catalogs. Actual iPhone playback/UI, VPN continuity, system peak memory, real network latency and every-source coverage remain unverified.
