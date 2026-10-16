# VerseLyrics 0.5.2 — aligned source translations and incremental LRC parsing

This release adds a concrete capability: reuse Chinese translations that arrive in the same validated fallback lyric response. It also reduces temporary LRC parsing allocations. It does not claim that the user's Loon memory exits or VPN disconnections are solved. First-load total heap is not lower in every measured scenario; those regressions are retained below instead of being hidden behind the version bump.

## Functional changes

The new `SOURCE_TRANSLATIONS` preference defaults to true on all five native clients. For a `zh-CN` target, NetEase `tlyric.lyric` and QQ `trans` are optional inputs. Original song identity must already pass the existing full title/artist/duration/version checks. Translation timestamps must match the original exactly in milliseconds. Untimed rows, shifted timestamps, conflicting translations for repeated originals, mixed scripts and Traditional Chinese are not guessed into place. Uncovered lines continue through the existing translator. Existing useful translation cache pairs take precedence. Spotify's native alternatives are never used as this source.

Source-derived cache pairs carry a third `source` tag in the existing bounded translation record. Disabling `SOURCE_TRANSLATIONS` ignores these pairs and uses the translation service; ordinary two-element cache pairs stay compatible. No second persistent translation store, new key, extra source request, prefetch or retry queue is introduced. Native words, timing, colors and JSON/Protobuf layout remain unchanged.

The LRC parser scans one line at a time instead of building a full split array and retaining all timestamp RegExp matches. Common single-tag rows retain a numeric time; multiple tags retain only additional numeric times. Already ordered timestamps avoid sorting; duplicate timestamps merge in place. Existing offset, entities, duplicate-line, malformed-tag and resource-limit semantics are preserved. The Han table generator also now preserves the lookup function when regenerated; its output is byte-identical to the released source. The Unicode table representation itself is unchanged.

## Bounds and native contracts

Adapter 11 adds the preference to existing native argument/env APIs. [Client contracts](CLIENT-CONTRACTS.md) record the sources, callback completion rules and limitations. Loon uses documented object arguments and native millisecond timeouts; outstanding callbacks finish before one `$done`. Loon, Surge and Shadowrocket lyric hooks have no JS timers. Egern retains native `ctx` APIs. Quantumult X retains one overall watchdog. No new host API, cancellation assumption, permission, paid key or network configuration is introduced.

All six lyric providers remain. The inherited 0.5.1 advisory single network slot has no waiting queue. Overloaded uncached responses can still temporarily lack enrichment until a later client request; storage is not atomic and no automatic retry is promised. Cache remains 128 records / 64,000 serialized UTF-16 characters. Lyric/entry body limits remain 256/128 KiB; service response 96 KiB; fallback lookup twelve requests / 256 KiB / up to seven seconds. Native input buffering and native VM allocation are outside these limits.

## Validation and measured tradeoffs

**926 tests pass**, including five compiled client bridges in JSON and Protobuf, complete/partial source translations, disable-and-cache behavior, provider mismatch, wrong timing, repeated-original conflicts, source failure, Spotify translation replacement, 500 deterministic parser comparisons, all 6,447 Han mappings, cache limits and overlapping native callbacks. Egern YAML is separately parsed and validated.

[LRC parser measurements](lrc-parser-bench-results.json) use four separate Node processes per version, 32 MiB old-space, thirty sampled single parses per case with GC outside the sample, and a separate 500-parse timing loop. Hashes match the unchanged 0.5.1 output. Heap delta includes temporary garbage remaining after the call; it is not retained memory, an allocator peak or iPhone memory.

| Ordered LRC rows | 0.5.1 heap delta | 0.5.2 heap delta | 0.5.1 / 0.5.2 ms per parse |
| --- | ---: | ---: | ---: |
| 24 | 34,808 B | 14,488 B | 0.0149 / 0.0087 |
| 48 | 62,616 B | 26,856 B | 0.0258 / 0.0138 |
| 120 | 137,184 B | 60,544 B | 0.0486 / 0.0342 |
| 600 | 681,328 B | 306,984 B | 0.2432 / 0.1715 |

Reverse and multiple-tag cases also retain exact outputs, with smaller allocation improvements. This local parsing reduction is not a claim about total VPN memory.

[Source translation measurements](source-translation-bench-results.json) use six fresh processes per version/case, fresh compiled Loon contexts, metadata/palette only in the initial cache, and fixed **120 ms mock HTTP latency**. The same source response and final native Protobuf bytes are used in both versions. Warm revisits make zero HTTP requests.

| Rows / source coverage | HTTP calls 0.5.1 → 0.5.2 | Translator rows | Median ms | Sampled heap growth |
| --- | ---: | ---: | ---: | ---: |
| 48 / complete | 3 → 2 | 48 → 0 | 376.937 → 257.498 | 1,224,568 → 1,205,608 B |
| 48 / half | 3 → 3 | 48 → 24 | 377.473 → 381.165 | 1,215,744 → 1,248,848 B |
| 120 / complete | 4 → 2 | 120 → 0 | 500.025 → 257.283 | 1,634,824 → 1,582,640 B |
| 120 / half | 4 → 3 | 120 → 60 | 503.918 → 384.698 | 1,609,144 → 1,696,272 B |

Complete coverage saves network operations. Partial coverage saves translated text, but the 48-row case does not save a request or improve time, and both partial cases increase sampled heap by about 3–5%. Source-specific processing was separated from the common translator after an earlier prototype showed a larger regression. A compact Unicode-table experiment failed the cold-memory comparison and was removed; it is not part of this release.

[First-load results](native-first-load-results.json) retain twelve fresh-process trials for ten ordinary official/fallback English/Chinese scenarios. Native output hashes and HTTP counts match 0.5.1 in all ten cases. There is no universal speed or heap improvement: several cases have small increases, and the 24-row seeded English / empty Chinese fallback samples have larger heap variation. This benchmark includes V8 code/context and harness overhead and samples only selected boundaries. It cannot establish a native iPhone memory ceiling.

[Cold-song churn](native-churn-results.json) passes 240 different songs per client/format, with 720 sequential mock HTTP requests, identical content hashes and per-turn bounded-cache checks. Loon JSON elapsed time is 902 → 899 ms; Protobuf is 886 → 887 ms, approximately unchanged. GC is explicit every six changes; every process has 32 MiB old-space. This is a regression test, not a phone or overlapping-pressure measurement. The existing 80-request overlap tests remain in the automated suite.

## Public service evidence

[Schema observations](source-schema-observations.json) contain counts and field names from actual public responses, without saved lyrics. NetEase supplied translated LRC. Three QQ samples had an empty `trans`; nonempty QQ translation behavior is fixture-tested only. These endpoints are observed public service schemas, not vendor stability guarantees.

[Compiled Loon public flow](live-source-translation-results.json) records both outcomes. An empty-cache Spotify Shape of You request did not produce a verified NetEase fallback after public metadata/search, so it remained missing. This is retained as a failed full lookup, not called successful lyric coverage. A separately labeled case seeded the exact signature from a real NetEase search candidate with a synthetic Spotify track ID and palette; public search, lyric and translator requests then produced 135 original rows, 26 unique source-translation pairs and 31 translator pairs. A warm revisit used zero HTTP and returned identical bytes. This proves the new response processing and native bridge against real service data, not independently verified Spotify album identity or physical UI display.

No account token, full lyric text or embedded session payload is saved in these reports. Native import, physical-device playback, actual VPN memory and the user's disconnection are unverified.

## Reproduce

```sh
pnpm install --frozen-lockfile --ignore-scripts
node generate-han-tables.mjs
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 926
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node lrc-parser-bench.mjs /path/to/unchanged/0.5.1
node source-translation-bench.mjs /path/to/unchanged/0.5.1
node native-first-load-bench.mjs /path/to/unchanged/0.5.1
node native-playlist-bench.mjs /path/to/unchanged/0.5.1 --churn
node live-source-translation-flow.mjs
```

The [0.5.1 baseline](https://github.com/hhhoratioxu/Proxy/tree/37f5b58fcd2a95489dec1409b0b19d1baf7e71b4/Surge/Development/VerseLyrics051) is unchanged. Benchmarks run sequentially. Zero pin is for local configuration checks only; production uses immutable runtime commits. Publication updates only the twelve existing import/documentation files on main, preserves unrelated resources with an expected-head guard, and verifies all native imports and runtime bytes after publication.
