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
    └── YouTube.sgmodule
```

Future Loon `.lpx` files belong in `Loon/Script/`, and Loon configuration files belong in `Loon/Config/`. Only the repository root contains a README.

## Rules

- `Loon/Rules/Apple.lsr` — Apple full routing rules for Loon.
- `Loon/Rules/Weverse.lsr` — Weverse routing rules for Loon.
- `Egern/Rules/Apple.yaml` — the corresponding Apple remote rule set for Egern.

## Egern Modules

- `Egern/Modules/YouTube.sgmodule` — YouTube / YouTube Music ad blocking, PiP, background playback and subtitle translation in one module.
- The module is based on Maasea's official YouTube Enhance implementation and uses the same single response script for enhancement + subtitle translation. It does **not** stack a second DualSubs `player` protobuf response script on top.
- Default subtitle target: `zh-Hans`. Change the module argument to `zh-Hant`, `en`, `ja`, `ko` or `off` as needed.
- Upstream source: `Maasea/sgmodule` → `YouTube.Enhance.sgmodule`.

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
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/Modules/YouTube.sgmodule
```
