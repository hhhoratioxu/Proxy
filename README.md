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

For reliability, YouTube ad blocking and subtitle translation are kept as two Egern modules.

### Required Egern setting

Enable **Block QUIC** globally in Egern (`block_quic: true`). This forces YouTube HTTP/3/QUIC traffic back to TCP/HTTPS so MITM scripts can inspect the requests.

### Module order

Keep the modules in this order:

1. `YouTubeTranslate.yaml`
2. `YouTubeAdBlock.yaml`

Both modules touch the YouTube `player` response. Putting AdBlock after Translate makes the 2026 ad-cleanup stage run last while preserving the subtitle data injected earlier.

### AdBlock implementation

`YouTubeAdBlock.yaml` follows Maasea's 2026 Onesie/UMP flow:

- `config` / `log_event` responses provide the encryption keys.
- `initplayback` requests are handled by the current request script.
- `player`, `browse`, `next`, `guide`, `get_watch` and related responses are cleaned afterward.
- Upload and Shorts UI blocking are enabled.

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
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTubeAdBlock.yaml
```
