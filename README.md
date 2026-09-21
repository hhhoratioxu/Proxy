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
    ├── YouTubeAdBlock.yaml
    └── YouTubeTranslate.yaml
```

## Egern YouTube

For reliability, YouTube ad blocking and subtitle translation are kept as two Egern modules instead of stacking both protobuf response chains in one file.

### Required Egern setting

Enable **Block QUIC** globally in Egern (`block_quic: true`). This forces YouTube HTTP/3/QUIC traffic back to TCP/HTTPS so MITM scripts can see it.

### Module order

Keep the modules in this order:

1. `YouTubeAdBlock.yaml`
2. `YouTubeTranslate.yaml`

The ad-block module uses Maasea's current YouTube request/response scripts and also rejects YouTube UDP/QUIC traffic.

The translation module follows DualSubs' native Egern structure and forces `Type=Translate`, which avoids relying on YouTube's native `tlang` translation path.

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
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeAdBlock.yaml
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeTranslate.yaml
```
