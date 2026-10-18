# VerseLyrics 3.0.0 measurement record

Baseline: unchanged 1.0.0, verified against its immutable manifest. All benchmark words are synthetic and HTTP is mocked. These measurements do not establish iPhone native buffering, source latency, Spotify UI acceptance or VPN stability.

## Final bytes and functional checks

1,148 automated tests pass. The sequential wrapper verified all fifteen final runtime hashes before and after every completed phase. No runtime was rebuilt during this final matrix. A tokenizer proposal was rejected during development for slower cache saves; the final cache serializer is the 1.0.0 implementation. The churn harness was corrected to avoid trying to load the removed, unconfigured Loon request script; both versions already use Rewrite and have the same two invocations per track.

## Functional source progression

In source-progress-results.json, the initial explicit search makes seven requests in both versions. One source is transiently unavailable; five other sources return verified no-match results. After the existing server cooldown, an explicit retry makes five requests in 1.0.0 and two in 3.0.0, with the same packed-lyric SHA256. No real-latency speedup is claimed. The per-source proofs add 522 cache characters in this fixture, within the same cache cap. The optimization applies to auto source mode; a fixed source keeps its existing whole-search cache without redundant per-source records.

Five compiled adapters and both formats separately test cache-only: warm fallback and plugin translations remain, cold uncached fallback stays missing, cached official translations replace Spotify alternatives, missing palette cache does not become a false failure, and all cases make zero plugin HTTP. Returning online resumes uncached translation.

## macOS JavaScriptCore

59 cold scenarios plus six repeated-context scenarios, eight alternating fresh-process trials per version/scenario, 1040 processes total. Repeated cases contain 32 distinct context groups and no forced GC. All compared output fingerprints and HTTP counts match. Samples include harness, engine and allocator at execution/callback/completion boundaries.

Sampled peak median changes range from -2.20% to +3.47%. This is a mixed result, not a universal first-load memory reduction. The following cases exceed the older 3% engineering comparison threshold (which is not a documented Loon memory limit):

- cold / official-48-json: +3.24%
- cold / entry-context-1: +3.47%

| Scenario | 1.0.0 footprint | 3.0.0 footprint | 1.0.0 time | 3.0.0 time |
| --- | ---: | ---: | ---: | ---: |
| official-24-protobuf | 6.680 MiB | 6.829 MiB | 8.336 ms | 8.416 ms |
| official-48-json | 6.743 MiB | 6.962 MiB | 10.206 ms | 9.315 ms |
| entry-context-1 | 5.407 MiB | 5.594 MiB | 5.482 ms | 5.886 ms |
| metadata-1000 | 9.360 MiB | 9.532 MiB | 19.639 ms | 19.674 ms |
| official-48-unrelated-save | 8.212 MiB | 8.337 MiB | 10.842 ms | 11.119 ms |
| fallback-48-unrelated-save | 8.610 MiB | 8.626 MiB | 13.127 ms | 13.524 ms |
| official-120-unrelated-save | 8.407 MiB | 8.532 MiB | 12.274 ms | 12.664 ms |
| fallback-120-unrelated-save | 8.766 MiB | 8.774 MiB | 14.145 ms | 14.665 ms |

## Node cold loads and switching

Twelve independent 32 MiB old-space processes per version for each of ten cold scenarios; GC before each invocation. Populated cases contain 48,000–60,000 unrelated cache characters. Native request counts and output hashes match. This Node old-space setting is a harness parameter, not a Loon limit.

- native-first-load-results.json: sampled heap median changes -4.696% to +0.267%.
- native-filled-first-load-results.json: sampled heap median changes +0.120% to +0.195%.

Ordinary first-load and populated-cache results remain broadly similar; no across-the-board reduction is established. Churn uses ten candidate/client/format cases plus two baseline Loon cases, each with 240 tracks, 720 HTTP, one maximum active HTTP, and a cache below 64,000 characters. Explicit GC every six changes bounds this harness; it does not model an iPhone process lifetime.

| Loon format | 1.0.0 elapsed | 3.0.0 elapsed | 1.0.0 sampled heap | 3.0.0 sampled heap |
| --- | ---: | ---: | ---: | ---: |
| json | 891 ms | 889 ms | 20795392 bytes | 20795744 bytes |
| protobuf | 880 ms | 924 ms | 20833608 bytes | 20805992 bytes |

Loon completes all 480 invocations and uses no timers; Egern returns awaited values and therefore does not call $done. Other hosts also verify every completion. Both burst versions peak at two unfinished invocations and one HTTP with no admission timers; same-track work is retained, different-track retired work stops, and a later settled-track retry translates successfully. No stronger concurrency bound or automatic retry is claimed. Compact-mode data remains in compact-first-load-results.json; smaller cache capacity does not guarantee lower first-invocation native memory.

## Bundle sizes

| Resource | 1.0.0 | 3.0.0 |
| --- | ---: | ---: |
| Loon/script/SpotifyLyrics.js | 94009 bytes | 95303 bytes |
| Loon/script/SpotifyLyrics.Entry.js | 31441 bytes | 30358 bytes |

The entry script shrinks while the lyric script grows to carry new behavior. Removing the unused Loon request resource reduces distributed artifacts; it does not remove an invocation from the already-Rewrite-based 1.0.0 configuration. See README.md for reproduction and CLIENT-CONTRACTS.md for API evidence.
