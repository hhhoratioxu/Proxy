# Spotify relaunch retention evidence — 3.2.1

User report: swiping away Spotify and reopening it still disconnects the VPN after 3.2.0. The user suspects memory exhaustion. No phone crash/termination record is available; the exact OS termination cause is unverified.

The remaining reproduced issue is in lyric processing, not the already-synchronous entry bundle. In 3.2.0, await readBody and async translate/fallbackPalette/nativeMain defer even pure local paths. In the explicit same-JavaScript-turn test, 72 lyric invocations are dispatched before microtasks drain; all 72 initially remain unfinished. The 3.2.1 implementation finishes cached/blocked responses immediately, leaving only actual HTTP work pending.

Fixtures cover four native clients, official English lyrics and missing-lyric fallback, cold and cached data, and unrelated populated caches. Each run must preserve exact output body hashes, request counts, cache limits, original rows and timing. Callback completions are drained and no owner is released early. The asynchronous owner can settle into an ordinary cache hit on a later request.

This is a deliberate adverse scheduler model. It is not a captured Spotify relaunch trace, a statement that Loon dispatches 72 contexts this way, or a measurement of native VPN buffers. Real timing, host allocation and reclamation may differ. The macOS JavaScriptCore harness separately verifies whether completion occurs before the evaluation tail marker and checks cold/cached output equivalence.

An initial implementation lowered every async helper. Fresh-load measurements showed unnecessary cold-load overhead, so it was rejected. Only four local-capable paths are lowered in the released build, and generators are static declarations to avoid per-call capturing functions. Preliminary reports are not release acceptance; final hashes, every measurement, regressions and reproduction commands are in MEASUREMENTS.md.

The updated Chinese translation policy is a separate user-requested behavior change. It prevents translating English fragments in non-English songs and does not supply the equal-work benchmark gains: those comparisons use the same English lyrics and exact equal output bytes in both releases.

