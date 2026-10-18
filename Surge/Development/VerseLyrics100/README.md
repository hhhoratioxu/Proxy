# VerseLyrics 1.0.0

Native Spotify fallback lyrics and plugin translations for Loon, Egern, Surge, Shadowrocket and Quantumult X. This release builds on the verified [0.7.1 source](https://github.com/hhhoratioxu/Proxy/tree/fd3a0400d50488f23160d42a3d2369e47d216ba3/Surge/Development/VerseLyrics071). The public import files pin this immutable source/runtime snapshot.

## Changes from 0.7.1

- Recheck advisory ownership and the processing deadline after a native HTTP callback settles, before decoding its body. A newer song can retire obsolete catalog/translation processing. The old callback is still awaited; no native cancellation API or polling timer is invented. A retired result remains retryable and is never stored as a missing-song result.
- Spotify extended metadata lookups scan envelopes and decode only the requested track identity. They retain no complete rewrite field tree for unrelated tracks. Entry flag rewriting keeps the existing preservation path.
- Kugou, Kuwo and lyrics.ovh searches now return only the small accepted identity fields needed by the next download. Catalog objects and unrelated fields leave the async search frame before the lyric request, matching the existing QQ/NetEase approach.
- Add the optional FALLBACK_MODE preference described below. Existing fallback, translation, palette and offset options remain available.

## Optional fallback strategy

| Value | Behavior |
| --- | --- |
| synced (default) | Continue searching for verified line timestamps within the existing budgets; return verified plain lyrics when no timed source succeeds. |
| fast | Return the first sufficient, identity-verified plain or timed document. This can save later requests, at the cost of untimed text when that source has no timestamps. |

Fast mode does not bypass title, artist, album, duration, version, fragment or instrumental checks. It keeps translations. Fast-only plain results use lyrics-fast keys inside the same cache limits and are ignored by synced mode. Successful timed results remain shared. The two-format/five-client tests verify switching back to synced upgrades a plain result to available timed lyrics and preserves translations without repeating cached work. Unknown mode values use the default behavior.

All options remain user-controlled. FALLBACK_OFFSET_MS defaults to zero and changes only timed fallback output; MEMORY_MODE, FETCH_ARTWORK_COLOR, PREFERRED_SOURCE and SOURCE_TRANSLATIONS retain their prior defaults. Existing v1 caches and native saved preferences remain compatible. No background job is installed.

## Limits and behavior under rapid switching

One advisory network owner, no admission polling, bounded response sizes, at most twelve source requests and 256 KiB source bytes, existing processing deadlines, at most 600 lyric rows, and the 64,000-character/128-entry standard cache remain. Compact mode keeps its 32,000-character/64-entry cap. Native HTTP buffering occurs before JavaScript can check a returned body on some hosts.

A busy uncached response still passes through and may be enriched on a later Spotify request; the plugin does not schedule a retry. Unlike 0.7.1, an already-retired successful callback is not decoded or cached merely because it finished. This reduces obsolete work but can require a fresh lookup when returning to that song. Same-track duplicates do not retire their active owner. Cached lyrics remain available during contention.

Six sources remain: LRCLIB, QQ, NetEase, Kugou, Kuwo and lyrics.ovh. Unknown catalog coverage cannot be guaranteed. No lyrics or timing are invented. Plugin translation replaces the native alternatives list in handled responses; failures retain original words and do not substitute Spotify translations. Native colors, timing, unknown protobuf fields and output-format compatibility remain covered by regression tests.

## Validation

1,094 tests pass. See [MEASUREMENTS.md](MEASUREMENTS.md), [validation-summary.json](validation-summary.json) and [CLIENT-CONTRACTS.md](CLIENT-CONTRACTS.md). Source tests, compiled host-interface tests and macOS measurements are distinct from physical iPhone VPN acceptance. No physical-device claim is made by the 1.0.0 version number.

The final runtime hash file covers all sixteen resources. Benchmarks use unchanged 0.7.1 bytes and synthetic original text with mocked HTTP. Both improvements and small regressions are retained in the published measurements.

## Reproduction

Use an unchanged 0.7.1 directory containing core/ and runtime/ as BASELINE. The JSC harness requires macOS and the public JavaScriptCore framework. Build-only Terser is pinned by package.json and pnpm-lock.yaml.

~~~sh
pnpm install --frozen-lockfile
node build.mjs
python3 package.py RUNTIME_COMMIT 1094
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node jsc-fixtures.mjs
node jsc-cache-fixtures.mjs
node jsc-release-fixtures.mjs
clang -O2 -framework JavaScriptCore jsc-memory-runner.c -o jsc-memory-runner
python3 run-benchmarks.py /absolute/path/to/node /absolute/path/to/BASELINE
python3 summarize-100.py
~~~

The wrapper runs phases sequentially and rejects changed runtime bytes. The new fixtures include a retired 90,000-character catalog, three extended metadata batch sizes, and large catalogs from the three newly compacted search frames. Full Unicode matching data and its license remain in core/NOTICE-UNICODE.txt and generated scripts.
