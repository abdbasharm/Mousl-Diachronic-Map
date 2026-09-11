/* Add reproducible Space Syntax graph values to downloadable QGIS line layers. */
const fs=require('fs'),path=require('path'),A=require('../analysis-worker.js');
const root=path.join(__dirname,'..'),manifestPath=path.join(root,'data/derived/manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath));
for(const year of [1906,1919,1944]){
 const report=manifest[year],file=path.join(root,report.file),fc=JSON.parse(fs.readFileSync(file));
 const result=A.run({year,networkInfo:report,layers:[{layerInfo:{layer:`${year}_Roads_Derived_Centerlines`,years:[year]},data:fc}]});
 if(result.roads.features.length!==fc.features.length)throw Error('Unexpected feature count');
 fc.features.forEach((f,i)=>{
  const v=result.roads.features[i].properties;
  Object.assign(f.properties,{connectivity:v.connectivity,mean_depth:v.depth,integration_1_md:v.integration,reachable_parts:v.reachable,component_size:v.componentSize,analysis_method:'street-part graph; shared junction IDs; integration=1/mean depth within connected component'});
 });
 fs.writeFileSync(file,JSON.stringify(fc));
 report.main_file=`data/derived/${year}_main_network.geojson`;
 fs.writeFileSync(path.join(root,report.main_file),JSON.stringify({...fc,name:`${year} main derived street network`,features:fc.features.filter(f=>f.properties.component===1)}));
 report.metrics={connectivity:'number of directly adjacent path parts',mean_depth:'mean shortest-path steps to reachable path parts',integration_1_md:'reciprocal mean depth within the connected component; null when isolated',component_size:'reachable path parts including self'};
 fs.writeFileSync(path.join(root,`data/derived/${year}_centerline_report.json`),JSON.stringify(report,null,2));
 console.log(`${year}: ${fc.features.length} paths with metrics; ${report.largest_component_paths} in main network`);
}
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
