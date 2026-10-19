# VerseLyrics 3.1.7

Five native Spotify lyric rewriters. Core 3.1.7, adapter 15. Original code; Unicode data license remains in core/NOTICE-UNICODE.txt.

This release repairs the requested language boundary: Chinese/English vocal-only rows and standalone mixed-row vocal fragments do not produce translations. Explicit other languages remain eligible, including short words and vocal syllables. Meaningful English/Chinese fragments, missing-lyric fallback and static-to-timed replacement remain available.

Joined forms such as ohohoh, hahaha and lalala, and English fillers with hidden/default-ignorable formatting, now pass the same filter as their separated forms. Formatting is ignored for classification only; original words and timestamps remain literal. Chinese vocal-only rows are also skipped when the selected target is a foreign language. Meaningful complete words/phrases such as who, no, hello and Oh my love remain eligible.

Known source-language tags take precedence over the English short-word list. Japanese/Korean aliases and English/Chinese tags normalize once; ordinary en/zh/unknown tags use a fast path. Short foreign words such as na/la are translated or restored from valid cache data rather than called English fillers. Supported explicit foreign source codes are passed to the existing translator for complete rows; Han/Latin fragment batches retain auto detection. Conversion-only Chinese outputs still do not display, including when metadata is stale. No unsupported source code is forced into the request.

Old grouped/per-line caches, same-response source translations and official alternatives cannot bypass the English/Chinese vocal filter. Valid foreign translations remain warm, and a change back to an English label cannot restore a cached foreign vocal translation. No global cache purge is required. Static-to-timed source replacement now retains the original official response language for translation decisions; it must not fall back to English filler rules after switching providers.

The native bridge is unchanged: Loon 3.5.1 (983), native Rewrite, two response scripts and typed arguments. All twelve settings remain, including REPLACE_UNSYNCED. No host API, permission, timer, storage key, concurrency, cache cap, source-chain budget or deadline is added. Existing bounded six-source lookup, colors, timing, mixed-English translation, simplified/traditional filtering and the 3.1.6 cache optimizations remain.

## Build and verify

Install pinned Terser 5.51.2 with `pnpm install --frozen-lockfile`, then:

    node build.mjs
    python3 package.py RUNTIME_COMMIT_SHA TEST_COUNT
    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb

Reconstruct the unchanged [3.1.6 source/runtime stage](https://github.com/hhhoratioxu/Proxy/tree/4f5d87583a44364de3495a4f9902a5abb4756ae6/Surge/Development/VerseLyrics316), placing its fifteen runtime/license files under runtime/ with repository-relative paths. Then:

    python3 run-measurements-317.py NODE_PATH BASELINE_316_STAGE
    python3 summarize-317.py
    python3 live-vocal-language-check.py

The first two commands run all comparisons serially and preserve actual runtime hashes. The live probe makes four current public requests using self-written short words only; it does not use song lyrics, credentials or the paid Google Cloud API. No API keys are needed. The public route is not an official stability or quality guarantee.

New compiled native tests cover all five clients in JSON and protobuf, including old translations, joined/invisible fillers, French short words, Japanese/Korean lyrics, warm cache, language-label changes, Chinese fragments and fallback-source translations. The new Chinese vocal scanners are lazy and reused; no per-song dictionary or retained token array is introduced. Fixed repeated token alternatives do not use nested variable-length repetition.

MEASUREMENTS.md retains improvements and regressions. Ordinary comparisons use identical outputs; changed vocal/language behavior has separate functional cases. Live source replies, desktop measurements, native host mocks and actual iPhone UI/VPN acceptance are distinct. This release does not claim every device cannot exceed host memory or disconnect its VPN.
