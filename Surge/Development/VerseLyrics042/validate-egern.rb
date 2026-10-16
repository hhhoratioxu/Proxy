require 'yaml'
v = YAML.load_file(File.join(__dir__, 'publish/Egern/script/SpotifyLyrics.yaml'))
abort('wrong hooks') unless v['scriptings'].map(&:keys) == [['http_request'], ['http_response']]
a = v['scriptings'][0]['http_request']
b = v['scriptings'][1]['http_response']
abort('bad pin') unless a['script_url'] == b['script_url'] && a['script_url'].end_with?('?v=0.4.2')
abort('binary flags') unless b['body_required'] && b['binary_body'] && b['max_size'] == 2097152 && b['timeout'] == 25 && a['timeout'] == 3
abort('mitm changed') unless v['mitm']['hostnames'] == ['spclient.wg.spotify.com', '*-spclient.spotify.com']
puts 'Egern YAML native configuration checks passed.'
