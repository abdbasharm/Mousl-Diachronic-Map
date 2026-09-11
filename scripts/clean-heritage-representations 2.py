"""One named heritage representation per era; homogeneous geometry layers."""
from pathlib import Path
import json,copy,hashlib
from shapely.geometry import shape,mapping,Polygon
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'data'
REV=DATA/'revisions/heritage-representations-20260911';BEFORE=REV/'before'
BEFORE.mkdir(parents=True,exist_ok=True)
if not (BEFORE/'manifest.json').exists():(BEFORE/'manifest.json').write_bytes((DATA/'manifest.json').read_bytes())
manifest=json.loads((BEFORE/'manifest.json').read_text())
layers=[l for l in manifest['layers'] if 'heritage' in l['layer'].lower()]
files={}
for l in layers:
 p=BEFORE/l['file']
 if not p.exists():p.write_bytes((DATA/l['file']).read_bytes())
 files[l['file']]=json.loads(p.read_text())
def name(f):return str(f.get('properties',{}).get('Building N') or f.get('properties',{}).get('Name') or '').strip()
def rename(f,n):
 f['properties'].setdefault('heritage_original_name',name(f))
 for key in ['Building N','Name','name']:
  if f['properties'].get(key):f['properties'][key]=n
def kind(f):return 'point' if f['geometry']['type'] in ['Point','MultiPoint'] else 'polygon'
audit={'removed':[],'renamed':[],'relocated':[],'layers':[]}
byyear={}
for l in layers:
 assert len(l['years'])==1
 y=l['years'][0]
 for i,f in enumerate(files[l['file']]['features']):
  byyear.setdefault(y,[]).append({'file':l['file'],'record':i+1,'feature':copy.deepcopy(f)})
for y,records in byyear.items():
 for r in records:
  f=r['feature'];n=name(f);new=n
  if n=='الجامع الأموي ودار الإمارة':new='الجامع الأموي'
  if y==637 and n=='كنيسة الطاهرة السريانية':new='كنيسة الطاهرة السريانية الكاثوليكية'
  # Two distinct churches share an incomplete name in these eras. Their positions
  # match the separately named Chaldean/eastern and Syriac/western 1852 records.
  if n=='كنيسة الطاهرة الخارجية' and y in [1919,1944]:
   new='كنيسة الطاهرة الخارجية (الكلدان)' if shape(f['geometry']).centroid.x>43.122 else 'كنيسة الطاهرة الخارجية (السريان)'
  if new!=n:
   audit['renamed'].append({'year':y,'file':r['file'],'record':r['record'],'before':n,'after':new});rename(f,new)
 groups={}
 for r in records:
  key=name(r['feature']) or f"unnamed:{r['file']}:{r['record']}"
  groups.setdefault(key,[]).append(r)
 kept=[]
 for n,group in groups.items():
  # Polygon preferred to point. For duplicate polygons retain the original mapped
  # occurrence before an inferred addition, then the larger footprint deterministically.
  best=min(group,key=lambda r:(kind(r['feature'])=='point',bool(r['feature']['properties'].get('heritage_added_from_workbook')),-shape(r['feature']['geometry']).area,r['file'],r['record']))
  kept.append(best)
  for r in group:
   if r is best:continue
   audit['removed'].append({'year':y,'name':n,'removed_file':r['file'],'removed_record':r['record'],'kept_file':best['file'],'kept_record':best['record'],'kept_type':best['feature']['geometry']['type']})
 byyear[y]=kept
# Use the nearest later mapped footprint that is wholly inside the 1852 enclosure.
wall=shape(json.loads((DATA/'1852_City_Wall.geojson').read_text())['features'][0]['geometry'])
enclosure=Polygon(list(wall.geoms[0].coords));assert enclosure.is_valid
source=next(r for r in byyear[1919] if name(r['feature'])=='جامع الزيواني')
target=next(r for r in byyear[1852] if name(r['feature'])=='جامع الزيواني')
assert enclosure.covers(shape(source['feature']['geometry']))
old=copy.deepcopy(target['feature']['geometry']);target['feature']['geometry']=copy.deepcopy(source['feature']['geometry'])
target['feature']['properties'].update(heritage_geometry_source_file=source['file'],heritage_geometry_source_record=source['record'],heritage_geometry_source_year=1919,heritage_location_correction='1852 location corrected from mapped 1919 footprint inside the 1852 historic wall')
audit['relocated'].append({'year':1852,'name':'جامع الزيواني','before_centroid':list(shape(old).centroid.coords)[0],'after_centroid':list(shape(source['feature']['geometry']).centroid.coords)[0],'source_year':1919,'inside_wall':True})
newlayers=[l for l in manifest['layers'] if 'heritage' not in l['layer'].lower()]
for y,records in sorted(byyear.items()):
 for category in ['polygon','point']:
  selected=[r for r in records if kind(r['feature'])==category]
  if not selected:continue
  existing=[l for l in layers if y in l['years'] and ('point' in l['layer'].lower())==(category=='point')]
  if existing:layer=existing[0]
  else:
   stem=f'{y}_Heritage_Buildings'+('_Points' if category=='point' else '')
   layer={'file':stem+'.geojson','layer':stem,'years':[y]}
  fc={'type':'FeatureCollection','name':layer['layer'],'features':[r['feature'] for r in selected]}
  (DATA/layer['file']).write_text(json.dumps(fc,ensure_ascii=False,separators=(',',':')))
  newlayers.append(layer);audit['layers'].append({'year':y,'file':layer['file'],'geometry':category,'count':len(selected)})
manifest['layers']=newlayers
(DATA/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(REV/'report.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
print(json.dumps({k:len(v) for k,v in audit.items()}))
