# VerseLyrics 3.1.8

Original Spotify-native lyric rewriting core and five native client adapters. Production consumers import one current entry per client; Loon uses SpotifyLyrics.lpx. Immutable readable source, generated runtimes, tests and reports are preserved in this source commit.

This version repairs two reproduced paths that can hide all translations on a Korean/English track: stale original-as-translation cache pairs preventing a new query, and one invalid answer discarding every otherwise valid answer in its batch.

## Reported recording and verification boundary

The user reported Girl's Day — Come Slowly, Spotify track 6n7jFn3rgC6qWjsYaPJfB8. Public Spotify embed metadata confirms the title, artist and 249213 ms duration. The protected lyric response and actual phone cache were not captured; an anonymous lyric probe returned HTTP 400. The tests explicitly seed the reproduced cache/result states and use self-written Korean/English sentences. No claim is made that these are the captured cause of the phone instance, or that a full song/iPhone UI/VPN acceptance test passed. See target-track-evidence.json.

## Changes

- Stale foreign/English identity pairs from track, legacy or source translations no longer count as successful translation. Existing real translations remain warm; no global cache purge is required.
- A reply must still contain exactly one positional result per query. Within a correctly sized reply, non-string, empty, oversized or misaligned fragment answers affect only their own original rows. Valid answers stay aligned and visible.
- New unchanged/invalid answers use a 30-second retry timestamp in the existing bounded translation record. Warm reopen does not keep retrying; after expiry, a later lyric request asks only for still unsuccessful rows. No background polling, extra timer, parallel fetch or cache capacity is added.
- Preserve native original words, timestamps, unknown fields and colors; six-source fallback; the official static-to-timed replacement switch; meaningful mixed English; no Chinese script-only translation; and the existing vocal/source-language boundary.
- Loon retains native Rewrite, two Response Script hooks, adapter 15 and minimum 3.5.1 (983). All five clients retain their own native interfaces.

## Validation

1,990 automated tests pass, including 98 added cases and 60 new compiled client/format cases. Egern YAML validates. Existing per-row retention expectations were updated deliberately; mismatched reply counts still fail without guessing positions.

Two real public translator requests through the compiled Loon host mock recover a seeded stale cache with self-written Korean/English text: Simplified and Traditional Chinese each return 4/4 translations in one cold request, then zero requests on reopen. The public route is not paid Google Cloud Translation and has no claimed official stability contract.

408 fresh Node process comparisons, 48 fresh macOS JavaScriptCore processes, 4,800 native mixed responses and 16 arrival-pressure processes are recorded. The tables retain regressions and the extra work of previously failing translation paths. These are desktop/script measurements, not iPhone VPN peak-memory or stability guarantees. See MEASUREMENTS.md and validation-summary.json.

## Limits and compatibility

Lyric input 256 KiB; entry input 128 KiB; service reply 96 KiB; 600 lyric rows; 64 original rows and 6800 URL characters per translator batch; 2.5-second translation window. Standard cache remains 128 entries/64000 characters, compact 64/32000, with existing per-entry bounds. Source identity, request, byte and total-time limits remain.

A finite numeric third pair field is accepted only with an empty translation and means a retry time. It can suppress a row only while within the next 30 seconds. It never appears as a visible translation. Old readers ignore this unsupported pair form. Successful/source/checked pair formats and the top-level cache schema remain compatible.

## Build and reproduce

Use the exact dependency lockfile:

    pnpm install --frozen-lockfile --ignore-scripts
    node build.mjs
    python3 package.py RUNTIME_COMMIT 1990
    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb
    node reproduce-recovery.mjs BASELINE_317_SOURCE
    python3 run-measurements-318.py NODE BASELINE_317_SOURCE
    python3 summarize-318.py

Baseline source and runtime commit: 898570540494794a4fc7efa0f97037b6049fd590. Source prefix: Surge/Development/VerseLyrics317. Comparison scripts require that baseline's runtime files under runtime/ and source files at its root. Runtime hashes are checked before and after every measurement step. Package inputs are taken from the leased current main, including .lpx migration and unrelated concurrent project updates.

The runtime uses original code and public wire identifiers/service endpoints. Unicode data notices are preserved beside the Egern runtime and inside compiled native scripts. Historical catalog matching evidence remains in SOURCE-EVIDENCE.md; this release introduces no recording-specific production branch, new lyric provider or new host capability.
