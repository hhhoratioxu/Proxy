# VerseLyrics 3.1.3

Native Spotify fallback lyrics and plugin translations for Loon, Egern, Surge, Shadowrocket and Quantumult X. This release reduces repeated startup, cache and translation work against [published 3.1.2](https://github.com/hhhoratioxu/Proxy/tree/eb45d9ea239fdd649d4d22c0695435531f986de3/Surge/Development/VerseLyrics312). Adapter 14 and all eleven controls remain.

## Work reduced in this release

- Store the same 6,447 Unicode 17 Han mappings as 16-record blocks with small first-key indexes. Source planes are loaded lazily; Latin-only matching loads none, BMP-only matching does not initialize supplementary planes, and lookups need no full decompression, runtime dictionary or variant Map. Generator, independent reference pairs and complete mapping/nonmapping regressions are included.
- Within each existing bounded translation batch, identical Latin queries from different Chinese rows use one q and one service result. Compose the result separately within each literal Chinese original, preserving row order and punctuation. The normal path allocates no query map; alias arrays exist only when duplicates are found and remain capped at 64 original rows. Prefix collisions are not accepted.
- Compare each distinct original/translation pair once before emitting repeated chorus or layout rows. Retain the full output row count and 60,000 output-character limit. Cache ownership, provenance and no-op proofs keep their original meaning.
- Pure Chinese rows targeting either Chinese variant bypass translation cache reads and network work. Mixed English still translates. An ASCII short-circuit avoids unnecessary stripping for those mixed rows; the tested original Unicode rules remain for other scripts.
- Malformed JSON service replies (including HTML with HTTP 200) use the existing host backoff for 15 seconds. Repeated songs do not renew that deadline or store a false no-lyrics proof; other sources/cached results remain available and expiry permits a new request. No timer or new storage key is added.
- After a cache write, keep old untouched records as serialized ranges until a caller requests their value or entries. Do not inflate a second metadata view just before script completion. Reads, subsequent puts/saves, concurrent merges, malformed input and both capacity limits remain covered.

Loon lyric runtime is 88,457 bytes in this build (see runtime-manifest.json for the exact final count), about 9.6% less than 3.1.2 at 97,832 bytes. This is a download/source-size saving; it is not a universal RAM or latency claim. Full measurements include both increases and decreases. A rejected lookahead-regex experiment is not used.

## Chinese and mixed English behavior retained

For Chinese targets, Latin words/phrases inside Chinese are sent as newline-separated spans within one q per original row, then returned to their exact positions. Chinese and punctuation stay literal. A repeated q may be shared across different rows in the same batch. Foreign-language rows and Japanese/Korean/other scripts keep whole-row automatic translation. The chosen target still controls English translations; existing Chinese stays in its original variant.

For example, `如果你愿意 stay with me` can become `如果你愿意 留在我身边` under zh-CN or `如果你愿意 留在我身邊` under zh-TW. `原創紙燈` does not acquire a `原创纸灯` alternative. All accepted cache, source and network results still pass the conversion-only output filter. Pure script conversion is suppressed; useful embedded-English translation is retained.

Old mixed identity/conversion cache pairs are retried selectively, useful pairs remain warm, and current attempted no-op results retain a per-pair checked marker. Source-tagged translations remain controlled by SOURCE_TRANSLATIONS. Cache-only never starts plugin HTTP. No manual cache purge, new cache namespace, timer, parallel lookup or added setting is required.

## Retained 3.1.0 behavior

- Preserve both Simplified and Traditional Chinese when the target is either Chinese variant. Do not send pure Chinese lines for cross-conversion, show old per-track/per-line conversion cache rows or accept provider-attached conversions of the Chinese originals. Original words, typography and timestamps remain.
- Keep independent foreign rows, rows with Japanese/Korean or other foreign scripts, and Chinese-to-foreign-language translation. A missing language label no longer forces Han-only fallback lines into the translation service.
- Upgrade recognized official UNSYNCED text automatically using identity-checked real timestamps from plugin sources. Already synchronized official lyrics keep their existing source; unknown/malformed/access-error schemas remain guarded. Failed upgrades retain official words and available plugin translations.
- A static upgrade requires actual LINE_SYNCED data even when FALLBACK_MODE=fast. Plain positive/fast caches do not block a timed lookup. The untimed-only lyrics.ovh source is skipped in this path; all six sources remain available for completely missing lyrics.
- Reuse a complete successful no-timeline search for at most 90 seconds inside the existing bounded cache. Keep it separate from ordinary missing-lyrics evidence. Errors and incomplete searches stay retryable. Keep the existing deadlines, sequential HTTP, body limits, advisory owner and completion behavior.

## Native behavior

| Official response | Behavior |
| --- | --- |
| Synced lyrics | Preserve official words/timing/palette and use plugin translation where needed. No source search. |
| Static UNSYNCED lyrics | Seek verified timed lyrics automatically. Preserve original text if unavailable. |
| Missing lyrics (404 or recognized empty lyrics) | Existing six-source fallback; synced default, optional fast plain result. |
| Authentication/access error or unsupported body | Preserve response. No attempt to turn an error into lyrics. |

The JSON enum UNSYNCED and protobuf enum zero/default identify the static path. Unknown future enums are preserved. No timestamps are invented, and source song/artist/album/duration/version matching is unchanged. No implementation can provide timed lyrics absent from every accepted source.

Chinese/Latin rows translate their Latin spans, preserving Chinese literally. Pure Chinese is not converted between scripts. Useful cached/provider translations still pass the conversion-only output filter. Explicit foreign target selection retains Chinese-to-foreign translation. Turning plugin translation off retains the established official-response behavior.

## Controls and bounds

Existing controls remain: TRANSLATION_ENABLED, TARGET_LANGUAGE, FALLBACK_PROVIDER, DISCOVER_MISSING, SOURCE_TRANSLATIONS, PREFERRED_SOURCE, MEMORY_MODE, FETCH_ARTWORK_COLOR, FALLBACK_OFFSET_MS, FALLBACK_MODE and NETWORK_MODE. No new setting is required. Source off disables lookup. Cache-only permits only existing valid cached enrichment.

| Limit | Value |
| --- | --- |
| Standard cache | 128 entries / 64,000 serialized characters |
| Compact cache | 64 entries / 32,000 serialized characters |
| Lyric / entry body | 256 / 128 KiB |
| Source response / full source chain | 96 / 256 KiB, at most 12 requests |
| Lyric rows | 600 |
| Translation | 64 short rows per batch; encoded URL at most 6,800 characters; 96 KiB response; 2.5 second translation window |
| Source networking | Existing single advisory owner, awaited callbacks, no admission polling or source parallelism |

These are project work bounds, not an official Loon memory ceiling. Native response buffering and iOS VPN lifecycle are outside the JavaScript measurements. Busy invocations finish without polling. Different-song contention can retire older work; no native request cancellation is claimed.

## Build, validation and evidence

The package lock pins Terser 5.51.2 as a build-only dependency. Run the following using a current Node and Python 3; Ruby performs native Egern YAML validation.

```sh
pnpm install --frozen-lockfile
node build.mjs
python3 package.py
node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
ruby validate-egern.rb
```

The build generates 15 runtime/license files, with two Loon response hooks and native Rewrite header handling. The production entry has no provider or translation engine and no legacy widget/status branch. The unused Loon request hook remains excluded. Adapter 14 and Loon minimum 3.5.1 (983) are unchanged.

[MEASUREMENTS.md](MEASUREMENTS.md) records the measured changes and limits. [validation-summary.json](validation-summary.json) contains current test and measurement totals. [CLIENT-CONTRACTS.md](CLIENT-CONTRACTS.md) documents the official host APIs, timeouts, binary data and completion behavior. Reproduction scripts and synthetic fixtures contain no real Spotify credentials or copied song lyrics.

Local tests and macOS JavaScriptCore/Node mocks do not establish iPhone Loon memory, native buffering, live catalog coverage or VPN acceptance. The comparison baseline includes functional mixed-English translation. All output hashes and native HTTP counts must match. Query counts and allocations can decrease without a uniform measured latency/RAM decrease; full results and scope are reported.


Reproduce the narrow regression with `node reproduce-work.mjs /path/to/312`. `node mixed-live-check.mjs` makes two public requests using six self-written mixed rows per target, checks identical-query reuse and warm cache. `node jsc-fixtures.mjs`, `node jsc-cache-fixtures.mjs`, `node jsc-release-fixtures.mjs`, `node jsc-300-fixtures.mjs` and `node mixed-fixtures.mjs` generate deterministic JSC fixtures. Compile jsc-memory-runner.c with the public macOS JavaScriptCore framework and run `python3 run-final-313.py /path/to/node /path/to/312` for the scoped comparison. Live service text can change; it is not a deterministic unit test.
