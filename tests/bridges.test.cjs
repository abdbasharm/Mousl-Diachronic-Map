const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const A=require('../analysis-worker.js'),root=path.join(__dirname,'..');
const reports=JSON.parse(fs.readFileSync(path.join(root,'data/analysis-networks/manifest.json')));
for(const [year,info] of Object.entries(reports)){
 const data=JSON.parse(fs.readFileSync(path.join(root,info.file))),before=JSON.stringify(data);
 const run=features=>A.run({year:Number(year),tolerance:5,layers:[{layerInfo:{layer:year+'_Roads'},data:{type:'FeatureCollection',features}}]});
 const r=run(data.features),without=run(data.features.filter(f=>f.properties.kind!=='bridge'));
 assert.equal(JSON.stringify(data),before);
 assert.equal(r.roads.features.length,info.paths);assert.equal(r.components,info.components);
 assert.equal(r.roads.features.filter(f=>f.properties.kind==='bridge'&&f.properties.derived_component===1).length,info.main_bridges);
 const old=new Map(without.roads.features.map(f=>[f.properties.source_record,f.properties.integration]));
 assert.ok(r.roads.features.some(f=>old.has(f.properties.source_record)&&old.get(f.properties.source_record)!==f.properties.integration),'bridges must affect street values');
 for(const [file,hash] of Object.entries(info.source_sha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',file))).digest('hex'),hash);
 for(const record of info.bridge_audit)for(const end of record.endpoints)if(end.accepted){assert.ok(end.gap_m<=50);assert.ok(end.building_crossing_m<.05);}
 data.features.forEach((f,i)=>{
  assert.equal(f.properties.connectivity,r.roads.features[i].properties.connectivity);
  assert.equal(f.properties.integration_1_md,r.roads.features[i].properties.integration);
 });
 if(Number(year)===2020)assert.ok(data.features.filter(f=>f.properties.kind==='street').every(f=>JSON.stringify(f.geometry.coordinates[0])!==JSON.stringify(f.geometry.coordinates.at(-1))));
 console.log(year,{bridges:info.bridges,mainBridges:info.main_bridges,components:r.components});
}
const xy=([x,y])=>[43.128+x/(111195*Math.cos(36.34*Math.PI/180)),36.34+y/111195];
const feature=(coords,properties={})=>({type:'Feature',geometry:{type:'LineString',coordinates:coords.map(xy)},properties});
// A road under the middle of a bridge is not an entrance; a road at its end is.
const r=A.run({year:2020,tolerance:1,layers:[{layerInfo:{layer:'Roads'},data:{features:[feature([[0,0],[100,0]])]}},{layerInfo:{layer:'Bridges'},data:{features:[feature([[50,-50],[50,50]]),feature([[100,0],[150,0]])]}}]});
assert.equal(r.roads.features[1].properties.connectivity,0);assert.equal(r.roads.features[2].properties.connectivity,1);
// Adding a bridge must not switch derived streets to proximity-based connections.
const d=(a,b)=>({origin:'derived_polygon_centerline',from_node:a,to_node:b});
const mixed=A.run({year:1944,tolerance:15,layers:[{layerInfo:{layer:'Roads'},data:{features:[feature([[0,0],[100,0]],d('a','b')),feature([[0,2],[100,2]],d('c','d')),feature([[100,0],[150,0]],{kind:'bridge',bridge_targets:[]})]}}]});
assert.equal(mixed.components,3);
console.log('PASS: bridge effects, approach audit, immutable sources, download values, deck crossings and mixed derived topology.');
