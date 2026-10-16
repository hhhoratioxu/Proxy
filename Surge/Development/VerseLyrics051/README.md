# VerseLyrics 0.5.1 — shed overloaded lyric invocations

The user still reports Loon memory exhaustion and VPN disconnection after 0.5.0. This release addresses a reproduced script-residency problem: the previous two-owner admission scheme retained busy invocations in 50 ms timer loops, for up to 2.6 seconds. A replaceable storage record did not terminate those older waiting VMs. A sequential playlist benchmark did not cover this condition and did not establish phone stability.

The shared processor now allows one advisory network owner and immediately rejects contenders, with no admission timers or waiting queue. Cached lyrics, colors and plugin translations remain available. Different-track contention marks the existing owner retired: its current native request still completes, but the owner does not append palette, source or translation HTTP afterward. Completed source/translation results may still be saved. Settled timeout callbacks release admission; explicitly unfinished transports keep their slot until its expiry. Cache save uses a finally block to release admission even if saving throws.

A same-track duplicate no longer waits for the active owner. An overloaded uncached 404 can remain missing, and an overloaded official lyric response can retain original words without plugin translation. These cases are not stored as catalog misses; a later client request can retry. The script does not manufacture a retry or guarantee that Spotify issues one. This is an intentional tradeoff to reduce retained invocations. It does not switch off the six providers or translation in normal operation.

All five clients retain native adapter 10, native entry hooks, strict matching, original timing, colors and plugin-owned translations. No song-specific exception, prefetch, parallel source race, paid key or expanded cache is introduced. Cached playback metadata is read directly before an asynchronous metadata lookup is needed. Cache key/schema/TTL and successful results from 0.5.0 remain compatible.

## Limits and contracts

One network slot is a cooperative limit, not an atomic lock: native persistent storage offers no compare-and-swap primitive. Simultaneous native reads/writes can race. The old admission key/row shape is retained so an active 0.5.0 owner is respected during upgrade. Busy invocations can finish but JavaScript cannot control native VM compilation, incoming HTTP buffering or when the OS reclaims those resources.

Cache: 128 entries / 64,000 serialized JSON UTF-16 characters. Lyric/entry input: 256/128 KiB. Service response: 96 KiB; public embed: 256 KiB. Fallback lookup: twelve requests / 256 KiB / up to seven seconds inside the existing deadline. Translation: 64 unique rows, 6,800-character URL, 2.5-second budget. Native response buffering before callback is outside those JavaScript bounds.

The [client contracts](CLIENT-CONTRACTS.md) document the official API basis and unsupported assumptions. Loon's [Script API](https://nsloon.app/docs/Script/script_api/) was rechecked on 2026-10-16: outstanding native asynchronous callbacks must finish before the one `$done()` call. Compiled Loon/Surge/Shadowrocket lyric hooks have no setTimeout/setInterval. Egern admission also needs no timer. Quantumult X retains its existing single overall watchdog; no per-fetch cancellation guarantee is added. Shadowrocket compatibility remains unverified against a complete official specification.

## Validation

**870 automated tests pass, zero failures, cancellations or skips**, plus Egern YAML validation. Tests exercise the compiled five-client JSON/Protobuf hooks, six sources, matching, color roles, translation replacement, cache migration/bounds and callbacks. New pressure cases invoke 80 overlapping requests per client with success, same-song duplication and a stalled timeout. All 79 contenders finish before the first callback is released; original lines survive, subsequent retries translate, and no false missing result is saved. A separate fallback burst preserves completed lyrics and obtains fallback plus translation when the settled song is requested again. Upgrade tests respect one or two legacy owners and fail closed when admission storage cannot be written.

`native-pressure-results.json` compares unchanged 0.5.0 and the final compiled 0.5.1 Loon script. Each trial uses a fresh process, independent VM/context on every response, 60 responses spaced 2 ms and native HTTP callbacks delayed 400 ms. Four trials per version/scenario alternate order. The final pressure and first-load runs were executed sequentially; preliminary overlapping benchmark runs were discarded. There is one pre-run GC, none forced during the burst. Counts measure script invocation lifetime through `$done`, not native JSC context allocation or OS release. Heap samples include V8, code compilation and the harness.

| Median pressure result | Different songs 0.5.0 -> 0.5.1 | Same song 0.5.0 -> 0.5.1 |
| --- | ---: | ---: |
| Peak unfinished invocations | 23 -> 2 | 21 -> 2 |
| Peak active mock HTTP | 2 -> 1 | 1 -> 1 |
| Admission timer calls | 62 -> 0 | 63 -> 0 |
| Unfinished at end of arrival burst | 22 -> 1 | 20 -> 1 |
| Median busy-response duration, ms | 50.889 -> 0.478 | 50.813 -> 0.470 |
| Sum of invocation lifetimes, ms | 4,388 -> 847 | 3,627 -> 442 |
| Sampled heap growth, bytes | 9,797,840 -> 8,172,392 | 9,713,648 -> 8,156,696 |
| Responses enriched during overload | 3 -> 1 | 2 -> 1 |
| Explicit settled retry translated | yes -> yes | yes -> yes |

Fewer responses are enriched during overload because they now finish immediately. These results demonstrate the removed wait path; they do not establish a hard native memory ceiling, eliminate storage races or prove the user's VPN will remain connected.

`native-first-load-results.json` retains twelve fresh-process trials for each of ten English/Chinese official/fallback scenarios, using 32 MiB Node old-space, zero-latency native mocks and compilation in the measured interval. Output bytes and HTTP counts match 0.5.0 in every case. Timings are mostly slightly lower, but an empty Chinese fallback case is slightly higher. Sampled heap growth is higher for the 24-line seeded English fallback (941,624 -> 1,163,128 bytes) and marginally higher for the 120-line seeded English fallback; it is lower in the other eight scenarios. This release does **not** claim universal first-load heap reduction or faster real network loading.

`native-churn-results.json` runs 240 distinct cold songs per client/format to force bounded-cache eviction. All five clients pass JSON and Protobuf with the same output hashes and 720 sequential mock HTTP requests per case. Every turn enforces 128 entries and 64,000 serialized characters. GC is explicit every six changes and each case has 32 MiB Node old-space; this remains a sequential regression, not a pressure or phone test. Loon sequential timings/heap remain approximately unchanged (JSON 869 -> 873 ms, Protobuf 838 -> 840 ms).

## Public HTTP snapshot

`live-loon-public-flow-results.json` executes the compiled Loon runtime with simulated Spotify 404, empty cache and real public metadata/provider/translation HTTP. Both sampled IDs match: 那页夏天 yields 42 lines after a QQ timeout and a Kugou result; Blinding Lights yields 40 lines, 35 nonblank plugin translation rows. The Chinese sample requires no distinct target-language translation rows. Both successful revisits make zero HTTP calls. The final output retains native timing and valid color roles. These two samples do not measure catalog coverage or establish that Spotify itself has no lyrics for both tracks. No account credentials, lyric text or embedded session payloads are retained in the report.

`live-translation-batch-results.json` separately verifies 64 original synthetic sentences translated in one real request via compiled Egern. The existing public endpoint is not a paid API contract. Public HTTP and bridge simulation are not native import, physical-device playback, native memory or VPN stability acceptance.

## Reproduce and publish

```sh
pnpm install --frozen-lockfile --ignore-scripts
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 870
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node native-pressure-bench.mjs /path/to/unchanged/0.5.0
node native-first-load-bench.mjs /path/to/unchanged/0.5.0
node native-playlist-bench.mjs /path/to/unchanged/0.5.0 --churn
node live-loon-public-flow.mjs
node live-translation-batch.mjs
```

The [unchanged 0.5.0 baseline](https://github.com/hhhoratioxu/Proxy/tree/48bca8c7e15b0ff08bb6e202a1832a04b11d566e/Surge/Development/VerseLyrics050) includes its earlier tests/evidence. Build both versions before running comparisons. Zero pin is for local configuration checks only; production imports pin an immutable runtime commit. Only twelve existing production import/documentation files change on main. Each published raw file is byte-verified after an expected-head update. No user diagnostics or monitoring is required for this publication.
