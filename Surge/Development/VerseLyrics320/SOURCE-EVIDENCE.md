# Source identity evidence for 3.1.5

Evidence retained from 3.1.5; the public source probe was not repeated for 3.1.6. This implementation never matches by a song ID special case, a partial artist name, approximate title alone or a looser duration threshold.

## Verified artist equivalence

The exact normalized full name Silence Wang is equivalent to 汪苏泷 (traditional spelling folds through the existing Unicode comparison data). The bare name Silence is not accepted as that artist. This small published equivalence applies to all of the artist's recordings and requires every other credited artist and the existing recording checks. No extra artist lookup HTTP request or separate alias cache is introduced.

Primary evidence checked on 2026-10-19:

- User-provided Spotify recording and linked artists: https://open.spotify.com/track/1fpBhAhO9gpTwuglQfjVBh . Public embed entity identifies Silence Wang with artist URI spotify:artist:0PdNEiQ3MsJGCEgE13Tz60 and 徐良, duration 211760 ms.
- The artist's official YouTube channel is titled 汪苏泷Silence Wang on the Tencent-provided release: https://www.youtube.com/watch?v=0HjOqmKJkR0 .
- QQ's public catalog response for https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=%E5%90%8E%E4%BC%9A%E6%97%A0%E6%9C%9F&format=json&n=10&p=1&t=0 identifies both 徐良 and 汪苏泷, album 不良少年 and duration 211 seconds for songmid 004gZy7l1GYJ1Q. QQ's lyric endpoint returned a real 65-row LRC, summarized by counts/hashes in the [3.1.5 immutable source report](https://github.com/hhhoratioxu/Proxy/blob/c9eda7c3424f9a446db886cfac08a6e1509c6347/Surge/Development/VerseLyrics315/user-track-live-results.json); downloaded lyric text is excluded from the release.
- NetEase's publicly returned recording was 206186 ms. The mismatch stays rejected; the duration tolerance was not increased to force a hit.

## Titles and timing

Only a trailing parenthetical containing an explicit 《show title》 plus a recognized soundtrack description (such as 插曲 or 主题曲) is removed for source comparison/search. Live, remix, acoustic, demo and ambiguous recordings remain significant. This rule applies to all titles matching that form, not one test song.

The same provider's first accepted untimed candidate can no longer prevent a later verified timed candidate from being tested in a static upgrade. Candidate count remains at most two; the existing per-source/whole-chain request, byte and deadline budgets still apply. Completely missing lyrics retain their prior first usable per-provider path. Source-sync misses and general source misses use separate records inside the existing bounded cache; no new persistent-store key is added.

A known LINE_SYNCED label with multiple all-zero lines is treated as lacking a real timeline. Single-line zero starts, unknown enums and malformed/missing JSON time values are preserved by this detection. An available positive timeline is kept. Only real source timestamps replace static words.


## 2026-10-24: explicit bilingual artist labels

The public Spotify embed for track `5gjHrjV4IhqPqoDHQUAriQ` reports `Burn It Down`, `KimYeji`, and 213600 ms. A bounded QQ search for `Burn It Down KimYeji` returns songmid `002tNDTi2bE19B`, title `Burn It Down`, performer `김예지 (Kim Yeji)`, and 213 seconds. The public lyric endpoint returns an LRC that the existing parser accepts as 42 timed lines. The instrumental and other same-title recordings are also returned and remain rejected.

The old complete-label normalization rejects this candidate; the new generic bilingual-label path accepts it without any track-ID branch, external alias service, lyric embedding, additional catalog request or relaxed duration/title/version checks. Both full names must actually appear in the source label; no translation or substring/fuzzy matching is used. A unique candidate is still required when album names differ. `target-track-reproduction.json` records both versions with the same public replies; `live-source-results.json` records an actual empty-cache compiled Loon request flow, simulating an official 404. The user phone response and display remain unverified.

Metadata references: [Spotify recording](https://open.spotify.com/track/5gjHrjV4IhqPqoDHQUAriQ), [QQ recording](https://y.qq.com/n/ryqq/songDetail/002tNDTi2bE19B). Raw song lyrics and anonymous embed session data are not included in this source archive.
