require 'yaml'
require 'fileutils'
require 'json'
root = __dir__
original = YAML.load_file(File.join(root, '../SpotifyLyrics/SpotifyLyrics.yaml'))
known = original['scriptings'][0]['http_request']['match']
all_spclient = '^https://(?:spclient\.wg|[a-z0-9-]+-spclient)\.spotify\.com(?::443)?/[^\s]*$'
remote = 'https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyricsDiagnostics/spotify-lyrics-diagnostics.js?v=0.3.3-diag.1'
env = {'TRANSLATION_ENABLED'=>'true', 'TARGET_LANGUAGE'=>'zh-CN', 'FALLBACK_PROVIDER'=>'auto', 'DISCOVER_MISSING'=>'true'}
schema = original['env_schema']
schema['TRANSLATION_ENABLED']['default_value'] = 'true'
schema['TRANSLATION_ENABLED']['description'] = schema['TRANSLATION_ENABLED']['description'].sub('默认关闭','诊断版默认开启')
base = {
  'name'=>'Spotify 歌词 · 通知诊断版', 'author'=>'Horatio Xu', 'icon'=>'waveform.badge.magnifyingglass',
  'homepage'=>'https://github.com/hhhoratioxu/Proxy/tree/main/Egern/script/SpotifyLyricsDiagnostics',
  'manual'=>'https://github.com/hhhoratioxu/Proxy/blob/main/Egern/script/SpotifyLyricsDiagnostics/README.md',
  'description'=>'排查原本无歌词仍不显示：播放时自动发送状态通知，点通知复制记录；请临时关闭普通版，只启用诊断版。保留 0.3.3 歌词处理与插件译文策略。',
  'env_schema'=>schema, 'mitm'=>original['mitm']
}
{'SpotifyLyrics.Diagnostics.yaml'=>remote, 'SpotifyLyrics.Diagnostics.local.yaml'=>'spotify-lyrics-diagnostics.js'}.each do |name,url|
  common = {'script_url'=>url, 'env'=>env}
  common['update_interval'] = 3600 if name == 'SpotifyLyrics.Diagnostics.yaml'
  config = base.merge('scriptings'=>[
    {'http_request'=>common.merge('name'=>'VerseLyrics 诊断 · 请求处理', 'match'=>known, 'body_required'=>false, 'timeout'=>3)},
    {'http_response'=>common.merge('name'=>'VerseLyrics 诊断 · 接口记录', 'match'=>all_spclient, 'body_required'=>true, 'binary_body'=>true, 'max_size'=>2097152, 'timeout'=>25)},
    {'schedule'=>common.merge('name'=>'VerseLyrics 诊断 · 自动提示', 'cron'=>'* * * * *', 'timeout'=>3)},
    {'generic'=>common.merge('name'=>'VerseLyrics 诊断 · 记录预览', 'timeout'=>3)}
  ], 'widgets'=>[{'name'=>'VerseLyrics 诊断', 'script_name'=>'VerseLyrics 诊断 · 记录预览'}])
  # Plain independent values avoid requiring YAML anchor/alias support.
  config = JSON.parse(JSON.generate(config))
  File.write(File.join(root,name), "# 0.3.3-diag.1 — notification diagnostics; native missing lyrics remain unverified.\n"+YAML.dump(config).sub(/^---\n/,''))
end
FileUtils.cp(File.join(root, '../SpotifyLyrics/NOTICE-UNICODE.txt'), File.join(root, 'NOTICE-UNICODE.txt'))
