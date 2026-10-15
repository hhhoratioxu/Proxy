import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
const root = new URL('./',import.meta.url);
const pin = process.argv[2] || 'RUNTIME_COMMIT';
if(pin!=='RUNTIME_COMMIT'&&!/^[0-9a-f]{40}$/.test(pin))throw Error('invalid runtime pin');
const raw = 'https://raw.githubusercontent.com/hhhoratioxu/Proxy';
const repo = 'https://github.com/hhhoratioxu/Proxy';
const defaults={TRANSLATION_ENABLED:'true',TARGET_LANGUAGE:'zh-CN',FALLBACK_PROVIDER:'auto',DISCOVER_MISSING:'true'};
const args=Object.entries(defaults).map(([k,v])=>`${k}=${v}`).join('&');
// No commas in the pattern: Surge/Shadowrocket script options are comma-delimited.
// The core still enforces the original upper bounds on context/device paths.
const pattern=String.raw`^https://(?:spclient\.wg|[a-z0-9-]+-spclient)\.spotify\.com(?::443)?/(?:color-lyrics/v2/track/[0-9A-Za-z]{22}(?:/image/[^?#\s]+)?/?|metadata/4/track/[0-9a-f]{32}|extended-metadata/v0/extended-metadata/?|scrollsita/v1/scroll/spotify(?::|%3[aA])track(?::|%3[aA])[0-9A-Za-z]{22}/?|user-customization-service/v1/customize/?|bootstrap/v1/bootstrap/?|v1/customize/?|context-resolve/v1/spotify(?::|%3[aA])[^?#\s/]+/?|connect-state/v1/devices/[0-9A-Za-z_-]{16}[0-9A-Za-z_-]*/?)(?:\?.*)?$`;
const clients=['Surge','Loon','Shadowrocket','QuantumultX'];
const names={Surge:'Surge',Loon:'Loon',Shadowrocket:'Shadowrocket',QuantumultX:'Quantumult X'};
const ext={Surge:'sgmodule',Loon:'plugin',Shadowrocket:'sgmodule',QuantumultX:'conf'};
const entry=c=>`${raw}/main/${c}/script/SpotifyLyrics.${ext[c]}`;
function write(path,content){const u=new URL('./publish/'+path,root);mkdirSync(new URL('./',u),{recursive:true});writeFileSync(u,content);}
for(const c of clients){
  const script=`${raw}/${pin}/${c}/script/SpotifyLyrics.js`;
  let config=`#!name = Spotify 双语歌词 · VerseLyrics\n#!desc = 核心 0.4.1 · 适配 1。使用插件译文替换官方译文；官方无词歌曲仍可能不显示，本次未修复该问题。需 HTTPS 解密。\n#!author = Horatio Xu\n#!homepage = ${repo}/blob/main/${c}/Docs/SpotifyLyrics.md\n`;
  if(c==='Loon'){
    config+=`#!loon_version = 3.5.1(983)\n#!date = 2026-10-16\n\n[Argument]\nTRANSLATION_ENABLED = switch,true,type=boolean,tag=歌词翻译,desc=开启后用插件译文替换官方译文\nTARGET_LANGUAGE = select,"zh-CN","zh-TW","en","ja","ko",type=string,tag=翻译目标语言\nFALLBACK_PROVIDER = select,"auto","lrclib","qq","netease","off",type=string,tag=备用歌词来源\nDISCOVER_MISSING = switch,true,type=boolean,tag=尝试补充无词入口,desc=已知部分官方无词歌曲仍不显示\n\n[Script]\n`;
    const action=`script("${script}", {\${TRANSLATION_ENABLED}, \${TARGET_LANGUAGE}, \${FALLBACK_PROVIDER}, \${DISCOVER_MISSING}})`;
    const regex=pattern.replaceAll('/','\\/');
    config+=`request if \${url} ~= /${regex}/ then ${action} with tag="VerseLyrics 请求", timeout=3\nresponse if \${url} ~= /${regex}/ then ${action} with tag="VerseLyrics 歌词", timeout=25, requires_body=true, binary_body_mode=true\n\n[Mitm]\nhostname = spclient.wg.spotify.com, *-spclient.spotify.com\n`;
  }else if(c==='QuantumultX'){
    config+=`# 建议 Quantumult X build 934+（使用独立脚本参数并关闭自动 Cookie）。\n# 添加到 重写 > 引用。空响应体不会触发 script-response-body。\n# 两个 URL 的 # 参数保持一致；翻译目标可改为 zh-TW。\nhostname = spclient.wg.spotify.com, *-spclient.spotify.com\n${pattern} url script-request-header ${script}#${args}\n${pattern} url script-response-body ${script}#${args}\n`;
  }else{
    config+=`# ${c==='Surge'?'建议 Surge iOS 5.9.0+ / Mac 5.5.0+。':'使用当前版本 Shadowrocket。'}\n# 改设置时同步修改两条 Script 的 argument；翻译目标可改为 zh-TW。\n`;
    if(c==='Shadowrocket')config+='\n[General]\nforce-http-engine-hosts = %APPEND% spclient.wg.spotify.com, *-spclient.spotify.com\n';
    config+=`\n[Script]\nVerseLyrics-Request = type=http-request,pattern=${pattern},script-path=${script},timeout=3,argument=${args}\nVerseLyrics-Response = type=http-response,pattern=${pattern},script-path=${script},requires-body=true,binary-body-mode=true,max-size=2097152,timeout=25,argument=${args}\n\n[MITM]\nhostname = %APPEND% spclient.wg.spotify.com, *-spclient.spotify.com\n`;
  }
  write(`${c}/script/SpotifyLyrics.${ext[c]}`,config);
  let intro={Surge:'在 Surge「模块」中添加远程模块，粘贴上面的地址并启用。建议 Surge iOS 5.9.0+ / Mac 5.5.0+。',Shadowrocket:'在 Shadowrocket 当前配置的「模块」中添加上面的远程地址并启用。使用当前版本的 Shadowrocket。',Loon:'在 Loon「插件」中添加上面的远程地址并启用。需要 Loon 3.5.1（983）或更新版本。',QuantumultX:'在 Quantumult X「重写 → 引用」中添加上面的地址并启用。建议 build 934 或更新版本；旧版自动 Cookie 行为不同。'}[c];
  let settings=c==='Loon'?'可以直接在插件参数中调整上述四项设置。':c==='QuantumultX'?'如需繁体中文或指定来源，将资源保存为本地重写后，同步修改两条脚本 URL 的 `#` 参数。例如把两处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。':'如需繁体中文或指定来源，将模块保存为本地副本后，同步修改两条 `[Script]` 的 `argument=` 参数。例如把两处 `TARGET_LANGUAGE=zh-CN` 改为 `TARGET_LANGUAGE=zh-TW`；无需编辑 JS。';
  const qx=c==='QuantumultX'?'\nQuantumult X 的响应体重写在原响应体为空时不会执行，所以空体 404 无法经这一入口补词。这是本版本额外的客户端限制；不会通过拦截所有正常请求来伪造成功。\n':'';
  const api={Surge:'[HTTP Response Script](https://manual.nssurge.com/scripting/http-response.html) · [HTTP / Storage API](https://manual.nssurge.com/scripting/api.html)',Loon:'[Script 语法](https://nsloon.app/docs/Script/script_v2/) · [Script API](https://nsloon.app/docs/Script/script_api/)',Shadowrocket:'[开发者网站](https://shadowlaunch.com/)；使用 Shadowrocket 的模块与脚本兼容接口，尚未在客户端完成导入或播放验证。',QuantumultX:'[官方二进制脚本示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js) · [官方 HTTP 示例](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-task.js) · [空响应体限制](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf#L290)'}[c];
  write(`${c}/Docs/SpotifyLyrics.md`,`# Spotify 双语歌词 · VerseLyrics · ${names[c]}\n\n核心 **0.4.1**，客户端适配 **1**。在 Spotify 原生歌词结构中写入插件译文，保留原词、时间轴及排版。\n\n**已知问题：官方原本没有歌词的歌曲，仍可能完全不显示歌词。用户在 Egern / iOS Spotify 9.1.92.3058 已反馈此问题未解决；本次发布移植了相同核心，没有把移植视为修复。**\n\n## 安装\n\n[SpotifyLyrics.${ext[c]} 原始地址](${entry(c)})\n\n1. ${intro}\n2. 使用已安装、信任并开启的 HTTPS 解密证书。仅加入 \`spclient.wg.spotify.com\` 和 \`*-spclient.spotify.com\`。\n3. 同时只启用一个 Spotify 歌词处理插件，重新加载代理配置并重新打开 Spotify。\n\n客户端自动下载固定版本运行脚本，只需安装这个入口文件。无需下载源码、运行测试、查看诊断或开启通知。\n\n## 设置\n\n| 参数 | 默认值 | 作用 |\n| --- | --- | --- |\n| \`TRANSLATION_ENABLED\` | \`true\` | 以插件译文替换全部官方译文列表 |\n| \`TARGET_LANGUAGE\` | \`zh-CN\` | 默认简体；\`zh-TW\` 繁体、\`en\` 英文、\`ja\` 日文、\`ko\` 韩文 |\n| \`FALLBACK_PROVIDER\` | \`auto\` | 无词时依次尝试 LRCLIB、QQ 音乐、网易云；可选 \`lrclib\` / \`qq\` / \`netease\` / \`off\` |\n| \`DISCOVER_MISSING\` | \`true\` | 尝试适配原生入口，不保证客户端发起歌词请求 |\n\n${settings}\n\n翻译开启后，不回填 Spotify 官方译文；翻译服务失败时保留原词，移除官方译文。关闭插件翻译则保留官方响应。补源严格核对歌名、艺人、专辑和时长；来源没有收录时不能凭空补全歌词。\n\n## 当前验证范围\n\n四种客户端接口模拟测试与 0.4.1 核心回归通过，覆盖 JSON / Protobuf、替换译文、共享缓存、二进制 HTTP 与错误透传。没有完成四种客户端的实际导入和 iPhone Spotify 播放验证。\n${qx}\n脚本不写入或记录 Spotify 授权令牌；仅在同一 Spotify 服务域名查询元数据时使用当前请求授权。歌词来源收到歌曲信息，Google 翻译服务收到待翻译歌词文本。没有诊断通知或定时监测。\n\n## 运行版本与接口\n\n[固定运行脚本](${script}) · [适配源码与构建记录](${repo}/tree/${pin}/Surge/Development/VerseLyricsPorts)\n\n原始核心和适配逻辑为独立编写。Unicode Unihan 数据许可随运行脚本完整附带。${api}\n\n[其他客户端](../../README.md) · [返回 ${names[c]}](../README.md)\n`);
  let readme=readFileSync(new URL(`./base/${c}/README.md`,root),'utf8');
  const row=`| Spotify 双语歌词 · VerseLyrics | [SpotifyLyrics.${ext[c]}](${entry(c)}) | [设置与已知限制](./Docs/SpotifyLyrics.md) |\n`;
  readme=readme.replace('| --- | --- | --- |\n','| --- | --- | --- |\n'+row);
  if(c==='QuantumultX')readme=readme.replace('美团外卖 `.conf`','Spotify 歌词及美团外卖 `.conf`');
  if(c==='Surge')readme=readme.replace('美团外卖模块需要','Spotify 歌词和美团外卖模块需要');
  write(`${c}/README.md`,readme);
}
let readme=readFileSync(new URL('./base/README.md',root),'utf8');
const row = c=>`| ${names[c]} | [SpotifyLyrics.${ext[c]}](${entry(c)}) | [说明](./${c}/Docs/SpotifyLyrics.md) |`;
const table=`\n## Spotify 双语歌词 · VerseLyrics\n\n核心 0.4.1，新增四客户端适配 1。**官方无词歌曲仍可能不显示，本次多客户端发布没有修复该问题。**\n\n| 客户端 | 安装入口 | 设置与限制 |\n| --- | --- | --- |\n| Egern | [SpotifyLyrics.yaml](${raw}/main/Egern/script/SpotifyLyrics.yaml) | [说明](./Egern/Docs/SpotifyLyrics.md) |\n${clients.map(row).join('\n')}\n| Clash / Mihomo | 无可用的响应体脚本插件 | [能力说明](./Clash/Docs/SpotifyLyrics.md) |\n\n`;
readme=readme.replace('每个插件只保留一个当前安装入口。',table+'每个插件只保留一个当前安装入口。');
readme=readme.replace('Each plugin has one current installation entry.','VerseLyrics now has Egern, Surge, Loon, Shadowrocket and Quantumult X entries listed above. The missing-lyrics issue remains unresolved; these ports do not claim to fix it.\n\nEach plugin has one current installation entry.');
write('README.md',readme);
write('Clash/Docs/SpotifyLyrics.md',`# Spotify 歌词与 Clash / Mihomo\n\nVerseLyrics 需要读取并改写 Spotify HTTPS 响应中的 JSON / Protobuf 歌词。Clash / Mihomo 本身不提供这种 HTTPS 解密加 JavaScript 响应体改写接口，Clash Verge Rev 扩展脚本用于生成配置，不能当作歌词处理器。因此本仓库不提供一个只导入配置却不能补词的 Clash 版本。\n\n可用安装入口见[仓库首页的五客户端表](../../README.md#spotify-双语歌词--verselyrics)。这些版本仍有官方无词歌曲不显示的已知问题。\n\n依据：[Mihomo 配置文档](https://wiki.metacubex.one/config/)。\n\n[返回 Clash](../README.md)\n`);
let clash=readFileSync(new URL('./base/Clash/README.md',root),'utf8');
clash=clash.replace('共用图标及导入入口：','[Spotify 歌词插件能力说明](./Docs/SpotifyLyrics.md)：Clash / Mihomo 无响应体脚本版本；其他客户端入口见说明。\n\n共用图标及导入入口：');
write('Clash/README.md',clash);
// Correct the existing user's failure status alongside the new port release.
let egern=readFileSync(new URL('./base/Egern/Docs/SpotifyLyrics.md',root),'utf8');
egern=egern.replace('0.4.1 已完成本地协议和真实歌词来源检查，但手机上官方无词歌曲的最终显示尚未取得成功实机证据，不能承诺所有歌曲都显示。','0.4.1 已完成本地协议和真实歌词来源检查，但用户在 iOS Spotify 9.1.92.3058 已确认官方无词歌曲仍不显示，此问题尚未解决。新增其他代理客户端版本沿用相同核心，并未修复该问题。');
write('Egern/Docs/SpotifyLyrics.md',egern);
console.log('Generated four entry points and consumer documentation; runtime pin:',pin);
