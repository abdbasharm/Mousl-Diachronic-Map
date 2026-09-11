"""Prepare analysis-only street/bridge layers; retain originals and audit approach links."""
import json, hashlib
from pathlib import Path
from shapely.geometry import shape, mapping, Point, LineString
from shapely.ops import transform, unary_union, nearest_points
from shapely import make_valid
from pyproj import Transformer

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/analysis-networks'
OUT.mkdir(exist_ok=True)
manifest=json.loads((ROOT/'data/manifest.json').read_text())['layers']
forward=Transformer.from_crs(4326,32638,always_xy=True).transform
back=Transformer.from_crs(32638,4326,always_xy=True).transform
reports={}
for year in [1944,1966,1988,2003,2020]:
    layers=[l for l in manifest if year in l['years']]
    source_files=[]
    def read(file):
        source_files.append(file)
        return json.loads((ROOT/'data'/file).read_text())['features']
    obstacles=[]
    for l in layers:
        name=l['layer'].lower()
        if any(s in name for s in ['building','buidling','block']) and not any(s in name for s in ['photo','point','change']):
            obstacles += [make_valid(transform(forward,shape(f['geometry']))) for f in read(l['file']) if f.get('geometry') and f['geometry']['type'] in ['Polygon','MultiPolygon']]
    blocked=unary_union(obstacles)
    features=[]
    def lines(file,kind):
        for i,f in enumerate(read(file)):
            g=f.get('geometry')
            if not g or g['type'] not in ['LineString','MultiLineString']:continue
            for part,coords in enumerate([g['coordinates']] if g['type']=='LineString' else g['coordinates']):
                props={**(f.get('properties') or {}),'kind':kind,'source_record':f'{file}:{i}:{part}'}
                features.append({'type':'Feature','geometry':{'type':'LineString','coordinates':coords},'properties':props})
    if year==1944:
        lines('derived/1944_derived_centerlines.geojson','street')
    elif year==2020:
        # The underscore Roads file is 162 closed outlines. Use the supplied open lines.
        for file in ['2020-Roads.geojson','2020-_Big-Roads.geojson','2020-_Small_Roads.geojson']:lines(file,'street')
    else:
        for l in layers:
            if 'road' in l['layer'].lower():lines(l['file'],'street')
    streets=[(f,transform(forward,shape(f['geometry']))) for f in features]
    for l in layers:
        if 'bridge' in l['layer'].lower():lines(l['file'],'bridge')
    audit=[]
    for f in features:
        if f['properties']['kind']!='bridge':continue
        coords=list(transform(forward,shape(f['geometry'])).coords)
        targets=[];ends=[]
        # Only the nearest street at an actual bridge endpoint is eligible. Never
        # connect deck crossings or search for a farther street around an obstacle.
        for index in [0,-1]:
            point=Point(coords[index])
            street,line=min(streets,key=lambda pair:point.distance(pair[1]))
            landing=nearest_points(point,line)[1];gap=point.distance(landing)
            approach=LineString([point,landing])
            crossing=approach.intersection(blocked).length
            accepted=gap<=50 and crossing<1e-6
            ends.append({'gap_m':round(gap,3),'building_crossing_m':round(crossing,3),'accepted':accepted,'target':street['properties']['source_record'] if accepted else None})
            if accepted:
                targets.append(street['properties']['source_record'])
                if gap>1e-6:
                    if index==0:coords.insert(0,landing.coords[0])
                    else:coords.append(landing.coords[0])
        f['geometry']=mapping(transform(back,LineString(coords)))
        f['properties'].update(bridge_targets=list(set(targets)),approach_method='nearest endpoint-to-street, at most 50 m, no building crossing',approach_added_m=round(sum(e['gap_m'] for e in ends if e['accepted']),3))
        audit.append({'record':f['properties']['source_record'],'name':f['properties'].get('Name'),'endpoints':ends})
    file=f'data/analysis-networks/{year}_network.geojson'
    (ROOT/file).write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
    reports[str(year)]={'year':year,'file':file,'prepared_bridges':True,'source_kind':'derived' if year==1944 else 'mapped','paths':len(features),'bridges':len(audit),'attached_bridges':sum(any(e['accepted'] for e in a['endpoints']) for a in audit),'bridge_audit':audit,'approach_limit_m':50,'source_sha256':{f:hashlib.sha256((ROOT/'data'/f).read_bytes()).hexdigest() for f in source_files}}
    print(year,'street parts',len(streets),'bridges',len(audit),'attached',reports[str(year)]['attached_bridges'])
(OUT/'manifest.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
