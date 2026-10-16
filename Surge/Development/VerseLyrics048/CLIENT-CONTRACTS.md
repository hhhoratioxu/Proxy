# Client API basis for VerseLyrics 0.4.8

Loon-specific changes were checked against first-party documentation on 2026-10-16. The other clients retain the API boundaries documented in [0.4.7](https://github.com/hhhoratioxu/Proxy/blob/41cadc7d0fe005932fa9f80e28ec439ca2e2a466/Surge/Development/VerseLyrics047/CLIENT-CONTRACTS.md), with shared bundle/cache/work-generation changes tested through each adapter. This is source/fixture validation, not vendor certification or native-device acceptance.

## Loon

- [Native Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/) documents request.header.set/del, action chaining with `|`, Boolean plugin arguments, typed conditions, case-insensitive header lookup and regex flags. The plugin uses only that subset. Rules exclude internal requests and preserve the request hook's settings/Accept semantics. No response body is requested by these header actions.
- [Script grammar](https://nsloon.app/docs/Script/script_v2/) documents response URL/status/header conditions, timeout, requires_body and binary_body_mode. The plugin keeps two disjoint response scripts, existing declared-size guards and no unsupported engine/max-size option. Internal metadata responses are excluded by the request-header condition.
- [Script API](https://nsloon.app/docs/Script/script_api/) documents Uint8Array, millisecond HTTP timeout, synchronous string storage and completing asynchronous operations before `$done`. No extra timer or guessed native cancellation API is added. New work detection only stops future requests; existing callbacks finish normally.

The new native Rewrite syntax needs build 978; the existing Script grammar needs build 983, so the combined minimum stays Loon 3.5.1 (983). Shadowrocket-style options and Surge's engine selector are not copied into Loon.

loon-rewrite.test.mjs interprets a limited documented DSL subset, checks 2,520 request cases against request-core.js, verifies internal-request/body-size exclusions, and verifies both response routes. It is an independent semantic fixture, not the native Loon parser. native-burst.test.mjs validates callback completion and source/translation preservation under overlapping mocked responses.

## Other clients

| Client | Preserved basis | Remaining boundary |
| --- | --- | --- |
| Egern | [JavaScript API](https://egernapp.com/docs/javascript-api/) and [script configuration](https://egernapp.com/docs/configuration/scriptings/): async ctx, Headers, streams, ms HTTP timeout, native max_size | Total host memory and native buffering are outside script control |
| Surge | [Overview](https://manual.nssurge.com/scripting/overview.html), [API](https://manual.nssurge.com/scripting/api.html), [response rules](https://manual.nssurge.com/scripting/http-response.html): WebView responses, JSC requests, seconds for HTTP timeout, Uint8Array, max-size | WebView isolates its JS engine; body interception/transfer still uses host resources |
| Quantumult X | [Official byte example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js), [response rewrite](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-rewrite-with-script.js), [task example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js): ArrayBuffer bodyBytes, protected response headers, one lazy whole-script timer | Script exit is not a verified fetch cancellation or pre-buffer memory cap |
| Shadowrocket | [App Store developer identity](https://apps.apple.com/us/app/shadowrocket/id932747118) links [developer website](https://shadowlaunch.com/); existing independent bridge retained | Complete public first-party scripting contract unavailable; timeout units, binary bridge and max-size compatibility are not claimed officially verified |

All five packaged implementations pass overlapping-callback and 120-change synthetic playlist checks. Only documented Loon native Rewrite is used to remove its request-script invocations; the other clients keep their individual request adapters. The shared latest-response marker does not identify real playback state or cancel native work. Shared storage is not an atomic lock. Cache-only responses remain available even when network admission is busy.

No benchmark establishes an iPhone VPN memory ceiling, and no community Shadowrocket manual is represented as an official specification.
