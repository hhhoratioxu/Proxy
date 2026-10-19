# VerseLyrics 3.1.2

Native Spotify fallback lyrics and plugin translations for Loon, Egern, Surge, Shadowrocket and Quantumult X. This release corrects the overbroad mixed-row skip in [published 3.1.1](https://github.com/hhhoratioxu/Proxy/tree/5f8e1b36cafe1fdf52b9a5100efea22ac4a6c52e/Surge/Development/VerseLyrics311). Adapter 14 and all eleven controls remain.

## Mixed Chinese and English

3.1.1 skipped an entire Chinese-containing row when it included Latin letters, so embedded English could never translate. Restoring the request alone is insufficient: two live synthetic requests showed the auto-detected Chinese route returning embedded English unchanged, or changing only the Chinese script. An experiment forcing the entire row to English did translate English but also reworded original Chinese. That approach is not used.

The candidate extracts Latin words/phrases from a Chinese/Latin row, joins multiple spans with newlines into one query for that row, and composes the exact number of returned spans within literal original Chinese and punctuation. It retains whole-row automatic translation for independent foreign-language rows and Japanese/Korean/other foreign scripts. Chinese-only rows are preserved when the target is either Chinese variant. The English fragment target follows the selected zh-CN or zh-TW preference, while existing Chinese stays in its original variant.

For example, the live synthetic result for `如果你愿意 stay with me` was `如果你愿意 留在我身边` under zh-CN and `如果你愿意 留在我身邊` under zh-TW. The original Chinese remains unchanged in both. `原創紙燈` does not acquire a `原创纸灯` alternative. The output guard also rejects only-conversion results from old caches and optional source translations. These are service observations on self-written text, not a phone capture or a claim of lyric-perfect translation.

Old mixed identity or conversion-only cache pairs are retried selectively; useful mixed translations retain their warm path. Fresh no-op results carry a per-pair `checked` marker inside the same bounded record, so one real attempted translation is not repeated at every reopen. Source-provenance entries remain controlled independently by SOURCE_TRANSLATIONS. Legacy line cache migration, layout aliases and concurrent scoped cache merges retain both meanings and provenance. Cache-only makes no request and suppresses stale conversions. No manual cache purge is needed.

No fragment cache, background timer, parallel query, runtime conversion dictionary or new setting is added. At most the existing 64 queries enter a batch; several spans in one lyric row consume one q. Encoded URL, response-size, output-character and deadline bounds still apply. Fragment responses with missing/extra rows or invalid shape are not guessed or cached.

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

Local tests and macOS JavaScriptCore/Node mocks do not establish iPhone Loon memory, native buffering, live catalog coverage or VPN acceptance. Restoring mixed translation adds necessary work compared with 3.1.1 skipping it. Measurements report that cost separately from unchanged paths; no universal memory or speed reduction is claimed.


Reproduce the narrow regression with `node reproduce-mixed.mjs /path/to/311`. `node mixed-live-check.mjs` makes two public requests using self-written inputs and checks warm cache reuse. `node jsc-fixtures.mjs`, `node jsc-cache-fixtures.mjs`, `node jsc-release-fixtures.mjs`, `node jsc-300-fixtures.mjs` and `node mixed-fixtures.mjs` generate deterministic JSC fixtures. Compile jsc-memory-runner.c with the public macOS JavaScriptCore framework and run `python3 run-final-312.py /path/to/node /path/to/311` for the scoped comparison. Live service text can change; it is not a deterministic unit test.
