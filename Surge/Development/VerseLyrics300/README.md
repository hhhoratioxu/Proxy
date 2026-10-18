# VerseLyrics 3.0.0

Spotify native fallback lyrics and plugin translations for Loon, Egern, Surge, Shadowrocket and Quantumult X. Baseline: unchanged [1.0.0 source/runtime](https://github.com/hhhoratioxu/Proxy/tree/b237806470a5ca874e6c168b42c2998815212145/Surge/Development/VerseLyrics100). Imports pin this immutable build.

## Useful changes

- In auto source mode, reuse a verified per-source miss for the exact Spotify track for at most 90 seconds. A later explicit retry skips recently completed empty searches and spends its existing budget on remaining sources. No background retry or parallel source requests are installed.
- Download application errors, malformed responses, transport failures, timeouts and retired owners are not catalog-miss evidence. A failed first download still permits the existing second identity-checked candidate. Old whole-search negative records receive a new revision; successful lyrics and translations remain compatible.
- Add the optional NETWORK_MODE preference below. Defaults retain normal online fallback/translation and synced lyrics.
- Native headers retain their input until mutation and delete fields in place. Read-only headers avoid eager field-pair allocation. Unknown headers, duplicate array fields and Set-Cookie values remain tested.
- Specialize entry-cache logic to metadata/availability writes. Remove the unused production manual widget/status branch and the unconfigured Loon request script. Loon retains native Rewrite header handling. Other native request scripts parse only the four settings they use.
- Keep the 1.0.0 cache reader/writer. A proposed tokenizer made populated-cache saves slower without consistent memory gains and was rejected during development.

## Optional controls

| Setting | Default / option | Behavior |
| --- | --- | --- |
| NETWORK_MODE | online (default) | Normal metadata/source/translation/color lookups within existing bounds. |
| NETWORK_MODE | cache-only | Valid cached lyrics, translations and colors; zero plugin HTTP. Uncached fallback remains missing. Uncached translation rows stay blank; official alternatives are removed when plugin translation is enabled. Spotify itself still connects normally. |
| FALLBACK_MODE | synced (default) | Seek real line timestamps; retain verified plain text as final fallback. |
| FALLBACK_MODE | fast | Return the first sufficient identity-checked document, possibly untimed. Its plain cache does not block later synced lookup. |

Cache-only does not download a library, extend TTLs, fabricate missing lyrics or bypass identity checks. Switch back to online for new lookups. Invalid network-mode values use online behavior. No notifications, scheduled tasks or polling loops are installed.

Existing controls support established needs: target language, translation enablement, six-source selection and priority, missing-entry discovery, source-translation reuse, cache capacity, artwork-color fetching and fallback timing correction. Original words, real timestamps, palette/highlighting, unknown protobuf fields and replacement of native alternatives remain covered. Sources remain LRCLIB, QQ, NetEase, Kugou, Kuwo and lyrics.ovh.

## Bounds and tradeoffs

One advisory network owner, native callback settlement before completion, no admission polling and no invented native cancel handle. At most twelve source requests and 256 KiB source bytes per lookup. Response, line-count and deadline limits remain. Standard cache is bounded to 128 entries / 64,000 characters; compact to 64 / 32,000. Per-source misses consume the same bounded cache and may evict older records sooner.

Only a complete successful search supports negative evidence. A whole-search negative deadline cannot outlive its earliest reused source proof. Unknown schemas, service errors and interrupted work remain retryable. Another track, revision or expired proof cannot suppress a new lookup.

Busy uncached requests pass through and await a later Spotify request. Source coverage, the existing Egern missing-entry issue and physical iPhone VPN stability are not guaranteed by a version number. Native buffering happens before JavaScript can check a returned body on some hosts.

## Validation and reproduction

1,148 automated tests pass. See [MEASUREMENTS.md](MEASUREMENTS.md), [validation-summary.json](validation-summary.json) and [CLIENT-CONTRACTS.md](CLIENT-CONTRACTS.md). Benchmarks use synthetic text and mocked HTTP on macOS. A sequential wrapper fingerprints all fifteen final resources before and after each phase. No iPhone VPN acceptance is claimed.

~~~sh
pnpm install --frozen-lockfile
node build.mjs
python3 package.py RUNTIME_COMMIT 1148
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node jsc-fixtures.mjs
node jsc-cache-fixtures.mjs
node jsc-release-fixtures.mjs
node jsc-300-fixtures.mjs
clang -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk -O2 -framework JavaScriptCore jsc-memory-runner.c -o jsc-memory-runner
python3 run-benchmarks.py /absolute/path/to/node /absolute/path/to/unchanged-1.0.0
node source-progress-bench.mjs /absolute/path/to/unchanged-1.0.0
python3 summarize-300.py /absolute/path/to/unchanged-1.0.0
~~~

Terser is a pinned build-only dependency. Unicode data and its complete notice remain in core/NOTICE-UNICODE.txt and generated runtime scripts.
