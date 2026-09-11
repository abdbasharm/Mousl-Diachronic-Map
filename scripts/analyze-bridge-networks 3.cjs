const fs=require('node:fs'),path=require('node:path'),A=require('../analysis-worker.js');
const root=path.join(__dirname,'..'),file=path.join(root,'data/analysis-networks/manifest.json');
const reports=JSON.parse(fs.readFileSync(file));
for(const [year,info] of Object.entries(reports)){
 const fc=JSON.parse(fs.readFileSync(path.join(root,info.file)));
 const result=A.run({year:Number(year),tolerance:5,layers:[{layerInfo:{layer:`${year}_Roads_Prepared`},data:fc}]});
 if(result.roads.features.length!==fc.features.length)throw Error('Unexpected duplicate or invalid part');
 fc.features.forEach((f,i)=>{const p=result.roads.features[i].properties;Object.assign(f.properties,{component:p.derived_component,connectivity:p.connectivity,mean_depth:p.depth,integration_1_md:p.integration,component_size:p.componentSize});});
 info.components=result.components;info.isolated=result.isolated;info.main_file=`data/analysis-networks/${year}_main_network.geojson`;
 const main={...fc,features:fc.features.filter(f=>f.properties.component===1)};info.largest_component_paths=main.features.length;
 info.main_bridges=main.features.filter(f=>f.properties.kind==='bridge').length;
 fs.writeFileSync(path.join(root,info.file),JSON.stringify(fc));fs.writeFileSync(path.join(root,info.main_file),JSON.stringify(main));
 console.log(year,{parts:fc.features.length,components:info.components,main:main.features.length,bridges:info.bridges,mainBridges:info.main_bridges});
}
fs.writeFileSync(file,JSON.stringify(reports,null,2));
