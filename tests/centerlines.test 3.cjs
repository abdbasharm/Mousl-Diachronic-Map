const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const A=require('../analysis-worker.js'),root=path.join(__dirname,'..');
const metadata=JSON.parse(fs.readFileSync(path.join(root,'data/derived/manifest.json')));
for(const year of [1906,1919,1944]){
 const info=metadata[year],data=JSON.parse(fs.readFileSync(path.join(root,info.file)));
 const endpoints=new Map();
 for(const f of data.features){
  assert.equal(f.geometry.type,'LineString');assert.equal(f.properties.origin,'derived_polygon_centerline');
  assert.ok(f.geometry.coordinates.length>=2);
  for(const [node,point] of [[f.properties.from_node,f.geometry.coordinates[0]],[f.properties.to_node,f.geometry.coordinates.at(-1)]]){
   if(endpoints.has(node))assert.deepEqual(point,endpoints.get(node));else endpoints.set(node,point);
  }
 }
 for(const [file,sha] of Object.entries(info.source_sha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',file))).digest('hex'),sha);
 const r=A.run({year,tolerance:15,networkInfo:info,layers:[{layerInfo:{layer:`${year}_Roads_Derived_Centerlines`,years:[year]},data}]});
 assert.equal(r.exactJunctions,true);assert.equal(r.tolerance,0);assert.equal(r.components,info.components);assert.equal(r.roads.features.length,info.paths);
 const main=JSON.parse(fs.readFileSync(path.join(root,info.main_file)));
 assert.equal(main.features.length,info.largest_component_paths);
 assert.ok(main.features.every(f=>f.properties.component===1));
 data.features.forEach((f,i)=>{
  assert.equal(f.properties.connectivity,r.roads.features[i].properties.connectivity);
  assert.equal(f.properties.mean_depth,r.roads.features[i].properties.depth);
  assert.equal(f.properties.integration_1_md,r.roads.features[i].properties.integration);
 });
 const vals=r.roads.features.map(f=>f.properties.integration).filter(x=>x!==null);
 assert.ok(vals.length>data.features.length*.8);assert.ok(Math.max(...vals)>Math.min(...vals));
 console.log(year,JSON.stringify({paths:r.roads.features.length,components:r.components,withIntegration:vals.length,range:[Math.min(...vals),Math.max(...vals)]}));
}
// Derived paths use explicit junctions, not accidental proximity through an obstacle.
const feature=(id,a,b,coords)=>({type:'Feature',geometry:{type:'LineString',coordinates:coords},properties:{id,origin:'derived_polygon_centerline',from_node:a,to_node:b}});
const data={type:'FeatureCollection',features:[feature(1,'a','b',[[43.1,36.3],[43.101,36.3]]),feature(2,'c','d',[[43.1,36.30001],[43.101,36.30001]])]};
const r=A.run({year:1906,tolerance:15,layers:[{layerInfo:{layer:'1906_Roads',years:[1906]},data}]});
assert.equal(r.components,2);assert.equal(r.isolated,2);
console.log('PASS: shared junction coordinates, source hashes, all three networks, nonconstant analysis and no false proximity connections.');
