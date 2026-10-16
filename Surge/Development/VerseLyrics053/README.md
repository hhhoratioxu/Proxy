# VerseLyrics 0.5.3 — bounded player-entry processing

This release focuses on the player entry transactions that accompany first opening Spotify's playback page and repeated song changes. It preserves all six fallback providers, plugin translation, same-response source translations, native timing, the existing color roles, and the 0.5.2 cache/network budgets. It does not claim a measured iPhone VPN memory ceiling.

## Changes

- `playerEntryJSON` validates and scans the response in one pass. Only the known context pages / tracks and connect-state current / previous / next tracks are considered. Unknown subtrees are scanned without building objects or path arrays. Actual edits retain byte-equivalent JSON text outside selected tokens. Invalid JSON, excessive nesting and ambiguous duplicate control keys fail closed. Unknown duplicate keys and large numeric literals remain untouched.
- `playerEntryWire` scans known Protobuf fields and records only actual replacement ranges. It no longer expands all root, page, state, track and metadata fields into retained object arrays. Unchanged payloads return their original view; changes copy unchanged ranges and selected replacement bytes into one exact-sized buffer per changed container. Unknown fields and their original wire representation are preserved.
- QQ and NetEase catalog lookup functions project at most two accepted scalar IDs before the lyric request. Search-only data does not have to be retained by the suspended caller. Candidate matching, source order and request budgets are unchanged.
- No extra HTTP, source prefetch, cache store, polling loop, waiting queue, or speculative song lookup was introduced. Completed valid source responses remain usable even if a later request has retired additional network work. An experiment that discarded all superseded responses was rejected because it lost already-fetched lyrics.

The native bridge remains based on each client's existing documented/verified contract. Adapter revision 12 identifies the rebuilt package; it adds no host API. Loon still uses native header rewrites, millisecond HTTP timeout and callback completion, with two response script routes. No unsupported Loon engine, cancellation or max-size option is invented. See [CLIENT-CONTRACTS.md](CLIENT-CONTRACTS.md).

## Reproducible validation

Requires Node, the pinned Terser development dependency and, for the additional JSC comparison, macOS Command Line Tools. These are development tools only; clients download self-contained pinned scripts.

```sh
node build.mjs
python3 package.py <runtime-commit-sha> 961
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
```

961 tests pass. New coverage includes 500 valid JSON and 200 Protobuf differential cases against a frozen 0.5.2 oracle, malformed unrelated JSON, duplicate controls, escaped names, nesting/track bounds, and twenty executions of the actual packaged entry files across all five clients, both response formats and both entry routes. These packaged tests detect build pruning errors that pure source tests would miss. Existing tests retain lyrics/translation cache and native row/color preservation, source identity and translation alignment checks, at-most-one mocked native HTTP, busy request completion before the outstanding native callback, and explicit settled-track retries.

## Whole-invocation and repeated-load measurements

The unchanged baseline is release 0.5.2 at commit `2c05e6401cdc3d1e6732e62de02fee9cd6f9fc79`, runtime commit `a3a2314449c54404f14fd70050b5bc12abda3060`. Reports retain all trials, unsuccessful optimization ideas are not shipped, and the input/HTTP/output validation is shared between versions.

```sh
clang -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk \
  -framework JavaScriptCore -O2 jsc-memory-runner.c -o jsc-memory-runner
node jsc-fixtures.mjs
python3 jsc-memory-bench.py /path/to/unchanged-052
node native-first-load-bench.mjs /path/to/unchanged-052
node native-playlist-bench.mjs /path/to/unchanged-052 --churn
node native-pressure-bench.mjs /path/to/unchanged-052
```

- `jsc-memory-results.json`: six fresh macOS JavaScriptCore processes per case and version. Thirty-six cold cases include 24/48/120-row native JSON and Protobuf official lyrics, LRCLIB fallback, full/partial NetEase source translations, and small/large JSON/Protobuf player entries. Cold lyric stores are completely empty, including metadata/palette. Six selected cases also execute 32 fresh context groups serially. No explicit GC. Public Mach task physical-footprint sampling at execution/HTTP/done/context-release boundaries and process maximum RSS include the engine and test harness; they are not every individual allocation. Native HTTP is mocked, zero latency. Output byte fingerprints, lengths and HTTP counts must match. Each measured runtime SHA-256 is recorded.
- `native-first-load-results.json`: twelve fresh 32 MiB Node old-space processes per version/scenario. Compiles and invokes the entire Loon lyric script, starting with empty lyric/translation caches; cases with no metadata/palette cache are explicit. Samples include V8 and harness allocations. V8 page/GC thresholds can shift coarse heap readings; this is a second-engine cross-check, not a phone figure.
- `native-churn-results.json`: all five native bridges and both formats, 240 different songs and 720 mocked HTTP requests per case, bounded cache eviction, with explicit GC every six changes. Native lyric output hashes and HTTP counts must agree. This is serial playback, not the overlapping callback stress test.
- `native-pressure-results.json`: four fresh-process trials, sixty responses at two-millisecond spacing, 400 ms native callbacks, same-song and different-song contention. Captures unfinished invocations, native HTTP overlap, timers and callback drain. The last track is explicitly requested again after the burst; this is not an automatic retry feature. Retiring extra work and immediate busy passthrough were introduced in 0.5.1 and are not presented as new improvements here.

See `MEASUREMENTS.md` for the final measured comparison, including cases that did not improve. Native input buffering, Objective-C bridge copies, the iOS Network Extension process and OS termination behavior are not emulated. The unchanged advisory storage lease is not atomic. Busy uncached requests can still lack enrichment until another client request. Nothing in these measurements establishes that every iPhone/client/plugin combination will remain below its memory limit. No phone diagnostic session or real Loon VPN test was performed in this release.

## Runtime files and publication

`runtime-manifest.json` identifies sixteen pinned runtime/license artifacts. `build.mjs` generates separate entry and lyric bundles, including Egern native modules. The production commit changes only the five existing import configurations, their five client guides, the root README and the Clash capability guide. Runtime/source files are reachable in an immutable parent commit, preserving the main tree layout. Use the existing `main/<client>/script/SpotifyLyrics.<extension>` import addresses.

No user tokens, request headers, private device data or full public song lyrics are in these synthetic fixtures. The Unicode data license remains attached to runtime files. The fixed 0.5.2 entry oracle in `core/test/fixtures` is original VerseLyrics code, not a third-party implementation. The optional provider schema and live HTTP evidence from 0.5.2 remain available in its immutable source commit; this release makes no new live service or coverage claim.
