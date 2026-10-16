# VerseLyrics 0.4.8 source and verification

Original Spotify native lyric and translation processor for Loon, Egern, Surge, Shadowrocket and Quantumult X. Production main retains installation entries and documentation; this immutable runtime commit retains original source, build tools, tests and evidence.

This release targets repeated Loon script startup and live cache retention while keeping six sequential fallback sources, strict recording matching, native lyric timing/colors and replacement plugin translations.

## Changes

- Loon request header handling moves from a JavaScript request hook to documented native Rewrite header actions. The installed plugin has only two response scripts. Native Rewrite handles conditional cache headers and protobuf Accept behavior; plugin options and internal-request exclusion are retained. Loon 3.5.1 (983) or newer is required. The generated request JS remains as a compatibility/reference resource, but the Loon plugin does not import it.
- Loon's response conditions also exclude internal metadata lookups before loading the entry script or its body. Existing URL, HTTP status and declared Content-Length filters remain.
- All five lyric bundles exclude bootstrap, card and playback-context rewrite code. Metadata decoders required by lyric fallback remain. Entry processing uses its separate bundle.
- During a lyric request, the live cache view retains that track's entries, source hints and applicable legacy translations. Metadata handlers retain metadata entries. Saves merge pending changes into the latest complete bounded store, preserving other songs and overlapping translation updates. The persistent limit remains 128 entries / 64,000 JSON characters. The bounded store is still parsed briefly; this change reduces objects retained across asynchronous work, not all transient parsing allocations.
- A small latest-response generation marker prevents an older song's job from starting further source/palette/translation HTTP after a different track's lyric response arrives. Outstanding native HTTP always finishes normally. Already obtained lyrics/translated rows remain usable. Superseded work does not create a negative lyric cache or a false palette failure. The marker tracks response order, not actual playback, and it is not an atomic lock or cancellation API.
- The existing advisory two-job network admission remains. Extreme overlap may still pass through an uncached lyric response while both slots are occupied; a later request is eligible again. No queue, polling, background task or new JavaScript timer is introduced.

Loon/Surge/Shadowrocket continue to finish after native callback completion with no extra JS timeout race. Quantumult X retains one lazy whole-script exit timer and its protected headers/ArrayBuffer contract. Egern uses native async ctx and response caps. Surge keeps WebView response engines. Complete official Shadowrocket scripting documentation remains unavailable; its compatibility bridge is not claimed as officially verified. See [CLIENT-CONTRACTS.md](./CLIENT-CONTRACTS.md).

## Reproduce

Node.js 24 or compatible JavaScript, Python 3 and Ruby standard YAML; no third-party JavaScript runtime dependencies.

```sh
node build.mjs
python3 package.py RUNTIME_COMMIT 585
node --test core/test/*.test.mjs native-adapter.test.mjs native-memory.test.mjs client-contract.test.mjs egern-package.test.mjs config.test.mjs loon-rewrite.test.mjs native-burst.test.mjs
ruby validate-egern.rb
node cache-scope-bench.mjs /path/to/unmodified-0.4.7/core/spotify-lyrics.js
node native-playlist-bench.mjs /path/to/unmodified-0.4.7
node live-source.mjs
node live-palettes.mjs
```

The unchanged baseline is the [0.4.7 source](https://github.com/hhhoratioxu/Proxy/tree/41cadc7d0fe005932fa9f80e28ec439ca2e2a466/Surge/Development/VerseLyrics047) and runtime files from that same commit. Place the five runtime directories under `runtime/` when reproducing the native playlist benchmark.

585 tests passed on 2026-10-16 with zero failures/skips; Egern YAML validation passed. They cover JSON/Protobuf preservation, six fallback adapters, source matching, replacement translations, native colors, entry routes, cache bounds/merge, client completion rules and the new live-cache/overlapping-switch behavior.

loon-rewrite.test.mjs independently interprets the documented conditional/header subset and compares 2,520 combinations of paths, formats, Accept headers and settings against the original request-hook behavior. It also checks internal-request exclusion and disjoint native routes. This interpreter is not Loon's native parser or an import test.

native-burst.test.mjs exercises each packaged client with two blocked native requests plus eighteen newer responses. Outstanding calls finish once, older jobs add no further HTTP, negative lyric entries are not saved, and a subsequent request for the settled song obtains timed lyrics and plugin translations, then reuses cache. A separate same-tick 20-song test starts only the last song's HTTP.

## Measured evidence

The scripts and JSON reports are included so these numbers can be inspected and reproduced. All playlist/cache content is synthetic and original.

| Measurement | 0.4.7 | 0.4.8 |
| --- | ---: | ---: |
| Loon lyric runtime bytes | 143,392 | 124,555 |
| Script invocations in 120-change Loon fixture | 480 | 240 |
| HTTP calls across ten rounds of twelve songs | 36 | 36 |
| HTTP calls after first round | 0 | 0 |
| Sampled maximum Node heap in Loon fixture | 22,191,240 bytes | 15,475,336 bytes |
| Mean live entries per scoped cache object | 48 | 4 |
| Mean serialized live-entry characters | 33,604 | 2,796.6875 |

native-playlist-results.json uses separate Node processes with a 32 MiB old-space setting and explicit fixture GC every six changes. Each change contains one metadata and one lyric transaction; eliminating the two Loon request scripts halves invocations in this scenario. All five 0.4.8 hosts and the 0.4.7 Loon baseline produced the same output SHA-256 across all 120 changes. Lyrics, timing, colors and translations were asserted on every change. Each host had one HTTP in flight in this sequential fixture. These are sampled V8 heap readings, not a native engine peak or iPhone VPN memory measurement.

cache-scope-results.json retains 32 independent cache objects over the same 12-song persistent store to isolate object retention. The persistent store stays at 33,631 characters in both versions. Mean retained entry representation falls from 33,604 to 2,796.6875 characters; sampled retained heap across the 32 objects falls from 3,324,936 to 426,504 bytes. This fixture count does not represent permitted runtime concurrency, and its heap savings cannot be converted into phone memory savings.

live-source-results.json records a real public unauthenticated lookup of track 76XUZSb13QUuj1HECY4Hvo. QQ supplied 42 timed lines in 1,721 ms after LRCLIB found no match. live-palettes-results.json records a real public Spotify palette fetch through all five simulated host contracts, with expected colors. Actual lyric text and credentials are not retained in these reports. Source availability and network latency vary.

## Resource and acceptance boundaries

Native lyric and entry body budgets remain 256 KiB / 128 KiB; ordinary external responses 96 KiB; palette pages 256 KiB; fallback aggregate 256 KiB / at most 12 requests; 600 lyric rows; 4,096 protocol fields per parsed message; 512 KiB final output; 60,000 retained/expanded translation characters. The persistent cache remains 128 entries / 64,000 serialized JSON characters; raw input is bounded before parsing. No task-wide cache-size increase was used to obtain these gains.

The core budget for starting new HTTP remains ten seconds. Egern/Loon use documented native millisecond timeouts, Surge uses seconds. QX has no verified per-fetch 2.5-second timeout or cancellation API. Loon's documented grammar has no hard response-body size option; unknown or decompressed buffers may exist in the host before JavaScript checks their size. Persistent storage has no atomic compare-and-swap, so network admission and response-generation checks are advisory.

No native iPhone import, memory-pressure, VPN stability or continuous Spotify playback acceptance was performed. The user's earlier Loon fallback success does not prove every song or the new memory behavior on a device. Egern's earlier missing-entry report remains unresolved. QX's truly empty upstream body may not trigger body rewriting. Source coverage is not universal. Clash/Mihomo cannot run this HTTPS response-rewrite plugin.

Update the entire plugin/module/rewrite, since Loon hook removal and native Rewrite changes live in configuration. Existing public import URLs remain valid. Only one Spotify lyric plugin should process a response.

Current Spotify authorization is used only for same-host Spotify metadata and is never stored or forwarded to lyric, translation or palette providers. No paid API, notification or monitoring task is added. Original code retains the complete Unicode License V3 for the Unihan lookup data.
