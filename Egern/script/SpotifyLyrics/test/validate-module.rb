require 'yaml'
require 'json'
root = File.expand_path('..', __dir__)
remote = 'https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyrics/spotify-lyrics-0.4.1.js?v=0.4.1'
results = []
['SpotifyLyrics.yaml', 'SpotifyLyrics.local.yaml'].each do |file|
  config = YAML.load_file(File.join(root, file))
  raise 'module name' unless config['name'].include?('VerseLyrics')
  raise 'unexpected config keys' unless (config.keys - %w[name author homepage manual icon description env_schema mitm scriptings]).empty?
  raise 'mitm scope' unless config['mitm']['hostnames'] == ['spclient.wg.spotify.com', '*-spclient.spotify.com']
  raise 'script count' unless config['scriptings'].length == 2
  raise 'silent module' unless config['scriptings'].map { |s| s.keys.first } == ['http_request','http_response']
  expected = file == 'SpotifyLyrics.yaml' ? remote : 'spotify-lyrics.js'
  raise 'local source missing' unless File.file?(File.join(root, 'spotify-lyrics.js'))
  config['scriptings'].each do |entry|
    type, script = entry.first
    raise 'script path' unless script['script_url'] == expected
    raise 'remote update interval' if file == 'SpotifyLyrics.yaml' && script['update_interval'] != 3600
    raise 'translation default environment' unless script['env']['TRANSLATION_ENABLED'] == 'true'
    raise 'auto source environment' unless script['env']['FALLBACK_PROVIDER'] == 'auto' && script['env']['DISCOVER_MISSING'] == 'true'
    raise 'binary response handling' if type == 'http_response' && script['binary_body'] != true
    pattern = Regexp.new(script['match'])
    raise 'unanchored' unless script['match'].start_with?('^https://') && script['match'].end_with?('$')
    raise 'unsafe timeout' unless script['timeout'] <= 25
    raise 'oversize' if script['max_size'] && script['max_size'] > 2097152
    raise 'auth matched' if pattern.match?('https://accounts.spotify.com/login')
    raise 'audio matched' if pattern.match?('https://spclient.wg.spotify.com/audio/v1/track/0000000000000000000001')
    raise 'host spoof' if pattern.match?('https://spclient.wg.spotify.com.evil.test/color-lyrics/v2/track/0000000000000000000001')
  end
  schema = config['env_schema']
  raise 'translation default' unless schema['TRANSLATION_ENABLED']['default_value'] == 'true'
  raise 'discovery default' unless schema['DISCOVER_MISSING']['default_value'] == 'true'
  raise 'default language' unless schema['TARGET_LANGUAGE']['default_value'] == 'zh-CN'
  raise 'languages' unless schema['TARGET_LANGUAGE']['options'].length == 25
  schema.each do |key, item|
    raise 'non-string options' unless item['options'].all? { |x| x.is_a?(String) }
    raise 'invalid default' unless item['options'].include?(item['default_value'])
  end
  responses = config['scriptings'].select { |s| s.key?('http_response') }.map { |s| Regexp.new(s['http_response']['match']) }
  %w[color-lyrics/v2/track/0000000000000000000001 metadata/4/track/00000000000000000000000000000001 extended-metadata/v0/extended-metadata scrollsita/v1/scroll/spotify:track:0000000000000000000001 scrollsita/v1/scroll/spotify%3Atrack%3A0000000000000000000001 user-customization-service/v1/customize bootstrap/v1/bootstrap v1/customize context-resolve/v1/spotify:track:0000000000000000000001 context-resolve/v1/spotify%3Aplaylist%3A0000000000000000000001 connect-state/v1/devices/00000000000000000000000000000001 context-resolve/v1/spotify:station:artist:0000000000000000000001 context-resolve/v1/spotify:collection:tracks].each do |path|
    url = 'https://gew1-spclient.spotify.com:443/' + path + '?platform=iphone'
    raise 'missing response route' unless responses.count { |p| p.match?(url) } == 1
    raise 'missing cache route' unless Regexp.new(config['scriptings'][0]['http_request']['match']).match?(url)
  end
  raise 'versioned bundle mismatch' unless File.binread(File.join(root,'spotify-lyrics.js')) == File.binread(File.join(root,'spotify-lyrics-0.4.1.js'))
  results << {file:file,scripts:2,notifications:false,schedules:false,languages:25,script_location:expected,status:'passed'}
end
puts JSON.pretty_generate({status:'passed',variants:results,checks:'YAML parse, repository script URL, local script resolution, env defaults, limits, URL scope'})
