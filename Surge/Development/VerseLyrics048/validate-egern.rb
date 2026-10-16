require 'yaml'
v = YAML.load_file(File.join(__dir__, 'publish/Egern/script/SpotifyLyrics.yaml'))
abort('wrong hooks') unless v['scriptings'].map(&:keys) == [['http_request'], ['http_response'], ['http_response']]
a = v['scriptings'][0]['http_request']
b = v['scriptings'][1]['http_response']
abort('bad pin') unless a['script_url'].sub('spotify-lyrics-request.js', 'spotify-lyrics.js') == b['script_url'] && a['script_url'].end_with?('spotify-lyrics-request.js?v=0.4.8')
abort('binary flags') unless b['body_required'] && b['binary_body'] && b['max_size'] == 262144 && b['timeout'] == 12 && a['timeout'] == 3
abort('mitm changed') unless v['mitm']['hostnames'] == ['spclient.wg.spotify.com', '*-spclient.spotify.com']
abort('six sources missing') unless v['env_schema']['FALLBACK_PROVIDER']['options'] == ['auto', 'lrclib', 'qq', 'netease', 'kugou', 'kuwo', 'lyricsovh', 'off']
v['scriptings'].each do |entry|
 options=entry.values.first
 abort('unsupported Egern option') unless (options.keys - ['name','match','script_url','env','update_interval','max_size','timeout','body_required','binary_body','disabled']).empty?
 abort('invalid Egern timeout') unless options['timeout'].is_a?(Integer) && options['timeout'] > 0 && options['timeout'] <= 600
end

c=v['scriptings'][2]['http_response']
abort('bad entry') unless c['script_url'] == b['script_url'].sub('spotify-lyrics.js','spotify-lyrics-entry.js') && c['timeout'] == 3 && c['max_size'] == 131072
['color-lyrics/v2/track/76XUZSb13QUuj1HECY4Hvo','extended-metadata/v0/extended-metadata','scrollsita/v1/scroll/spotify:track:76XUZSb13QUuj1HECY4Hvo','bootstrap/v1/bootstrap'].each do |p|
 u='https://spclient.wg.spotify.com/'+p
 abort('overlapping routes') unless [b,c].count{|x| Regexp.new(x['match']).match?(u)} == 1
end

puts 'Egern YAML native configuration checks passed.'
