require 'yaml'
require 'json'
root=File.expand_path('..',__dir__)
results=[]
['SpotifyLyrics.Diagnostics.yaml','SpotifyLyrics.Diagnostics.local.yaml'].each do |name|
  c=YAML.load_file(File.join(root,name))
  raise 'script count' unless c['scriptings'].length==4
  raise 'host scope' unless c['mitm']['hostnames']==['spclient.wg.spotify.com','*-spclient.spotify.com']
  scripts=c['scriptings']; request=scripts[0]['http_request']; response=scripts[1]['http_response']; schedule=scripts[2]['schedule']
  raise 'response bytes' unless response['body_required'] && response['binary_body'] && response['max_size']==2097152
  raise 'timeout' unless response['timeout']==25 && schedule['timeout']==3
  raise 'schedule' unless schedule['cron']=='* * * * *'
  raise 'widget entry' unless c['widgets'][0]['script_name']==scripts[3]['generic']['name']
  expected=name.end_with?('.local.yaml') ? 'spotify-lyrics-diagnostics.js' : 'https://raw.githubusercontent.com/hhhoratioxu/Proxy/main/Egern/script/SpotifyLyricsDiagnostics/spotify-lyrics-diagnostics.js?v=0.3.3-diag.1'
  scripts.each do |item|
    s=item.values.first;raise 'wrong source' unless s['script_url']==expected
    raise 'translation behavior' unless s['env']['TRANSLATION_ENABLED']=='true'
    raise 'source setting' unless s['env']['FALLBACK_PROVIDER']=='auto' && s['env']['DISCOVER_MISSING']=='true'
  end
  ['color-lyrics/v2/track/0000000000000000000001','metadata/4/track/00000000000000000000000000000001','extended-metadata/v0/extended-metadata','scrollsita/v1/scroll/spotify:track:0000000000000000000001'].each do |path|
    url='https://gae2-spclient.spotify.com:443/'+path+'?private=example'
    raise 'missing request' unless Regexp.new(request['match']).match?(url)
    raise 'missing response' unless Regexp.new(response['match']).match?(url)
  end
  raise 'observation scope' unless Regexp.new(response['match']).match?('https://spclient.wg.spotify.com/gander/v2/anything')
  ['https://accounts.spotify.com/login','https://spclient.wg.spotify.com.evil.test/path','http://spclient.wg.spotify.com/path'].each do |url|
    raise 'bad host accepted' if Regexp.new(response['match']).match?(url)
  end
  results << {file:name,status:'passed',scripts:4,notifications:'HTTP event and scheduled startup',clipboardAction:'documented Egern API'}
end
puts JSON.pretty_generate({status:'passed',variants:results,deviceVerified:false})
