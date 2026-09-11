const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const A=require('../analysis-worker.js');
const close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const coordinate=([x,y])=>[43.128+x/(111195*Math.cos(36.34*Math.PI/180)),36.34+y/111195];
const square={type:'Polygon',coordinates:[[[0,0],[100,0],[100,100],[0,100],[0,0]].map(coordinate)]};
const s=A.morphology(square);close(s.area,10000,1e-3);close(s.perimeter,400,1e-4);close(s.compactness,Math.PI/4);assert.ok(s.dimension>.9&&s.dimension<1.2);assert.ok(s.fit>.98);
const hole={type:'Polygon',coordinates:[square.coordinates[0],[[25,25],[75,25],[75,75],[25,75],[25,25]].map(coordinate)]};close(A.morphology(hole).area,7500,1e-3);close(A.morphology(hole).perimeter,600,1e-4);
assert.equal(A.morphology({type:'Polygon',coordinates:[[[0,0],[0,0],[0,0],[0,0]]]}).compactness,null);
const metrics=A.graphMetrics([[1],[0,2],[1],[]]);close(metrics[0].depth,1.5);close(metrics[0].integration,2/3);assert.equal(metrics[1].connectivity,2);assert.equal(metrics[3].depth,null);assert.equal(metrics[3].integration,null);
function road(points){return {xy:points,bbox:A.bounds(points)}}
assert.equal(A.connected(road([[0,0],[100,0]]),road([[50,-50],[50,50]]),0),true);
assert.equal(A.connected(road([[0,0],[100,0]]),road([[104,0],[150,0]]),0),false);
assert.equal(A.connected(road([[0,0],[100,0]]),road([[104,0],[150,0]]),5),true);
assert.equal(A.connected(road([[0,0],[100,0]]),road([[0,20],[100,20]]),5),false);
const root=path.join(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'data/manifest.json')));
for(const year of [637,1778,1852,2020]){
 const layers=manifest.layers.filter(l=>l.years.includes(year)).map(layerInfo=>({layerInfo,data:JSON.parse(fs.readFileSync(path.join(root,'data',layerInfo.file)))}));
 const before=JSON.stringify(layers),r=A.run({year,layers,tolerance:5});assert.equal(JSON.stringify(layers),before);
 if(year===637){assert.equal(r.buildings.features.length,0);assert.equal(r.roads.features.length,0);}
 else {assert.ok(r.buildings.features.some(f=>f.properties.compactness>0));assert.ok(r.roads.features.some(f=>f.properties.connectivity>0));assert.ok(r.roads.features.some(f=>f.properties.integration>0));}
 console.log(year,JSON.stringify({buildings:r.buildings.features.length,streets:r.roads.features.length,components:r.components,isolated:r.isolated}));
}
console.log('PASS: geometry, holes, boundary scaling, graph distances, isolation, gap tolerance, real datasets and input immutability.');
