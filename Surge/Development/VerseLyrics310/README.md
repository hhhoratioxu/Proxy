# VerseLyrics 3.1.0

Spotify native fallback lyrics and plugin translations for Loon, Egern, Surge, Shadowrocket and Quantumult X. This release implements Chinese preservation and automatic timed-source upgrades. The unchanged comparison baseline is [3.0.0 source and runtime](https://github.com/hhhoratioxu/Proxy/tree/f782e75afe834be7c796f3ce1ec8d2e7939e312a/Surge/Development/VerseLyrics300). Generated import files pin this build.

## Changes

- Preserve both Simplified and Traditional Chinese when the target is either Chinese variant. Do not send pure Chinese lines for cross-conversion, show old per-track/per-line conversion cache rows or accept provider-attached conversions of the Chinese originals. Original words, typography and timestamps remain.
- Keep foreign and mixed-script translation, explicit Japanese/Korean translation, and Chinese-to-foreign-language translation. A missing language label no longer forces Han-only fallback lines into the translation service.
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

Chinese preservation applies to Han-only lyric lines with Chinese, missing or inaccurate non-Japanese/non-Korean language metadata. Explicit Japanese/Korean documents remain eligible for translation. A mixed-language chorus translates only eligible rows and keeps original row alignment. The selected target still determines translation of foreign words. Turning plugin translation off retains the established official-response behavior.

## Controls and bounds

Existing controls remain: TRANSLATION_ENABLED, TARGET_LANGUAGE, FALLBACK_PROVIDER, DISCOVER_MISSING, SOURCE_TRANSLATIONS, PREFERRED_SOURCE, MEMORY_MODE, FETCH_ARTWORK_COLOR, FALLBACK_OFFSET_MS, FALLBACK_MODE and NETWORK_MODE. No new setting is required for either change. Source off disables lookup. Cache-only permits only existing valid cached enrichment.

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

Local tests and macOS JavaScriptCore/Node mocks do not establish iPhone Loon memory, native buffering, live catalog coverage or VPN acceptance. Static-to-timed upgrades perform work the old release did not perform and can use more memory/time than static passthrough; the measurements report that tradeoff explicitly.
