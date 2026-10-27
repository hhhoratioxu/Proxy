# Spotify relaunch report and verification boundary

User report on 2026-10-28: the VPN disconnects when Spotify is force-closed from the app switcher and reopened. The user explicitly clarified that Spotify was swiped away, not Loon. Current iPhone/client version, process termination reason and a real startup response capture were not supplied. No credentials or device crash data were requested or collected.

The reproduced implementation issue is narrower: compiled 3.1.9 native entry hooks defer completion through Promise jobs although all work is local and requires_body already supplied the full body. The 3.2.0 generated native entry core/bridge use synchronous bounded reads and complete in the same evaluation. All prior rewrite output stays byte-identical. Compiled lyric network handling and Egern stream handling remain asynchronous.

The Node stress model dispatches 72 entry responses in one JS turn before a microtask drain, across nine supported routes and 12/40/90 KiB self-written inputs. This deliberately adverse scheduling model can expose retained invocations and body ownership; it is not a recording of actual Loon scheduling. macOS JavaScriptCore separately checks the completion point using a marker inside the same evaluation.

These checks substantiate reduced script-side retention under the tested scheduler. They cannot determine whether the user's actual disconnect is caused by jetsam, a native crash, client policy, another module or another cause. No guarantee of zero phone/VPN memory pressure is made.

Official contracts checked 2026-10-28: [Script](https://nsloon.app/docs/Script/script_v2/), [Script API](https://nsloon.app/docs/Script/script_api/), [Plugin](https://nsloon.app/docs/Plugin/).
