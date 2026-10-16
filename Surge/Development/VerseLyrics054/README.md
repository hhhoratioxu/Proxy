# VerseLyrics 0.5.4

歌曲元数据改为扫描所需字段，缓存与补词查询不再展开音频文件等无关字段。只有真正改写有词标记时才构建字段列表；批量响应保留这种按需行为。保持原有缓存容量、网络并发和查询预算。

This release follows 0.5.3. The five native imports are built from the same core. No host API, concurrent HTTP slot, polling queue, prefetch, or diagnostic notification is added. Original lyrics, timestamps and complete plugin-owned translation replacement remain. The source/runtime commit is immutable; the following production commit updates the existing five import URLs and documentation only.

## Validation

964 automated tests pass. Native harnesses execute the packaged Loon, Egern, Surge, Shadowrocket and Quantumult X scripts. Test fixtures contain original synthetic lyrics and fake test credentials only. These tests do not establish native iPhone behavior or Loon VPN stability. Loon persistent storage has no atomic compare-and-swap; native transport/body buffers are outside JavaScript memory accounting. A busy uncached request can still remain unchanged until a later Spotify request; no automatic retry is scheduled.

```sh
node build.mjs
python3 package.py <runtime-commit-sha> 964
node --test --test-reporter=tap core/test/*.test.mjs *.test.mjs
ruby validate-egern.rb
```

Node and pinned Terser 5.51.2 are build-time dependencies. See CLIENT-CONTRACTS.md for client API references. Loon HTTP completion occurs before the single done callback; no unsupported Loon engine, max-size or cancellation parameter is used. The single sequential network lane, 12 source requests / 256 KiB combined source response budget, 96 KiB service-response limit and 256 KiB lyric-input limit remain.

## Actual changes in this series

- 0.5.4: selective track metadata decoding with lazy edit fields; large audio/catalog fields stay opaque. No cache growth. A separate cache-scanning experiment was rejected because it increased latency.

Source preference changes search order only and never bypasses identity/version checks. No source can provide songs it does not hold, and client lyric entry requests remain required.

## Measurements and evidence boundaries

`jsc-memory-results.json` compares the immutable local 0.5.3 baseline with this version using six fresh macOS JavaScriptCore processes per case, 39 cold cases and six repeated-load cases. Runtime SHA-256 is recorded per trial. All output byte fingerprints, lengths and HTTP counts match. Whole-process physical-footprint samples include the engine/harness, exclude iOS Network Extension and native network buffers, and do not capture every individual allocation. Mock HTTP has zero latency. All trials are retained, including regressions and noise.

```sh
clang -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk -framework JavaScriptCore -O2 jsc-memory-runner.c -o jsc-memory-runner
node jsc-fixtures.mjs
python3 jsc-memory-bench.py /path/to/unchanged-0.5.3
```

- metadata-1000: sampled process footprint 9.423 -> 9.008 MiB; zero-latency whole-run time 19.395 -> 18.823 ms.

`metadata-results.json` is a separate eight-process Node microbenchmark of forty retained metadata results, not the whole-client peak; `node --expose-gc metadata-bench.mjs /path/to/unchanged-0.5.3` reproduces it.

The Unicode Unihan license is retained in NOTICE-UNICODE.txt and all applicable runtime files. No runtime JavaScript dependency is downloaded beyond the pinned plugin scripts.
