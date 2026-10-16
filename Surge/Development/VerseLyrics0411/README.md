# VerseLyrics 0.4.11 — smaller scripts and less repeated lyric work

This release reduces native script parsing, cache allocation and redundant same-track requests while retaining all six fallback sources, plugin translations, original timestamps and the 0.4.10 lyric-highlight correction. Native adapter version is 9.

## Changes

- Production scripts are compiled with pinned Terser 5.51.2. Host API/property names and the Unicode license are retained. Loon's lyric script is 90,814 bytes (previously 129,178), and its entry script is about 28 KB (previously 52 KB). Build dependencies run only on the developer machine.
- The production build omits diagnostic-history formatting, reads and writes. Readable source retains diagnostic behavior for source tests; production does not keep writing status/events on every new lyric response.
- A small length index precedes the existing cache entries. Scoped reads parse the current song's records and shared source-order hints instead of materializing every cached lyric/translation object. Old JSON caches remain readable, unchanged reads do not write, and a normal write adds the index. Older versions can still read the standard entries/cooldowns. Invalid indexes fall back to the bounded full reader.
- Same-track overlap waits within the existing admission budget and reloads the completed fallback/translation cache. This reduces duplicate HTTP work, without a new queue, background prefetch, timer type or cache key. Admission remains advisory because client storage has no atomic locking primitive.

Loon retains native request-header rewrites and two response hooks. Callback-based hosts settle native HTTP callbacks before completion. Egern feature-detects the waiting timer and passes through under contention if it is absent. Each client retains its native API and syntax; see [client contracts](CLIENT-CONTRACTS.md).

Persistent storage remains capped at 128 records / 64,000 JSON characters, including the index. Lyric/entry response limits remain 256/128 KiB, ordinary source responses 96 KiB, and the source chain twelve requests / 256 KiB. Existing deadlines, newest-waiter replacement and two-active-task admission remain. These limits do not cap native HTTP buffering or the complete VPN process.

## Reproduce

Use Node.js 24, pnpm, Python 3 and Ruby:

```sh
pnpm install --frozen-lockfile --ignore-scripts
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 650
node --test core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node native-startup-bench.mjs /path/to/unchanged/0.4.10
node native-playlist-bench.mjs /path/to/unchanged/0.4.10
node cache-scope-bench.mjs /path/to/unchanged/0.4.10/core/spotify-lyrics.js
node live-public-flow.mjs
```

The zero hash is a configuration-test placeholder, replaced with the immutable runtime commit for publication. base.json contains the twelve baseline public files. Main retains the existing directory structure and changes only those twelve import/documentation files. Runtime/source blobs are reachable through the pinned runtime commit.

## Verification

650 automated tests passed with no failures or skips; Egern YAML validation also passed. Coverage includes legacy/indexed cache compatibility and malformed indexes, storage limits, all six sources, JSON/protobuf, timing and unknown-field preservation, official-translation replacement, colors, native host API behavior, source timeout recovery and rapid-request contention. Twenty new cases run the actual compiled five-client bundles with overlapping requests for both official/fallback lyrics in both formats. Each pair uses one translation request; a fallback pair uses one source request plus that translation request. Production status/event writes are zero.

The included Node 24 arm64 reports are reproducible simulations with mocked native APIs and a 32 MiB V8 old-space setting, not iPhone measurements:

| Measurement | 0.4.10 | 0.4.11 |
| --- | ---: | ---: |
| Parsed cache characters, 32 views over 12 songs | 1,076,192 | 152,406 |
| Cache-view load time | 3.69 ms | 1.69 ms |
| Cache-view allocation delta before GC | 2,116,080 B | 1,657,016 B |
| Cache-view retained delta after GC | 424,664 B | 437,016 B |
| Loon cold official-lyric processing median, 20 sessions | 4.771 ms | 3.946 ms |
| Loon cold fallback processing median, 20 sessions | 5.527 ms | 5.016 ms |
| Loon 120-change processing run | 242 ms | 238 ms |
| Loon sampled heap maximum in that run | 15,570,392 B | 14,499,064 B |

Cold-session fixtures include compilation and immediate mock HTTP callbacks, with metadata/palette already available from the playback entry. They exclude real network latency. The small overall playlist timing difference is not a reliable estimate of device speedup. Retained cache objects are essentially unchanged; the indexed format primarily avoids temporary parsing/allocation. Its fixture storage is 33,857 characters versus 33,631 previously, still within the same total cap.

All five 120-change runs return exactly the same full output hash as Loon 0.4.10, including original lyrics, translations, timestamps and colors. Twelve cold songs make 36 total HTTP calls; revisits add none. Loon creates no script timers in this sequential test. Separate overlap/burst tests exercise contention and callback drain. See native-startup-results.json, native-playlist-results.json and cache-scope-results.json for exact conditions and per-client results.

live-public-flow-results.json records real public metadata/source/translation requests through the compiled Egern module, starting from a simulated native 404 and empty cache. It stores only counts, timings and endpoint status, without lyrics, tokens or page session data. It does not establish authenticated Spotify behavior, phone display or VPN stability. Source coverage and network latency still govern uncached songs; this release cannot promise lyrics for every track or guarantee an iOS process will never be terminated.
