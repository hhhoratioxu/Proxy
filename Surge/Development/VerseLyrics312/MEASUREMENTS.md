# VerseLyrics 3.1.2 measurements

**1515 automated tests pass, zero fail**; 158 added since 3.1.1. Egern native YAML validation passes. Baseline is the actually published 3.1.1 runtime/source commit 5f8e1b36cafe1fdf52b9a5100efea22ac4a6c52e. Adapter 14 is unchanged. Runtime SHA256 values are recorded in validation-summary.json and bench-runtime-sha256.json.

## Functional evidence

The locally executed 3.1.1 source skips all three reproduction cases: empty cache, old mixed identity pairs and old conversion pairs. Candidate 3.1.2 translates embedded English in each using one batch, retains pure Chinese and composes Chinese/punctuation literally. See regression-reproduction.json. Two live whole-row auto calls left four embedded English phrases unchanged; two forced-English experiments translated English but reworded Chinese and are not used. Two standalone fragment observations confirmed newline alignment. Finally two live calls through the actual candidate translator produced five mixed translations for each Chinese target; warm reopen made zero calls. The synthetic inputs and exact responses are retained in mixed-*-observations.json and mixed-live-results.json. They contain no account credentials, Spotify private traffic or copied song lyrics.

## macOS JavaScriptCore

360 fresh processes: six alternating trials per version/scenario, 20 cold cases and ten 32-context sequence cases. Public JavaScriptCore C API; sequence contexts/groups are released without forcing GC. Native HTTP mocks have zero latency and drain before completion. Unchanged case byte fingerprints and HTTP counts must match. Mixed cases intentionally do more work than the broken 3.1.1 skip: one query per original row, combined into one HTTP for the 48-row fixtures, including ten spans per row. No-op output is unchanged and uses the bounded checked marker.

| Mode | Cases | Peak footprint change | Total elapsed delta (ms) |
| --- | --- | --- | --- |
| cold unchanged | 12 | [-0.858, 0.921]% | [-1.861, 0.935] |
| cold mixed | 8 | [7.71, 12.845]% | [1.778, 6.138] |
| sequence unchanged | 2 | [-0.102, 0.687]% | [3.517, 5.147] |
| sequence mixed | 8 | [10.244, 13.667]% | [63.085, 180.135] |

These ranges are scenario medians across alternating process trials. Mixed cold work restores an actual translation HTTP and output composition that 3.1.1 omitted; it therefore consumes more CPU and memory than skipping translation. Sequence elapsed deltas cover 32 fresh contexts, not one lyric response. Footprint includes harness, code compilation, JIT and allocator effects; samples are not every allocation. This is not a universal speed or memory reduction.

## First invocation and filled caches

Ten unchanged Loon scenarios, twelve alternating fresh processes per version/scenario: 240 empty-cache processes and 240 populated-cache processes. Unrelated filled caches occupy 48,000-60,000 serialized characters. Each invocation compiles a fresh VM; 32 MiB V8 old-space is a harness setting, not a Loon memory limit. Output hashes and HTTP counts match 3.1.1.

| Mode | Peak sampled heap change | Elapsed median delta (ms) |
| --- | --- | --- |
| native-first-load-results.json | [-1.565, 0.613]% | [0.597, 1.493] |
| native-filled-first-load-results.json | [0.223, 0.543]% | [0.56, 1.212] |

## Continuous mixed-song changes and pressure

Twenty independent 32 MiB old-space Node processes cover five clients, JSON/protobuf and standard/compact cache. Each process handles 120 distinct song IDs with 24 original timed rows, alternates 80 translated and 40 no-op songs, seeds old identity/conversion pairs and immediately reopens each song. Total 4,800 fresh native responses completed, 2,400 translation HTTP calls, zero warm calls, zero unfinished HTTP and maximum one active HTTP per process. Native timing, original words, palette and per-format output SHA256 agree across clients and cache modes. GC runs every six songs; samples include harness and VM generations.
Maximum serialized cache: standard 63956 / 64,000 characters; compact 31978 / 32,000. Existing entry caps remain 128/64.

Sixteen separate Loon pressure trials compare same-song and distinct-song bursts of 60 arrivals at two-millisecond spacing, with 400 ms delayed HTTP callbacks. Maximum two live invocations, one active HTTP and zero admission timers. Callbacks drain and the settled-song retry retains translation. Synchronous storage mocks cannot prove atomic native admission or memory reclamation.

## Reproduction and boundary

Generate JSC fixtures as listed in README.md and compile jsc-memory-runner.c with the public macOS SDK and JavaScriptCore framework. Run `python3 run-final-312.py /path/to/node /path/to/311`; the driver snapshots every runtime and rejects changes between measurement steps. Source tests and Ruby YAML checks are separate commands in README.md.

macOS JSC footprint and Node heap measurements do not establish Loon/iOS native network-buffer usage, an OS process ceiling, real-phone load time or VPN stability. No iPhone import or VPN acceptance was performed. All work, cache, source request, response, URL, output and deadline bounds remain; restoring mixed translation necessarily differs from the previous no-op path.
