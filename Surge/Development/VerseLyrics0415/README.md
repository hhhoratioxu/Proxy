# VerseLyrics 0.4.15 — shared translation request reduction

The same pipeline applies to every track ID. This release reduces avoidable translation work while keeping six fallback sources, plugin-owned translations, native lyric rows/timing/colors, and all five native client adapters. It does not promise that every song is available or that every first network load becomes faster.

## Changes

- Explicit document language plus a per-line script check can identify Chinese, Japanese or Korean lines already in the requested language. Those lines need no translation request or new translation cache record. Mixed foreign-language lines still translate. Unknown language and Latin-language documents retain normal translation; a script alone is never treated as language detection.
- Traditional-to-simplified conversion is not skipped. The existing Han reference is checked directly without constructing converted strings or per-character iterator/destructuring objects. Traditional Chinese targets require an explicit traditional language tag. All 6,447 independent reference mappings, including supplementary Unicode planes, are tested as requiring conversion.
- Horizontal ASCII whitespace variants share one translation query and one cache pair. Case, accents, punctuation and embedded line breaks remain significant. Native original strings, row count and timing remain unchanged. Existing track and legacy per-line caches still work. Unknown-language fallback lyrics retain translation.
- No prefetch, additional script hook, larger batch, expanded cache or concurrent source race. Loon callback completion and adapter 10 native contracts remain unchanged. The six-source matching and timed-lyric behavior from 0.4.14 remain.

## Limits and contracts

Cache: **128 entries / 64,000 serialized JSON UTF-16 characters**. Lyric/entry input: **256/128 KiB**. Ordinary service response: **96 KiB**; public embed: **256 KiB**. Fallback: **twelve requests / 256 KiB / at most seven seconds** inside the overall deadline. Translation: **64 unique rows per request, URL at most 6,800 characters, 2.5-second budget**. Requests remain sequential per job. Admission of two jobs remains advisory because native persistent storage is not atomic.

See [client/provider contracts](CLIENT-CONTRACTS.md), including [Loon's official callback completion requirements](https://nsloon.app/docs/Script/script_api/). A proxy can buffer a response before its callback; JavaScript body limits are not a hard cap on the VPN process. Phone memory and VPN stability have not been verified.

## Validation

**813 automated tests pass, zero failures or skips**, plus Egern YAML validation. The 43 additional tests cover explicit and mixed language handling, unknown-language fallback translation, whitespace deduplication, cache compatibility, all Han variants and compiled JSON/Protobuf delivery on all five clients. Existing provider, timeout, overlap, malformed/oversized-body, batching, wire, palette and cache tests remain.

`common-path-results.json` compares ten distinct synthetic song/artist identities, three alternating trials per version/scenario, in fresh processes limited to 32 MiB old-space. Each cold VM is followed by a fresh warm VM. HTTP mocks use a fixed 40 ms delay. The displayed request reductions are deterministic test results; timings are not phone or provider measurements. All native output hashes match 0.4.14, and every successful warm scenario uses zero HTTP.

| Shared path | Cold requests before -> after | Translation queries before -> after | Cache characters before -> after |
| --- | ---: | ---: | ---: |
| target-zh-48 | 1 -> 0 | 48 -> 0 | 1,658 -> 0 |
| target-ja-48 | 1 -> 0 | 48 -> 0 | 1,559 -> 0 |
| target-ko-48 | 1 -> 0 | 48 -> 0 | 1,463 -> 0 |
| mixed-zh-en-96 | 2 -> 1 | 96 -> 48 | 4,278 -> 2,762 |
| layout-en-144 | 3 -> 1 | 144 -> 48 | 8,290 -> 2,762 |
| fallback-layout-en-144 | 4 -> 2 | 144 -> 48 | 13,668 -> 8,140 |
| foreign-en-48 | 1 -> 1 | 48 -> 48 | 2,762 -> 2,762 |
| traditional-to-simplified-48 | 1 -> 1 | 48 -> 48 | 1,898 -> 1,898 |
| unknown-han-48 | 1 -> 1 | 48 -> 48 | 1,898 -> 1,898 |
| fallback-en-48 | 2 -> 2 | 48 -> 48 | 4,755 -> 4,755 |

The same-target Chinese/Japanese/Korean examples remove one unnecessary round trip. Ordinary foreign-language examples need the same number of calls; this release does not claim a speedup for those. Mixed language and layout-variant examples retain all expected translations.

## First-load memory and CPU

`native-first-load-results.json` contains twelve trials per version/scenario, 240 fresh-process invocations with a 32 MiB old-space limit. HTTP mocks have zero latency. Every final output hash matches the baseline. Heap is sampled at invocation/HTTP/completion boundaries, not on every allocation or inside native network buffering.

| Ordinary first load | CPU ms before -> after | Sampled heap growth bytes before -> after |
| --- | ---: | ---: |
| official-en-24 | 5.243 -> 5.438 | 852,448 -> 1,099,944 |
| fallback-en-24 | 6.598 -> 6.809 | 948,864 -> 937,880 |
| official-en-48 | 5.618 -> 5.759 | 913,312 -> 935,200 |
| fallback-en-48 | 7.224 -> 7.359 | 1,350,936 -> 1,084,144 |
| official-en-120 | 6.575 -> 6.717 | 1,200,920 -> 1,232,080 |
| fallback-en-120 | 8.38 -> 8.707 | 1,384,024 -> 1,487,560 |
| official-zh-48 | 5.967 -> 6.363 | 948,624 -> 970,320 |
| fallback-zh-48 | 7.58 -> 7.975 | 1,172,704 -> 1,187,080 |
| empty-fallback-en-48 | 7.612 -> 7.776 | 1,405,952 -> 1,137,816 |
| empty-fallback-zh-48 | 7.91 -> 8.154 | 1,486,512 -> 1,239,152 |

The additional checks add a small CPU cost on ordinary paths; measured memory varies with garbage-collection boundaries. Several cases decrease, while others increase, including the 24-line official English scenario. This is not a uniform memory improvement. All final trials are retained rather than selecting only lower measurements.

In the separate common-path benchmark, median cold heap growth for 48 already-target-language rows is:

| Language | Before bytes | After bytes |
| --- | ---: | ---: |
| target-zh-48 | 781,336 | 681,360 |
| target-ja-48 | 775,240 | 643,968 |
| target-ko-48 | 770,616 | 646,056 |

`native-playlist-results.json` tests 120 changes across twelve synthetic songs, both JSON and Protobuf and all five clients. Each uses 36 cold HTTP calls with zero additional calls on successful revisits. Output hashes match the baseline. Loon adds no timers for these uncontended runs. Separate 32 MiB old-space processes and explicit GC every six changes do not simulate a physical VPN extension.

| Loon 120 changes | Time ms | Sampled peak bytes | Retained heap bytes |
| --- | ---: | ---: | ---: |
| 0.4.14 json | 240 | 13,525,640 | 6,399,472 |
| 0.4.15 json | 242 | 12,472,280 | 6,384,944 |
| 0.4.14 protobuf | 219 | 13,137,400 | 6,408,672 |
| 0.4.15 protobuf | 220 | 13,537,448 | 6,393,960 |

An earlier combined benchmark invocation aborted in a Shadowrocket Node process. The original runner retained only the last 1,500 stderr characters, so the cause is unconfirmed. `playlist-initial-failure.log` retains that failure. Identical isolated old/new Shadowrocket runs both passed (`shadow-baseline.json`, `shadow-new.json`), and the final complete playlist run passed. The runner now preserves full failure output if it recurs. These passing reruns do not erase the failure or establish phone/VPN stability.

## Public HTTP check

`live-coverage-comparison.json` uses the compiled Loon runtime, a simulated Spotify 404, an empty cache and real public provider/translation HTTP. Eight public IDs span multiple artists; versions alternate order. Both releases match six and leave two unmatched. All five matched foreign-language samples retain plugin translation, and all six successful revisits use zero HTTP. Failed matches can retry where an error is transient; zero-network revisits are not claimed for failures. No lyrics, account tokens or page session fields are saved in the report.

| Sample | Matched old/new | First load ms old/new |
| --- | --- | ---: |
| 那页夏天 | True/True | 2313/1116 |
| Blinding Lights | True/True | 1427/1692 |
| Never Gonna Give You Up | False/False | 4368/3022 |
| Shape of You | True/True | 1014/2303 |
| Perfect | True/True | 950/835 |
| 4u7Ene7wjrC6dGE9rGQeFJ | False/False | 248/336 |
| Take on Me | True/True | 847/1062 |
| bad guy | True/True | 971/1310 |

These uncontrolled network timings include both faster and slower results and do not prove universal acceleration. The matched/unmatched count is unchanged. `live-translation-batch-results.json` also verifies one live 64-query batch on synthetic original text through the compiled Egern module; the existing public endpoint is not a paid API contract.

## Reproduce

```sh
pnpm install --frozen-lockfile --ignore-scripts
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 813
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node common-path-bench.mjs /path/to/unchanged/0.4.14
node native-first-load-bench.mjs /path/to/unchanged/0.4.14
node native-playlist-bench.mjs /path/to/unchanged/0.4.14
node live-coverage-compare.mjs /path/to/unchanged/0.4.14
node live-translation-batch.mjs
```

The zero pin is only a local test placeholder. Production pins an immutable runtime commit. Source and reports live at that commit; main changes only the twelve established import/documentation files. No on-phone dependency is added.
