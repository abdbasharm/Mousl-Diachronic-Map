/* On-demand analysis overlays. Geometry and graph work runs off the UI thread. */
(() => {
    const $=id=>document.getElementById(id), t=(en,ar)=>currentLang==='ar'?ar:en;
    const cache=new Map(),pending=new Map(),originalPaint=new Map(),initialized=new WeakSet();
    let worker=null,sequence=0,generation=0,timer=null,selectedMetric={fractal:'compactness',syntax:'integration'};
    const ramp=['#315b96','#38b4bc','#f0d46c','#e77b46','#b92f50'];
    const derivedYears=new Set([1906,1919,1944,1966,1988,2003,2020]);
    let derivedManifestPromise;
    const bridgeYears=new Set([1944,1966,1988,2003,2020]);
    const definitions={
        compactness:['Compactness · 4πA/P²','التراص · 4πA/P²'],dimension:['Boundary box-counting D','البعد الصندوقي للحدود D'],
        connectivity:['Connectivity · direct neighbors','الاتصالية · الجوار المباشر'],depth:['Mean topological depth','متوسط العمق الطوبولوجي'],integration:['Integration · 1 / mean depth','التكامل · 1 / متوسط العمق']
    };
    function startWorker(){
        if(worker)return;
        worker=new Worker('analysis-worker.js?v=15.0');
        worker.onmessage=event=>{const job=pending.get(event.data.id);if(!job)return;pending.delete(event.data.id);clearTimeout(job.timeout);event.data.error?job.reject(Error(event.data.error)):job.resolve(event.data.result);};
        worker.onerror=()=>{worker.terminate();worker=null;for(const job of pending.values()){clearTimeout(job.timeout);job.reject(Error('Analysis worker failed'));}pending.clear();};
    }
    function resultFor(year){
        const tolerance=Number($('analysis-snap').value),useDerived=derivedYears.has(year)&&$('analysis-network').value==='derived';
        const key=`${year}:${tolerance}:${useDerived}`;
        if(cache.has(key))return cache.get(key);
        const promise=(async()=>{
            let layers=loadedLayersData.filter(item=>item.layerInfo.years.includes(year)),networkInfo=null;
            if(useDerived){
                if(!derivedManifestPromise)derivedManifestPromise=Promise.all(['data/derived/manifest.json','data/analysis-networks/manifest.json'].map(url=>fetch(url).then(response=>{if(!response.ok)throw Error('Network metadata unavailable');return response.json();}))).then(([derived,prepared])=>({...derived,...prepared})).catch(error=>{derivedManifestPromise=null;throw error;});
                const manifest=await derivedManifestPromise;networkInfo=manifest[year];
                if(!networkInfo)throw Error('Derived network missing for selected year');
                const response=await fetch(networkInfo.file);if(!response.ok)throw Error('Derived centerline file unavailable');
                const data=await response.json();
                layers=layers.filter(item=>!/(road|rounds|bridge)/i.test(item.layerInfo.layer));
                layers.push({layerInfo:{layer:`${year}_Roads_Derived_Centerlines`,years:[year]},data});
            }
            return new Promise((resolve,reject)=>{
                startWorker();const id=++sequence;
                const timeout=setTimeout(()=>{pending.delete(id);reject(Error('Analysis timed out'));},60000);
                pending.set(id,{resolve,reject,timeout});worker.postMessage({id,year,tolerance:networkInfo?.prepared_bridges?5:tolerance,layers,networkInfo});
            });
        })().catch(error=>{cache.delete(key);throw error;});
        cache.set(key,promise);return promise;
    }
    function maps(){return [map,isCompareModeActive?mapCompare:null].filter(m=>m&&m.getStyle());}
    function restore(){
        for(const [m,properties] of originalPaint)for(const [key,value] of properties){const [id,property]=JSON.parse(key);if(m.getLayer(id))m.setPaintProperty(id,property,value);}
        originalPaint.clear();
        for(const m of [map,mapCompare].filter(Boolean))for(const id of ['atlas-analysis-fill','atlas-analysis-line'])if(m.getLayer(id))m.setLayoutProperty(id,'visibility','none');
    }
    function dim(m,id,property,value){
        if(!m.getLayer(id))return;if(!originalPaint.has(m))originalPaint.set(m,new Map());
        const saved=originalPaint.get(m),key=JSON.stringify([id,property]);
        if(!saved.has(key))saved.set(key,m.getPaintProperty(id,property));m.setPaintProperty(id,property,value);
    }
    function setup(m){
        if(!m.getSource('atlas-analysis'))m.addSource('atlas-analysis',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
        if(!m.getLayer('atlas-analysis-fill'))m.addLayer({id:'atlas-analysis-fill',type:'fill',source:'atlas-analysis',filter:['==',['geometry-type'],'Polygon'],layout:{visibility:'none'},paint:{'fill-opacity':.88,'fill-outline-color':'#14313e'}});
        if(!m.getLayer('atlas-analysis-line'))m.addLayer({id:'atlas-analysis-line',type:'line',source:'atlas-analysis',filter:['==',['geometry-type'],'LineString'],layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-width':5,'line-opacity':1}});
        if(initialized.has(m))return;initialized.add(m);
        for(const id of ['atlas-analysis-fill','atlas-analysis-line'])m.on('click',id,event=>{
            const p=event.features?.[0]?.properties;if(!p)return;
            const metric=selectedMetric[currentAnalysisMode],value=p[metric];
            const bits=[p.label||p.record,`${t(...definitions[metric])}: ${typeof value==='number'?value.toFixed(3):t('Not defined','غير معرّف')}`];
            if(currentAnalysisMode==='syntax')bits.push(`${t('Reachable road parts','أجزاء الطرق المتاحة')}: ${p.reachable}`,`${t('Component size','حجم المكوّن')}: ${p.componentSize}`);
            else if(metric==='dimension')bits.push(`R²: ${typeof p.fit==='number'?p.fit.toFixed(3):'—'}`);
            $('analysis-selected').textContent=bits.join(' · ');$('analysis-selected').hidden=false;
        });
    }
    function controls(){
        const mode=currentAnalysisMode,normal=mode==='normal';
        $('mode-syntax-btn').querySelector('.m-title').textContent=t('Space Syntax','التركيب الفراغي');
        $('analysis-controls').hidden=normal;
        const activeYears=[years[Number(slider.value)],...(isCompareModeActive?[Number(selectedCompareYear)]:[])];
        $('analysis-network-control').hidden=mode!=='syntax'||!activeYears.some(year=>derivedYears.has(year));
        $('analysis-network-label').textContent=t('Street network source','مصدر شبكة الشوارع');
        $('analysis-network').options[0].textContent=t('Prepared streets + bridges','شبكة الشوارع والجسور المعدّة للتحليل');
        $('analysis-network').options[1].textContent=t('Original mapped lines','الخطوط الأصلية المرسومة');
        $('analysis-scope-control').hidden=$('analysis-network-control').hidden||$('analysis-network').value!=='derived';
        $('analysis-scope-label').textContent=t('Network extent','نطاق الشبكة');
        $('analysis-scope').options[0].textContent=t('Main connected network','الشبكة الرئيسية المتصلة');
        $('analysis-scope').options[1].textContent=t('All components','جميع المكوّنات');
        $('analysis-snap-control').hidden=mode!=='syntax'||(activeYears.every(year=>derivedYears.has(year))&&$('analysis-network').value==='derived');
        $('analysis-metric-label').textContent=t('Measure','المقياس');$('analysis-snap-label').textContent=t('Endpoint connection tolerance','سماحية اتصال نهايات الطرق');
        $('analysis-method-title').textContent=t('Method & limitations','المنهجية والحدود');$('analysis-retry').textContent=t('Retry calculation','إعادة الحساب');
        const keys=mode==='syntax'?['integration','connectivity','depth']:['compactness','dimension'];
        $('analysis-metric').replaceChildren(...keys.map(key=>{const option=document.createElement('option');option.value=key;option.textContent=t(...definitions[key]);return option;}));
        $('analysis-metric').value=selectedMetric[mode]||'compactness';
        $('analysis-method').hidden=normal;$('syntax-legend-container').hidden=normal;
        $('analysis-no-value').textContent=t('Gray = missing or undefined. Both comparison maps use the same color scale.','الرمادي = قيمة مفقودة أو غير معرّفة. تستخدم خريطتا المقارنة مقياس ألوان موحّداً.');
        $('analysis-gradient').style.background=`linear-gradient(to right,${ramp.join(',')})`;
        if(normal){$('syntax-insight-text').textContent=t('Standard map restored. Choose building morphology or Space Syntax to calculate a map from geometry.','تمت استعادة الخريطة القياسية. اختر مورفولوجيا المباني أو التركيب الفراغي لحساب خريطة من الأشكال الهندسية.');return;}
        const metric=selectedMetric[mode];$('syntax-legend-title').textContent=t(...definitions[metric]);
        if(mode==='syntax'){
            // Bridge approaches are audited in the prepared files; deck crossings are not junctions.
            $('syntax-insight-text').textContent=t('Street-part graph: higher integration means fewer steps to reachable street parts. Higher depth means more steps. Disconnected components are analyzed separately; values do not predict observed pedestrian traffic.','رسم بياني لأجزاء الشوارع: يشير التكامل الأعلى إلى خطوات أقل للوصول إلى الأجزاء المتاحة، والعمق الأعلى إلى خطوات أكثر. تُحلّل المكوّنات المنفصلة على حدة؛ ولا تتنبأ القيم بحركة المشاة المرصودة.');
            $('analysis-method-text').textContent=t('Each supplied LineString part is one node, not a verified axial line. Planar intersections and endpoints within the chosen tolerance create undirected edges. Duplicate coordinate sequences are removed. Breadth-first shortest paths give mean depth to reachable nodes; integration here is its reciprocal (1/MD), not HH, NAIN, angular choice or a calibrated walkability score. Isolated nodes have no depth/integration. Crossings are assumed at grade; street segmentation, map gaps and tolerance affect results.','يمثّل كل جزء LineString مرفق عقدة، وليس خطاً محورياً متحققاً منه. تُنشئ التقاطعات المستوية والنهايات ضمن السماحية المختارة روابط غير موجهة. تُحذف تسلسلات الإحداثيات المتطابقة. تحسب أقصر المسارات متوسط العمق إلى العقد المتاحة؛ والتكامل هنا مقلوبه (1/MD)، وليس HH أو NAIN أو الاختيار الزاوي أو مؤشراً معايراً للمشي. لا تُعرّف قيم العمق والتكامل للعقد المعزولة. يُفترض أن التقاطعات على مستوى واحد؛ وتؤثر تجزئة الشوارع والفجوات والسماحية في النتائج.');
            if(activeYears.some(year=>[1906,1919,1944].includes(year))&&$('analysis-network').value==='derived'){
                $('analysis-method-text').textContent += t(' For 1906, 1919 and 1944, paths are inferred from mapped road-area polygons after subtracting building footprints and rivers on a 1 m grid. Shared junction IDs define connections; proximity snapping is not used for these networks. Short terminal branches below 3 m are removed. Sub-grid passages may be omitted. These junction-to-junction paths use different segmentation from the original hand-drawn lines; formal cross-era comparisons require a consistent segmentation method.', ' بالنسبة لأعوام 1906 و1919 و1944، تُشتق المسارات من مضلعات الطرق بعد طرح بصمات المباني والأنهار على شبكة بدقة متر واحد. تُعرّف معرّفات العقد المشتركة الاتصالات دون استخدام الوصل التقاربي لهذه الشبكات. تُحذف الفروع الطرفية الأقصر من 3 أمتار، وقد تُغفل الممرات الأدق من الشبكة. تختلف تجزئة هذه المسارات بين العقد عن الخطوط الأصلية المرسومة؛ لذا تتطلب المقارنة الرسمية بين الحقب منهج تجزئة موحّداً.');
            }
            if(activeYears.some(year=>bridgeYears.has(year))){
                $('analysis-method-text').textContent += t(' Bridges are included as path parts. Bridge decks connect at their endpoints only, never at a crossing beneath the deck. Prepared approaches connect to the nearest mapped street within 50 m only when the added segment does not cross a building. Unconnected bridge records remain in All components. For 2020 the prepared network uses the supplied open street lines, replacing the closed outlines in the original Roads layer. Downloads use a 5 m street endpoint tolerance; bridge attachments are fixed by the audited approach records.', ' تُحتسب الجسور كأجزاء مسار، وتتصل عند نهاياتها فقط، وليس عند تقاطع طريق أسفل الجسر. تُوصل المداخل المعدّة بأقرب شارع مرسوم ضمن 50 متراً فقط إذا لم يقطع الجزء المضاف مبنى. تبقى سجلات الجسور غير المتصلة ضمن جميع المكوّنات. تستخدم شبكة 2020 الخطوط المفتوحة المرفقة بدلاً من الحدود المغلقة في طبقة الطرق الأصلية. تستخدم التنزيلات سماحية 5 أمتار لنهايات الشوارع؛ أما وصلات الجسور فتُحدد بسجلات المداخل المدققة.');
            }
        }else{
            $('syntax-insight-text').textContent=metric==='compactness'?t('Compactness is 4π × area / perimeter²: near 1 is compact; lower values indicate elongated, indented or fragmented footprints. It measures shape, not density.','التراص هو 4π × المساحة / مربع المحيط: القيم القريبة من 1 أكثر تراصاً؛ وتشير القيم الأقل إلى استطالة أو تعرج أو تجزؤ الشكل. يقيس الشكل وليس الكثافة.') :t('Boundary D is a finite-scale box-counting estimate from the mapped outline. It is not proof of a fractal city or a density measure. Click a footprint to inspect its fit (R²).','البعد D تقدير صندوقي محدود المقاييس للحدود المرسومة، وليس دليلاً على كسورية المدينة أو مقياساً للكثافة. انقر على بصمة مبنى لفحص جودة الملاءمة (R²).');
            $('analysis-method-text').textContent=t('Areas and perimeters use a local planar projection at latitude 36.34°. Holes reduce area and contribute perimeter; multipart records are measured together. Boundary box counting uses grids of 4, 8, 16, 32, 64 and 128 divisions of the longest bounding-box side. D is the log–log regression slope and depends on resolution, grid origin and digitization. Invalid or degenerate geometry is excluded. Original research attributes are not replaced.','تُحسب المساحات والمحيطات بإسقاط مستوٍ محلي عند خط عرض 36.34°. تُطرح الفراغات من المساحة وتُضاف حدودها إلى المحيط؛ وتُقاس الأجزاء المتعددة مجتمعة. يستخدم العد الصندوقي شبكات من 4 و8 و16 و32 و64 و128 قسماً لأطول ضلع في صندوق الإحاطة. البعد D هو ميل الانحدار اللوغاريتمي ويعتمد على الدقة وأصل الشبكة والرقمنة. تُستبعد الأشكال المنعدمة أو غير الصالحة. لا تُستبدل خصائص البحث الأصلية.');
        }
    }
    async function calculate(token){
        controls();restore();$('analysis-summary').replaceChildren();$('analysis-selected').hidden=true;$('analysis-retry').hidden=true;
        if(currentAnalysisMode==='normal'){$('analysis-status').textContent='';return;}
        if(!atlasDataReady){$('analysis-status').textContent=t('Waiting for map data…','بانتظار بيانات الخريطة…');return;}
        $('analysis-status').textContent=t('Calculating from mapped geometry…','جارٍ الحساب من الأشكال المرسومة…');$('analysis-range').textContent='';
        const mode=currentAnalysisMode,metric=selectedMetric[mode],mainYear=years[Number(slider.value)];
        const requested=[mainYear,...(isCompareModeActive&&mapCompare?[Number(selectedCompareYear)]:[])];
        try{
            const results=await Promise.all(requested.map(resultFor));if(token!==generation)return;
            const collections=results.map(r=>{
                const fc=mode==='syntax'?r.roads:r.buildings;
                return mode==='syntax'&&r.networkInfo&&$('analysis-scope').value==='main'?{...fc,features:fc.features.filter(f=>f.properties.derived_component===1)}:fc;
            });
            const values=collections.flatMap(fc=>fc.features.map(f=>f.properties[metric])).filter(v=>typeof v==='number'&&Number.isFinite(v));
            const low=metric==='compactness'?0:values.length?Math.min(...values):0;
            const high=metric==='compactness'?1:values.length?Math.max(...values):1;
            const top=Math.max(high,low+1e-6),span=top-low;
            const expression=['case',['==',['typeof',['get',metric]],'number'],['interpolate',['linear'],['get',metric],...ramp.flatMap((color,i)=>[low+span*i/4,color])],'#87969e'];
            maps().forEach((m,index)=>{
                setup(m);m.getSource('atlas-analysis').setData(collections[index]);
                const target=mode==='syntax'?'atlas-analysis-line':'atlas-analysis-fill',property=mode==='syntax'?'line-color':'fill-color';
                m.setPaintProperty(target,property,expression);m.setLayoutProperty(target,'visibility','visible');m.moveLayer(target);
                for(const layer of m.getStyle().layers){
                    if(layer.type==='fill-extrusion'&&layer.id.startsWith('layer-'))dim(m,layer.id,'fill-extrusion-opacity',0);
                    if(layer.id.startsWith('raster-layer-'))dim(m,layer.id,'raster-opacity',.15);
                    if(mode==='syntax'&&layer.type==='line'&&layer.id.startsWith('layer-'))dim(m,layer.id,'line-opacity',.12);
                }
            });
            $('analysis-status').textContent=values.length?t('Analysis ready · select a colored feature for its value.','التحليل جاهز · اختر معلماً ملوّناً لعرض قيمته.'):t('No usable geometry for this measure in the selected year(s). Try 1778 or 1852.','لا توجد أشكال صالحة لهذا المقياس في السنوات المختارة. جرّب 1778 أو 1852.');
            $('analysis-range').textContent=values.length?`${low.toFixed(2)} — ${high.toFixed(2)}`:'—';
            results.forEach((result,i)=>{
                const card=document.createElement('p');card.className='analysis-result';
                const measured=collections[i].features.filter(f=>typeof f.properties[metric]==='number').length;
                card.textContent=mode==='syntax'?`${result.year} · ${result.roads.features.length} ${t('street parts','جزء شارع')} · ${result.components} ${t('components','مكوّن')} · ${result.isolated} ${t('isolated','معزول')} · ${result.duplicates} ${t('duplicates excluded','تكرار مستبعد')}`:`${result.year} · ${measured} / ${result.buildings.features.length} ${t('footprints measured','بصمة مبنى مقاسة')}`;
                $('analysis-summary').append(card);
                if(mode==='syntax'&&result.networkInfo){
                    const source=document.createElement('p');source.className='atlas-note';source.textContent=result.networkInfo.prepared_bridges?t('Prepared street and bridge network','شبكة الشوارع والجسور المعدّة للتحليل'):t('Polygon-derived centerlines · shared junctions','خطوط وسطية مشتقة من المضلعات · عقد مشتركة');
                    if($('analysis-scope').value==='main')source.textContent+=` · ${collections[i].features.length} ${t('paths shown in the main connected network','مسار معروض في الشبكة الرئيسية المتصلة')}`;
                    const mainOnly=$('analysis-scope').value==='main';
                    const download=document.createElement('a');download.className='atlas-link';download.href=mainOnly?result.networkInfo.main_file:result.networkInfo.file;download.download=`${result.year}_${mainOnly?'main_network':'derived_centerlines'}.geojson`;download.textContent=t(`Download ${result.year} lines + values for QGIS`,`تنزيل خطوط ${result.year} وقيمها لبرنامج QGIS`);
                    if(result.networkInfo.prepared_bridges){
                        const shownBridges=collections[i].features.filter(f=>f.properties.kind==='bridge').length;
                        source.textContent+=` · ${shownBridges} / ${result.networkInfo.bridges} ${t('bridge parts shown','جزء جسر معروض')}`;
                    }
                    $('analysis-summary').append(source,download);
                }
            });
        }catch(error){if(token!==generation)return;restore();$('analysis-status').textContent=t('Calculation failed. Retry or select another year.','تعذّر الحساب. أعد المحاولة أو اختر سنة أخرى.');$('analysis-retry').hidden=false;console.error(error);}
    }
    function refresh(){const token=++generation;clearTimeout(timer);timer=setTimeout(()=>calculate(token),60);}
    $('analysis-metric').onchange=()=>{selectedMetric[currentAnalysisMode]=$('analysis-metric').value;refresh();};
    $('analysis-snap').onchange=refresh;
    $('analysis-network').onchange=refresh;
    $('analysis-scope').onchange=refresh;
    $('analysis-retry').onclick=()=>{cache.clear();refresh();};
    window.mosulAnalysis={refresh};
    ['mosul:year','mosul:ready','mosul:compare'].forEach(name=>window.addEventListener(name,refresh));
    $('raster-opacity').addEventListener('input',()=>{for(const [m,properties] of originalPaint)for(const key of properties.keys())if(JSON.parse(key)[1]==='raster-opacity')properties.set(key,currentRasterOpacity);if(isSpaceSyntaxActive)refresh();});
    refresh();
})();
