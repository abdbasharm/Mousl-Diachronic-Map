"""Apply the user's era ranges to matched heritage identities only.
Add missing occurrences and unify names; preserve existing geometry and out-of-range records.
The immutable before/ snapshot makes reruns reproducible without multiplying features.
"""
import json, re, copy, hashlib
from pathlib import Path
import openpyxl

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
REV=DATA/'revisions/heritage-years-20260911'
BEFORE=REV/'before'
YEARS=[637,912,1096,1127,1778,1838,1852,1906,1919,1944,1966,1988,2003,2020]
BOOK=ROOT/'Heritage Buildings Years.xlsx'
# Explicit, reviewed identity matches. Do not infer identity from fuzzy name similarity.
MATCHES={
 'A01/A02':[('الجامع الأموي',['الجامع الأموي','الجامع الاموي','الجامع الاموي (المصفي)','جامع المصفي'])],
 'B03':[('كنيسة مار إشعيا',['كنيسة مار اشعيا','مار إيشوعياب','كاتدرائية مار إيشوعياب'])],
 'B15':[('كنيسة شمعون الصفا',['كنيسة شمعون الصفا'])],
 'B07':[('كنيسة الطاهرة القديمة',['كنيسة الطاهرة القديمة'])],
 'B11/B12':[('كنيسة مار توما',['كنيسة مارتوما','المعلم المبكر لكنيسة مار توما']),('كنيسة مار توما للسريان الكاثوليك',['كنيسة مار توما للسريان الكاثوليك','كنيسة مارتوما للسريان الكاثوليك'])],
 'I01':[('قلعة باشطابيا',['قلعة باشطابيا'])],
 'A03':[('الجامع النوري',['الجامع النوري','الجامع النوري الكبير'])],
 'A04':[('الجامع المجاهدي',['الجامع المجاهدي','جامع الخضر (المجاهدي)'])],
 'A06':[('جامع النبي جرجيس',['جامع النبي جرجيس','ضريح النبي جرجيس'])],
 'A21':[('جامع شيخ الشط',['جامع شيخ الشط'])],
 'C02':[('مرقد الشيخ فتحي',['مرقد الشيخ فتحي'])],
 'C03':[('مرقد الامام يحيى ابو القاسم',['مرقد الامام يحيى ابو القاسم','مرقد يحيى ابن القاسم','يحيى ابو القاسم','النواة الأصلية لمشهد الإمام يحيى بن القاسم على ضفة النهر'])],
 'C07':[('مرقد الامام عون الدين',['مرقد الامام عون الدين','مرقد الامام عون الدين ابن الحسن'])],
 'I03':[('قره سراي',['قره سراي','قراسراي','قلعة قره سراي'])],
 'A09':[('جامع عبدال',['جامع عبدال'])],
 'A10':[('جامع عمر الاسود',['جامع عمر الاسود'])],
 'A13':[('جامع الاغوات',['جامع الاغوات','جامع الجسر (الاغوات)'])],
 'A14':[('جامع الباشا',['جامع الباشا'])],
 'A15':[('مشهد الامام الباهر',['مشهد الامام الباهر','مرقد الامام الباهر'])],
 'A16':[('جامع الرابعية',['جامع الرابعية'])],
 'A17':[('جامع الزيواني',['جامع الزيواني'])],
 'A18':[('جامع النبي شيت',['جامع النبي شيت'])],
 'D01':[('خان الكمرك',['خان الكمرك'])],
 'E04':[('حمام عبيد اغا الجليلي',['حمام عبيد اغا الجليلي'])],
 'I48':[('جامع الرضواني',['جامع الرضواني'])],
 '-':[('القشلة',['القشلة','القشلة العسكرية','قشلة الخيالة'])],
 'A20':[('جامع القطانين',['جامع القطانين'])],
 'B10':[('كنيسة الساعة',['كنيسة الساعة'])],
}
def name(f):
 p=f.get('properties') or {}
 return str(p.get('Building N') or p.get('Name') or p.get('name') or '').strip()

def main():
 BEFORE.mkdir(parents=True,exist_ok=True)
 if not (BEFORE/'manifest.json').exists():
  (BEFORE/'manifest.json').write_bytes((DATA/'manifest.json').read_bytes())
 baseline=json.loads((BEFORE/'manifest.json').read_text())
 layers=[l for l in baseline['layers'] if 'heritage' in l['layer'].lower()]
 files={}
 for l in layers:
  dest=BEFORE/l['file']
  if not dest.exists():dest.write_bytes((DATA/l['file']).read_bytes())
  files[l['file']]=json.loads(dest.read_text())
 original=copy.deepcopy(files)
 rows=[]
 for row,cells in enumerate(openpyxl.load_workbook(BOOK,data_only=True).active.values,1):
  code,label,_,era=cells
  if not isinstance(era,str) or not re.search(r'من\s*\d+',era):continue
  start,end=map(int,re.findall(r'\d+',era)[:2])
  assert start in YEARS and end in YEARS
  rows.append({'row':row,'code':str(code),'sheet_name':label,'years':[y for y in YEARS if start<=y<=end]})
 report={'source_workbook':BOOK.name,'source_sha256':hashlib.sha256(BOOK.read_bytes()).hexdigest(),'policy':'Add missing occurrences and unify approved identity aliases. Keep original geometries, unrelated records, and existing occurrences outside the supplied intervals. Copied geometry is not a reconstruction of the historical footprint.','matches':[],'ignored':[],'additions':[],'renamed':[],'existing_outside_range':[]}
 lookup={}
 for row in rows:
  if row['code'] not in MATCHES:report['ignored'].append(row);continue
  for part,(canonical,aliases) in enumerate(MATCHES[row['code']]):
   identity=f"{row['code']}:{part+1}"
   for alias in aliases:
    assert alias not in lookup
    lookup[alias]=(identity,canonical,row)
   candidates=[]
   for l in layers:
    for index,f in enumerate(original.get(l['file'],{'features':[]})['features']):
     if name(f) in aliases:
      assert len(l['years'])==1
      candidates.append({'file':l['file'],'index':index,'year':l['years'][0],'feature':f})
   if not candidates:report['ignored'].append({**row,'canonical':canonical});continue
   present={c['year'] for c in candidates}
   report['matches'].append({**row,'identity':identity,'canonical':canonical,'aliases_found':sorted({name(c['feature']) for c in candidates}),'existing_years':sorted(present)})
   for c in candidates:
    f=files[c['file']]['features'][c['index']];old=name(f)
    if c['year'] not in row['years']:report['existing_outside_range'].append({'name':canonical,'year':c['year'],'file':c['file'],'record':c['index']+1})
    # Change name fields only when a spelling actually differs.
    if old!=canonical:
     f['properties']['heritage_original_name']=old
     for field in ['Building N','Name','name']:
      if f['properties'].get(field):f['properties'][field]=canonical
     report['renamed'].append({'file':c['file'],'record':c['index']+1,'before':old,'after':canonical})
   for year in row['years']:
    if year in present:continue
    usable=[c for c in candidates if c['feature'].get('geometry')]
    # Prefer an existing polygon; select the chronologically closest original occurrence.
    chosen=min(usable,key=lambda c:(c['feature']['geometry']['type'] not in ['Polygon','MultiPolygon'],abs(c['year']-year),c['year'],c['file'],c['index']))
    geometry=chosen['feature']['geometry'];point=geometry['type'] in ['Point','MultiPoint']
    targets=[l for l in layers if year in l['years'] and bool('point' in l['layer'].lower())==point]
    if targets:target=targets[0]
    else:
     stem=f"{year}_Heritage_Buildings"+('_Points' if point else '')
     target={'file':stem+'.geojson','layer':stem,'years':[year]}
     layers.append(target);baseline['layers'].append(target)
     files[target['file']]={'type':'FeatureCollection','name':stem,'features':[]}
    target_features=files[target['file']]['features']
    ids=[f.get('properties',{}).get('id') for f in target_features]
    next_id=max([x for x in ids if isinstance(x,(int,float))]+[0])+1
    properties={'id':next_id,'Building N':canonical,'heritage_identity':identity,'heritage_year':year,'heritage_added_from_workbook':BOOK.name,'heritage_workbook_row':row['row'],'heritage_geometry_source_file':chosen['file'],'heritage_geometry_source_record':chosen['index']+1,'heritage_geometry_source_year':chosen['year']}
    target_features.append({'type':'Feature','geometry':copy.deepcopy(geometry),'properties':properties})
    report['additions'].append({'name':canonical,'year':year,'target':target['file'],'record':len(target_features),'geometry_source_year':chosen['year'],'geometry_source_file':chosen['file'],'geometry_source_record':chosen['index']+1,'workbook_row':row['row']})
 # Reconcile the entire requested coverage and preservation before writing anything.
 for match in report['matches']:
  for year in match['years']:
   assert any(name(f)==match['canonical'] for l in layers if year in l['years'] for f in files[l['file']]['features']), (match['canonical'],year)
 for file,fc in original.items():
  for i,f in enumerate(fc['features']):
   assert files[file]['features'][i]['geometry']==f['geometry']
   if name(f) not in lookup:assert files[file]['features'][i]==f
 for file,fc in files.items():
  if file not in original or fc!=original[file]:(DATA/file).write_text(json.dumps(fc,ensure_ascii=False,separators=(',',':')))
 (DATA/'manifest.json').write_text(json.dumps(baseline,ensure_ascii=False,indent=2))
 (REV/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 lines=['# Heritage era updates from the user workbook','',f"Source: `{BOOK.name}`. Matched {len(report['matches'])} identities; added {len(report['additions'])} occurrences and standardized {len(report['renamed'])} existing names.",'','Existing geometry and unrelated records were preserved. Added records copy a mapped footprint or point, with source-era provenance. The two Mar Toma churches remain separate identities. No absent historical footprint has been independently reconstructed.','','| Common name | Required eras | Added eras |','| --- | --- | --- |']
 for m in report['matches']:
  added=[str(a['year']) for a in report['additions'] if a['name']==m['canonical']]
  lines.append(f"| {m['canonical']} | {', '.join(map(str,m['years']))} | {', '.join(added) or 'None'} |")
 lines+=['','## Spreadsheet entries without a matched heritage record','']+[f"- {r['sheet_name']} (row {r['row']})" for r in report['ignored']]
 lines+=['','## Existing occurrences outside the requested ranges','', 'These were retained because this request fills missing eras; no removal was requested.']
 for n,y in sorted({(r['name'],r['year']) for r in report['existing_outside_range']}):lines.append(f'- {n}: {y}')
 (REV/'REVIEW.md').write_text('\n'.join(lines)+'\n')
 print(json.dumps({k:len(report[k]) for k in ['matches','ignored','additions','renamed','existing_outside_range']}))
if __name__=='__main__':main()
