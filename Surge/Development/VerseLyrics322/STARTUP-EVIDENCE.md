# Spotify relaunch and lyric switching evidence — 3.2.2

The user reports that swiping Spotify away, reopening it or repeatedly switching songs can still disconnect the VPN, and suspects memory exhaustion. No phone crash/termination trace is available. The cause is unconfirmed.

Version 3.2.1 already finished native local lyric work synchronously. This release preserves that behavior. Under the adverse same-turn fixture, cached responses peak at one unfinished invocation and cold work peaks at two, leaving one real network owner. This is not a newly claimed concurrency reduction. Native storage is advisory rather than an atomic lock.

Version 3.2.2 moves online provider functions and matching helpers behind a static factory. Cached fallback and busy responses do not call it. Only an admitted request needing actual metadata/provider work initializes the scope. English-to-Chinese translation no longer repeats Chinese-line scans already made irrelevant by the whole-song gate. The shared original core remains readable; the build extracts exact declarations using pinned Acorn and Terser removes unused production branches.

A separate missing-lyrics defect is reproduced: upstream negative cache headers survived temporary fallback failure. New tests assert unchanged status/body, no-store headers, no extra HTTP/timers, no false internal long miss and successful fallback on a later idle request. This improves subsequent-request recovery; it cannot force automatic retry or cover songs absent from all sources.

Four native-client burst modes, five-client JSON/protobuf behavior, delayed HTTP and macOS JavaScriptCore completion are checked on final output hashes. Results and regressions are in MEASUREMENTS.md. Some V8 cold/burst samples increase, and JSC cold populated fallback rises about 8 KiB. No across-the-board memory reduction or real-phone VPN acceptance is claimed.

A custom token-scanning cache parser was rejected after slowing populated-cache first loads. A no-inline build and manual native host continuation also failed to establish a useful cold-load advantage. They are not shipped. The final cache parser, layout, HTTP concurrency and local completion runner retain the 3.2.1 design.

Desktop VM retention, total native VPN buffers, OS reclamation and real Spotify scheduling are distinct. No fixture demonstrates that a device can never run out of memory or disconnect, and no coverage guarantee is made for every song.
