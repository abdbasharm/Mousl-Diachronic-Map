"""Derive explicitly inferred, topologically connected paths from mapped road-area polygons.
Run with a Python environment containing shapely, scipy, scikit-image, pyproj and pillow.
Original GeoJSON is never modified. Output CRS: WGS84; operations: UTM 38N metres.
"""
from pathlib import Path
import json, math, hashlib, sys, collections, importlib.metadata
import numpy as np
import networkx as nx
from shapely import make_valid, union_all, contains_xy, prepare
from shapely.geometry import shape, mapping, LineString, Polygon
from shapely.ops import transform
from pyproj import Transformer
from skimage.morphology import skeletonize
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/derived'
RESOLUTION=1.0
SPUR_LENGTH=3.0
SIMPLIFY=.6
FORWARD=Transformer.from_crs(4326,32638,always_xy=True).transform
BACK=Transformer.from_crs(32638,4326,always_xy=True).transform
MANIFEST=json.loads((ROOT/'data/manifest.json').read_text())

def load_polygons(filename):
    fc=json.loads((ROOT/'data'/filename).read_text())
    gs=[]
    for f in fc['features']:
        if not f.get('geometry'):continue
        g=make_valid(transform(FORWARD,shape(f['geometry'])))
        if g.geom_type in ('Polygon','MultiPolygon'):gs.append(g)
        elif hasattr(g,'geoms'):gs.extend(x for x in g.geoms if x.geom_type in ('Polygon','MultiPolygon'))
    return union_all(gs)

def sources(year):
    road=f'{year}-Roads.geojson' if year==1944 else f'{year}_Roads.geojson'
    obstacles=[];water=[]
    for info in MANIFEST['layers']:
        if year not in info['years']:continue
        name=info['layer'].lower()
        if ('building' in name or 'buidling' in name or 'block' in name) and 'change' not in name and 'photo' not in name and 'point' not in name:obstacles.append(info['file'])
        if 'river' in name:water.append(info['file'])
    return road,obstacles,water

def build_network(corridor):
    minx,miny,maxx,maxy=corridor.bounds
    minx=math.floor(minx)-2;miny=math.floor(miny)-2
    width=math.ceil((maxx-minx)/RESOLUTION)+3;height=math.ceil((maxy-miny)/RESOLUTION)+3
    mask=np.zeros((height,width),dtype=bool)
    prepare(corridor)
    xs=minx+(np.arange(width)+.5)*RESOLUTION
    for row in range(0,height,128):
        ys=miny+(np.arange(row,min(row+128,height))+.5)*RESOLUTION
        mask[row:row+len(ys)]=contains_xy(corridor,xs[None,:],ys[:,None])
    skeleton=skeletonize(mask)
    points=set(zip(*np.nonzero(skeleton)))
    def xy(p):return (minx+(int(p[1])+.5)*RESOLUTION,miny+(int(p[0])+.5)*RESOLUTION)
    g=nx.Graph();g.add_nodes_from(points);rejected=0
    for r,c in sorted(points):
        for dr,dc in [(0,1),(1,-1),(1,0),(1,1)]:
            q=(r+dr,c+dc)
            if q not in points:continue
            # Avoid triangles at pixel corners; a cardinal connection already exists.
            if dr and dc and ((r+dr,c) in points or (r,c+dc) in points):continue
            if not corridor.covers(LineString([xy((r,c)),xy(q)])):
                rejected+=1;continue
            g.add_edge((r,c),q)
    # Collapse adjacent branch pixels into one junction with a representative on the skeleton.
    branch={p for p in g if g.degree(p)>=3}
    groups=[set(x) for x in nx.connected_components(g.subgraph(branch))]
    groups += [{p} for p in sorted(g) if g.degree(p)<=1]
    covered=set().union(*groups) if groups else set()
    for component in nx.connected_components(g):
        if not component&covered:groups.append({min(component)}) # closed loop, no ends/junctions
    owner={};reps={};routes={}
    for index,group in enumerate(groups):
        center=np.mean(list(group),axis=0)
        rep=min(group,key=lambda p:((p[0]-center[0])**2+(p[1]-center[1])**2,p))
        reps[index]=rep
        for p in group:owner[p]=index
        routes[index]=nx.single_source_shortest_path(g.subgraph(group),rep)
    used=set();vectors=nx.MultiGraph()
    def edge(a,b):return tuple(sorted((a,b)))
    for node,group in enumerate(groups):
        for p in sorted(group):
            for q in sorted(g[p]):
                if owner.get(q)==node or edge(p,q) in used:continue
                pixels=[p,q];used.add(edge(p,q));previous,current=p,q
                while current not in owner:
                    others=[n for n in g[current] if n!=previous]
                    if not others:break
                    nxt=others[0];used.add(edge(current,nxt));pixels.append(nxt);previous,current=current,nxt
                if current not in owner:continue
                target=owner[current]
                pixels=routes[node][p][:-1]+pixels+list(reversed(routes[target][current]))[1:]
                coords=[xy(p) for p in pixels]
                line=LineString(coords)
                if line.length>0:vectors.add_edge(node,target,coords=coords,length=line.length)
    # Remove only short terminal raster spurs; never connect across blocked space.
    pruned=0
    for u,v,k,d in list(vectors.edges(keys=True,data=True)):
        if d['length']<SPUR_LENGTH and (vectors.degree(u)==1 or vectors.degree(v)==1):vectors.remove_edge(u,v,k);pruned+=1
    vectors.remove_nodes_from(list(nx.isolates(vectors)))
    # Merge artificial degree-2 junctions left by pruning.
    changed=True
    while changed:
        changed=False
        for n in list(vectors.nodes):
            if vectors.degree(n)!=2:continue
            edges=list(vectors.edges(n,keys=True,data=True))
            if len(edges)!=2 or any(a==b for a,b,_,_ in edges):continue
            ends=[];paths=[]
            for a,b,k,d in edges:
                other=b if a==n else a
                coords=d['coords']
                if coords[-1]!=xy(reps[n]):coords=list(reversed(coords))
                ends.append(other);paths.append(coords)
            coords=paths[0]+list(reversed(paths[1]))[1:]
            vectors.remove_node(n)
            vectors.add_edge(ends[0],ends[1],coords=coords,length=LineString(coords).length)
            changed=True;break
    records=[]
    for u,v,k,d in vectors.edges(keys=True,data=True):
        line=LineString(d['coords'])
        simple=line.simplify(SIMPLIFY)
        if corridor.covers(simple):line=simple
        assert corridor.covers(line),'Centerline outside corridor'
        records.append((u,v,line))
    return records,vectors,dict(grid_width=width,grid_height=height,mask_pixels=int(mask.sum()),skeleton_pixels=len(points),unsafe_pixel_links_rejected=rejected,terminal_spurs_removed=pruned)

def preview(year,buildings,corridor,records):
    bounds=corridor.bounds;w=1300;scale=(w-60)/(bounds[2]-bounds[0]);h=int((bounds[3]-bounds[1])*scale)+110
    im=Image.new('RGB',(w,h),'#f4f3ed');draw=ImageDraw.Draw(im)
    def pts(coords):return [(30+(x-bounds[0])*scale,h-40-(y-bounds[1])*scale) for x,y in coords]
    polys=list(buildings.geoms) if hasattr(buildings,'geoms') else [buildings]
    for p in polys:
        if p.geom_type!='Polygon':continue
        draw.polygon(pts(p.exterior.coords),fill='#b9c0c2')
        for ring in p.interiors:draw.polygon(pts(ring.coords),fill='#f4f3ed')
    for _,_,line in records:draw.line(pts(line.coords),fill='#b62141',width=2)
    draw.text((30,16),f'{year} | Derived paths (red) | Mapped buildings (gray) | 1 m grid',fill='#182c33')
    im.save(OUT/f'{year}_centerline_review.png')

def derive(year):
    road,obstacle_files,water_files=sources(year)
    mapped=load_polygons(road)
    obstacles=union_all([load_polygons(p) for p in obstacle_files])
    water=union_all([load_polygons(p) for p in water_files])
    corridor=make_valid(mapped.difference(obstacles).difference(water))
    if corridor.is_empty:raise ValueError(f'{year}: no free road area')
    records,g,audit=build_network(corridor)
    components=sorted(nx.connected_components(g),key=lambda c:(-len(c),min(c)))
    membership={node:i+1 for i,c in enumerate(components) for node in c}
    features=[]
    for i,(u,v,line) in enumerate(records):
        # Endpoint node IDs follow coordinate orientation, which can differ from graph iteration.
        geometry=mapping(transform(BACK,line))
        start=line.coords[0];end=line.coords[-1]
        start_id=f'{start[0]:.3f}:{start[1]:.3f}';end_id=f'{end[0]:.3f}:{end[1]:.3f}'
        features.append({'type':'Feature','geometry':geometry,'properties':{
            'id':i+1,'year':year,'origin':'derived_polygon_centerline','from_node':f'{year}:{start_id}','to_node':f'{year}:{end_id}',
            'component':membership[u],'length_m':round(line.length,2),'grid_m':RESOLUTION,'source_polygon':road,
            'method':'road polygon minus buildings and water; skeleton thinning; junction-to-junction paths'
        }})
    network=union_all([line for _,_,line in records])
    building_crossing=network.intersection(obstacles).length
    outside=network.difference(corridor).length
    assert building_crossing<1e-6 and outside<1e-6
    file=f'{year}_derived_centerlines.geojson'
    (OUT/file).write_text(json.dumps({'type':'FeatureCollection','name':f'{year} derived centerlines','features':features},ensure_ascii=False,separators=(',',':')))
    source_files=[road,*obstacle_files,*water_files]
    report={
        'year':year,'file':f'data/derived/{file}','origin':'derived_polygon_centerline','working_crs':'EPSG:32638','output_crs':'EPSG:4326',
        'grid_m':RESOLUTION,'simplification_m':SIMPLIFY,'short_terminal_spur_threshold_m':SPUR_LENGTH,
        'paths':len(features),'junctions_and_ends':g.number_of_nodes(),'components':len(components),'largest_component_paths':sum(1 for u,v in g.edges() if u in components[0]),
        'length_km':round(sum(line.length for _,_,line in records)/1000,3),'building_crossing_length_m':building_crossing,'outside_corridor_length_m':outside,
        'mapped_road_area_m2':round(mapped.area,2),'usable_corridor_area_m2':round(corridor.area,2),**audit,
        'source_sha256':{f:hashlib.sha256((ROOT/'data'/f).read_bytes()).hexdigest() for f in source_files},
        'method':'Zhang skeletonization of a 1 m road-area mask after subtracting building/heritage footprints and river polygons. Adjacent junction pixels consolidated; degree-2 nodes merged. Edges outside the corridor rejected; no gap-bridging is used. Explicit shared endpoints define network connections.',
        'interpretation':'Automatically inferred paths, not surveyed street axes. Narrow/sub-grid alleys and access through open areas require review. Separate components are retained rather than joined through buildings.',
        'libraries':{p:importlib.metadata.version(p) for p in ['shapely','scikit-image','pyproj','numpy']}
    }
    preview(year,obstacles,corridor,records)
    (OUT/f'{year}_centerline_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:report[k] for k in ['year','paths','components','length_km','building_crossing_length_m','outside_corridor_length_m']}),flush=True)
    return report

if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    result={str(year):derive(year) for year in [1906,1919,1944]}
    (OUT/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
