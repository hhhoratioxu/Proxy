# YouTube 去广告与双语字幕 0.1.0

This directory is the inspectable development source for the combined proxy plugin.
Current installable entry files live on `main` in each client's `script/` directory.
The public entry files pin the distributions in this source branch by commit SHA.

The runtime uses a single response handler for API protobuf/JSON, encrypted UMP,
and timed subtitles. It retains the original caption track and adds a translated
track using YouTube's own `tlang` service. Bilingual mode fetches the same caption
URL without `tlang` and composes the original above the translation. No speech
recognition or third-party translation account is provided.

For encrypted UMP, only metadata parts 0 and 25 are changed. AES-128-CTR and
HMAC-SHA256 run locally. Media and unknown UMP frames are retained. Unsupported
compression, failed authentication, missing keys and malformed data pass through.
An authentication failure clears only this plugin's local key cache so a later
`log_event` can obtain fresh configuration. Playback is never redirected.

Sources, modifications and licenses are recorded in `NOTICE` and `licenses/`.
The distributions reproduce the license texts, use no runtime imports and do not
call Maasea's external Worker. Source code from IBL3ND/module is not included.

## Build and test

Use Node 20+ and pnpm. Run `pnpm install --frozen-lockfile --ignore-scripts`,
`node build.mjs`, then `node --test test/*.test.mjs`.

The 80 local tests cover five client interfaces, independent native wire fixtures,
64-bit unknown-field preservation, AES-CTR/HMAC comparison against Node crypto,
UMP metadata/media separation, JSON3/srv3/XML/VTT composition, switches, exact URL
scope and failure pass-through. The tests exercise the actual production bundles.

On 2026-10-16, a public YouTube watch response with 52 caption tracks was processed
successfully: it retained those tracks and added one bilingual track. The public
caption endpoints returned HTTP 429. No successful live caption download, native
client import, phone playback or real ad-removal acceptance is claimed.

No account cookies, OAuth tokens, captured playback keys or signed live caption
URLs are included in the fixtures. Test data are self-written. Key material from
actual playback is stored only in the selected proxy client's local storage under
`Horatio.YouTubeEnhance.Keys.v1`; it is never logged or sent to an external service.
