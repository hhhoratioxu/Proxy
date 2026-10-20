# Apple Photos Map Diagnostic 0.2.0 verification

This is still a read-only diagnostic, not an automatic map-location repair.

The user supplied a completed Loon 3.5.3 (1008) REQUEST run for a bare GET to the CN `/tiles` endpoint. That confirms the 0.1.0 request hook ran on that device. It does not reveal the original request headers, the user's iOS version, which photo was viewed, the tile position, a successful upstream response, or a repaired location.

0.2.0 checks the `maps-tile-x`, `maps-tile-y`, `maps-tile-z` and `maps-tile-style` headers described in [Leith, 2026, Table XVII](https://arxiv.org/html/2610.21597v1). This is primary research about observed iOS traffic, not an Apple API guarantee. XYZ values are validated internally, then discarded from the log record. Only carrier state, zoom and bounded style/scale/size options are logged. Header availability on the user's actual request still needs confirmation.

The runtime does not read authentication headers, cookies, `x-tilekey`, unknown header values, request bodies or tile response bodies. It performs no network, persistence or timer work and returns `$done({})` exactly once. A coordinate carrier identifies a requested map tile; it does not identify the photo or prove that its marker is correctly aligned.

Run the synthetic runtime checks with Node.js:

```sh
node --test Loon/Development/ApplePhotosMapDiagnostic020/*.test.mjs
```

Inputs are independently constructed test data. The bare-URL scenario reproduces the known portion of the user's log; the header-bearing fixtures are examples from the public protocol description and are not represented as captured user headers. The tests do not contact Apple and do not establish Loon native parsing, device memory limits, source switching or corrected Photos rendering. Install configuration tests check the generated LPX guards, first-match order and body-buffering declarations, not the native Loon parser. Final entry and pinned runtime bytes are checked separately at publication.
