# VerseLyrics 0.4.10 — distinct native lyric highlights

Generated fallback lyrics previously reused the public Spotify embed player's `textBase` and `textSubdued` colors. Both can be near white, so ordinary lines were difficult to distinguish from highlighted lines. This release uses black `text` and white `highlightText`, adjusting only the artwork-derived background toward white or black when either role would be hard to read. The supplied track's background changes from `#4d545c` to `#585f66`; its ordinary/highlight contrast against that background is 3.24:1 / 6.47:1. Foreground role contrast changes to 21:1.

Spotify still chooses which lines to highlight, scroll or fade using its own timeline and presentation. The proxy changes the native JSON/protobuf color integers, not the UI or per-frame rendering. Source lyrics and timestamps are unchanged. Existing valid official lyric palettes are preserved. These field contrast ratios do not include client animation or opacity and do not establish accessibility compliance for the app.

The field roles are consistent with the primary [GStreamer Spotify lyric source documentation](https://gstreamer.freedesktop.org/documentation/spotify/spotifylyricssrc.html) and the color fields in a [published Spotify lyric response example](https://github.com/br0kenpixel/spotify-lyrics-api-rust/blob/main/README.md). This implementation and adjustment algorithm are original; no external implementation was copied.

## Cache and resource behavior

`lyricPalette` performs at most eight fixed bisection steps for an overly dark/light background. Already readable backgrounds need no adjustment loop. Palette cache reads normalize the old fallback colors in memory, using the existing key and expiration without rewriting persistent storage, refetching a page, or discarding lyric/translation caches. There is no new timer, HTTP request, script hook, per-line state, image decoding, dependency or cache record.

Core 0.4.9 source selection, download and translation budgets, admission handling, source matching and scoped caches are retained. Native adapter 8 is unchanged except for its version comment. Loon still uses native request-header rewrites and two response hooks. Persistent cache limits remain 128 entries / 64,000 JSON characters; lyric / entry bodies 256 / 128 KiB; ordinary HTTP responses 96 KiB; source-chain traffic 256 KiB / twelve requests. These are script limits, not bounds on the VPN process or native HTTP buffering.

## Reproduce verification

Use Node.js 24 and Python 3, then:

```sh
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 620
node --test core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node native-playlist-bench.mjs /path/to/unchanged/0.4.9
node cache-scope-bench.mjs /path/to/unchanged/0.4.9/core/spotify-lyrics.js
node live-color-check.mjs
```

The zero hash is a configuration validation placeholder, not an import URL. Release packaging replaces it with the immutable runtime commit. `base.json` retains the twelve 0.4.9 public files used for packaging. Source and runtime blobs live in the pinned runtime commit; the main tree only changes the twelve existing import/documentation files.

620 automatic tests passed, with zero failures or skips. Palette tests cover all 256 grays plus a 729-color RGB grid, exact target-track colors, JSON/protobuf serialization, safe fallback, idempotence and old-cache normalization. `native-color-migration.test.mjs` exercises all five built host adapters in both formats, preserving lyrics/translations with zero HTTP calls, timers or cache writes. Other suites retain native host, six-source, translation, body limit, memory, contention, metadata and Loon rewrite checks. Ruby separately validates the Egern native YAML.

`native-playlist-results.json` compares 0.4.9 Loon with all five 0.4.10 hosts over 120 changes between twelve synthetic tracks. All new hosts produce the same response hash. Excluding the intentionally changed colors, full content hashes match the baseline, including lyric timestamps and translations. Each run makes 36 calls for the first twelve tracks and zero additional calls over the next 108 changes. Loon still invokes 240 scripts and schedules zero timers in this uncontended fixture.

The Loon Node sample took 234 ms versus 241 ms for the baseline; sampled maximum heap was 15,569,792 versus 15,532,256 bytes, essentially the same fixture footprint. This is a mock-network Node benchmark with explicit GC, not observed phone latency, peak native memory or VPN stability. `cache-scope-results.json` independently confirms the same four live entries and mean 2,796.6875 entry characters in both versions. No claim of a further memory reduction is made for this color fix.

`live-color-results.json` records a fresh public-page HTTP 200 for the supplied track, verified identity and the generated color integers. It retains no page session, token, artwork or lyric text. This verifies current public color extraction, not an authenticated Spotify lyric endpoint or iPhone rendering.

No iPhone screenshot, native import, memory-pressure or VPN-stability acceptance was performed here. Source coverage and prior Egern entry limitations remain. [CLIENT-CONTRACTS.md](CLIENT-CONTRACTS.md) records the existing host contracts and limits. No additional host API is introduced in 0.4.10. Update the existing remote plugin/module/rewrite to load the new pinned scripts, then reopen Spotify for a fresh lyric response; no diagnostic monitoring or cache deletion is required.
