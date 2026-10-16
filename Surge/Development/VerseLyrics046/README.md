# VerseLyrics 0.4.6 source and verification

Original Spotify native lyrics processor for Egern, Surge, Loon, Shadowrocket and Quantumult X. Source, build tools and evidence live at the immutable runtime commit; main keeps installation entries and user documentation. This release prioritizes memory pressure during rapid song changes and timeouts while reducing repeated source lookups.

## Changes

- Split each client into request, entry and lyrics hooks with disjoint response rules. Frequent metadata, player and lyric-entry responses run a small entry script without the six source adapters, translation engine or Han tables. Loon entry code is 50,738 bytes versus the previous all-in-one 136,872-byte response script. Full lyrics code is 142,541 bytes; only the frequent entry path became smaller.
- Search the same 6,447 Unicode 17 Han mappings in four static sorted tables instead of constructing a large Map per invocation. Tests compare every mapping with the previous table, including supplementary-plane characters.
- Remember a successful synchronized provider for the same normalized artist set for six hours. Auto mode tries it first on subsequent tracks; all other sources remain available. Each song still needs title, artist, duration and recording-version checks. Plain lyrics do not become a preferred synchronized provider. Explicit provider settings are unchanged.
- Avoid rewriting identical metadata and availability. Merge identical adjacent status events within 15 seconds while retaining the eight-event bound. Keep compact fallback caching and per-track translation caching from 0.4.5.
- Tighten body, cache, translation, protocol-field and execution budgets. Known oversized input passes through before script decoding. Egern streams stop and cancel on overflow; callback hosts use bounded lazy byte views.
- Add two-slot shared-storage network admission without a waiting queue. Fully cached work does not acquire a slot. Busy requests use available caches or pass through and are never cached as missing lyrics. Timeout paths stop further requests and keep a short-lived lease when native cancellation is unconfirmed. Storage lacks atomic compare-and-swap, so this is advisory admission across instances, not a hard global semaphore.
- Keep all lyric sources, palette retrieval and translation sequential. Clear watchdogs and HTTP timers when supported, release resolver closures, ignore late callbacks and identify unchanged byte views without scanning their contents.

Six sources remain: LRCLIB, QQ Music, NetEase, Kugou, Kuwo and lyrics.ovh. Auto starts in that order unless a valid artist hint exists and stops at the first accepted result. Kugou and Kuwo preserve real timestamps; lyrics.ovh remains UNSYNCED. Native format, timing, valid colors and unknown protocol fields remain preserved. Processed lyrics use plugin translations in place of the official alternative list. Responses skipped for size or overload remain unchanged.

## Reproduce

Requires Node.js 24 or compatible JavaScript, Python 3 and Ruby standard YAML; no external JavaScript packages. The [unmodified 0.4.5 core](https://raw.githubusercontent.com/hhhoratioxu/Proxy/b5aba2b016b4049ded282b1909f1502ba78a63c1/Surge/Development/VerseLyrics045/core/spotify-lyrics.js) is the benchmark baseline.

```sh
node build.mjs
python3 package.py RUNTIME_COMMIT 556
node --test core/test/*.test.mjs native-adapter.test.mjs native-memory.test.mjs egern-package.test.mjs config.test.mjs
ruby validate-egern.rb
node cold-load-bench.mjs /path/to/unmodified-0.4.5-core.js
node playlist-bench.mjs /path/to/unmodified-0.4.5-core.js
node memory-bench.mjs /path/to/unmodified-0.4.5-core.js
node source-memory-bench.mjs
node live-source.mjs
node live-new-sources.mjs
node live-palettes.mjs
```

556 automated tests passed without failures or skips, plus Egern YAML validation, on 2026-10-16. Regressions cover compiled entry/full bundles, disjoint native rules, Han equivalence, source-hint safety/expiry, metadata writes, sequential requests, streamed bounds, cache admission, serialized cache size, protobuf field limits, callback cleanup and late timeouts.

In shared synchronous storage fixtures, 20 simultaneous uncached songs admit two network jobs; the others return without a queue or negative cache. All four callback-host simulations admit two jobs from ten-job bursts, clear timers and finish once. Complete caches still work when slots are busy. These fixtures do not establish atomic behavior across native app processes.

Runtime sizes/hashes are in runtime-manifest.json. Egern request/entry/full scripts are 3,773 / 45,014 / 134,589 bytes. Callback request scripts are 6,263–6,271 bytes, entry scripts 50,738–50,754 bytes, and full scripts 142,541–142,557 bytes. Update the complete plugin/configuration to activate entry routing; replacing only the full script is insufficient.

## Measurements

- cold-load-results.json: twelve initially uncached songs by one artist, metadata already intercepted, each mock HTTP call waits 12 ms. Calls fall from 72 to 50: the first song still needs six calls; each remaining song needs four instead of six. Both versions have one in-flight request per job. All native outputs are checked. This controlled source-order scenario is not mobile latency or proof that every first load is faster.
- playlist-results.json: twelve songs, forty original fixture lines per song, two passes. Both versions make sixty cold requests and zero cached requests. All twelve lyrics/translation entries remain in sixty records / 52,051 JSON characters under the stricter cache limit. Sampled heap is similar between versions; this is not evidence that every workload uses less memory.
- memory-results.json: separate macOS arm64 Node v24.19 processes with 32 MiB V8 old space. First Han normalization allocates 700,520 bytes in 0.4.5 and 155,152 in 0.4.6; retained deltas after GC are 634,776 and 99,496. A declared 1,572,957-byte native response is decoded and rewritten in 0.4.5; 0.4.6 passes it through with zero body reads/replacement output. Sampled processing heap delta falls from 6,645,024 to 87,040 bytes because oversized processing is skipped.
- source-memory-results.json: 200 tracks traversing all six sources, 1,600 sequential mock calls, one in-flight request, at most eight requests / 192,434 source bytes per track. Final cache: 128 records / 23,068 characters. Sampled JS heap: 44,340,160 bytes; RSS: 143,920 KiB. The 32 MiB old-space limit caps one V8 generation, not total heap or process memory. Fixture padding was reduced to fit the new source budget, so this is a bounded stress run rather than a direct heap comparison with 0.4.5.

These measurements are samples, not complete peaks or phone/VPN memory measurements.

## Resource limits

| Resource | Limit |
| --- | --- |
| Native lyrics input | 256 KiB |
| Metadata, player and entry input | 128 KiB |
| Ordinary source, translation and metadata service response | 96 KiB |
| Public Spotify palette response | 256 KiB |
| Cumulative fallback responses | 256 KiB / 12 requests |
| Kugou decoded UTF-8 LRC | 64 KiB |
| Lyrics | 600 rows |
| Protobuf fields | 4,096 per parsed message |
| Retained and expanded translation text | 60,000 characters each |
| Serialized native output | 512 KiB |
| Main cache including cooldowns | 128 entries / 64,000 JSON characters |
| Raw cache string before parsing | 128,000 characters |
| Lyrics network budget / each HTTP request | 10 seconds / 2.5 seconds |
| Callback full / entry watchdog | 12 seconds / 2.5 seconds |
| Host entry timeout | 3 seconds |

Cache limits count serialized characters, not total process RAM. Per-source deadlines and reservations may end traversal before all providers are tried. Busy or oversized responses may temporarily lack plugin lyrics/translation; passing the original response is preferred to retaining overlapping heavy jobs.

Loon checks known Content-Length at response-header time using native conditions; Egern, Surge and Shadowrocket also set host size limits. All clients recheck in script. Quantumult X has no equivalent host header gate in this configuration. Native networking can buffer unknown-length bodies before JavaScript sees them, callback hosts can retain timed-out requests, and JavaScript VMs have additional overhead. Stream cancellation stops further reads where supported but cannot retract buffered bytes. These controls cannot guarantee a hard VPN extension memory cap or prove the user's phone disconnection is eliminated.

## Public service evidence and boundaries

live-source-results.json records unauthenticated source retrieval for track 76XUZSb13QUuj1HECY4Hvo under a ten-second helper deadline: QQ Music supplies 42 timed lines after LRCLIB does not match. live-new-sources-results.json records 44 timed Kugou lines, 49 timed Kuwo lines and 63 unsynchronized lyrics.ovh lines. live-palettes-results.json records real public Spotify colors through five simulated host contracts. Evidence stores metadata, paths, sizes and counts, without real lyric text, download keys or user credentials.

These checks do not establish catalog-wide coverage, actual iPhone responsiveness, stable native VPN memory or resolution of Egern's earlier missing-lyric entry issue. The user previously confirmed fallback lyrics in Loon. Sources can lack a recording or return ambiguous results. Quantumult X cannot run a response-body script for a truly empty upstream body. Clash/Mihomo lack this response rewrite runtime.

Spotify authorization is used only for metadata on the current Spotify host, never stored or forwarded to sources, translation or palettes. Returned service URLs are not followed. Source adapters are original code and require no paid keys or external script runtime.

## References

- [Loon Script API](https://nsloon.app/docs/Script/script_api/) and [native conditions](https://nsloon.app/docs/Script/script_v2/)
- [Egern JavaScript API](https://egernapp.com/docs/javascript-api/) and [script limits](https://egernapp.com/docs/configuration/scriptings/)
- [LRCLIB API](https://lrclib.net/docs)
- [lyrics.ovh API](https://github.com/NTag/lyrics.ovh) and [contract](https://github.com/NTag/lyrics.ovh/blob/main/apiary.apib)
- Kugou first-party endpoints: https://lyrics.kugou.com/search and /download.
- Kuwo first-party endpoints: https://search.kuwo.cn/r.s and https://www.kuwo.cn/openapi/v1/www/lyric/getlyric.
- [Public track palette](https://open.spotify.com/embed/track/76XUZSb13QUuj1HECY4Hvo)
- [Quantumult X binary response example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js)

Unicode 17.0.0 Unihan data and the full Unicode License V3 remain in full lyrics runtimes and beside the Egern runtime. Core, adapters, caches and fixtures are independently written.
