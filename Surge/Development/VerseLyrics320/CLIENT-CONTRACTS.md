# Client API basis for VerseLyrics 3.1.7

Adapter 15 adds the REPLACE_UNSYNCED preference to the existing argument allowlist; host APIs are unchanged from adapter 14. This release reduces shared lookup, cache and translation work while preserving lyric selection and Chinese translation behavior. The 3.0.0 bridge retains opt-in cache-only behavior, lazy native header copying and in-place deletion. Host APIs, timeout units, cache caps and the advisory network owner remain. HTTP callbacks are awaited before completion; retired or deadline-expired jobs now stop before decoding the settled response. This releases obsolete processing sooner without claiming native request cancellation.

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


## Historical 3.1.1 conversion-output review on 2026-10-19

Host adapter 14, Loon minimum, native parameter syntax, timeout units, binary data, bounded caches and completion are unchanged. This patch changes shared translation selection and final output checks only. Chinese rows may contain Latin ad-libs/names or Bopomofo; independent foreign rows remain eligible. Explicit Japanese/Korean documents can still translate useful words, with a final per-row conversion-equivalence check independent of the document language label.

The retained public translate_a/t route returned arrays of translated text and detected language in two live synthetic observations. A Latin/Chinese row was labelled en, so service detection alone is not trusted to prevent conversion. If it explicitly reports zh/cmn/yue for an otherwise Chinese-compatible row, the processor caches original text as an identity result. Every source/cache/network output also passes the existing Unicode comparison plus common orthographic equivalences; comparison normalizes spacing, punctuation and invisible formatting without altering visible words. No new runtime dictionary or library is loaded. The live observations contain no account credentials, real song lyrics or phone traffic.


## 3.1.2 mixed translation correction on 2026-10-19

Rechecked the official Loon [Script API](https://nsloon.app/docs/Script/script_api/) and [Plugin](https://nsloon.app/docs/Plugin/) pages. This patch retains adapter 14, Loon minimum 3.5.1 (983), both native response hooks and Rewrite headers, existing units/storage/binary contracts and single completion after awaited HTTP. No host syntax or runtime API changes.

The preceding 3.1.1 whole-row preservation rule is superseded: Han with Latin words remains eligible. For Chinese targets the translator receives only its Latin spans, newline separated within one q per row; returned span count must match exactly. Original Chinese and punctuation are composed literally. Foreign scripts and foreign target choices retain whole-row automatic translation. This route was exercised with two live public synthetic requests through the actual candidate translator; both targets returned five useful mixed translations and zero warm HTTP. Two earlier whole-row auto requests left all embedded English unchanged; forcing en for the whole row reworded Chinese and is not used.

The bounded translation record accepts [original,translation,"checked"] as proof of a current attempted no-op. It is independent of [original,translation,"source"] provenance and survives scoped merges. Old unmarked mixed identities/conversions are retried once; useful pairs remain valid. Legacy per-line no-op proof is {text:translation,mixed:1} within the existing cache. No global purge, new storage key, fragment cache, timer or concurrent fetch is introduced. A failed/misaligned request creates no proof. All variants still pass the comparison-only conversion guard. These application records are not new client APIs.


## 3.1.3 work reduction review on 2026-10-19

Re-read the official Loon Script and Script API pages. Host syntax, minimum 3.5.1 (983), two response hooks, native Rewrite, byte representation, timeout units and completion after settled HTTP remain. No new host API, memory-limit flag, cancellation primitive or storage transaction is assumed.

Han table packing uses ordinary strings, charCodeAt, integer arithmetic and lazy source-plane arrays. All 6,447 independent reference mappings, supplementary characters and nonmapped samples preserve identity/translation rules. No native compression API, decompression buffer or external runtime is required.

Translation deduplication searches only the existing at-most-6,800-character encoded batch URL. Percent escaping prevents q separators inside values; prefix matches must end at a real parameter boundary. At most 64 original rows enter each batch, regardless of unique-query count. Only duplicate batches allocate positions and values arrays, each bounded to those rows. Full response validation, output-character accounting, native callback completion and one downgrade for genuinely wide requests remain. Existing translator/provenance/no-op cache records keep their schema and capacity.

The cache writer defers only the final re-materialization of retained ranges. It still validates saved records before copying and re-reads current storage before merging; concurrent writer protection is retained. entries and get preserve their public values when later read. Both cache modes, retryable failed saves, malformed JSON and mutation after save are tested.

First-load and playlist comparisons now use one shared fixture codec for both versions while loading the actual native runtime from each version. This removes unrelated full-source-module differences from the harness; absolute process memory still includes Node/JSC, fixture code, compiler and allocator costs. None establishes iPhone VPN acceptance.

Malformed JSON parsing uses the existing 15-second host cooldown, without a background timer or negative lyric evidence. Valid JSON with a source-specific no-match shape is not globally suppressed. Cooldowns are not renewed on blocked reads, cached successes bypass networking, and expiry permits retry. Five native adapters and both formats cover repeated translation failures and invalid-first-source continuation across different artists. Normal network planning retains the original in-place validation; query compaction lives in a helper invoked only for Chinese/Latin batches, avoiding the first-load allocation regression found during ablation.

## 3.1.4 controls and filler review on 2026-10-19

The official Loon Plugin documentation was rechecked for a native boolean switch and typed argument binding. REPLACE_UNSYNCED defaults true, retaining 3.1.3's timed-only upgrade behavior. Explicit boolean false and the string false disable only existing static lyric replacement, including warm timed caches. Fully missing lyric fallback, translation settings, provider off, cache-only, identity checks and existing budgets retain their behavior. Entry bundles drop this unused allowlist key; no new host API, timer, concurrency or storage key is added.

Filler-only vocal rows do not restore, accept or request translations. Chinese plus independent filler spans keep those spans literally; the remaining meaningful English spans use the existing batched translation path and alignment checks. Old mixed cache/provider rows which translated standalone fillers are retried through the bounded normal translator. Exact complete-token checks protect meaningful words such as Ohio, baby, hello and phrases such as Oh my love. Chinese simplified/traditional filtering is unchanged. These are behavior checks, not proof of iPhone peak memory or VPN stability.

## 3.1.5 parsing, matching and static upgrade review on 2026-10-19

Adapter 15 is unchanged. The public Loon Script API binary/completion contract was rechecked. UTF-8 scratch is per script/module, lazily allocated, grows only to 4097 UTF-16 units and returns copied strings. Decoding and shared regular-expression walks are synchronous with no await or reentrant callbacks; no view is retained in lyric output. Short varint paths retain the generic strict reader for long values and malformed/overflowing data.

The static upgrade flag is retained. Recognized static enums and multi-row known LINE_SYNCED data whose valid times are all zero seek true timed source data. Unknown enums and malformed/missing JSON timestamps do not gain a new source interpretation. A positive timeline and a single zero-start row retain official handling. Second verified candidates are tested after an untimed first result in timed-only mode; ordinary fallback keeps its previous first-result behavior.

Source revision 7 and distinct source-sync-miss records prevent old or mode-inappropriate negative evidence from suppressing an upgrade or a later plain fallback. Positive cache schema, user preferences and standard/compact limits remain compatible. Metadata matching changes only the exact published artist equivalent and explicit soundtrack suffix described in SOURCE-EVIDENCE.md; arbitrary aliases, incomplete artists, wrong durations, live/remix recordings and ambiguity remain rejected. No extra artist request, independent cache, parallel source work or new host API is added.

A focused real public lookup obtains 65 timed rows for the supplied track. Its ten native replays and the performance fixtures use a self-written official static document, not captured phone traffic; device UI and VPN acceptance remain separate.


## 3.1.6 cache review and rejected parser on 2026-10-19

Rechecked official Loon Script and Script API pages. Adapter 15, native Rewrite, two response hooks, typed arguments, 3.5.1 (983), timeout units and completion after settled HTTP remain unchanged. No new host field, API, cancellation, transaction, timer, request or memory limit is assumed.

Unescaped indexed keys are recognized with quotes, backslashes and control characters excluded. Escaped legacy keys still use JSON.parse; unsupported layouts retain the full bounded reader. Cache values and every saved record keep existing validation. Map/WeakMap containers initialize synchronously at first access. Scope key fragments are computed lazily once for the immutable track/language; mutable translation/metadata flags remain checked at use time. Scoped writes still merge all other songs against current storage. Nothing adds cache capacity or retains a second unrelated catalog across network waits.

A prototype replacing per-row byte views with range arguments was rejected. It reduced deterministic view counts but repeatedly increased sampled Node heap for 600 mixed rows with a populated cache. Ablation isolated that regression to the parser change; removing default parameters did not resolve it. Final code uses the established 3.1.5 strict protobuf/UTF-8 reader and bounded scratch. Prototype work counts are not reported as shipped improvements. Raw pilot reports and a source diff are retained for that decision.

Full compiled native tests and final runtime hashes/measurements are separate from real iPhone host buffering, UI latency and VPN acceptance.


## 3.1.7 vocal/language scope on 2026-10-20

Rechecked official Loon Script API storage, bytes and single completion after settled asynchronous callbacks. Adapter 15, native syntax, minimum version, twelve plugin settings, timers, storage keys, cache caps, concurrency and deadlines remain unchanged. Only shared classification and translation query contents change.

Joined fixed vocal units and default-ignorable formatting are recognized without mutating original words. Fixed repeated alternatives are prefix-disjoint; the scanner remains lazy and synchronous. Complete meaningful words/phrases remain eligible. Source language tags normalize English/Chinese and common Japanese/Korean aliases. Explicit other languages bypass English filler suppression on network, cache and same-response source translations. Latin fragments inside Han text also pass the scope flag so a foreign short word is not silently omitted. Conversion-only Chinese output guards remain, including stale foreign metadata. Unsupported/missing language tags retain auto detection; unknown non-Latin scripts are not called English fillers.

The existing translate.googleapis.com public route is retained. For a supported explicit foreign source with no Han/Latin fragment rows, its known source code replaces auto; mixed Han/Latin batches keep auto and literal Han context. This is not the paid Google Cloud Translation API or an official stability contract. Live probes use only self-written short words; all native response/URL/deadline caps remain. Foreign rows previously misclassified as English filler can now require translation, within the existing serial budget.

The temporary fallback document carries the known official source language through static replacement, including both source-supplied and network translations. No new persistent language cache is introduced. Old filler translations are ignored at output without clearing all cache data; valid foreign translations remain warm. Tests cover official alternatives, old per-line/grouped caches, source translations, language-tag changes, hidden formatting, joined fillers, meaningful English, Chinese fragments and native JSON/protobuf on all five clients. Tests and desktop measurements do not establish iPhone VPN acceptance.


## 3.1.8: aligned recovery and short retry records

No new host API or native syntax: Loon retains native Rewrite, two Response Script hooks, adapter 15, minimum 3.5.1 (983), and its current .lpx consumer path. HTTP timeouts remain milliseconds in Loon, seconds where documented by the other native bridges; completion follows settled callbacks. Existing limits, options and source boundaries remain.

A successful cache value identical to its foreign/English source is rejected unless covered by the existing intentional Chinese/mixed-conversion proof. A correctly sized translator array is validated per row; malformed count is still rejected as a whole. Invalid aligned rows and new unchanged answers use an empty value plus a finite numeric retry timestamp in the same bounded per-track pairs array. The timestamp can suppress queries only for the next 30 seconds and never enters native output. No extra track cache key, background timer or parallel request is introduced. Expiry permits a later lyric request to retry only pending rows. Legacy no-track callers use the existing per-line key with a 30-second entry lifetime.

Regression tests preserve real cached/source translations, words, timing, colors, source fallback, static replacement and vocal/Chinese rules across all clients and JSON/protobuf. Actual public translation probes use self-written text through the compiled Loon host mock; the reported recording metadata is public, while its protected lyric response and phone/VPN state remain unobserved.


## 3.1.9 bilingual source identities

Ordinary exact artist comparisons keep their previous path; only a mismatch with an explicit single parenthetical bilingual label parses up to 32 full artist groups. The second name must cross Latin and Han/Hangul/Hiragana/Katakana scripts. Same-script qualifiers, nested brackets and collaboration/membership/cover annotations are not inferred as aliases. Complete credited performers map one to one; overlapping alias groups are rejected. Title, duration, album/version and relaxed-album uniqueness remain checked. No fuzzy match, new lookup, provider, native option, cache capacity or background work is introduced.

Source revision 8 invalidates earlier ordinary/timed negative records on later requests. Successful packed lyrics, translations and their TTLs remain reusable; no global purge is performed. Limits and asynchronous completion remain unchanged. Tests and desktop benchmarks use compiled 3.1.9 runtime hashes; public network tests do not establish native phone interception/display or VPN memory.


## 3.2.0 native entry completion

For Loon/Surge/Shadowrocket/Quantumult X, requires_body already supplies a complete native body. The generated entry core and bridge therefore execute synchronously, call the bounded byte accessor directly, retain all entry rewrites/cache checks and call done once before returning to the host. The unused asynchronous arrayBuffer property is removed from this entry-only bridge. There is no entry HTTP, timer, queue or new lease key. The lyric bridge still waits for each actual HTTP callback; source and translation admission remain unchanged. Egern retains its documented asynchronous Response/stream reader. Native adapter is 16; minimum Loon 3.5.1(983) remains.

Tests cover nine entry routes, byte/string input, malformed/oversized/disabled/error passthrough, metadata visibility and repeated startup bursts. A same-turn scheduler is an explicit desktop stress model, not an observed Loon/iPhone scheduler. No real device crash capture or native VPN acceptance is claimed.
