# VerseLyrics 3.1.4

Five native Spotify lyric response rewriters. Core 3.1.4, adapter 15. Original code; see core/NOTICE-UNICODE.txt for the Unicode data license.

This release adds a default-on **REPLACE_UNSYNCED** preference (替换官方非同步歌词). When Spotify returns recognized static lyrics, enabled mode seeks identity-checked real timed lyrics from the existing sources. Disabled mode keeps official static lyrics even when a timed plugin cache exists. Missing-lyric fallback and plugin translation keep working independently. Official synchronized lyrics retain their source. A failed upgrade keeps official words; plain sources never get fabricated timestamps.

It also suppresses translations for filler-only vocals such as oh, ah, ooh and repeated forms. Chinese mixed rows keep standalone vocal spans literal and translate remaining meaningful English. Meaningful complete phrases are not classified by filler prefixes. Filtering applies before cache/source acceptance and before HTTP; old official filler alternatives are removed by the existing translation replacement behavior. Chinese simplified/traditional-only conversions remain hidden.

## Build and verify

Use Node with the pinned Terser dependency in package.json/pnpm-lock.yaml. Install with pnpm install --frozen-lockfile. Run:

    node build.mjs
    python3 package.py RUNTIME_COMMIT_SHA TEST_COUNT
    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb

The native imports expose REPLACE_UNSYNCED through Loon's documented boolean switch and typed argument object, Egern env_schema, Surge/Shadowrocket argument strings, and Quantumult X source URL variables. Loon minimum remains 3.5.1 (983). For Surge, Shadowrocket and Quantumult X set REPLACE_UNSYNCED=false in the existing arguments/URL variables to disable it.

All six missing-lyric sources, mixed-English translation, target language selection, preferred source, compact cache, artwork-color choice, offset, fallback strategy, network mode, source translations and native palette/timestamps remain. Bounds remain 128 entries/64000 serialized characters (compact 64/32000), 600 rows, 64 original rows per batch, 6800 URL characters, 96 KiB translation reply and a 2.5-second translation window. No new cache or background work is introduced.

See CLIENT-CONTRACTS.md for API and behavior constraints and MEASUREMENTS.md for verification scope. This patch does not claim universal latency/peak-memory reductions or iPhone VPN acceptance. The previous performance report is retained at https://github.com/hhhoratioxu/Proxy/blob/5c5939ae25111f4d0184d54461666c0f5a662f6e/Surge/Development/VerseLyrics313/MEASUREMENTS.md .
