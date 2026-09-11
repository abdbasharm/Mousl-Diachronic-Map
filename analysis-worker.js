/* Pure geometry/network analysis, shared by the Web Worker and regression tests.
 * Local equirectangular coordinates in metres (reference latitude 36.34°).
 * No mutation of supplied attributes and no simulated location premiums.
 */
const AnalysisEngine = (() => {
    const project = ([lng,lat]) => [(lng-43.128)*111195*Math.cos(36.34*Math.PI/180),(lat-36.34)*111195];
    const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    function pointDistance(p,a,b) {
        const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy;
        const t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;
        return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
    }
    function intersects(a,b,c,d) {
        if(Math.max(a[0],b[0])+1e-8<Math.min(c[0],d[0])||Math.max(c[0],d[0])+1e-8<Math.min(a[0],b[0])||Math.max(a[1],b[1])+1e-8<Math.min(c[1],d[1])||Math.max(c[1],d[1])+1e-8<Math.min(a[1],b[1]))return false;
        const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
        return x*y<=1e-12 && z*w<=1e-12;
    }
    const bounds = coords => coords.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
    function connected(a,b,tolerance) {
        const x=a.bbox,y=b.bbox;
        if(x[2]+tolerance<y[0]||y[2]+tolerance<x[0]||x[3]+tolerance<y[1]||y[3]+tolerance<x[1])return false;
        for(let i=1;i<a.xy.length;i++) for(let j=1;j<b.xy.length;j++) if(intersects(a.xy[i-1],a.xy[i],b.xy[j-1],b.xy[j]))return true;
        for(const [first,second] of [[a.xy,b.xy],[b.xy,a.xy]]) for(const p of [first[0],first[first.length-1]]) for(let i=1;i<second.length;i++) if(pointDistance(p,second[i-1],second[i])<=tolerance+1e-8)return true;
        return false;
    }
    function graphMetrics(adjacency) {
        return adjacency.map((neighbors,root)=>{
            const dist=Array(adjacency.length).fill(-1),queue=[root];dist[root]=0;
            for(let i=0;i<queue.length;i++)for(const next of adjacency[queue[i]])if(dist[next]<0){dist[next]=dist[queue[i]]+1;queue.push(next);}
            const reachable=queue.length-1,total=dist.reduce((sum,d)=>sum+Math.max(0,d),0);
            const depth=reachable?total/reachable:null;
            return {connectivity:neighbors.length,depth,integration:depth?1/depth:null,reachable,componentSize:queue.length};
        });
    }
    function boundaryDimension(rings) {
        const b=bounds(rings.flat()),extent=Math.max(b[2]-b[0],b[3]-b[1]);
        if(!(extent>0))return {dimension:null,fit:null};
        const counts=[4,8,16,32,64,128].map(n=>{
            const cells=new Set(),size=extent/n;
            for(const ring of rings)for(let k=1;k<ring.length;k++){
                const a=[(ring[k-1][0]-b[0])/size,(ring[k-1][1]-b[1])/size],z=[(ring[k][0]-b[0])/size,(ring[k][1]-b[1])/size];
                const ts=[0,1];
                for(let axis=0;axis<2;axis++)if(Math.abs(z[axis]-a[axis])>1e-10){
                    for(let grid=Math.floor(Math.min(a[axis],z[axis]))+1;grid<Math.max(a[axis],z[axis]);grid++)ts.push((grid-a[axis])/(z[axis]-a[axis]));
                }
                ts.sort((x,y)=>x-y);
                for(let j=1;j<ts.length;j++){
                    const t=(ts[j-1]+ts[j])/2;
                    cells.add(`${Math.floor(a[0]+t*(z[0]-a[0]))},${Math.floor(a[1]+t*(z[1]-a[1]))}`);
                }
            }
            return cells.size;
        });
        if(counts.some(n=>n===0))return {dimension:null,fit:null};
        const xs=[4,8,16,32,64,128].map(Math.log),ys=counts.map(Math.log),mx=xs.reduce((a,b)=>a+b)/6,my=ys.reduce((a,b)=>a+b)/6;
        const cov=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0),vx=xs.reduce((s,x)=>s+(x-mx)**2,0),vy=ys.reduce((s,y)=>s+(y-my)**2,0);
        return {dimension:cov/vx,fit:vy?cov*cov/(vx*vy):null};
    }
    function morphology(geometry) {
        const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
        let area=0,perimeter=0;const rings=[];
        for(const polygon of polygons)for(let r=0;r<polygon.length;r++){
            const ring=polygon[r].map(project);if(ring.length<4||ring.some(p=>!p.every(Number.isFinite)))continue;
            let signed=0;for(let i=1;i<ring.length;i++){signed+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];perimeter+=Math.hypot(ring[i][0]-ring[i-1][0],ring[i][1]-ring[i-1][1]);}
            area+=(r===0?1:-1)*Math.abs(signed)/2;rings.push(ring);
        }
        if(!(area>0&&perimeter>0))return {compactness:null,area:null,perimeter:null,dimension:null,fit:null};
        return {area,perimeter,compactness:Math.min(1,4*Math.PI*area/perimeter**2),...boundaryDimension(rings)};
    }
    function run({year,layers,tolerance=5,networkInfo=null}) {
        const buildings=[],roads=[],keys=new Set();let duplicates=0;
        for(const {layerInfo,data} of layers){
            const name=layerInfo.layer.toLowerCase();
            const isBuilding=/(building|block)/.test(name)&&!/(heritage|photo|point)/.test(name);
            const isRoad=/(road|rounds|bridge)/.test(name);
            data.features.forEach((feature,index)=>{
                if(!feature.geometry)return;
                const g=feature.geometry,props=feature.properties||{};
                const label=String(props.Name||props.name||props['Building N']||'');
                if(isBuilding&&['Polygon','MultiPolygon'].includes(g.type))buildings.push({type:'Feature',geometry:g,properties:{record:`${layerInfo.layer}:${index}`,label,...morphology(g)}});
                if(isRoad&&['LineString','MultiLineString'].includes(g.type)){
                    const parts=g.type==='LineString'?[g.coordinates]:g.coordinates;
                    parts.forEach((coordinates,part)=>{
                        if(coordinates.length<2||coordinates.some(p=>p.length<2||!p.slice(0,2).every(Number.isFinite)))return;
                        const forward=JSON.stringify(coordinates),reverse=JSON.stringify([...coordinates].reverse()),key=forward<reverse?forward:reverse;
                        if(keys.has(key)){duplicates++;return;}keys.add(key);
                        const xy=coordinates.map(project);if(!xy.some(p=>Math.hypot(p[0]-xy[0][0],p[1]-xy[0][1])>1e-6))return;
                        roads.push({type:'Feature',geometry:{type:'LineString',coordinates},properties:{record:`${layerInfo.layer}:${index}:${part}`,label,kind:props.kind||(/bridge/.test(name)?'bridge':'street'),source_record:props.source_record||`${layerInfo.layer}:${index}:${part}`,bridge_targets:props.bridge_targets||null,origin:props.origin||'mapped',from_node:props.from_node||null,to_node:props.to_node||null,derived_component:props.component||null},xy,bbox:bounds(xy)});
                    });
                }
            });
        }
        const adjacency=roads.map(()=>[]);
        const isDerived=f=>f.properties.origin==='derived_polygon_centerline'&&f.properties.from_node&&f.properties.to_node;
        const streetParts=roads.filter(f=>f.properties.kind!=='bridge');
        const exactJunctions=streetParts.length>0&&streetParts.every(isDerived);
        const atEndpoint=(a,b,gap)=>[a.xy[0],a.xy.at(-1)].some(p=>b.xy.slice(1).some((q,k)=>pointDistance(p,b.xy[k],q)<=gap+1e-8));
        for(let i=0;i<roads.length;i++)for(let j=i+1;j<roads.length;j++){
            const a=roads[i],b=roads[j],ab=a.properties.kind==='bridge',bb=b.properties.kind==='bridge';
            let link=false;
            if(ab||bb){
                if(ab&&bb)link=[a.xy[0],a.xy.at(-1)].some(p=>[b.xy[0],b.xy.at(-1)].some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=Math.max(.1,tolerance)));
                else {
                    const bridge=ab?a:b,street=ab?b:a;
                    link=bridge.properties.bridge_targets ? bridge.properties.bridge_targets.includes(street.properties.source_record) : atEndpoint(bridge,street,tolerance);
                }
            }else if(isDerived(a)&&isDerived(b))link=[a.properties.from_node,a.properties.to_node].some(n=>n===b.properties.from_node||n===b.properties.to_node);
            else link=connected(a,b,tolerance);
            if(link){adjacency[i].push(j);adjacency[j].push(i);}
        }
        const metrics=graphMetrics(adjacency);
        const groups=[],seen=new Set();
        adjacency.forEach((_,root)=>{if(seen.has(root))return;const q=[root];seen.add(root);for(let i=0;i<q.length;i++)for(const n of adjacency[q[i]])if(!seen.has(n)){seen.add(n);q.push(n);}groups.push(q);});
        groups.sort((a,b)=>b.length-a.length);
        groups.forEach((group,index)=>group.forEach(i=>roads[i].properties.derived_component=index+1));
        const components=groups.length;
        roads.forEach((f,i)=>{Object.assign(f.properties,metrics[i]);delete f.xy;delete f.bbox;});
        return {year,tolerance:exactJunctions?0:tolerance,networkInfo,exactJunctions,buildings:{type:'FeatureCollection',features:buildings},roads:{type:'FeatureCollection',features:roads},components,duplicates,isolated:metrics.filter(m=>m.connectivity===0).length};
    }
    return {run,morphology,graphMetrics,connected,project,bounds};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=AnalysisEngine;
else self.onmessage=event=>{try{self.postMessage({id:event.data.id,result:AnalysisEngine.run(event.data)});}catch(error){self.postMessage({id:event.data.id,error:String(error.message||error)});}};
