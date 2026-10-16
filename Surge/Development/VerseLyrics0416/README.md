# VerseLyrics 0.4.16 — lower-allocation decoding and metadata matching

The same pipeline applies to every track ID. This release reduces temporary work during text decoding, title/artist/album matching and cache-only responses. Six fallback sources, plugin-owned translations, native lyric rows/timing/colors, and all five native client adapters remain. It does not guarantee every song is available, universal first-load acceleration, or a fixed VPN memory peak.

## Changes

- ASCII UTF-8 input decodes directly from the existing byte view in chunks of at most 4,096 bytes. It needs no temporary numeric character array. Mixed and non-ASCII text uses one `Uint16Array` scratch buffer of at most **8,194 bytes**. This limit covers only the decoder scratch, not output strings, network responses or the VPN process. UTF-8 validation still rejects invalid continuation bytes, overlong sequences, surrogates, out-of-range code points and truncated input. Surrogate pairs stay together at chunk boundaries.
- Han metadata matching uses indexed table lookup without per-character destructuring/iterator objects. Already-normalized spans are reused; only changed spans are appended. Explicit Chinese target-language checks share that lookup. Song identity, album, duration and version matching rules are unchanged; all 6,447 independent Han mappings remain covered by tests.
- Network admission creates its owner identifier only when a network request is needed. Cache-only completion no longer reads the waiter record or allocates a random owner. Actual request admission, overlap handling, stale-job supersession and native callback cleanup are unchanged.
- Existing same-language checks and whitespace-equivalent translation deduplication remain. Unknown-language and mixed foreign-language lyrics still translate. There is no new prefetch, source race, hook, cache expansion or larger translation batch. Adapter version remains 10.

## Limits and contracts

Cache: **128 entries / 64,000 serialized JSON UTF-16 characters**. Lyric/entry input: **256/128 KiB**. Ordinary service response: **96 KiB**; public embed: **256 KiB**. Fallback: **twelve requests / 256 KiB / at most seven seconds** inside the overall deadline. Translation: **64 unique rows per request, URL at most 6,800 characters, 2.5-second budget**. Requests remain sequential per job. Admission of two jobs remains advisory because native persistent storage is not atomic.

See [client/provider contracts](CLIENT-CONTRACTS.md), including [Loon's official callback completion requirements](https://nsloon.app/docs/Script/script_api/). A proxy can buffer a response before its callback; JavaScript body limits are not a hard cap on the VPN process. Phone memory and VPN stability have not been verified.

## Validation

**837 automated tests pass, zero failures or skips**, plus Egern YAML validation. The 24 additional tests cover direct ASCII decoding, nonzero-offset input views, multilingual and supplementary characters, bounded typed scratch, chunk boundaries, malformed UTF-8 and lazy admission state. Existing independent Han references, six-source matching, translation, native JSON/Protobuf, overlap, malformed/oversized-body, palette and cache tests pass.

## Metadata matching

`matching-memory-results.json` isolates matching 20 synthetic source candidates, twelve fresh-process trials per language/version and 32 MiB old-space. Cold measurements start after module import and fixture creation/GC; the repeated loop checks 100 selections. Selection hashes match the baseline. Values below are medians; this is not whole-script initial loading or network latency.

| Language | Cold matching ms 0.4.15 -> 0.4.16 | Cold sampled heap growth bytes | 100 selections ms |
| --- | ---: | ---: | ---: |
| english | 0.7778 -> 0.7739 | 192,088 -> 192,120 | 3.8116 -> 3.7392 |
| simplified | 1.7038 -> 1.4079 | 746,424 -> 761,656 | 9.9075 -> 6.6962 |
| traditional | 1.5618 -> 1.3846 | 853,256 -> 506,640 | 9.8506 -> 7.1204 |
| japanese | 1.7512 -> 1.427 | 837,400 -> 241,096 | 10.3605 -> 7.1515 |

Traditional and Japanese samples allocate less; the simplified Chinese cold sample has a small heap increase. CPU improves in these matching samples, but this isolated result must not be treated as the same percentage improvement for opening lyrics.

## First-load memory and CPU

`native-first-load-results.json` contains twelve trials per version/scenario, 240 fresh-process invocations with a 32 MiB old-space limit and the compiled Loon runtime. HTTP mocks have zero latency. All final output hashes and request counts match 0.4.15. Heap is sampled at invocation/HTTP/completion boundaries, not on every allocation or inside native network buffering.

| Ordinary first load | CPU ms 0.4.15 -> 0.4.16 | Sampled heap growth bytes |
| --- | ---: | ---: |
| official-en-24 | 5.374 -> 5.407 | 864,592 -> 853,280 |
| fallback-en-24 | 7.034 -> 6.811 | 937,808 -> 937,760 |
| official-en-48 | 5.748 -> 5.794 | 934,032 -> 904,544 |
| fallback-en-48 | 7.195 -> 7.308 | 1,083,072 -> 1,083,000 |
| official-en-120 | 6.691 -> 6.616 | 1,232,008 -> 1,163,400 |
| fallback-en-120 | 8.342 -> 8.579 | 1,485,296 -> 1,485,216 |
| official-zh-48 | 6.368 -> 6.364 | 970,320 -> 977,840 |
| fallback-zh-48 | 7.83 -> 7.891 | 1,187,080 -> 1,159,184 |
| empty-fallback-en-48 | 7.891 -> 7.761 | 1,137,768 -> 1,137,760 |
| empty-fallback-zh-48 | 8.126 -> 8.103 | 1,239,152 -> 1,219,520 |

Several first-load heap measurements decrease, some are effectively unchanged, and official Chinese increases by 7,520 bytes. CPU measurements include both faster and slower cases. These results do not establish uniform memory or latency improvement. Typed-array buffers are not fully represented by Node heap measurements; the separate decoder tests check their explicit allocation bound.

## Continuous switching and cache eviction

`native-playlist-results.json` tests 120 changes across twelve synthetic songs, JSON and Protobuf on all five clients. Every client uses 36 initial HTTP calls and zero additional calls on successful revisits. `native-churn-results.json` instead uses **240 different cold songs**, 720 mock HTTP calls per client/format, forcing cache eviction rather than repeatedly hitting twelve cached songs. Both tests use fresh 32 MiB old-space processes, 24 original lines per song, and explicit GC every six changes. All expected output hashes match the baseline. Every turn checks both cache limits; the largest serialized cache observed in the eviction run is 63,991 characters.

| Loon sequence | Version / format | Elapsed ms | Sampled heap peak bytes | Retained heap bytes |
| --- | --- | ---: | ---: | ---: |
| 120 revisits | 0.4.15 / json | 229 | 11,677,512 | 6,385,280 |
| 120 revisits | 0.4.16 / json | 225 | 11,082,584 | 6,387,960 |
| 120 revisits | 0.4.15 / protobuf | 217 | 13,152,272 | 6,394,408 |
| 120 revisits | 0.4.16 / protobuf | 228 | 13,107,152 | 6,397,232 |
| 240 cold tracks | 0.4.15 / json | 892 | 23,356,576 | 5,477,728 |
| 240 cold tracks | 0.4.16 / json | 944 | 22,508,496 | 5,481,712 |
| 240 cold tracks | 0.4.15 / protobuf | 887 | 22,529,320 | 5,488,760 |
| 240 cold tracks | 0.4.16 / protobuf | 880 | 22,497,808 | 5,492,728 |

All ten current client/format cases pass in each final run. Loon adds no timers in these uncontended runs. Sampling and explicit GC do not measure a physical VPN extension's peak; retained heap remains nearly unchanged and timing varies. The prior release's unconfirmed Shadowrocket Node failure is retained in the [0.4.15 evidence](https://github.com/hhhoratioxu/Proxy/tree/cdbe2470156953d7ca91cf9db7c57a0d5bdf5ba0/Surge/Development/VerseLyrics0415). This run's success does not establish that historical failure's cause or phone stability. The runner retains full failure details if a future child run fails.

## Public HTTP check

`live-coverage-comparison.json` uses the compiled Loon runtime, simulated Spotify 404, an empty cache and real public provider/translation HTTP. Eight public IDs span multiple artists and versions alternate order. The current release matches six and leaves two unmatched. The baseline matches five: its additional miss is an embed timeout for the Chinese sample. This network difference is not evidence of a coverage improvement caused by this code change. Five matched foreign-language samples retain translations; all six successful current-release revisits use zero HTTP. Failed matches can retry after transient errors. No lyric text, account tokens or page session fields are saved.

| Sample | Matched 0.4.15 / 0.4.16 | First load ms 0.4.15 / 0.4.16 |
| --- | --- | ---: |
| 那页夏天 | False / True | 2510 / 3398 |
| Blinding Lights | True / True | 1624 / 1634 |
| Never Gonna Give You Up | False / False | 5117 / 4601 |
| Shape of You | True / True | 1176 / 3614 |
| Perfect | True / True | 3287 / 1121 |
| 4u7Ene7wjrC6dGE9rGQeFJ | False / False | 1150 / 403 |
| Take on Me | True / True | 1562 / 1117 |
| bad guy | True / True | 1191 / 1384 |

These uncontrolled network timings include faster and slower results and do not prove universal acceleration. The unresolved samples include strict matching/provider failures and missing public metadata. `live-translation-batch-results.json` separately verifies all 64 synthetic original sentences in one real request through the compiled Egern module. The existing public translation endpoint is not a paid API service contract.

## Reproduce

```sh
pnpm install --frozen-lockfile --ignore-scripts
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 837
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node matching-memory-bench.mjs /path/to/unchanged/0.4.15
node native-first-load-bench.mjs /path/to/unchanged/0.4.15
node native-playlist-bench.mjs /path/to/unchanged/0.4.15
node native-playlist-bench.mjs /path/to/unchanged/0.4.15 --churn
node live-coverage-compare.mjs /path/to/unchanged/0.4.15
node live-translation-batch.mjs
```

The zero pin is only a local test placeholder. Production pins an immutable runtime commit. Source and reports live at that commit; main changes only the twelve established import/documentation files. No on-phone dependency is added. The unchanged 0.4.15 baseline source is available at the linked prior-release evidence directory; build it there before running comparisons.
