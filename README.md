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
    └── YouTubeTranslate.yaml
```

## Egern YouTube

This repository now keeps YouTube functionality for **Egern only**.

### 1. YouTubeAdBlock.sgmodule

Uses Maasea's current YouTube Enhance core without rewriting the underlying JavaScript.

Defaults:

- Hide Upload button: true
- Hide Shorts button: true
- Hide Immersive button: true
- Built-in caption translation: off
- Debug: false

The current upstream flow includes:

- YouTube API response handling for `browse`, `next`, `player`, `search`, `reel`, `guide`, `get_watch`, `log_event`, and `config`
- `googlevideo.com/initplayback` request handling
- `log_event` request handling

### 2. YouTubeTranslate.yaml

Uses DualSubs YouTube v1.5.11 with DualSubs Universal v1.7.5.

Defaults:

- Type: Translate
- Source language: AUTO
- Target language: ZH-HANS
- Translator: Google
- AutoCC: true

This avoids relying on YouTube's native `tlang` auto-translation path.

### Required Egern settings

- Enable MITM and trust the Egern certificate.
- Enable global `block_quic: true` so YouTube QUIC/HTTP3 falls back to TCP/HTTPS and can be inspected.

### Recommended module order

1. `YouTubeTranslate.yaml`
2. `YouTubeAdBlock.sgmodule`

The ad-block module should have higher processing priority than the subtitle module.

## Raw subscription links

### Egern YouTube

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeTranslate.yaml
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeAdBlock.sgmodule
```

### Egern Rules

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Rules/Apple.yaml
```

### Loon Rules

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Rules/Apple.lsr
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Rules/Weverse.lsr
```
