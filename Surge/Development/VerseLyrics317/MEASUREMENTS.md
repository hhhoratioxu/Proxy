# VerseLyrics 3.1.7 validation and measurements

Functional repair plus compiled native mocks and desktop Node/macOS JSC measurements. Not iPhone UI, every transient allocation, native network buffers or VPN acceptance. Cold time uses zero service latency; all regressions are retained.

## Functional scope

- 1892 automated tests pass, 151 new since 3.1.6; native Egern YAML validation passes.
- Ninety new native client/format test cases cover English/Chinese vocal suppression, joined/hidden formatting, French/Japanese/Korean short-word translation, warm caches, label changes, meaningful English/Chinese fragments and fallback source translations, including preserved language after static replacement.
- Chinese conversion-only guards remain. Eight previous Japanese/Korean-labelled mixed-row expectations now preserve foreign short-word eligibility under the requested language boundary; their Chinese text still stays literal.
- Old cache/source/official translations cannot bypass the filter. No global cache purge, extra cache, new native API or higher capacity/concurrency is required.

## First-load comparison

Six alternating fresh-process trials per case/version, 32 MiB Node old-space. One newly compiled native script/context per process. Both versions use the same codec and fixture responses. Empty and populated-cache tables each include seventeen cases and 204 processes; populated cases start with 48000-60000 unrelated cache characters. Output hashes and HTTP counts must agree in these unchanged ordinary cases. Sampled process heap includes the harness/compiler/code cache and is not every transient peak.

### native-first-load-results.json

| Scenario | Baseline ms | Candidate ms | Time change | Sampled heap change |
| --- | ---: | ---: | ---: | ---: |
| official-en-24 | 7.154 | 7.454 | +4.193% | +0.132% |
| fallback-en-24 | 8.829 | 9.181 | +3.987% | +0.136% |
| official-en-48 | 7.384 | 7.775 | +5.295% | +0.129% |
| fallback-en-48 | 9.326 | 9.654 | +3.517% | +0.133% |
| official-en-120 | 8.304 | 8.550 | +2.962% | +0.123% |
| fallback-en-120 | 10.397 | 10.639 | +2.328% | +0.238% |
| official-zh-48 | 7.557 | 7.833 | +3.652% | +0.167% |
| fallback-zh-48 | 9.254 | 9.737 | +5.219% | +0.167% |
| empty-fallback-en-48 | 9.947 | 10.054 | +1.076% | +0.126% |
| empty-fallback-zh-48 | 9.620 | 10.035 | +4.314% | +0.161% |
| official-chorus-120 | 7.437 | 7.701 | +3.550% | +0.204% |
| official-mixed-48 | 12.062 | 12.635 | +4.750% | +0.653% |
| official-pure-zh-48 | 4.726 | 4.925 | +4.211% | +0.091% |
| official-en-600 | 15.342 | 15.683 | +2.223% | +0.060% |
| official-zh-600 | 13.131 | 13.660 | +4.029% | +0.132% |
| official-pure-zh-600 | 6.349 | 6.391 | +0.662% | +0.082% |
| official-mixed-600 | 25.041 | 25.706 | +2.656% | -2.994% |

### native-filled-first-load-results.json

| Scenario | Baseline ms | Candidate ms | Time change | Sampled heap change |
| --- | ---: | ---: | ---: | ---: |
| official-en-24 | 7.864 | 7.796 | -0.865% | +0.116% |
| fallback-en-24 | 9.513 | 9.588 | +0.788% | +0.119% |
| official-en-48 | 8.061 | 8.292 | +2.866% | +0.115% |
| fallback-en-48 | 9.892 | 10.051 | +1.607% | +0.115% |
| official-en-120 | 8.966 | 9.048 | +0.915% | +0.108% |
| fallback-en-120 | 10.887 | 11.284 | +3.647% | +0.108% |
| official-zh-48 | 8.134 | 8.293 | +1.955% | +0.150% |
| fallback-zh-48 | 9.790 | 10.116 | +3.330% | +0.145% |
| empty-fallback-en-48 | 10.584 | 10.568 | -0.151% | +0.081% |
| empty-fallback-zh-48 | 10.391 | 10.667 | +2.656% | +0.144% |
| official-chorus-120 | 8.058 | 8.230 | +2.135% | +0.069% |
| official-mixed-48 | 12.713 | 13.178 | +3.658% | +0.505% |
| official-pure-zh-48 | 4.743 | 4.831 | +1.855% | +0.086% |
| official-en-600 | 13.827 | 14.192 | +2.640% | -0.021% |
| official-zh-600 | 13.854 | 14.551 | +5.031% | -0.214% |
| official-pure-zh-600 | 6.265 | 6.393 | +2.043% | +0.052% |
| official-mixed-600 | 25.841 | 26.338 | +1.923% | +1.147% |

## macOS JavaScriptCore

36 fresh macOS JSC processes, six alternating trials per case/version. Same codec/fixture/native host mocks; zero service latency. Ordinary and mixed unchanged cases require identical outputs. Candidate-only English/foreign vocal cases deliberately exercise repaired behavior on 600 rows. Includes harness/VM/JIT/native process overhead, not phone or VPN acceptance.

| Case | Version | Processing ms | Peak footprint bytes | Max RSS bytes | HTTP |
| --- | --- | ---: | ---: | ---: | ---: |
| official-48-protobuf | baseline | 9.088 | 7365256 | 12959744 | 1 |
| official-48-protobuf | candidate | 9.239 | 7422624 | 13017088 | 1 |
| mixed-cold-protobuf | baseline | 11.138 | 7815816 | 13434880 | 1 |
| mixed-cold-protobuf | candidate | 11.225 | 7881376 | 13484032 | 1 |
| vocal-english-600 | candidate | 10.790 | 8454768 | 13852672 | 0 |
| vocal-foreign-600 | candidate | 11.191 | 8209032 | 13778944 | 1 |

## Limits and repeated arrivals

- Twenty native client/format/cache-mode mixed playlists produce 4800 lyric responses. Warm cache reopen makes zero service requests; sampled active HTTP remains one.
- Sixteen arrival-pressure processes retain at most two live invocations, one active HTTP and zero admission timers in the fixture. Native storage admission remains advisory, not atomic; mock counts are not a phone concurrency guarantee.
- Sixty general native feature invocations retain static replacement on/off, source fallback, vocal filtering, mixed English, colors and cache limits.
- The candidate-only 600-row JSC vocal fixtures produce zero HTTP for English fillers and one batched request for three unique French short words, while removing official alternatives.
- Formerly skipped foreign words can now require translation by design, within the existing 64 original rows per batch, 6800 URL characters, 96 KiB reply and 2.5-second window. No extra retry or concurrency is added.

## Live short-word probe

Four actual public requests with self-written short words, no song lyrics/account data. Confirms current source-code query/array shape on this route, not native phone UI, future availability or catalog coverage. Filler no-request behavior is tested in compiled native mocks.

| Source | Self-written input | Current result |
| --- | --- | --- |
| ja | 手紙 | 信 |
| ja | ラララ | 拉拉拉 |
| ko | 나 | 我 |
| ko | 오 | 哦 |
| fr | la | 那里 |
| fr | oh | 哦 |
| pl | na | 在 |

These responses confirm current request shape and outputs for these words only. They do not validate a full song, all future language detection, catalog coverage or phone rendering. The public endpoint is separate from paid Google Cloud Translation and has no claimed official contract.

## Interpretation and reproduction

This release repairs classification. No universal speed or memory gain is asserted; all first-load and JSC regressions remain above. Runtime bytes and hashes are in runtime-manifest.json, and every comparison step checks that neither side changes. Full raw trials accompany the tables. First-load processing excludes real network wait. Existing cache, body, serial request and timeout limits are unchanged.

Use README.md reproduction commands with unchanged 3.1.6 runtimes. Live probes use only self-written words. iPhone host response buffers, Spotify UI and VPN stability remain unmeasured.
