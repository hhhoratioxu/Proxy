# VerseLyrics 3.1.6

Five native Spotify lyric response rewriters. Core 3.1.6, adapter 15. Original code; see core/NOTICE-UNICODE.txt for the Unicode data license.

This release reduces scoped cache work across ordinary songs. Unescaped indexed keys are read directly from validated JSON string contents; escaped legacy keys still use JSON.parse. Selected values, malformed layouts, cache writes, TTLs, concurrent merges and the serialized format keep their existing checks. Map/WeakMap bookkeeping initializes only when the cache is accessed. Track/language key fragments are created lazily once per view, while mutable scope flags remain checked at use time. Pure Chinese and card responses that never use the cache allocate neither bookkeeping container.

A protobuf range-parser prototype was tested and rejected. Despite fewer input views, it repeatedly raised sampled heap in 600-row mixed lyrics with a populated cache. Isolated ablations confirmed the parser path; replacing default parameters did not resolve it. Final code retains 3.1.5's strict byte-view parser and 8194-byte maximum decoder scratch. Prototype view counts are not shipped benefits. Raw pilot reports and pilot-core.diff record the decision; final benchmark reports use revised hashes.

All 3.1.5 source matching and controls remain: six fallback sources; verified timed-only replacement of static official lyrics; the REPLACE_UNSYNCED switch (default true); useful English fragments within Chinese; no simplified/traditional conversion; filler suppression; native timestamps, colors and highlighting; preferred source, compact cache, optional artwork lookup, offsets, fast/synced strategy and cache-only mode. No matching timed source means the official static words remain. No scrolling timestamps are invented.

The preceding source repair is retained without a song-ID shortcut: the documented full artist equivalent and explicit soundtrack suffix normalization, conservative complete artist/recording/duration/ambiguity checks, later timed candidates and separate timed misses remain. See SOURCE-EVIDENCE.md for that prior evidence.

## Build and verify

Use Node with the Terser 5.51.2 dependency pinned in package.json/pnpm-lock.yaml. Install with `pnpm install --frozen-lockfile`, then run:

    node build.mjs
    python3 package.py RUNTIME_COMMIT_SHA TEST_COUNT
    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb

For comparison, reconstruct an unchanged 3.1.5 source/runtime stage from [its immutable commit](https://github.com/hhhoratioxu/Proxy/tree/c9eda7c3424f9a446db886cfac08a6e1509c6347/Surge/Development/VerseLyrics315). Put that commit's fifteen runtime/license files in `runtime/` using repository-relative paths. Then run:

    python3 run-measurements-316.py NODE_PATH BASELINE_315_STAGE
    python3 summarize-316.py

All measurements run serially and preserve hashes of both actual native runtimes. The same fixture codec and host harness are used on both sides. Uninstrumented first-load/playlist/JSC reports and separate allocation counters retain raw trials and regressions. Zero service latency in these fixtures measures script processing, not real first-open network waiting time. No downloaded third-party lyrics or credentials are included in these reports.

Loon minimum remains 3.5.1 (983), with native Rewrite, two Response Scripts and typed plugin arguments. Adapter 15 is unchanged. No new host API, timer, HTTP concurrency, cache capacity or service budget is introduced. Standard cache remains 128 entries/64000 serialized characters; compact 64/32000. Translation bounds remain 600 rows, 64 original rows per batch, 6800 URL characters, 96 KiB reply and a 2.5-second window. Source lookups retain the 12-request/256-KiB chain cap.

See MEASUREMENTS.md for the complete results and CLIENT-CONTRACTS.md for native boundaries. Desktop Node and macOS JSC sampling cannot establish iPhone Spotify UI latency, native response-buffer peaks or VPN stability.

## Rejected prototype evidence

pilot-native-first-load-results.json, pilot-native-filled-first-load-results.json, pilot-paired-loon-results.json and pilot-mixed-jsc-results.json contain the original combined candidate. pilot-ablation-results.json isolates range/cache/lazy components, and pilot-params-results.json checks a default-parameter rewrite. These are not final runtime measurements. The rejection rests on repeatable filled-cache Node heap growth, not a single volatile macOS physical-footprint sample. Both maxRSS and physical footprint are retained in raw JSC data.

To reproduce the rejected full parser candidate, use the 3.1.5 core in a copy of this build directory and apply pilot-core.diff using patch -p1, then build with the same pinned dependency. The diff changes only core/spotify-lyrics.js. Keep the final directory unchanged for normal benchmark commands. No rejected runtime is referenced by the consumer imports.
