# VerseLyrics native adapters 1 (core 0.4.1)

These original adapters wrap the unchanged VerseLyrics 0.4.1 core for Surge, Loon, Shadowrocket and Quantumult X. They normalize request/response headers, binary buffers, persistent JSON storage, HTTP APIs and host completion. The officially lyricless-track display failure reported on iOS Spotify remains unresolved.

This directory is retained only at the pinned runtime commit. The default branch keeps the four installation entries and user documentation, matching the repository publication policy.

## Reproduce locally

Use Node.js 24 or newer:

```sh
node build.mjs
node package.mjs
node --test native-adapter.test.mjs config.test.mjs core/test/*.test.mjs
node live-translation.mjs
```

`build.mjs` verifies the exact core Git blob `72e9b904356eac896522410a43ad7a7dbcdfd79b`, removes only ES module exports and adds the native host bridge. Runtime bundles include the full Unicode license for the Unihan mapping.

`package.mjs <runtime-commit-sha>` generates production entry files. It uses the preserved pre-publication README snapshots in `base/`; regenerate against current repository documentation when preparing a later release.

## Verification for this publication

- 159 existing core regression tests passed.
- 80 native host-interface tests passed across four explicit host environments.
- 4 configuration tests passed, covering request/response rules, matching URLs, host-specific argument syntax and binary options.
- All four bundles replaced a synthetic official alternative using a real Google translation request. Results are in `live-translation-result.json`; this runs the bridge in Node with simulated host globals, not in the proxy apps.
- Native import, real proxy runtime and iPhone Spotify UI acceptance have not been completed.
- Quantumult X skips response-body scripts for empty response bodies. Its empty-body 404 cannot reach this hook; no all-tracks coverage claim is made.

The tests use made-up lyrics and fake authorization strings. No user credentials or device logs are included.

## Primary API references

- Surge: https://manual.nssurge.com/scripting/http-response.html and https://manual.nssurge.com/scripting/api.html
- Loon: https://nsloon.app/docs/Script/script_v2/ and https://nsloon.app/docs/Script/script_api/
- Quantumult X: https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js and sample-task.js in the same commit
- Shadowrocket: https://shadowlaunch.com/ ; the module uses its Surge-compatible interface and still needs device validation.

No third-party plugin runtime or lyric algorithm was copied.
