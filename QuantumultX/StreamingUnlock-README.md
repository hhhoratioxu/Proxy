# Streaming Unlock · Quantumult X

**Version: 1.4.0 (Native UIAction)**

The output is now a native Quantumult X `$done({title,message})` modal, **not** `htmlMessage`. This deliberately avoids HTML/CSS parsing, which caused screenshots with white background highlighting and vertically stacked rows in QuanX on iOS 27.

### Import

Add the [Task Gallery](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Tasks/StreamingUnlock.json) to QuanX and select **流媒体解锁查询-原生版**. Remove or disable the old **流媒体解锁查询** task first.

Or paste only this line under the existing `[task_local]` section:

```ini
event-interaction https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Scripts/StreamingUnlockNative.js?v=1.4.0, tag=流媒体解锁查询-原生版, img-url=checkmark.seal.system, enabled=true
```

### Checks

Uses explicit `$task.fetch({opts:{policy: selectedNode}})` requests for the selected node. IPv4/IPv6, ASN, ISP, GeoIP, CF POP, Apple region, Netflix, Disney+, Max, Prime Video, YouTube Premium, Spotify, TikTok, ChatGPT, Gemini and Instagram Music.

Native report groups network fields and concise service status rows (a single line for website reachability, extra diagnostics for failures/limits).

**Accuracy**: A website responding is not proof of playback/account authorization. Netflix `疑似可用` indicates a heuristic movie page marker and still needs real-world playback verification. Instagram authorization depends on the account and the unauthenticated probe may be inconclusive. CF POP is an edge location, not the proxy location.

### Compatibility

QuanX UIAction `message` is documented in [the official policy request example](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-fetch-opts-policy.js). The native modal owns font, colors, and layout; it does **not** support a full Liquid Glass custom dashboard. The result is expected to be readable rather than richly styled.

The JS code passes syntax and mocked-network result checks. Real-device appearance cannot be guaranteed before an iPhone test.
