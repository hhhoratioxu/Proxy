# VerseLyrics 0.4.9 source and verification

Original Spotify native lyric and translation processor for Loon, Egern, Surge, Shadowrocket and Quantumult X. The immutable runtime commit retains source, licenses, fixtures and reproducible evidence; production main retains the five installation entries and documentation.

## Corrected behavior

0.4.8 incorrectly treated a completed native timeout callback as an outstanding transport, retained its admission slot, and stopped every subsequent lyric source. Its latest-response marker could also discard useful work merely because a different track's response arrived. When two slots were occupied, the latest request passed through as missing and depended on another Spotify request. These were actual code paths reproduced by fixtures, not evidence that every reported device symptom had the same cause.

0.4.9 releases settled timeouts and continues eligible sources. An explicitly unfinished transport retains its lease until expiry. Two advisory active jobs remain; on contention there is one replaceable latest waiter, at most 2.6 seconds, with one consumed 50 ms timer at a time and no HTTP while waiting. A same-turn burst is collapsed before timers are created. Older waiting invocations retire on their next check; a pending-record limit is not a hard count of native JavaScript contexts. Running older HTTP is always awaited. Ordinary concurrent responses do not cancel each other. There is no infinite queue, HTTP Promise.race, setInterval, background networking or reliance on Loon clearTimeout.

Chinese title/artist names without kana prioritize QQ, NetEase, Kugou and Kuwo, then LRCLIB and lyrics.ovh. A successful timed artist hint retains precedence. QQ/NetEase search words use the existing Han normalization; title, artist, duration, version and unique-recording checks remain. A verified candidate receives a separate download window within the same total budget. Empty first candidates can yield to a second candidate without excluding later providers. Only a complete successful search of every configured source caches a catalog miss. Revision 3 negative caches are invalidated; successful caches remain.

Uncached/unavailable Spotify metadata can fall back to the same track's public embed page. One bounded request extracts track identity, title, artists, duration and palette. The page supplies no album: it does not invent one, and source matching requires the existing unique title/artist/duration rule within one second. A known album is required for the more permissive exact-album match. Spotify authorization/permission errors still pass through. No session fields, cookies, page content or tokens are cached or sent to sources.

Translation receives at most 2.5 seconds of the remaining core budget and stops after a failed batch, retaining successful rows and removing official alternatives as configured. Slow or very long songs can receive partial plugin translations; missing rows remain eligible on a subsequent lyric request. This reduces blocking at the cost of finishing slow translations across requests. Native words/timing survive. HTTP timeout support is client dependent, especially in Quantumult X; this is not a universal wall-clock guarantee.

Loon native request-header Rewrite, the small entry bundle, per-track cache views, Unicode license, five client bridges, six sequential sources and original palette behavior remain. See [CLIENT-CONTRACTS.md](./CLIENT-CONTRACTS.md).

## Reproduce

Node.js, Python 3 and Ruby standard YAML; no third-party JavaScript runtime dependency.

```sh
node build.mjs
python3 package.py RUNTIME_COMMIT 606
node --test --test-reporter=tap --test-timeout=10000 core/test/*.test.mjs native-adapter.test.mjs native-memory.test.mjs client-contract.test.mjs egern-package.test.mjs config.test.mjs loon-rewrite.test.mjs native-burst.test.mjs
ruby validate-egern.rb
node responsiveness-bench.mjs /path/to/unmodified-0.4.8/core/spotify-lyrics.js
node native-playlist-bench.mjs /path/to/unmodified-0.4.8
node cache-scope-bench.mjs /path/to/unmodified-0.4.8/core/spotify-lyrics.js
node live-public-flow.mjs
```

The [unchanged 0.4.8 baseline](https://github.com/hhhoratioxu/Proxy/tree/661010d356abacfad6f2bfb910db65958b357315/Surge/Development/VerseLyrics048) uses runtime files from that same commit. Put its client runtime directories under `runtime/` for the playlist benchmark.

606 automatic tests passed, zero failures/cancellations/skips. These include all five packaged burst responses, deferred work completing in the original latest response, source recovery after timeout, separate candidate budgets, translation latency, public metadata identity/permission checks, unknown-album matching, native JSON/protobuf contracts, cache bounds, 2,520 Loon Rewrite combinations and preserved original timing/colors/translations. The Loon DSL test is an independent subset interpreter, not an actual Loon import/parser test.

## Evidence and limitations

`responsiveness-results.json` compares identical deterministic network fault models through complete 0.4.8/0.4.9 cores. A settled first-source timeout previously returned no lyrics and retained a slot; the new run continued to QQ and released admission. A Chinese candidate previously failed during the allocated time; the new run returned timed lyrics. In a 96-line slow-translation case, the old model waited 5.1 seconds and translated all 96 lines, while the new model returned at 2.5 seconds with 32 translated lines and all 96 original lines. These numbers are modeled, not observed phone timings.

`native-burst.test.mjs` starts two blocked requests followed by eighteen newer responses through each client bridge. At most two HTTP calls are active in these fixtures. The last response obtains its own lyrics and plugin translations when the older callbacks finish, without manually retrying that track. Cached replay requires no HTTP. Persistent storage lacks atomic compare-and-swap, so this is an advisory bound, not a cross-runtime semaphore guarantee.

`native-playlist-results.json` repeats 120 switches over twelve synthetic songs in separate Node processes with 32 MiB old-space and explicit GC every six changes. All five 0.4.9 hosts and 0.4.8 Loon produce identical output hashes; each uses 36 first-round HTTP calls and zero calls for the next 108 switches. Loon retains 240 script invocations and zero waiting timers in this uncontended scenario. Its sampled Node heap was 15,495,352 bytes versus 15,476,640 for 0.4.8: effectively the same fixture footprint, not a claim of further memory reduction. Cache scope remains four live entries / mean 2,796.6875 entry characters in both versions (`cache-scope-results.json`). Neither benchmark measures native VPN memory or proves iPhone stability.

`live-public-flow-results.json` starts from an empty cache and a simulated native 404 with no authorization, then uses real public metadata, source and translation HTTP. Two of three tracks were matched: the supplied 《那页夏天》 had 42 timed lines in 2,098 ms including metadata, palette and translation check; Blinding Lights had 49 timed lines and 49 plugin translation rows in 3,541 ms. Their immediate repeats made zero HTTP calls. Never Gonna Give You Up did not produce a sufficiently verified match in this sample; the broad LRCLIB search exceeded the ordinary 96 KiB response cap, and other source candidates did not pass matching. That cap was not raised, and this failure is not represented as source-wide absence or as actual Spotify official-lyric availability. Live latency and source results change over time. Evidence files retain metadata/counts only, not lyric text or page sessions.

The core budget remains ten seconds; native lyric / entry input 256 / 128 KiB; ordinary external responses 96 KiB; public page 256 KiB; cumulative fallback 256 KiB / twelve requests; 600 rows; 4,096 protobuf fields; final output 512 KiB; translations 60,000 retained/output characters. Persistent storage remains 128 entries / 64,000 JSON characters. No source races or larger cache were added. Native callback hosts can buffer unknown-length responses before JS size checks, so these are not host-process memory limits.

No iPhone native import, Spotify UI, memory-pressure or VPN-stability acceptance was performed. Source coverage remains incomplete. Egern's earlier missing-entry behavior is not established as fixed; Quantumult X may not invoke a body hook for an actually empty upstream body. Updating all five packages is not evidence that all five have identical device behavior. Clash/Mihomo has no matching HTTPS response-body script interface.

Update the entire remote plugin/module/rewrite using its existing import URL so it loads the pinned 0.4.9 runtime. No diagnostic notification, monitoring task, paid API or new MITM hostname is added.
