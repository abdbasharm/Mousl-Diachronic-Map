const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),data=path.join(root,'data');
const read=p=>JSON.parse(fs.readFileSync(p));
const manifest=read(path.join(data,'manifest.json')),audit=read(path.join(data,'revisions/heritage-representations-20260911/report.json'));
const byYear=new Map(),names=f=>f.properties?.['Building N']||f.properties?.Name||'';
for(const l of manifest.layers.filter(l=>/heritage/i.test(l.layer))){
 const fc=read(path.join(data,l.file));const types=new Set(fc.features.map(f=>/Point/.test(f.geometry.type)?'point':'polygon'));
 assert.equal(types.size,1,`${l.file} mixes points and polygons`);
 for(const year of l.years){
  if(!byYear.has(year))byYear.set(year,[]);
  byYear.get(year).push(...fc.features);
 }
}
for(const [year,features] of byYear){
 const seen=new Set();
 for(const f of features){const n=names(f);if(!n)continue;assert.ok(!seen.has(n),`${year}: duplicate ${n}`);seen.add(n);}
}
const prior=read(path.join(data,'revisions/heritage-years-20260911/report.json'));
for(const m of prior.matches)for(const year of m.years)assert.ok(byYear.get(year).some(f=>names(f)===m.canonical),`${m.canonical} missing in ${year}`);
for(const year of [637,912])assert.equal(byYear.get(year).filter(f=>names(f)==='الجامع الأموي').length,1);
for(const year of [1919,1944])for(const suffix of ['الكلدان','السريان'])assert.ok(byYear.get(year).some(f=>names(f)===`كنيسة الطاهرة الخارجية (${suffix})`));
const z=byYear.get(1852).find(f=>names(f)==='جامع الزيواني');
const source=byYear.get(1919).find(f=>names(f)==='جامع الزيواني');assert.deepEqual(z.geometry,source.geometry);
// Ray casting against the mapped 1852 wall, closed along its final boundary edge.
const ring=read(path.join(data,'1852_City_Wall.geojson')).features[0].geometry.coordinates[0];
function inside([x,y]){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
for(const poly of z.geometry.coordinates)for(const point of poly[0])assert.ok(inside(point),'Ziwani footprint outside wall');
const beforeManifest=read(path.join(data,'revisions/heritage-representations-20260911/before/manifest.json'));
let beforeCount=0;for(const l of beforeManifest.layers.filter(l=>/heritage/i.test(l.layer)))beforeCount+=read(path.join(data,'revisions/heritage-representations-20260911/before',l.file)).features.length;
assert.equal(beforeCount-[...byYear.values()].reduce((n,fs)=>n+fs.length,0),audit.removed.length);
console.log(`PASS: one named representation per era across ${byYear.size} eras, homogeneous geometry layers, retained workbook coverage, distinct churches, and Ziwani inside the 1852 wall.`);
