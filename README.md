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

YouTube ad blocking and subtitle translation are kept as two modules.

### Required Egern setting

Enable **Block QUIC** globally in Egern (`block_quic: true`).

### Module order

Keep the modules in this order:

1. `YouTubeTranslate.yaml`
2. `YouTubeAdBlock.sgmodule`

### AdBlock implementation

`YouTubeAdBlock.sgmodule` is intentionally kept in Surge-module format and should be imported directly by Egern, which supports Surge modules.

It follows the 2026-09-05 iOS HAR-verified approach from Feng-Feng1:

- return an empty valid response for `rr*.googlevideo.com/initplayback`;
- run the pinned `YouTube-AdFilter-V2` protobuf cleaner on YouTube API responses;
- hide Upload and Shorts via module arguments;
- reject YouTube QUIC/UDP so HTTPS MITM can see the relevant traffic.

The previous hand-converted native YAML adblock module was removed because it did not execute the Surge-compatible YouTube core reliably in Egern.

### Translation implementation

`YouTubeTranslate.yaml` follows DualSubs' native Egern structure and forces `Type=Translate`.

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

### Egern YouTube Modules

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeTranslate.yaml
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeAdBlock.sgmodule
```
