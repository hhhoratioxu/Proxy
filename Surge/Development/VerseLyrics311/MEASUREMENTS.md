# VerseLyrics 3.1.1 measurements

**1357 automated tests pass, zero fail**. Native Egern YAML checks pass. This adds 104 regression checks to 3.1.0, including all five compiled adapters in JSON/protobuf and both Chinese targets. Baseline runtime/source is the unchanged published 3.1.0 at commit 4a74064675bf7224fdd45859dc0b513ffa074c6c.

## Reproduced bug and result

Independent 3.1.0 fixtures emitted conversion for a Chinese/Latin row, a wrongly labelled Chinese row and a cached conversion. Two real unauthenticated public translation requests with synthetic text confirmed that a Chinese/Latin row can be returned with detected language en, so detection metadata alone is insufficient. Exact samples and limits are in regression-reproduction.json. No user phone traffic was captured.

The candidate preserves Chinese rows with Latin names/ad-libs or Bopomofo before translation, checks every cache/provider/service result at output, and remembers an identity result when the service explicitly detects Chinese. Existing conversion cache entries are filtered without clearing the entire store. Output equivalence uses the existing Unicode data and a few common orthographic equivalents; it compares code points without constructing two converted lyric strings or converting visible originals.

## First load and repeated contexts

| Experiment | Median sampled peak change | Median elapsed change |
| --- | --- | --- |
| JSC cold: 18 unchanged cases | -1.372% to +1.452% | -10.071% to +23.691% |
| JSC sequence: 2 unchanged cases × 32 contexts | -1.030% to +0.395% | -0.483% to -0.176% |
| JSC cold: 6 corrected conversion cases | -6.637% to -0.349% | -28.599% to +2.870% |
| JSC sequence: 6 corrected cases × 32 contexts | -10.366% to +6.487% | -27.640% to +1.794% |
| Node cold: 10 cases / 240 processes | -0.220% to +0.489% | -0.215% to +7.293% |
| Node filled cache: 10 cases / 240 processes | +0.128% to +0.224% | -4.905% to +8.416% |

Existing scenarios require identical byte fingerprints and request counts, including static-to-timed upgrade behavior retained from 3.1.0. The corrected mixed Chinese/Latin fixture drops one unnecessary translation HTTP request to zero. Stale conversion-cache fixtures use zero HTTP in both versions; only the candidate omits the duplicate converted line. Service-detected Chinese fixtures use one cold request in both versions, while unit/native reopen checks confirm zero further HTTP with the identity cache.

Results contain both increases and decreases. In particular, some repeated-context conversion cases increase sampled JSC footprint even though cold cases decrease; the report makes no universal memory or speed claim. The new check adds bounded CPU work and reuses the existing translation cache. Raw per-case trials retain runtime hashes, request counts and exact original-passthrough assertions. Desktop allocator/JIT samples are not an iPhone Loon peak or VPN stability measurement.

## Switching and pressure

- Existing missing-lyrics churn: five candidate clients × JSON/protobuf, 240 different song IDs and 720 HTTP calls per process, same bytes as 3.1.0, maximum active HTTP one.
- Retained static-to-timed churn: five clients × two representations × two cache modes, 20 separate processes. Each handles 120 song IDs and 240 lyric responses including immediate cached reopen, 240 source calls total, zero calls on reopen and zero unfinished HTTP. Maximum active HTTP stays one.
- Standard cache maximum was 63944 serialized characters; compact maximum was 31874. Limits remain 64,000/32,000 characters and 128/64 entries.
- Pressure fixtures retain the established maximum two live invocations and one HTTP request under 60 arrivals at two-millisecond spacing and delayed callbacks. No admission timers; busy misses stay retryable.
- Node old-space is capped at 32 MiB for the harness, with explicit GC in churn cases. This is not a Loon memory limit. Egern completion is an awaited return rather than a native $done call.

## Reproduce

Use the pinned 3.1.0 runtime/source as a separate BASELINE directory. Build dependencies remain pinned by pnpm-lock.yaml; the only runtime data table is the existing licensed Unicode data.

```sh
pnpm install --frozen-lockfile
node build.mjs
python3 package.py
node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs
ruby validate-egern.rb
node jsc-fixtures.mjs
node jsc-cache-fixtures.mjs
node jsc-release-fixtures.mjs
node jsc-300-fixtures.mjs
node jsc-policy-fixtures.mjs
node conversion-fixtures.mjs
clang -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk -O2 -framework JavaScriptCore jsc-memory-runner.c -o jsc-memory-runner
python3 run-final-311.py "$(command -v node)" "$BASELINE"
```

The runner executes all measurements sequentially and aborts if any runtime hash changes. JSC has 24 cold cases and eight 32-context cases, six alternating trials per version, 384 fresh processes. Node first-load reports have 240 processes each. Data files: conversion-jsc-results.json, native-first-load-results.json, native-filled-first-load-results.json, native-churn-results.json, native-pressure-results.json and policy-native-churn-results.json. Final hashes are in bench-runtime-sha256.json and validation-summary.json.
