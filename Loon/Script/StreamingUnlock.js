/*
 * StreamingUnlock.js
 * Loon generic script for per-node streaming / AI unlock checks.
 * Every HTTP request is explicitly bound to the node selected in Loon.
 * Author: Horatio Xu
 * Version: 1.3.1
 */

const PARAMS = (typeof $environment !== 'undefined' && $environment.params) ? $environment.params : {};
const NODE = PARAMS.node || (PARAMS.nodeInfo && (PARAMS.nodeInfo.name || PARAMS.nodeInfo.tag)) || 'DIRECT';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const TIMEOUT = 8000;

function flag(code) {
  if (!code) return '';
  const cc = String(code).trim().toUpperCase().slice(0, 2);
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0)));
}

function regionLabel(code) {
  if (!code) return '';
  const cc = String(code).trim().toUpperCase();
  const alpha2 = cc.length === 2 ? cc : alpha3To2(cc);
  return `${alpha2 ? flag(alpha2) : ''}${cc}`;
}


function alpha3To2(code) {
  const map = { AND:'AD', ARE:'AE', AFG:'AF', ATG:'AG', AIA:'AI', ALB:'AL', ARM:'AM', AGO:'AO', ATA:'AQ', ARG:'AR', ASM:'AS', AUT:'AT', AUS:'AU', ABW:'AW', ALA:'AX', AZE:'AZ', BIH:'BA', BRB:'BB', BGD:'BD', BEL:'BE', BFA:'BF', BGR:'BG', BHR:'BH', BDI:'BI', BEN:'BJ', BLM:'BL', BMU:'BM', BRN:'BN', BOL:'BO', BES:'BQ', BRA:'BR', BHS:'BS', BTN:'BT', BVT:'BV', BWA:'BW', BLR:'BY', BLZ:'BZ', CAN:'CA', CCK:'CC', COD:'CD', CAF:'CF', COG:'CG', CHE:'CH', CIV:'CI', COK:'CK', CHL:'CL', CMR:'CM', CHN:'CN', COL:'CO', CRI:'CR', CUB:'CU', CPV:'CV', CUW:'CW', CXR:'CX', CYP:'CY', CZE:'CZ', DEU:'DE', DJI:'DJ', DNK:'DK', DMA:'DM', DOM:'DO', DZA:'DZ', ECU:'EC', EST:'EE', EGY:'EG', ESH:'EH', ERI:'ER', ESP:'ES', ETH:'ET', FIN:'FI', FJI:'FJ', FLK:'FK', FSM:'FM', FRO:'FO', FRA:'FR', GAB:'GA', GBR:'GB', GRD:'GD', GEO:'GE', GUF:'GF', GGY:'GG', GHA:'GH', GIB:'GI', GRL:'GL', GMB:'GM', GIN:'GN', GLP:'GP', GNQ:'GQ', GRC:'GR', SGS:'GS', GTM:'GT', GUM:'GU', GNB:'GW', GUY:'GY', HKG:'HK', HMD:'HM', HND:'HN', HRV:'HR', HTI:'HT', HUN:'HU', IDN:'ID', IRL:'IE', ISR:'IL', IMN:'IM', IND:'IN', IOT:'IO', IRQ:'IQ', IRN:'IR', ISL:'IS', ITA:'IT', JEY:'JE', JAM:'JM', JOR:'JO', JPN:'JP', KEN:'KE', KGZ:'KG', KHM:'KH', KIR:'KI', COM:'KM', KNA:'KN', PRK:'KP', KOR:'KR', KWT:'KW', CYM:'KY', KAZ:'KZ', LAO:'LA', LBN:'LB', LCA:'LC', LIE:'LI', LKA:'LK', LBR:'LR', LSO:'LS', LTU:'LT', LUX:'LU', LVA:'LV', LBY:'LY', MAR:'MA', MCO:'MC', MDA:'MD', MNE:'ME', MAF:'MF', MDG:'MG', MHL:'MH', MKD:'MK', MLI:'ML', MMR:'MM', MNG:'MN', MAC:'MO', MNP:'MP', MTQ:'MQ', MRT:'MR', MSR:'MS', MLT:'MT', MUS:'MU', MDV:'MV', MWI:'MW', MEX:'MX', MYS:'MY', MOZ:'MZ', NAM:'NA', NCL:'NC', NER:'NE', NFK:'NF', NGA:'NG', NIC:'NI', NLD:'NL', NOR:'NO', NPL:'NP', NRU:'NR', NIU:'NU', NZL:'NZ', OMN:'OM', PAN:'PA', PER:'PE', PYF:'PF', PNG:'PG', PHL:'PH', PAK:'PK', POL:'PL', SPM:'PM', PCN:'PN', PRI:'PR', PSE:'PS', PRT:'PT', PLW:'PW', PRY:'PY', QAT:'QA', REU:'RE', ROU:'RO', SRB:'RS', RUS:'RU', RWA:'RW', SAU:'SA', SLB:'SB', SYC:'SC', SDN:'SD', SWE:'SE', SGP:'SG', SHN:'SH', SVN:'SI', SJM:'SJ', SVK:'SK', SLE:'SL', SMR:'SM', SEN:'SN', SOM:'SO', SUR:'SR', SSD:'SS', STP:'ST', SLV:'SV', SXM:'SX', SYR:'SY', SWZ:'SZ', TCA:'TC', TCD:'TD', ATF:'TF', TGO:'TG', THA:'TH', TJK:'TJ', TKL:'TK', TLS:'TL', TKM:'TM', TUN:'TN', TON:'TO', TUR:'TR', TTO:'TT', TUV:'TV', TWN:'TW', TZA:'TZ', UKR:'UA', UGA:'UG', UMI:'UM', USA:'US', URY:'UY', UZB:'UZ', VAT:'VA', VCT:'VC', VEN:'VE', VGB:'VG', VIR:'VI', VNM:'VN', VUT:'VU', WLF:'WF', WSM:'WS', YEM:'YE', MYT:'YT', ZAF:'ZA', ZMB:'ZM', ZWE:'ZW' };
  return map[String(code || '').trim().toUpperCase()] || '';
}

function decodeBase64Ascii(input) {
  const str = String(input || '').replace(/\s+/g, '');
  if (!str) return '';
  if (typeof atob === 'function') {
    try { return atob(str); } catch (_) {}
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  while (i < str.length) {
    const e1 = chars.indexOf(str.charAt(i++));
    const e2 = chars.indexOf(str.charAt(i++));
    const e3 = chars.indexOf(str.charAt(i++));
    const e4 = chars.indexOf(str.charAt(i++));
    if (e1 < 0 || e2 < 0) break;
    const c1 = (e1 << 2) | (e2 >> 4);
    const c2 = ((e2 & 15) << 4) | (e3 >> 2);
    const c3 = ((e3 & 3) << 6) | e4;
    output += String.fromCharCode(c1);
    if (e3 !== 64 && e3 >= 0) output += String.fromCharCode(c2);
    if (e4 !== 64 && e4 >= 0) output += String.fromCharCode(c3);
  }
  return output;
}

function req(method, url, headers = {}, body = null, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const opts = { url, headers, timeout, node: NODE };
    if (body !== null) opts.body = body;
    const fn = $httpClient[String(method).toLowerCase()];
    if (typeof fn !== 'function') return reject(new Error(`Unsupported method: ${method}`));
    fn(opts, (err, resp, data) => {
      if (err) return reject(new Error(String(err)));
      resolve({
        status: (resp && resp.status) || 0,
        headers: (resp && resp.headers) || {},
        url: (resp && resp.url) || url,
        body: typeof data === 'string' ? data : (data ? String(data) : '')
      });
    });
  });
}

async function safe(name, fn) {
  try {
    const result = await fn();
    return { name, ...result };
  } catch (e) {
    console.log(`[${name}] ${e && e.message ? e.message : e}`);
    return { name, state: 'fail', text: '检测失败' };
  }
}

async function checkExit() {
  const r = await req('get', 'https://www.cloudflare.com/cdn-cgi/trace', { 'User-Agent': UA });
  const kv = {};
  r.body.split('\n').forEach(line => {
    const i = line.indexOf('=');
    if (i > 0) kv[line.slice(0, i)] = line.slice(i + 1).trim();
  });
  return { ip: kv.ip || '未知', loc: kv.loc || '', colo: kv.colo || '' };
}

async function checkApple() {
  const r = await req('get', 'https://gspe1-ssl.ls.apple.com/pep/gcc', { 'User-Agent': UA });
  const cc = r.body.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cc)) return { state: 'info', text: `地区 ${regionLabel(cc)}` };
  return { state: 'fail', text: '地区检测失败' };
}


async function checkNetflix() {
  const extractRegion = body => {
    const pats = [
      /"country"\s*:\s*"([A-Z]{2})"/,
      /"requestCountry"\s*:\s*\{\s*"id"\s*:\s*"([A-Z]{2})"/,
      /"preferredLocale"\s*:\s*\{\s*"country"\s*:\s*"([A-Z]{2})"/,
      /"geo"\s*:\s*\{[^}]*"country"\s*:\s*"([A-Z]{2})"/,
      /data-country\s*=\s*"([A-Z]{2})"/
    ];
    for (const p of pats) {
      const m = String(body || '').match(p);
      if (m) return m[1].toUpperCase();
    }
    return '';
  };
  const playable = body =>
    String(body || '').includes('property="og:video"') ||
    String(body || '').includes('data-uia="episodes"') ||
    String(body || '').includes('playableVideo');

  const [a,b] = await Promise.all([
    req('get','https://www.netflix.com/title/70143836',{'User-Agent':UA,'Accept-Language':'en'}),
    req('get','https://www.netflix.com/title/81280792',{'User-Agent':UA,'Accept-Language':'en'})
  ]);

  if (a.status === 404 && b.status === 404) return {state:'partial',text:'仅自制剧'};
  if (a.status === 403 && b.status === 403) return {state:'blocked',text:'IP 被 Netflix 阻止'};

  const candidates=[a,b].filter(x=>x.status===200 || x.status===301);
  let body='';
  for(const x of candidates){
    if(playable(x.body)){ body=x.body; break; }
  }

  if(body){
    let cc=extractRegion(body);
    if(!cc){
      try{
        const fast=await req('get','https://api.fast.com/netflix/speedtest/v2?https=true&token=YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm&urlCount=5',{'User-Agent':UA});
        if(fast.status!==403 && fast.status!==451){
          const j=JSON.parse(fast.body);
          cc=j && j.targets && j.targets[0] && j.targets[0].location && j.targets[0].location.country || '';
        }
      }catch(_){}
    }
    return {state:'ok',text:`完整解锁${cc ? ` · ${regionLabel(cc)}` : ''}`};
  }

  if (String(a.body).includes('Oh no!') && String(b.body).includes('Oh no!')) {
    return {state:'blocked',text:'不可用'};
  }
  if (candidates.length) return {state:'partial',text:'仅自制剧 / 受限'};
  return {state:'fail',text:`未知响应 · HTTP ${a.status}/${b.status}`};
}


async function checkDisney() {
  const TOKEN='ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84';
  const device=await req('post','https://disney.api.edge.bamgrid.com/devices',{
    'Authorization':`Bearer ${TOKEN}`,
    'Content-Type':'application/json',
    'User-Agent':UA
  },JSON.stringify({deviceFamily:'browser',applicationRuntime:'chrome',deviceProfile:'windows',attributes:{}}));
  if(device.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  if(device.status===403 || /403 ERROR/i.test(device.body)) return {state:'blocked',text:'无法获取设备授权'};
  let assertion='';
  try{ assertion=JSON.parse(device.body).assertion || ''; }catch(_){}
  if(!assertion) return {state:'fail',text:'设备授权响应异常'};

  const form=[
    ['grant_type','urn:ietf:params:oauth:grant-type:token-exchange'],
    ['latitude','0'],['longitude','0'],['platform','browser'],
    ['subject_token',assertion],
    ['subject_token_type','urn:bamtech:params:oauth:token-type:device']
  ].map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

  const token=await req('post','https://disney.api.edge.bamgrid.com/token',{
    'Authorization':TOKEN,
    'Content-Type':'application/x-www-form-urlencoded',
    'User-Agent':UA
  },form);
  if(token.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  if(token.status===403 || /forbidden-location|403 ERROR/i.test(token.body)) return {state:'blocked',text:'地区 / IP 不支持'};
  let refresh='';
  try{ refresh=JSON.parse(token.body).refresh_token || ''; }catch(_){}
  if(!refresh) return {state:'fail',text:'Token Exchange 异常'};

  const page=await req('get','https://disneyplus.com',{'User-Agent':UA,'Accept-Language':'en'});
  if(page.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  if(page.status===403 || page.status===451) return {state:'blocked',text:'网页地区限制'};

  const payload=JSON.stringify({
    query:'mutation refreshToken($input: RefreshTokenInput!) {\n refreshToken(refreshToken: $input) {\n activeSession {\n sessionId\n }\n }\n}',
    variables:{input:{refreshToken:refresh}}
  });
  const graph=await req('post','https://disney.api.edge.bamgrid.com/graph/v1/device/graphql',{
    'Authorization':TOKEN,
    'Content-Type':'application/json',
    'User-Agent':UA
  },payload);
  if(graph.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};

  const sm=graph.body.match(/"inSupportedLocation"\s*:\s*(false|true)/i);
  const cm=graph.body.match(/"countryCode"\s*:\s*"([^"]+)"/i);
  if(!sm) return {state:'fail',text:'无法确认地区支持状态'};
  const supported=sm[1].toLowerCase()==='true';
  const cc=cm ? cm[1].toUpperCase() : '';
  if(!supported) return {state:'blocked',text:`不支持${cc ? ` · ${regionLabel(cc)}` : ''}`};
  if(!cc) return {state:'fail',text:'已支持，但地区识别失败'};
  return {state:'ok',text:`已解锁 · ${regionLabel(cc)}`};
}


async function checkMax() {
  const VPN_TOKEN='eyJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJ0b2tlbi0wOWQxOTg4Yy1mZmUzLTQxMDEtOWI5My0yNDU1ZTkyNGQ1YjYiLCJpc3MiOiJmcGEtaXNzdWVyIiwic3ViIjoiVVNFUklEOmJvbHQ6YjYzOTgxZWQtNzA2MC00ZGYwLThkZGItZjA2YjFkNWRjZWVkIiwiaWF0IjoxNzQzODQwMzgwLCJleHAiOjIwNTkyMDAzODAsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWJkaXZpc2lvbiI6ImJlYW1fYW1lciIsInNjb3BlIjoiZGVmYXVsdCIsImlpZCI6IjQwYTgzZjNlLTY4OTktNDE3Mi1hMWY2LWJjZDVjN2ZkNjA4NSIsInZlcnNpb24iOiJ2MyIsImFub255bW91cyI6ZmFsc2UsImRldmljZUlkIjoiNWY3YzViZjQtYjc4Ny00NDRjLWJhYTYtMzU5MzgwYWFiM2RmIn0.f5HTgIV2v0nQQDp5LQG0xqLrxyACdvnMDiWO_viX_CUGqtc5ncSjp_LgM30QFkkMnINFhzKEGRpsZvb-o3Pj_Z39uRBr5LCeiCPR7ssV-_SXyRFVRRDEB2lpxyz7jmdD1SxvA06HnEwTbZQzlbZ7g9GXq02yNdEfHlqYEh_4WF88UbXfeieYTd4TH7kwN1RE50NfQUS6f0WmzpAbpiULyd87mpTeynchFNMMz-YHVzZ_-nDW6geihXc3tS0FKVSR8fdOSPQFzEYOLCfhInufiPahiXI-OKF89aShAqM-y4Hx_eukGnsq3mO5wa3unnqVr9Kzc61BIhHh1Hs2bqYiYg';
  const headers={
    'User-Agent':UA,
    'x-device-info':'beam/5.0.0 (desktop/desktop; Windows/10; afbb5daa-c327-461d-9460-d8e4b3ee4a1f/da0cdd94-5a39-42ef-aa68-54cbc1b852c3)',
    'x-disco-client':'WEB:10:beam:5.2.1'
  };
  const tokenR=await req('get','https://default.any-any.prd.api.max.com/token?realm=bolt&deviceId=afbb5daa-c327-461d-9460-d8e4b3ee4a1f',headers);
  if(tokenR.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  let token='';
  try{ token=JSON.parse(tokenR.body).data.attributes.token || ''; }catch(_){}
  if(!token) return {state:'blocked',text:'不可用 / 无法获取 Token'};

  const sessionR=await req('post','https://default.any-any.prd.api.max.com/session-context/headwaiter/v1/bootstrap',{
    'User-Agent':UA,'Cookie':`st=${token}`,'Content-Type':'application/json'
  },'');
  if(sessionR.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  let routing=null;
  try{ routing=JSON.parse(sessionR.body).routing || null; }catch(_){}
  if(!routing || !routing.domain || !routing.tenant || !routing.env || !routing.homeMarket) return {state:'fail',text:'无法获取地区路由'};

  const userUrl=`https://default.${routing.tenant}-${routing.homeMarket}.${routing.env}.${routing.domain}/users/me`;
  const userR=await req('get',userUrl,{'User-Agent':UA,'Cookie':`st=${token}`});
  if(userR.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  let cc='';
  try{ cc=JSON.parse(userR.body).data.attributes.currentLocationTerritory || ''; }catch(_){}
  cc=String(cc).toUpperCase();
  if(!cc) return {state:'fail',text:'无法获取地区'};

  const home=await req('get','https://www.max.com/',{'User-Agent':UA});
  if(home.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  const available=String(home.body || '').toUpperCase().split('"URL":"/').slice(1).join(' ');
  if(!available.includes(cc)) return {state:'blocked',text:`地区不可用 · ${regionLabel(cc)}`};

  const playback=await req('post','https://default.any-any.prd.api.max.com/any/playback/v1/playbackInfo',{
    'User-Agent':UA,
    'Content-Type':'application/x-www-form-urlencoded'
  },`st=${encodeURIComponent(VPN_TOKEN)}`);
  if(playback.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  if(/vpn/i.test(playback.body)) return {state:'blocked',text:`VPN Blocked · ${regionLabel(cc)}`};

  return {state:'ok',text:`已解锁 · ${regionLabel(cc)}`};
}


async function checkPrimeVideo() {
  let r=await req('get','https://www.primevideo.com',{'User-Agent':UA,'Accept-Language':'en-US,en;q=0.9'});
  if(r.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  let body=String(r.body || '');

  if(r.status>=300 && r.status<400){
    const loc=r.headers.location || r.headers.Location || '';
    if(loc){
      const next=loc.startsWith('/') ? 'https://www.primevideo.com'+loc : loc;
      try{
        const r2=await req('get',next,{'User-Agent':UA,'Accept-Language':'en-US,en;q=0.9'});
        body=String(r2.body || body);
      }catch(_){}
    }
  }

  const territory=/"currentTerritory"\s*:\s*"([A-Za-z]{2})"/.exec(body);
  if(!territory){
    const links=[...body.matchAll(/(https:\/\/www\.amazon\.[a-z.]+\/[^"'\s>]+)/gi)];
    for(const m of links){
      const u=String(m[1]).replace(/&amp;/g,'&').replace(/\\u0026/g,'&');
      if(!u.includes('storefront')) continue;
      try{
        const r2=await req('get',u,{'User-Agent':UA,'Accept-Language':'en-US,en;q=0.9'});
        if(r2.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
        body=String(r2.body || body);
        break;
      }catch(_){}
    }
  }

  if(body.includes('api-services-support@amazon.com')) return {state:'blocked',text:'不可用'};
  const m=/"currentTerritory"\s*:\s*"([A-Za-z]{2})"/.exec(body);
  if(!m) return {state:'fail',text:'无法确认 Prime Video 地区'};
  const cc=m[1].toUpperCase();
  if(['CN','CU','IR','KP','SY'].includes(cc)) return {state:'blocked',text:`不可用 · ${regionLabel(cc)}`};
  return {state:'ok',text:`已解锁 · ${regionLabel(cc)}`};
}


async function checkYouTube() {
  const r=await req('get','https://www.youtube.com/premium',{
    'User-Agent':UA,'Accept-Language':'en-US,en;q=0.9'
  });
  if(r.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  const body=String(r.body || '');
  if(body.includes('www.google.cn')) return {state:'blocked',text:'不可用 · 🇨🇳CN'};
  if(body.includes('Premium is not available in your country')) return {state:'blocked',text:'Premium 不可用'};

  const cm=body.match(/"countryCode":\s*"([A-Za-z]{2})"/);
  if(cm) return {state:'ok',text:`Premium 已解锁 · ${regionLabel(cm[1])}`};

  if(body.includes('premiumPurchaseButton') ||
     body.includes('manageSubscriptionButton') ||
     body.includes('/月') ||
     body.includes('/month')){
    return {state:'ok',text:'Premium 已解锁'};
  }

  if(r.status===403 || r.status===451) return {state:'blocked',text:`不可用 · HTTP ${r.status}`};
  return {state:'blocked',text:'Premium 不可用'};
}


async function checkSpotify() {
  const r=await req('get','https://open.spotify.com/',{
    'User-Agent':UA,
    'Accept-Language':'en',
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  });
  if(r.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  if(r.status===403 || r.status===451) return {state:'blocked',text:`不可用 · HTTP ${r.status}`};

  const m=String(r.body || '').match(/<script[^>]+id="appServerConfig"[^>]*type="text\/plain"[^>]*>([^<]+)<\/script>/i);
  if(!m) return {state:'fail',text:'无法读取 Spotify 市场信息'};
  let cfg;
  try{ cfg=JSON.parse(decodeBase64Ascii(m[1].trim())); }catch(_){ return {state:'fail',text:'Spotify 市场信息解析失败'}; }
  const cc=String(cfg && cfg.market || '').toUpperCase();
  if(!cc) return {state:'blocked',text:'注册 / 市场不可用'};
  return {state:'ok',text:`市场可用 · ${regionLabel(cc)}`};
}


async function checkTikTok() {
  const test=async url=>{
    const r=await req('get',url,{'User-Agent':UA,'Accept-Language':'en'});
    if(r.status===429) return {terminal:true,result:{state:'rate',text:'Rate Limited · HTTP 429'}};
    if(r.status===403 || r.status===451) return {terminal:true,result:{state:'blocked',text:`不可用 · HTTP ${r.status}`}};
    if(r.status!==200) return {terminal:false};
    const body=String(r.body || '');
    if(body.includes('https://www.tiktok.com/hk/notfound')) return {terminal:true,result:{state:'blocked',text:'不可用 · 🇭🇰HK'}};
    const m=body.match(/"region":"(\w+)"/);
    if(m) return {terminal:true,result:{state:'ok',text:`已解锁 · ${regionLabel(m[1])}`}};
    return {terminal:false};
  };
  const a=await test('https://www.tiktok.com/explore');
  if(a.terminal) return a.result;
  const b=await test('https://www.tiktok.com/');
  if(b.terminal) return b.result;
  return {state:'fail',text:'无法识别 TikTok 地区'};
}


async function checkChatGPT() {
  const h1={
    'User-Agent':UA,'authority':'api.openai.com','accept':'*/*',
    'accept-language':'zh-CN,zh;q=0.9','authorization':'Bearer null',
    'content-type':'application/json','origin':'https://platform.openai.com',
    'referer':'https://platform.openai.com/','sec-ch-ua-mobile':'?0',
    'sec-ch-ua-platform':'Windows','sec-fetch-dest':'empty',
    'sec-fetch-mode':'cors','sec-fetch-site':'same-site'
  };
  const h2={
    'User-Agent':UA,'authority':'ios.chat.openai.com',
    'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'accept-language':'zh-CN,zh;q=0.9','sec-ch-ua-mobile':'?0',
    'sec-ch-ua-platform':'Windows','sec-fetch-dest':'document',
    'sec-fetch-mode':'navigate','sec-fetch-site':'none',
    'sec-fetch-user':'?1','upgrade-insecure-requests':'1'
  };

  let w=null,i=null,t=null;
  try{w=await req('get','https://api.openai.com/compliance/cookie_requirements',h1);}catch(_){}
  try{i=await req('get','https://ios.chat.openai.com/',h2);}catch(_){}
  try{t=await req('get','https://chat.openai.com/cdn-cgi/trace',{'User-Agent':UA});}catch(_){}

  let cc='';
  if(t){
    const m=String(t.body||'').match(/^loc=([^\r\n]+)$/m);
    if(m) cc=m[1].toUpperCase();
  }
  if((w && w.status===429) || (i && i.status===429)) return {state:'rate',text:`Rate Limited · HTTP 429${cc ? ` · ${regionLabel(cc)}` : ''}`};
  if(cc==='T1') return {state:'ok',text:'可用 · TOR'};

  const unsupported=!!(w && /unsupported_country/i.test(w.body));
  const vpn=!!(i && /VPN/i.test(i.body));
  const wr=!!w, ir=!!i, tr=!!t;

  if(!vpn && !unsupported && wr && ir && tr)
    return {state:'ok',text:`Web + iOS 可用${cc ? ` · ${regionLabel(cc)}` : ''}`};
  if(!unsupported && vpn && wr)
    return {state:'partial',text:`仅 Web 可用${cc ? ` · ${regionLabel(cc)}` : ''}`};
  if(unsupported && !vpn && ir)
    return {state:'partial',text:`仅 iOS 可用${cc ? ` · ${regionLabel(cc)}` : ''}`};
  if((!wr && vpn) || (vpn && unsupported) || (!wr && !ir && !tr))
    return {state:'blocked',text:`不可用${cc ? ` · ${regionLabel(cc)}` : ''}`};
  return {state:'fail',text:`状态无法确认${cc ? ` · ${regionLabel(cc)}` : ''}`};
}


async function checkGemini() {
  const SUPPORT=new Set(['AX','AL','DZ','AS','AD','AO','AI','AQ','AG','AR','AM','AW','AU','AT','AZ','BH','BD','BB','BE','BZ','BJ','BM','BT','BO','BA','BW','BR','IO','VG','BN','BG','BF','BI','CV','KH','CM','CA','BQ','KY','CF','TD','CL','CX','CC','CO','KM','CK','CR','CI','HR','CW','CZ','CD','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FK','FO','FJ','FI','FR','GF','PF','TF','GA','GE','DE','GH','GI','GR','GL','GD','GP','GU','GT','GG','GN','GW','GY','HT','HM','HN','HU','IS','IN','ID','IQ','IE','IM','IL','IT','JM','JP','JE','JO','KZ','KE','KI','XK','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MG','MW','MY','MV','ML','MT','MH','MQ','MR','MU','YT','MX','FM','MD','MC','MN','ME','MS','MA','MZ','MM','NA','NR','NP','NL','NC','NZ','NI','NE','NG','NU','NF','MK','MP','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH','PN','PL','PT','PR','QA','CY','CG','RE','RO','RW','BL','SH','KN','LC','MF','PM','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SX','SK','SI','SB','SO','ZA','GS','KR','SS','ES','LK','SD','SR','SJ','SE','CH','TW','TJ','TZ','TH','BS','GM','TL','TG','TK','TO','TT','TN','TR','TM','TC','TV','VI','UG','UA','AE','GB','US','UM','UY','UZ','VU','VA','VE','VN','WF','EH','YE','ZM','ZW']);
  const r=await req('get','https://gemini.google.com',{
    'User-Agent':UA,'Accept-Language':'en-US,en;q=0.9'
  });
  if(r.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  if(r.status===403 || r.status===451) return {state:'blocked',text:`不可用 · HTTP ${r.status}`};
  if(r.status!==200) return {state:'fail',text:`检测异常 · HTTP ${r.status}`};

  const body=String(r.body || '');
  const marker=body.includes('45631641,null,true') || body.includes('45617354,null,true');
  const m=body.match(/,2,1,200,"([A-Z]{3})"/);
  let cc='';
  if(m) cc=alpha3To2(m[1]);

  if(cc && SUPPORT.has(cc)) return {state:'ok',text:`已解锁 · ${regionLabel(cc)}`};
  if(cc && !SUPPORT.has(cc)) return {state:'blocked',text:`地区不支持 · ${regionLabel(cc)}`};
  if(marker) return {state:'ok',text:'已解锁 · 地区未识别'};
  return {state:'blocked',text:'不可用'};
}


async function checkInstagramMusic() {
  const url='https://www.instagram.com/api/graphql';
  const payload='av=0&__d=www&__user=0&__a=1&__req=3&__hs=19750.HYP%3Ainstagram_web_pkg.2.1..0.0&dpr=1&__ccg=UNKNOWN&__rev=1011068636&__s=drshru%3Agu4p3s%3A0d8tzk&__hsi=7328972521009111950&__dyn=7xeUjG1mxu1syUbFp60DU98nwgU29zEdEc8co2qwJw5ux609vCwjE1xoswIwuo2awlU-cw5Mx62G3i1ywOwv89k2C1Fwc60AEC7U2czXwae4UaEW2G1NwwwNwKwHw8Xxm16wUwtEvw4JwJCwLyES1Twoob82ZwrUdUbGwmk1xwmo6O1FwlE6PhA6bxy4UjK5V8&__csr=gtneJ9lGF4HlRX-VHjmipBDGAhGuWV4uEyXyp22u6pU-mcx3BCGjHS-yabGq4rhoWBAAAKamtnBy8PJeUgUymlVF48AGGWxCiUC4E9HG78og01bZqx106Ag0clE0kVwdy0Nx4w2TU0iGDgChwmUrw2wVFQ9Bg3fw4uxfo2ow0asW&__comet_req=7&lsd=AVrkL73GMdk&jazoest=2909&__spin_r=1011068636&__spin_b=trunk&__spin_t=1706409389&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=PolarisPostActionLoadPostQueryQuery&variables=%7B%22shortcode%22%3A%22C2YEAdOh9AB%22%2C%22fetch_comment_count%22%3A40%2C%22fetch_related_profile_media_count%22%3A3%2C%22parent_comment_count%22%3A24%2C%22child_comment_count%22%3A3%2C%22fetch_like_count%22%3A10%2C%22fetch_tagged_user_count%22%3Anull%2C%22fetch_preview_comment_count%22%3A2%2C%22has_threaded_comments%22%3Atrue%2C%22hoisted_comment_id%22%3Anull%2C%22hoisted_reply_id%22%3Anull%7D&server_timestamps=true&doc_id=10015901848480474';
  const r=await req('post',url,{
    'Accept':'*/*','Accept-Language':'zh-CN,zh;q=0.9','Connection':'keep-alive',
    'Content-Type':'application/x-www-form-urlencoded','Origin':'https://www.instagram.com',
    'Referer':'https://www.instagram.com/p/C2YEAdOh9AB/','X-ASBD-ID':'129477',
    'X-FB-Friendly-Name':'PolarisPostActionLoadPostQueryQuery','X-FB-LSD':'AVrkL73GMdk',
    'X-IG-App-ID':'936619743392459','dpr':'1.75',
    'sec-ch-prefers-color-scheme':'light',
    'sec-ch-ua':'"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile':'?0','sec-ch-ua-platform':'"Windows"','viewport-width':'1640',
    'User-Agent':UA
  },payload);

  if(r.status===429) return {state:'rate',text:'Rate Limited · HTTP 429'};
  if(r.status===200){
    if(/"should_mute_audio"\s*:\s*true/i.test(r.body))
      return {state:'blocked',text:'Licensed Audio 不可用'};
    if(/"should_mute_audio"\s*:\s*false/i.test(r.body))
      return {state:'ok',text:'Licensed Audio 可用'};
    return {state:'fail',text:'接口返回 200，但缺少音频授权字段'};
  }
  if(r.status===403 || r.status===451) return {state:'blocked',text:`不可用 · HTTP ${r.status}`};
  return {state:'fail',text:`检测异常 · HTTP ${r.status || 'N/A'}`};
}

function colorFor(state) {
  return ({ ok:'#34C759', partial:'#FF9F0A', blocked:'#FF3B30', rate:'#FF9500', fail:'#8E8E93', info:'#0A84FF' })[state] || '#8E8E93';
}

function iconFor(state) {
  return ({ ok:'●', partial:'◐', blocked:'●', rate:'●', fail:'○', info:'●' })[state] || '○';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(async () => {
  const exitPromise = checkExit().catch(() => ({ ip:'未知', loc:'', colo:'' }));
  const tasks = [
    ['Apple', checkApple],
    ['Netflix', checkNetflix],
    ['Disney+', checkDisney],
    ['Max', checkMax],
    ['Prime Video', checkPrimeVideo],
    ['YouTube Premium', checkYouTube],
    ['Spotify', checkSpotify],
    ['TikTok', checkTikTok],
    ['ChatGPT', checkChatGPT],
    ['Gemini', checkGemini],
    ['Instagram Music', checkInstagramMusic]
  ];

  const [exitInfo, results] = await Promise.all([
    exitPromise,
    Promise.all(tasks.map(([name, fn]) => safe(name, fn)))
  ]);

  const rows = results.map(r => `
    <div class="svc">
      <div class="svc-name">${esc(r.name)}</div>
      <div class="svc-status">
        <span class="badge badge-${esc(r.state)}">
          <span class="dot"></span>
          ${esc(r.text)}
        </span>
      </div>
    </div>
  `).join('');

  const loc = exitInfo.loc ? `${flag(exitInfo.loc)} ${exitInfo.loc}` : '未知';

  const html = `
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <style>
      :root{
        --bg:#f2f2f7;
        --panel:transparent;
        --card:transparent;
        --line:rgba(60,60,67,.10);
        --text:#111111;
        --sub:#6e6e73;
        --green:#34c759;
        --green-bg:transparent;
        --orange:#ff9f0a;
        --orange-bg:transparent;
        --red:#ff3b30;
        --red-bg:transparent;
        --gray:#8e8e93;
        --gray-bg:transparent;
        --blue:#0a84ff;
        --blue-bg:transparent;
      }

      @media (prefers-color-scheme: dark) {
        :root{
          --bg:#000000;
          --panel:transparent;
          --card:transparent;
          --line:rgba(255,255,255,.08);
          --text:#ffffff;
          --sub:#a1a1a6;
          --green:#30d158;
          --green-bg:transparent;
          --orange:#ff9f0a;
          --orange-bg:transparent;
          --red:#ff453a;
          --red-bg:transparent;
          --gray:#98989d;
          --gray-bg:transparent;
          --blue:#64d2ff;
          --blue-bg:transparent;
        }
      }

      *{box-sizing:border-box}

      body{
        margin:0;
        padding:16px;
        background:var(--bg);
        color:var(--text);
        font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Helvetica Neue",sans-serif;
      }

      .panel{
        background:transparent;
        border-radius:0;
        padding:8px 2px 4px;
        box-shadow:none;
      }

      .title{
        font-size:22px;
        font-weight:800;
        letter-spacing:-0.4px;
        line-height:1.15;
        margin-bottom:4px;
      }

      .sub{
        font-size:12px;
        color:var(--sub);
        margin-bottom:14px;
      }

      .meta-grid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-bottom:16px;
      }

      .meta-card{
        background:transparent;
        border:0;
        border-radius:0;
        padding:4px 0;
      }

      .meta-label{
        font-size:11px;
        color:var(--sub);
        margin-bottom:5px;
      }

      .meta-value{
        font-size:13px;
        font-weight:700;
        line-height:1.35;
        word-break:break-all;
      }

      .section-title{
        font-size:13px;
        font-weight:700;
        color:var(--sub);
        margin:2px 0 10px;
      }

      .svc-list{
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .svc{
        background:transparent;
        border:0;
        border-bottom:1px solid var(--line);
        border-radius:0;
        padding:12px 0 13px;
      }

      .svc-name{
        font-size:16px;
        font-weight:750;
        letter-spacing:-0.2px;
        line-height:1.2;
        margin-bottom:9px;
      }

      .svc-status{
        display:flex;
        align-items:center;
        flex-wrap:wrap;
        gap:8px;
      }

      .badge{
        display:inline-flex;
        align-items:center;
        gap:7px;
        padding:0;
        border-radius:0;
        font-size:13px;
        font-weight:700;
        line-height:1.35;
        max-width:100%;
        word-break:break-word;
        background:transparent !important;
      }

      .dot{
        width:8px;
        height:8px;
        border-radius:50%;
        background:currentColor;
        flex:0 0 auto;
      }

      .badge-ok{color:var(--green);background:var(--green-bg)}
      .badge-partial{color:var(--orange);background:var(--orange-bg)}
      .badge-blocked{color:var(--red);background:var(--red-bg)}
      .badge-rate{color:var(--orange);background:var(--orange-bg)}
      .badge-fail{color:var(--gray);background:var(--gray-bg)}
      .badge-info{color:var(--blue);background:var(--blue-bg)}

      .note{
        margin-top:14px;
        padding:12px 0 0;
        border-top:1px solid var(--line);
        font-size:11px;
        color:var(--sub);
        line-height:1.55;
      }

      .title,.sub,.meta-label,.meta-value,.section-title,.svc-name,.badge,.note{
        background:transparent !important;
        box-shadow:none !important;
      }
    </style>
  </head>
  <body>
    <div class="panel">
      <div class="title">📺 流媒体解锁查询</div>
      <div class="sub">当前节点 · 解锁状态</div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">节点</div>
          <div class="meta-value">${esc(NODE)}</div>
        </div>

        <div class="meta-card">
          <div class="meta-label">出口 IP</div>
          <div class="meta-value">${esc(exitInfo.ip)}</div>
        </div>

        <div class="meta-card">
          <div class="meta-label">地区</div>
          <div class="meta-value">${esc(loc)}</div>
        </div>

        <div class="meta-card">
          <div class="meta-label">Cloudflare POP</div>
          <div class="meta-value">${esc(exitInfo.colo || '未知')}</div>
        </div>
      </div>

      <div class="section-title">检测结果</div>

      <div class="svc-list">
        ${rows}
      </div>

      <div class="note">
        所有检测请求均强制通过当前所选节点。检测结果可能受平台限流、WAF、登录状态或接口更新影响；“检测失败”不等于明确不可用。
      </div>
    </div>
  </body>
  </html>`;
  console.log(html);
  $done({ title:'📺 流媒体解锁查询', htmlMessage:html });
})().catch(e => {
  console.log(`[StreamingUnlock Fatal] ${e && e.message ? e.message : e}`);
  $done({ title:'📺 流媒体解锁查询', htmlMessage:`<p>检测失败：${esc(e && e.message ? e.message : e)}</p>` });
});
