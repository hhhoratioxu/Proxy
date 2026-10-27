# AI 分流覆盖与订阅

数据核对：**2026-10-28**。六个客户端的 AI 分流统一为 **971 条**，在原有 476 条的基础上新增 **495 条**。本次是 AI 规则内容更新，订阅路径、原生规则格式和使用者已选择的策略保持一致。

## 直接订阅

| 客户端 | 规则集原始地址 |
| --- | --- |
| Loon | [AI.lsr](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Loon/rule/AI.lsr) |
| Egern | [AI.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/rule/AI.yaml) |
| Surge | [AI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Surge/rule/AI.list) |
| Shadowrocket | [AI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Shadowrocket/rule/AI.list) |
| Quantumult X / QuanX | [AI.list](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/QuantumultX/rule/AI.list) |
| Clash | [AI.yaml](https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Clash/rule/AI.yaml) |

已订阅同一地址的用户，在客户端更新远程规则集即可。Clash / Mihomo 使用 `rule-providers`，设置 `behavior: classical`、`format: yaml`，并在 `rules` 引用对应提供者。Quantumult X 在 `[filter_remote]` 绑定 `force-policy`；其他客户端通过各自的远程规则集入口选择策略。

规则文件本身没有节点或策略组名称。国内与海外服务都在同一个 AI 集合中，会使用你为这份集合指定的策略；需要国内直连、某项服务单独选择地区时，把相应的更具体规则放在本集合之前。已有 SiriAI 单独策略时也应先于本集合，否则新增的 Apple Intelligence 专用端点会跟随 AI 策略。

## 覆盖范围

| 类别 | 代表服务 |
| --- | --- |
| 通用助手、模型与搜索 | OpenAI / ChatGPT / Codex / Sora、Claude、Gemini / AI Studio / NotebookLM、Grok、Copilot、Perplexity、Meta AI、Mistral、Cohere、Poe、Character.AI |
| 国内模型与助手 | DeepSeek、通义千问 / Qwen、豆包、Kimi、智谱 / GLM、MiniMax、腾讯元宝 / 混元 / ima、讯飞星火、阶跃、百度文心、秘塔、纳米、面壁 |
| 编程与智能体 | Cursor、Windsurf、Trae、Qoder、Augment、Devin、Kiro、Cline、Kilo、OpenCode、Sourcegraph / Amp、v0、Bolt、Lovable、Dify、Coze、Manus、OpenClaw、n8n、Gumloop、Lindy、Botpress、Voiceflow |
| 图像、视频与 3D | Midjourney、FLUX / BFL、Stable Diffusion、Runway、Pika、Kling、Hailuo、Jimeng / Dreamina、Wan、Vidu、Krea、PixVerse、Higgsfield、Meshy、Hyper3D、CSM、Sloyd、Topaz |
| 语音、音乐与会议 | ElevenLabs、Suno、Udio、Cartesia、Hume、Deepgram、AssemblyAI、Speechmatics、Fish Audio、Otter、Fireflies、Granola、Fathom、Notta、Sembly、Read AI |
| 研究、知识与办公 | Consensus、Elicit、Scite、SciSpace、Scholarcy、Julius、Jenni、Paperpal、ResearchRabbit、ChatPDF、Humata、Anara、Liner、Gamma、Napkin、WPS AI、飞书工作伙伴 |
| 推理、开发基础设施与云 API | Hugging Face、OpenRouter、Groq、Cerebras、Together、Fireworks、Replicate、fal、SiliconFlow、PPIO、Gitee AI、Nebius Token Factory、Lambda、SambaNova、Baseten、Portkey、LiteLLM、Langfuse，以及 AWS / Azure / Google / NVIDIA AI 专用端点 |
| 其他地区 | 保留现有国际服务并合并 `category-ai-ru`，覆盖 Alice、GigaChat、Aiesa 等来源中明确列出的服务 |

以上为代表服务，完整来源与官网索引见 [来源及授权](./AI-Sources.md)。这是截至核对日期尽量全面的合并清单；服务会不断增加、更名和迁移，不能保证收录所有 AI 产品或其全部内部请求。

## 收录边界

- 保留原有 476 条条件及其顺序，新增规则精确去重，并省略已被现有或新增专属后缀覆盖的新条件。没有改变其他 25 类分流内容。
- 递归展开 v2fly 的全部四个 `category-ai-*` 入口及其 31 个来源文件，正确处理 include、属性筛选和 affiliation；结合 VPSDance 的 102 组 provider 定义与 Repcz AI 清单。
- 按官方文档收录 Amazon Bedrock 的 145 个、SageMaker AI 的 143 个明确端点；Vertex AI 使用全球端点和文档列出的 29 个地区端点；Azure 使用 AI 专用命名空间，NVIDIA 使用明确的 NIM / NVCF 服务端点。数量表示规则对象，不表示可用模型数量。
- 没有把整个 GitHub API、Auth0、Stripe、Sentry、AWS、Azure、Google 存储或通用登录域名归入 AI。仅匹配云厂商明确的 AI 服务主机，不以共享云 IP、整段 ASN 或整个云域名代替。
- 对通用平台中有独立 AI 主机的产品，使用如 `ima.qq.com`、`ai.wps.cn`、`aily.feishu.cn`、`jimeng.jianying.com` 的专用主机；没有把整个 QQ、腾讯、WPS、飞书或剪映归入 AI。独立 AI 产品的主域名可能同时覆盖其文档、登录及资源服务。
- 上游新提供的进程规则、宽泛关键词、域名/URL 正则、共享网段不直接移植为六端通用条目。原有 ChatGPT 专用动态端点关键词继续保留。
- 原站更名产生的明确跳转保留旧入口并补充当前专用域名，包括 Unriddle → Anara、Nebius AI Studio → Token Factory。已确认停服的 Relay.app、无法证明是 AI 产品的默认欢迎页及本次未确认归属的新候选不加入。
- Apple Intelligence 仅补充 Apple 官方列出的四个专用主机；不新增 HTTPS 解密配置，也不以分流宣称更改账号、地区或设备资格。

## 验证范围

已检查六端原生格式、YAML 可解析性、规则数量、重复条件、原有匹配保留、跨客户端条件一致性、代表服务和无关流量样例，以及发布后的资源字节。本机 Mihomo Meta v1.19.32 对隔离临时配置中的 rule-provider 引用和全部 971 条内联规则分别通过 `-t` 原生语法检查；这两项检查没有启用流量接管。没有在六款真实客户端逐一导入、登录每家服务或验证全部节点线路；官网能够获取也不代表账号或 API 可用。

来源自动更新不等于本仓库自动合并。本版本记录了固定上游提交；客户端订阅本仓库 `main` 后会按自身刷新周期获取后续已发布版本。
