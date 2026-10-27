# AI 分流来源、官网索引与授权

核对日期：**2026-10-28**。本次以仓库 `383a7168e5a70b2749dd9128defc9c5a67cc0cd0` 的原有 AI 规则为基础，生成六端各 971 条条件。订阅及收录边界见 [AI 分流说明](./AI-Routing.md)。

## 固定上游版本

| 来源 | 提交 | 提交日期 UTC | 授权 |
| --- | --- | --- | --- |
| [v2fly/domain-list-community](https://github.com/v2fly/domain-list-community/tree/1b81d3cd34096e5d8cac6bca5935e80f30e990f0) | `1b81d3cd34096e5d8cac6bca5935e80f30e990f0` | 2026-10-27 | MIT |
| [VPSDance/ai-proxy-rules](https://github.com/VPSDance/ai-proxy-rules/tree/ecc2c57b3eef1386b70f5b943aba504706969709) | `ecc2c57b3eef1386b70f5b943aba504706969709` | 2026-10-27 | MIT |
| [Repcz/Tool](https://github.com/Repcz/Tool/tree/8e35d49e060b26ffd50e36be99b53be972b6aaef) | `8e35d49e060b26ffd50e36be99b53be972b6aaef` | 2026-10-27 | MIT |

v2fly 展开 `category-ai-!cn`、兼容入口 `category-ai-chat-!cn`、`category-ai-cn`、`category-ai-ru`，包括递归 include 与目标 affiliation；VPSDance 使用 `data/providers/*.yaml` 的原始服务定义；Repcz 对照 `Loon/Rules/AI.list` 与 `Surge/Custom/AI.list`。仅把适合本集合范围、能够由六端原生域名规则表达的新增条件加入。

## 社区 provider 索引

以下是本次核对的 102 组 VPSDance 定义，不是“新增 102 家服务”的计数；其中多数已有基础域名。一个服务可能有多个品牌、别名、地区端点，不能用域名条数推算产品总数。

| 服务定义 | 固定版本来源 |
| --- | --- |
| Adobe Firefly | [adobe-firefly](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/adobe-firefly.yaml) |
| Alibaba AI | [alibaba-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/alibaba-ai.yaml) |
| Amazon Q Developer | [amazon-q](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/amazon-q.yaml) |
| Anthropic | [anthropic](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/anthropic.yaml) |
| Augment Code | [augment-code](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/augment-code.yaml) |
| Baidu AI | [baidu-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/baidu-ai.yaml) |
| Black Forest Labs | [black-forest-labs](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/black-forest-labs.yaml) |
| Bolt.new | [bolt](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/bolt.yaml) |
| ByteDance AI (China) | [bytedance-ai-cn](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/bytedance-ai-cn.yaml) |
| ByteDance AI | [bytedance-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/bytedance-ai.yaml) |
| Cerebras | [cerebras](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/cerebras.yaml) |
| Character.AI | [character-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/character-ai.yaml) |
| Chutes | [chutes](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/chutes.yaml) |
| Civitai | [civitai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/civitai.yaml) |
| Cline | [cline](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/cline.yaml) |
| ClipDrop | [clipdrop](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/clipdrop.yaml) |
| Cloudflare AI | [cloudflare-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/cloudflare-ai.yaml) |
| CodeRabbit | [coderabbit](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/coderabbit.yaml) |
| Cohere | [cohere](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/cohere.yaml) |
| ComfyUI | [comfyui](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/comfyui.yaml) |
| Command Code | [command-code](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/command-code.yaml) |
| Continue | [continue](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/continue.yaml) |
| Copilot | [copilot](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/copilot.yaml) |
| CrewAI | [crewai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/crewai.yaml) |
| Cursor | [cursor](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/cursor.yaml) |
| DeepInfra | [deepinfra](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/deepinfra.yaml) |
| DeepSeek | [deepseek](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/deepseek.yaml) |
| Descript | [descript](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/descript.yaml) |
| Devin | [devin](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/devin.yaml) |
| Dia Browser | [dia-browser](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/dia-browser.yaml) |
| Dify | [dify](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/dify.yaml) |
| DuckDuckGo AI | [duck-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/duck-ai.yaml) |
| Eigent | [eigent](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/eigent.yaml) |
| ElevenLabs | [elevenlabs](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/elevenlabs.yaml) |
| Factory | [factory](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/factory.yaml) |
| Fireworks AI | [fireworks-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/fireworks-ai.yaml) |
| Gamma | [gamma](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/gamma.yaml) |
| Genspark | [genspark](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/genspark.yaml) |
| Google AI | [google-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/google-ai.yaml) |
| Grammarly | [grammarly](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/grammarly.yaml) |
| Groq | [groq](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/groq.yaml) |
| H2O.ai | [h2o-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/h2o-ai.yaml) |
| Hermes Agent | [hermes-agent](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/hermes-agent.yaml) |
| HeyGen | [heygen](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/heygen.yaml) |
| Hugging Face | [huggingface](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/huggingface.yaml) |
| Ideogram | [ideogram](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/ideogram.yaml) |
| Inflection / Pi | [inflection](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/inflection.yaml) |
| Jasper | [jasper](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/jasper.yaml) |
| JetBrains AI | [jetbrains-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/jetbrains-ai.yaml) |
| Kilo | [kilo](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/kilo.yaml) |
| Kiro | [kiro](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/kiro.yaml) |
| LangChain | [langchain](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/langchain.yaml) |
| Leonardo AI | [leonardo-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/leonardo-ai.yaml) |
| LMArena | [lmarena](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/lmarena.yaml) |
| LM Studio | [lmstudio](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/lmstudio.yaml) |
| Lovable | [lovable](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/lovable.yaml) |
| Lovart | [lovart](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/lovart.yaml) |
| Luma AI | [luma-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/luma-ai.yaml) |
| Manus | [manus](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/manus.yaml) |
| Meta AI | [meta-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/meta-ai.yaml) |
| Midjourney | [midjourney](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/midjourney.yaml) |
| MiniMax | [minimax](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/minimax.yaml) |
| Mistral AI | [mistral-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/mistral-ai.yaml) |
| ModelScope | [modelscope](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/modelscope.yaml) |
| Moonshot AI | [moonshot-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/moonshot-ai.yaml) |
| Novita AI | [novita-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/novita-ai.yaml) |
| Ollama | [ollama](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/ollama.yaml) |
| OpenAI | [openai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/openai.yaml) |
| OpenArt | [openart](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/openart.yaml) |
| OpenClaw | [openclaw](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/openclaw.yaml) |
| OpenCode | [opencode](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/opencode.yaml) |
| OpenRouter | [openrouter](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/openrouter.yaml) |
| Otter.ai | [otter-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/otter-ai.yaml) |
| Perplexity | [perplexity](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/perplexity.yaml) |
| Phind | [phind](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/phind.yaml) |
| Pika | [pika](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/pika.yaml) |
| Poe | [poe](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/poe.yaml) |
| PPIO | [ppio](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/ppio.yaml) |
| Qoder | [qoder](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/qoder.yaml) |
| Recraft | [recraft](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/recraft.yaml) |
| Replicate | [replicate](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/replicate.yaml) |
| Replit | [replit](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/replit.yaml) |
| Runway | [runway](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/runway.yaml) |
| SiliconFlow | [siliconflow](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/siliconflow.yaml) |
| Sourcegraph | [sourcegraph](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/sourcegraph.yaml) |
| Stability AI | [stability-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/stability-ai.yaml) |
| StepFun | [stepfun](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/stepfun.yaml) |
| Suno | [suno](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/suno.yaml) |
| Synthesia | [synthesia](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/synthesia.yaml) |
| Tabnine | [tabnine](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/tabnine.yaml) |
| Tencent AI | [tencent-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/tencent-ai.yaml) |
| Together AI | [together-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/together-ai.yaml) |
| Udio | [udio](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/udio.yaml) |
| v0 | [v0](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/v0.yaml) |
| Volcengine AI | [volcengine-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/volcengine-ai.yaml) |
| Windsurf | [windsurf](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/windsurf.yaml) |
| xAI | [x-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/x-ai.yaml) |
| Xiaomi AI | [xiaomi-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/xiaomi-ai.yaml) |
| You.com | [you](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/you.yaml) |
| YouMind | [youmind](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/youmind.yaml) |
| Zed | [zed](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/zed.yaml) |
| Zhipu AI | [zhipu-ai](https://github.com/VPSDance/ai-proxy-rules/blob/ecc2c57b3eef1386b70f5b943aba504706969709/data/providers/zhipu-ai.yaml) |

## 补充官网与迁移入口

本表记录用于核对的官网或官方文档。站点可能对自动请求返回验证码或限制，必要时以其官方文档确认身份；这不是服务登录或可用性测试。重定向只补充对应产品的新专用主机，不添加通用身份认证主机。

| 分类 | 服务 | 官方来源 |
| --- | --- | --- |
| 研究与知识 | Consensus | [官方页面](https://consensus.app/) |
| 研究与知识 | Elicit | [官方页面](https://elicit.com/) |
| 研究与知识 | Scite | [官方页面](https://scite.ai/) |
| 研究与知识 | SciSpace | [官方页面](https://scispace.com/literature-review) |
| 研究与知识 | Scholarcy | [官方页面](https://www.scholarcy.com/) |
| 研究与知识 | Explainpaper | [官方页面](https://www.explainpaper.com/) |
| 研究与知识 | ResearchRabbit | [官方页面](https://www.researchrabbit.ai/) |
| 研究与知识 | Connected Papers | [官方页面](https://www.connectedpapers.com/) |
| 研究与知识 | Julius AI | [官方页面](https://julius.ai/) |
| 研究与知识 | Jenni AI | [官方页面](https://jenni.ai/) |
| 研究与知识 | Paperpal | [官方页面](https://paperpal.com/) |
| 研究与知识 | Trinka | [官方页面](https://www.trinka.ai/) |
| 研究与知识 | ChatPDF | [官方页面](https://www.chatpdf.com/) |
| 研究与知识 | Humata | [官方页面](https://www.humata.ai/) |
| 研究与知识 | Unriddle | [官方页面](https://www.unriddle.ai/) |
| 研究与知识 | SciSummary | [官方页面](https://scisummary.com/) |
| 研究与知识 | Glasp | [官方页面](https://glasp.co/) |
| 研究与知识 | NotebookLM | [官方页面](https://notebooklm.google.com/) |
| 研究与知识 | Napkin AI | [官方页面](https://www.napkin.ai/) |
| 研究与知识 | Presentations AI | [官方页面](https://www.presentations.ai/) |
| 研究与知识 | Gamma | [官方页面](https://gamma.app/) |
| 研究与知识 | Beautiful AI | [官方页面](https://www.beautiful.ai/) |
| 写作与助手 | Monica | [官方页面](https://monica.im/) |
| 写作与助手 | Merlin | [官方页面](https://www.getmerlin.in/) |
| 写作与助手 | Glarity | [官方页面](https://glarity.app/) |
| 写作与助手 | TextCortex | [官方页面](https://textcortex.com/) |
| 写作与助手 | Anyword | [官方页面](https://anyword.com/) |
| 写作与助手 | Sudowrite | [官方页面](https://www.sudowrite.com/) |
| 写作与助手 | Novelcrafter | [官方页面](https://www.novelcrafter.com/) |
| 写作与助手 | HyperWrite | [官方页面](https://www.hyperwriteai.com/) |
| 写作与助手 | Wordtune | [官方页面](https://www.wordtune.com/) |
| 写作与助手 | QuillBot | [官方页面](https://quillbot.com/) |
| 写作与助手 | Writesonic | [官方页面](https://writesonic.com/) |
| 写作与助手 | Rytr | [官方页面](https://rytr.me/) |
| 写作与助手 | Jasper | [官方页面](https://www.jasper.ai/) |
| 写作与助手 | Copy AI | [官方页面](https://www.copy.ai/) |
| 写作与助手 | Reka | [官方页面](https://www.reka.ai/) |
| 写作与助手 | Character AI | [官方页面](https://character.ai/) |
| 写作与助手 | Poe | [官方页面](https://poe.com/) |
| 图像与视频 | Krea | [官方页面](https://www.krea.ai/) |
| 图像与视频 | PixVerse | [官方页面](https://pixverse.ai/) |
| 图像与视频 | Higgsfield | [官方页面](https://higgsfield.ai/) |
| 图像与视频 | Haiper | [官方页面](https://haiper.ai/) |
| 图像与视频 | Kaiber | [官方页面](https://kaiber.ai/) |
| 图像与视频 | SeaArt | [官方页面](https://www.seaart.ai/) |
| 图像与视频 | PixAI | [官方页面](https://pixai.art/) |
| 图像与视频 | NightCafe | [官方页面](https://nightcafe.studio/) |
| 图像与视频 | Artbreeder | [官方页面](https://www.artbreeder.com/) |
| 图像与视频 | getimg | [官方页面](https://getimg.ai/) |
| 图像与视频 | Mage | [官方页面](https://www.mage.space/) |
| 图像与视频 | Playground | [官方页面](https://playground.com/) |
| 图像与视频 | DomoAI | [官方页面](https://domoai.app/) |
| 图像与视频 | Viggle | [官方页面](https://viggle.ai/) |
| 图像与视频 | Topaz Labs | [官方页面](https://www.topazlabs.com/) |
| 图像与视频 | Lets Enhance | [官方页面](https://letsenhance.io/) |
| 图像与视频 | Upscale Media | [官方页面](https://www.upscale.media/) |
| 图像与视频 | Meshy | [官方页面](https://www.meshy.ai/) |
| 图像与视频 | Hyper3D | [官方页面](https://hyper3d.ai/) |
| 图像与视频 | Sloyd | [官方页面](https://www.sloyd.ai/) |
| 图像与视频 | Common Sense Machines | [官方页面](https://docs.csm.ai/) |
| 图像与视频 | LTX | [官方页面](https://ltx.studio/) |
| 图像与视频 | Vidu | [官方页面](https://www.vidu.com/) |
| 图像与视频 | Wan | [官方页面](https://wan.video/) |
| 图像与视频 | Dreamina | [官方页面](https://dreamina.capcut.com/) |
| 图像与视频 | Jimeng | [官方页面](https://jimeng.jianying.com/) |
| 图像与视频 | Kling | [官方页面](https://klingai.com/) |
| 图像与视频 | Hailuo | [官方页面](https://hailuoai.video/) |
| 图像与视频 | fal | [官方页面](https://fal.ai/) |
| 语音与会议 | Cartesia | [官方页面](https://cartesia.ai/) |
| 语音与会议 | Hume | [官方页面](https://www.hume.ai/) |
| 语音与会议 | Rime | [官方页面](https://www.rime.ai/) |
| 语音与会议 | Resemble | [官方页面](https://www.resemble.ai/) |
| 语音与会议 | Respeecher | [官方页面](https://www.respeecher.com/) |
| 语音与会议 | Murf | [官方页面](https://murf.ai/) |
| 语音与会议 | WellSaid | [官方页面](https://www.wellsaid.io/) |
| 语音与会议 | Speechify | [官方页面](https://speechify.com/) |
| 语音与会议 | Kits AI | [官方页面](https://www.kits.ai/) |
| 语音与会议 | Voicemod | [官方页面](https://www.voicemod.net/) |
| 语音与会议 | Fish Audio | [官方页面](https://fish.audio/) |
| 语音与会议 | Deepgram | [官方页面](https://deepgram.com/) |
| 语音与会议 | AssemblyAI | [官方页面](https://www.assemblyai.com/) |
| 语音与会议 | Speechmatics | [官方页面](https://www.speechmatics.com/) |
| 语音与会议 | Fathom | [官方页面](https://fathom.video/) |
| 语音与会议 | Fireflies | [官方页面](https://fireflies.ai/) |
| 语音与会议 | Granola | [官方页面](https://www.granola.ai/) |
| 语音与会议 | tl;dv | [官方页面](https://tldv.io/) |
| 语音与会议 | Notta | [官方页面](https://www.notta.ai/) |
| 语音与会议 | Sembly | [官方页面](https://www.sembly.ai/) |
| 语音与会议 | Avoma | [官方页面](https://www.avoma.com/) |
| 语音与会议 | Read AI | [官方页面](https://www.read.ai/) |
| 智能体与工作流 | Lindy | [官方页面](https://www.lindy.ai/) |
| 智能体与工作流 | Gumloop | [官方页面](https://www.gumloop.com/) |
| 智能体与工作流 | Relevance AI | [官方页面](https://relevanceai.com/) |
| 智能体与工作流 | Dust | [官方页面](https://dust.tt/) |
| 智能体与工作流 | Stack AI | [官方页面](https://www.stack-ai.com/) |
| 智能体与工作流 | Flowise | [官方页面](https://flowiseai.com/) |
| 智能体与工作流 | Langflow | [官方页面](https://www.langflow.org/) |
| 智能体与工作流 | n8n | [官方页面](https://n8n.io/) |
| 智能体与工作流 | Chatbase | [官方页面](https://www.chatbase.co/) |
| 智能体与工作流 | Botpress | [官方页面](https://botpress.com/) |
| 智能体与工作流 | Voiceflow | [官方页面](https://www.voiceflow.com/) |
| 智能体与工作流 | Dify | [官方页面](https://dify.ai/) |
| 智能体与工作流 | Smithery | [官方页面](https://smithery.ai/) |
| 智能体与工作流 | Composio | [官方页面](https://composio.dev/) |
| 开发与模型基础设施 | Portkey | [官方页面](https://portkey.ai/) |
| 开发与模型基础设施 | LiteLLM | [官方页面](https://www.litellm.ai/) |
| 开发与模型基础设施 | Helicone | [官方页面](https://www.helicone.ai/) |
| 开发与模型基础设施 | Langfuse | [官方页面](https://langfuse.com/) |
| 开发与模型基础设施 | Braintrust | [官方页面](https://www.braintrust.dev/) |
| 开发与模型基础设施 | Arize | [官方页面](https://arize.com/) |
| 开发与模型基础设施 | Baseten | [官方页面](https://www.baseten.co/) |
| 开发与模型基础设施 | Lepton | [官方页面](https://www.lepton.ai/) |
| 开发与模型基础设施 | Nebius AI Studio | [官方页面](https://studio.nebius.ai/) |
| 开发与模型基础设施 | Lambda | [官方页面](https://lambda.ai/) |
| 开发与模型基础设施 | RunPod | [官方页面](https://www.runpod.io/) |
| 开发与模型基础设施 | Vast | [官方页面](https://vast.ai/) |
| 开发与模型基础设施 | Crusoe | [官方页面](https://www.crusoecloud.com/) |
| 开发与模型基础设施 | SambaNova | [官方页面](https://sambanova.ai/) |
| 开发与模型基础设施 | Cerebrium | [官方页面](https://www.cerebrium.ai/) |
| 开发与模型基础设施 | Friendli | [官方页面](https://friendli.ai/) |
| 开发与模型基础设施 | Featherless | [官方页面](https://featherless.ai/) |
| 开发与模型基础设施 | Parasail | [官方页面](https://www.parasail.io/) |
| 开发与模型基础设施 | Inference Net | [官方页面](https://inference.net/) |
| 开发与模型基础设施 | Hyperbolic | [官方页面](https://hyperbolic.xyz/) |
| 开发与模型基础设施 | Gitee AI | [官方页面](https://ai.gitee.com/) |
| 开发与模型基础设施 | Baidu AI Studio | [官方页面](https://aistudio.baidu.com/) |
| 开发与模型基础设施 | NVIDIA API Catalog | [官方页面](https://build.nvidia.com/) |
| 国内 AI | 商汤日日新 | [官方页面](https://www.sensenova.cn/) |
| 国内 AI | 面壁智能 | [官方页面](https://www.modelbest.cn/) |
| 国内 AI | 无问芯穹 | [官方页面](https://www.infini-ai.com/) |
| 国内 AI | 腾讯 ima | [官方页面](https://ima.qq.com/) |
| 国内 AI | 腾讯乐享知识库 | [官方页面](https://lexiangla.com/) |
| 国内 AI | 讯飞智文 | [官方页面](https://zhiwen.xfyun.cn/) |
| 国内 AI | 讯飞听见 | [官方页面](https://www.iflyrec.com/) |
| 国内 AI | 讯飞智作 | [官方页面](https://peiyin.xunfei.cn/) |
| 国内 AI | 网易天音 | [官方页面](https://tianyin.163.com/) |
| 国内 AI | 网易外贸通 AI | [官方页面](https://ai.youdao.com/) |
| 国内 AI | 百度橙篇 | [官方页面](https://cp.baidu.com/) |
| 国内 AI | WPS 灵犀 | [官方页面](https://lingxi.wps.cn/) |
| 国内 AI | WPS AI | [官方页面](https://ai.wps.cn/) |
| 国内 AI | 钉钉 AI | [官方页面](https://ai.dingtalk.com/) |
| 国内 AI | 飞书 Aily | [官方页面](https://aily.feishu.cn/hc/1u7kleqg_jsmwydi4) |
| 国内 AI | 有道子曰 | [官方页面](https://ai.youdao.com/) |
| 国内 AI | 笔格 AIPPT | [官方页面](https://www.aippt.cn/) |
| 国内 AI | AiPPT | [官方页面](https://www.aippt.com/) |
| 国内 AI | Decktopus | [官方页面](https://www.decktopus.com/) |
| 国内 AI | 讯飞星辰 | [官方页面](https://agent.xfyun.cn/) |
| 开发与模型基础设施 | Apple Intelligence / Private Cloud Compute | [官方页面](https://support.apple.com/en-us/101555) |
| 研究与知识 | Liner | [官方页面](https://liner.com/about) |
| 国内 AI | 讯飞绘文 | [官方页面](https://turbodesk.xfyun.cn/client) |
| 开发与模型基础设施 | iFlyCode | [官方页面](https://www.xfyun.cn/solutions/iflycode) |
| 国内 AI | 讯飞星火 | [官方页面](https://spark.xfyun.cn/pricing) |
| 开发与模型基础设施 | NVIDIA NIM | [官方页面](https://docs.nvidia.com/nim-operator/latest/guardrail.html) |
| 开发与模型基础设施 | NVIDIA AI API | [官方页面](https://docs.nvidia.com/nemo/retriever/25.4.2/extraction/api-docs/_modules/nv_ingest_api/internal/primitives/nim/model_interface/helpers.html) |
| 语音与会议 | NVIDIA hosted speech | [官方页面](https://docs.nvidia.com/nemo/labs-voice-agent/build-voice-agents/model-serving/nvidia-nim-riva) |

## 云端点依据

- [Amazon Bedrock](https://docs.aws.amazon.com/general/latest/gr/bedrock.html)。
- [Amazon SageMaker AI](https://docs.aws.amazon.com/general/latest/gr/sagemaker.html)。
- [Google Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)。
- [Microsoft Foundry](https://learn.microsoft.com/en-us/azure/ai-services/reference/sdk-package-resources)。
- [Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-studio/ai-services/concepts/endpoints)。

## 未直接合并的新增候选

拒绝将通用基础设施根域名、通用身份验证、全云网段、整段 ASN 和跨应用进程规则直接归入 AI；对无法共同表达的 HTTP 正则和含义过宽的关键词不擅自转换。去重和排除只针对本次新增候选，原有用户条件保留。部分具体例子：`api.github.com`、`api.cloudflare.com`、`storage.googleapis.com`、`auth0.com`、`stripe.com`、`sentry.io`、`awsapps.com`、DigitalOcean 的共享 ASN 和 IPv6 网段。

已关闭的 `relay.app` 不加入；`getliner.com` 返回 Gone，改用官方 `liner.com`；`a.cnki.net` 返回通用欢迎页，未据此认定为知网 AI；`huiwen.cn` 未确认，改用讯飞官方 `turbodesk.xfyun.cn`。`play.ai`、`lovo.ai`、`lambda.cloud` 等新候选在本次未取得足够的有效官方内容，暂不扩大新增匹配；这不表示服务一定停服。

## MIT 授权原文

以下保留本次引用的三个规则源的版权及许可声明；仓库其他项目及图片的授权不因此变更。

### v2fly/domain-list-community

```text
MIT License

Copyright (c) 2018-2019 V2Ray

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### VPSDance/ai-proxy-rules

```text
MIT License

Copyright (c) 2026 VPSDance

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Repcz/Tool

```text
MIT License

Copyright (c) 2024 Repcz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

