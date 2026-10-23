# VerseLyrics 3.1.9

Original Spotify-native lyric rewriting core and five native client adapters. Consumers import one current entry per client; Loon uses SpotifyLyrics.lpx. This immutable commit preserves readable source, generated runtimes, tests and measurements.

This release fixes a reproduced source matching failure: QQ credits 김예지 (Kim Yeji), while Spotify credits KimYeji. Normalizing the whole bilingual label into one artist key previously rejected the same recording.

## Reported recording and boundary

Public Spotify metadata for Burn It Down, track 5gjHrjV4IhqPqoDHQUAriQ, reports 213600 ms. QQ returns the same title, 김예지 (Kim Yeji), 213 seconds and real LRC timing. The same public replies produce no lyric document in 3.1.8 and 42 timed lines in 3.1.9. The compiled Loon host mock also retrieves them from empty storage through real public HTTP, then reopens from cache with zero requests.

The user phone response and display were not captured. The live check simulates an official HTTP 404 and disables translation for the real-song lookup; compiled native tests retain fallback plus translation with self-written text. No raw song lyrics or public embed session data are archived. See target-track-evidence.json, target-track-reproduction.json and live-source-results.json.

## Changes

- Preserve the normal exact-name path. Only a disagreement involving one explicit bilingual label parses its two complete names, covering Latin plus Han, Hangul, Hiragana or Katakana in either order.
- Match all performers one to one with at most 32 groups. Reject overlapping aliases, partial names, nested brackets, same-script qualifiers and recognized member/cover annotations. Title, duration, album/version and relaxed-album uniqueness checks remain.
- Use only complete names actually supplied by the source. No track-ID branch, artist database, fuzzy matching, extra catalog query, external name translation or invented timing.
- Source revision 8 invalidates old ordinary/timed negative records on the next request. Successful lyrics and translations remain reusable without global purge.
- Preserve all six sources, static-to-timed replacement switch, plugin translation, Chinese mixed English, Chinese script-only filtering, vocal-language rules, colors and timing.
- No new host API, option, timer, concurrency or cache capacity. Loon still uses native Rewrite, two response hooks, adapter 15 and minimum 3.5.1 (983).

## Verification and limits

2,097 automated tests pass, including 107 new cases and 60 compiled client/format cases. All 1,990 old cases remain. Install tests now read canonical .lpx files in a clean output directory. Egern YAML validates.

408 fresh Node processes, 48 macOS JavaScriptCore processes, 4,800 native mixed responses and 16 arrival-pressure processes are recorded in MEASUREMENTS.md. Tables include regressions and the extra work of newly successful lookups. This is a coverage repair within existing limits, not a universal speed/memory reduction or an iPhone/VPN stability guarantee.

Limits remain: 256 KiB lyric body, 128 KiB entry body, 96 KiB service reply, 600 rows, 12 source requests and 256 KiB total source bytes; 64 original rows and 6800 URL characters per translation batch, 2.5-second translation window. Cache: standard 128 entries/64000 characters; compact 64/32000 with existing per-entry limits.

## Build and reproduce

    pnpm install --frozen-lockfile --ignore-scripts
    node build.mjs
    python3 package.py RUNTIME_COMMIT 2097
    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb
    python3 run-measurements-319.py NODE BASELINE_318_SOURCE
    python3 summarize-319.py BASELINE_318_SOURCE

Baseline source/runtime commit: dce3a071f048bd3a58711dc0440aa10c8c0b5401; source prefix Surge/Development/VerseLyrics318. Place baseline source at the comparison directory root and generated files under runtime/. Runtime hashes are frozen before/after every measurement step.

Run node live-source-check.mjs for a fresh public lookup. For the two-core comparison, python3 fetch-target-fixtures.py returns a temporary directory; pass it to node reproduce-bilingual-source.mjs BASELINE_318_SOURCE FIXTURE_DIRECTORY. Public service results and latency may change. The helper deletes the unneeded public embed session document and leaves raw song lyrics only in the local temporary directory.

The implementation is original code using public wire identifiers and service endpoints. Existing Unicode notices remain beside Egern runtime and inside native scripts. Current main inputs are captured with a lease to preserve unrelated repository work.
