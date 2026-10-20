# VerseLyrics 3.1.8 validation and measurements

Functional translation recovery with bounded retries. Desktop compiled-host mocks and macOS JavaScriptCore are not the Loon/iPhone VPN process. All common-path regressions and the extra cost of newly working translation paths are retained below. Network-free tables exclude service latency.

## Confirmed repair scope

- 1,990 automated tests pass, including 98 added cases (60 compiled native client/format cases). Fourteen older expectations were updated for the deliberate per-row retention policy; exact result counts and original alignment remain mandatory.
- In the same readable-core harness, stale Korean/English identity caches yield 0 translations / 0 requests on 3.1.7, and 3 translations / 1 request on 3.1.8; warm reopen uses 0 requests. A correctly sized reply containing one null row changes from 0 translations to 2 valid translations without shifting positions.
- Original-as-translation and individually invalid aligned answers get a 30-second row retry time in the existing bounded translation record. Successful rows stay cached. Retry requires a later lyric request; no background timer, queue, parallel task or higher timeout is introduced.
- Six sources, official static-to-timed replacement switch, native words/timestamps/colors, meaningful mixed English, Chinese conversion guards and vocal-language rules remain.

## Reported track and evidence boundary

Spotify public embed metadata confirms Girl's Day – Come Slowly, track 6n7jFn3rgC6qWjsYaPJfB8, duration 249213 ms. No protected Spotify lyric response or user cache was captured; the anonymous embed session lyrics probe returned HTTP 400. The reproduced failure states and live translator probes use self-written Korean/English rows. They establish the repaired paths, not the exact cause of the user's phone instance or full-song UI acceptance. No account credentials or real song lyrics are published.

## First-load comparisons

Each table uses 204 fresh Node processes (six alternating trials per version/scenario), one newly compiled Loon script/VM per process, and 32 MiB old-space. Output hashes and HTTP counts match on these unchanged ordinary cases. Populated runs start with 48000–60000 unrelated cache characters. Samples include harness/compiler/code-cache overhead and do not capture every transient/native allocation.

### Empty cache

| Scenario | Baseline ms | Candidate ms | Time change | Sampled heap change |
| --- | ---: | ---: | ---: | ---: |
| official-en-24 | 7.239 | 7.227 | -0.166% | +0.174% |
| fallback-en-24 | 8.763 | 8.674 | -1.016% | +3.036% |
| official-en-48 | 7.509 | 7.570 | +0.812% | +0.184% |
| fallback-en-48 | 9.236 | 9.407 | +1.851% | +0.163% |
| official-en-120 | 8.327 | 8.416 | +1.069% | +0.185% |
| fallback-en-120 | 10.637 | 10.592 | -0.423% | +1.188% |
| official-zh-48 | 7.679 | 7.704 | +0.326% | +0.176% |
| fallback-zh-48 | 9.489 | 9.103 | -4.068% | +0.227% |
| empty-fallback-en-48 | 9.831 | 10.091 | +2.645% | +0.170% |
| empty-fallback-zh-48 | 9.649 | 9.515 | -1.389% | +0.169% |
| official-chorus-120 | 7.400 | 7.596 | +2.649% | +0.186% |
| official-mixed-48 | 12.418 | 12.497 | +0.636% | +0.112% |
| official-pure-zh-48 | 4.894 | 4.923 | +0.593% | +0.053% |
| official-en-600 | 15.007 | 14.952 | -0.366% | +1.697% |
| official-zh-600 | 13.196 | 13.627 | +3.266% | +0.126% |
| official-pure-zh-600 | 6.155 | 6.203 | +0.780% | +0.221% |
| official-mixed-600 | 25.480 | 24.995 | -1.903% | +0.256% |

### Populated cache

| Scenario | Baseline ms | Candidate ms | Time change | Sampled heap change |
| --- | ---: | ---: | ---: | ---: |
| official-en-24 | 7.687 | 7.731 | +0.572% | +0.143% |
| fallback-en-24 | 9.166 | 9.140 | -0.284% | +0.150% |
| official-en-48 | 7.957 | 7.981 | +0.302% | +0.155% |
| fallback-en-48 | 9.636 | 9.631 | -0.052% | +0.156% |
| official-en-120 | 8.878 | 9.183 | +3.435% | +0.135% |
| fallback-en-120 | 10.807 | 10.593 | -1.980% | +0.131% |
| official-zh-48 | 8.132 | 8.153 | +0.258% | +0.158% |
| fallback-zh-48 | 9.683 | 9.664 | -0.196% | +0.153% |
| empty-fallback-en-48 | 10.664 | 10.423 | -2.260% | +0.137% |
| empty-fallback-zh-48 | 10.225 | 10.549 | +3.169% | +0.151% |
| official-chorus-120 | 8.104 | 7.897 | -2.554% | +0.052% |
| official-mixed-48 | 12.928 | 13.137 | +1.617% | +0.107% |
| official-pure-zh-48 | 4.822 | 4.842 | +0.415% | +0.050% |
| official-en-600 | 13.910 | 13.590 | -2.301% | +0.214% |
| official-zh-600 | 14.150 | 14.373 | +1.576% | -0.230% |
| official-pure-zh-600 | 6.172 | 6.164 | -0.130% | +0.057% |
| official-mixed-600 | 25.869 | 26.176 | +1.187% | +0.275% |

## macOS JavaScriptCore

48 fresh processes, six alternating trials per version/case. Same self-written Korean/English protobuf fixtures and zero-latency native HTTP mocks. Stale-cache and partial-result baseline cases deliberately fail to translate: candidate extra work is reported as extra work, not as a memory reduction. Footprint and RSS include harness, JIT and process overhead.

| Case | Version | Processing ms | Sampled peak footprint bytes | Max RSS bytes | HTTP | Translated rows |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| korean-cold-48 | baseline | 9.442 | 7152324 | 12533760 | 1 | 48 |
| korean-cold-48 | candidate | 8.925 | 7127736 | 12517376 | 1 | 48 |
| korean-stale-48 | baseline | 7.343 | 6865568 | 12058624 | 0 | 0 |
| korean-stale-48 | candidate | 8.938 | 7209656 | 12599296 | 1 | 48 |
| korean-partial-600 | baseline | 17.508 | 8749752 | 16818176 | 1 | 0 |
| korean-partial-600 | candidate | 19.021 | 8766136 | 17162240 | 1 | 550 |
| korean-identity-600 | baseline | 17.454 | 8790724 | 16891904 | 1 | 0 |
| korean-identity-600 | candidate | 17.539 | 8782520 | 16900096 | 1 | 0 |

## Repeated responses and limits

- Twenty native client/format/cache-mode playlists complete 4,800 lyric responses; warm reopen HTTP is 0, sampled active HTTP is at most 1, and no active HTTP remains at completion. Standard/compact bounds are checked on every response.
- Sixteen arrival-pressure processes retain at most 2 live mock invocations, 1 active HTTP and 0 admission timers. Callback work is settled before completion; native synchronous storage remains advisory, not an atomic device-wide semaphore.
- General native feature fixtures retain source fallback, static replacement on/off, mixed text, vocal filtering and colors.
- Limits remain: 256 KiB lyric input, 128 KiB entry input, 96 KiB service reply, 600 lyric rows, 64 original rows/batch, 6800 URL characters and 2.5 seconds for translation; standard cache 128 entries/64000 characters, compact 64/32000; existing per-entry bounds remain.
- Ordinary first-load sampled heap changes are mostly small increases and some timings regress. Repairing formerly untranslated paths requires translation work. This release makes no universal speed/RAM reduction or VPN-stability claim.

## Actual public translator requests

The compiled Loon host mock sent self-written Korean/English sentences to the existing public translate.googleapis.com route. Both target languages returned 4/4 nonempty translations in 1 cold request; warm reopen was 0 requests. The route is separate from paid Google Cloud Translation and has no claimed official availability contract.
- zh-CN: cold elapsed 0.542 seconds including the host mock; transport 0.528 seconds; original rows preserved.
- zh-TW: cold elapsed 1.464 seconds including the host mock; transport 1.458 seconds; original rows preserved.

## Reproduction

Install the exact dependencies from pnpm-lock.yaml. Build with node build.mjs, package with python3 package.py RUNTIME_COMMIT 1990, and run node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs. Use reproduce-recovery.mjs BASELINE_317_SOURCE and run-measurements-318.py NODE BASELINE_317_SOURCE; the immutable baseline source/runtime is commit 898570540494794a4fc7efa0f97037b6049fd590. Hashes are frozen before/after every measurement step in bench-runtime-sha256.json. Full raw trials accompany these tables.
