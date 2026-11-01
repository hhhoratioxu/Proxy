# Client contracts for VerseLyrics 3.2.2

Reviewed 2026-11-01. Adapter 18 changes ordinary JavaScript initialization, not the host API surface or import grammar. Loon's [Script](https://nsloon.app/docs/Script/script_v2/) documentation states that requires_body=true waits for the complete native body; [Script API](https://nsloon.app/docs/Script/script_api/) requires exactly one completion after outstanding HTTP callbacks. The synchronous local path follows those contracts. [Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/) and [Plugin](https://nsloon.app/docs/Plugin/) syntax and typed arguments stay unchanged.

- Loon: documented $httpClient callbacks, millisecond HTTP timeout, Uint8Array, synchronous string storage; two response scripts and native request-header Rewrite; minimum 3.5.1 (983).
- Surge/Shadowrocket: their existing $httpClient timeout units, native binary representation, response headers and completion bridge remain. Request-header processing is local and continues to finish synchronously.
- Quantumult X: $task.fetch, $prefs and bodyBytes remain. Its existing single lazy script-exit watchdog is used only after real HTTP starts. No per-fetch cancellation API is invented; empty upstream bodies retain the documented rewrite limitation.
- Egern: native async ctx module/Response streams retain bounded reading/cancellation. The source-scope and temporary-missing-cache changes are shared; the native local-until-I/O transform is not applied to Egern.

The [previous immutable contracts](https://github.com/hhhoratioxu/Proxy/blob/d76f8aa7785e023b9901dbf97e44e274295a0ed8/Surge/Development/VerseLyrics321/CLIENT-CONTRACTS.md) document unchanged client fields, cache/request/translation budgets and their primary references. Source revision remains 8. No concurrency capacity, timers, persistent keys or fallback limits are added.

The build transform is limited to named declarations with identifier/default parameters and supported lexical bindings; it rejects unsupported shapes instead of guessing. Await lowering preserves control flow and only yields to real thenables. Its runner does not schedule timers or create resolved Promises for local results. Generator functions are declared once per VM. The original network helpers remain async.

Persistent storage is not an atomic lock. Network pressure tests show one active mocked request under the tested scheduler; they are not a universal cross-thread concurrency guarantee. Header-size conditions and script byte caps cannot stop the host from buffering an unknown-length response before script execution. Desktop JSC/Node measurements and iPhone VPN acceptance remain separate.


Online provider initialization is deferred until lookup after admission; cached decoding remains local. Missing responses with fallback enabled retain status, MIME and body while removing expiry/validators and setting no-store. It prevents HTTP reuse, not automatic client retry. The source-miss TTL and provider-off passthrough remain. Measurements contain some regressions and do not establish lower memory for every first load.
