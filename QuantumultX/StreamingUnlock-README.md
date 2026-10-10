# Streaming Unlock for Quantumult X

- Version: **1.1.1** (2026-10-10)
- Author: **Horatio Xu**
- Source: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Scripts/StreamingUnlock.js?v=1.1.1
- Gallery (single, fixed link): https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Tasks/StreamingUnlock.json
- Manual config snippet: https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Tasks/StreamingUnlock.conf

## Import

Recommended: add the Gallery URL in Quantumult X > Tasks > Task Gallery, then add the "流媒体解锁查询" task from the gallery.

Alternative: paste this one line under the **existing** [task_local] section in your configuration (do not add a second [task_local] header):

```ini
event-interaction https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/Scripts/StreamingUnlock.js?v=1.1.1, tag=流媒体解锁查询, img-url=checkmark.seal.system, enabled=true
```

Enable the QuanX tunnel. Long-press the **specific node or policy group** on the home screen and tap "流媒体解锁查询". The resulting native action sheet displays an HTML report. If you run the script without a selected node, it uses built-in **proxy** policy.

### Checks

Apple region, Netflix, Disney+, Max, Prime Video, YouTube Premium, Spotify, TikTok, ChatGPT, Gemini and Instagram Music. The network section shows selected policy path, IPv4/IPv6, ASN, ISP / Organisation, GeoIP and Cloudflare POP.

### Accuracy and security notes

Every probe sends its HTTP request with `$task.fetch` and `opts.policy` set to the selected node or policy. Therefore it measures **that node**, not all of your applications' rule-selected nodes at once.

Service homepages are explicitly marked **网页可达**. Only title-specific playback indicators count as **疑似可用**; neither proves account playback. An HTTP 200 without Instagram audio-licensing information is **无法确认**, never "已解锁". Login, content playback and account-specific availability must be confirmed inside the service app. A request error/timeout does not mean the service is blocked.

This is a detection tool only; no MITM, account login, URL rewrite or rule changes. Cloudflare POP identifies the Cloudflare edge handling the request, not the proxy's data-centre location. IP.SB GeoIP data falls back to ipapi.co.

To update: replace or refresh the existing Quantumult X task and reload its script. The stable gallery URL remains unchanged; versioned script URLs avoid stale client-side caches.
