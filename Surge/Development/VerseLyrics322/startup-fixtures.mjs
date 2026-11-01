import {join,dataField,stringField,numberField,base62Hex,utf8} from './core/spotify-lyrics.js';
export const id='0000000000000000000001',uri='spotify:track:'+id;
const scope='ios-feature-lyrics',flag='enable_has_lyrics_check_bypass';
export function startupFixture(kind='extended',padding=8192){
 const opaque='Self-written opaque data. '.repeat(Math.ceil(padding/26)).slice(0,padding);
 const meta=join([dataField(1,Buffer.from(base62Hex(id),'hex')),stringField(2,'Paper Lantern'),dataField(3,stringField(2,'Quiet Walk')),dataField(4,stringField(2,'Ada North')),numberField(7,360000),numberField(18,0),stringField(100,opaque)]);
 const config=join([stringField(1,'self-written-configuration'),numberField(2,1000),dataField(3,join([dataField(1,join([stringField(1,scope),stringField(2,flag)])),dataField(3,numberField(1,0))])),stringField(98,opaque)]);
 let body,path,type='application/x-protobuf';
 if(kind==='metadata'){body=meta;path='metadata/4/track/'+base62Hex(id);}
 else if(kind==='extended'){
  body=dataField(2,join([numberField(2,10),dataField(3,join([stringField(2,uri),dataField(3,join([stringField(1,'type.googleapis.com/spotify.metadata.Track'),dataField(2,meta)]))]))]));path='extended-metadata/v0/extended-metadata';
 }else if(kind==='bootstrap'){
  body=config;for(const n of [1,1,1,1,1,2])body=dataField(n,body);path='bootstrap/v1/bootstrap';
 }else if(kind==='customize'){body=config;path='user-customization-service/v1/customize';}
 else if(kind==='scroll'){body=join([dataField(1,stringField(100,opaque)),stringField(98,uri)]);path='scrollsita/v1/scroll/'+uri;}
 else{
  const connect=kind.startsWith('connect'),json=kind.endsWith('json');
  path=(connect?'connect-state/v1/devices/':'context-resolve/v1/spotify:playlist:')+id;
  if(json){body=utf8(JSON.stringify(connect?{player_state:{track:{uri,metadata:{has_lyrics:false}},position:12345,opaque}}:{uri:'spotify:playlist:'+id,pages:[{tracks:[{uri,metadata:{has_lyrics:'false'}}]}],opaque}));type='application/json';}
  else {const track=join([stringField(1,uri),dataField(connect?3:4,join([stringField(1,'has_lyrics'),stringField(2,'false')])),stringField(100,opaque)]);body=connect?dataField(3,dataField(7,track)):join([stringField(1,'spotify:playlist:'+id),dataField(5,dataField(4,track))]);}
 }
 return{kind,url:'https://spclient.wg.spotify.com/'+path,type,body:Buffer.from(body)};
}
export const kinds=['metadata','extended','bootstrap','customize','scroll','context-json','connect-json','context-protobuf','connect-protobuf'];
