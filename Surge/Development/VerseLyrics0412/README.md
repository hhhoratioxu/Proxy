# VerseLyrics 0.4.12 — bounded batching and lower-allocation native lyrics

This release reduces work in the native Protobuf path and removes an extra translation round trip for eligible short-line songs. All six fallback sources, recording-match rules, plugin translation replacement, original timestamps and the 0.4.10 highlight correction remain. Native host adapter 9 and the five client configurations retain their existing APIs and hooks.

## Implementation

- Fallback Protobuf encoding measures UTF-8 strings and message lengths first, then writes one exact output buffer. A compact numeric plan replaces per-line byte arrays and nested message copies. Official translation replacement uses the same contiguous writer for its alternative block; unknown fields and original lyric/timing bytes remain untouched.
- The wire scanner validates line messages without materializing a field-object tree for every lyric line. Invalid wire types, duplicate word fields, invalid UTF-8, oversized output and unsafe timestamp integers still fail closed.
- Short translations can use up to 64 unique lines per request while retaining the 6,800-character encoded URL ceiling, 96 KiB response limit and 2.5-second total translation budget. A rejected wide batch downgrades remaining groups once to the previous 32-line ceiling. Timeouts, authentication failures and rate limits are not retried. No parallel translation request or background worker is added.
- Indexed-cache reads scan keys on the existing string and reuse measured record sizes instead of slicing large prefixes and serializing lyric objects again. The stored format, key, TTL and 128-entry / 64,000-character cap are unchanged.
- Source candidate matching normalizes target title, album, artists and duration once per candidate set, preserving exact/equivalent recording checks.

The Loon lyric script grows from 90,814 to 92,820 bytes to contain the new writer and downgrade handling; its entry script is 28,061 bytes. Loon retains native request-header rewrites and two response hooks. Short cold-start processing is essentially unchanged; this release trades a small code increase for fewer temporary allocations and fewer service requests where batching applies. It does not claim every cold-start heap sample improves.

Lyric/entry input limits remain 256/128 KiB; source responses 96 KiB and source-chain traffic twelve requests / 256 KiB. The source set, timeouts, cache capacity, advisory two-active-task admission and newest-waiter handling are unchanged. Old caches remain readable without deletion. These limits do not cap a complete VPN process or native HTTP buffering. See [client contracts](CLIENT-CONTRACTS.md).

## Reproduce

Use Node.js 24, pnpm, Python 3 and Ruby:

```sh
pnpm install --frozen-lockfile --ignore-scripts
node build.mjs
python3 package.py 0000000000000000000000000000000000000000 703
node --test core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
node wire-bench.mjs /path/to/unchanged/0.4.11/core/spotify-lyrics.js
node cache-scope-bench.mjs /path/to/unchanged/0.4.11/core/spotify-lyrics.js
node native-startup-bench.mjs /path/to/unchanged/0.4.11
node native-playlist-bench.mjs /path/to/unchanged/0.4.11
node live-translation-batch.mjs
node live-public-flow.mjs
```

The zero hash is a configuration-test placeholder. Publication replaces it with the immutable runtime commit. base.json holds the twelve baseline public files; only those twelve import/documentation files change on main. Source/runtime files remain reachable through the pinned runtime commit.

## Evidence

703 automated tests passed without failures or skips. Egern YAML validation also passed. New coverage includes an independent Buffer/BigInt wire oracle across 0–600 rows, both sync modes, two alternatives, Unicode and large timestamps; unknown-field preservation; malformed line rejection; exact buffer-constructor counts; indexed-cache size reuse; candidate normalization; wide-batch rejection and rate-limit handling. Forty compiled five-client overlap cases cover short and 48-line official/fallback songs in JSON and Protobuf. Other source, native API, cache, color, timeout and burst-drain tests remain.

All benchmarks below are local Node 24 arm64 simulations with mocked native APIs, separate 32 MiB old-space processes and explicit GC. They are not phone, real network or VPN-process measurements. Full byte hashes match the previous release for each native playlist format.

| Measurement | 0.4.11 | 0.4.12 |
| --- | ---: | ---: |
| Explicit typed-array constructions, one 120-line bilingual fallback encode | 1,841 | 2 |
| Requested bytes for those constructions | 59,518 | 9,546 |
| Final output bytes | 8,586 | 8,586 |
| 200 encode/parse cycles | 249.81 ms | 165.41 ms |
| Cache-view allocation delta, 32 views | 1,657,016 B | 1,323,128 B |
| Cache-view load time | 1.86 ms | 1.49 ms |
| Loon 120 Protobuf track changes | 245 ms | 223 ms |
| Loon sampled heap peak in that run | 16,355,168 B | 14,985,304 B |
| Loon 120 JSON track changes | 243 ms | 243 ms |

The two encoding allocations are one Uint8Array output plus a Uint32Array sizing plan. Constructor measurements exclude implicit engine views and other JS objects. Cache retained heap is essentially unchanged, and serialized cache size is identical. All five clients complete 120 changes in both formats, retaining lyrics, translations and colors with 36 HTTP requests for twelve cold songs and no additional requests on revisits.

The cold-start report includes 20 sessions per scenario. For 48 short lines, official lyric translation uses 20 versus 40 HTTP requests; fallback uses 40 versus 60 including the source requests. Mock-network processing medians remain around 4–6 ms, with some small regressions from the larger script. Sampled cold-start heap is 18,976,712 B versus 18,733,328 B. The first-load benefit is the eliminated service round trip, not a proven universal CPU or heap improvement. Reports retain all measurements.

An initial expanded cold-start harness exhausted the baseline's 32 MiB heap because successive fresh VMs ran in one microtask chain without draining completed callbacks. The final harness yields an event-loop turn between sessions before GC; both versions then complete at the same heap limit. This was a harness correction, not an application-memory fix. The separate continuous-playlist and contention tests remain unchanged in their lifecycle model.

Real endpoint checks on 2026-10-16:

- The existing public translation route accepted 64 synthetic original sentences in one HTTP 200 response, with all 64 translations retained and a 4,235-character URL.
- The compiled Egern module, starting from simulated native 404s and an empty cache, retrieved 42 synced lines for 那页夏天 and 49 translated lines for Blinding Lights. The latter used one translation request. Cached repeats used no HTTP.
- Never Gonna Give You Up did not produce a verified fallback match in that probe. Source coverage remains incomplete; no universal lyric availability is claimed.

Live reports retain counts, timing and endpoint status only, without lyrics, private account headers or page-session data. The public translation route is not an official paid Cloud Translation API contract; runtime downgrade handling remains necessary. Client/device behavior, including Egern's reported missing-lyrics issue, and iOS VPN stability remain unverified.
