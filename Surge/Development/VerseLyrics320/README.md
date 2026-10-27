# VerseLyrics 3.2.0

Original Spotify-native lyrics core and five native adapters. Loon's canonical entry remains SpotifyLyrics.lpx. This release addresses excess native entry-script retention during a Spotify relaunch burst.

## Change

With requires_body enabled, native response hooks already have their entire body. In 3.1.9 the local entry core/bridge still awaited asynchronous readers and Promise completion. The 3.2.0 native entry builds use a synchronous bounded reader and call done before the current host evaluation returns. Declared Content-Length, byte limits, UTF-8, malformed/unknown input, settings, headers, metadata/cache and every entry rewrite remain checked.

Loon, Surge, Shadowrocket and Quantumult X receive this synchronous local entry path. Its unused asynchronous arrayBuffer property is removed. Egern keeps its native asynchronous Response/stream contract. Actual source/translation HTTP callbacks still finish before script completion. There is no new timer, lease, queue, concurrency, host API or storage key. Native adapter is 16; minimum Loon remains 3.5.1(983).

All six sources, native lyric colors/timing, static-to-timed switch, bilingual artist matching, mixed Chinese/English translation, Chinese script filtering, vocal-language behavior and old-cache translation recovery remain. Source revision stays 8; successful caches and capacity settings remain compatible.

## User report and evidence boundary

On 2026-10-28 the user clarified that Spotify was swiped away and reopened, then the VPN disconnected. Current phone version and a process termination record were not captured. This release fixes an implementation issue reproduced in compiled scripts; it does not identify the actual phone termination reason or claim a real-device VPN acceptance test. See STARTUP-EVIDENCE.md.

The stress model deliberately dispatches 72 entry responses in one JavaScript turn, mixing nine startup routes and 12/40/90 KiB self-written bodies before draining Promise jobs. Its pending-context/body counts are scheduler-dependent measurements, not a captured Loon scheduler or total native VPN memory. macOS JavaScriptCore separately verifies the completion point inside the same evaluation. Actual values, hashes and regressions are published in MEASUREMENTS.md.

## Validation

2,181 tests pass, including 84 new compiled native entry cases. All 2,097 previous cases remain. Tests cover synchronous successful rewrites, string/byte bodies, declared and actual oversize, invalid UTF-8, unsupported bodies, disabled/marked/error paths, immediate metadata visibility and repeated relaunch responses. Egern YAML validates.

Recorded comparisons include 96 fresh Node startup-burst processes, 408 fresh Node lyric first-load processes, 48 macOS JavaScriptCore entry processes, 4,800 mixed lyric responses and 16 network-pressure processes. Final runtime SHA256s are frozen before and after every measurement step. No physical iPhone or total VPN memory measurement was performed.

Input/cache/network limits remain: 256 KiB lyric body; 128 KiB entry body; 96 KiB service reply; 600 rows; 12 source requests and 256 KiB cumulative source bytes; 64 original rows and 6800 URL characters per translation batch, 2.5-second translation window. Standard cache remains 128 entries/64000 characters; compact 64/32000 with existing per-entry bounds.

## Reproduce

    pnpm install --frozen-lockfile --ignore-scripts
    node build.mjs
    python3 package.py RUNTIME_COMMIT 2181
    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb
    python3 run-measurements-320.py NODE BASELINE_319_SOURCE
    python3 summarize-320.py

Baseline immutable source/runtime commit: 6392d31a69b9c6f5044827d24055ac4dd6222319, source prefix Surge/Development/VerseLyrics319. Comparison inputs need readable source at the baseline root and compiled files under runtime/. A macOS Command Line Tools SDK supplies the public JavaScriptCore C API harness. The harness appends a timing marker during evaluation; the measured runtime files themselves stay byte-identical to their manifest.

The implementation is original code using public wire fields and service endpoints. Unicode notices are retained. Production inputs are based on the current leased main, preserving unrelated routing changes.
