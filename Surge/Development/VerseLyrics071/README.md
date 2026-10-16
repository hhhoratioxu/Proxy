# VerseLyrics 0.7.1

Five native proxy clients use the same original Spotify fallback/translation core: Loon, Egern, Surge, Shadowrocket and Quantumult X. The previous release is [0.7.0](https://github.com/hhhoratioxu/Proxy/commit/2be05b3f7d55a04e6dc62432805e6f5b9894a5cc). This source snapshot and its runtime scripts are immutable; production imports pin this snapshot's commit.

## Changes

- Official lyrics now read only the requested track/language translation cache. Cached fallback lyrics, palettes, metadata, source-order hints and translations in other languages stay undecoded on the indexed read path. Legacy cache layouts remain readable; writes still merge the complete bounded store.
- When translation is disabled, lyric requests skip translation cache values. Translation stays enabled by default.
- Metadata lookup uses scalar identity records without a lazy field getter holding the response bytes. Entry writers retain their existing lazy field view to preserve unknown native fields.
- Cache insertion keeps an incremental entry-cost total instead of rescanning every retained entry after each metadata row. Cooldown overhead and both memory profiles remain bounded.
- Optional fallback timing correction is applied at output, after source translation matching. Default encoding retains its existing fast path; the correction path is separate and only runs when enabled.

## Optional timing correction

FALLBACK_OFFSET_MS defaults to 0. Positive values delay fallback lyric timestamps; negative values advance them. The setting is global to this plugin's fallback tracks, not a per-song calibration. Native controls offer 0, ±500, ±1000, ±2000 and ±5000 milliseconds. The core accepts finite integers in [-5000,5000]; invalid values use zero.

Only LINE_SYNCED fallback lyrics move. Spotify originals and UNSYNCED sources keep their timing. Output timestamps are bounded to [0,86400000]. Cached source timestamps never change, so repeated requests and preference changes do not accumulate offsets. JSON and Protobuf retain original row order and aligned translation indices. Correction may allocate a bounded row projection when enabled; it adds no HTTP, timer or cache entry.

MEMORY_MODE, FETCH_ARTWORK_COLOR, PREFERRED_SOURCE and SOURCE_TRANSLATIONS remain optional with their 0.7.0 defaults.

## Preserved behavior and limits

Six sources remain: LRCLIB, QQ, NetEase, Kugou, Kuwo and lyrics.ovh. Successful fallback still requires track identity/version checks. Real line timing is preserved; no fake timestamps or invented lyrics. Plugin translations own the native alternatives list; no Spotify translation is reused. Source translation reuse still requires exact timing and script/language checks.

The existing network admission policy, one admitted transport, request/byte/deadline limits, 600 lyric rows and cache profiles remain. Persistent storage has no atomic compare-and-swap, so admission is advisory. Busy uncached requests stay retryable on a later Spotify request; no background polling or promise queue is introduced.

Loon continues using native request-header Rewrite and two response scripts, with minimum 3.5.1 (983). [Client API contracts](CLIENT-CONTRACTS.md) record the five official pages supplied by the user and the unchanged host bridge. The repository's AGENTS.md and Loon/Docs/OfficialReference.md carry this guidance into subsequent projects.

## Validation and reproduction

1,059 automated tests pass, including both output formats on all five compiled adapters, offset/cache immutability, original timing, source translations, deadlines, duplicate/late callbacks, cache merge, oversize and burst behavior.

See [MEASUREMENTS.md](MEASUREMENTS.md) for exact data and limits. Measurements use mocked HTTP and macOS JavaScriptCore or Node, not an iPhone Loon VPN. They cannot establish that the VPN will never terminate. Source catalog coverage remains limited by available and correctly matched lyrics.

Use the unchanged 0.7.0 source/runtime checkout as BASELINE. Node and Python executables may be supplied explicitly:

~~~sh
pnpm install --frozen-lockfile
node build.mjs
python3 package.py RUNTIME_COMMIT 1059
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node jsc-fixtures.mjs
node jsc-cache-fixtures.mjs
clang -O2 -framework JavaScriptCore jsc-memory-runner.c -o jsc-memory-runner
python3 run-benchmarks.py /absolute/path/to/node /absolute/path/to/BASELINE
~~~

The benchmark wrapper snapshots every runtime SHA-256 and rejects changes during measurement. JSC results also record the script hash per run. Cold and filled-cache Node tests compare body hashes/request counts. The five-client churn test uses 240 distinct synthetic tracks per client/format and explicitly drains callbacks.

Build-only Terser is pinned to 5.51.2. Unicode matching data retains its license in core/NOTICE-UNICODE.txt and the published scripts.
