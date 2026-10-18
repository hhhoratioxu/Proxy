# VerseLyrics 3.1.0 measurements

Current validation: **1253 tests passed, zero failed**; native Egern YAML validation passed. Baseline is unchanged 3.0.0 at runtime commit f782e75afe834be7c796f3ce1ec8d2e7939e312a. Native API/compiler test inputs are synthetic; there is no iPhone/VPN acceptance in this report.

## Existing behavior comparisons

| Experiment | Median sampled peak change | Median elapsed change |
| --- | --- | --- |
| macOS JSC cold, 12 unchanged cases | -3.999% to +1.600% | -10.518% to +48.495% |
| macOS JSC 32 fresh contexts, 2 unchanged cases | -0.397% to +0.316% | +0.743% to +0.966% |
| Node cold first load, 10 cases / 240 processes | -4.473% to +0.852% | -0.962% to +5.972% |
| Node filled cache first load, 10 cases / 240 processes | +0.088% to +0.736% | +0.022% to +6.353% |

The unchanged cases require matching output fingerprints and request counts. These results contain both increases and decreases; this release is not described as uniformly faster or lower-memory. The JSC cold NetEase partial-translation case is a timing outlier (+48.495% in this run); its 32-context sequence is +0.743% and sampled peak is lower. The cold absolute medians are recorded in the raw report, and no on-device cause is inferred.

## New behavior comparisons

| Case | HTTP per response: 3.0.0 → 3.1.0 | Cold sampled peak change | 32-context sampled peak change |
| --- | --- | --- | --- |
| Chinese conversion, json | 1 → 0 | -6.506% | -9.989% |
| Chinese conversion, protobuf | 1 → 0 | -8.054% | -10.783% |
| Static official → fetched timed, json | 1 → 2 | +6.789% | +3.903% |
| Static official → fetched timed, protobuf | 1 → 2 | +6.285% | +2.683% |
| Static official → cached timed, json | 0 → 0 | +2.833% | +9.512% |
| Static official → cached timed, protobuf | 0 → 0 | +2.353% | +7.918% |

Chinese preservation eliminates the synthetic conversion request. Static-to-timed results deliberately differ in provider/timing from the old static passthrough and require additional parsing/encoding or source requests. Cold static enrichment uses about 6.3–6.8% more sampled JSC footprint than translating the static original in this fixture; cached upgrade sequences also rise. This is the cost of supplying real timestamps rather than leaving the static text unchanged. Existing work caps, advisory admission and sequential HTTP remain; these measurements cannot establish an iOS memory ceiling.

## Switching and pressure

- Existing missing-lyrics churn: five candidate clients × JSON/protobuf, 240 different synthetic song IDs, 720 HTTP calls per process, matching output fingerprints. Maximum active HTTP is one; cache remains within 64,000 characters.
- New static-upgrade churn: five clients × two formats × two cache modes = 20 separate processes. Each processes 120 song IDs and 240 lyric responses including immediate cached reopen. Each makes 240 source calls total, zero calls on reopen, maximum active HTTP one, and no HTTP left after completion. Standard cache stayed at or below 63944 characters; compact stayed at or below 31874.
- Pressure mocks retain the established two-maximum unfinished script invocations and one active HTTP request under 60 arrivals at two-millisecond spacing and delayed callbacks. No admission timers; a later client retry can translate after the busy owner drains. Busy responses can omit uncached enrichment.
- Node uses 32 MiB old-space processes and explicit GC in churn experiments. That is a harness configuration, not a Loon RAM limit. Egern completes by awaited return; its harness completion count is not a native $done call.

## Reproduce

Pin the 3.0.0 baseline runtime/source above in a separate BASELINE directory. Use a current Node, Python 3 and the public macOS JavaScriptCore framework. The compiler uses an installed Command Line Tools SDK, with no Xcode license changes.

```sh
node jsc-fixtures.mjs
node jsc-cache-fixtures.mjs
node jsc-release-fixtures.mjs
node jsc-300-fixtures.mjs
node jsc-policy-fixtures.mjs
clang -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk -O2 -framework JavaScriptCore jsc-memory-runner.c -o jsc-memory-runner
python3 policy-bench.py "$BASELINE"
node native-first-load-bench.mjs "$BASELINE"
node native-first-load-bench.mjs "$BASELINE" --populated
node native-playlist-bench.mjs "$BASELINE" --churn
node native-pressure-bench.mjs "$BASELINE"
node policy-playlist-bench.mjs
```

The JSC matrix has 18 cold cases and eight 32-context cases, six alternating trials per version, 312 processes total. Existing-case fingerprints must agree. New policy cases have explicit expected request-count differences. Raw trials are in policy-jsc-results.json, native-first-load-results.json, native-filled-first-load-results.json, native-churn-results.json, native-pressure-results.json and policy-native-churn-results.json. Runtime hashes are in bench-runtime-sha256.json and validation-summary.json.
