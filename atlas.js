/* Curated visitor tools. Source statements describe the supplied dataset, not independent verification. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const text = (en, ar) => currentLang === 'ar' ? ar : en;
    const labels = {
        explore: ['Explore', 'استكشاف'], research: ['Research', 'بحث'], journey: ['A journey through Mosul', 'رحلة عبر الموصل'],
        visit: ['Visit this chapter', 'اعرض هذه المحطة'], evidence: ['Reading this map', 'كيف تقرأ هذه الخريطة'],
        sourceDetails: ['Open source record', 'افتح سجل المصدر'], featureRecord: ['LANDMARK & STREET RECORD', 'سجل المعالم والشوارع'],
        recordedYears: ['Recorded in these layers', 'مذكور في طبقات هذه السنوات'],
        matchingNote: ['Years match the recorded name; absence does not prove loss. Photos are shown only when attached to this record.', 'تُطابق السنوات الاسم المسجّل؛ الغياب لا يثبت زوال المعلم. تُعرض الصور المرتبطة بهذا السجل فقط.'],
        legend: ['Map key & scale', 'مفتاح الخريطة والمقياس'],
        heightNote: ['In analysis mode, use the color scale in the Research panel for buildings. 3D heights include illustrative defaults and derived values; they are not a measured reconstruction. Scale applies at the displayed latitude.', 'في وضع التحليل، استخدم مقياس الألوان في لوحة البحث للمباني. تتضمن الارتفاعات قيماً توضيحية ومشتقة وليست إعادة بناء مقاسة. ينطبق المقياس على خط العرض المعروض.'],
        share: ['Share view', 'مشاركة العرض'], copyFallback: ['Copy this link to reopen the same years and map position. A localhost link works only on the computer running this server.', 'انسخ الرابط لإعادة فتح السنوات وموضع الخريطة نفسه. يعمل رابط localhost على الجهاز الذي يشغّل الخادم فقط.'], close: ['Close', 'إغلاق']
    };
    const chapters = [
        { year:637, title:['The early city','المدينة المبكرة'], prompt:['Start with the river and the mapped boundary. Which landmarks lie inside it? The earliest source records contain date conflicts; treat this view as an interpretation requiring review.','ابدأ بالنهر والحدود المرسومة. ما المعالم الواقعة داخلها؟ تتضمن سجلات المصادر المبكرة تعارضاً في التواريخ؛ تعامل مع هذا العرض كتفسير يحتاج إلى مراجعة.'], center:[43.128,36.345], zoom:14.3 },
        { year:1778, title:['Read the fortified edge','اقرأ حافة المدينة المحصّنة'], prompt:['Follow the wall and gate layers around the city. Adjust the historical image opacity to distinguish the source map from the digitized outlines.','تتبّع طبقات الأسوار والبوابات حول المدينة. عدّل شفافية الصورة التاريخية لتمييز خريطة المصدر عن الحدود المرقمنة.'], center:[43.128,36.34], zoom:14.2 },
        { year:1852, title:['Look into the street network','اقترب من شبكة الشوارع'], prompt:['Explore the mapped alleys and heritage sites. Select a named street or landmark for its record, then compare this view with 1778.','استكشف الأزقة المرسومة والمواقع التراثية. اختر شارعاً مسمّى أو معلماً لعرض سجله، ثم قارن هذا العرض بعام 1778.'], center:[43.126,36.341], zoom:15 },
        { year:1944, title:['Compare the routes','قارن المسارات'], prompt:['Compare with 1906 and trace the roads and bridges. A feature appearing in only one layer can reflect a change in coverage or documentation as well as a physical change.','قارن بعام 1906 وتتبّع الطرق والجسور. قد يعكس ظهور معلم في طبقة واحدة اختلافاً في التغطية أو التوثيق، وليس بالضرورة تغيّراً مادياً.'], center:[43.126,36.338], zoom:14.4 },
        { year:2020, title:['Return to the recent city','العودة إلى المدينة الحديثة'], prompt:['Compare the 2020 layers with 2003. Read the source record before interpreting gaps as damage, removal or rebuilding; the map alone does not establish the cause.','قارن طبقات 2020 بعام 2003. اقرأ سجل المصدر قبل تفسير الفجوات كدمار أو إزالة أو إعادة بناء؛ فالخريطة وحدها لا تثبت السبب.'], center:[43.128,36.339], zoom:14.4 }
    ];
    const initial = new URLSearchParams(location.hash.slice(1));
    let chapter = 0, research = false, selected = null, restoring = true, shareTimer;
    const motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
    const nameOf = f => {
        const p = f.properties || {};
        return String(p['Building N'] || p['Building_N'] || p['Building N '] || p.Name || p.name || p.NAME || p.Label || '').trim();
    };
    const identity = f => normalizeArabic(getTranslatedFeatureName(nameOf(f))).toLowerCase().replace(/\s+/g, ' ').trim();
    function evidence(year) {
        if (Number(year) <= 1127) return {
            kind: text('Needs review', 'يحتاج مراجعة'),
            note: text('The selected year and the supplied source’s period labels conflict. These early layers are interpretive; their chronology and provenance need review.', 'تتعارض السنة المختارة مع توصيف الفترة في سجل المصدر المرفق. هذه الطبقات المبكرة تفسيرية وتحتاج مراجعة التسلسل الزمني والإسناد.')
        };
        return { kind: Number(year) < 1966 ? text('Listed survey', 'مسح بحسب السجل') : text('Listed imagery / GIS', 'صور / GIS بحسب السجل'),
            note: text('Digitized layers interpreted from the source listed in this project. Positional accuracy and feature-level confidence are not supplied. A year labels a dataset, not necessarily the date of every feature or photograph.', 'طبقات مرقمنة ومفسّرة من المصدر المذكور في المشروع. لم تُرفق الدقة الموضعية أو درجة الثقة لكل معلم. تشير السنة إلى مجموعة بيانات، لا إلى تاريخ كل معلم أو صورة بالضرورة.') };
    }
    function renderJourney() {
        $('journey-stops').replaceChildren();
        chapters.forEach((c,i) => {
            const b = document.createElement('button'); b.textContent = c.year;
            b.setAttribute('aria-pressed', String(i === chapter)); b.setAttribute('aria-label', `${c.year}: ${text(...c.title)}`);
            b.onclick = () => { chapter = i; visit(); }; $('journey-stops').append(b);
        });
        $('journey-progress').textContent = `${chapter + 1} / ${chapters.length}`;
        $('journey-title').textContent = text(...chapters[chapter].title);

    }
    function visit() {
        window.dispatchEvent(new CustomEvent('mosul:stop-playback'));
        updateYear(years.indexOf(chapters[chapter].year));
        map.flyTo({ center:chapters[chapter].center, zoom:chapters[chapter].zoom, pitch:0, bearing:0, duration:motion });
        renderJourney();
    }
    $('journey-go').onclick = visit;
    function setMode(value) {
        research = value; document.body.classList.toggle('research-view', value);
        document.body.classList.toggle('explore-view', !value);
        $('mode-explore').setAttribute('aria-pressed', String(!value)); $('mode-research').setAttribute('aria-pressed', String(value));
        if (!value) { $('btn-tab-layers').click(); if ($('measure-widget').style.display !== 'none') $('measure-close-btn').click(); }
        saveView();
    }
    $('mode-explore').onclick = () => setMode(false); $('mode-research').onclick = () => setMode(true);

    function comparison() {
        const box = $('comparison-insight'); box.replaceChildren();
        if (!isCompareModeActive || !selectedCompareYear) return;
        const a = years[Number(slider.value)], b = Number(selectedCompareYear);
        const title = document.createElement('h3'); title.textContent = `${a} ↔ ${b}`; title.dir = 'ltr'; box.append(title);
        const values = [stats[a]?.buildings, stats[b]?.buildings];
        const caption = document.createElement('p'); caption.textContent = text('Mapped building footprint area', 'مساحة بصمات المباني المرسومة'); box.append(caption);
        const max = Math.max(...values.filter(Number.isFinite), .001);
        [a,b].forEach((year,i) => {
            const row = document.createElement('div'); row.className = 'comparison-bar-row';
            const label = document.createElement('span'); label.textContent = `${year}`;
            const track = document.createElement('div'); track.className = 'comparison-bar';
            const bar = document.createElement('span'); bar.style.width = `${Number.isFinite(values[i]) ? values[i] / max * 100 : 0}%`; track.append(bar);
            const value = document.createElement('span'); value.textContent = Number.isFinite(values[i]) && values[i] > 0 ? `${values[i].toFixed(2)} ${text('km²','كم²')}` : text('Not mapped','غير مرسوم');
            row.append(label,track,value); box.append(row);
        });
        if (values.every(value => Number.isFinite(value) && value > 0)) {
            const difference = document.createElement('p');
            const delta = values[1] - values[0];
            difference.textContent = `${text('Mapped area difference (comparison − main)', 'فرق المساحة المرسومة (المقارنة − الرئيسية)')}: ${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(2)} ${text('km²','كم²')}`;
            box.append(difference);
        }
        const records = document.createElement('p'); records.className = 'atlas-note';
        const count = (year, category) => loadedLayersData.filter(item => item.layerInfo.years.includes(year) && getLayerCategory(item.layerInfo.layer) === category).reduce((total,item) => total + item.data.features.length, 0);
        records.textContent = `${text('Road records', 'سجلات الطرق')}: ${a}: ${count(a,'Roads')} / ${b}: ${count(b,'Roads')} · ${text('Wall & gate records', 'سجلات الأسوار والبوابات')}: ${a}: ${count(a,'City Walls & Gates')} / ${b}: ${count(b,'City Walls & Gates')}`;
        box.append(records);
        const note = document.createElement('p'); note.className = 'atlas-note';
        note.textContent = text('Dataset totals, not a measured growth rate. Coverage, source scale, overlapping records and digitization can differ. Compare streets and walls visually; appearance or absence does not establish construction or loss.', 'إجماليات مجموعات البيانات وليست معدل نمو مقاساً. قد تختلف التغطية ومقياس المصدر والسجلات المتداخلة والرقمنة. قارن الشوارع والأسوار بصرياً؛ الظهور أو الغياب لا يثبت البناء أو الزوال.'); box.append(note);
        if (a <=1127 || b <=1127) { const warning = document.createElement('p'); warning.className = 'evidence-warning'; warning.textContent = evidence(637).note; box.append(warning); }
    }
    function renderFeature() {
        if (!selected) return;
        const f = selected.feature, p = f.properties || {}, raw = nameOf(f);
        $('landmark-title').textContent = raw ? getTranslatedFeatureName(raw) : text('Unnamed mapped feature', 'معلم مرسوم بلا اسم');
        $('landmark-category').textContent = `${selected.year} · ${getTranslatedCategory(getLayerCategory(selected.layerInfo.layer))}`;
        const description = p.Description || p.description || p.Descriptio || p.desc;
        const thesisDescription = /النوري|Al.Nuri|Al.Nouri/i.test(raw) ? text('The research describes the Great Al-Nuri Mosque as a focal point in the shift of Mosul’s social center toward the Al-Nuri area during the Zangid period.', 'يصف البحث الجامع النوري الكبير بوصفه محوراً لانتقال المركز الاجتماعي للموصل نحو منطقة الجامع النوري خلال العصر الزنكي.') : /المجاهدي|Al.Mujahidi/i.test(raw) ? text('The research places Al-Mujahidi Mosque within the riverside complex established by Mujahid al-Din Qaymaz, alongside a school, a ribat and a hospital, linked to the opposite bank by a bridge.', 'يضع البحث جامع المجاهدي ضمن المجمع النهري الذي أنشأه مجاهد الدين قيماز، إلى جانب مدرسة ورباط وبيمارستان، مع اتصال بالضفة المقابلة بواسطة جسر.') : '';
        $('landmark-description').textContent = description ? getTranslatedPhotoDesc(String(description), '') : thesisDescription;
        $('landmark-description').hidden = !description && !thesisDescription;
        $('landmark-description-source').hidden = !!description || !thesisDescription;
        $('landmark-description-source').textContent = text('Source: supplied Mosul morphology research manuscript, historical framework.', 'المصدر: مسودة بحث مورفولوجية الموصل القديمة المرفقة، الإطار التاريخي.');
        const image = $('landmark-image'), photo = p.Photos || p.Photo || p.photo || p.PHOTO;
        image.hidden = !photo; image.alt = $('landmark-title').textContent;
        if (photo) { image.onerror = () => { image.hidden = true; }; image.src = getPhotoUrl(String(photo)); } else image.removeAttribute('src');
        const matchingYears = new Set();
        if (raw) loadedLayersData.forEach(item => {
            if (item.data.features.some(other => nameOf(other) && identity(other) === identity(f))) item.layerInfo.years.forEach(year => matchingYears.add(Number(year)));
        });
        $('landmark-years').replaceChildren();
        [...matchingYears].sort((a,b)=>a-b).forEach(year => {
            if (!years.includes(year)) return;
            const button = document.createElement('button'); button.textContent = year; button.onclick = () => updateYear(years.indexOf(year)); $('landmark-years').append(button);
        });
        if (!matchingYears.size) $('landmark-years').textContent = text('No named matches available.', 'لا تتوفر مطابقات مسمّاة.');
        $('landmark-source').textContent = `${text('Dataset source', 'مصدر مجموعة البيانات')}: ${mapSources[selected.year]?.title || text('Not supplied','غير مرفق')}`;
    }
    window.addEventListener('mosul:feature', event => {
        if (selected && selected.feature === event.detail.feature) return;
        selected = event.detail; $('landmark-card').hidden = false; renderFeature(); $('landmark-close').focus({preventScroll:true});
    });
    $('landmark-close').onclick = () => { $('landmark-card').hidden = true; selected = null; map.getCanvas().focus(); };
    $('landmark-source-button').onclick = () => { if (selected) showMapSource(selected.year); };
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('landmark-card').hidden) $('landmark-close').click(); });
    const legend = [
        ['#d97706','Building blocks','كتل المباني'], ['#fbbf24','Roads / survived status','طرق / حالة بقاء'],
        ['#38bdf8','Water','مياه'], ['#f43f5e','Walls','أسوار'], ['#ef4444','Gates, bridges / loss status','بوابات وجسور / حالة فقدان'],
        ['#c084fc','Heritage','تراث'], ['#fb923c','Photographs','صور'], ['#84cc16','Open space','مساحات مفتوحة']
    ];
    function render() {
        document.querySelectorAll('[data-atlas]').forEach(el => { if (labels[el.dataset.atlas]) el.textContent = text(...labels[el.dataset.atlas]); });
        $('zoom-in').setAttribute('aria-label', text('Zoom in','تكبير'));
        $('zoom-out').setAttribute('aria-label', text('Zoom out','تصغير'));
        renderJourney(); comparison();
        const e = evidence(years[Number(slider.value)]);

        $('legend-items').replaceChildren();
        legend.forEach(([color,en,ar]) => {
            const row = document.createElement('div'), swatch = document.createElement('span'); swatch.style.background = color; swatch.className = 'legend-swatch'; row.append(swatch,document.createTextNode(text(en,ar))); $('legend-items').append(row);
        });
        if (selected) renderFeature();
    }
    function saveView() {
        if (restoring) return;
        const center = map.getCenter();
        const hash = new URLSearchParams({ year:years[Number(slider.value)], lang:currentLang, lng:center.lng.toFixed(5), lat:center.lat.toFixed(5), zoom:map.getZoom().toFixed(2), pitch:map.getPitch().toFixed(0), bearing:map.getBearing().toFixed(0), mode:research?'research':'explore' });
        if (isCompareModeActive && selectedCompareYear) hash.set('compare', selectedCompareYear);
        history.replaceState(null,'',`${location.pathname}${location.search}#${hash}`);
    }
    $('share-view').onclick = async () => {
        saveView();
        try { await navigator.clipboard.writeText(location.href); $('share-feedback').textContent = text('View link copied. Localhost links work on this computer only.', 'تم نسخ رابط العرض. تعمل روابط localhost على هذا الجهاز فقط.'); }
        catch (_) { $('share-url').value = location.href; $('share-dialog').showModal(); $('share-url').select(); }
        clearTimeout(shareTimer); shareTimer = setTimeout(() => $('share-feedback').textContent = '', 6000);
    };
    $('share-close').onclick = () => { $('share-dialog').close(); $('share-view').focus(); };
    map.addControl(new maplibregl.ScaleControl({maxWidth:100,unit:'metric'}), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({showZoom:false,showCompass:true,visualizePitch:true}), 'top-right');
    map.on('moveend', saveView);
    function bounded(key,min,max,fallback) { const n = initial.has(key) ? Number(initial.get(key)) : NaN; return Number.isFinite(n) && n>=min && n<=max ? n : fallback; }
    if (['ar','en'].includes(initial.get('lang'))) setLanguage(initial.get('lang'));
    const initialYear = Number(initial.get('year')); if (years.includes(initialYear)) updateYear(years.indexOf(initialYear));
    map.jumpTo({center:[bounded('lng',42,44,43.128),bounded('lat',35,37,36.335)],zoom:bounded('zoom',10,20,14.5),pitch:bounded('pitch',0,60,50),bearing:bounded('bearing',-180,180,-10)});
    setMode(initial.get('mode') === 'research');
    window.addEventListener('mosul:ready', () => {
        const other = Number(initial.get('compare'));
        if (years.includes(other) && other !== years[Number(slider.value)]) {
            if (!isCompareModeActive) compareBtn.click(); selectedCompareYear = other; populateCompareUI(years[Number(slider.value)]); updateCompareLayout();
        }
        restoring = false; render(); saveView();
    });
    window.addEventListener('mosul:year', () => { render(); saveView(); });
    window.addEventListener('mosul:compare', () => { comparison(); saveView(); });
    $('lang-toggle-btn').addEventListener('click', () => {render();saveView();});
    $('welcome-language').addEventListener('click', () => {render();saveView();});
    // Keep the attribution truthful for the dataset loaded, without changing source records.
    $('research-meta-btn').addEventListener('click', () => {
        const count = document.querySelector('[data-i18n="citeLayersVal"]');
        if (count && manifest) count.textContent = text(`${manifest.layers.length} vector layers across 14 datasets`, `${manifest.layers.length} طبقة متجهة عبر 14 مجموعة زمنية`);
    });
    new ResizeObserver(entries => { document.documentElement.style.setProperty('--atlas-timeline-height', `${entries[0].target.getBoundingClientRect().height}px`); }).observe($('timeline-container'));
    render();
})();
