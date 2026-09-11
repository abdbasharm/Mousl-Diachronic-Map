/* Visitor guidance and navigation. Historical content lives in main.js. */
(() => {
    const copy = {
        en: {
            eyebrow: 'THE MOSUL HISTORICAL ATLAS', title: 'One city. Fourteen moments in time.',
            intro: 'Explore the changing streets, walls and riverfront of the Old City of Mosul, from 637 to 2020.',
            step1: 'Travel through time', detail1: 'Follow the five chapters in the journey, or choose any year on the timeline. Use Previous and Next, or play the sequence.',
            step2: 'Read the layers', detail2: 'Explore keeps the map tools simple. Switch to Research for morphology and measurement. Open the map key to understand colors and illustrative 3D heights.',
            step3: 'Look closer. Compare.', detail3: 'Compare two synchronized maps, select a landmark for its record, and read the source notes before interpreting differences. Share view saves the years and map position in a link.',
            gestures: 'Drag to move · Scroll or pinch to zoom · Select a photo marker to open it. Reopen this guide with “How to explore”.',
            start: 'Explore Mosul', remember: 'Skip this introduction next time', help: 'How to explore',
            timeline: 'EXPLORE THROUGH TIME', previous: '← Previous', next: 'Next →', play: '▶ Play eras', pause: 'Ⅱ Pause',
            spacing: '14 snapshots · Unequal time intervals', flat: '2D / 3D', reset: 'Reset view', retry: 'Reload',
            loading: 'Preparing historical maps…', ready: 'Historical maps ready', failed: 'Maps could not load. Check your connection and reload.',
            progress: 'of 14', layers: 'Explore layers', hide: 'Hide layers'
        },
        ar: {
            eyebrow: 'أطلس الموصل التاريخي', title: 'مدينة واحدة. أربع عشرة محطة عبر الزمن.',
            intro: 'استكشف تحوّلات شوارع الموصل القديمة وأسوارها وضفاف نهرها من عام 637 إلى عام 2020.',
            step1: 'انتقل عبر الزمن', detail1: 'اتبع المحطات الخمس في الرحلة، أو اختر أي سنة من الخط الزمني. استخدم السابق والتالي أو شغّل التسلسل.',
            step2: 'اكتشف طبقات المدينة', detail2: 'يبسّط وضع الاستكشاف أدوات الخريطة. انتقل إلى البحث للتحليل المورفولوجي والقياس. افتح مفتاح الخريطة لفهم الألوان والارتفاعات التوضيحية.',
            step3: 'اقترب وقارن', detail3: 'قارن خريطتين متزامنتين واختر معلماً لقراءة سجله. اقرأ ملاحظات المصدر قبل تفسير الفروق. تحفظ مشاركة العرض السنوات وموضع الخريطة في رابط.',
            gestures: 'اسحب للتحريك · مرّر أو باعد إصبعيك للتكبير · اختر علامة صورة لفتحها. يمكنك إعادة فتح هذا الدليل من «كيف تستكشف».',
            start: 'استكشف الموصل', remember: 'تخطَّ المقدمة في المرة القادمة', help: 'كيف تستكشف',
            timeline: 'استكشف عبر الزمن', previous: 'السابق →', next: '← التالي', play: '▶ تشغيل الحقب', pause: 'Ⅱ إيقاف مؤقت',
            spacing: '14 محطة · فواصل زمنية غير متساوية', flat: '2D / 3D', reset: 'إعادة العرض', retry: 'إعادة التحميل',
            loading: 'جارٍ تجهيز الخرائط التاريخية…', ready: 'الخرائط التاريخية جاهزة', failed: 'تعذّر تحميل الخرائط. تحقق من الاتصال وأعد التحميل.',
            progress: 'من 14', layers: 'استكشف الطبقات', hide: 'إخفاء الطبقات'
        }
    };
    const $ = id => document.getElementById(id);
    const dialog = $('welcome-dialog');
    let playing = null;
    let state = 'loading';
    let previousFocus;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function render() {
        const t = copy[currentLang];
        document.querySelectorAll('[data-guide]').forEach(el => el.textContent = t[el.dataset.guide]);
        $('welcome-language').textContent = currentLang === 'ar' ? 'English' : 'العربية';
        $('era-play').textContent = playing ? t.pause : t.play;
        $('era-play').setAttribute('aria-pressed', String(Boolean(playing)));
        $('map-status-text').textContent = t[state];
        if (location.protocol === 'file:') {
            $('map-status-text').textContent = currentLang === 'ar' ? 'افتح التجربة عبر الخادم المحلي لتحميل الخرائط.' : 'Open the experience through the local server to load the maps.';
            $('retry-map').textContent = currentLang === 'ar' ? 'فتح التجربة' : 'Open experience';
            $('retry-map').hidden = false;
        }
        $('era-position').textContent = `${Number(slider.value) + 1} ${t.progress}`;
        $('era-back').disabled = Number(slider.value) === 0;
        $('era-forward').disabled = Number(slider.value) === years.length - 1;
        slider.setAttribute('aria-valuetext', `${years[Number(slider.value)]} ${currentLang === 'ar' ? 'م' : 'CE'}`);
        $('sidebar-toggle-btn').setAttribute('aria-label', $('sidebar').classList.contains('collapsed') ? t.layers : t.hide);
        $('sidebar-toggle-btn').setAttribute('aria-expanded', String(!$('sidebar').classList.contains('collapsed')));
    }
    function stop() { clearInterval(playing); playing = null; render(); }
    function step(delta) { updateYear(Math.min(years.length - 1, Math.max(0, Number(slider.value) + delta))); }
    $('era-back').onclick = () => { stop(); step(-1); };
    $('era-forward').onclick = () => { stop(); step(1); };
    $('era-play').onclick = () => {
        if (playing) return stop();
        if (Number(slider.value) === years.length - 1) updateYear(0);
        playing = setInterval(() => { step(1); if (Number(slider.value) === years.length - 1) stop(); }, 3500);
        render();
    };
    window.addEventListener('mosul:stop-playback', stop);
    $('era-groups-container').addEventListener('click', stop);
    slider.addEventListener('input', stop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.addEventListener('mosul:year', render);
    $('lang-toggle-btn').addEventListener('click', render);
    $('welcome-language').onclick = () => { setLanguage(currentLang === 'ar' ? 'en' : 'ar'); render(); };
    function openGuide() { stop(); previousFocus = document.activeElement; dialog.showModal(); $('welcome-start').focus(); }
    $('help-button').onclick = openGuide;
    $('welcome-start').onclick = () => {
        try { localStorage.setItem('mosul_guide_seen', $('remember-guide').checked ? 'yes' : 'no'); } catch (_) {}
        dialog.close();
    };
    dialog.addEventListener('close', () => (previousFocus && previousFocus !== document.body ? previousFocus : $('help-button')).focus());
    $('zoom-in').onclick = () => map.zoomIn({ duration: reducedMotion ? 0 : 250 });
    $('zoom-out').onclick = () => map.zoomOut({ duration: reducedMotion ? 0 : 250 });
    $('view-flat').onclick = () => {
        const flat = map.getPitch() > 5;
        map.easeTo({ pitch: flat ? 0 : 50, bearing: flat ? 0 : -10, duration: reducedMotion ? 0 : 650 });
        $('view-flat').setAttribute('aria-pressed', String(flat));
    };
    $('view-reset').onclick = () => {
        map.flyTo({ center: [43.128, 36.335], zoom: 14.5, pitch: 50, bearing: -10, duration: reducedMotion ? 0 : 1000 });
        $('view-flat').setAttribute('aria-pressed', 'false');
    };
    $('retry-map').onclick = () => location.protocol === 'file:' ? location.assign('http://127.0.0.1:8765/' + location.hash) : location.reload();
    const timeout = setTimeout(() => { if (state === 'loading') failed(); }, 45000);
    function failed() { state = 'failed'; $('map-status').classList.add('failed'); $('retry-map').hidden = false; render(); }
    window.addEventListener('mosul:failed', failed);
    window.addEventListener('mosul:ready', () => {
        clearTimeout(timeout); $('compare-btn').disabled = false; $('measure-open-btn').disabled = false; state = 'ready'; $('map-status').classList.remove('failed'); $('map-status').classList.add('ready');
        $('retry-map').hidden = true; render();
        setTimeout(() => { if (state === 'ready') $('map-status').hidden = true; }, 3500);
    });
    $('sidebar-toggle-btn').addEventListener('click', () => {
        document.body.classList.toggle('panel-hidden', $('sidebar').classList.contains('collapsed'));
        $('sidebar').inert = $('sidebar').classList.contains('collapsed'); render();
    });
    if (matchMedia('(max-width: 900px)').matches) $('sidebar-toggle-btn').click();
    // Give existing icon-only window controls native keyboard behavior.
    document.querySelectorAll('.mac-buttons .close-btn').forEach(el => {
        el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', 'Close / إغلاق');
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
    });
    document.querySelectorAll('.mac-tab').forEach(tab => {
        tab.setAttribute('aria-controls', tab.dataset.tab);
        $(tab.dataset.tab).setAttribute('aria-labelledby', tab.id);
    });
    render();
    let seen = false;
    try { seen = localStorage.getItem('mosul_guide_seen') === 'yes'; } catch (_) {}
    if (!seen) openGuide();
})();
