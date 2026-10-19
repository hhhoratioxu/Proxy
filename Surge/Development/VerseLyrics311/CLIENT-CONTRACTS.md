# Client API basis for VerseLyrics 3.1.1

Adapter 14 is unchanged in 3.1.1. This release changes shared lyric selection and Chinese translation policy only. The 3.0.0 bridge retains opt-in cache-only behavior, lazy native header copying and in-place deletion. Host APIs, timeout units, cache caps and the advisory network owner remain. HTTP callbacks are awaited before completion; retired or deadline-expired jobs now stop before decoding the settled response. This releases obsolete processing sooner without claiming native request cancellation.

This release retains the [0.4.9 host contracts](https://github.com/hhhoratioxu/Proxy/blob/d485cd3194964a92017967f7d7bcdf2f6fe7df0e/Surge/Development/VerseLyrics049/CLIENT-CONTRACTS.md). Loon's Script API was rechecked on 2026-10-16 for this change. Synchronous string storage remains persistentStore.read/write on Loon/Surge, prefs.valueForKey/setValueForKey on QX, and storage.get/set on Egern. Existing JSON helpers remain for admission records. Other binary/configuration contracts retain the [0.4.8 basis](https://github.com/hhhoratioxu/Proxy/blob/661010d356abacfad6f2bfb910db65958b357315/Surge/Development/VerseLyrics048/CLIENT-CONTRACTS.md). Source/fixture testing is not vendor certification or phone acceptance.

The build uses the [Terser API](https://terser.org/docs/api-reference/) with property mangling disabled and all host globals intact. Compression removes production diagnostic-history calls; readable source and complete licenses remain available. Package and lock files pin this build-only dependency.

## Loon

[Script API, HTTP callback and binary-mode](https://nsloon.app/docs/Script/script_api/) documents strings for valid UTF-8 when binary-mode is false, and Uint8Array when conversion is unavailable. The bridge requests text only for public lyric catalogs, lyric results, Spotify embed HTML and translation. It counts UTF-8 bytes without allocating another byte buffer, preserving the same per-response and source-chain limits. Malformed UTF-16 strings are rejected; binary callbacks still use the strict UTF-8 decoder. Internal getText is an adapter capability, not an invented Loon global or configuration option. Other clients do not opt into this capability; their bounded binary/stream paths remain. Native buffering before callback is outside these limits.

[Native Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/) supplies the existing header.set/del actions and typed conditions; [Script grammar](https://nsloon.app/docs/Script/script_v2/) supplies the two response routes, native timeout, requires_body and binary_body_mode. No guessed engine/max_size setting is added. The combined minimum remains Loon 3.5.1 (983).

[Script API](https://nsloon.app/docs/Script/script_api/) documents millisecond native HTTP timeouts, callback completion, Uint8Array, synchronous string storage and setTimeout(callback, delay). It warns that clearTimeout/clearInterval are not reliable and setInterval runs only once. The inherited 0.5.1 policy has no admission timers. Compiled Loon, Surge and Shadowrocket lyric hooks contain no setTimeout or setInterval. HTTP is not raced against a JS timer; outstanding native callbacks complete before $done. Completed timeout callbacks are no longer labeled unfinished transports.

Busy responses finish without waiting for another owner. They can use existing cached lyrics, translations and colors; a missing uncached result stays retryable on a later client request. A same-track duplicate no longer waits to receive the owner's completed result in the same response. Different-track contention retires the remaining decoding and HTTP work after the already-pending native callback settles. A retired response is not cached as a catalog miss; it can be fetched again on a later request. This intentionally trades enrichment of overloaded responses for fewer retained script invocations; it does not schedule a future retry or guarantee immediate current-song enrichment.

## Other clients

| Client | Basis | Boundary |
| --- | --- | --- |
| Surge | [API](https://manual.nssurge.com/scripting/api.html): seconds for native HTTP timeout, setTimeout, binary callbacks; [overview](https://manual.nssurge.com/scripting/overview.html) and [response](https://manual.nssurge.com/scripting/http-response.html): WebView response engine / max-size | Native buffering is outside the JS allocation budget; there is no new native cancellation assumption |
| Egern | [JavaScript API](https://egernapp.com/docs/javascript-api/) and [configuration](https://egernapp.com/docs/configuration/scriptings/): async ctx, Headers, bounded stream reads, native milliseconds / max_size | Published API does not list global setTimeout. Shared admission now has no timer dependency; busy requests return without waiting |
| Quantumult X | Official [bytes example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js), [rewrite example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-rewrite-with-script.js) and [task example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js) | ArrayBuffer / protected headers retained. One lazy overall watchdog; no admission timers. No verified per-fetch timeout, cancellation or pre-buffer cap; truly empty responses may not trigger the hook |
| Shadowrocket | [Developer site](https://shadowlaunch.com/) linked by [App Store](https://apps.apple.com/us/app/shadowrocket/id932747118) | Full public scripting API unavailable. Existing independent compatibility bridge retained; no admission timers remain. Binary, timeout and buffer behavior is not claimed officially verified; no Surge engine option copied |

Tests cover every native adapter's single completion, units, timeout recovery, source/translation/color preservation and full burst drain. A separate Egern test removes setTimeout; the 80-response pressure tests also finish all busy invocations before releasing the outstanding callback. Storage has no atomic locking primitive, so admission remains advisory. No script-level change establishes a phone VPN memory ceiling.

## Translation batching

The existing public translate.googleapis.com/translate_a/t route is retained. Its 64-short-line tolerance was checked with real synthetic text on 2026-10-16; it is not an official paid Cloud Translation contract. Encoded URL, response body and total translation time limits remain 6,800 characters, 96 KiB and 2.5 seconds. Rejected wide batches downgrade remaining work to 32 rows once, within the same deadline; timeouts, authentication errors and rate limits are not retried.

## LRCLIB matching contract

[Official API documentation](https://lrclib.net/docs), rechecked 2026-10-16, describes `/api/get` as a best-match signature lookup: title and artist are required; album and duration are recommended. The plugin still supplies duration and checks the returned full normalized title and complete artist set. It permits at most two seconds of duration difference for exact known albums, and one second with alternate-version rejection when the album differs or is absent. A server-selected signature candidate is not proof of global catalog uniqueness. Bounded searches retain conservative ambiguity rejection.

The documented search returns up to twenty complete records and has no pagination or response-field selector. No unsupported `limit`, `fields` or guessed endpoint is used. A verified timed signature returns immediately. A plain or fragmentary signature scopes its one follow-up search to the candidate album when available; a failed signature still permits the existing broader search. The same 96 KiB response and shared 256 KiB / twelve-request budget applies. Untimed, single-line fragments shorter than sixteen characters on tracks over sixty seconds are not considered sufficient LRCLIB lyric evidence; this heuristic may also reject a legitimately very short lyric. No absolute coverage claim is made.

In auto mode one compact plain backup may be retained while later sources search for real timing, within the existing lookup deadline. It is returned as UNSYNCED if no timed source succeeds. No timestamps are synthesized. This can add bounded requests for a plain-only hit; it does not increase concurrency, admission records or cache capacity.


## Same-response translation fields

On 2026-10-16, actual public NetEase `api/song/lyric` JSON contained `lrc.lyric` and `tlyric.lyric`; three QQ `fcg_query_lyric_new.fcg` samples contained `lyric` and an empty `trans`. These are observed service schemas, not vendor guarantees of stable API or catalog coverage. The QQ nonempty branch is fixture-tested, not confirmed by those live samples. Only same-identity source results already accepted by the conservative song matcher can supply translations. Exact millisecond alignment and Simplified Chinese script checks apply; ambiguous repeated originals fall back to the translator. No Spotify native alternative is reused. A disabled preference ignores source-tagged cache entries. Existing translator cache pairs retain precedence.

Loon [Script API](https://nsloon.app/docs/Script/script_api/) and [Script grammar](https://nsloon.app/docs/Script/script_v2/) were rechecked for native object arguments and callback completion on 2026-10-16; Egern [scripting configuration](https://egernapp.com/docs/configuration/scriptings/) was rechecked for existing environment parameters. The added setting uses the same native parameter syntax as the other four settings. No unofficial Loon cancellation or memory-limit setting is invented.


## Official Loon review on 2026-10-17

Re-read the user-specified [introduction](https://nsloon.app/docs/intro/), [Script](https://nsloon.app/docs/Script/script_v2/), [Script API](https://nsloon.app/docs/Script/script_api/), [Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/) and [Plugin](https://nsloon.app/docs/Plugin/) pages. The new offset is a plugin-owned string-select preference passed through the documented argument object, not a new host option. The shared adapter still validates and bounds it. HTTP completion, timeout units, binary handling, Rewrite conditions and the minimum 3.5.1 (983) remain unchanged. The repository now carries AGENTS.md and Loon/Docs/OfficialReference.md for future Loon work; no global device settings are changed.


## 1.0.0 review on 2026-10-18

Rechecked the user-specified [Script](https://nsloon.app/docs/Script/script_v2/), [Script API](https://nsloon.app/docs/Script/script_api/) and [Plugin](https://nsloon.app/docs/Plugin/) pages. FALLBACK_MODE is a plugin-owned string select passed through the existing native argument object. Loon minimum stays 3.5.1 (983); no new host API is required. The callback is settled before the ownership check and before $done. Optional body cancellation only concerns an available Response stream; the Loon callback bridge has no invented native cancel handle.

The default synced strategy retains the existing LRCLIB/plain-source behavior above. The optional fast strategy returns the first sufficient, identity-checked plain or timed document; it does not bypass artist, title, album, duration or alternate-version validation. Fast-only plain entries use lyrics-fast keys inside the same bounded store. They are ignored by synced mode. Timed successes remain shared, and translations/color/offset behavior remains.


## 3.0.0 review on 2026-10-19

Rechecked the official Loon Script, Script API and Plugin pages linked above. NETWORK_MODE is a plugin string select (online default, cache-only optional), not a host flag. No native API, minimum-version, permission or routing change is introduced. Native Rewrite header rules remain. The unconfigured Loon Request.js output and production manual-entry widget are removed. Other request adapters parse only their four header-eligibility controls. Entry scripts stage metadata/availability only and preserve unrelated translations through the original bounded cache writer.

Cache-only blocks plugin HTTP before network admission, uses no translation timers/requests, restores valid source/translation/color caches, and avoids storing a false palette failure when networking is disabled. Spotify networking remains. Download application errors permit a second candidate and are retryable when no candidate succeeds. Per-source missing evidence expires in at most 90 seconds within the original cache budget; whole-search evidence never extends its earliest proof.


## 3.1.0 shared-policy review on 2026-10-19

No host API, plugin parameter syntax, native timeout unit, minimum Loon version, storage limit, concurrency limit or completion behavior changes. The Loon Script API page was checked again; HTTP callbacks still settle before the single completion and no cancellation handle is assumed. This change applies equally to generated JSON/protobuf processors for all five clients.

Both Chinese writing variants are treated as already Chinese when the target is zh-CN or zh-TW. The original text is unchanged. Old per-track and per-line conversions, and provider-attached conversion rows, are ignored. A Han-only row with a missing or inaccurate non-Japanese/non-Korean language label is also preserved; explicit Japanese/Korean documents and foreign or mixed-script rows remain translation candidates. Chinese-to-foreign-language requests still translate normally. Matching-only Unihan tables continue to validate identities and Simplified Chinese provider translations of foreign words; they never rewrite original lyrics.

Official JSON syncType UNSYNCED, or the protobuf sync enum value zero including its omitted default, triggers a timed-only source lookup. Unknown enums retain official processing. Existing LINE_SYNCED lyrics do not search. The timed-only path ignores plain positive caches and fast-only entries, skips the untimed-only lyrics.ovh service, and uses existing metadata, identity checks, advisory ownership and source request/byte/deadline budgets. A verified timed result replaces the static response and uses the official palette if available. A miss, error, busy owner or offline miss retains the official text and still permits available plugin translations. The fast preference continues to apply to completely missing lyrics; it does not replace existing static text with another untimed copy.

A complete successful no-timeline search gets at most 90 seconds of synced-miss evidence in the same bounded cache. It is separate from the ordinary no-lyrics cache, so it cannot hide an untimed source from a later missing-lyrics response. Incomplete, timed-out and failed searches are retryable. No new background refresh, source parallelism, admission polling, second lyric cache or device network settings are introduced. Static-to-timed enrichment performs additional work compared with the old static passthrough; measured memory and latency changes are reported separately in MEASUREMENTS.md rather than described as universal reductions.


## 3.1.1 conversion-output review on 2026-10-19

Host adapter 14, Loon minimum, native parameter syntax, timeout units, binary data, bounded caches and completion are unchanged. This patch changes shared translation selection and final output checks only. Chinese rows may contain Latin ad-libs/names or Bopomofo; independent foreign rows remain eligible. Explicit Japanese/Korean documents can still translate useful words, with a final per-row conversion-equivalence check independent of the document language label.

The retained public translate_a/t route returned arrays of translated text and detected language in two live synthetic observations. A Latin/Chinese row was labelled en, so service detection alone is not trusted to prevent conversion. If it explicitly reports zh/cmn/yue for an otherwise Chinese-compatible row, the processor caches original text as an identity result. Every source/cache/network output also passes the existing Unicode comparison plus common orthographic equivalences; comparison normalizes spacing, punctuation and invisible formatting without altering visible words. No new runtime dictionary or library is loaded. The live observations contain no account credentials, real song lyrics or phone traffic.
