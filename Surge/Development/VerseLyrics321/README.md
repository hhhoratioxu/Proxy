# VerseLyrics 3.2.1

Spotify native lyric fallback and translation for Egern, Loon, Surge, Shadowrocket and Quantumult X. Native adapter 17; Loon keeps the canonical SpotifyLyrics.lpx entry and minimum 3.5.1 (983).

## What changed

3.2.0 made local entry hooks synchronous, but its lyric response and cache paths still created resolved Promises. A burst could retain many complete lyric responses and VM contexts before those jobs drained. This release reads native response bytes synchronously and completes cache hits, disabled/invalid paths and busy responses within the current evaluation. Only the main flow, translation cache path, palette cache path and host bridge use the small local-until-I/O runner; real HTTP/source helpers keep their established async implementation. The three other native request-header hooks also finish synchronously. Egern keeps native asynchronous Response streams.

The build-only transform uses the exact Acorn already locked by Terser, validates the supported syntax, preserves try/catch/finally and rejects unsupported lexical bindings. Generator functions are static declarations, avoiding a fresh capturing wrapper at every call. No runtime download, extra timer, polling queue, storage key, network concurrency, cache capacity or undocumented native API is added. Native HTTP callbacks still settle before a single completion. The shared storage lease is advisory because native storage has no documented compare-and-swap.

## Current Chinese translation policy

The user's 2026-11-01 instruction supersedes the former Chinese/English fragment translation behavior. With zh-CN or zh-TW selected, only English songs are eligible. Chinese and other language songs keep their embedded English original. Chinese variants are never translated into one another. Official/source/legacy cached translations cannot bypass this gate; the gate runs before loading translation records, and Chinese source translations are rejected before parsing their LRC. There is no global cache purge or extra language-detection request. The compiled production bundles remove the retired Chinese mixed-fragment translation branch; the reusable shared translator keeps its generic helper tests.

An explicit non-English language tag disables Chinese translation. An English tag still cannot opt meaningful non-Latin lyrics into the translator. Providers without a language tag require ASCII/Latin lyrics plus English lexical evidence; ambiguous cases stay original. This small heuristic is conservative, not authoritative language identification. Users who explicitly select a non-Chinese target retain the existing translation behavior. English filler filtering, aligned source translations, retry behavior and warm caches remain for eligible English songs.

## Retained features and limits

Six sources (LRCLIB, QQ, NetEase, Kugou, Kuwo, lyrics.ovh), verified track/version matching, synchronized fallback, REPLACE_UNSYNCED switch, original words/timing/colors, palette adjustment, cache-only mode and all twelve preferences remain. No synthetic timestamp generation. An uncached missing song cannot gain lyrics if no verified source is available.

Limits remain 256 KiB lyric body, 128 KiB entry body, 96 KiB service response, 600 lyric rows, 12 source requests/256 KiB cumulative source bytes, 64 translation rows/6800 URL characters/2.5-second window. Standard cache remains 128 entries/64000 characters; compact remains 64/32000. These are script budgets, not native VPN memory ceilings. Requires-body hosts may already own the whole native buffer.

## Evidence

See [MEASUREMENTS.md](MEASUREMENTS.md), [STARTUP-EVIDENCE.md](STARTUP-EVIDENCE.md), [CLIENT-CONTRACTS.md](CLIENT-CONTRACTS.md) and [validation-summary.json](validation-summary.json).

The native mock and shared-core regression suite includes updated language-policy assertions, synchronous successful/blocked completions, single completion after real callbacks, stale cache suppression, all source/translation paths and bounded repeated switching. Superseded tests were updated to assert the new language policy; unrelated transport/retry tests now use unambiguous English fixtures.

The user's phone still disconnected after 3.2.0. No phone termination/Jetsam capture is available, so memory pressure is a plausible cause rather than an established diagnosis. This release fixes reproduced script retention; desktop tests and public byte checks do not establish iPhone VPN stability or promise that a disconnection cannot recur.

## Reproduce

    pnpm install --frozen-lockfile --ignore-scripts
    node build.mjs
    python3 package.py RUNTIME_COMMIT 2214
    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb
    python3 run-measurements-321.py NODE BASELINE_320_SOURCE
    python3 summarize-321.py

Baseline immutable runtime/source commit: c6ccfb93c1fb8e1140d5bd69d3b54f0a9f6e9e78, source prefix Surge/Development/VerseLyrics320. The comparison directory holds compiled files under runtime/. Benchmarks compare identical body/output bytes and HTTP counts where behavior is retained. Changed translation policy is tested separately from equal-work performance comparisons. The macOS public JavaScriptCore C API runner is independent of Loon/iOS. Final runtime hashes are frozen across all measurement steps.

Source and host bridges are original code using documented host interfaces and public wire fields. Unicode notices remain bundled. Publication leases the current main and preserves unrelated resources.

