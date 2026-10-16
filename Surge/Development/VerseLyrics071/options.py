# Add plugin-owned preferences using each client's existing native argument form.
def apply_options(files, options):
 for opt in options:
  key,default,label,desc,values=opt['key'],opt['default'],opt['label'],opt['desc'],opt['values']
  p='Loon/script/SpotifyLyrics.plugin';s=files[p]
  if '\n'+key+' = ' not in s:
   field=(f'{key} = switch,{default},type=boolean' if values==['true','false'] else f'{key} = select,'+','.join('"'+v+'"' for v in values)+',type=string')+f',tag={label},desc={desc}\n'
   s=s.replace('[Argument]\n','[Argument]\n'+field).replace('}) with tag=', ', ${'+key+'}}) with tag=')
  files[p]=s
  p='Egern/script/SpotifyLyrics.yaml';s=files[p]
  if '\n  '+key+':' not in s:
   field=f'  {key}:\n    name: {label}\n    description: {desc}\n    default_value: "{default}"\n    options:\n'+''.join('    - "'+v+'"\n' for v in values)
   s=s.replace('env_schema:\n','env_schema:\n'+field).replace("      SOURCE_TRANSLATIONS: 'true'", "      SOURCE_TRANSLATIONS: 'true'\n      "+key+': "'+default+'"')
  files[p]=s
  for c,e in [('Surge','sgmodule'),('Shadowrocket','sgmodule'),('QuantumultX','conf')]:
   p=f'{c}/script/SpotifyLyrics.{e}';s=files[p]
   if key+'=' not in s:s=s.replace('SOURCE_TRANSLATIONS=true','SOURCE_TRANSLATIONS=true&'+key+'='+default)
   files[p]=s
  for c in ['Egern','Loon','Surge','Shadowrocket','QuantumultX']:
   p=c+'/Docs/SpotifyLyrics.md';s=files[p]
   if '| `'+key+'` |' not in s:
    row=f'| `{key}` | `{default}` | {desc} 可选：'+', '.join('`'+v+'`' for v in values)+'。 |\n'
    s=s.replace('| `SOURCE_TRANSLATIONS`',row+'| `SOURCE_TRANSLATIONS`').replace('上述五项设置','上述设置')
   files[p]=s
