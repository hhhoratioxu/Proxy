# VerseLyrics 0.6.0

翻译只准备当前要发送的一批，网络忙碌时不再提前编码后续请求；移除全量分组和译文中间数组。保留重复句合并、64 行批次上限、失败后一次降为 32 行、原有超时及响应大小限制。

This release follows 0.5.4. The five native imports are built from the same core. No host API, concurrent HTTP slot, polling queue, prefetch, or diagnostic notification is added. Original lyrics, timestamps and complete plugin-owned translation replacement remain. The source/runtime commit is immutable; the following production commit updates the existing five import URLs and documentation only.

## Validation

966 automated tests pass. Native harnesses execute the packaged Loon, Egern, Surge, Shadowrocket and Quantumult X scripts. Test fixtures contain original synthetic lyrics and fake test credentials only. These tests do not establish native iPhone behavior or Loon VPN stability. Loon persistent storage has no atomic compare-and-swap; native transport/body buffers are outside JavaScript memory accounting. A busy uncached request can still remain unchanged until a later Spotify request; no automatic retry is scheduled.

```sh
node build.mjs
python3 package.py <runtime-commit-sha> 966
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
```

Node and pinned Terser 5.51.2 are build-time dependencies. See CLIENT-CONTRACTS.md for client API references. Loon HTTP completion occurs before the single done callback; no unsupported Loon engine, max-size or cancellation parameter is used. The single sequential network lane, 12 source requests / 256 KiB combined source response budget, 96 KiB service-response limit and 256 KiB lyric-input limit remain.

## Actual changes in this series

- 0.5.4: selective track metadata decoding with lazy edit fields; large audio/catalog fields stay opaque. No cache growth. A separate cache-scanning experiment was rejected because it increased latency.
- 0.6.0: on-demand translation batch construction; no eager nested batch list, no second translated-values array. The 64-row / 6800-character URL bounds and one downgrade to 32 rows remain.

Source preference changes search order only and never bypasses identity/version checks. No source can provide songs it does not hold, and client lyric entry requests remain required.

## Measurements and evidence boundaries

`jsc-memory-results.json` compares the immutable local 0.5.4 baseline with this version using six fresh macOS JavaScriptCore processes per case, 39 cold cases and six repeated-load cases. Runtime SHA-256 is recorded per trial. All output byte fingerprints, lengths and HTTP counts match. Whole-process physical-footprint samples include the engine/harness, exclude iOS Network Extension and native network buffers, and do not capture every individual allocation. Mock HTTP has zero latency. All trials are retained, including regressions and noise.

```sh
clang -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk -framework JavaScriptCore -O2 jsc-memory-runner.c -o jsc-memory-runner
node jsc-fixtures.mjs
python3 jsc-memory-bench.py /path/to/unchanged-0.5.4
```

- official-48-json: sampled process footprint 6.704 -> 6.657 MiB; zero-latency whole-run time 9.630 -> 9.213 ms.
- official-48-protobuf: sampled process footprint 6.626 -> 6.571 MiB; zero-latency whole-run time 8.575 -> 8.245 ms.
- official-120-protobuf: sampled process footprint 6.922 -> 6.922 MiB; zero-latency whole-run time 9.974 -> 9.719 ms.

The Unicode Unihan license is retained in NOTICE-UNICODE.txt and all applicable runtime files. No runtime JavaScript dependency is downloaded beyond the pinned plugin scripts.
