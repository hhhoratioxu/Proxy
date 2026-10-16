# Client API basis for VerseLyrics 0.4.14

This release uses native adapter 10. Only Loon opts into its documented UTF-8 text callback for explicit text-service GETs. Spotify Protobuf requests and output bodies retain the binary bridge. This release changes only bounded lyric matching and selection; no script route, host API, permission, concurrency or size limit is added. Prior parsing/encoding and lazy Han tables remain.

This release retains the [0.4.9 host contracts](https://github.com/hhhoratioxu/Proxy/blob/d485cd3194964a92017967f7d7bcdf2f6fe7df0e/Surge/Development/VerseLyrics049/CLIENT-CONTRACTS.md). Loon's Script API was rechecked on 2026-10-16 for this change. Synchronous string storage remains persistentStore.read/write on Loon/Surge, prefs.valueForKey/setValueForKey on QX, and storage.get/set on Egern. Existing JSON helpers remain for admission records. Other binary/configuration contracts retain the [0.4.8 basis](https://github.com/hhhoratioxu/Proxy/blob/661010d356abacfad6f2bfb910db65958b357315/Surge/Development/VerseLyrics048/CLIENT-CONTRACTS.md). Source/fixture testing is not vendor certification or phone acceptance.

The build uses the [Terser API](https://terser.org/docs/api-reference/) with property mangling disabled and all host globals intact. Compression removes production diagnostic-history calls; readable source and complete licenses remain available. Package and lock files pin this build-only dependency.

## Loon

[Script API, HTTP callback and binary-mode](https://nsloon.app/docs/Script/script_api/) documents strings for valid UTF-8 when binary-mode is false, and Uint8Array when conversion is unavailable. The bridge now requests text only for public lyric catalogs, lyric results, Spotify embed HTML and translation. It counts UTF-8 bytes without allocating another byte buffer, preserving the same per-response and source-chain limits. Malformed UTF-16 strings are rejected; binary callbacks still use the strict UTF-8 decoder. Internal getText is an adapter capability, not an invented Loon global or configuration option. Other clients do not opt into this capability; their bounded binary/stream paths remain. Native buffering before callback is outside these limits.

[Native Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/) supplies the existing header.set/del actions and typed conditions; [Script grammar](https://nsloon.app/docs/Script/script_v2/) supplies the two response routes, native timeout, requires_body and binary_body_mode. No guessed engine/max_size setting is added. The combined minimum remains Loon 3.5.1 (983).

[Script API](https://nsloon.app/docs/Script/script_api/) documents millisecond native HTTP timeouts, callback completion, Uint8Array, synchronous string storage and setTimeout(callback, delay). It warns that clearTimeout/clearInterval are not reliable and setInterval runs only once. This release uses a consumed one-shot timeout only for bounded admission waiting. It never races HTTP against a JS timer, uses no intervals/cancellation, and completes outstanding native callbacks before $done. Completed timeout callbacks are no longer labeled unfinished transports.

A replaceable pending record is checked after each bounded delay; obsolete waiting invocations retire on that check. It does not synchronously terminate another native context and cannot guarantee exactly one waiting VM. Same-turn bursts yield a microtask before starting timers. Normal/cache-only runs create no admission timers.

## Other clients

| Client | Basis | Boundary |
| --- | --- | --- |
| Surge | [API](https://manual.nssurge.com/scripting/api.html): seconds for native HTTP timeout, setTimeout, binary callbacks; [overview](https://manual.nssurge.com/scripting/overview.html) and [response](https://manual.nssurge.com/scripting/http-response.html): WebView response engine / max-size | Native buffering is outside the JS allocation budget; there is no new native cancellation assumption |
| Egern | [JavaScript API](https://egernapp.com/docs/javascript-api/) and [configuration](https://egernapp.com/docs/configuration/scriptings/): async ctx, Headers, bounded stream reads, native milliseconds / max_size | Published API does not list global setTimeout. Admission waiting is capability-gated; if absent, a busy request passes through. Node fixtures having that global do not establish it exists in Egern |
| Quantumult X | Official [bytes example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js), [rewrite example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-rewrite-with-script.js) and [task example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js) | ArrayBuffer / protected headers retained. One lazy overall watchdog plus bounded consumed admission timers only under contention. No verified per-fetch timeout, cancellation or pre-buffer cap; truly empty responses may not trigger the hook |
| Shadowrocket | [Developer site](https://shadowlaunch.com/) linked by [App Store](https://apps.apple.com/us/app/shadowrocket/id932747118) | Full public scripting API unavailable. Existing independent compatibility bridge retained; timer usage is feature-detected. Binary, timeout and buffer behavior is not claimed officially verified; no Surge engine option copied |

Tests cover every native adapter's single completion, units, timeout recovery, source/translation/color preservation and full burst drain. A separate Egern test removes setTimeout to verify safe passthrough under contention. Storage has no atomic locking primitive, so admission remains advisory. No script-level change establishes a phone VPN memory ceiling.

## Translation batching

The existing public translate.googleapis.com/translate_a/t route is retained. Its 64-short-line tolerance was checked with real synthetic text on 2026-10-16; it is not an official paid Cloud Translation contract. Encoded URL, response body and total translation time limits remain 6,800 characters, 96 KiB and 2.5 seconds. Rejected wide batches downgrade remaining work to 32 rows once, within the same deadline; timeouts, authentication errors and rate limits are not retried.

## LRCLIB matching contract

[Official API documentation](https://lrclib.net/docs), rechecked 2026-10-16, describes `/api/get` as a best-match signature lookup: title and artist are required; album and duration are recommended. The plugin still supplies duration and checks the returned full normalized title and complete artist set. It permits at most two seconds of duration difference for exact known albums, and one second with alternate-version rejection when the album differs or is absent. A server-selected signature candidate is not proof of global catalog uniqueness. Bounded searches retain conservative ambiguity rejection.

The documented search returns up to twenty complete records and has no pagination or response-field selector. No unsupported `limit`, `fields` or guessed endpoint is used. A verified timed signature returns immediately. A plain or fragmentary signature scopes its one follow-up search to the candidate album when available; a failed signature still permits the existing broader search. The same 96 KiB response and shared 256 KiB / twelve-request budget applies. Untimed, single-line fragments shorter than sixteen characters on tracks over sixty seconds are not considered sufficient LRCLIB lyric evidence; this heuristic may also reject a legitimately very short lyric. No absolute coverage claim is made.

In auto mode one compact plain backup may be retained while later sources search for real timing, within the existing lookup deadline. It is returned as UNSYNCED if no timed source succeeds. No timestamps are synthesized. This can add bounded requests for a plain-only hit; it does not increase concurrency, admission records or cache capacity.
