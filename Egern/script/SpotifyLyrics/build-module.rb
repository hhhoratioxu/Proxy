require 'yaml'
require 'json'
root = __dir__
version = JSON.parse(File.read(File.join(root,'package.json')))['version']
previous = YAML.load_file(File.join(root,'SpotifyLyrics.yaml'))
schema = previous['env_schema']
schema['TRANSLATION_ENABLED']['default_value'] = 'true'
schema['TRANSLATION_ENABLED']['description'] = '默认开启；以插件译文替换 Spotify 官方译文，保留原词与原生歌词排版。'
schema['DISCOVER_MISSING']['description'] = '默认开启；自动处理客户端歌词检查、歌曲有词标记与原生歌词卡片，无词时匹配备用来源。'
match = '^https://(?:spclient\.wg|[a-z0-9-]+-spclient)\.spotify\.com(?::443)?/(?:color-lyrics/v2/track/[0-9A-Za-z]{22}(?:/image/[^?#\s]+)?/?|metadata/4/track/[0-9a-f]{32}|extended-metadata/v0/extended-metadata/?|scrollsita/v1/scroll/spotify(?::|%3[aA])track(?::|%3[aA])[0-9A-Za-z]{22}/?|user-customization-service/v1/customize/?|bootstrap/v1/bootstrap/?|v1/customize/?|context-resolve/v1/spotify(?::|%3[aA])[^?#\s/]{1,512}/?|connect-state/v1/devices/[0-9A-Za-z_-]{16,128}/?)(?:\?.*)?$'
base = {
 'name'=>'Spotify 双语歌词 · VerseLyrics', 'author'=>'Horatio Xu', 'icon'=>'music.note.list',
 'homepage'=>'https://github.com/hhhoratioxu/Proxy/tree/main/Egern/script/SpotifyLyrics',
 'manual'=>'https://github.com/hhhoratioxu/Proxy/blob/main/Egern/script/SpotifyLyrics/README.md',
 'description'=>'自动补充缺失歌词，以插件中文译文替换官方译文，保留 Spotify 原生歌词显示；默认开启，无需诊断通知。需 HTTPS 解密。',
 'env_schema'=>schema, 'mitm'=>{'hostnames'=>['spclient.wg.spotify.com','*-spclient.spotify.com']}
}
env = {'TRANSLATION_ENABLED'=>'true','TARGET_LANGUAGE'=>'zh-CN','FALLBACK_PROVIDER'=>'auto','DISCOVER_MISSING'=>'true'}
remote = 'https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/spotify-lyrics.js?v='+version
{'SpotifyLyrics.yaml'=>remote,'SpotifyLyrics.local.yaml'=>'spotify-lyrics.js'}.each do |name,url|
 common = {'script_url'=>url,'env'=>env}
 common['update_interval'] = 3600 if name=='SpotifyLyrics.yaml'
 config=base.merge('scriptings'=>[
  {'http_request'=>common.merge('name'=>'VerseLyrics · 请求处理','match'=>match,'body_required'=>false,'timeout'=>3)},
  {'http_response'=>common.merge('name'=>'VerseLyrics · 原生歌词与翻译','match'=>match,'body_required'=>true,'binary_body'=>true,'max_size'=>2097152,'timeout'=>25)}
 ])
 config=JSON.parse(JSON.generate(config))
 File.write(File.join(root,name),'# VerseLyrics '+version+" — silent production module; no notification or scheduled scripts.\n"+YAML.dump(config).sub(/^---\n/,''))
end
puts JSON.generate({version:version,scripts:2,defaultTranslation:true,notifications:false})
