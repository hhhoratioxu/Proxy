# Client API audit for VerseLyrics 0.4.7

Checked 2026-10-16 (Asia/Taipei). "Checked" means source/configuration compared with the linked first-party reference and local contract fixtures; it does not mean vendor certification or native-device acceptance. Implementations remain original code.

| Client | First-party evidence | Applied contract | Remaining boundary |
| --- | --- | --- | --- |
| Egern | [JavaScript API](https://egernapp.com/docs/javascript-api/), [script configuration](https://egernapp.com/docs/configuration/scriptings/) | Native async ctx entry, Headers methods, one-time body consumption, stream reading, millisecond HTTP timeout, native max_size | No published total-process memory cap controlled by the script; unknown host buffering remains outside JS |
| Loon | [Script API](https://nsloon.app/docs/Script/script_api/), [native rule grammar](https://nsloon.app/docs/Script/script_v2/) | Uint8Array, millisecond HTTP timeout, finish after callback; no competing JS watchdog or dependency on clearTimeout; valid native options and response URL guard | No documented body-size/engine option in this grammar; known Content-Length filter cannot cap unknown or decompressed host buffers |
| Surge | [Overview](https://manual.nssurge.com/scripting/overview.html), [API](https://manual.nssurge.com/scripting/api.html), [response rules](https://manual.nssurge.com/scripting/http-response.html) | Response scripts explicitly use webview, request hook jsc; seconds for HTTP timeout, Uint8Array and max-size; native callback then one completion | WebView isolates JS engine memory, while interception/body transfer still uses host resources; requires supported iOS/Mac engine |
| Quantumult X | [HTTP task](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js), [binary response](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js), [response headers](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-rewrite-with-script.js), [configuration](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf) | ArrayBuffer bodyBytes; preserve original content length/type/encoding fields; exactly one lazy whole-run timer; no unlisted fetch timeout/size/abort options | A script exit is not proven network cancellation; no first-party per-fetch 2.5-second limit or header-stage size gate was found |
| Shadowrocket | [App Store identity](https://apps.apple.com/us/app/shadowrocket/id932747118), [linked developer site](https://shadowlaunch.com/) | Existing separate compatibility bridge retained; no Surge engine field added, competing JS timers removed | No complete public first-party scripting API found at developer site; timeout units, binary bridge and max-size compatibility remain unverified against an official contract |

The official Shadowrocket site links developer contact/social channels but does not publish the needed scripting contract. Community manuals and search-engine sites calling themselves official were not treated as first-party specifications. No messages were sent to maintainers.

## Code differences from 0.4.6

The old common adapter could finish a Loon script when a JavaScript timer expired even though a native HTTP callback was still pending. Callback clients now await native completion and rely on configured host/script timeouts. HTTP callback errors that indicate timeouts stop additional fallback requests.

Quantumult X keeps its documented whole-script exit mechanism, creates the timer only on first HTTP use and does not depend on a timer handle being returned. Later fetch fulfillment checks completion before accessing bodyBytes/body. Its body-rewrite output restores original Content-Length, Content-Type and Content-Encoding spelling and values; status is an HTTP status line. Invalid header-only results are passed through.

Surge response engines are explicitly webview following the documented recommendation for heavier scripts. The request hook remains jsc. No engine selector was copied into Loon, Egern, Quantumult X or Shadowrocket.

## Regression evidence

client-contract.test.mjs verifies native callback ordering, timeout units, native option shapes, exactly-once completion, duplicate callbacks, sequential requests, absence of callback-host JS timers, one QX timer even without a timer handle, no late QX body access and protected response headers. config.test.mjs and validate-egern.rb validate native config fields, body limits, disjoint routes and engine declarations. Shadowrocket fixtures exercise the compatibility assumptions; they cannot establish vendor conformance.

native-lifecycle-results.json compares the unchanged 0.4.6 bridge with 0.4.7 in isolated Node VM fixtures. For twelve sequential 96 KiB mock responses without clearTimeout, JavaScript timer creation drops from thirteen to zero on the three callback adapters and to one on QX. Both versions finish once with identical fixture output and one active request. These counts are not RAM savings or evidence of phone stability.

A successful official API audit, unit test, benchmark or public service fetch does not establish a total VPN memory ceiling. The network extension also buffers traffic and runs other app features; scripts cannot control all of that memory.
