# Horatio Icon Libraries

A multi-variant icon library for the 23 rule sets in this repository.

## Country and region flags

The repository also includes 249 ISO country and region flags as 512 × 512 transparent-background PNG icons.

- [Flag PNG directory](./Flags/)
- [CountryFlags.json](./CountryFlags.json)
- Includes `CN`, `HK`, `MO`, and `TW`

## Icon index

```text
https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Icons/AppIcons.json
```

## One-tap import

- [Loon — native icon set](https://www.nsloon.com/openloon/import?iconset=https%3A%2F%2Fraw.githubusercontent.com%2Fhhhoratioxu%2FProxy%2Fmain%2FIcons%2FAppIcons.json)
- [Quantumult X — native icon gallery](https://quantumult.app/x/open-app/ui?module=gallery&type=icon&action=add&content=%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Fhhhoratioxu%2FProxy%2Fmain%2FIcons%2FAppIcons.json%22%5D)
- [Shadowrocket — icon preview config](https://lowertop.github.io/Shadowrocket-First/redirect.html?url=shadowrocket%3A%2F%2Fconfig%2Fadd%2Fhttps%3A%2F%2Fraw.githubusercontent.com%2Fhhhoratioxu%2FProxy%2Fmain%2FIcons%2FImport%2FShadowrocket.conf)
- [Egern — icon preview profile](https://egernapp.com/profiles/new?name=Horatio%20App%20Icons&url=https%3A%2F%2Fraw.githubusercontent.com%2Fhhhoratioxu%2FProxy%2Fmain%2FIcons%2FImport%2FEgern.yaml)

Full import details and native schemes:

```text
Icons/Import/README.md
```

## Transparent logo-only PNGs

Logo-only assets with transparent backgrounds are stored under `App/Transparent/` and indexed as `<Name>_Logo.png` in `AppIcons.json`.

Batch 1 includes: AI, Adobe, Apple, Bilibili, Disney, GitHub, Google, HBOMAX, Infuse, LAN.

Batch 2 includes: Meituan, Meta, Microsoft, NTP, Netflix, Spotify, Telegram, TikTok, Twitter, WeChat.

Batch 3 includes: Weverse, Wikimedia, Xiaohongshu.

All 23 rule groups now have transparent logo-only PNG variants.

## Layout

- `App/*.png` — default local icons
- `App/Variants/<App>/*.png` — Full / Alt / service variants
- `AppIcons.json` — complete icon subscription index
- `Flags/*.png` — 249 transparent country and region flag icons
- `CountryFlags.json` — flag icon subscription index
- `Import/Shadowrocket.conf` — Shadowrocket icon preview configuration
- `Import/Egern.yaml` — Egern icon preview profile
- `Import/ShadowrocketFlags.conf` — Shadowrocket flag preview configuration
- `Import/EgernFlags.yaml` — Egern flag preview profile
- `Import/README.md` — one-tap links for all four clients

## Weverse

The default Weverse entry uses the current dark-navy/white-W app logo introduced in October 2024. The previous icon is preserved as:

```text
Icons/App/Variants/Weverse/Weverse_Classic.png
```

## Sources

Curated from public/open-source icon assets including Koolson/Qure, fmz200/wool_scripts, homarr-labs/dashboard-icons, official project assets, Wikimedia Commons, R-Store and Toperlock/Quantumult.

Brand names and trademarks belong to their respective owners. Upstream assets retain their own licences.
