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
    └── YouTubeTranslate.yaml
```

## Egern YouTube

The YouTube setup is Egern-only.

### Requirements

Use Egern **2.19.0 or newer**.

Egern 2.19 added direct import support for Loon configs/plugins, so the ad-block plugin is intentionally kept in native Loon plugin format and imported directly by Egern instead of being converted to YAML/sgmodule.

Also enable:

- MITM
- trusted Egern CA certificate
- global `block_quic: true`

### Module order

1. `YouTubeTranslate.yaml`

### YouTubeTranslate.yaml

Uses DualSubs YouTube v1.5.11 + DualSubs Universal v1.7.5.

Defaults:

- `Type=Translate`
- `Languages[0]=AUTO`
- `Languages[1]=ZH-HANS`
- `Vendor=Google`
- `AutoCC=true`

This means any available source subtitle language is auto-detected and translated to Simplified Chinese.

## Raw subscription links

### Egern YouTube

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeTranslate.yaml
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
