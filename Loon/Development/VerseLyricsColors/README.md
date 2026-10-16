# VerseLyrics Loon 0.4.2 color correction

Original color handling added to the original 0.4.1 core and adapter 1. The native adapter is unchanged. This directory is retained in the immutable runtime commit; the main branch contains only the installable plugin and user documentation.

Fallback lyrics previously used a fixed `#111818` background with identical white text and highlight colors. This version preserves a valid palette from an empty official lyric response or obtains the same track's public Spotify embed visual identity. It validates the track identity, opaque RGB channels and text contrast, then writes native JSON signed ARGB or Protobuf uint32 colors. Existing nonempty official lyrics retain their palette. Cached 0.4.1 fallback documents get new colors without clearing storage.

The public lookup runs alongside the lyric-source request, has a 1.5 second budget, sends no Spotify credentials, and caches only the three colors. A failed lookup returns neutral gray and backs off for five minutes. Existing lyric availability, source matching, timestamps, and translation behavior are retained.

## Reproduce

Use Node.js 24 or another compatible recent Node.js version, without third-party npm packages:

```sh
node build.mjs
node --test core/test/*.test.mjs native-adapter.test.mjs
node live-palette.mjs
```

The final command makes unauthenticated requests to public Spotify embed pages. It uses self-written cached lyric lines in a simulated Loon runtime; it does not contact lyric providers or log a user account in. Its JSON report contains only track IDs, color values, HTTP status and timings.

## Evidence, 2026-10-16

- 205 local checks passed: 159 existing core checks, 26 palette checks and 20 Loon bridge checks. Existing network-count expectations include the new public color request; no assertions or tests were removed from the 159 core checks.
- Public palettes for three different tracks were retrieved and validated with the production User-Agent. Background colors differed between tracks.
- The generated Loon bundle successfully fetched the real target palette and returned HTTP 200 with native Protobuf colors and unchanged self-written test lines. See `live-palette-results.json`.
- The user's screenshots establish that the previous Loon version can display fallback lyrics for the target song. They do not establish visual acceptance of this new color revision. Egern's unresolved behavior is outside this change.

## Sources and attribution

- Public target palette: <https://open.spotify.com/embed/track/76XUZSb13QUuj1HECY4Hvo>. `core/test/fixtures/target-palette.json` retains only public track identity and visual colors, with no embedded scripts, session values or tokens.
- Relative luminance and contrast: <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>.
- Loon native script API: <https://nsloon.app/docs/Script/script_api/>.
- Original 0.4.1 core and host bridge history: <https://github.com/hhhoratioxu/Proxy/tree/c35a07c9a851cba4c9f33c9d421cb68cf36b0784/Surge/Development/VerseLyricsPorts>.

The Unicode Unihan notice is preserved in `core/NOTICE-UNICODE.txt` and embedded in the generated runtime. No third-party lyric script or color-processing runtime was copied.
