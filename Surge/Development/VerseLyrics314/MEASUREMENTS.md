# VerseLyrics 3.1.4 verification scope

This is a feature patch against 3.1.3, not a new universal latency or memory improvement claim. Tests ran on macOS ARM with Node v24.19.0 and the actual minified scripts. Service bodies are deterministic fixtures; actual iPhone VPN and upstream catalog acceptance were not performed.

- 1,683 automated tests pass; 132 cases added for this patch. The earlier mixed-English and simplified/traditional regressions remain in the suite. Filler expectations for standalone Hey/Yeah were updated to the requested behavior without weakening meaningful-English checks.
- Egern native YAML validation passes, including the new schema and script parameters.
- feature-check.mjs invokes ten client/format configurations (five clients, JSON and protobuf), six scenarios each, totaling 60 native invocations. Both replacement states, missing fallback with replacement disabled, 600 filler rows, meaningful mixed English and warm cache reuse are checked.
- In all ten configurations: static replacement enabled uses two source HTTP requests and returns verified timed words; replacement disabled keeps static words and uses one translation HTTP request; completely missing lyrics still use two source HTTP requests with replacement disabled.
- The 600-row filler scenarios use zero translation requests and remove stale official alternatives. Meaningful mixed rows retain literal Chinese and filler spans, translate two meaningful spans in one request, and reuse the result with zero warm HTTP requests.
- Every native invocation completes once after pending HTTP settles, with at most one active service request and the existing 128-entry/64000-character cache bounds. Loon schedules no script timer in these scenarios.
- The Loon lyric script is 89,305 bytes (3.1.3: 88,457; +848 bytes for the preference and filtering). The lightweight Loon entry remains 30,410 bytes. Serialized cache formats, caps, concurrency, HTTP timeouts and native body limits are unchanged.

Reproduction after node build.mjs and python3 package.py RUNTIME_COMMIT_SHA 1683:

    node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
    ruby validate-egern.rb
    node feature-check.mjs

feature-results.json contains native per-scenario counts and runtime SHA256 values; runtime-manifest.json contains every generated script's byte size and Git blob hash. The 3.1.3 desktop performance report is retained at https://github.com/hhhoratioxu/Proxy/blob/5c5939ae25111f4d0184d54461666c0f5a662f6e/Surge/Development/VerseLyrics313/MEASUREMENTS.md .
