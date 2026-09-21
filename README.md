# Horatio Proxy

A personal collection of proxy-client rules and configurations maintained by Horatio.

## Structure

```text
Loon/
└── Rules/
    ├── Apple.lsr
    └── Weverse.lsr

Egern/
├── Rules/
│   └── Apple.yaml
└── Modules/
    ├── YouTubeAdBlock.sgmodule
    └── YouTubeTranslate.sgmodule
```

Future Loon `.lpx` files belong in `Loon/Script/`, and Loon configuration files belong in `Loon/Config/`. Only the repository root contains a README.

> Egern officially supports importing Surge modules from **Tools → Modules**, so the YouTube modules under `Egern/Modules/` intentionally use the `.sgmodule` format for compatibility with their upstream scripts.

## Rules

- `Loon/Rules/Apple.lsr` — Apple full routing rules for Loon.
- `Loon/Rules/Weverse.lsr` — Weverse routing rules for Loon.
- `Egern/Rules/Apple.yaml` — the corresponding Apple remote rule set for Egern.

## Egern Modules

- `Egern/Modules/YouTubeAdBlock.sgmodule` — YouTube ad blocking, PiP and background playback. Subtitle translation is disabled by default so it can be paired with the standalone translation module.
- `Egern/Modules/YouTubeTranslate.sgmodule` — YouTube bilingual subtitle translation. Default: auto-detect source language → Simplified Chinese, Google Translate, auto captions enabled.

### Notes

- The ad-block module uses Maasea's YouTube enhancement scripts pinned to a reviewed 2026-compatible revision.
- The subtitle module uses DualSubs YouTube v1.5.11 and DualSubs Universal v1.7.5 release assets.
- Both modules MITM YouTube traffic. If simultaneous use causes playback or subtitle issues after a YouTube protocol change, disable one module first to isolate the conflict.

## Raw subscription links

### Loon

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Rules/Apple.lsr
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Rules/Weverse.lsr
```

### Egern Rules

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Rules/Apple.yaml
```

### Egern Modules

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeAdBlock.sgmodule
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeTranslate.sgmodule
```
