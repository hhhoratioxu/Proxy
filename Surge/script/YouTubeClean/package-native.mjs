// Generate native installation entries. Runtime references must be immutable Git SHAs.
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {API_REGEX,CAPTION_REGEX,UMP_REGEX} from './src/data.mjs';
const [ref,destination]=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(ref||'')||!destination)throw Error('Usage: node package-native.mjs <runtime commit SHA> <output directory>');
const raw='https://raw.githubusercontent.com/hhhoratioxu/Proxy/';
const settings=[
  ['REMOVE_ADS','true','去广告'],['TRANSLATE_CAPTIONS','true','字幕翻译'],['TARGET_LANGUAGE','zh-Hans','翻译语言'],
  ['BILINGUAL','true','原文与译文双语'],['AUTO_CAPTIONS','true','优先选择翻译字幕'],
  ['HIDE_UPLOAD','true','隐藏底部发布＋'],['HIDE_SHORTS','false','隐藏底部 Shorts'],
  ['DEEP_FILTER','false','深层广告与推广过滤'],['DIAGNOSTICS','true','输出结构诊断日志']
];
const response='(?:'+[API_REGEX,CAPTION_REGEX,UMP_REGEX].join('|')+')';
const request='^https://(?:youtubei(?:-att)?\\.googleapis\\.com|(?:www|m)\\.youtube\\.com)(?::443)?/youtubei/v1/(?:browse|guide|log_event)(?:\\?.*)?$';
const hosts=['youtubei.googleapis.com','youtubei-att.googleapis.com','www.youtube.com','m.youtube.com','*.googlevideo.com'];
const defaults=settings.map(([k,v])=>k+'='+v).join('&');
const title='YouTube Clean 1.2.0 · 元素版';
const description='1.2.0 A · 新增原生元素广告识别；保留双语字幕及发布＋、Shorts 独立开关。需 HTTPS 解密。';
const runtime=client=>raw+ref+'/'+client+'/script/YouTubeClean.js';
const manual=client=>'https://github.com/hhhoratioxu/Proxy/blob/main/'+client+'/Docs/YouTubeClean.md';
async function save(client,extension,content,stem='YouTubeClean'){const dir=join(destination,client,'script');await mkdir(dir,{recursive:true});await writeFile(join(dir,stem+'.'+extension),content+'\n');}

const schema=settings.map(([key,value,label])=>'  '+key+':\n    name: '+label+'\n    default_value: '+JSON.stringify(value)+'\n    options: '+(key==='TARGET_LANGUAGE'?'["zh-Hans", "zh-Hant", "en", "ja", "ko"]':'["true", "false"]')).join('\n');
await save('Egern','yaml',`# Horatio YouTube Clean 1.2.0; native ESM runtime.
name: ${title}
author: Horatio Xu
icon: captions.bubble.fill
homepage: ${manual('Egern')}
manual: ${manual('Egern')}
description: ${description}
env_schema:
${schema}
mitm:
  hostnames:
${hosts.map(h=>'    - '+JSON.stringify(h)).join('\n')}
scriptings:
  - http_request:
      name: YouTube Clean · 底栏与播放配置刷新
      match: ${JSON.stringify(request)}
      script_url: ${runtime('Egern')}
      body_required: false
      timeout: 8
      update_interval: 86400
  - http_response:
      name: YouTube Clean · 广告字幕与底栏
      match: ${JSON.stringify(response)}
      script_url: ${runtime('Egern')}
      body_required: true
      binary_body: true
      max_size: 8388608
      timeout: 8
      update_interval: 86400`);

for(const client of ['Surge','Shadowrocket']){
  const argument=client==='Surge'?settings.map(([k])=>k+'={{{'+k+'}}}').join('&'):defaults;
  const controls=client==='Surge'?'#!arguments = '+settings.map(([k,v])=>k+':'+v).join(',')+'\n#!arguments-desc = HIDE_UPLOAD：隐藏底部发布＋；HIDE_SHORTS：隐藏底部 Shorts。true 隐藏，false 保留。REMOVE_ADS：去广告；TRANSLATE_CAPTIONS：翻译；TARGET_LANGUAGE：目标语言；BILINGUAL：双语；AUTO_CAPTIONS：优先翻译轨道。':'# 修改设置时同步更新下方两条 Script 的 argument；true 开启，false 关闭。';
  await save(client,'sgmodule',`#!name = ${title}
#!desc = ${description}
#!author = Horatio Xu
#!homepage = ${manual(client)}
${controls}

[General]
force-http-engine-hosts = %APPEND% ${hosts.join(', ')}

[Script]
YouTubeClean-request = type=http-request,pattern=${request},script-path=${runtime(client)},timeout=8,argument=${argument}
YouTubeClean-response = type=http-response,pattern=${response},script-path=${runtime(client)},timeout=8,requires-body=true,binary-body-mode=true,max-size=8388608,argument=${argument}

[MITM]
hostname = %APPEND% ${hosts.join(', ')}`);
}
const slash=pattern=>pattern.replace(/\//g,'\\/');
for(const [profile,stem,variant,extra]of [
 ['elements','YouTubeClean','A 元素版','原生广告元素模板过滤'],
 ['deep','YouTubeClean.Deep','B 深层版','额外检查单张卡片内部的新封装并隐藏推广卡片'],
 ['tcp','YouTubeClean.TCP','C 连接兼容版','深层过滤，并拒绝四个 YouTube API 主机的 UDP/443 以测试 TCP 回退']
]){
const args=settings.map(([k,v,label])=>[k,k==='DEEP_FILTER'&&profile!=='elements'?'true':v,label]);
const loonArgs=args.map(([k,v,label])=>k+' = '+(k==='TARGET_LANGUAGE'?'select,"zh-Hans","zh-Hant","en","ja","ko",type=string':'switch,'+v+',type=boolean')+',tag='+label).join('\n')+'\nPROFILE = select,"'+profile+'",type=string,tag=当前测试方案';
const loonPass='{'+[...settings.map(([k])=>'${'+k+'}'),'${PROFILE}'].join(', ')+'}';
const rules=profile==='tcp'?'\n[Rule]\n'+hosts.filter(h=>!h.includes('*')).map(h=>'AND,((DOMAIN,'+h+'),(PROTOCOL,UDP),(DEST-PORT,443)),REJECT').join('\n')+'\n':'';
await save('Loon','plugin',`#!name = YouTube Clean 1.2.0 · ${variant}
#!desc = 1.2.0 ${variant} · ${extra}。三版只启用一个；实际广告效果待确认。
#!author = Horatio Xu
#!homepage = ${manual('Loon')}
#!loon_version = 3.5.1(983)
#!date = 2026-10-17

[Argument]
${loonArgs}

[Script]
request if \${url} ~= /${slash(request)}/ then script("${runtime('Loon')}", ${loonPass}) with tag="YouTube Clean 请求", timeout=8
response if \${url} ~= /${slash(response)}/ then script("${runtime('Loon')}", ${loonPass}) with tag="YouTube Clean ${profile} 响应", timeout=8, requires_body=true, binary_body_mode=true
${rules}

[Mitm]
hostname = ${hosts.join(', ')}`,stem);
}
await save('QuantumultX','conf',`#!name = ${title}
#!desc = ${description}
#!author = Horatio Xu
#!homepage = ${manual('QuantumultX')}
# Quantumult X build 934+；在「重写 → 引用」添加此地址。
# 设置在脚本地址 # 后；修改 HIDE_UPLOAD / HIDE_SHORTS 时同步更新下面两行。
hostname = ${hosts.join(', ')}
${request} url script-request-header ${runtime('QuantumultX')}#${defaults}
${response} url script-response-body ${runtime('QuantumultX')}#${defaults}`);
console.log('Generated five native entries and two additional Loon variants at '+destination);
