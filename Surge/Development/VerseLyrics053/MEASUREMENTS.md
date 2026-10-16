# VerseLyrics 0.5.3 measurements

Baseline: immutable 0.5.2. All figures are local engine/native API mocks. They do not represent iPhone VPN peak memory, actual network latency or proof that iOS cannot terminate Loon. The functional output, HTTP counts and callback completion checks must pass before accepting these comparisons.

## macOS JavaScriptCore

Six fresh processes per scenario/version. Physical footprint is a whole-process sample; it includes the harness and engine. Churn repeats 32 fresh context groups with no explicit GC. Source, inputs, each runtime SHA-256 and all trials are in the accompanying runner/generator/report.

| Mode | Case | 0.5.2 footprint MiB | 0.5.3 footprint MiB | Change | 0.5.2 ms | 0.5.3 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| cold | official-24-json | 6.618 | 6.626 | +0.12% | 8.80 | 8.83 |
| cold | official-24-protobuf | 6.594 | 6.563 | -0.47% | 8.52 | 8.36 |
| cold | official-48-json | 6.712 | 6.704 | -0.12% | 9.49 | 9.76 |
| cold | official-48-protobuf | 6.618 | 6.657 | +0.59% | 8.85 | 9.08 |
| cold | official-120-json | 7.672 | 7.672 | +0.00% | 12.36 | 12.75 |
| cold | official-120-protobuf | 6.954 | 6.938 | -0.23% | 10.45 | 10.43 |
| cold | lrclib-24-json | 6.969 | 6.930 | -0.56% | 10.05 | 10.41 |
| cold | lrclib-24-protobuf | 6.969 | 6.954 | -0.22% | 10.35 | 10.15 |
| cold | lrclib-48-json | 7.016 | 7.040 | +0.33% | 11.18 | 11.40 |
| cold | lrclib-48-protobuf | 7.079 | 7.063 | -0.22% | 10.87 | 10.86 |
| cold | lrclib-120-json | 7.251 | 7.235 | -0.22% | 13.73 | 13.40 |
| cold | lrclib-120-protobuf | 7.297 | 7.297 | +0.00% | 12.53 | 12.24 |
| cold | netease-24-json | 6.993 | 7.024 | +0.45% | 12.88 | 13.46 |
| cold | netease-24-protobuf | 6.985 | 7.047 | +0.90% | 13.42 | 12.95 |
| cold | netease-48-json | 7.094 | 7.079 | -0.22% | 14.00 | 14.07 |
| cold | netease-48-protobuf | 7.087 | 7.141 | +0.77% | 13.78 | 13.84 |
| cold | netease-120-json | 7.337 | 7.360 | +0.32% | 17.44 | 17.48 |
| cold | netease-120-protobuf | 7.407 | 7.399 | -0.11% | 16.67 | 16.48 |
| cold | netease-half-24-json | 7.071 | 7.047 | -0.33% | 13.30 | 13.20 |
| cold | netease-half-24-protobuf | 7.063 | 7.094 | +0.44% | 13.00 | 12.72 |
| cold | netease-half-48-json | 7.094 | 7.126 | +0.44% | 13.95 | 13.99 |
| cold | netease-half-48-protobuf | 7.141 | 7.149 | +0.11% | 13.71 | 14.09 |
| cold | netease-half-120-json | 7.368 | 7.344 | -0.32% | 16.85 | 17.05 |
| cold | netease-half-120-protobuf | 7.399 | 7.391 | -0.11% | 16.37 | 15.86 |
| cold | entry-context-1 | 5.376 | 5.376 | -0.00% | 5.72 | 5.79 |
| cold | entry-connect-1 | 5.579 | 5.407 | -3.08% | 7.98 | 7.56 |
| cold | entry-context-50 | 6.204 | 5.547 | -10.58% | 16.46 | 15.93 |
| cold | entry-connect-50 | 7.055 | 5.602 | -20.60% | 19.19 | 18.15 |
| cold | entry-context-200 | 8.844 | 6.946 | -21.47% | 49.71 | 47.66 |
| cold | entry-connect-200 | 9.024 | 6.954 | -22.94% | 50.88 | 49.01 |
| cold | wire-context-1 | 5.477 | 5.438 | -0.71% | 5.85 | 6.01 |
| cold | wire-connect-1 | 5.477 | 5.446 | -0.57% | 5.68 | 5.93 |
| cold | wire-context-50 | 7.907 | 7.071 | -10.57% | 11.59 | 10.66 |
| cold | wire-connect-50 | 7.930 | 7.079 | -10.74% | 11.63 | 10.69 |
| cold | wire-context-200 | 11.555 | 10.094 | -12.64% | 27.70 | 27.05 |
| cold | wire-connect-200 | 11.626 | 10.126 | -12.90% | 27.55 | 27.18 |
| churn | official-48-protobuf | 7.313 | 7.337 | +0.32% | 188.88 | 186.94 |
| churn | netease-half-48-protobuf | 7.696 | 7.688 | -0.10% | 338.01 | 345.41 |
| churn | entry-context-200 | 8.930 | 7.094 | -20.56% | 1443.34 | 1368.68 |
| churn | entry-connect-200 | 9.407 | 7.594 | -19.27% | 1501.83 | 1423.48 |
| churn | wire-context-200 | 11.641 | 10.462 | -10.13% | 765.04 | 746.27 |
| churn | wire-connect-200 | 11.696 | 10.477 | -10.42% | 770.35 | 749.53 |

## Node cold lyric cross-check

Twelve fresh processes per scenario/version. Sampled heap growth is coarse and includes V8 code/VM/harness allocations. This is neither a retained heap nor an allocator peak. The large empty-English improvement crosses V8 allocation thresholds and is not claimed as a stable device gain. Other lyric cases remain effectively flat.

| Case | 0.5.2 heap growth bytes | 0.5.3 heap growth bytes | Change | 0.5.2 ms | 0.5.3 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| official-en-24 | 1093568 | 1093632 | +0.01% | 5.875 | 5.906 |
| fallback-en-24 | 1153456 | 1158544 | +0.44% | 7.118 | 7.15 |
| official-en-48 | 909792 | 911128 | +0.15% | 5.858 | 5.878 |
| fallback-en-48 | 1043184 | 1042728 | -0.04% | 7.709 | 7.923 |
| official-en-120 | 1164024 | 1164232 | +0.02% | 7 | 7.018 |
| fallback-en-120 | 1303552 | 1302168 | -0.11% | 8.79 | 8.701 |
| official-zh-48 | 982040 | 982280 | +0.02% | 6.667 | 6.622 |
| fallback-zh-48 | 1121640 | 1120288 | -0.12% | 8.353 | 8.311 |
| empty-fallback-en-48 | 1337448 | 1163408 | -13.01% | 8.532 | 8.057 |
| empty-fallback-zh-48 | 1447264 | 1445952 | -0.09% | 8.435 | 8.565 |

## Overlap and continuous playback

The prior one-owner/no-wait policy is unchanged. Sixty arrivals at 2 ms spacing and 400 ms callbacks still peak at two unfinished invocations (one owner and one fast passthrough), one active HTTP and zero admission timers in both versions. Different-song and same-song cases drain, and a later explicit settled-track request retains translation. The heap and time figures are effectively unchanged; this is not a new concurrency improvement.

| Version | Same song | Unfinished peak | HTTP peak | Admission timers | Heap growth bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| 0.5.2 | False | 2 | 1 | 0 | 8241568 |
| 0.5.3 | False | 2 | 1 | 0 | 8236760 |
| 0.5.2 | True | 2 | 1 | 0 | 8236304 |
| 0.5.3 | True | 2 | 1 | 0 | 8236360 |

All five clients, JSON and Protobuf, completed 240 distinct-song changes with 720 mocked HTTP calls per case, single active HTTP, bounded cache and identical output SHA-256 within each format. Loon still starts two response scripts per song and uses native request header rewrites. Full per-client times, heap samples, completion counts and eviction rounds are in `native-churn-results.json`. Forced GC every six serial changes is not used in the JSC measurements and is not an iOS behavior assumption.

The final functional suite has 961 passing tests; Egern native YAML validation also passes. No real phone, native Loon network extension, WebView/Objective-C buffer accounting or on-device import session was measured.
