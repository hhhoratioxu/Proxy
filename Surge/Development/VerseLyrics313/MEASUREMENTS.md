# VerseLyrics 3.1.3 measurements

**1551 automated tests pass, zero fail**, 36 added since 3.1.2; native Egern YAML passes. Baseline is published 3.1.2 immutable commit eb45d9ea239fdd649d4d22c0695435531f986de3. Adapter 14 and existing limits remain. Runtime hashes below and bench-runtime-sha256.json bind all measurements to final bytes.

## Work and functionality

Loon lyric runtime: **88,457 bytes**, compared with 97,832 bytes before (9.583% smaller). This is script/download size, not a RAM guarantee. All 6,447 Han mappings and nonmapped samples remain; planes load lazily, with no full decompression or Map.

Actual baseline/candidate source reproduction gives:

| Scenario | 3.1.2 | 3.1.3 |
| --- | --- | --- |
| 48 mixed rows sharing Latin spans | 48 q items | 1 q item |
| Normalize 120 chorus rows with eight unique pairs | 240 calls | 16 calls |
| Save with 24 retained metadata entries | 48 entry JSON parses | 24 entry JSON parses |

Both versions use one HTTP for the 48-row example and produce all 48 translations. Query counts must not be described as HTTP request counts. Cache characters are unchanged. See work-reproduction.json and runnable reproduce-work.mjs.

Two fresh public requests through the candidate translator use six self-written mixed rows per target with five unique q values, retain literal Chinese and produce six translated rows. Warm reopen uses zero HTTP. Exact service responses are in mixed-live-results.json. No account credentials, private Spotify traffic or copied song lyrics are used.

## Cold JavaScriptCore and 32-context sequences

360 fresh macOS public-JSC processes: six alternating trials per version/scenario, twenty cold cases and ten 32-context sequence cases. HTTP mocks have zero latency and callbacks drain before completion. All output hashes, bytes and HTTP counts agree with functional 3.1.2; mixed cases reduce q/reply sizes. No forced GC between sequence contexts.

| Mode | Cases | Peak footprint change | Elapsed change |
| --- | --- | --- | --- |
| cold existing | 12 | [-0.531, 1.857]% | [-6.045, 33.656]% |
| cold mixed | 8 | [0.52, 8.039]% | [-11.902, 6.743]% |
| sequence existing | 2 | [-0.098, 0.209]% | [0.391, 1.303]% |
| sequence mixed | 8 | [-0.414, 9.36]% | [-0.395, 6.954]% |

## First-load Node comparisons

Thirteen scenarios include ordinary foreign lyrics, missing lyrics with/without metadata, Chinese-to-English, repeated chorus, mixed Chinese/English and pure Chinese preservation. Twelve fresh processes per version/scenario: 312 cold and 312 populated-cache processes. Both versions use one shared fixture codec; only the actual client runtime differs. This avoids source-version differences in the harness. Populated caches contain 48,000-60,000 unrelated characters. Native output hashes and HTTP counts must agree. V8 old-space is set to 32 MiB for the harness, not a Loon memory limit.

| Cache | Scenario | Before ms | After ms | Time change | Peak heap change |
| --- | --- | --- | --- | --- | --- |
| cold | official-en-24 | 7.659 | 7.784 | 1.632% | 0.23% |
| cold | fallback-en-24 | 9.72 | 9.622 | -1.008% | -3.588% |
| cold | official-en-48 | 8.274 | 8.016 | -3.118% | 0.224% |
| cold | fallback-en-48 | 10.272 | 10.317 | 0.438% | 0.215% |
| cold | official-en-120 | 9.133 | 9.188 | 0.602% | 0.214% |
| cold | fallback-en-120 | 11.514 | 11.057 | -3.969% | 0.548% |
| cold | official-zh-48 | 8.291 | 9.025 | 8.853% | 0.212% |
| cold | fallback-zh-48 | 9.974 | 10.49 | 5.173% | 0.25% |
| cold | empty-fallback-en-48 | 10.957 | 10.729 | -2.081% | 0.217% |
| cold | empty-fallback-zh-48 | 11.339 | 10.881 | -4.039% | 0.247% |
| cold | official-chorus-120 | 8.184 | 8.447 | 3.214% | -0.86% |
| cold | official-mixed-48 | 12.898 | 13.631 | 5.683% | -0.589% |
| cold | official-pure-zh-48 | 6.257 | 5.321 | -14.959% | -0.733% |
| populated | official-en-24 | 7.985 | 8.285 | 3.757% | 0.19% |
| populated | fallback-en-24 | 9.841 | 10.04 | 2.022% | 0.187% |
| populated | official-en-48 | 8.78 | 8.611 | -1.925% | 0.194% |
| populated | fallback-en-48 | 10.359 | 10.826 | 4.508% | 0.182% |
| populated | official-en-120 | 9.694 | 9.819 | 1.289% | 0.179% |
| populated | fallback-en-120 | 11.576 | 11.81 | 2.021% | 0.176% |
| populated | official-zh-48 | 8.697 | 9.047 | 4.024% | 0.174% |
| populated | fallback-zh-48 | 10.747 | 10.709 | -0.354% | 0.21% |
| populated | empty-fallback-en-48 | 11.474 | 11.292 | -1.586% | 0.176% |
| populated | empty-fallback-zh-48 | 11.071 | 10.663 | -3.685% | 0.214% |
| populated | official-chorus-120 | 8.509 | 9.413 | 10.624% | -2.139% |
| populated | official-mixed-48 | 13.621 | 13.288 | -2.445% | -1.895% |
| populated | official-pure-zh-48 | 6.238 | 5.385 | -13.674% | -3.946% |

Negative percentages are reductions. Some cases regress in time or sampled heap; no universal reduction is claimed. Raw runs retain absolute peaks, incremental growth and pre-invocation heap. Samples include fixture/VM/compiler/allocator effects and are not every allocation or iPhone networking.

## Continuous songs and pressure

Twelve separate native playlist processes compare Loon baseline plus all five candidate clients in JSON/protobuf. Each processes 240 distinct cold song IDs, 720 sequential metadata/source/translation/color HTTP calls, and bounded eviction. All body/content SHA256 results match. Twenty more processes cover five clients, two formats and two cache modes: 120 mixed-song IDs, 240 responses per process, total 4,800 fresh native responses and 2,400 translation HTTP calls. Reopen uses zero HTTP, with zero unfinished callbacks and maximum one active HTTP. Fresh VM invocation and explicit GC every six songs are harness behavior, not native reclamation evidence.
Mixed cache maximum: 63956 / 64,000 standard and 31978 / 32,000 compact characters. Existing 128/64 entry caps remain.

| Loon playlist | Version | Elapsed ms | Sampled peak heap bytes |
| --- | --- | --- | --- |
| json | baseline | 1018 | 21148464 |
| json | candidate | 984 | 20889168 |
| protobuf | baseline | 1036 | 21176432 |
| protobuf | candidate | 952 | 21873744 |

The playlist peak is a sampled whole-process heap and can increase on one representation even when another decreases; no iPhone extrapolation is made. Sixteen delayed-callback pressure processes cover 60 arrivals every two milliseconds and 400 ms callbacks. Maximum two live invocations, one active HTTP, no admission timers; settled retry retains translation. Native storage atomicity is not assumed.

## Invalid service response backoff

Compiled Loon baseline and candidate are run against the same 90,013-byte malformed ASCII HTML with HTTP 200. Across ten songs in either representation, the translator bad-host requests decrease from ten to one; malformed-first-source requests also decrease from ten to one while all twenty valid QQ requests and ten successful fallbacks remain. Output hashes match. Failure does not store a no-lyrics proof or renew the deadline; expiry allows retry. All five adapters and both representations exercise this behavior in the regression suite. These are deterministic HTTP mocks, not live failure captures.

## Reproduction and boundary

Build and run tests/Ruby as listed in README.md. Generate fixtures and compile jsc-memory-runner.c using the public macOS SDK/JavaScriptCore framework. Run `python3 run-final-313.py /path/to/node /path/to/312`; the driver rejects runtime changes between steps. Work/callback/cache measurements use self-written fixtures. `node mixed-live-check.mjs` is a separate live public-service observation and may change with the service.

No iPhone/client import or VPN acceptance was performed. Loon native buffers, OS lifetime and process ceiling cannot be guaranteed by these JavaScript measurements. Cache capacity, source/body/URL/character/time limits, native completion, six-source fallback, mixed-English translation, Chinese conversion filtering and native timing/highlighting are retained.
