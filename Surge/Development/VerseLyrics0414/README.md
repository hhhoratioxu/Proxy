# VerseLyrics 0.4.14 — missing-album matching and timed lyric preference

This release fixes a rejected-match path and improves fallback selection while preserving five native clients, six sequential sources, plugin translations, native colors and existing resource budgets. It cannot provide every song: sources may be missing, unavailable, incorrect or ambiguous, and the client must issue a lyric request before its response can be replaced.

## Changes

- LRCLIB signature results no longer require an album name from Spotify's public embed. Full normalized title and complete artist set must still match. Exact known albums retain a two-second duration tolerance; absent or different albums require at most one second and reject alternate editions. A server-selected signature is checked locally, but does not prove global catalog uniqueness. Bounded searches retain conservative ambiguity checks.
- A verified timed signature returns immediately, avoiding the larger search and later providers. A plain or fragmentary signature scopes its one follow-up search to the verified candidate album when available. A missing or rejected signature still uses the broader search. No unsupported pagination or field-selection option is assumed.
- Matching timed search records take priority over plain ones. Auto mode retains only one compact plain backup while later providers seek real timestamps, inside the same total budget. If none succeeds, the backup is returned as UNSYNCED. Plain lyrics survive later search failures. Pending native transports and superseded jobs still retire through existing admission rules.
- Instrumental records with contradictory text and tiny untimed fragments are not accepted as LRCLIB lyrics. The fragment heuristic rejects one-line untimed text shorter than sixteen characters on tracks over sixty seconds; it may also reject a legitimate very short lyric. It does not manufacture a complete document from an unreliable fragment.
- Negative-cache revision advances to 5 so old misses do not suppress the new matching path. Successful cached documents remain compatible. New LRCLIB selection helpers initialize inside the provider branch, only when needed. Loon text callbacks, lazy Han tables, exact-size wire output, translation batching, highlight correction and adapter 10 host contracts remain.

See [client/provider contracts](CLIENT-CONTRACTS.md) for official API references. Reports retain no credentials, page/session fields or externally sourced lyric text.

## Resource limits

Cache: **128 entries / 64,000 serialized JSON UTF-16 characters**. Lyric/entry input: **256/128 KiB**. Ordinary service response: **96 KiB**; public embed: **256 KiB**. Fallback chain: **twelve requests / 256 KiB / at most seven seconds** inside the existing overall deadline. Requests remain sequential per job. Two-active-job admission is advisory because native persistent storage is not atomic. No extra hook or parallel source request is added.

Byte checks bound accepted/decoded data; native clients may buffer an oversized HTTP response before the callback. Avoiding bulk searches reduces that exposure but does not cap the VPN process. Searching beyond a plain hit adds bounded work. No uniformly lower heap or VPN-stability guarantee is made.

## Reproduce

Use Node 24, pnpm, Python 3 and Ruby:

```sh
pnpm install --frozen-lockfile --ignore-scripts
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 770
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node native-first-load-bench.mjs /path/to/unchanged/0.4.13
node native-playlist-bench.mjs /path/to/unchanged/0.4.13
node live-coverage-compare.mjs /path/to/unchanged/0.4.13
```

The zero pin is a test placeholder. Production uses an immutable runtime commit. Source/runtime artifacts live at that commit; main changes only twelve established import/documentation files. Terser remains a pinned build-only dependency. Phone scripts require no new runtime package.

## Validation

**770 automated tests pass, zero failures or skips**, plus Egern native YAML checks. The 39 new cases cover missing-album/equivalent matching, wrong title/artist/version/duration/instrumental rejection, timed preference, plain retention after failures, placeholder handling, old negative caches, translations/colors and all five compiled clients in JSON and Protobuf. Existing timeout, oversized/malformed body, budget, burst/coalescing, cache, translation, wire and palette tests pass.

Real HTTP comparisons use simulated Spotify 404 responses, an empty cache and a mock Loon host under Node. They do not establish which songs lack official Spotify lyrics, a representative catalog hit rate, native UI behavior, phone memory or VPN stability. Versions alternate order; network/service latency is uncontrolled.

| Public sample | Requests before -> after | Response bytes before -> after | Matched before -> after |
| --- | ---: | ---: | --- |
| 那页夏天 | 4 -> 4 | 22,819 -> 22,819 | True -> True |
| Blinding Lights | 6 -> 3 | 199,427 -> 19,505 | True -> True |
| Never Gonna Give You Up | 8 -> 8 | 332,180 -> 230,383 | False -> False |
| Shape of You | 6 -> 3 | 420,630 -> 30,860 | True -> True |
| Perfect | 6 -> 3 | 218,178 -> 21,279 | True -> True |
| 4u7Ene7wjrC6dGE9rGQeFJ | 1 -> 1 | 6,384 -> 6,386 | False -> False |
| Take on Me | 6 -> 3 | 152,486 -> 17,432 | True -> True |
| bad guy | 6 -> 3 | 211,538 -> 20,696 | True -> True |

All six successful samples in each version remain available; two remain unmatched. Five samples avoid a bulk LRCLIB search, but this auto-mode sample does **not** prove a higher overall hit rate: the prior version found those through QQ. Never Gonna Give You Up still failed reliable matching; its direct result was a five-character untimed placeholder. The other unmatched sample lacked usable public embed metadata. These misses remain in the report.

Line counts differ by provider because of empty rows, credits and segmentation; they are not a completeness score. Foreign-language successes retain plugin translations. Successful revisits use zero HTTP. No source lyrics are copied into reports.

## Memory and CPU

`native-first-load-results.json` uses twelve independent process trials per version/scenario: 240 processes, each with one fresh VM and a 32 MiB old-space limit. HTTP mocks have zero latency. Final output hashes match across versions. Heap growth is sampled from compilation through completion, not every allocation or native buffering.

| First invocation | CPU ms before -> after | Heap growth B before -> after | HTTP before -> after |
| --- | ---: | ---: | ---: |
| official-en-24 | 5.075 -> 5.097 | 1,086,808 -> 1,088,432 | 1 -> 1 |
| fallback-en-24 | 6.495 -> 6.592 | 944,448 -> 948,864 | 2 -> 2 |
| official-en-48 | 5.542 -> 5.498 | 911,640 -> 913,312 | 1 -> 1 |
| fallback-en-48 | 6.984 -> 7.147 | 1,346,768 -> 1,351,048 | 2 -> 2 |
| official-en-120 | 6.35 -> 6.5 | 1,197,840 -> 1,199,752 | 2 -> 2 |
| fallback-en-120 | 8.169 -> 8.126 | 1,479,728 -> 1,484,184 | 3 -> 3 |
| official-zh-48 | 5.988 -> 6.018 | 947,336 -> 948,624 | 1 -> 1 |
| fallback-zh-48 | 7.564 -> 7.513 | 1,168,104 -> 1,172,648 | 2 -> 2 |
| empty-fallback-en-48 | 7.606 -> 7.56 | 1,418,488 -> 1,405,816 | 4 -> 3 |
| empty-fallback-zh-48 | 8 -> 7.808 | 1,499,648 -> 1,486,664 | 4 -> 3 |

Missing-album cold scenarios remove one HTTP request and reduce median sampled heap growth. Known-album paths add a small amount of selection code. Known-album and official cases mostly show small heap-growth increases from the added code. Engine GC makes samples variable. These results are **not** universal memory reductions; all final-run trials, including increases, are retained.

`native-playlist-results.json` covers 120 changes across twelve synthetic songs, metadata plus lyrics per change, both formats and all five clients. It retains the 32 MiB old-space limit and GC every six changes. All output hashes match; all clients use 36 HTTP calls for cold songs and zero more on revisits, with at most one active request per job. Loon schedules no timers in this uncontended case.

| Loon 120 changes | Time ms | Sampled peak B | Retained heap B |
| --- | ---: | ---: | ---: |
| 0.4.13 json | 220 | 11,561,896 | 6,389,272 |
| 0.4.14 json | 222 | 11,569,224 | 6,396,184 |
| 0.4.13 protobuf | 216 | 13,126,424 | 6,398,400 |
| 0.4.14 protobuf | 217 | 13,134,920 | 6,405,312 |

Sustained peaks and retained sizes are approximately unchanged, not a measured reduction. This release reduces unnecessary network work while retaining bounded behavior. Real-device acceptance remains outstanding.
