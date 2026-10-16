# VerseLyrics 0.4.7 source and verification

Original Spotify native lyrics and translation processor for Egern, Loon, Surge, Shadowrocket and Quantumult X. Production main contains only installation entries and documentation. This immutable runtime commit retains original source, native builds, tests and evidence.

This release corrects client-specific behavior after comparing each available first-party API reference. See [CLIENT-CONTRACTS.md](./CLIENT-CONTRACTS.md) for the precise basis and unresolved Shadowrocket documentation boundary.

## Changes

- Loon and Surge use native HTTP timeouts in their documented units and finish after native callbacks. The separate Shadowrocket compatibility bridge also removes JavaScript timeout races. No per-request timer or manual whole-script watchdog is scheduled by these three adapters.
- QX uses one lazy whole-script watchdog only when a network request starts. It does not pretend a timer cancels fetch or impose an undocumented native request timeout. Cache, request and entry paths create no timers. Timer deduplication works even if setTimeout returns no handle, and a late fetch body is never materialized after completion.
- QX response-body output preserves original Content-Length, Content-Type and Content-Encoding headers, returns ArrayBuffer bodyBytes and uses an HTTP status string. Header-only response-body results pass through.
- Surge response hooks explicitly use engine=webview; its simple request hook uses engine=jsc. Existing body caps and precise URL patterns are retained. Unsupported engine fields are not copied to other clients.
- Six sequential sources, strict recording matching, cached native timing/colors, replacement plugin translation, static Han lookup, lightweight entry scripts and bounded caches remain unchanged.

Shadowrocket's developer website does not expose a complete scripting API. Its existing independent compatibility behavior is tested in mocks but not claimed to comply with a verified official API. No community document has been represented as official.

## Reproduce

Node.js 24 or compatible JavaScript, Python 3 and Ruby standard YAML are sufficient. No external JavaScript packages or third-party runtime scripts are used.

```sh
node build.mjs
python3 package.py RUNTIME_COMMIT 568
node --test core/test/*.test.mjs native-adapter.test.mjs native-memory.test.mjs client-contract.test.mjs egern-package.test.mjs config.test.mjs
ruby validate-egern.rb
node native-lifecycle-bench.mjs /path/to/unmodified-0.4.6-native-adapter.js
node live-source.mjs
node live-palettes.mjs
```

The [unchanged 0.4.6 adapter](https://raw.githubusercontent.com/hhhoratioxu/Proxy/6c0c30e4e7dced3c86b0ae07124db1dc52b27e23/Surge/Development/VerseLyrics046/native-adapter.js) is the lifecycle baseline.

568 tests passed, no failures/skips, and Egern YAML validation passed on 2026-10-16. Tests exercise original/fallback JSON and Protobuf lyrics, all six source adapters, metadata and card entry routes, color preservation, translation alignment, cache eviction, body/field limits, shared network admission and each packaged native bridge. The new contract suite separately verifies completion timing, timer-free native callback paths, QX protected headers and late-body guards.

runtime-manifest.json records exact bytes and hashes for all 16 runtime resources. Full plugin/configuration updates are necessary because engine selection and hook routing live in configuration.

## Evidence and limits

native-lifecycle-results.json records twelve sequential 96 KiB mock responses in each native bridge. Timer creation fell from thirteen in 0.4.6 to zero for Loon/Surge/Shadowrocket and one for QX. The fixture provides no clearTimeout and no timer handles. Both versions made twelve requests with one in flight and returned the same two fixture output bytes exactly once. This measures timer/closure scheduling, not RAM savings or native HTTP cancellation.

live-source-results.json records a real public lookup for Spotify track 76XUZSb13QUuj1HECY4Hvo under a ten-second helper deadline. QQ supplied 42 timed lines after LRCLIB had no matching result. live-palettes-results.json records successful real Spotify public palette retrieval through all five simulated host contracts, with the expected slate background and distinct text colors. No real lyric text, access keys or user credentials are retained in these reports.

Resource bounds retained from 0.4.6:

| Resource | Bound |
| --- | --- |
| Native lyric / entry response | 256 KiB / 128 KiB |
| Ordinary external service / public palette | 96 KiB / 256 KiB |
| Fallback aggregate | 256 KiB, at most 12 requests |
| Decoded Kugou LRC / lyric rows | 64 KiB / 600 rows |
| Protocol fields / final native output | 4,096 per parsed message / 512 KiB |
| Retained / expanded translation text | 60,000 characters each |
| Main cache including cooldowns | 128 entries, 64,000 serialized JSON characters |
| Raw cache before JSON parsing | 128,000 characters |
| Core budget for starting further HTTP | 10 seconds |
| Native HTTP timeout Egern/Loon / Surge | Up to 2,500 ms / 2.5 seconds |
| QX manual exit | At most one 12-second whole-script timer, created lazily |

QX does not have a verified per-fetch 2.5-second native timeout. Shadowrocket's units and host body cap remain compatibility assumptions pending an official contract/native validation. Egern/Surge use documented host response caps. Loon filters known declared sizes before body processing. QX and unknown-length/decoded host buffers are not capped by a script-side check before receipt.

The two-slot shared-storage network check remains advisory because the native storage APIs lack atomic compare-and-swap. It does not bound all VM instances or native buffers. Busy/oversized requests use available cached output or pass the original response through, which can temporarily omit plugin lyrics/translation. Whole-process memory includes host interception, transport and other plugins. No test here establishes an iPhone VPN peak-memory bound or guarantees that a tunnel will never disconnect.

The user previously confirmed fallback lyrics in Loon. Egern's earlier missing-entry issue remains unresolved. Coverage depends on source catalogs and native client request behavior. A truly empty QX upstream body does not trigger script-response-body. Clash/Mihomo cannot run this HTTPS response-rewrite plugin.

Current Spotify authorization is used only for metadata on that same Spotify host and is never stored or forwarded to lyric, translation or palette services. Provider URLs returned in payloads are not followed. Unicode 17.0.0 Unihan mappings and the Unicode License V3 remain included in full lyrics runtimes.
