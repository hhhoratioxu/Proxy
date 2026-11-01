# VerseLyrics 3.2.2

Spotify native lyric fallback and translation for Egern, Loon, Surge, Shadowrocket and Quantumult X. Native adapter 18; Loon keeps SpotifyLyrics.lpx and minimum 3.5.1 (983).

## What changed

Online fallback providers and matching helpers now live in a static lazy lexical scope. An ordinary official lyric response, a cached fallback or a busy request does not instantiate those source helpers. Only actual metadata or online lookup after network admission initializes the scope. Cached lyric decoding stays outside it. No runtime eval, external JavaScript, background initialization or new storage is involved.

For Chinese targets, the existing whole-song gate already rejects Chinese and other non-English songs. Eligible English rows no longer repeat obsolete Chinese mixed-line and simplified/traditional checks in cache validation and translation processing. Explicit non-Chinese targets retain their existing behavior.

A missing official response previously retained upstream cache headers when fallback was busy or temporarily failed. A subsequent client request could reuse that temporary no-lyrics response. With fallback enabled, the unchanged HTTP status, MIME type and body now receive Cache-Control: no-store and lose old validators/expiry. This does not fabricate success, queue work or force Spotify to request again. Verified complete source misses retain their bounded internal TTL; provider-off responses pass through.

The native local-until-I/O runner, Egern asynchronous stream handling and request/entry grammar are unchanged from 3.2.1. Real callbacks settle before completion. No timer, polling queue, persistent key, network concurrency, cache capacity or undocumented host API is added. The shared storage lease is advisory: native storage has no documented compare-and-swap.

## Chinese translation policy

With zh-CN or zh-TW selected, only English songs are eligible. Chinese and other-language songs keep English fragments original. Simplified and traditional Chinese are not translated into each other. Official/source/legacy cached translations cannot bypass the gate, which runs before translation-cache reads and Chinese source-LRC decoding. English filler-only lines such as oh remain untranslated. Successful fallback and translation caches remain.

An explicit non-English tag disables Chinese translation; an English tag cannot opt meaningful non-Latin lyrics into translation. Untagged sources require Latin lyrics plus English lexical evidence. Ambiguous cases stay original. This lightweight heuristic is conservative, not authoritative language identification. Manually selecting a non-Chinese target retains previous behavior.

## Retained features and limits

Six sources (LRCLIB, QQ, NetEase, Kugou, Kuwo, lyrics.ovh), verified track/version matching, synchronized fallback, REPLACE_UNSYNCED, original words/timing/colors, palette adjustment, cache-only mode and all twelve preferences remain. No synthetic timestamps. If the client does not request lyrics or no source has a verified match, the plugin cannot supply every song.

Limits remain 256 KiB lyric body, 128 KiB entry body, 96 KiB service response, 600 lyric rows, 12 source requests/256 KiB cumulative source bytes, 64 translation rows/6800 URL characters/2.5-second window. Standard cache remains 128 entries/64000 characters; compact remains 64/32000. These are script budgets, not VPN memory ceilings. A requires-body host may already own the full native buffer before the script runs.

## Evidence

2248 regression tests pass, including 30 new missing-response/recovery cases and four build-scope cases. Existing five-client JSON/protobuf tests retain matching, timing, filtering, translation policy, delayed-callback completion and cache limits. See [MEASUREMENTS.md](MEASUREMENTS.md), [STARTUP-EVIDENCE.md](STARTUP-EVIDENCE.md), [CLIENT-CONTRACTS.md](CLIENT-CONTRACTS.md) and [validation-summary.json](validation-summary.json).

Final reports contain 832 fresh Node processes, 160 fresh macOS JavaScriptCore processes, 4800 mixed-playlist lyric responses and 60 feature invocations. Results are mixed: most fresh-load medians improve, while some empty-cache and burst heap samples increase. The full report includes regressions. This release does not establish that every first load consumes less memory.

The user still reports VPN disconnection while switching songs. No phone termination/Jetsam capture is available. Memory pressure is plausible, not proven. Desktop tests and public byte checks do not establish iPhone VPN stability, native memory headroom or that this disconnection is fixed.

## Reproduce

    pnpm install --frozen-lockfile --ignore-scripts
    node build.mjs
    python3 package.py RUNTIME_COMMIT 2248
    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb
    python3 run-measurements-322.py NODE BASELINE_321_SOURCE
    python3 summarize-322.py

Baseline immutable source/runtime commit: d76f8aa7785e023b9901dbf97e44e274295a0ed8, source prefix Surge/Development/VerseLyrics321. The comparison directory holds compiled files under runtime/. Timed cases use identical output body hashes and request counts; changed no-store headers are tested separately. Runtime hashes are frozen throughout final measurement stages. Primary host documentation and Unicode notices are retained. Publication leases current main and preserves unrelated resources.
