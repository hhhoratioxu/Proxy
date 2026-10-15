"""Independent official Protobuf SDK validation; not a production dependency.
Usage: python decode-native.py PACKET_DIRECTORY [TEMPORARY_PROTOBUF_SDK_PATH]
Public native field facts only; no Spotify or third-party plugin code copied.
"""
import sys,json
from pathlib import Path
if len(sys.argv)>2: sys.path.insert(0,sys.argv[2])
import google.protobuf
from google.protobuf import descriptor_pb2,descriptor_pool,message_factory
from google.protobuf.message import DecodeError
schema=descriptor_pb2.FileDescriptorProto(name='native_lyrics_validation.proto',package='verse.validation',syntax='proto3')
def message(name,fields):
    m=schema.message_type.add(name=name)
    for number,name,kind,repeated,type_name in fields:
        f=m.field.add(number=number,name=name,type=kind,label=3 if repeated else 1)
        if type_name:f.type_name=type_name
message('Line',[(1,'offset_ms',5,False,None),(2,'content',9,False,None)])
message('Colors',[(1,'background',13,False,None),(2,'text',13,False,None),(3,'highlight',13,False,None)])
message('Data',[(1,'time_synchronized',8,False,None),(2,'lines',11,True,'.verse.validation.Line'),(5,'provided_by',9,False,None)])
message('Lyrics',[(1,'data',11,False,'.verse.validation.Data'),(2,'colors',11,False,'.verse.validation.Colors')])
pool=descriptor_pool.DescriptorPool();pool.Add(schema)
Lyrics=message_factory.GetMessageClass(pool.FindMessageTypeByName('verse.validation.Lyrics'))
root=Path(sys.argv[1]);value=Lyrics();value.ParseFromString((root/'native.pb').read_bytes())
assert len(value.data.lines)>0 and value.data.time_synchronized
assert value.colors.text==0xffffffff and value.colors.highlight==0xffffffff
try:
    Lyrics().ParseFromString((root/'old.json').read_bytes())
    raise AssertionError('old JSON incorrectly accepted as native protobuf')
except DecodeError:
    pass
report=json.loads((root/'report.json').read_text())
report['independentDecoder']={'library':'google.protobuf','version':google.protobuf.__version__,'oldJsonRejected':True,'newProtobufAccepted':True,'timedRows':len(value.data.lines),'provider':value.data.provided_by,'unsignedColorsAccepted':True,'bodyPublished':False}
print(json.dumps(report,ensure_ascii=False,indent=2))
