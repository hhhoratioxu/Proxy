# VerseLyrics 0.4.4 source and verification

Original Spotify native lyrics processing for Egern, Surge, Loon, Shadowrocket and Quantumult X. This development snapshot is stored at the runtime commit; main contains only current installation entries and user documentation.

0.4.4 adds three original source adapters: Kugou, Kuwo and lyrics.ovh. Auto mode tries LRCLIB, QQ Music, NetEase, Kugou, Kuwo, then lyrics.ovh, stopping on the first accepted result. Kugou and Kuwo retain source timestamps. lyrics.ovh returns plain text and is encoded as native UNSYNCED lyrics; it cannot provide synchronized scrolling. Existing native translation replacement, same-track palette lookup and successful caches are preserved.

## Build and verification

Requires Node.js 24 or a compatible runtime, Python 3 and Ruby's standard YAML library. No external JavaScript packages are needed.

```sh
node build.mjs
python3 package.py RUNTIME_COMMIT 428
node --test core/test/*.test.mjs native-adapter.test.mjs egern-package.test.mjs config.test.mjs
ruby validate-egern.rb
node live-source.mjs
node live-new-sources.mjs
node live-palettes.mjs
node memory-bench.mjs /path/to/unmodified-0.4.3-core.js
node source-memory-bench.mjs
```

428 automated tests passed on 2026-10-16, plus native Egern YAML validation. Coverage includes six-source routing, identifier/artist/title/version matching, ambiguous recordings, malformed Base64 and UTF-8, source size/time/request budgets, cache migration, timer cleanup, native translations and palette preservation. All three new sources are tested in both JSON and Protobuf through the five packaged client contracts. Fixtures contain original test lyrics; target-song fixtures contain public metadata only.

`request-core.js` is generated from the shared core. Four callback clients use adapter 3; Egern uses its native ctx export. Runtime hashes and byte sizes are in `runtime-manifest.json`. Only request hooks are small (3,773 bytes for Egern and 6,113–6,121 bytes for callback hosts); full response runtimes are approximately 123–130 KB including the Unicode notice and shared character data.

## Resource bounds

- Sources are awaited sequentially. A single fallback invocation may start at most 12 HTTP requests and decode at most 512 KiB of source responses. The existing overall 20-second processing deadline is shared; per-source time and request allocations reserve a chance for later services.
- New service responses are capped at 96 KiB before JSON decoding. Kugou LRC Base64 decoding allocates at most 64 KiB of decoded bytes. Lyrics are capped at 600 rows; timestamp-tag floods are rejected while scanning. Query metadata has bounded title, album and artist lengths.
- Content-Length is checked before body reading where the host exposes it. For unknown lengths, the received bytes are checked before text/JSON decoding; an oversized body exhausts the shared byte budget where appropriate. The native networking layer may already have buffered the response. These are script admission bounds, not a hard cap on total proxy process memory or network transfer.
- Host HTTP timers are cleared immediately when supported. Promise references are also released on settlement, including hosts without clearTimeout, so late timer callbacks cannot retain completed response buffers through the resolver. Hosts that do not expose cancellation may still have a timed-out native request in progress; late responses are ignored.
- Lazy shared storage remains bounded at 192 entries and 96,000 serialized JSON characters. Successful hits retain their existing daily TTL. Misses last 90 seconds; transient failures last 15 seconds. Negative entries from the prior three-source version are bypassed automatically; successful cached lyrics remain valid. Retry-After cooldowns are respected.
- Existing response limits remain: 384 KiB for older external services, 512 KiB for playback context processing and 2 MiB for the remaining native responses. Color lookup happens only after successful fallback lyrics. Translation batches remain sequential.

`memory-results.json` compares identical ~1.5 MiB JSON decode/native translation rewrite workloads. Decode heap was 13,373,192 bytes in 0.4.3 and 13,393,784 bytes in 0.4.4 on the recorded Node run. The expanded source adapters do not materially increase this workload's allocation. 0.4.4 also completed with V8 old space limited to 32 MiB.

`source-memory-results.json` exercises 200 unique tracks through all six sources, with 1,600 sequential HTTP fixture calls and near-budget response sizes. It records one in-flight fixture request, at most 480,434 source bytes per track, a 95,513-character cache with 169 retained entries, and no process failure under a 32 MiB V8 old-space limit. The sampled maximum total JS heap was 43,345,384 bytes (old-space is only part of the JS heap); RSS was larger because it includes Node, networking, code and buffers. These are macOS/Node measurements, not iPhone RAM measurements or device acceptance.

## Matching and real service checks

Same-album results are preferred. Cross-album candidates require exact normalized title and artist set, a duration difference of at most one second and uniqueness. Live, remix, remastered, acoustic, demo, karaoke and instrumental album names are excluded from the relaxed path. LRCLIB skips empty records before candidate selection.

Kugou's lyric search has no album metadata. Exact normalized title/artist and duration within one second are required; only one distinct recording duration may qualify. Multiple lyric uploads for that same duration are allowed. Only UTF-8 LRC is downloaded; there is no KRC decompressor. The per-lyric public download key is neither cached nor logged.

Kuwo uses a compact search phrase for long soundtrack subtitles and multiple credited performers, then validates the unshortened title and complete artist set. It uses the working `www.kuwo.cn/openapi/v1/www/lyric/getlyric` endpoint, not the legacy mobile endpoint that returned a music-query failure. That API normally returns just timestamped rows; the numeric catalog ID is validated before retrieval.

lyrics.ovh first validates a suggestion result's title, artist, album and duration, then requests lyrics for that exact artist/title. It does not supply timestamps. Returned preview, link, next-page or download URLs are never followed.

`live-new-sources-results.json` records real public HTTP retrieval through the new adapters: 44 timed rows from Kugou, 49 timed rows from Kuwo and 63 unsynchronized rows from lyrics.ovh. These cases were chosen from service catalogs and do not establish Spotify catalog-wide coverage. `live-source-results.json` records the user-supplied Spotify track: LRCLIB returned HTTP 429 and QQ Music then supplied 42 timed rows. Evidence retains metadata, sizes, counts and request paths; no real lyric text, user credentials or lyric access keys are stored.

`live-palettes-results.json` records public Spotify palette HTTP through the five simulated host contracts. Automated and live-service checks do not establish native app import, iPhone rendering, complete coverage, or a fix for Egern's previous missing-lyric entry issue. Quantumult X cannot trigger response-body scripts on a truly empty upstream body. Clash/Mihomo lack this response rewrite runtime.

Spotify authorization is used only for the original Spotify host's metadata request and is not stored, logged or forwarded to lyric, translation or palette services. Authentication failures are not treated as missing lyrics.

## Primary references and endpoints

- [Loon Script API](https://nsloon.app/docs/Script/script_api/) and [native rules](https://nsloon.app/docs/Script/script_v2/)
- [Egern JavaScript API](https://egernapp.com/docs/javascript-api/)
- [LRCLIB API](https://lrclib.net/docs)
- [lyrics.ovh API repository](https://github.com/NTag/lyrics.ovh) and [API contract](https://github.com/NTag/lyrics.ovh/blob/main/apiary.apib)
- Kugou: `https://lyrics.kugou.com/search` and `https://lyrics.kugou.com/download`, validated against actual service responses.
- Kuwo: `https://search.kuwo.cn/r.s` and `https://www.kuwo.cn/openapi/v1/www/lyric/getlyric`, validated against actual service responses.
- [Public track palette](https://open.spotify.com/embed/track/76XUZSb13QUuj1HECY4Hvo)
- [Quantumult X binary rewrite](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js)

Unicode 17.0.0 Unihan data and Unicode License V3 remain embedded in response runtimes, with the full notice beside the Egern runtime. Core and adapters are original code; no third-party script runtime or API keys are required.
