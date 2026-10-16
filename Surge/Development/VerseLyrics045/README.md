# VerseLyrics 0.4.5 source and verification

Original Spotify native lyrics processor for Egern, Surge, Loon, Shadowrocket and Quantumult X. Source and tests live at the immutable runtime commit; main keeps only installation entries and user documentation. This release focuses on repeat playback, memory allocation and avoiding repeated network failures while preserving native lyrics output.

## Changes

- Translation results use one bounded entry per track/language rather than one entry per line. Original text is checked on every reuse, so reordered or replaced lyrics cannot inherit a translation from the wrong row. Repeated chorus lines are normalized once, not once per occurrence. Existing line caches remain readable. Concurrent partial translation writes merge their successful text pairs.
- Fallback lyrics store timestamp/text tuples and reconstruct native LINE_SYNCED or UNSYNCED rows on demand. Old full-document cache entries migrate while retaining their original expiry. A valid cached fallback or miss is checked before Spotify metadata retrieval; the absence or eviction of metadata no longer forces a redundant request.
- Four callback hosts use adapter 4 with lazy bounded response materialization. Declared sizes are checked before encoding; unknown-length strings use the source limit during UTF-8 sizing, before allocation. Binary views retain their offset and backing buffer without an unnecessary copy. Egern retains its native arrayBuffer API and before/after size checks.
- Network failures and HTTP 500/502/504 put the affected host into a 15-second cooldown across track changes. HTTP 429/503 retain Retry-After handling. No authentication failure is interpreted as missing lyrics.
- LRCLIB compilation duplicates may be accepted only when their complete timed/plain lyric evidence and numeric durations are identical. Title, artist, duration, album preference and alternate-version exclusions remain enforced. Different lyrics or timestamps stay ambiguous.
- The 96,000-character storage bound now includes serialized cooldown metadata. Translations are separately bounded by response size, retained text, expanded output text and final UTF-8 output size.

The six sources remain LRCLIB, QQ Music, NetEase, Kugou, Kuwo and lyrics.ovh in that order, stopping at the first accepted result. Kugou and Kuwo retain real timestamps. lyrics.ovh remains UNSYNCED because it supplies only plain text. Spotify's original rows, unknown protocol fields, timing and valid colors are preserved; plugin translation still replaces the complete official alternative list.

## Reproduce

No external JavaScript packages are used. Requires Node.js 24 or compatible JavaScript, Python 3 and Ruby standard YAML.

```sh
node build.mjs
python3 package.py RUNTIME_COMMIT 481
node --test core/test/*.test.mjs native-adapter.test.mjs native-memory.test.mjs egern-package.test.mjs config.test.mjs
ruby validate-egern.rb
node playlist-bench.mjs /path/to/unmodified-0.4.4-core.js
node source-memory-bench.mjs
node memory-bench.mjs /path/to/unmodified-0.4.4-core.js
node live-source.mjs
node live-new-sources.mjs
node live-palettes.mjs
```

481 automated tests passed, plus native Egern YAML validation, on 2026-10-16. New regressions cover compact cache round trips and expiry, per-track translations, line reordering, overlapping writes, metadata-free cache hits, transient backoff, duplicate-record evidence, total storage size, bounded translation expansion, lazy byte materialization and zero-copy offset views. All five packaged clients verify native JSON/Protobuf output from cached lyrics without metadata or HTTP.

`request-core.js` is generated from the shared core. Request hooks remain 3,773 bytes for Egern and 6,113–6,121 bytes for callback hosts. Full responses include the shared core and Unicode notice and are approximately 129–137 KB. `runtime-manifest.json` records exact hashes and sizes.

## Measured results and limits

`playlist-results.json` compares 0.4.4 and 0.4.5 using 12 synthetic songs, 40 original lyric lines per song and two complete passes through the response processor. Both versions made 60 mocked HTTP calls on the cold pass. The second pass made 60 calls on 0.4.4 and zero on 0.4.5, with the original words and translations checked on every output. Cached JSON/Protobuf timing and colors are also checked in the packaged-client tests. Old storage held only four lyric entries among 192 total entries; new storage retained all twelve, with 60 total entries and 52,051 serialized characters. This is deterministic mocked HTTP, not a mobile network latency measurement.

`source-memory-results.json` traverses all six sources for 200 unique tracks and 1,600 sequential mock calls. It completed under a 32 MiB V8 old-space limit, with one in-flight fixture request, at most 480,434 admitted source bytes per track and a final cache of 192 entries/34,588 characters. Sampled total JS heap reached 44,942,104 bytes and RSS was 153,296 KiB. Old space is only one part of JavaScript memory; the 32 MiB setting does not cap the whole process.

`memory-results.json` compares ~1.5 MiB JSON decoding and native translation rewriting: decode heap was 13,394,080 bytes in 0.4.4 and 13,408,984 bytes in 0.4.5. The new behavior therefore did not materially increase this workload's decode allocation. The 0.4.5 run also succeeded with 32 MiB old space. These figures are macOS/Node measurements, not iPhone RAM measurements or native app acceptance.

Resource admission rules:

- At most 12 source requests and 512 KiB of decoded source responses per fallback invocation, within the existing overall 20-second processing deadline. Requests are awaited sequentially and later sources receive time/request reservations.
- New source and translation responses: 96 KiB each. Older lyric services: 384 KiB. Kugou decoded UTF-8 LRC: 64 KiB. Lyrics: at most 600 rows; query metadata and timestamp tag expansion are bounded.
- Retained translation values: at most 120,000 characters, at most 6,000 per value. Expanded native translation output: at most 120,000 characters, including repeated lines. UTF-8 encoding rejects output over 2 MiB before allocating its output buffer.
- Cache: 192 entries and 96,000 serialized JSON characters, including cooldowns. Fallback success retains the daily TTL, per-track translations use seven days, misses last 90 seconds and transient failures 15 seconds. Negative entries from prior matching revisions are bypassed; valid positive caches remain reusable.
- Playback contexts over 512 KiB and other native responses over 2 MiB pass through. Known lengths are checked before script body materialization. Native networking may already have buffered an unknown-length body, and hosts without cancellation can retain a timed-out native request. Per-invocation bounds cannot promise a hard limit on total proxy memory across overlapping invocations.
- Completed HTTP timers are cleared when supported; resolver references are released even without clearTimeout. Cached hits do not rewrite the main lyric cache unless migration or a real change is needed. Palette fetching runs only after fallback lyrics succeed.

## Public service evidence

`live-source-results.json`: public source retrieval for track `76XUZSb13QUuj1HECY4Hvo`; LRCLIB returned HTTP 503 and QQ Music supplied 42 timed lines. `live-new-sources-results.json`: the original Kugou, Kuwo and lyrics.ovh adapters retrieved 44 timed, 49 timed and 63 unsynchronized rows respectively. `live-palettes-results.json`: real public Spotify palette retrieval through five simulated host contracts. Only metadata, paths, sizes and counts are retained; no real lyric text, download access keys or user credentials are included.

These tests do not establish catalog-wide coverage, actual iPhone responsiveness or a fix for Egern's prior missing-lyric entry problem. The user previously confirmed fallback lyrics in Loon. Sources can lack the recording or return ambiguous results. Quantumult X cannot trigger a response-body script on a truly empty upstream response. Clash/Mihomo lack this required response rewrite runtime.

Spotify authorization is used only for the current Spotify host's metadata request, never stored or forwarded to source, translation or palette services. Returned service URLs are not followed. Source adapters are original code and require no paid keys or external script runtime.

## References

- [Loon Script API](https://nsloon.app/docs/Script/script_api/) and [native rules](https://nsloon.app/docs/Script/script_v2/)
- [Egern JavaScript API](https://egernapp.com/docs/javascript-api/)
- [LRCLIB API](https://lrclib.net/docs)
- [lyrics.ovh API](https://github.com/NTag/lyrics.ovh) and [contract](https://github.com/NTag/lyrics.ovh/blob/main/apiary.apib)
- Kugou first-party endpoints: `https://lyrics.kugou.com/search` and `/download`.
- Kuwo first-party endpoints: `https://search.kuwo.cn/r.s` and `https://www.kuwo.cn/openapi/v1/www/lyric/getlyric`.
- [Public track palette](https://open.spotify.com/embed/track/76XUZSb13QUuj1HECY4Hvo)
- [Quantumult X binary response example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js)

Unicode 17.0.0 Unihan data and the full Unicode License V3 remain embedded in response runtimes and beside the Egern runtime. Core, native adapters, cache formats and test fixtures are independently written.
