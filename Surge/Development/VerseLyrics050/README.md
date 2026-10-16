# VerseLyrics 0.5.0 — bounded cache-save redesign

This release changes the shared cache save path used by all five native clients and every track ID. It preserves six fallback sources, plugin-owned translations, native lyric timing/colors/highlighting, matching rules, network budgets and adapter version 10. There is no new song-specific shortcut, prefetch, concurrent source race or cache expansion.

## Cache behavior

Previously a save parsed the complete existing store into live lyric/translation objects, merged updates, then serialized every retained entry again. For indexed stores of at least 4,096 serialized UTF-16 characters, the new save-only reader validates one record at a time and retains its serialized text. Unchanged records are copied into the bounded result; only conflicts or the current scope need to remain decoded. The validator still calls JSON.parse on each record: this reduces simultaneous object retention and repeated serialization, not all JSON parsing.

Empty and smaller stores use the established complete-store path. Normal scoped reads retain their separate implementation. Old formats, unsupported layouts or corrupt offsets fall back to the existing bounded reader. Cache key, entry schema, expiry policy, successful row merging and newest-entry preference remain compatible. An upgrade does not require clearing existing caches.

Both sides of a concurrent save re-read the latest store and merge completed translation rows. Storage has no atomic compare-and-swap operation, so this does not create a native atomic transaction or guarantee absence of races across simultaneous storage writes.

## Limits and native contracts

Cache: **128 entries / 64,000 serialized JSON UTF-16 characters**. Lyric/entry input: **256/128 KiB**. Ordinary service response: **96 KiB**; public embed: **256 KiB**. Fallback: **twelve requests / 256 KiB / at most seven seconds** inside the existing overall deadline. Translation: **64 unique rows per request, URL at most 6,800 characters, 2.5-second budget**. Requests remain sequential per job; two-job admission remains advisory. All prior strict decoding, native callback completion and protected-header behavior is retained.

See [client/provider contracts](CLIENT-CONTRACTS.md) and [Loon's official API](https://nsloon.app/docs/Script/script_api/). Native buffering before a callback is outside JavaScript body limits. There is no verified whole-VPN memory ceiling, native import acceptance or iPhone stability result for this release.

## Functional validation

**851 automated tests pass, zero failures or skips**, plus Egern YAML validation. Fourteen new tests cover record-wise save, old/malformed layouts, unrelated lyric preservation, same-song translation merging, newer concurrent entries, host cooldowns, Unicode/escaping, bounded eviction, expiry and retry after a storage write error. Existing five-client JSON/Protobuf, source matching, translation, palette, overlap and callback tests remain.

`cache-compatibility-results.json` additionally compares 300 generated scenarios, 70 writes each, against unchanged 0.4.16. It covers overlapping snapshots, TTL conflicts, legacy/index-corrupt migration, cooldowns and escaped Unicode text. Complete serialized cache outputs match byte for byte in all cases.

## Save-only measurements

`cache-write-results.json` uses twelve fresh processes per version/scenario, 32 MiB old-space, and the same 60,032-character synthetic cache. Import, fixtures, scoped read and pending put happen before measurement. Samples instrument JSON parse/stringify returns and storage writes. Those hooks add CPU overhead. These are save-only measurements, not whole-script or phone/VPN measurements. Complete output hashes match.

| Save operation | Median ms 0.4.16 -> 0.5.0 | Sampled heap growth bytes | Characters reserialized |
| --- | ---: | ---: | ---: |
| metadata-new | 0.88 -> 0.7892 | 730,104 -> 535,024 | 119,783 -> 657 |
| translation-merge | 0.985 -> 0.9141 | 816,816 -> 682,328 | 123,019 -> 5,579 |
| fallback-new | 0.9384 -> 0.82 | 752,016 -> 543,280 | 123,236 -> 4,110 |

The largest individual JSON parse in these save samples changes from 60,032 to 1,686 characters. The complete cache is still held as serialized text, and output assembly still allocates strings; these are not zero-allocation saves.

## Previously unseen song: empty cache versus populated cache

Both first-load reports use twelve fresh processes per version/scenario, 32 MiB old-space, zero-latency native HTTP mocks and the compiled Loon runtime. Every native output hash and HTTP request count matches the baseline. Sampling is at invocation/HTTP/completion boundaries and does not capture every allocation, native buffering or external typed-array storage. Cold compilation is included.

`native-first-load-results.json` starts with no lyrics/translation cache; seed=true supplies only playback metadata/palette. `native-filled-first-load-results.json` starts with 48,000-60,000 serialized characters belonging to other songs, then opens a previously unseen song. Its new song has playback metadata only for seed=true. Empty-fallback cases fetch public embed metadata through the mock transport.

| Cache state / scenario | Median CPU ms 0.4.16 -> 0.5.0 | Sampled heap growth bytes |
| --- | ---: | ---: |
| empty / official-en-24 | 5.342 -> 5.421 | 1,088,384 -> 872,896 |
| empty / fallback-en-24 | 6.747 -> 6.826 | 936,504 -> 940,584 |
| empty / official-en-48 | 5.705 -> 5.761 | 904,456 -> 908,576 |
| empty / fallback-en-48 | 7.291 -> 7.29 | 1,082,792 -> 1,086,760 |
| empty / official-en-120 | 6.607 -> 6.699 | 1,164,312 -> 1,168,416 |
| empty / fallback-en-120 | 8.439 -> 8.535 | 1,487,088 -> 1,487,712 |
| empty / official-zh-48 | 6.297 -> 6.368 | 976,584 -> 980,696 |
| empty / fallback-zh-48 | 7.909 -> 7.926 | 1,157,928 -> 1,161,864 |
| empty / empty-fallback-en-48 | 7.727 -> 7.816 | 1,136,504 -> 1,140,392 |
| empty / empty-fallback-zh-48 | 8.277 -> 8.168 | 1,218,264 -> 1,222,136 |
| populated / official-en-24 | 5.905 -> 5.987 | 1,398,056 -> 1,251,408 |
| populated / fallback-en-24 | 7.27 -> 7.484 | 1,573,344 -> 1,381,904 |
| populated / official-en-48 | 6.212 -> 6.32 | 1,512,472 -> 1,359,936 |
| populated / fallback-en-48 | 7.779 -> 7.758 | 2,231,336 -> 1,532,808 |
| populated / official-en-120 | 7.102 -> 7.217 | 1,771,456 -> 1,650,208 |
| populated / fallback-en-120 | 9.212 -> 8.872 | 2,071,264 -> 1,957,488 |
| populated / official-zh-48 | 6.809 -> 6.868 | 1,585,112 -> 1,593,744 |
| populated / fallback-zh-48 | 8.297 -> 8.492 | 2,282,960 -> 1,606,656 |
| populated / empty-fallback-en-48 | 8.354 -> 8.504 | 1,806,552 -> 1,690,176 |
| populated / empty-fallback-zh-48 | 8.614 -> 8.677 | 1,874,872 -> 1,758,568 |

Populated-cache heap growth decreases in nine of ten scenarios; the official Chinese sample increases. Most empty-cache samples add roughly four kilobytes rather than decreasing, while the official English 24-line case decreases. Timing has faster and slower cases. Garbage-collection and VM compilation boundaries affect these values; they do not prove uniform first-load acceleration or memory reduction. Every measured trial is retained in the reports.

## Continuous track changes

`native-playlist-results.json` checks 120 changes across twelve synthetic songs, all five clients and both JSON/Protobuf. Each client/format uses 36 initial mock HTTP calls and zero additional calls on successful revisits. `native-churn-results.json` uses 240 different cold songs and 720 mock HTTP calls per client/format to force cache eviction. Every turn checks 128 entries and 64,000 serialized characters; output hashes match 0.4.16. These use separate 32 MiB old-space Node processes and explicit GC every six changes, not a physical VPN extension.

| Loon sequence | Version / format | Elapsed ms | Sampled heap peak bytes | Retained heap bytes |
| --- | --- | ---: | ---: | ---: |
| 120 changes / 12 songs | 0.4.16 / json | 227 | 11,089,088 | 6,390,904 |
| 120 changes / 12 songs | 0.5.0 / json | 225 | 11,114,144 | 6,416,392 |
| 120 changes / 12 songs | 0.4.16 / protobuf | 219 | 13,111,456 | 6,400,104 |
| 120 changes / 12 songs | 0.5.0 / protobuf | 217 | 13,133,560 | 6,425,504 |
| 240 different songs | 0.4.16 / json | 893 | 22,500,840 | 5,481,952 |
| 240 different songs | 0.5.0 / json | 870 | 21,047,504 | 5,507,400 |
| 240 different songs | 0.4.16 / protobuf | 873 | 22,497,048 | 5,492,856 |
| 240 different songs | 0.5.0 / protobuf | 853 | 21,042,552 | 5,518,184 |

All ten current client/format cases pass in both final runs. Loon adds no timers in these uncontended runs. The 240-song Loon sampled peak decreases by about 6.5% in both formats; retained heap is slightly higher. Revisit-only behavior does not materially improve. These observations must not be presented as an iPhone/VPN memory number or a promise of no disconnects. Earlier unconfirmed Shadowrocket Node failure evidence remains in the prior release history; this run does not determine that failure's cause.

## Live public HTTP snapshot

`live-coverage-comparison.json` uses compiled Loon scripts, simulated Spotify 404, an empty cache and real public provider/translation HTTP. Eight public IDs span multiple artists; old/new order alternates. Both releases match six samples and leave two unmatched. All five matched foreign-language samples retain plugin translations, and all six successful revisits use zero HTTP. Failed source or metadata attempts can retry. The sample is not representative of the catalog and does not establish that Spotify itself lacks official lyrics for those songs. No lyrics, account tokens or page session fields are saved.

| Sample | Matched 0.4.16 / 0.5.0 | First load ms 0.4.16 / 0.5.0 |
| --- | --- | ---: |
| 那页夏天 | True / True | 2974 / 1909 |
| Blinding Lights | True / True | 1043 / 1379 |
| Never Gonna Give You Up | False / False | 5608 / 4315 |
| Shape of You | True / True | 1048 / 2235 |
| Perfect | True / True | 982 / 1274 |
| 4u7Ene7wjrC6dGE9rGQeFJ | False / False | 403 / 653 |
| Take on Me | True / True | 903 / 1222 |
| bad guy | True / True | 1014 / 1081 |

Uncontrolled network timings do not show a causal speed improvement. Coverage is unchanged in this snapshot. `live-translation-batch-results.json` separately verifies 64 synthetic original sentences translated in one real request through compiled Egern. The existing public endpoint is not a paid API service contract.

## Reproduce

```sh
pnpm install --frozen-lockfile --ignore-scripts
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 851
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node cache-compatibility-check.mjs /path/to/unchanged/0.4.16
node cache-write-bench.mjs /path/to/unchanged/0.4.16
node native-first-load-bench.mjs /path/to/unchanged/0.4.16
node native-first-load-bench.mjs /path/to/unchanged/0.4.16 --populated
node native-playlist-bench.mjs /path/to/unchanged/0.4.16
node native-playlist-bench.mjs /path/to/unchanged/0.4.16 --churn
node live-coverage-compare.mjs /path/to/unchanged/0.4.16
node live-translation-batch.mjs
```

The zero pin is a local test placeholder. Production imports pin an immutable runtime commit. Source and evidence live at that commit; main changes only twelve existing import/documentation files. The [0.4.16 source](https://github.com/hhhoratioxu/Proxy/tree/f58590b91003d5d887f556f74850faa63ccf4d59/Surge/Development/VerseLyrics0416) is the comparison baseline; build it before running comparisons. No on-phone dependency or paid API key is added.
