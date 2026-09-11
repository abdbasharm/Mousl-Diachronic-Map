const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),data=path.join(root,'data'),revision=path.join(data,'revisions/heritage-years-20260911');
const read=p=>JSON.parse(fs.readFileSync(p));
// Verify the first revision against its saved output; the subsequent cleanup
// intentionally removes duplicate rows and corrects one footprint.
const cleanupBefore=path.join(data,'revisions/heritage-representations-20260911/before');
const output=fs.existsSync(path.join(cleanupBefore,'manifest.json'))?cleanupBefore:data;
const report=read(path.join(revision,'report.json')),manifest=read(path.join(output,'manifest.json'));
const baseline=read(path.join(revision,'before/manifest.json'));
const name=f=>String(f.properties?.['Building N']||f.properties?.Name||f.properties?.name||'').trim();
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,report.source_workbook))).digest('hex'),report.source_sha256);
const originalLayers=baseline.layers.filter(l=>/heritage/i.test(l.layer));
const layers=manifest.layers.filter(l=>/heritage/i.test(l.layer));
const original=Object.fromEntries(originalLayers.map(l=>[l.file,read(path.join(revision,'before',l.file))]));
const current=Object.fromEntries(layers.map(l=>[l.file,read(path.join(output,l.file))]));
const renamed=new Set(report.renamed.map(r=>`${r.file}:${r.record}`));
for(const [file,fc] of Object.entries(original))for(const [index,f] of fc.features.entries()){
 const now=current[file].features[index];
 assert.deepEqual(now.geometry,f.geometry,'existing footprint changed');
 if(!renamed.has(`${file}:${index+1}`))assert.deepEqual(now,f,'unrelated record changed');
 else {
  const expected=report.renamed.find(r=>r.file===file&&r.record===index+1);
  assert.equal(name(now),expected.after);assert.equal(now.properties.heritage_original_name,expected.before);
 }
}
for(const match of report.matches)for(const year of match.years){
 assert.ok(layers.some(l=>l.years.includes(year)&&current[l.file].features.some(f=>name(f)===match.canonical)),`${match.canonical} missing in ${year}`);
}
const newKeys=new Set();
for(const addition of report.additions){
 const f=current[addition.target].features[addition.record-1];
 assert.equal(name(f),addition.name);assert.equal(f.properties.heritage_year,addition.year);
 assert.equal(f.properties.heritage_workbook_row,addition.workbook_row);
 assert.deepEqual(f.geometry,original[addition.geometry_source_file].features[addition.geometry_source_record-1].geometry);
 const key=`${addition.name}:${addition.year}`;assert.ok(!newKeys.has(key));newKeys.add(key);
 assert.ok(!originalLayers.some(l=>l.years.includes(addition.year)&&original[l.file].features.some(old=>report.matches.find(m=>m.canonical===addition.name).aliases_found.includes(name(old)))),'unnecessary duplicate added');
}
assert.equal(Object.values(current).reduce((n,fc)=>n+fc.features.length,0)-Object.values(original).reduce((n,fc)=>n+fc.features.length,0),report.additions.length);
assert.ok(layers.some(l=>l.years.includes(1838)));
assert.ok(report.matches.some(m=>m.canonical==='كنيسة مار توما'));
assert.ok(report.matches.some(m=>m.canonical==='كنيسة مار توما للسريان الكاثوليك'));
for(const l of baseline.layers.filter(l=>!/heritage/i.test(l.layer)))assert.deepEqual(manifest.layers.find(n=>n.layer===l.layer),l);
console.log(`PASS: ${report.matches.length} matched identities, ${report.additions.length} additions, ${report.renamed.length} renames; coverage, copied geometry, provenance and unrelated records verified.`);
