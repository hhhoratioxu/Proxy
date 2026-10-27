# VerseLyrics 3.2.0 validation and measurements

The user report is a VPN disconnect after swiping away and reopening Spotify. The reproduced code issue is unnecessary asynchronous completion of local native entry handlers. These measurements validate that change, not the cause of the actual phone disconnect. No device crash record, iPhone scheduler trace or physical VPN acceptance was obtained.

## Functional verification

- 2,181 tests pass: all previous 2,097 plus 84 compiled native startup cases. Native local entry work finishes once in the current evaluation; useful metadata/config/card/context/Connect rewrites are retained. Declared/actual body limits, UTF-8/type checks and disabled/unknown/error passthrough are tested.
- Source/translation network work still waits for its actual callbacks. Six sources, bilingual artist matching, mixed Chinese/English, script-only Chinese filtering, vocal-language rules, native colors/timing and static replacement settings remain.
- Egern retains asynchronous native Response/stream reads; the synchronous entry path is for Loon, Surge, Shadowrocket and Quantumult X. No extra request, timer, queue, lease key, capacity or host API.

## Relaunch burst model

96 fresh 64 MiB old-space Node processes: six alternating trials per version, four native clients, empty or 48000–60000-character populated cache. Each dispatches 72 compiled entry contexts in one JS turn before a microtask drain, with nine supported routes and 12/40/90 KiB synthetic bodies. Input ownership is released when done is called. Every output body hash matches the baseline. This adverse same-turn scheduling is explicit harness behavior, not a recording of Loon scheduling. Heap/RSS includes Node/compiler/harness and does not capture every transient or native allocation.

| Client | Cache | Version | Batch ms | Sampled heap growth bytes | Sampled RSS bytes | Peak live entries | Pending after dispatch | Peak owned input bytes |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Loon | empty | baseline | 150.409 | 16286472 | 111755264 | 72 | 72 | 3497712 |
| Loon | empty | candidate | 153.197 | 6026792 | 88686592 | 1 | 0 | 92325 |
| Loon | populated | baseline | 151.546 | 15145776 | 111919104 | 72 | 72 | 3497712 |
| Loon | populated | candidate | 153.577 | 7559144 | 97058816 | 1 | 0 | 92325 |
| Surge | empty | baseline | 152.344 | 15335920 | 113000448 | 72 | 72 | 3497712 |
| Surge | empty | candidate | 152.185 | 6027208 | 86982656 | 1 | 0 | 92325 |
| Surge | populated | baseline | 152.971 | 14669000 | 115671040 | 72 | 72 | 3497712 |
| Surge | populated | candidate | 153.265 | 7557640 | 96567296 | 1 | 0 | 92325 |
| Shadowrocket | empty | baseline | 150.039 | 15617104 | 112377856 | 72 | 72 | 3497712 |
| Shadowrocket | empty | candidate | 151.458 | 6026912 | 87916544 | 1 | 0 | 92325 |
| Shadowrocket | populated | baseline | 151.344 | 15691000 | 113295360 | 72 | 72 | 3497712 |
| Shadowrocket | populated | candidate | 152.714 | 7557632 | 95485952 | 1 | 0 | 92325 |
| QuantumultX | empty | baseline | 150.505 | 15640896 | 112017408 | 72 | 72 | 3497712 |
| QuantumultX | empty | candidate | 151.252 | 7458848 | 92880896 | 1 | 0 | 92325 |
| QuantumultX | populated | baseline | 151.361 | 15220744 | 112492544 | 72 | 72 | 3497712 |
| QuantumultX | populated | candidate | 152.010 | 8003960 | 95338496 | 1 | 0 | 92325 |

The scheduler-independent functional change is synchronous completion. Live-entry/body counts depend on the scheduler. All batch-time regressions above are retained; this release does not claim that every startup or lyric load is faster.

## macOS JavaScriptCore entry checks

48 fresh processes: six alternating trials per version for four identical entry fixtures. A marker appended inside the same evaluation checks whether done ran before the evaluation tail. Baseline is asynchronous; candidate is synchronous, with identical rewritten bytes. Footprint and RSS include fixtures, JIT and whole-process overhead. Some footprint/RSS cases can increase; these samples do not establish iPhone or VPN memory.

| Case | Version | ms | Sampled footprint bytes | Max RSS bytes | Synchronous completion |
| --- | --- | ---: | ---: | ---: | --- |
| metadata | baseline | 7.671 | 6988400 | 12320768 | False |
| metadata | candidate | 7.068 | 6972052 | 12288000 | True |
| extended | baseline | 19.017 | 13509268 | 23330816 | False |
| extended | candidate | 18.409 | 13427336 | 23216128 | True |
| bootstrap | baseline | 12.021 | 8110740 | 16244736 | False |
| bootstrap | candidate | 11.349 | 8086152 | 16228352 | True |
| context-json | baseline | 38.855 | 13337236 | 22372352 | False |
| context-json | candidate | 37.668 | 13312648 | 22355968 | True |

## Lyric first-load regression comparisons

Each table uses 204 fresh Node processes (six alternating trials per version/scenario), one compiled Loon lyric script/VM per process and 32 MiB old-space. Same body hashes and HTTP counts; zero network latency. Populated runs start with 48000–60000 unrelated cache characters. Sampling includes compiler/harness overhead rather than every allocation. These checks cover the retained lyric functionality; the cold-start optimization is in the entry script.

### Empty cache

| Case | Baseline ms | Candidate ms | Sampled heap delta bytes |
| --- | ---: | ---: | ---: |
| official-en-24 | 7.459 | 7.838 | +1072 |
| fallback-en-24 | 9.793 | 9.652 | -96 |
| official-en-48 | 8.126 | 8.028 | -48 |
| fallback-en-48 | 9.889 | 10.203 | +24 |
| official-en-120 | 9.095 | 8.862 | -112 |
| fallback-en-120 | 11.082 | 11.095 | -13312 |
| official-zh-48 | 8.316 | 7.906 | -16 |
| fallback-zh-48 | 9.880 | 9.513 | +8096 |
| empty-fallback-en-48 | 10.709 | 10.596 | -39232 |
| empty-fallback-zh-48 | 10.385 | 10.353 | -24448 |
| official-chorus-120 | 8.168 | 8.019 | +160 |
| official-mixed-48 | 13.151 | 13.468 | +48 |
| official-pure-zh-48 | 5.310 | 5.247 | -48 |
| official-en-600 | 16.396 | 16.196 | +108144 |
| official-zh-600 | 13.819 | 13.904 | +10584 |
| official-pure-zh-600 | 6.815 | 6.639 | +400 |
| official-mixed-600 | 26.013 | 25.883 | -31880 |

### Populated cache

| Case | Baseline ms | Candidate ms | Sampled heap delta bytes |
| --- | ---: | ---: | ---: |
| official-en-24 | 8.438 | 8.618 | +88 |
| fallback-en-24 | 10.078 | 10.145 | +24 |
| official-en-48 | 8.449 | 8.693 | +16 |
| fallback-en-48 | 10.076 | 10.646 | +120 |
| official-en-120 | 9.465 | 9.766 | +16 |
| fallback-en-120 | 11.705 | 11.554 | +368 |
| official-zh-48 | 8.824 | 8.586 | -2408 |
| fallback-zh-48 | 10.184 | 10.381 | +16 |
| empty-fallback-en-48 | 10.865 | 11.362 | -728 |
| empty-fallback-zh-48 | 10.814 | 11.086 | +24 |
| official-chorus-120 | 8.639 | 9.008 | -120 |
| official-mixed-48 | 13.723 | 13.952 | +48 |
| official-pure-zh-48 | 5.391 | 5.507 | +96 |
| official-en-600 | 14.581 | 14.421 | -64744 |
| official-zh-600 | 14.479 | 14.467 | -28432 |
| official-pure-zh-600 | 6.678 | 6.473 | +288 |
| official-mixed-600 | 26.889 | 26.503 | -32968 |

## Bounds and retained behavior

- Loon entry runtime: 30643 to 29689 bytes. The core readers, rewritten fields, declared and actual limits remain. The unused asynchronous native entry arrayBuffer wrapper is removed.
- Twenty native playlists complete 4,800 mixed lyric responses; warm reopen HTTP is 0, active HTTP peaks at 1 and is 0 after completion. Standard/compact capacities are checked on every response.
- Sixteen network-pressure processes retain at most 2 live mock lyric invocations, 1 active HTTP and 0 admission timers. This remains advisory native storage rather than a device-wide atomic lock.
- General features include 60 compiled native invocations. Actual lyric transport remains asynchronous and must settle before completion.
- Limits remain: 256 KiB lyric body, 128 KiB entry body, 96 KiB service reply, 600 lyric rows, 12 source requests and 256 KiB cumulative source bytes; 64 original rows/6800 URL characters per translation batch and a 2.5-second translation window. Standard cache 128 entries/64000 characters; compact 64/32000.
- Native HTTP/decompression buffers and the OS VPN process are outside these script-only measurements. No universal memory ceiling or zero-disconnect guarantee is claimed.

## Reproduce

Use the exact lockfile, node build.mjs, python3 package.py RUNTIME_COMMIT 2181, node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs and ruby validate-egern.rb. Run python3 run-measurements-320.py NODE BASELINE_319_SOURCE, then python3 summarize-320.py. Baseline immutable source/runtime commit: 6392d31a69b9c6f5044827d24055ac4dd6222319, source prefix Surge/Development/VerseLyrics319. Runtime hashes are frozen before and after each measurement step.
