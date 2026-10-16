# VerseLyrics 0.4.3 source and verification

Original Spotify native lyrics processing for Egern, Surge, Loon, Shadowrocket and Quantumult X. This development snapshot is stored at the runtime commit; main contains only current installation entries and user documentation.

0.4.3 reduces transient memory allocations, generates a lightweight request hook, adds bounded lazy caches, single-record LRCLIB retrieval, conservative cross-album matching, per-source time budgets and short negative caching. Native translations still replace every official alternative; the original lyric rows, timing and valid upstream colors remain intact. Generated fallback documents encode directly into the native output format.

## Build and checks

Requires Node.js 24 or a compatible runtime, Python 3 and Ruby's standard YAML library. No external JavaScript packages are needed.

```sh
node build.mjs
python3 package.py RUNTIME_COMMIT 340
node --test core/test/*.test.mjs native-adapter.test.mjs egern-package.test.mjs config.test.mjs
ruby validate-egern.rb
node live-source.mjs
node live-palettes.mjs
node memory-bench.mjs /path/to/unmodified-0.4.2-core.js
```

`request-core.js` is generated from the shared response core's URL filters, settings and header functions. Callback runtimes embed their client-specific native bridge; Egern retains its native ctx export. Runtime hashes are recorded in `runtime-manifest.json`.

340 automated checks passed on 2026-10-16, plus the Egern YAML validation. Tests cover original protocol behavior, malformed responses, Unicode edge cases, bounded storage, cache merge behavior, request parity, source time budgets and binary buffer ownership. Core fixtures use original test lyrics; the target song fixture contains public metadata only.

`memory-results.json` records a reproducible synthetic 1.5 MiB JSON decode and translation rewrite comparison: decode heap usage approximately 105 MiB in 0.4.2 versus 13 MiB in 0.4.3. The new processor also completes under a 32 MiB V8 old-space limit. Node/macOS process measurements are not mobile proxy process memory measurements.

`live-source-results.json` records unauthenticated source calls for the user-provided track: QQ Music supplied 42 timestamped lines. Only request paths, sizes, counts and metadata are retained; no real lyric text or credentials are included. `live-palettes-results.json` records real public Spotify palette calls through five simulated client APIs. These checks do not establish native app import, iPhone UI or Egern missing-lyric discovery success.

## Resource bounds and matching

External service responses are checked before decoding and capped at 384 KiB. Playback contexts larger than 512 KiB are passed through; the remaining native response cap is 2 MiB. Stored entries are limited to 192 and approximately 96,000 JSON characters. Successful lyric hits retain their existing daily TTL; misses last 90 seconds and transient failures 15 seconds. Retry-After cooldowns remain enforced. Sequential source and translation requests lower overlapping response allocations; request scripts never read the cache or load the Han map.

Same-album candidates are preferred. Cross-album fallback requires an exact normalized title and artist set, a duration difference of at most one second and a unique candidate. Live, remix, remastered, acoustic, demo, karaoke and instrumental album labels are excluded from this relaxed path. Ambiguous or absent sources remain missing. LRCLIB search excludes records with no lyric text before candidate selection.

No authentication failures are treated as missing lyrics. Spotify credentials are used only for the original Spotify host's metadata request and are never stored, logged or sent to lyric/translation/color services. Quantumult X cannot trigger response-body scripts on a truly empty upstream body. Clash/Mihomo do not provide the required response rewrite runtime.

## Primary references

- [Loon Script API](https://nsloon.app/docs/Script/script_api/) and [native rules](https://nsloon.app/docs/Script/script_v2/)
- [Egern JavaScript API](https://egernapp.com/docs/javascript-api/)
- [LRCLIB API](https://lrclib.net/docs)
- [Public track palette](https://open.spotify.com/embed/track/76XUZSb13QUuj1HECY4Hvo)
- [Quantumult X binary rewrite](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js)

Unicode 17.0.0 Unihan data and its Unicode License V3 remain embedded in response runtimes, with the full notice alongside the Egern runtime. The core and adapters are original code.
