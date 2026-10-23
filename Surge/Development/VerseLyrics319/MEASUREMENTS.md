# VerseLyrics 3.1.9 validation and measurements

Repairing source matching for explicit bilingual artist labels. Desktop compiled-host mocks and macOS JavaScriptCore are not the Loon/iPhone VPN process. All regressions and extra work of newly working paths are retained below. Network-free tables exclude service latency.

## Confirmed repair

- 2,097 automated tests pass, including 107 added cases (60 compiled native client/format cases). All 1,990 prior cases remain; current negative-cache fixtures use revision 8 and older test import paths now read the canonical .lpx entry in a clean output directory.
- Real public Spotify metadata identifies KimYeji — Burn It Down, track 5gjHrjV4IhqPqoDHQUAriQ, at 213600 ms. The QQ search returns the same title, 김예지 (Kim Yeji), and 213 seconds. The exact same public replies yield no lyric document in 3.1.8 and 42 timed lines in 3.1.9.
- Matching is generic: no production track-ID or artist override, new provider, external name-translation query, embedded song lyrics or fabricated timeline. Full name alternatives must be explicitly present in one bilingual label. Collaborators, title, duration, album/version and relaxed-album uniqueness remain checked.
- Old negative ordinary/timed source records are invalidated by source revision 8; successful lyrics and translations remain reusable. No global purge, new timer, concurrent HTTP request, storage key or capacity increase.

## Actual public source requests

The compiled Loon host mock starts with empty storage and simulates an official HTTP 404. It really fetches public Spotify embed metadata and queries the existing sources. LRCLIB times out in its existing 1.6-second first-source allowance; QQ then returns the matching catalog entry and LRC. Four serialized transports including metadata, 42 timed lines, one completion, no pending transport, then zero HTTP on warm reopen with byte-identical output. The entire check including warm reopen took 3.310 seconds. Translation was disabled for this real-song source probe; self-written bilingual fixtures cover source fallback plus translation in all five compiled clients. No phone request or protected Spotify lyric response was captured. See live-source-results.json and target-track-reproduction.json.

## First-load comparisons

Each table uses 204 fresh Node processes (six alternating trials per version/scenario), one newly compiled Loon script/VM per process and 32 MiB old-space. Output hashes and request counts match on all unchanged ordinary cases. Populated runs start with 48000–60000 unrelated cache characters. Samples include harness/compiler/code-cache overhead and do not capture every transient/native allocation. Baseline is 3.1.8; candidate is 3.1.9.

### Empty cache

| Scenario | Baseline ms | Candidate ms | Time change | Sampled heap change (bytes) |
| --- | ---: | ---: | ---: | ---: |
| official-en-24 | 7.514 | 7.658 | +1.916% | +6216 |
| fallback-en-24 | 9.178 | 9.473 | +3.214% | -203824 |
| official-en-48 | 7.827 | 8.029 | +2.581% | +5808 |
| fallback-en-48 | 9.795 | 9.816 | +0.214% | +7992 |
| official-en-120 | 8.747 | 9.255 | +5.808% | +5992 |
| fallback-en-120 | 10.655 | 11.280 | +5.866% | +22632 |
| official-zh-48 | 7.813 | 8.151 | +4.326% | +6288 |
| fallback-zh-48 | 9.645 | 10.165 | +5.391% | +7696 |
| empty-fallback-en-48 | 10.249 | 10.728 | +4.674% | +7912 |
| empty-fallback-zh-48 | 9.978 | 10.712 | +7.356% | +7984 |
| official-chorus-120 | 7.730 | 8.117 | +5.006% | -222024 |
| official-mixed-48 | 12.883 | 12.966 | +0.644% | +5816 |
| official-pure-zh-48 | 4.904 | 5.345 | +8.993% | +6144 |
| official-en-600 | 15.937 | 16.334 | +2.491% | +11544 |
| official-zh-600 | 13.879 | 14.134 | +1.837% | +10400 |
| official-pure-zh-600 | 6.345 | 6.748 | +6.351% | +5816 |
| official-mixed-600 | 26.386 | 26.701 | +1.194% | +5368 |

### Populated cache

| Scenario | Baseline ms | Candidate ms | Time change | Sampled heap change (bytes) |
| --- | ---: | ---: | ---: | ---: |
| official-en-24 | 8.067 | 8.114 | +0.583% | +5752 |
| fallback-en-24 | 9.562 | 10.005 | +4.633% | +7960 |
| official-en-48 | 8.376 | 8.751 | +4.477% | +6128 |
| fallback-en-48 | 10.341 | 10.380 | +0.377% | +8432 |
| official-en-120 | 9.344 | 9.924 | +6.207% | +5824 |
| fallback-en-120 | 11.222 | 11.849 | +5.587% | +7488 |
| official-zh-48 | 8.258 | 8.802 | +6.588% | +6272 |
| fallback-zh-48 | 10.333 | 10.524 | +1.848% | +7992 |
| empty-fallback-en-48 | 10.736 | 11.010 | +2.552% | +7520 |
| empty-fallback-zh-48 | 10.601 | 11.082 | +4.537% | +7832 |
| official-chorus-120 | 8.146 | 8.441 | +3.621% | +6888 |
| official-mixed-48 | 13.270 | 13.611 | +2.570% | +6384 |
| official-pure-zh-48 | 4.949 | 5.211 | +5.294% | +6216 |
| official-en-600 | 14.146 | 14.582 | +3.082% | -6408 |
| official-zh-600 | 14.555 | 15.152 | +4.102% | +1936 |
| official-pure-zh-600 | 6.323 | 6.837 | +8.129% | +5840 |
| official-mixed-600 | 26.738 | 27.086 | +1.302% | +10536 |

## macOS JavaScriptCore

48 fresh processes, six alternating trials per version/case. Same self-written JSON lyrics, source translations, exact/bilingual catalog fixtures and zero-latency native HTTP mocks. Bilingual cold baseline cases deliberately miss lyrics: the new working lookup does more work and is not a memory reduction. Footprint and RSS include harness, JIT and process overhead.

| Case | Version | Processing ms | Sampled peak footprint bytes | Max RSS bytes | HTTP | Lyric rows |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| exact-artist-48 | baseline | 12.013 | 7209656 | 12599296 | 2 | 48 |
| exact-artist-48 | candidate | 12.086 | 7307960 | 12697600 | 2 | 48 |
| bilingual-artist-48 | baseline | 7.916 | 6644408 | 12034048 | 1 | 0 |
| bilingual-artist-48 | candidate | 12.347 | 7381688 | 12787712 | 2 | 48 |
| bilingual-artist-600 | baseline | 8.318 | 7602872 | 12959744 | 1 | 0 |
| bilingual-artist-600 | candidate | 38.637 | 9880272 | 15859712 | 2 | 600 |
| bilingual-warm-48 | baseline | 8.880 | 6718136 | 12107776 | 0 | 48 |
| bilingual-warm-48 | candidate | 8.847 | 6775480 | 12165120 | 0 | 48 |

## Repeated responses and limits

- Twenty native client/format/cache-mode playlists complete 4,800 lyric responses. Warm HTTP is 0; active HTTP peaks at 1 and is 0 after completion. Standard and compact capacities are checked on each response.
- Sixteen arrival-pressure processes retain at most 2 live mock invocations, 1 HTTP request and 0 admission timers. Native synchronous storage remains advisory rather than an atomic device-wide lock.
- The extra source identity code adds 1,091 bytes to the compiled Loon lyric runtime (91,869 to 92,960 bytes); the 30,643-byte Loon entry script is unchanged in size. It adds no provider lookup or runtime dependency. See runtime-manifest.json for exact measured bytes.
- Cold ordinary Node timings increase by 0.021–0.734 ms in this sample; sampled heap changes range from -222024 to +22632 bytes. Populated cases show 0.039–0.627 ms timing increases and -6408 to +10536 byte heap changes. These are samples, not guaranteed regressions/improvements on a phone.
- For the 48-row JSC exact-name case, sampled footprint rises by 98304 bytes; the restored bilingual path necessarily performs the lyric fetch that the failed baseline skipped. This release claims corrected coverage within existing bounds, not a universal speed/RAM reduction.
- Limits remain: 256 KiB lyric body; 128 KiB entry body; 96 KiB service reply; 600 rows; 12 source requests and 256 KiB cumulative source bytes; 64 original rows/translation batch, 6800 URL characters and 2.5-second translation window. Cache: standard 128 entries/64000 characters; compact 64/32000; existing per-entry limits.
- Translation, mixed Chinese/English, no Chinese script-only conversion, vocal-language handling, static replacement switch, original colors/timing and all six sources remain tested.
- No actual iPhone VPN or UI acceptance was performed. JavaScript checks cannot bound native HTTP/decompression buffers or promise the OS will never terminate a VPN extension.

## Reproduction

Use the exact pnpm lockfile, node build.mjs, python3 package.py RUNTIME_COMMIT 2097, node --test --test-reporter=tap *.test.mjs core/test/*.test.mjs and ruby validate-egern.rb. Run python3 run-measurements-319.py NODE BASELINE_318_SOURCE and python3 summarize-319.py BASELINE_318_SOURCE. The immutable baseline source/runtime commit is dce3a071f048bd3a58711dc0440aa10c8c0b5401, source prefix Surge/Development/VerseLyrics318. Source/runtime hashes are frozen before and after each measurement step.

For a fresh public lookup run node live-source-check.mjs. To reproduce the two-core comparison, python3 fetch-target-fixtures.py returns a local temporary directory; pass it to node reproduce-bilingual-source.mjs BASELINE_318_SOURCE FIXTURE_DIRECTORY. Provider results and network latency may change. Raw song lyrics and public embed session data are not included in this archive.
