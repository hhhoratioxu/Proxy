# VerseLyrics 0.4.2 client synchronization

This release applies the exact published Loon 0.4.2 core to Egern, Surge, Shadowrocket and Quantumult X. The core Git blob is `9a883bea34f33194684baeb2a6800d06bd25f534`; the original native adapter is unchanged. The Loon output must match its already published blob `47c88e41bee432300cb90f6d4ed6345493c48d67` or the build fails.

Fallback lyrics use the same track's public Spotify palette with distinct text/highlight roles. A valid official palette is retained, cached fallback documents receive new colors, and a failed lookup uses neutral gray without discarding found lyrics. Source matching, native timing, translation replacement and client-specific request formats are retained.

The main branch contains only installable entries and user documentation. This immutable runtime commit retains source, build tools and evidence. Only the other four clients' runtime pins change; the already published Loon entry remains byte-for-byte unchanged.

## Reproduce

Node.js 24, Python 3 and Ruby's standard YAML parser were used; no third-party npm packages are needed:

```sh
node build.mjs
python3 package.py
node --test core/test/*.test.mjs native-adapter.test.mjs egern-package.test.mjs config.test.mjs
ruby validate-egern.rb
node live-palettes.mjs
```

`package.py` uses the recorded public `base.json` snapshot to generate reviewable entries under `publish/`. Pass a runtime commit SHA as the first argument to pin a release. The live command requests only the public Spotify palette. It uses self-written cached lyrics and fake fixture credentials that are asserted absent from outbound requests; it does not access a user account or contact lyric providers.

## Evidence, 2026-10-16

- 281 automated checks passed: 185 core/palette checks, 88 native callback bridge checks, 4 Egern package checks and 4 native configuration checks.
- The Egern YAML parsed and passed separate checks for two native hooks, matching runtime pins, binary response mode, time/size limits and narrow MitM hosts.
- Five packaged runtimes performed actual public palette HTTP requests inside simulated client contracts and emitted the same expected Protobuf colors. See `live-palettes-results.json` for status and timings.
- The user's previous screenshots confirm fallback lyric display for the target track in Loon. This release has no new actual device/import or visual acceptance evidence for any client. The Egern missing-lyrics issue remains unresolved. Quantumult X still cannot invoke its response-body rewrite on a genuinely empty response body.

## Sources and notices

- Original Loon 0.4.2 implementation: <https://github.com/hhhoratioxu/Proxy/tree/6214b6d5e3a1cb3cadccfdfc1af242bc63310c0f/Loon/Development/VerseLyricsColors>.
- Egern native JavaScript contract: <https://egernapp.com/docs/javascript-api/> and script configuration: <https://egernapp.com/docs/configuration/scriptings/>.
- Spotify public palette: <https://open.spotify.com/embed/track/76XUZSb13QUuj1HECY4Hvo>.
- Each production guide retains its native client API references and limitations.

The original code and Unicode Unihan notice are preserved. Each generated runtime embeds the complete `NOTICE-UNICODE.txt`; Egern also has a separately accessible notice. No user tokens, cookies, real lyric text, screenshots or anonymous page-session values are included in the evidence.
