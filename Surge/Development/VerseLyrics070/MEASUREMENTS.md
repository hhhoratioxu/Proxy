# 0.5.3 → 0.7.0 final measurements

All values below use final runtime bytes. These are local synthetic tests, not iPhone Loon Network Extension memory or VPN reliability measurements. They exclude native transport buffering. HTTP is mocked; latency measurements do not estimate real lyric-service speed. Full reports retain all trials.

## macOS JavaScriptCore

Six fresh processes per scenario/version, 39 cold cases and six 32-invocation cases; no forced GC. Native callback boundaries, output length/fingerprint and HTTP counts must match. Whole-process physical-footprint samples include engine, harness and JIT and may miss allocation peaks between samples. The final Loon runtime SHA-256 is validated against every candidate trial.

| Cold case | 0.5.3 footprint MiB | 0.7.0 footprint MiB | 0.5.3 / 0.7.0 zero-latency ms |
| --- | ---: | ---: | ---: |
| official-24-json | 6.594 | 6.626 | 8.442 / 8.447 |
| official-24-protobuf | 6.579 | 6.587 | 8.114 / 8.229 |
| official-48-json | 6.719 | 6.680 | 9.337 / 9.229 |
| official-48-protobuf | 6.626 | 6.696 | 8.735 / 8.568 |
| official-120-json | 7.665 | 7.626 | 12.133 / 12.155 |
| official-120-protobuf | 6.946 | 6.930 | 10.092 / 9.795 |
| lrclib-24-json | 6.954 | 6.938 | 9.989 / 9.902 |
| lrclib-24-protobuf | 6.985 | 6.985 | 10.133 / 10.118 |
| lrclib-48-json | 7.047 | 7.032 | 10.857 / 11.171 |
| lrclib-48-protobuf | 7.055 | 7.079 | 10.238 / 10.463 |
| lrclib-120-json | 7.266 | 7.219 | 13.035 / 13.421 |
| lrclib-120-protobuf | 7.297 | 7.297 | 11.913 / 11.800 |
| netease-24-json | 7.001 | 7.016 | 12.752 / 12.438 |
| netease-24-protobuf | 7.016 | 7.063 | 12.082 / 12.407 |
| netease-48-json | 7.118 | 7.079 | 13.764 / 13.813 |
| netease-48-protobuf | 7.126 | 7.141 | 12.995 / 14.040 |
| netease-120-json | 7.376 | 7.376 | 16.652 / 16.871 |
| netease-120-protobuf | 7.430 | 7.422 | 15.751 / 15.592 |
| netease-half-24-json | 7.079 | 7.047 | 12.859 / 13.427 |
| netease-half-24-protobuf | 7.079 | 7.094 | 12.966 / 13.152 |
| netease-half-48-json | 7.149 | 7.118 | 13.177 / 13.435 |
| netease-half-48-protobuf | 7.126 | 7.157 | 13.020 / 13.102 |
| netease-half-120-json | 7.383 | 7.344 | 16.105 / 16.431 |
| netease-half-120-protobuf | 7.399 | 7.422 | 15.532 / 15.596 |
| entry-context-1 | 5.383 | 5.399 | 5.426 / 5.425 |
| entry-connect-1 | 5.376 | 5.407 | 7.049 / 7.160 |
| entry-context-50 | 5.540 | 5.563 | 15.213 / 15.119 |
| entry-connect-50 | 5.594 | 5.618 | 16.951 / 16.539 |
| entry-context-200 | 7.024 | 7.001 | 45.463 / 46.526 |
| entry-connect-200 | 7.040 | 7.055 | 46.364 / 46.267 |
| wire-context-1 | 5.446 | 5.438 | 5.563 / 5.835 |
| wire-connect-1 | 5.438 | 5.477 | 5.402 / 5.598 |
| wire-context-50 | 7.079 | 7.110 | 10.430 / 10.052 |
| wire-connect-50 | 7.087 | 7.110 | 10.398 / 10.090 |
| wire-context-200 | 10.157 | 10.196 | 25.710 / 25.550 |
| wire-connect-200 | 10.126 | 10.180 | 26.047 / 26.320 |
| metadata-0 | 7.141 | 7.110 | 10.845 / 10.535 |
| metadata-100 | 7.524 | 7.454 | 11.457 / 11.267 |
| metadata-1000 | 9.493 | 8.969 | 19.837 / 19.038 |

Cold-footprint changes range from -5.51% to +1.06%. Many ordinary lyric cases are nearly unchanged; not every case is faster or smaller. No cold case exceeds the preselected 3% regression threshold. Full repeated-load samples: `jsc-memory-results.json`.

## Node first load, existing caches and rapid switching

`native-first-load-results.json` and `native-filled-first-load-results.json` each retain twelve fresh-process trials per version and ten scenarios, under a 32 MiB old-space bound. The filled-cache suite starts with unrelated lyrics occupying 48,000–60,000 serialized characters. Output SHA-256 and HTTP counts match. These are V8/process samples at defined boundaries; V8 allocation-page and GC thresholds can shift readings substantially. They are not direct iOS gains.

`native-churn-results.json`: each candidate client/format handles 240 distinct songs, 720 mocked HTTP calls, cache eviction and fresh native contexts. All five clients, JSON and Protobuf, preserve output/content hashes. Peak mocked HTTP remains one. GC occurs every six changes; this is serial switching rather than overlapping native callbacks.

`native-pressure-results.json`: four trials, 60 arrivals at 2 ms spacing with 400 ms callbacks, same-song and different-song cases. Both versions retain at most two unfinished invocations in these mocks, one HTTP call and zero admission timers. The settled track is explicitly requested again after the burst and translates successfully. Busy uncached requests remain unchanged until a later client request; this test does not establish automatic retry or cross-process atomic admission. Pressure heap/timing remains broadly unchanged, not a newly claimed concurrency reduction.

## Optional controls

`compact-first-load-results.json`: six fresh JSC processes per mode/scenario for official 120-row lyrics, metadata with 1,000 unrelated fields and partial-source 120-row translations. Both modes use the same final runtime, empty stores and identical output/HTTP fingerprints. Compact mode passes the same 3% first-load footprint gate. It caps stored data at 64 records / 32,000 UTF-16 characters, including cache metadata; the ordinary profile remains 128 / 64,000. A single compact record is capped at 16,000 serialized characters; larger records may not be saved even though lyrics/translation are returned. Older records can be evicted sooner. This does not mean total VPN memory is halved.

Five-client packaged tests verify compact lyric and entry writes, active HTTP <= 1, full fallback/translation output and the artwork opt-out avoiding an extra public-page fetch. The preference is off only when the user selects it; existing valid colors remain reusable. Metadata lookup can still need the same public page if Spotify supplies no song identity.

## Reproduce

```sh
node build.mjs
node jsc-fixtures.mjs
clang -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk -framework JavaScriptCore -O2 jsc-memory-runner.c -o jsc-memory-runner
python3 jsc-memory-bench.py /path/to/unchanged-053
python3 compact-cold-bench.py
node native-first-load-bench.mjs /path/to/unchanged-053
node native-first-load-bench.mjs /path/to/unchanged-053 --populated
node native-playlist-bench.mjs /path/to/unchanged-053 --churn
node native-pressure-bench.mjs /path/to/unchanged-053
```
