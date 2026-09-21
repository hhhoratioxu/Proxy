# Horatio Proxy

A personal collection of proxy-client rules and configurations maintained by Horatio.

## Structure

```text
Loon/
├── Rules/
│   ├── Apple.lsr
│   └── Weverse.lsr
└── Plugins/
    ├── YouTubeAdBlock.lpx
    └── YouTubeTranslate.lpx

Egern/
├── Rules/
│   └── Apple.yaml
└── Modules/
    └── YouTubeTranslate.yaml
```

## YouTube — current recommended setup

### Loon: ad blocking + translation

This is the recommended path for YouTube ad blocking because the current Loon community plugin is still actively used and updated in 2026.

Requirements:

- Loon 3.1.7 (677) or newer.
- Enable **MitM over HTTP/2**.
- Enable **QUIC fallback protection**.
- Install and trust the MitM certificate.

Install plugins in this order:

1. `YouTubeAdBlock.lpx`
2. `YouTubeTranslate.lpx`

The ad-block plugin keeps its own subtitle translation **OFF** by default. The separate DualSubs plugin handles subtitles to avoid two scripts competing for the same YouTube protobuf responses.

`YouTubeAdBlock.lpx` uses the current Kelee/Maasea chain:

- YouTube API response processing including `config` and `log_event`;
- `googlevideo.com/initplayback` request processing;
- `log_event` request processing;
- Upload and Shorts UI removal enabled by default.

`YouTubeTranslate.lpx` uses:

- DualSubs YouTube v1.5.11;
- DualSubs Universal v1.7.5;
- `Type=Translate`;
- source language `AUTO`;
- target language `ZH-HANS`;
- Google Translate;
- automatic subtitles enabled.

### Egern: translation only

`YouTubeTranslate.yaml` is retained because DualSubs has an official Egern output and there is recent Egern user confirmation that the YouTube subtitle fix works.

The previous Egern YouTube ad-block module was removed. Multiple local tests failed, and no sufficiently recent independent evidence was found to justify calling current Egern YouTube ad blocking verified.

## Raw subscription links

### Loon Rules

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Rules/Apple.lsr
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Rules/Weverse.lsr
```

### Loon YouTube Plugins

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Plugins/YouTubeAdBlock.lpx
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/Plugins/YouTubeTranslate.lpx
```

### Egern Rules

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Rules/Apple.yaml
```

### Egern YouTube Translation

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeTranslate.yaml
```
