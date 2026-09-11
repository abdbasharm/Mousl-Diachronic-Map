/* ═══════════════════════════════════════════════════════════
   Mosul Diachronic Map — main.js  v10.0 (Bilingual AR / EN)
   Features: Multilingual · Layers · Space Syntax · Analytics · 3D Tour · Measure
   ═══════════════════════════════════════════════════════════ */

// ── Language State (Default: Arabic) ─────────────────────────
let currentLang = 'ar';
try { currentLang = localStorage.getItem('mosul_gis_lang') === 'en' ? 'en' : 'ar'; } catch (_) {}
const layerPreferences = new Map();

// ── Timeline years ──────────────────────────────────────────
const years = [637, 912, 1096, 1127, 1778, 1838, 1852, 1906, 1919, 1944, 1966, 1988, 2003, 2020];

function formatYearLabel(y) {
    return `${y}`;
}

// ── Era Groups Definition (Bilingual) ─────────────────────────
const eraGroups = [
    {
        id: "atabeg",
        name: "Islamic & Atabeg",
        name_ar: "العصر الإسلامي والأتابكي",
        name_en: "Islamic & Atabeg",
        fullName_ar: "التأسيس الإسلامي والتوسع في العصر الأتابكي",
        fullName_en: "Islamic establishment and Atabeg expansion",
        years: [637, 912, 1096, 1127]
    },
    {
        id: "early-ottoman",
        name: "Early Ottoman",
        name_ar: "العهد العثماني المبكر",
        name_en: "Early Ottoman",
        fullName_ar: "العهد العثماني المبكر والعهد الجليلي",
        fullName_en: "Early Ottoman & Jalili period",
        years: [1778]
    },
    {
        id: "middle-ottoman",
        name: "Middle Ottoman",
        name_ar: "العهد العثماني الأوسط",
        name_en: "Middle Ottoman",
        fullName_ar: "العهد العثماني الأوسط والمسوحات المساحية",
        fullName_en: "Middle Ottoman period & Trigonometrical Surveys",
        years: [1838, 1852]
    },
    {
        id: "late-ottoman",
        name: "Late Ottoman",
        name_ar: "العهد العثماني المتأخر",
        name_en: "Late Ottoman",
        fullName_ar: "العهد العثماني المتأخر والنسيج العضوي المكتمل",
        fullName_en: "Late Ottoman period & Peak Organic Fabric",
        years: [1906]
    },
    {
        id: "royal",
        name: "Royal Period",
        name_ar: "العهد الملكي",
        name_en: "Royal Period",
        fullName_ar: "العهد الملكي العراقي والتحديث الشرياني",
        fullName_en: "Royal period & Modern Arterial Interventions",
        years: [1919, 1944]
    },
    {
        id: "modern",
        name: "Modern Expansion",
        name_ar: "التوسع المعاصر",
        name_en: "Modern Expansion",
        fullName_ar: "التوسع العمراني المعاصر ومسوحات الأقمار الصناعية",
        fullName_en: "Modern expansion & Satellite Surveys",
        years: [1966, 1988, 2003, 2020]
    }
];

function getEraGroupForYear(year) {
    const numYear = Number(year);
    return eraGroups.find(g => g.years.some(y => Number(y) === numYear)) || eraGroups[0];
}

// ── Era Descriptions (Bilingual Arabic & English) ─────────────
const eraDescriptions = {
    637: {
        title_ar: "سنة 637 م — التأسيس الإسلامي والنواة العسكرية",
        title_en: "Year 637 CE — Islamic Founding & Military Citadel Nucleus",
        era_ar: "العصر الإسلامي والأتابكي",
        era_en: "Islamic & Atabeg",
        text_ar: "تأسيس الموصل كمعسكر عسكري (تمصير) على الضفة الغربية لنهر دجلة بقيادة عتبة بن فرقد السلمي، وتميزت بنواتين: الحصن (قلعة باشطابيا لاحقاً) والمسجد الجامع ودار الإمارة، مع انفصالها عن نينوى الآشورية وتشكيل نقطة ربط تجارية وعسكرية إقليمية.",
        text_en: "Establishment of Mosul as an Islamic garrison town (amsar) on the western bank of the Tigris River by Utba ibn Farqad al-Sulami. Defined by two primary nuclei: the northern citadel fortress (later Bash Tapia) and the Friday Mosque with the governor's palace (Dar al-Imara), establishing a major strategic and trade crossroads separate from ancient Nineveh."
    },
    912: {
        title_ar: "سنة 912 م — العصر العباسي والحمداني وتوسيع التحصينات",
        title_en: "Year 912 CE — Abbasid & Hamdanid Era Urban Expansion",
        era_ar: "العصر الإسلامي والأتابكي",
        era_en: "Islamic & Atabeg",
        text_ar: "شهدت المدينة توسعاً عمرانياً ملحوظاً تحت حكم الحمدانيين، وازدهار النشاط التجاري وتطور شبكة الأزقة العضوية المتقاطعة، مع تعزيز الأسوار الحجرية الأولى للمدينة لحمايتها من الغزوات.",
        text_en: "The city underwent significant urban expansion under Hamdanid rule, witnessing vibrant commercial growth, densification of organic street alleyways, and the reinforcement of the initial defensive stone perimeter walls."
    },
    1096: {
        title_ar: "سنة 1096 م — العصر السلجوقي والتحصينات الدفاعية",
        title_en: "Year 1096 CE — Seljuk Period & Defensive Consolidation",
        era_ar: "العصر الإسلامي والأتابكي",
        era_en: "Islamic & Atabeg",
        text_ar: "توطيد التحصينات الدفاعية وتشييد المنشآت العمرانية الكبرى كالمساجد والمدارس الدينية وتطوير مسارات الأسواق المسقوفة (القيساريات).",
        text_en: "Consolidation of urban fortifications, construction of monumental public institutions including madrasas and mosques, and crystallization of the vaulted covered bazaar networks (Qaysariyyas)."
    },
    1127: {
        title_ar: "سنة 1127 م — العصر الأتابكي وعصر الزنكيين الذهبي",
        title_en: "Year 1127 CE — Atabeg Zangid Golden Age",
        era_ar: "العصر الإسلامي والأتابكي",
        era_en: "Islamic & Atabeg",
        text_ar: "العصر الذهبي للموصل تحت حكم عماد الدين ونور الدين زنكي وبدر الدين لؤلؤ. بناء الجامع النوري الكبير بمنارته الحدباء الشهيرة، وتوسيع السور المزدوج العظيم، وشق نهر الحر بن يوسف داخل المدينة، وازدهار العمارة الإسلامية الفريدة بالرخام الأزرق (الفرش).",
        text_en: "The Golden Age of Mosul under Imad al-Din, Nur al-Din Zangi, and Badr al-Din Lu'lu'. Construction of the Great Al-Nuri Mosque with its iconic leaning Al-Hadba minaret, expansion of the monumental double city wall, canalization of the Al-Hur River, and flourishing of Mosul's distinct architectural identity in blue Al-Farsh marble."
    },
    1778: {
        title_ar: "سنة 1778 م — العهد العثماني ومخطط كارستن نيبور",
        title_en: "Year 1778 CE — Ottoman Period & Carsten Niebuhr's Survey",
        era_ar: "العهد العثماني المبكر",
        era_en: "Early Ottoman",
        text_ar: "وثق المستكشف كارستن نيبور خريطة دقيقة للموصل بعد صمودها الأسطوري أمام حصار نادر شاه (1743م) بقيادة حسين باشا الجليلي، مبيناً السور المنيع ذو الـ 12 بوابة والأبراج الدفاعية والنسيج السكني المتضام.",
        text_en: "Documented by explorer Carsten Niebuhr following Mosul's legendary defense against Nader Shah's siege (1743) under Hussein Pasha Al-Jalili. Illustrates the fortified perimeter with 12 historic gates, defensive bastions, and the densely compact residential fabric."
    },
    1838: {
        title_ar: "سنة 1838 م — خريطة هيلموت فون مولتكه الطبوغرافية",
        title_en: "Year 1838 CE — Helmuth von Moltke's Topographical Survey",
        era_ar: "العهد العثماني الأوسط",
        era_en: "Middle Ottoman",
        text_ar: "مسح طبوغرافي وعسكري دقيق أجراه القائد البروسي فون مولتكه، يبرز طبوغرافيا المدينة الدفاعية ووديانها وتلالها وعلاقتها بنهر دجلة وتوزيع القلاع والمحلات السكنية.",
        text_en: "A detailed military-topographical survey drafted by Prussian Field Marshal Helmuth von Moltke, delineating natural drainage valleys, defensive contours, Tigris riverfront relationships, and urban quarter distributions."
    },
    1852: {
        title_ar: "سنة 1852 م — مسح فيلكس جونز الكارتوغرافي الدقيق",
        title_en: "Year 1852 CE — Commander Felix Jones' Trigonometrical Survey",
        era_ar: "العهد العثماني الأوسط",
        era_en: "Middle Ottoman",
        text_ar: "أدق خريطة تاريخية كارتوغرافية للموصل في القرن التاسع عشر للمسّاح البريطاني فيلكس جونز، وثقت بالتفصيل أسماء المحلات والمباني التاريخية والكنائس والمساجد ومسارات السور والأبراج والأزقة.",
        text_en: "The definitive 19th-century trigonometrical survey by British Commander Felix Jones, documenting residential mahallas, historic mosques, churches, bathhouses, fortified bastions, gates, and intricate alley networks with unprecedented precision."
    },
    1906: {
        title_ar: "سنة 1906 م — خريطة الموصل في أواخر العهد العثماني",
        title_en: "Year 1906 CE — Late Ottoman Cartographic Survey",
        era_ar: "العهد العثماني المتأخر",
        era_en: "Late Ottoman",
        text_ar: "خريطة عثمانية نادرة تؤرخ قمة اكتمال النسيج الحضري العضوي التقليدي وكثافته السكانية، وظهور بواكير المباني الإدارية الحديثة (السراي والبلدية والمستشفى والمدارس الرشدية).",
        text_en: "A rare late-Ottoman cadastral survey documenting the peak organic density of the historic urban fabric prior to 20th-century automotive cuts, alongside early Tanzimat public institutions (Saray, Municipality, Military Barracks, and Rüşdiye schools)."
    },
    1919: {
        title_ar: "سنة 1919 م — مخطط إرنست هيرتسفيلد وبداية التحديث",
        title_en: "Year 1919 CE — Ernst Herzfeld Survey & Early Modernization",
        era_ar: "العهد الملكي",
        era_en: "Royal Period",
        text_ar: "رصد هيرتسفيلد النسيج التراثي بالتزامن مع تنفيذ المرحلة الأولى لشق شارع نينوى من جهة الجسر حتى كنيسة الساعة، كأول شريان مستقيم يكسر خصوصية الأزقة العضوية القديمة.",
        text_en: "Architectural survey by Ernst Herzfeld capturing the historic fabric during the initial opening of Nineveh Street from the bridgehead to the Clock Church—the first straight axial intervention piercing the historic organic maze."
    },
    1944: {
        title_ar: "سنة 1944 م — الشرايين الملكية الحديثة وشطر البلوكات التراثية",
        title_en: "Year 1944 CE — Royal Period Modern Arterials & Block Bisection",
        era_ar: "العهد الملكي",
        era_en: "Royal Period",
        text_ar: "تبرز الخريطة اكتمال فتح المحاور الشريانية الكبرى (شارع نينوى والفاروق) وافتتاح الجسر الحديدي (1934م)، مما شطر البلوكات التراثية وحول المسارات الداخلية للمشاة لقنوات عبور سيارات.",
        text_en: "Illustrates the completed vehicular arterial axes (Nineveh and Al-Farouq Streets) and the opening of the King Ghazi Iron Bridge (1934), permanently bisecting traditional pedestrian quarters to accommodate automotive traffic."
    },
    1966: {
        title_ar: "سنة 1966 م — التمدد العمراني والجسور الخرسانية الحديثة",
        title_en: "Year 1966 CE — Aerial Reconnaissance & Modern Concrete Bridges",
        era_ar: "التوسع المعاصر",
        era_en: "Modern Expansion",
        text_ar: "رصدت الصور الجوية التمدد العمراني الواسع خارج الأسوار نحو الضفة اليسرى، وتشييد جسور خرسانية جديدة، مما أدى لاندثار معالم السور وبواباته وتحول النسيج القديم إلى عقدة عبور مرورية.",
        text_en: "Declassified aerial reconnaissance documenting rapid suburban sprawl onto the Left Bank across the Tigris, concrete bridge construction, progressive disappearance of historic wall remnants, and changing traffic dynamics."
    },
    1988: {
        title_ar: "سنة 1980 / 1988 م — التوسع الحضري وشبكات الطرق السريعة",
        title_en: "Year 1980 / 1988 CE — Urban Sprawl & Master Plan Highways",
        era_ar: "التوسع المعاصر",
        era_en: "Modern Expansion",
        text_ar: "رصدت الصور الفضائية التوسع الحضري الشامل واكتمال خمسة جسور رئيسية عبر دجلة، وتطوير الشوارع المحيطية، وبدايات التغير في الكثافة السكنية لمركز المدينة القديمة.",
        text_en: "Satellite imagery documenting comprehensive urban expansion, completion of five major Tigris river bridges, modern peripheral highway loops, and demographic shifts away from the old core."
    },
    2003: {
        title_ar: "سنة 2003 م — تآكل وفقدان النسيج السكني التراثي",
        title_en: "Year 2003 CE — Historic Urban Fabric Erosion",
        era_ar: "التوسع المعاصر",
        era_en: "Modern Expansion",
        text_ar: "أظهرت الصور الفضائية فقدان وتآكل قرابة 20% إلى 40% من النسيج السكني التراثي نتيجة الإهمال والهدم العشوائي والضغط المروري المتولد من الجسور المتعددة.",
        text_en: "High-resolution satellite imagery showing progressive erosion of 20% to 40% of historic domestic architecture due to infrastructural pressures, modernization, and lack of conservation regulations."
    },
    2020: {
        title_ar: "سنة 2020 م — تقييم الدمار وتحديات الحفاظ على أصالة المدينة",
        title_en: "Year 2020 CE — Post-Conflict Damage Assessment & Recovery",
        era_ar: "التوسع المعاصر",
        era_en: "Modern Expansion",
        text_ar: "توثيق شامل للدمار غير المسبوق في أحداث 2017 الذي طال 47% من المباني التاريخية والجامع النوري والواجهة النهرية، مبرزةً تحديات الحفاظ على أصالة النسيج المتضام أمام مخططات التوسعة الحديثة.",
        text_en: "Comprehensive spatial documentation of the unprecedented destruction during the 2017 battle affecting 47% of historic structures including the Great Al-Nuri Mosque and Tigris riverfront, highlighting post-conflict recovery challenges."
    }
};

// ── Map Sources Metadata (Bilingual) ─────────────────────────
const mapSourcesI18N = {
    637: {
        title_ar: "إعادة بناء تاريخي لمدينة الموصل في العصر الأتابكي وبدر الدين لؤلؤ",
        title_en: "Historical Reconstruction of Mosul under Badr al-Din Lu'lu'",
        author_ar: "د. كاريل نوفاتشيك وفريق البحث الأثري",
        author_en: "K. Nováček et al., Palgrave Studies in Cultural Heritage",
        repo_ar: "دراسات بالغراف للتراث الثقافي والصراع (2022)",
        repo_en: "Palgrave Studies in Cultural Heritage and Conflict (2022)",
        date_ar: "637 م (التأسيس) / توثيق 2022 م",
        date_en: "637 CE (Founding) / 2022 Publication",
        notes_ar: "رسم خرائطي وتحليلي لمعالم الموصل في صدر الإسلام والحكم الأتابكي، يوثق القلعة (إيغ كلاع)، والسور المزدوج، والأبواب التاريخية، ومواقع المباني التراثية الدينية الأولى.",
        notes_en: "Historical mapping of medieval Mosul under Atabeg rule, detailing the citadel (Qala'at al-Mawsil), city walls, historic gates, and early Islamic heritage monuments."
    },
    912: {
        title_ar: "حدود مدينة الموصل وأسوارها الدفاعية في العصر الحمداني",
        title_en: "Mosul City Borders & Fortification Walls in 912 AD",
        author_ar: "د. كاريل نوفاتشيك وفريق الأرشيف الأثري",
        author_en: "K. Nováček et al., Palgrave Studies",
        repo_ar: "دراسات بالغراف للتراث الثقافي والصراع",
        repo_en: "Palgrave Studies in Cultural Heritage and Conflict",
        date_ar: "912 م",
        date_en: "912 CE",
        notes_ar: "توثيق مساحي لحدود النسيج الحضري للموصل في العصر الحمداني، يوضح تحصينات الأسوار وبوابات العبور الرئيسية والمجمعات الدينية الكبرى.",
        notes_en: "Mapping of medieval Mosul city boundaries, defensive walls, gates, and major religious heritage complexes."
    },
    1096: {
        title_ar: "مخطط قلعة الموصل والأسوار الدفاعية في العصر السلجوقي",
        title_en: "Plan of Mosul Fortress & City Walls",
        author_ar: "د. كاريل نوفاتشيك وآخرون",
        author_en: "K. Nováček et al.",
        repo_ar: "دراسات بالغراف للتراث الثقافي",
        repo_en: "Palgrave Studies in Cultural Heritage",
        date_ar: "1096 م",
        date_en: "1096 CE",
        notes_ar: "مسح يوثق المحلات الحضرية الداخلية للمدينة القديمة، ومسارات الأبراج الدفاعية المحيطة، وتوزع المعالم الأثرية التاريخية.",
        notes_en: "Mid-Ottoman and Seljuk era survey showing inner city quarters, defensive parapets, gate positions, and religious heritage landmarks."
    },
    1127: {
        title_ar: "مسح أسوار الموصل والمحلات الحضرية في عصر النهضة الزنكية",
        title_en: "Survey of Mosul City Walls & Urban Quarters",
        author_ar: "د. كاريل نوفاتشيك وباحثو الآثار الإسلامية",
        author_en: "K. Nováček et al., Islamic Archaeology",
        repo_ar: "دراسات بالغراف للتراث الثقافي",
        repo_en: "Palgrave Studies in Cultural Heritage",
        date_ar: "1127 م",
        date_en: "1127 CE",
        notes_ar: "توثيق شامل للعصر الزنكي الذهبي يشمل الجامع النوري الكبير ومنارته الحدباء، مجرى نهر الحر بن يوسف، والمباني التراثية الرخامية الفريدة.",
        notes_en: "Comprehensive survey of the Zangid Golden Age including the Great Al-Nuri Mosque, Al-Hadba minaret, Al-Hur River canal, and distinct marble heritage monuments."
    },
    1778: {
        title_ar: "مخطط الموصل (كارستن نيبور — رحلة إلى الجزيرة العربية)",
        title_en: "Plan von Mosul (Voyage en Arabie et en d'autres pays)",
        author_ar: "كارستن نيبور (المستكشف والرياضي الدنماركي)",
        author_en: "Carsten Niebuhr (Royal Danish Expedition)",
        repo_ar: "المكتبة الملكية في كوبنهاغن / المكتبة الوطنية الفرنسية",
        repo_en: "Royal Library of Copenhagen / National Library of France",
        date_ar: "كوبنهاغن، 1778 م",
        date_en: "Copenhagen, 1778 CE",
        notes_ar: "أول خريطة مساحية أوروبية دقيقة للموصل بعد صمودها في حصار نادر شاه (1743م)، توثق السور كاملاً مع 12 بوابة تاريخية والواجهة النهرية لدجلة.",
        notes_en: "First scientific European survey map of Mosul. Features precise geometric measurements of the city wall circuit, 12 historic city gates, and riverfront topology."
    },
    1838: {
        title_ar: "مخطط الموصل والمناطق المحيطة بها (البعثة العسكرية البروسية)",
        title_en: "Plan von Mossul und Umgebung",
        author_ar: "هيلموت فون مولتكه (المارشال البروسي)",
        author_en: "Helmuth von Moltke (Prussian Military Mission)",
        repo_ar: "المكتب الطبوغرافي البروسي / مكتبة برلين الحكومية",
        repo_en: "Prussian Topographical Bureau / Berlin State Library",
        date_ar: "برلين، 1838 م",
        date_en: "Berlin, 1838 CE",
        notes_ar: "خريطة طبوغرافية عسكرية تبرز بدقة تضاريس المدينة، الوديان، التلال، شبكة الطرق، وحقول البساتين المحيطة.",
        notes_en: "Topographical military map detailing urban density, road networks, surrounding agricultural fields, and strategic height elevations."
    },
    1852: {
        title_ar: "آثار آشور (اللوحة 3: مخطط نينوى والموصل)",
        title_en: "Vestiges of Assyria (Sheet 3: Plan of Nineveh & Mosul)",
        author_ar: "القائد فيلكس جونز (البحرية الملكية البريطانية / شركة الهند الشرقية)",
        author_en: "Commander Felix Jones (Royal Navy / East India Company)",
        repo_ar: "المكتبة البريطانية، لندن (سجل IOR/X/3273)",
        repo_en: "British Library, London (IOR/X/3273)",
        date_ar: "لندن، 1852 م",
        date_en: "London, 1852 CE",
        notes_ar: "أدق خريطة تاريخية كارتوغرافية للموصل في القرن التاسع عشر. توثق بالتفصيل أسماء المحلات السكنية، الأزقة الضيقة، الجوامع، الكنائس، والأسواق.",
        notes_en: "Benchmark high-precision survey of Old Mosul. Details individual building blocks, narrow alleyways (Aha'iq), souk corridors, mosques, and churches."
    },
    1906: {
        title_ar: "خريطة مدينة الموصل 1323 هـ (دليل الموصل السياحي والتاريخي)",
        title_en: "Map of Mosul City 1323 AH (Dalil Musul al-Siyahi)",
        author_ar: "المجلس البلدي العثماني في الموصل ومهندسو الولاية",
        author_en: "Mosul Municipal Council & Ottoman Engineers",
        repo_ar: "أرشيف المكتبة المركزية العامة في الموصل",
        repo_en: "Mosul Central Library Archives",
        date_ar: "الموصل، 1323 هـ / 1906 م",
        date_en: "Mosul, 1323 AH / 1906 AD",
        notes_ar: "خريطة عثمانية إدارية نادرة توثق الساحات العامة، دار السراي، المستشفى الملكي، المدارس، والمقابر التراثية قبيل التحولات الحديثة.",
        notes_en: "Late Ottoman administrative map illustrating public squares, government buildings (Sarai), market areas, cemeteries, and historic city walls."
    },
    1919: {
        title_ar: "بلدة الموصل وضواحيها (مسح الجيش البريطاني وسلاح الجو)",
        title_en: "Mosul Town & Environs (Mesopotamian Expeditionary Force)",
        author_ar: "دائرة المساحة الهندية والتصوير الجوي لسلاح الجو الملكي البريطاني",
        author_en: "Survey of India & Royal Air Force (RAF) Photogrammetry",
        repo_ar: "الأرشيف الوطني البريطاني، كيو (سجل WO 303 / AIR 5)",
        repo_en: "National Archives, Kew (WO 303 / AIR 5)",
        date_ar: "لندن وبغداد، 1919 م",
        date_en: "London & Baghdad, 1919 CE",
        notes_ar: "خريطة تجمع بين المسح الأرضي والصور الجوية المبكرة إبان الحرب العالمية الأولى، ترصد بداية شق شارع نينوى وموقع الجسر العائم.",
        notes_en: "Combined ground and aerial reconnaissance map produced immediately after World War I, detailing initial modern road cuts and pontoon bridge locations."
    },
    1944: {
        title_ar: "المخطط المساحي والتفصيلي لمدينة الموصل (العهد الملكي)",
        title_en: "Mosul City Cadastral & Urban Plan",
        author_ar: "مديرية المساحة العامة، المملكة العراقية",
        author_en: "Directorate General of Survey, Kingdom of Iraq",
        repo_ar: "دار الكتب والوثائق الوطنية، بغداد",
        repo_en: "Iraqi National Archives, Baghdad",
        date_ar: "بغداد، 1944 م",
        date_en: "Baghdad, 1944 CE",
        notes_ar: "مخطط مساحي رسمي يوثق التحولات الشريانية الكبرى بما فيها شارع الفاروق وشارع نينوى وافتتاح الجسر الحديدي (جسر الملك غازي 1934م).",
        notes_en: "Official cadastral plan documenting major modern infrastructure interventions, including the construction of Niniveh Street and modern railway connections."
    },
    1966: {
        title_ar: "صورة القمر الصناعي الاستطلاعي كورونا (DZB004032)",
        title_en: "CORONA Reconnaissance Satellite Map (DZB004032)",
        author_ar: "مكتب الاستطلاع الوطني الأمريكي (NRO) / هيئة المساحة الجيولوجية USGS",
        author_en: "US National Reconnaissance Office (NRO) / USGS",
        repo_ar: "مستكشف الأرض USGS EarthExplorer (سجل DS1036-2170DF024)",
        repo_en: "USGS EarthExplorer (Entity ID: DS1036-2170DF024)",
        date_ar: "واشنطن، 19 أيلول 1966 م",
        date_en: "Washington D.C., 19 September 1966",
        notes_ar: "صور فضائية عالية الدقة (2 متر) ترصد النسيج الحضري للموصل القديمة قبل مشاريع التوسعة الحديثة والجسور الخرسانية المعاصرة.",
        notes_en: "High-resolution 2-meter satellite imagery capturing Old Mosul prior to major modern urban redevelopments and residential expansions."
    },
    1988: {
        title_ar: "صورة القمر الصناعي الاستطلاعي KH-9 والتوسع المعاصر",
        title_en: "KH-9 Hexagon Reconnaissance Satellite Survey (DZB01216)",
        author_ar: "هيئة المساحة الجيولوجية الأمريكية USGS ووكالة الاستخبارات المركزية",
        author_en: "USGS EarthExplorer & National Reconnaissance Office",
        repo_ar: "الأرشيف الجيولوجي الأمريكي USGS",
        repo_en: "USGS Earth Resources Observation and Science (EROS)",
        date_ar: "1980 / 1988 م",
        date_en: "1980 / 1988 CE",
        notes_ar: "توثيق التوسع الحضري الواسع وشبكات الطرق السريعة المحيطة بالمدينة القديمة والجسور الخمسة على نهر دجلة.",
        notes_en: "High-resolution satellite observation documenting the massive peripheral suburban expansion, modern highway grid, and river bridges."
    },
    2003: {
        title_ar: "التصوير الفضائي التجاري عالي الدقة (QuickBird / DigitalGlobe)",
        title_en: "QuickBird High-Resolution Satellite Survey",
        author_ar: "مؤسسة ديجيتال غلوب (DigitalGlobe / Maxar)",
        author_en: "DigitalGlobe / Maxar Technologies & USGS",
        repo_ar: "أرشيف الصور الفضائية التجارية العالمية",
        repo_en: "Maxar Geospatial Open Data Archives",
        date_ar: "الموصل، 2003 م",
        date_en: "Mosul, 2003 CE",
        notes_ar: "صور فضائية بدقة 0.6 متر توثق حالة النسيج المعماري السكني التراثي وتآكل الكتل المبنية قبيل الأحداث المعاصرة.",
        notes_en: "Sub-meter commercial satellite imagery detailing dense domestic building footprints, courtyard typologies, and urban decay in the historic quarters."
    },
    2020: {
        title_ar: "المخطط الجغرافي والتقييم المكاني للدمار والتعافي (UN-Habitat / UNESCO)",
        title_en: "Post-Conflict Reconstruction & Spatial Assessment Master Map",
        author_ar: "برنامج الأمم المتحدة للمستوطنات البشرية UN-Habitat واليونسكو",
        author_en: "UN-Habitat, UNESCO Initiative 'Revive the Spirit of Mosul'",
        repo_ar: "منصة بيانات الأمم المتحدة واليونسكو لإعادة إعمار الموصل",
        repo_en: "UN-Habitat Urban Damage Assessment & UNESCO Digital Repository",
        date_ar: "الموصل، 2020 / 2021 م",
        date_en: "Mosul, 2020 / 2021 CE",
        notes_ar: "مسح كارتوغرافي متكامل يوثق الأضرار المادية لـ 47% من المباني التاريخية والجامع النوري ومسارات إعادة الإعمار وإحياء روح الموصل.",
        notes_en: "Official post-conflict damage mapping and reconstruction baseline identifying damage severity, restored heritage assets, and urban conservation zones."
    }
};

// ── UI Strings Localization Dictionary ────────────────────────
const I18N_UI = {
    ar: {
        langBtnText: "English",
        thesisBadge: "منصة نظم المعلومات الجغرافية لرسالة الماجستير",
        appTitle: "مورفولوجيا مدينة الموصل",
        appSubtitle: "التحليل المكاني والمورفولوجي عبر العصور (637–2020 م)",
        tabLayers: "الطبقات والخريطة",
        tabMorpho: "التحليل المورفولوجي",
        btnCompare: "⇄ مقارنة الحقب",
        btnCitation: "🎓 توثيق واقتباس",
        compareEraLabel: "مقارنة حقب الخريطة",
        comparePrev: "◄ السابقة",
        compareNext: "التالية ►",
        compareSelectYear: "أو اختر سنة محددة:",
        statBuildingsLabel: "مساحة المباني",
        statGrowthLabel: "نسبة النمو",
        rasterMapLabel: "🗺️ الخريطة التاريخية الأصلية",
        opacityLabel: "الشفافية",
        vectorLayersLabel: "الطبقات المتجهة النشطة",
        terrainSettingsLabel: "إعدادات التضاريس ثلاثية الأبعاد",
        terrainModelLabel: "3D نموذج التضاريس (DEM)",
        terrainExaggLabel: "مبالغة ارتفاع التضاريس",
        morphoTitle: "نمط التحليل المورفولوجي",
        modeFractal: "مورفولوجيا المباني",
        modeStandard: "العرض القياسي",
        fractalLegendTitle: "التعقيد الكسوري (D_f)",
        fractalLow: "منخفض<br><small>بسيط</small>",
        fractalMed: "متوسط",
        fractalHigh: "مرتفع",
        fractalPeak: "ذروة<br><small>مركز كثيف</small>",
        morphoAnalysisLabel: "التحليل المورفولوجي",
        morphoInsight: "تحلل مقاييس البعد الكسوري (D_f) التشابه الذاتي والتعقيد الكثافي للأنسجة الحضرية التاريخية لمدينة الموصل.",
        measureTitle: "📐 القياس المكاني",
        measureDist: "📏 المسافة",
        measureArea: "◼ المساحة",
        measureResultLabel: "النتيجة",
        measureInstruction: "اختر أداة، ثم انقر على الخريطة. انقر نقراً مزدوجاً للإنهاء.",
        measureClear: "مسح",
        btnEraDesc: "📖 وصف الحقبة",
        btnMapSource: "ℹ️ مصدر الخريطة",
        eraModalTitle: "📖 وصف الحقبة التاريخية",
        btnModalPrev: "◄ الحقبة السابقة",
        btnModalSync: "عرض على الخريطة 📍",
        btnModalNext: "الحقبة التالية ►",
        mapSourceModalTitle: "📜 مصدر وتوثيق الخريطة",
        sourceAuthorLabel: "المساح / المؤلف:",
        sourceRepoLabel: "المستودع الأرشيفي:",
        sourceDateLabel: "تاريخ النشر / الإصدار:",
        sourceNotesLabel: "الملاحظات والوصف التاريخي:",
        citationModalTitle: "🎓 المنهجية البحثية والتوثيق الأكاديمي",
        citationProjectBadge: "مشروع بحث رسالة الماجستير",
        citationHeading: "التحليل المكاني والمورفولوجي لمدينة الموصل القديمة عبر العصور",
        citationDesc: "تقدم هذه المنصة الرقمية التفاعلية نمذجة وتوثيقاً وتحليلاً مورفولوجياً للنسيج الحضري لمدينة الموصل القديمة عبر 14 حقبة تاريخية من عام 637 م إلى 2020 م.",
        citeMethodLabel: "المنهجية الأساسية:",
        citeMethodVal: "Space Syntax (Rₙ), البعد الكسوري (D_f), الرقمنة الجغرافية GIS",
        citeCRSLabel: "نظام الإسناد الجغرافي:",
        citeLayersLabel: "الطبقات المتجهة:",
        citeLayersVal: "96 طبقة متجهة عبر 14 حقبة زمنية",
        citeDEMLabel: "نموذج الارتفاع الرقمي:",
        citeDEMVal: "نموذج تضاريس عالي الدقة للموصل القديمة (DEM)",
        citeBibtexLabel: "اقتباس بصيغة BibTeX:"
    },
    en: {
        langBtnText: "العربية",
        thesisBadge: "Master's Thesis GIS Research Platform",
        appTitle: "Mosul Urban Morphology",
        appSubtitle: "Spatial & Morphological Evolution Across Eras (637–2020 CE)",
        tabLayers: "Layers & Map",
        tabMorpho: "Morphological Analysis",
        btnCompare: "⇄ Compare Eras",
        btnCitation: "🎓 Citation & Method",
        compareEraLabel: "Compare Historical Eras",
        comparePrev: "◄ Previous",
        compareNext: "Next ►",
        compareSelectYear: "Or select a specific year:",
        statBuildingsLabel: "Built-up Footprint",
        statGrowthLabel: "Expansion Ratio",
        rasterMapLabel: "🗺️ Archival Base Map",
        opacityLabel: "Opacity",
        vectorLayersLabel: "Active Vector Layers",
        terrainSettingsLabel: "3D Terrain Settings",
        terrainModelLabel: "3D Terrain Elevation (DEM)",
        terrainExaggLabel: "Terrain Exaggeration",
        morphoTitle: "Morphological Analysis Mode",
        modeFractal: "Building morphology",
        modeStandard: "Standard View",
        fractalLegendTitle: "Fractal Complexity (D_f)",
        fractalLow: "Low<br><small>Simple</small>",
        fractalMed: "Medium",
        fractalHigh: "High",
        fractalPeak: "Peak<br><small>Dense Core</small>",
        morphoAnalysisLabel: "Morphological Analysis",
        morphoInsight: "Fractal dimension (D_f) metrics quantify the self-similarity, spatial filling, and configurational density of Mosul's historical urban fabric.",
        measureTitle: "📐 Spatial Measurement",
        measureDist: "📏 Distance",
        measureArea: "◼ Area",
        measureResultLabel: "Result",
        measureInstruction: "Choose a tool, then click on map to measure. Double-click to finish.",
        measureClear: "Clear",
        btnEraDesc: "📖 Era Narrative",
        btnMapSource: "ℹ️ Map Source",
        eraModalTitle: "📖 Historical Era Narrative",
        btnModalPrev: "◄ Previous Era",
        btnModalSync: "Sync on Map 📍",
        btnModalNext: "Next Era ►",
        mapSourceModalTitle: "📜 Map Source & Archival Citation",
        sourceAuthorLabel: "Cartographer / Surveyor:",
        sourceRepoLabel: "Archival Repository:",
        sourceDateLabel: "Publication / Survey Date:",
        sourceNotesLabel: "Historical Context & Notes:",
        citationModalTitle: "🎓 Research Methodology & Academic Citation",
        citationProjectBadge: "Master's Thesis Project",
        citationHeading: "Diachronic Spatial Analysis & Urban Morphology of Old Mosul",
        citationDesc: "This interactive GIS platform models, documents, and analyzes the morphogenetic evolution of the Old City of Mosul across 14 historical eras from 637 CE to 2020 CE.",
        citeMethodLabel: "Core Methodology:",
        citeMethodVal: "Space Syntax (Rₙ), Fractal Dimension (D_f), Vector GIS Digitization",
        citeCRSLabel: "Coordinate Reference System:",
        citeLayersLabel: "Vector Layers:",
        citeLayersVal: "96 vector layers across 14 historical eras",
        citeDEMLabel: "Digital Elevation Model:",
        citeDEMVal: "High-resolution DEM for historic terrain analysis",
        citeBibtexLabel: "BibTeX Citation:"
    }
};

// ── Layer Categories Localization ─────────────────────────────
const categoryTranslations = {
    'Building Blocks':          { ar: 'البلوكات والمباني السكنية', en: 'Building Blocks' },
    'Roads':                    { ar: 'شبكة الطرق والأزقة', en: 'Road Networks' },
    'Waterways & Bridges':      { ar: 'المجاري المائية والجسور', en: 'Waterways & Bridges' },
    'City Walls & Gates':       { ar: 'أسوار المدينة والأبواب', en: 'City Walls & Gates' },
    'Heritage & Landmarks':     { ar: 'المعالم التراثية والتاريخية', en: 'Heritage & Landmarks' },
    'Open Spaces & Cemeteries': { ar: 'المساحات المفتوحة والمقابر', en: 'Open Spaces & Cemeteries' },
    'Railways':                 { ar: 'خطوط السكك الحديدية', en: 'Railways' },
    'Era Changes':              { ar: 'تغيرات الحقبة والنمو', en: 'Era Changes & Growth' },
    'Other':                    { ar: 'طبقات أخرى', en: 'Other Layers' }
};

function getTranslatedCategory(catName) {
    if (categoryTranslations[catName]) {
        return currentLang === 'ar' ? categoryTranslations[catName].ar : categoryTranslations[catName].en;
    }
    return catName;
}

// ── Specific Layer Name Localization ──────────────────────────
const layerNameTranslations = {
    'Building Blocks':        { ar: 'البلوكات والمباني السكنية', en: 'Building Blocks' },
    'Road Network':           { ar: 'شبكة الطرق والأزقة', en: 'Road Network' },
    'Roads':                  { ar: 'شبكة الطرق والأزقة', en: 'Road Network' },
    'Tigris River':           { ar: 'مجرى نهر دجلة', en: 'Tigris River' },
    'Bridges':                { ar: 'الجسور والمعابر', en: 'Bridges & Crossings' },
    'Islands':                { ar: 'الجزر النهرية (الحوايج)', en: 'River Islands' },
    'City Walls':             { ar: 'سور المدينة التاريخي', en: 'Historic City Wall' },
    'City Gates':             { ar: 'أبواب وسور الموصل', en: 'Historic City Gates' },
    'City Borders':           { ar: 'حدود المدينة الدفاعية', en: 'City Defensive Borders' },
    'Heritage Sites':         { ar: 'المباني والمعالم التراثية', en: 'Heritage Buildings & Landmarks' },
    'Historic Photos':        { ar: 'الصور الأرشيفية والتوثيق', en: 'Archival Historic Photos' },
    'Cemeteries':             { ar: 'المقابر التاريخية', en: 'Historic Cemeteries' },
    'Open Spaces':            { ar: 'المساحات المفتوحة والساحات', en: 'Public Open Spaces' },
    'Landscapes & Fields':    { ar: 'المزارع والبساتين المحيطة', en: 'Surrounding Agricultural Fields' },
    'Railways':               { ar: 'خط سكة الحديد', en: 'Railway Line' },
    'Urban Growth Analysis':  { ar: 'تحليل النمو الحضري', en: 'Urban Growth Analysis' }
};

function getTranslatedLayerName(name, catName) {
    if (layerNameTranslations[name]) {
        return currentLang === 'ar' ? layerNameTranslations[name].ar : layerNameTranslations[name].en;
    }
    return name;
}

// ── Arabic Text Normalization Helper ──────────────────────────
function normalizeArabic(s) {
    if (!s) return '';
    return String(s)
        .replace(/[\u064B-\u065F\u0640]/g, '') // remove fathatan, dammatan, kasratan, shadda, sukun, tatweel
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .replace(/[ؤ]/g, 'و')
        .replace(/[ئ]/g, 'ي')
        .replace(/[،,()\-–—.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

// ── Complete Building & Landmark Names Translation Lookup ────
const nameTranslations_AR_to_EN = {
    // Schools & Institutions
    "الاعدادية الشرقية": "Al-Sharqiya Preparatory High School",
    "المدرسة (المعهد الرياضي)": "Historical School (Sports Institute)",
    "المدرسة الرشدية": "Rüşdiye Military School",
    "المدرسة الإسلامية": "Islamic Madrasa Complex",
    "مركز الشرطة": "Old Central Police Headquarters",

    // Fortifications, Walls, Castles & Bastions
    "الباب العمادي": "Imadi Gate (Bab al-Imadi)",
    "باب العمادي": "Imadi Gate (Bab al-Imadi)",
    "البارود خانة": "Al-Barood Khana (Gunpowder Arsenal)",
    "طوب خانة": "Toub Khana (Artillery Arsenal)",
    "السور العقيلي": "Uqaylid Defensive City Wall",
    "سور الموصل": "Mosul City Wall",
    "السور المزدوج": "Double Defensive City Wall",
    "خندق السور": "Defensive City Moat",
    "ايج قلعة": "Inner Citadel Fortress (Ich Kale)",
    "إيغ كلاع": "Inner Citadel Fortress (Ich Kale)",
    "قلعة باشطابيا": "Bash Tapia Castle",
    "باشطابيا": "Bash Tapia Citadel Fortress",
    "قراسراي": "Qara Saray Palace Ruins",
    "قره سراي": "Qara Saray Palace Ruins",
    "قلعة قره سراي": "Qara Saray Fortress",
    "برج القلعة": "Citadel Bastion Tower",
    "قشلة الخيالة": "Cavalry Barracks (Qishla)",
    "القشلة": "Ottoman Military Barracks (Qishla)",
    "القشلة العسكرية": "Ottoman Military Barracks (Qishla)",
    "ثكنة عسكرية": "Military Barracks",

    // Gates & Roundabouts
    "باب البيض": "Bab al-Baidh Gate",
    "باب الجسر": "Bridge Gate (Bab al-Jisr)",
    "باب السراي": "Bab al-Saray Gate",
    "باب الطوب": "Bab al-Toub Gate",
    "باب جديد": "Bab al-Jadid Gate",
    "باب الجديد": "Bab al-Jadid Gate",
    "باب سنجار": "Sinjar Gate (Bab Sinjar)",
    "باب لكش": "Bab Lakash Gate",
    "باب القصابين": "Butchers Gate (Bab al-Qassabin)",
    "باب كندة": "Kinda Gate (Bab Kinda)",
    "باب المشرعة": "Al-Mashra'a Gate",
    "باب شمس": "Shams Gate (Bab Shams)",
    "باب العراق": "Iraq Gate (Bab al-Iraq)",
    "دورة الجسر الثاني": "Second Bridge Roundabout",
    "دورة باب جديد": "Bab al-Jadid Roundabout",
    "دورة باب سنجار": "Sinjar Gate Roundabout",
    "دورة باب لكش": "Bab Lakash Roundabout",

    // Bridges
    "الجسر الثالث": "Third Bridge (Al-Shuhada Bridge)",
    "الجسر الثاني (الحرية)": "Second Bridge (Al-Hurriya Bridge)",
    "الجسر الحديدي": "Historic Iron Bridge (King Ghazi Bridge)",
    "الجسر الحديدي (العتيق)": "Old Iron Bridge (Al-Jisr al-Ateeq)",
    "الجسر العتيق": "Old Bridge (Al-Jisr al-Ateeq)",
    "الجسر الخامس": "Fifth Bridge (Al-Jisr al-Khamis)",
    "الجسر الرابع": "Fourth Bridge (Al-Jisr al-Rabi)",
    "بقايا الجسر الحجري": "Remnants of Historic Stone Pier Bridge",
    "الجسر الحجري": "Historic Stone Pier Bridge",
    "جسر الموصل القديم": "Old Mosul Pontoon Boat Bridge",
    "جسر الحرية": "Al-Hurriya Bridge",
    "جسر الشهداء": "Al-Shuhada Bridge",
    "جسر نينوى": "Nineveh Bridge",
    "سايدين الجسر الخامس": "Fifth Bridge Dual Carriageway",

    // Mosques & Shrines
    "الجامع الأموي": "Great Umayyad Mosque",
    "الجامع الاموي": "Great Umayyad Mosque",
    "الجامع الأموي ودار الإمارة": "Umayyad Mosque & Governor's Palace (Dar al-Imara)",
    "الجامع الاموي (المصفي)": "Umayyad Mosque (Al-Musaffi)",
    "جامع المصفي": "Al-Musaffi Historic Mosque",
    "الجامع المجاهدي": "Al-Mujahidi Mosque (Al-Khidr)",
    "جامع المجاهدي (الخضر)": "Al-Mujahidi Mosque (Al-Khidr)",
    "جامع الخضر (المجاهدي)": "Al-Khidr Mosque (Al-Mujahidi)",
    "الجامع النوري": "Great Al-Nuri Mosque",
    "الجامع النوري الكبير": "Great Al-Nuri Mosque",
    "منارة الحدباء": "Al-Hadba Leaning Minaret",
    "المسجد الثقيف": "Al-Thaqeef Mosque",
    "جامع اسامة بن زيد": "Usama ibn Zayd Mosque",
    "جامع الاغوات": "Al-Aghawat Mosque",
    "جامع الجسر (الاغوات)": "Bridge Mosque (Al-Aghawat)",
    "جامع الامام ابراهيم": "Imam Ibrahim Mosque",
    "جامع الباشا": "Al-Basha Mosque",
    "جامع الرابعية": "Al-Rabia Mosque",
    "جامع الرضواني": "Al-Ridwani Mosque",
    "جامع الزيواني": "Al-Ziwani Mosque",
    "جامع القطانين": "Al-Qattanin Mosque",
    "جامع النبي جرجيس": "Prophet Jirjis Mosque & Shrine",
    "ضريح النبي جرجيس": "Prophet Jirjis Shrine",
    "جامع النبي شيت": "Prophet Seth Mosque & Shrine",
    "جامع النبي يونس": "Prophet Jonah Mosque & Shrine",
    "جامع باب البيض": "Bab al-Baidh Mosque",
    "جامع باب جديد": "Bab al-Jadid Mosque",
    "جامع حسين باشا": "Hussein Pasha al-Jalili Mosque",
    "جامع شيخ الشط": "Sheikh al-Shatt Mosque",
    "جامع عبدال": "Abdal Mosque",
    "جامع عمر الاسود": "Omar al-Aswad Mosque",
    "جامع قضيب البان": "Qadeeb al-Ban Mosque",
    "جامع خزام": "Khuzam Mosque",
    "جامع مجاهد الدين": "Mujahid al-Din Mosque",
    "جامع الإمام عون الدين": "Imam Awn al-Din Shrine",
    "جامع بكر أفندي": "Bakr Afandi Mosque",
    "جامع الخاتون": "Al-Khatoon Mosque",
    "جامع العادلية": "Al-Adiliyya Mosque",
    "جامع مريم خاتون": "Maryam Khatoon Mosque",
    "جامع عبد الله بك": "Abdullah Bek Mosque",
    "جامع الحامدية": "Al-Hamidiyya Mosque",
    "جامع الصائغ": "Al-Sa'igh Mosque",
    "مسجد أبو حاضير": "Abu Hadhir Mosque",
    "مسجد أو معهد تاريخي قديم مرتبط بمحلة الشيخ فتحي": "Historic Mosque & Madrasa of Sheikh Fathi Quarter",
    "مسجد الحر بن يوسف": "Al-Hur ibn Yusuf Mosque",
    "مسجد بنو سبت الصيرفي": "Banu Sabt al-Sayrafi Mosque",
    "مسجد تل العبادة": "Tel al-Ibadah Historic Mosque",
    "مسجد سعيد بن عبد الملك": "Sa'eed ibn Abd al-Malik Mosque",
    "مشهد الامام الباهر": "Imam al-Bahir Mashhad Shrine",
    "مرقد الامام الباهر": "Imam al-Bahir Shrine",
    "مرقد الامام عون الدين": "Imam Awn al-Din Shrine",
    "مرقد الامام عون الدين ابن الحسن": "Imam Awn al-Din ibn al-Hasan Shrine",
    "مرقد عون الدين ابن الحسن": "Awn al-Din ibn al-Hasan Shrine",
    "مرقد الامام محسن": "Imam Muhsin Shrine",
    "مرقد الامام يحيى ابو القاسم": "Imam Yahya Abu al-Qasim Shrine",
    "مرقد يحيى ابو القاسم": "Yahya Abu al-Qasim Shrine",
    "مرقد يحيى ابن القاسم": "Yahya ibn al-Qasim Shrine",
    "يحيى ابو القاسم": "Yahya Abu al-Qasim Shrine",
    "النواة الأصلية لمشهد الإمام يحيى بن القاسم على ضفة النهر": "Original Nucleus of Yahya Abu al-Qasim Shrine on Riverbank",
    "مرقد الشيخ فتحي": "Sheikh Fathi Shrine",
    "مرقد زيد بن علي": "Zayd ibn Ali Shrine",

    // Churches & Monasteries
    "المعلم المبكر لكنيسة مار توما": "Early Archaeological Site of St. Thomas Church",
    "كاتدرائية مار إيشوعياب": "Mar Isho'yahb Cathedral",
    "مار إيشوعياب": "Mar Isho'yahb Historic Site",
    "كنائس حوش البيعة": "Hosh al-Bie'a Historic Church Complex",
    "كنيسة الساعة": "Latin Clock Church (Our Lady of the Hour)",
    "كنيسة الآباء الدومنيكان": "Dominican Fathers Church (Clock Church)",
    "كنيسة الطاهرة": "Al-Tahira Historic Church",
    "كنيسة الطاهرة الكبرى": "Great Al-Tahira Church",
    "كنيسة الطاهرة القديمة": "Old Al-Tahira Historic Church",
    "كنيسة الطاهرة السريانية": "Al-Tahira Syriac Church",
    "كنيسة الطاهرة السريانية الكاثوليكية": "Al-Tahira Syriac Catholic Church",
    "كنيسة الطاهرة الخارجية": "Al-Tahira Outer Church",
    "كنيسة الطاهرة الخارجية (السريان)": "Al-Tahira Outer Syriac Church",
    "كنيسة الطاهرة الخارجية (الكلدان)": "Al-Tahira Outer Chaldean Church",
    "كنيسة الطاهرة الخارجية للسريان": "Al-Tahira Outer Syriac Church",
    "كنيسة الطاهرة الخارجية للسريان الارثدوكس": "Al-Tahira Syriac Orthodox Outer Church",
    "كنيسة شمعون الصفا": "St. Peter (Shamoun al-Safa) Church",
    "كنيسة مار أحودامه": "Mar Ahudama Church",
    "كنيسة مار اشعيا": "Mar Ishaya Historic Church",
    "كنيسة مار إشعيا": "Mar Ishaya Historic Church",
    "كنيسة مار توما": "St. Thomas Historic Church",
    "كنيسة مار توما للسريان الكاثوليك": "St. Thomas Syriac Catholic Church",
    "كنيسة مارتوما": "St. Thomas (Mar Touma) Historic Church",
    "كنيسة مارتوما للسريان الكاثوليك": "St. Thomas Syriac Catholic Church",
    "كنيسة مار جرجس": "St. George Church",
    "كنيسة مار يوحنا": "St. John Church",
    "كنيسة مار حوديني": "Mar Hudeni Church",
    "كنيسة مار بهنام": "Mar Behnam Church",
    "كنيسة مار كوركيس": "St. George Church",
    "كنيسة مسكنتة": "Miskinta Historic Church",
    "دير الأعلى": "Al-Dair al-A'la Monastery",
    "دير مار ميخائيل": "Mar Mikhael Monastery",
    "دير مار إيليا": "Dair Mar Elia Monastery",
    "دير النصر": "Dair al-Nasr Monastery",

    // Palaces, Mansions & Civic Buildings
    "بيت التتنجي": "Al-Tatanji Heritage House",
    "بيت سليمان الصائغ": "Suleiman al-Sayegh Historic House",
    "دار الامارة": "Governor's Palace (Dar al-Imara)",
    "دار الست نعم": "Dar al-Sitt Ni'am Historic Mansion",
    "دار ضرب العملة": "Historic Minting House (Dar al-Dharb)",
    "سراي": "Ottoman Saray Government Complex",
    "سراي الحكم": "Ottoman Saray Administrative Seat",
    "السراي": "Ottoman Saray Government Complex",
    "السراي العثماني": "Ottoman Government Saray",
    "قصر الحاكم": "Governor's Palace",
    "قصر الحكم": "Government Palace",
    "قصر الحكم والقشلة العسكرية": "Government Palace & Military Barracks",
    "قصر المنقوشة": "Al-Manqousha Historic Palace",
    "قصر امين بك الجليلي": "Amin Bek al-Jalili Palace",
    "بلدية الموصل": "Mosul Municipality",
    "المستشفى الملكي": "Royal Civil Hospital",
    "حمام القلعة": "Citadel Historic Hammam (Bathhouse)",
    "حمام عبيد اغا الجليلي": "Ubaid Agha al-Jalili Hammam",
    "خان الكمرك": "Customs Caravanserai (Khan al-Gumruk)",
    "خان حمو القدو": "Hammo al-Qaddou Historic Khan",
    "سوق الأربعاء الناشئ": "Emerging Wednesday Market (Suq al-Arba'a)",
    "سوق الأربعاء": "Wednesday Souk (Suq al-Arba'a)",
    "سوق الشعارين": "Al-Sha'areen Traditional Souk",
    "سوق الصفافير": "Coppersmiths Souk",
    "قيسارية الصاغة": "Goldsmiths Covered Qaysariyya",
    "عيسى داده": "Isa Dadah Historic Site & Quarter",
    "قبر العنز": "Qabr al-Anz Historic Landmark",
    "حديقة الشهداء": "Al-Shuhada Public Garden",
    "مقبرة القريش (لاحقاً جامع وضريح النبي جرجيس)": "Quraysh Cemetery (later Prophet Jirjis Mosque)",
    "مقبرة الموصل": "Old Mosul Historic Cemetery",

    // Streets & Waterways
    "شارع السور القديم": "Old City Wall Perimeter Road",
    "شارع الفاروق": "Al-Farouq Arterial Street",
    "شارع الكورنيش": "Corniche Riverfront Promenade",
    "شارع الكورنيش 2": "Corniche Riverfront Road",
    "شارع المكاوي": "Al-Makkawi Historic Street",
    "شارع النجفي": "Al-Najafi Historic Book Market Street",
    "شارع حلب": "Aleppo Street",
    "شارع نينوى": "Nineveh Arterial Street",
    "نهر دجلة": "Tigris River",
    "نهر الحر": "Al-Hur River Canal",
    "نهر الحر بن يوسف": "Al-Hur ibn Yusuf River Canal",
    "مجرى نهر الحر": "Al-Hur River Canal",
    "جزيرة دجلة": "Tigris River Island"
};

// Build inverted mapping and normalized lookups
const nameTranslations_EN_to_AR = {};
const nameTranslations_NORM_AR_to_EN = {};
const nameTranslations_NORM_EN_to_AR = {};

for (const [ar, en] of Object.entries(nameTranslations_AR_to_EN)) {
    nameTranslations_EN_to_AR[en] = ar;
    nameTranslations_EN_to_AR[en.toLowerCase()] = ar;
    nameTranslations_NORM_AR_to_EN[normalizeArabic(ar)] = en;
    nameTranslations_NORM_EN_to_AR[en.toLowerCase()] = ar;
}

function getTranslatedFeatureName(name) {
    if (!name) return '';
    const cleanName = String(name).trim();
    if (currentLang === 'ar') {
        if (nameTranslations_EN_to_AR[cleanName]) return nameTranslations_EN_to_AR[cleanName];
        if (nameTranslations_EN_to_AR[cleanName.toLowerCase()]) return nameTranslations_EN_to_AR[cleanName.toLowerCase()];
        if (nameTranslations_NORM_EN_to_AR[cleanName.toLowerCase()]) return nameTranslations_NORM_EN_to_AR[cleanName.toLowerCase()];
        return cleanName;
    } else {
        if (nameTranslations_AR_to_EN[cleanName]) return nameTranslations_AR_to_EN[cleanName];
        const norm = normalizeArabic(cleanName);
        if (nameTranslations_NORM_AR_to_EN[norm]) return nameTranslations_NORM_AR_to_EN[norm];

        // Substring / partial keyword matching
        for (const [ar, en] of Object.entries(nameTranslations_AR_to_EN)) {
            if (cleanName.includes(ar) || ar.includes(cleanName)) return en;
            const arNorm = normalizeArabic(ar);
            if (norm.includes(arNorm) || arNorm.includes(norm)) return en;
        }
        return cleanName;
    }
}

// ── Complete Photo Captions Translation Lookup (65 Photos) ────
const photoTranslations_AR_to_EN = {
    "بقايا اطلال منارة الجامع الاموي": "Remnants and ruins of the Umayyad Mosque minaret",
    "صورة تظهر الجامع النوري والمنارة الحدباء من على سطح احد المباني": "View showing the Great Al-Nuri Mosque and Al-Hadba Minaret from a nearby rooftop",
    "صورة تظهر الجزء خارج سور الموصل القديم ويظهر فيها الجامع المجاهدي": "View outside the Old Mosul city wall showing Al-Mujahidi Mosque",
    "صورة تظهر جامع الباشا ومنارته مأخوذة من سطح احد الابنية المجاورة للجامع": "View of Al-Basha Mosque and its minaret taken from an adjacent building rooftop",
    "صورة تظهر جامع ومرقد النبي جرجيس": "View of Prophet Jirjis Mosque and Shrine",
    "صورة تظهر فيها المنارة الحدباء من داخل حرم الجامع النوري": "View of the leaning Al-Hadba Minaret from within the courtyard of the Great Al-Nuri Mosque",
    "صورة تظهر فيها الواجهة النهرية لمدينة الموصل ، نلاحظ ظهور الجامع الاموي في الصورة": "View of the Mosul riverfront along the Tigris showing the Umayyad Mosque",
    "صورة تظهر قبة مرقد الامام عوني الدين ابن الحسن": "View of the dome of Imam Awn al-Din ibn al-Hasan Shrine",
    "صورة تظهر قلعة باشطابيا والجسر الثالث بعد بناءه": "View showing Bash Tapia Castle and the Third Bridge following its construction",
    "صورة تظهر قلعة باشطابيا ومرقد ابن القاسم وقلعة قره سراي": "View showing Bash Tapia Castle, Ibn al-Qasim Shrine, and Qara Saray Palace ruins",
    "صورة تظهر قلعة قره سراي": "View showing the historical ruins of Qara Saray Palace",
    "صورة تظهر كنيسة الساعة": "View showing the Latin Clock Church (Our Lady of the Hour)",
    "صورة تظهر مدخل الجامع النوري": "View showing the entrance portal of the Great Al-Nuri Mosque",
    "صورة توضح باب البيض ومنارة جامع الزيواني": "View showing Bab al-Baidh Gate and the minaret of Al-Ziwani Mosque",
    "صورة توضح باب سنجار وسور المدينة": "View showing Sinjar Gate and the historic city wall",
    "صورة توضح قلعة باشطابيا": "View of the historic fortress of Bash Tapia Castle",
    "صورة توضح قلعة قره سراي": "View showing the fortress ruins of Qara Saray",
    "صورة خارج سور المدينة يظهر فيها مرقد وجامع النبي شيت": "View outside the city wall showing Prophet Seth Mosque and Shrine",
    "صورة داخل كنيسة مارتوما": "Interior view inside St. Thomas Historic Church",
    "صورة عامة للموصل، تظهر فيها منارة الحدباء والجامع النوري": "General panoramic view of Mosul showing the leaning Al-Hadba Minaret and Great Al-Nuri Mosque",
    "صورة عامة للموصل، يظهر فيها مرقد عون الدين ابن الحسن و بيت امين بك الجليلي": "Panoramic view of Mosul showing Awn al-Din Shrine and Amin Bek al-Jalili Palace",
    "صورة في شارع الفاروق من على سطح احد المباني بأتجاه كنيسة الساعة": "View in Al-Farouq Street from a rooftop looking towards the Clock Church",
    "صورة في شارع نينوى": "Street view along Niniveh Street",
    "صورة لضريح الامام يحيى ابن القاسم": "View of Imam Yahya ibn al-Qasim Shrine",
    "صورة لقلعة باشطابيا": "View of the historic Bash Tapia Castle",
    "صورة للجامع المجاهدي": "View of Al-Mujahidi Historic Mosque",
    "صورة للجامع المجاهدي من قرب دار الامارة": "View of Al-Mujahidi Mosque near the Governor's Palace (Dar al-Imara)",
    "صورة للجامع النوري والمنارة الحدباء": "View of the Great Al-Nuri Mosque and Al-Hadba Minaret",
    "صورة للواجهة النهرية توضح ايج قلعة والخندق المحيط بها": "Riverfront view illustrating the Inner Citadel (Ich Kale) and surrounding defensive moat",
    "صورة للواجهة النهرية يظهر فيها جامع شيخ الشط": "Tigris riverfront view showing Sheikh al-Shatt Mosque",
    "صورة لمدخل بيت امين بك الجليلي": "View of the historic entrance portal of Amin Bek al-Jalili Mansion",
    "صورة لمدخل مرقد الامام عون الدين ابن الحسن": "View of the entrance portal of Imam Awn al-Din ibn al-Hasan Shrine",
    "صورة لمدينة الموصل من أعلى قلعة باشطابيا": "View of the City of Mosul looking out from the top of Bash Tapia Castle",
    "صورة لمرقد الامام عون الدين ابن الحسن": "View of Imam Awn al-Din ibn al-Hasan Shrine",
    "صورة لمرقد الامام يحيى ابن القاسم": "View of Imam Yahya ibn al-Qasim Shrine",
    "صورة لمرقد عون الدين ابن الحسن": "View of Awn al-Din ibn al-Hasan Shrine",
    "صورة لمرقد وجامع النبي جرجيس": "View of Prophet Jirjis Mosque and Shrine",
    "صورة لمرقد يحيى ابن القاسم": "View of Yahya ibn al-Qasim Shrine",
    "صورة لمنارة الحدباء": "View of the iconic leaning Al-Hadba Minaret",
    "صورة لمنارة الحدباء عام 1852": "Archival view of Al-Hadba Minaret in 1852",
    "صورة مقلوبة تظهر مرقد يحيى ابن القاسم وقلعة باشطابيا": "Historic archival photograph showing Yahya ibn al-Qasim Shrine and Bash Tapia Castle",
    "صورة مقلوبة لقلعة قره سراي": "Historic archival photograph showing the ruins of Qara Saray Palace",
    "صورة مقلوبة للواجهة النهرية وتظهر في الصورة قبة جامع شيخ الشط و قلعة باشطابيا": "Historic riverfront photograph showing the dome of Sheikh al-Shatt Mosque and Bash Tapia Castle",
    "صورة مقلوبة لمرقد وجامع النبي شيت والمقبرة التي حوله": "Historic photograph showing Prophet Seth Mosque, Shrine, and surrounding cemetery",
    "صورة مقلوبة لمرقد وجامع النبي شيت والمقبرة التي كانت حوله": "Historic photograph showing Prophet Seth Mosque, Shrine, and the historic cemetery",
    "صورة مقلوبة من اعلى قلعة باشطابيا باتجاه مرقد يحيى ابن القاسم": "Historic view from the top of Bash Tapia Castle towards Yahya ibn al-Qasim Shrine",
    "صورة من اعلى قلعة باشطابيا بأتجاه مرقد يحيى ابن القاسم يظهر فيها نهر دجلة والجسر الحديدي ومنقطة القليعات وجامع شيخ الشط": "View from top of Bash Tapia Castle towards Yahya Shrine showing the Tigris, Iron Bridge, Qal'aat quarter, and Sheikh al-Shatt Mosque",
    "صورة من اعلى قلعة باشطابيا باتجاه الموصل، يظهر فيها مرقد الامام يحيى ابن القاسم": "View from top of Bash Tapia Castle towards Mosul, showing Imam Yahya ibn al-Qasim Shrine",
    "صورة من اعلى قلعة باشطابيا تظهر مدينة الموصل والمنارة الحدباء": "View from top of Bash Tapia Castle showing the City of Mosul and Al-Hadba Minaret",
    "صورة من الضفة اليسرى تظهر بناء البلدية فوق ايج قلعة وجامع الاغوات": "View from the Left Bank showing the Municipal Building over Ich Kale and Al-Aghawat Mosque",
    "صورة من الضفة اليسرى تظهر دار الامارة والقشلة العسكرية في الموصل": "View from the Left Bank showing Dar al-Imara and the Ottoman Military Barracks (Qishla)",
    "صورة من الضفة اليسرى لنهر دجلة بأتجاه قلعة باشطابيا": "View from the Left Bank of the Tigris River looking towards Bash Tapia Castle",
    "صورة من الضفة اليسرى يظهر فيها جامع الاغوات وجامع الباشا": "View from the Left Bank showing Al-Aghawat Mosque and Al-Basha Mosque",
    "صورة من الضفة اليسرى يظهر فيها جزء من جسر الزوارق وجزء من الواجهة النهرية": "View from the Left Bank showing part of the historic pontoon boat bridge and the riverfront",
    "صورة من خارج الجامع النوري توضح شكل الجامع والقبة مع المنارة الحدباء": "Exterior view of the Great Al-Nuri Mosque showing the dome and leaning Al-Hadba Minaret",
    "صورة من خارج السور بأتجاه الجسر الحجري وجسر القوارب": "View outside the city wall looking towards the historic stone bridge and pontoon bridge",
    "صورة من خارج السور بأتجاه جامع الباشا": "View outside the city wall looking towards Al-Basha Mosque",
    "صورة من خارج السور قرب الباب الجديد تظهر الجامع العمري واحد ابراج السور": "View outside the wall near Bab al-Jadid showing Al-Omari Mosque and a defensive bastion tower",
    "صورة من خارج السور يظهر فيها باب لكش والقبة المخروطية لمرقد الامام عون الدين": "View outside the wall showing Bab Lakash and the conical dome of Imam Awn al-Din Shrine",
    "صورة من على جسر القوارب بأتجاه الواجهة النهرية": "View from the historic boat pontoon bridge looking towards the Tigris riverfront",
    "صورة من على جسر القوارب يظهر فيها باب الجسر وجامع الاغوات": "View from the boat bridge showing Bridge Gate (Bab al-Jisr) and Al-Aghawat Mosque",
    "صورة من على سطح احد المباني بأتجاه نهر دجلة": "View from a rooftop overlooking the Tigris River",
    "صورة من على قلعة باشطابيا  يظهر فيها مرقد يحيى ابن القاسم ومدينة الموصل": "View from Bash Tapia Castle showing Yahya ibn al-Qasim Shrine and the City of Mosul",
    "صورة يظهر فيها الجامع المجاهدي": "Photograph showing Al-Mujahidi Mosque",
    "صورة يظهر فيها الجامع النوري مع منارة الحدباء": "Photograph showing the Great Al-Nuri Mosque with Al-Hadba Minaret",
    // Short fallback labels
    "منظر لقلعة باشطابيا": "View of Bash Tapia Castle",
    "الجامع النوري والمنارة": "The Great Al-Nuri Mosque and Minaret",
    "شارع نينوى": "Niniveh Street",
    "كنيسة الساعة": "Latin Clock Church",
    "كنيسة الطاهرة": "Al-Tahira Historic Church",
    "سوق الصفافير": "Coppersmiths Souk",
    "باب الطوب": "Bab al-Toub Square"
};

const photoTranslations_EN_to_AR = {};
const photoTranslations_NORM_AR_to_EN = {};

for (const [ar, en] of Object.entries(photoTranslations_AR_to_EN)) {
    photoTranslations_EN_to_AR[en] = ar;
    photoTranslations_EN_to_AR[en.toLowerCase()] = ar;
    photoTranslations_NORM_AR_to_EN[normalizeArabic(ar)] = en;
}

function getTranslatedPhotoDesc(desc, photoPath) {
    const cleanDesc = desc ? String(desc).trim() : '';

    if (!cleanDesc) {
        // Derive contextual caption from photo file path
        if (photoPath) {
            const p = photoPath.toLowerCase();
            if (p.includes('nouri') || p.includes('nuri')) return currentLang === 'ar' ? "صورة أرشيفية: الجامع النوري الكبير والمنارة الحدباء" : "Archival photograph: Great Al-Nuri Mosque and Al-Hadba Minaret";
            if (p.includes('bash') || p.includes('tapia')) return currentLang === 'ar' ? "صورة أرشيفية: قلعة باشطابيا المطلة على دجلة" : "Archival photograph: Bash Tapia Castle on the Tigris River";
            if (p.includes('bridge') || p.includes('boat')) return currentLang === 'ar' ? "صورة أرشيفية: جسر الزوارق العائم والواجهة النهرية" : "Archival photograph: Historic pontoon boat bridge on the Tigris";
            if (p.includes('niniveh') || p.includes('nineveh')) return currentLang === 'ar' ? "صورة أرشيفية: شارع نينوى والنسيج العمراني" : "Archival photograph: Niniveh Street urban fabric";
            if (p.includes('hour') || p.includes('clock') || p.includes('horloge')) return currentLang === 'ar' ? "صورة أرشيفية: كنيسة الساعة اللاتينية" : "Archival photograph: Latin Clock Church";
            if (p.includes('tahira')) return currentLang === 'ar' ? "صورة أرشيفية: كنيسة الطاهرة التاريخية" : "Archival photograph: Historic Al-Tahira Church";
        }
        return currentLang === 'ar' ? "صورة أرشيفية تاريخية" : "Historic Archival Photograph";
    }

    if (currentLang === 'ar') {
        if (photoTranslations_EN_to_AR[cleanDesc]) return photoTranslations_EN_to_AR[cleanDesc];
        if (photoTranslations_EN_to_AR[cleanDesc.toLowerCase()]) return photoTranslations_EN_to_AR[cleanDesc.toLowerCase()];
        return cleanDesc;
    } else {
        if (photoTranslations_AR_to_EN[cleanDesc]) return photoTranslations_AR_to_EN[cleanDesc];
        const norm = normalizeArabic(cleanDesc);
        if (photoTranslations_NORM_AR_to_EN[norm]) return photoTranslations_NORM_AR_to_EN[norm];

        // Fuzzy substring lookup
        for (const [ar, en] of Object.entries(photoTranslations_AR_to_EN)) {
            const arNorm = normalizeArabic(ar);
            if (norm.includes(arNorm) || arNorm.includes(norm)) return en;
        }

        // Substring keywords lookup
        for (const [ar, en] of Object.entries(nameTranslations_AR_to_EN)) {
            const arNorm = normalizeArabic(ar);
            if (norm.includes(arNorm)) {
                return `Historic archival photograph showing ${en}`;
            }
        }

        return cleanDesc;
    }
}

// ── Global Set Language Function ──────────────────────────────
function setLanguage(lang) {
    currentLang = lang;
    try { localStorage.setItem('mosul_gis_lang', lang); } catch (_) {}

    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar' ? 'rtl' : 'ltr');

    const toggleBtn = document.getElementById('lang-toggle-btn');
    const toggleBtnText = document.getElementById('lang-btn-text');
    if (toggleBtnText) {
        toggleBtnText.innerText = I18N_UI[lang].langBtnText;
    }
    if (toggleBtn) {
        toggleBtn.title = lang === 'ar' ? 'Switch Language / تغيير اللغة إلى الإنجليزية' : 'تغيير اللغة إلى العربية / Switch Language to Arabic';
    }

    // Translate all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (I18N_UI[lang] && I18N_UI[lang][key]) {
            el.innerHTML = I18N_UI[lang][key];
        }
    });

    // Re-render dynamic timeline cards and layer lists
    initTimelineUI();

    const activeIndex = slider ? parseInt(slider.value) : 0;
    const activeYear = years[activeIndex] || years[0];
    updateYear(activeIndex);

    // Refresh modals if open
    const descWin = document.getElementById('era-desc-window');
    if (descWin && descWin.classList.contains('show')) {
        populateEraDescription(currentModalDescYear);
    }
    const srcWin = document.getElementById('map-source-window');
    if (srcWin && srcWin.classList.contains('show')) {
        populateMapSourceData(currentModalSourceYear || activeYear);
    }

    // Refresh photo popup caption if currently visible
    if (activePhotoFeature && macWindow && macWindow.classList.contains('show')) {
        const props = activePhotoFeature.properties || {};
        const photoPath = props.Photos || props.photo || props.Photo || props.PHOTO || '';
        const rawCaption = props.Descriptio || props.descriptio || props.description || props.Description || props.desc || '';
        const captionEl = document.getElementById('mac-caption');
        if (captionEl) {
            captionEl.innerText = getTranslatedPhotoDesc(rawCaption, photoPath);
        }
    }
}

let atlasDataReady = false;
let manifest = null;
let mapSources = {};
let loadedLayersData = [];
const stats = {};               // { year: { buildings, roads } }

// Photo popup state
let clickedPhotoThisTurn = false;
let isPhotoWindowPinned   = false;
let activePhotoFeature    = null;
let activePhotoCoords     = null;
let hasBeenDragged = false;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let windowStartX = 0, windowStartY = 0;

// Raster base map state
let rasterManifest = {};
let currentRasterOpacity = 0.85;

// Compare-mode state
let isCompareModeActive = false;
let mapCompare = null;
let isSyncing = false;

// Space-syntax state
let isSpaceSyntaxActive = false;

// Measurement state
let measureMode = 'none';           // 'none' | 'distance' | 'area'
let measureCoords = [];             // collected coordinates

// Tour state
let tourActive = false;
let tourStepIndex = 0;
let tourTimeout = null;
let isProgrammaticFlight = false;

// ── DOM refs ─────────────────────────────────────────────────
const macWindow    = document.getElementById('mac-photo-window');
const slider       = document.getElementById('timeline-slider');
const yearDisplay  = document.getElementById('current-year');
const layerToggles = document.getElementById('layer-toggles');
const compareBtn   = document.getElementById('compare-btn');
const terrainToggle = document.getElementById('terrain-toggle');
const terrainExaggeration = document.getElementById('terrain-exaggeration');
const compareSection = document.getElementById('compare-section');
const compareSelect  = document.getElementById('compare-year-select');

// ════════════════════════════════════════════════════════════
// LAYER CLASSIFICATION HELPERS
// ════════════════════════════════════════════════════════════
function getLayerCategory(n) {
    const l = n.toLowerCase();
    if (l.includes('evolution') || l.includes('changes'))                  return 'Era Changes';
    if (l.includes('railway'))                                              return 'Railways';
    if (l.includes('cemetery')||l.includes('landscape')||l.includes('field')||l.includes('agriculture')) return 'Open Spaces & Cemeteries';
    if (l.includes('heritage')||l.includes('landmark')||(l.includes('building')&&l.includes('point'))) return 'Heritage & Landmarks';
    if (l.includes('photo'))                                                return 'Heritage & Landmarks';
    if (l.includes('wall')||l.includes('gate')||l.includes('border')||l.includes('boarder')) return 'City Walls & Gates';
    if (l.includes('bridge'))                                               return 'Waterways & Bridges';
    if ((l.includes('river')||l.includes('water')||l.includes('island'))&&!l.includes('road')) return 'Waterways & Bridges';
    if (l.includes('road')||l.includes('rounds'))                           return 'Roads';
    if (l.includes('building')||l.includes('block'))                        return 'Building Blocks';
    return 'Other';
}

function getLayerPriority(n) {
    const l = n.toLowerCase();
    if (l.includes('gate')||l.includes('entrance'))                                   return 100;
    if (l.includes('photo'))                                                           return 95;
    if (l.includes('heritage')||l.includes('landmark')||(l.includes('building')&&l.includes('point'))) return 90;
    if ((l.includes('building')||l.includes('block'))&&!l.includes('heritage')&&!l.includes('photo')) return 80;
    if (l.includes('wall')||l.includes('border')||l.includes('boarder'))              return 70;
    if (l.includes('bridge'))                                                          return 60;
    if (l.includes('road')||l.includes('rounds'))                                     return 50;
    if (l.includes('railway'))                                                         return 40;
    if (l.includes('cemetery')||l.includes('landscape')||l.includes('field')||l.includes('agriculture')) return 30;
    if (l.includes('island'))                                                          return 25;
    if ((l.includes('river')||l.includes('water')||l.includes('hur'))&&!l.includes('road')) return 20;
    return 10;
}

// Normal building colour expression (status-aware)
let currentAnalysisMode = 'normal'; // 'fractal', 'normal'

// Normal building colour expression (status-aware)
const BUILDING_COLOR_NORMAL = [
    'match', ['coalesce', ['get', 'Status'], ''],
    'Lost_or_Road_Cut', '#ef4444',
    'Survived',         '#fbbf24',
    '#d97706'
];

function getBuildingColorExpr() {
    return BUILDING_COLOR_NORMAL;
}

function getBuildingHeightExpr() {
    return [
        'case',
        ['has', 'height'],     ['get', 'height'],
        ['has', 'Complexity'], ['interpolate', ['linear'], ['get', 'Complexity'], 0, 6, 2, 14],
        8
    ];
}

function getWallHeightExpr() {
    return 22;
}

function getHeritageHeightExpr() {
    return [
        'case',
        ['has', 'PermIdx'],    ['+', ['interpolate', ['linear'], ['get', 'PermIdx'], 0, 5, 20000, 18], 3],
        ['has', 'Complexity'], ['+', ['interpolate', ['linear'], ['get', 'Complexity'], 0, 5, 2, 20], 3],
        15
    ];
}

function updateBuildingHeatmapColors() {
    window.mosulAnalysis?.refresh();
}

// ════════════════════════════════════════════════════════════
// PHOTO POPUP HELPERS
// ════════════════════════════════════════════════════════════
function getPhotoUrl(p) {
    if (!p) return '';
    let clean = p.replace(/\\/g, '/');
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        return clean;
    }
    const idx = clean.toLowerCase().indexOf('old photos');
    if (idx !== -1) {
        clean = clean.slice(idx);
    } else if (!clean.startsWith('/')) {
        clean = 'Old Photos/' + clean;
    }
    return clean.split('/')
        .map(segment => encodeURIComponent(segment.normalize('NFC')))
        .join('/');
}

function showPhotoWindow(feature, coords) {
    if (isPhotoWindowPinned) return;
    activePhotoFeature = feature;
    activePhotoCoords  = coords;
    hasBeenDragged     = false;

    const props     = feature.properties || {};
    const photoPath = props.Photos || props.photo || props.Photo || props.PHOTO || '';
    const imgUrl    = getPhotoUrl(photoPath);
    const rawCaption = props.Descriptio || props.descriptio || props.description || props.Description || props.desc || '';
    const caption   = getTranslatedPhotoDesc(rawCaption, photoPath);

    const imgEl     = document.getElementById('mac-img');
    const captionEl = document.getElementById('mac-caption');

    if (imgEl) imgEl.src = imgUrl;
    if (captionEl) {
        captionEl.innerText = caption;
        captionEl.style.display = caption ? 'block' : 'none';
    }

    macWindow.style.display = 'flex';
    macWindow.classList.remove('dragging');
    positionPhotoWindow();
    requestAnimationFrame(() => macWindow.classList.add('show'));
}

function positionPhotoWindow() {
    if (!activePhotoCoords || isDragging) return;
    if (hasBeenDragged && isPhotoWindowPinned) return;

    const rect = map.getContainer().getBoundingClientRect();
    const px   = map.project(activePhotoCoords);
    const W    = 380;
    const H    = macWindow.offsetHeight || 380;

    let left = rect.left + px.x - W / 2;
    let top  = rect.top  + px.y - H - 25;

    if (left < 15) left = 15;
    if (left + W > window.innerWidth  - 15) left = window.innerWidth  - W - 15;
    if (top  < 15) top  = rect.top + px.y + 25;
    if (top + H > window.innerHeight - 15) top = window.innerHeight - H - 15;

    macWindow.style.left = `${left}px`;
    macWindow.style.top  = `${top}px`;
    const originX = Math.max(0, Math.min(W, rect.left + px.x - left));
    const originY = Math.max(0, Math.min(H, rect.top + px.y - top));
    macWindow.style.transformOrigin = `${originX}px ${originY}px`;
}

function hidePhotoWindow() {
    if (isPhotoWindowPinned) return;
    macWindow.classList.remove('show');
    activePhotoFeature = null;
    activePhotoCoords  = null;
    setTimeout(() => { if (!macWindow.classList.contains('show')) macWindow.style.display = 'none'; }, 300);
}

function pinPhotoWindow()   { isPhotoWindowPinned = true;  macWindow.classList.add('pinned'); }
function unpinPhotoWindow() {
    isPhotoWindowPinned = false;
    macWindow.classList.remove('pinned', 'show', 'dragging');
    macWindow.style.pointerEvents = 'none';
    activePhotoFeature = null;
    activePhotoCoords  = null;
    setTimeout(() => { if (!macWindow.classList.contains('show')) macWindow.style.display = 'none'; }, 300);
}

// Photo window drag & controls
const photoDragTarget = macWindow.querySelector('.mac-titlebar') || macWindow;
if (photoDragTarget) {
    photoDragTarget.addEventListener('mousedown', e => {
        if (e.target.closest('#photo-close-btn')) return;
        if (!macWindow.classList.contains('pinned')) return;
        isDragging = true; hasBeenDragged = true;
        macWindow.classList.add('dragging');
        dragStartX = e.clientX; dragStartY = e.clientY;
        windowStartX = parseInt(macWindow.style.left) || 0;
        windowStartY = parseInt(macWindow.style.top)  || 0;
        e.preventDefault();
    });
}
document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    macWindow.style.left = `${windowStartX + e.clientX - dragStartX}px`;
    macWindow.style.top  = `${windowStartY + e.clientY - dragStartY}px`;
});
document.addEventListener('mouseup', () => {
    isDragging = false;
    macWindow.classList.remove('dragging');
});
const photoCloseBtn = document.getElementById('photo-close-btn');
if (photoCloseBtn) {
    photoCloseBtn.addEventListener('click', e => {
        e.stopPropagation();
        unpinPhotoWindow();
    });
}
macWindow.querySelector('.close-btn')?.addEventListener('click', e => { e.stopPropagation(); unpinPhotoWindow(); });
macWindow.querySelector('.minimize-btn')?.addEventListener('click', e => { e.stopPropagation(); unpinPhotoWindow(); });
macWindow.querySelector('.zoom-btn')?.addEventListener('click', e => { e.stopPropagation(); unpinPhotoWindow(); });

// ════════════════════════════════════════════════════════════
// MAP INIT
// ════════════════════════════════════════════════════════════
if (maplibregl.getRTLTextPluginStatus && maplibregl.getRTLTextPluginStatus() === 'unavailable') {
    maplibregl.setRTLTextPlugin(
        'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
        null,
        true // Lazy load RTL plugin for Arabic text rendering
    );
}

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [43.128, 36.335],
    zoom: 14.5,
    pitch: 50,
    bearing: -10
});

const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

// ── Era Timeline UI Initialization ────────────────────────
function initTimelineUI() {
    slider.max = years.length - 1;

    const container = document.getElementById('era-groups-container');
    if (!container) return;

    let globalIdx = 0;
    let html = '';

    eraGroups.forEach((group, groupIdx) => {
        const firstIdx = globalIdx;
        const gName = currentLang === 'ar' ? (group.name_ar || group.name) : (group.name_en || group.name);
        const gFullName = currentLang === 'ar' ? (group.fullName_ar || group.fullName) : (group.fullName_en || group.fullName);
        const btnTitle = currentLang === 'ar' ? `عرض وصف ${gName}` : `View historical narrative of ${gName}`;
        html += `
        <div class="era-card-group ${groupIdx === 0 ? 'active-era' : ''}" data-era-id="${group.id}" data-first-idx="${firstIdx}">
            <div class="era-pill" title="${gFullName}" data-first-idx="${firstIdx}">
                <span>${gName}</span>
                <button class="era-pill-info-btn" data-first-year="${group.years[0]}" title="${btnTitle}">📖</button>
            </div>
            <div class="era-stem"></div>
            <div class="era-track-wrapper">
                ${group.years.length > 1 ? '<div class="era-line"></div>' : ''}
                ${group.years.map(y => {
                    const idx = globalIdx++;
                    const yrSuffix = currentLang === 'ar' ? 'م' : 'CE';
                    return `
                    <button type="button" class="node-cell" data-index="${idx}" data-year="${y}" title="${gFullName} (${y} ${yrSuffix})">
                        <div class="node ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>
                        <span class="year-num ${idx === 0 ? 'active-year' : ''}" data-index="${idx}">${y}</span>
                    </button>
                    `;
                }).join('')}
            </div>
        </div>
        `;

        if (groupIdx < eraGroups.length - 1) {
            html += `<div class="era-divider"></div>`;
        }
    });

    container.innerHTML = html;

    document.querySelectorAll('.era-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            if (e.target.closest('.era-pill-info-btn')) return;
            e.stopPropagation();
            const idx = parseInt(pill.dataset.firstIdx);
            slider.value = idx;
            updateYear(idx);
        });
    });

    document.querySelectorAll('.era-pill-info-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const y = parseInt(btn.dataset.firstYear);
            showEraDescription(y);
        });
    });

    document.querySelectorAll('.node-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(cell.dataset.index);
            slider.value = idx;
            updateYear(idx);
        });
    });
}

initTimelineUI();

// ════════════════════════════════════════════════════════════
// MAP LOAD — add sources, layers, terrain
// ════════════════════════════════════════════════════════════
map.on('load', async () => {
    try {
    // Terrain
    map.addSource('terrain-source', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15
    });
    map.setTerrain({ source: 'terrain-source', exaggeration: 1.5 });
    map.addLayer({
        id: 'hillshade-layer', type: 'hillshade', source: 'terrain-source',
        paint: {
            'hillshade-shadow-color':    'rgba(0,0,0,0.65)',
            'hillshade-highlight-color': 'rgba(255,255,255,0.08)',
            'hillshade-accent-color':    'rgba(0,0,0,0.7)'
        }
    });

    // Historical Base Map Raster Overlays
    try {
        rasterManifest = await (await fetch('data/raster_manifest.json')).json();
        for (const [yr, rInfo] of Object.entries(rasterManifest)) {
            const srcId = `raster-source-${yr}`;
            const lyrId = `raster-layer-${yr}`;
            map.addSource(srcId, {
                type: 'image',
                url: rInfo.url,
                coordinates: rInfo.coordinates
            });
            map.addLayer({
                id: lyrId,
                type: 'raster',
                source: srcId,
                layout: { visibility: yr === '637' ? 'visible' : 'none' },
                paint: {
                    'raster-opacity': currentRasterOpacity,
                    'raster-fade-duration': 300,
                    'raster-resampling': 'linear'
                }
            });
        }
    } catch (err) {
        console.warn('Could not load raster_manifest.json', err);
    }

    // Manifest + layers + map sources
    await loadMapSources();
    manifest = await (await fetch('data/manifest.json')).json();

    const rawLayers = [];
    await Promise.all(manifest.layers.map(async info => {
        const response = await fetch(`data/${info.file}`);
        if (!response.ok) throw new Error(`Missing map layer: ${info.file}`);
        const data = await response.json();


        rawLayers.push({ layerInfo: info, data });
        loadedLayersData.push({ layerInfo: info, data });
    }));

    // Sort by priority (lowest first = rendered at bottom)
    rawLayers.sort((a, b) => getLayerPriority(a.layerInfo.layer) - getLayerPriority(b.layerInfo.layer));
    loadedLayersData.sort((a, b) => getLayerPriority(a.layerInfo.layer) - getLayerPriority(b.layerInfo.layer));

    rawLayers.forEach(({ layerInfo, data }) => addLayerToMap(map, layerInfo, data));

    // Compile stats
    Object.keys(stats).forEach(y => {
        stats[y].buildings = parseFloat(stats[y].buildings.toFixed(3));
        stats[y].roads     = parseFloat(stats[y].roads.toFixed(2));
    });

    updateYear(Number(slider.value));
    atlasDataReady = true;
    updateBuildingHeatmapColors();
    setupMeasureWidget(); // Measurement tool
    window.dispatchEvent(new CustomEvent('mosul:ready'));
    } catch (error) {
        console.error('Map data could not be loaded', error);
        window.dispatchEvent(new CustomEvent('mosul:failed'));
    }
});

// ════════════════════════════════════════════════════════════
// ADD LAYER TO MAP (shared by main + compare)
// ════════════════════════════════════════════════════════════
function addLayerToMap(targetMap, layerInfo, data) {
    const layerId  = `layer-${layerInfo.layer}`;
    const sourceId = `source-${layerInfo.layer}`;
    const n        = layerInfo.layer.toLowerCase();

    const isRoad      = n.includes('road') || n.includes('rounds');
    const isIsland    = n.includes('island');
    const isWater     = (n.includes('river') || n.includes('water') || n.includes('hur')) && !isIsland && !isRoad;
    const isBridge    = n.includes('bridge');
    const isBorder    = n.includes('border') || n.includes('boarder');
    const isWall      = (n.includes('wall') || n.includes('gate') || n.includes('entrance')) && !isBorder;
    const isPhoto     = n.includes('photo');
    const isHeritage  = (n.includes('heritage') || n.includes('landmark') || (n.includes('building') && n.includes('point'))) && !isPhoto;
    const isBuilding  = (n.includes('building') || n.includes('block')) && !isHeritage && !isPhoto;
    const isOpenSpace = n.includes('cemetery') || n.includes('landscape') || n.includes('field') || n.includes('agriculture');
    const isRailway   = n.includes('railway');
    const isGate      = n.includes('gate') || n.includes('entrance');

    // Default colour
    let color = '#94a3b8';
    if (isBuilding)  color = '#d97706';
    if (isRoad)      color = '#fbbf24';
    if (isWater)     color = '#38bdf8';
    if (isIsland)    color = '#e2e8f0';
    if (isBridge)    color = '#ef4444';
    if (isWall)      color = '#f43f5e';
    if (isHeritage)  color = '#c084fc';
    if (isPhoto)     color = '#fb923c';
    if (isOpenSpace) color = '#84cc16';
    if (isRailway)   color = '#e2e8f0';

    const colorExpr = [
        'match', ['coalesce', ['get', 'Status'], ''],
        'Lost_or_Road_Cut', '#ef4444',
        'Survived',         '#fbbf24',
        color
    ];

    const features   = data.features || [];
    const valid      = features.find(f => f && f.geometry && f.geometry.type);
    const geomType0  = valid?.geometry?.type || 'Polygon';

    let processedData = data;
    let geomType      = geomType0;

    if (isWall && (geomType0 === 'LineString' || geomType0 === 'MultiLineString')) {
        try { processedData = turf.buffer(data, 15, { units: 'meters' }); geomType = 'Polygon'; }
        catch (_) {}
    }

    targetMap.addSource(sourceId, { type: 'geojson', data: processedData });

    if (geomType === 'Point' || geomType === 'MultiPoint') {
        if (isGate) {
            targetMap.addLayer({
                id: layerId, type: 'circle', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'circle-color': '#ef4444', 'circle-radius': 7.5, 'circle-opacity': 1,
                    'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff',
                    'circle-pitch-alignment': 'map'
                }
            });
            if (targetMap === map) {
                map.on('mouseenter', layerId, e => {
                    map.getCanvas().style.cursor = 'pointer';
                    const f = e.features[0]; if (!f) return;
                    const name = f.properties['Building N'] || f.properties.Name || f.properties.name || '';
                    if (name) popup.setLngLat(f.geometry.coordinates.slice()).setHTML(`<b>${getTranslatedFeatureName(name)}</b>`).addTo(map);
                });
                map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; popup.remove(); });
            }
        } else if (isPhoto) {
            targetMap.addLayer({
                id: layerId, type: 'circle', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'circle-color': '#fb923c', 'circle-radius': 9, 'circle-opacity': 0.9,
                    'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff',
                    'circle-pitch-alignment': 'map'
                }
            });
            targetMap.addLayer({
                id: `${layerId}-inner`, type: 'circle', source: sourceId,
                layout: { visibility: 'none' },
                paint: { 'circle-color': '#fff', 'circle-radius': 3.5, 'circle-opacity': 1, 'circle-pitch-alignment': 'map' }
            });
            if (targetMap === map) {
                map.on('mouseenter', layerId, e => {
                    map.getCanvas().style.cursor = 'pointer';
                    const f = e.features[0]; if (!f) return;
                    showPhotoWindow(f, f.geometry.coordinates.slice());
                });
                map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; hidePhotoWindow(); });
                map.on('click', layerId, e => {
                    clickedPhotoThisTurn = true;
                    const f = e.features[0]; if (!f) return;
                    showPhotoWindow(f, f.geometry.coordinates.slice());
                    pinPhotoWindow();
                });
            }
        } else {
            targetMap.addLayer({
                id: layerId, type: 'circle', source: sourceId,
                filter: ['==', ['geometry-type'], 'Point'],
                layout: { visibility: 'none' },
                paint: {
                    'circle-color': colorExpr, 'circle-radius': isBuilding ? 5 : 7,
                    'circle-opacity': 0.85, 'circle-stroke-width': 1.5,
                    'circle-stroke-color': '#fff', 'circle-pitch-alignment': 'map'
                }
            });
            if (targetMap === map) {
                map.on('mouseenter', layerId, e => {
                    map.getCanvas().style.cursor = 'pointer';
                    const f = e.features[0]; if (!f) return;
                    const p = f.properties || {};
                    const name = p['Building N'] || p['Building_N'] || p['Building N '] || p.Name || p.name || p.NAME || p.Label || p.id || '';
                    if (name) {
                        const coords = f.geometry.type === 'Point' ? f.geometry.coordinates.slice() : e.lngLat;
                        popup.setLngLat(coords).setHTML(`<b>${getTranslatedFeatureName(name)}</b>`).addTo(map);
                    }
                });
                map.on('mousemove', layerId, e => {
                    const f = e.features[0]; if (!f) return;
                    const p = f.properties || {};
                    const name = p['Building N'] || p['Building_N'] || p['Building N '] || p.Name || p.name || p.NAME || p.Label || p.id || '';
                    if (name) {
                        const coords = f.geometry.type === 'Point' ? f.geometry.coordinates.slice() : e.lngLat;
                        popup.setLngLat(coords);
                    }
                });
                map.on('mouseleave', layerId, () => {
                    map.getCanvas().style.cursor = '';
                    popup.remove();
                });
            }
        }
    } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
        targetMap.addLayer({
            id: layerId, type: 'line', source: sourceId,
            layout: { visibility: 'none' },
            paint: {
                'line-color': colorExpr,
                'line-width': isRoad ? 2.5 : (isRailway ? 2 : 4),
                'line-opacity': 0.85
            }
        });
        if (targetMap === map) {
            map.on('mouseenter', layerId, e => {
                const f = e.features && e.features[0]; if (!f) return;
                const p = f.properties || {};
                const name = p.Name || p.name || p.NAME || p['Building N'] || p['Building_N'] || p['Building N '] || p.Label || '';
                if (name) {
                    map.getCanvas().style.cursor = 'pointer';
                    popup.setLngLat(e.lngLat).setHTML(`<b>${getTranslatedFeatureName(name)}</b>`).addTo(map);
                }
            });
            map.on('mousemove', layerId, e => {
                const f = e.features && e.features[0]; if (!f) return;
                const p = f.properties || {};
                const name = p.Name || p.name || p.NAME || p['Building N'] || p['Building_N'] || p['Building N '] || p.Label || '';
                if (name) popup.setLngLat(e.lngLat);
            });
            map.on('mouseleave', layerId, () => {
                map.getCanvas().style.cursor = '';
                popup.remove();
            });
        }
    } else {
        // Polygon
        if (isBuilding) {
            targetMap.addLayer({
                id: layerId, type: 'fill-extrusion', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-extrusion-color': getBuildingColorExpr(),
                    'fill-extrusion-height': getBuildingHeightExpr(1.5, true),
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.85
                }
            });

        } else if (isBorder) {
            // City Borders: Flat ground boundary fill (not extruded to wall height)
            targetMap.addLayer({
                id: layerId, type: 'fill', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-color': colorExpr,
                    'fill-opacity': 0.25,
                    'fill-outline-color': '#f43f5e'
                }
            });
            if (targetMap === map) {
                map.on('mouseenter', layerId, e => {
                    const f = e.features && e.features[0]; if (!f) return;
                    const p = f.properties || {};
                    const name = p.Name || p.name || p.NAME || p['Building N'] || p['Building_N'] || p.Label || '';
                    if (name) {
                        map.getCanvas().style.cursor = 'pointer';
                        popup.setLngLat(e.lngLat).setHTML(`<b>${getTranslatedFeatureName(name)}</b>`).addTo(map);
                    }
                });
                map.on('mousemove', layerId, e => {
                    const f = e.features && e.features[0]; if (!f) return;
                    const p = f.properties || {};
                    const name = p.Name || p.name || p.NAME || p['Building N'] || p['Building_N'] || p.Label || '';
                    if (name) popup.setLngLat(e.lngLat);
                });
                map.on('mouseleave', layerId, () => {
                    map.getCanvas().style.cursor = '';
                    popup.remove();
                });
            }
        } else if (isWall) {
            targetMap.addLayer({
                id: layerId, type: 'fill-extrusion', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-extrusion-color': colorExpr,
                    'fill-extrusion-height': getWallHeightExpr(1.5, true),
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.9
                }
            });
            if (targetMap === map) {
                map.on('mouseenter', layerId, e => {
                    const f = e.features && e.features[0]; if (!f) return;
                    const p = f.properties || {};
                    const name = p.Name || p.name || p.NAME || p['Building N'] || p['Building_N'] || p.Label || '';
                    if (name) {
                        map.getCanvas().style.cursor = 'pointer';
                        popup.setLngLat(e.lngLat).setHTML(`<b>${getTranslatedFeatureName(name)}</b>`).addTo(map);
                    }
                });
                map.on('mousemove', layerId, e => {
                    const f = e.features && e.features[0]; if (!f) return;
                    const p = f.properties || {};
                    const name = p.Name || p.name || p.NAME || p['Building N'] || p['Building_N'] || p.Label || '';
                    if (name) popup.setLngLat(e.lngLat);
                });
                map.on('mouseleave', layerId, () => {
                    map.getCanvas().style.cursor = '';
                    popup.remove();
                });
            }
        } else if (isHeritage) {
            targetMap.addLayer({
                id: layerId, type: 'fill-extrusion', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-extrusion-color': colorExpr,
                    'fill-extrusion-height': getHeritageHeightExpr(1.5, true),
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.85
                }
            });
            if (targetMap === map) {
                map.on('mouseenter', layerId, e => {
                    map.getCanvas().style.cursor = 'pointer';
                    const f = e.features[0]; if (!f) return;
                    const name = f.properties['Building N'] || f.properties['Building_N'] || f.properties.Name || f.properties.name || '';
                    if (name) popup.setLngLat(e.lngLat).setHTML(`<b>${getTranslatedFeatureName(name)}</b>`).addTo(map);
                });
                map.on('mousemove', layerId, e => popup.setLngLat(e.lngLat));
                map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; popup.remove(); });
            }
        } else {
            targetMap.addLayer({
                id: layerId, type: 'fill', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-color': colorExpr,
                    'fill-opacity': isIsland ? 0.95 : (isWater ? 0.65 : (isOpenSpace ? 0.35 : 0.7)),
                    'fill-outline-color': isIsland ? '#cbd5e1' : (isOpenSpace ? 'transparent' : 'rgba(255,255,255,0.2)')
                }
            });
            if (targetMap === map) {
                map.on('mouseenter', layerId, e => {
                    const f = e.features && e.features[0]; if (!f) return;
                    const p = f.properties || {};
                    const name = p.Name || p.name || p.NAME || p['Building N'] || p['Building_N'] || p.Label || '';
                    if (name) {
                        map.getCanvas().style.cursor = 'pointer';
                        popup.setLngLat(e.lngLat).setHTML(`<b>${getTranslatedFeatureName(name)}</b>`).addTo(map);
                    }
                });
                map.on('mousemove', layerId, e => {
                    const f = e.features && e.features[0]; if (!f) return;
                    const p = f.properties || {};
                    const name = p.Name || p.name || p.NAME || p['Building N'] || p['Building_N'] || p.Label || '';
                    if (name) popup.setLngLat(e.lngLat);
                });
                map.on('mouseleave', layerId, () => {
                    map.getCanvas().style.cursor = '';
                    popup.remove();
                });
            }
        }
    }

    if (isHeritage || isGate || isRoad || isWall) {
        targetMap.on('click', layerId, event => {
            if (measureMode !== 'none' || !event.features?.length) return;
            window.dispatchEvent(new CustomEvent('mosul:feature', { detail: { feature: event.features[0], layerInfo, year: targetMap === mapCompare ? selectedCompareYear : years[Number(slider.value)] } }));
        });
    }

    // Accumulate stats (buildings & roads) — ONLY for the main map to prevent double-accumulation on compare mode load
    if (targetMap === map) {
        const relevantYears = layerInfo.years || [];
        if (isBuilding && (geomType === 'Polygon' || geomType === 'MultiPolygon')) {
            let area = 0;
            turf.featureEach(data, f => { try { area += turf.area(f); } catch(_) {} });
            relevantYears.forEach(y => {
                if (!stats[y]) stats[y] = { buildings: 0, roads: 0 };
                stats[y].buildings += area / 1_000_000;
            });
        }
        if (isRoad && (geomType === 'LineString' || geomType === 'MultiLineString')) {
            let len = 0;
            turf.featureEach(data, f => { try { len += turf.length(f, { units: 'kilometers' }); } catch(_) {} });
            relevantYears.forEach(y => {
                if (!stats[y]) stats[y] = { buildings: 0, roads: 0 };
                stats[y].roads += len;
            });
        }
    }
}

// ════════════════════════════════════════════════════════════
// LAYER VISIBILITY HELPERS
// ════════════════════════════════════════════════════════════
function setLayerVisibility(layerId, vis) {
    if (map.getLayer(layerId))            map.setLayoutProperty(layerId, 'visibility', vis);
    if (map.getLayer(`${layerId}-inner`)) map.setLayoutProperty(`${layerId}-inner`, 'visibility', vis);
}
function setCompareLayerVisibility(layerId, vis) {
    if (mapCompare && mapCompare.getLayer(layerId))            mapCompare.setLayoutProperty(layerId, 'visibility', vis);
    if (mapCompare && mapCompare.getLayer(`${layerId}-inner`)) mapCompare.setLayoutProperty(`${layerId}-inner`, 'visibility', vis);
}

// ════════════════════════════════════════════════════════════
// UPDATE YEAR (timeline slider handler)
// ════════════════════════════════════════════════════════════
function updateYear(index) {
    index = Math.max(0, Math.min(years.length - 1, Number(index) || 0));
    slider.value = index;
    const year = years[index];
    yearDisplay.innerText = formatYearLabel(year);

    const activeGroup = getEraGroupForYear(year);
    const badgeEl = document.getElementById('current-era-badge');
    if (badgeEl) {
        badgeEl.innerText = currentLang === 'ar' ? (activeGroup.name_ar || activeGroup.name) : (activeGroup.name_en || activeGroup.name);
        badgeEl.title = currentLang === 'ar' ? (activeGroup.fullName_ar || activeGroup.fullName) : (activeGroup.fullName_en || activeGroup.fullName);
    }

    document.querySelectorAll('.era-card-group').forEach(el => {
        el.classList.toggle('active-era', el.dataset.eraId === activeGroup.id);
    });

    document.querySelectorAll('.node').forEach((n) => {
        const i = parseInt(n.dataset.index);
        n.classList.toggle('active', i === index);
        n.closest('.node-cell')?.setAttribute('aria-pressed', String(i === index));
    });

    document.querySelectorAll('.year-num').forEach((s) => {
        const i = parseInt(s.dataset.index);
        s.classList.toggle('active-year', i === index);
    });

    const winEl = document.getElementById('map-source-window');
    if (winEl && winEl.classList.contains('show')) {
        populateMapSourceData(year);
    }

    const descWinEl = document.getElementById('era-desc-window');
    if (descWinEl && descWinEl.classList.contains('show')) {
        populateEraDescription(year);
    }

    if (isCompareModeActive) {
        const currentIdx = index;
        if (Number(selectedCompareYear) === Number(year)) selectedCompareYear = currentIdx > 0 ? years[currentIdx - 1] : years[currentIdx + 1];
        populateCompareUI(year);
        updateCompareLayout();
    }

    // The language and timeline are usable while map data is loading.
    if (!manifest) { window.dispatchEvent(new CustomEvent('mosul:year', { detail: { index, year } })); return; }

    // Hide all vector layers
    manifest.layers.forEach(l => setLayerVisibility(`layer-${l.layer}`, 'none'));

    // Update Historical Base Map Raster Layer
    const activeYrStr = String(year);
    const rasterToggleEl = document.getElementById('raster-toggle');
    const isRasterVisible = rasterToggleEl ? rasterToggleEl.checked : true;
    
    if (rasterManifest) {
        for (const yr of Object.keys(rasterManifest)) {
            const lyrId = `raster-layer-${yr}`;
            if (map.getLayer(lyrId)) {
                map.setLayoutProperty(lyrId, 'visibility', (yr === activeYrStr && isRasterVisible) ? 'visible' : 'none');
            }
        }
    }
    const rasterYrIndicator = document.getElementById('raster-year-indicator');
    if (rasterYrIndicator) {
        rasterYrIndicator.innerText = currentLang === 'ar' ? `${year} م` : `${year} CE`;
    }

    // Relevant layers for this year
    const numYear = Number(year);
    const relevant = manifest.layers.filter(l => l.years && l.years.some(y => Number(y) === numYear));

    // Group by category
    const catGroups = {
        'Building Blocks': [], 'Roads': [], 'Waterways & Bridges': [],
        'City Walls & Gates': [], 'Heritage & Landmarks': [],
        'Open Spaces & Cemeteries': [], 'Railways': [], 'Era Changes': []
    };
    relevant.forEach(l => { const c = getLayerCategory(l.layer); if (catGroups[c]) catGroups[c].push(l); });

    layerToggles.innerHTML = '';

    for (const [catName, catLayers] of Object.entries(catGroups)) {
        if (!catLayers.length) continue;

        const hdr = document.createElement('div');
        hdr.className = 'stat-label';
        hdr.style.cssText = 'margin-top:16px;margin-bottom:8px;';
        hdr.innerText = getTranslatedCategory(catName);
        layerToggles.appendChild(hdr);

        const nameGroups = {};
        catLayers.forEach(l => {
            let name = l.layer.replace(/_/g,' ')
                .replace(new RegExp(`${year}-?`, 'gi'), '')
                .replace(/-/g, ' ').trim();
            const nl = name.toLowerCase();

            if      (catName === 'Building Blocks')          name = 'Building Blocks';
            else if (catName === 'Roads')                    name = 'Road Network';
            else if (catName === 'Waterways & Bridges')      name = nl.includes('bridge') ? 'Bridges' : nl.includes('island') ? 'Islands' : 'Tigris River';
            else if (catName === 'City Walls & Gates')       name = nl.includes('wall') ? 'City Walls' : nl.includes('gate')||nl.includes('entrance') ? 'City Gates' : 'City Borders';
            else if (catName === 'Heritage & Landmarks')     name = nl.includes('photo') ? 'Historic Photos' : 'Heritage Sites';
            else if (catName === 'Open Spaces & Cemeteries') name = nl.includes('cemetery') ? 'Cemeteries' : nl.includes('open space') ? 'Open Spaces' : 'Landscapes & Fields';
            else if (catName === 'Railways')                 name = 'Railways';
            else if (catName === 'Era Changes')              name = 'Urban Growth Analysis';
            name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            if (!nameGroups[name]) nameGroups[name] = [];
            nameGroups[name].push(l);
        });

        Object.entries(nameGroups).forEach(([name, layers]) => {
            const isEraChange = catName === 'Era Changes';
            const enabled = layerPreferences.has(name) ? layerPreferences.get(name) : !isEraChange;
            layers.forEach(l => setLayerVisibility(`layer-${l.layer}`, enabled ? 'visible' : 'none'));

            const item = document.createElement('label');
            item.className = 'layer-item';
            const translatedLayerName = getTranslatedLayerName(name, catName);
            const swatch = { 'Bridges': '#ef4444', 'Historic Photos': '#fb923c', 'Islands': '#e2e8f0' }[name] || { 'Building Blocks': '#d97706', 'Roads': '#fbbf24', 'Waterways & Bridges': '#38bdf8', 'City Walls & Gates': '#f43f5e', 'Heritage & Landmarks': '#c084fc', 'Open Spaces & Cemeteries': '#84cc16', 'Railways': '#e2e8f0', 'Era Changes': '#ef4444' }[catName];
            item.innerHTML = `<input type="checkbox" ${enabled ? 'checked' : ''}> <span class="layer-swatch" style="background:${swatch}" aria-hidden="true"></span><span>${translatedLayerName}</span>`;
            item.querySelector('input').addEventListener('change', e => {
                layerPreferences.set(name, e.target.checked);
                layers.forEach(l => setLayerVisibility(`layer-${l.layer}`, e.target.checked ? 'visible' : 'none'));
            });
            layerToggles.appendChild(item);
        });
    }

    // Update stat cards
    const statBldEl = document.getElementById('stat-buildings');
    const statRdsEl = document.getElementById('stat-roads');
    const statGrwEl = document.getElementById('stat-growth');

    if (stats[year] && parseFloat(stats[year].buildings) > 0) {
        if (statBldEl) statBldEl.innerText = `${stats[year].buildings.toFixed(2)} km²`;
        if (statRdsEl) statRdsEl.innerText = `${stats[year].roads.toFixed(2)} km`;
        const validYears = Object.keys(stats).filter(y => parseFloat(stats[y].buildings) > 0).sort((a, b) => a - b);
        if (validYears.length && statGrwEl) {
            const base   = parseFloat(stats[validYears[0]].buildings);
            const growth = (parseFloat(stats[year].buildings) / base).toFixed(1);
            statGrwEl.innerText = `${growth} x`;
        }
    } else {
        if (statBldEl) statBldEl.innerText = '-- km²';
        if (statRdsEl) statRdsEl.innerText = '-- km';
        if (statGrwEl) statGrwEl.innerText = '-- x';
    }

    if (isSpaceSyntaxActive) {
        updateBuildingHeatmapColors();
    }
    window.dispatchEvent(new CustomEvent('mosul:year', { detail: { index, year } }));
}

// ════════════════════════════════════════════════════════════
// RASTER BASE MAP CONTROLS & LISTENERS
// ════════════════════════════════════════════════════════════
const rasterToggle       = document.getElementById('raster-toggle');
const rasterOpacityInput = document.getElementById('raster-opacity');
const rasterOpacityVal   = document.getElementById('raster-opacity-val');

if (rasterToggle) {
    rasterToggle.addEventListener('change', (e) => {
        if (isCompareModeActive) setMapYearLayers(mapCompare, selectedCompareYear);
        const activeYrStr = String(years[parseInt(slider.value)]);
        if (rasterManifest) {
            for (const yr of Object.keys(rasterManifest)) {
                const lyrId = `raster-layer-${yr}`;
                if (map.getLayer(lyrId)) {
                    map.setLayoutProperty(lyrId, 'visibility', (yr === activeYrStr && e.target.checked) ? 'visible' : 'none');
                }
            }
        }
    });
}

if (rasterOpacityInput) {
    rasterOpacityInput.addEventListener('input', (e) => {
        currentRasterOpacity = parseFloat(e.target.value);
        if (rasterOpacityVal) rasterOpacityVal.innerText = `${Math.round(currentRasterOpacity * 100)}%`;
        if (rasterManifest) {
            for (const yr of Object.keys(rasterManifest)) {
                const lyrId = `raster-layer-${yr}`;
                if (mapCompare?.getLayer(lyrId)) mapCompare.setPaintProperty(lyrId, 'raster-opacity', currentRasterOpacity);
                if (map.getLayer(lyrId)) {
                    map.setPaintProperty(lyrId, 'raster-opacity', currentRasterOpacity);
                }
            }
        }
    });
}

// ════════════════════════════════════════════════════════════
// 3D TERRAIN & HEIGHT CONTROLS & LISTENERS
// ════════════════════════════════════════════════════════════
const exaggerationVal = document.getElementById('exaggeration-val');

function updateTerrainState() {
    const isEnabled = terrainToggle ? terrainToggle.checked : true;
    const exVal = terrainExaggeration ? parseFloat(terrainExaggeration.value) : 1.5;

    if (exaggerationVal) {
        exaggerationVal.innerText = `${exVal.toFixed(1)}x`;
    }

    const updateMapInstance = (m) => {
        if (!m || !m.isStyleLoaded()) return;

        // Digital Elevation Model (DEM) terrain & hillshading only
        if (m.getSource('terrain-source')) {
            if (isEnabled) {
                m.setTerrain({ source: 'terrain-source', exaggeration: exVal });
                if (m.getLayer('hillshade-layer')) {
                    m.setLayoutProperty('hillshade-layer', 'visibility', 'visible');
                }
            } else {
                m.setTerrain(null);
                if (m.getLayer('hillshade-layer')) {
                    m.setLayoutProperty('hillshade-layer', 'visibility', 'none');
                }
            }
        }
    };

    updateMapInstance(map);
    if (mapCompare) updateMapInstance(mapCompare);
}

if (terrainToggle) {
    terrainToggle.addEventListener('change', updateTerrainState);
}

if (terrainExaggeration) {
    terrainExaggeration.addEventListener('input', updateTerrainState);
}

// ════════════════════════════════════════════════════════════
// SIDEBAR COLLAPSE / EXPAND TOGGLE
// ════════════════════════════════════════════════════════════
const sidebarEl        = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebarArrowEl   = sidebarToggleBtn ? sidebarToggleBtn.querySelector('.sidebar-toggle-arrow') : null;

if (sidebarToggleBtn && sidebarEl) {
    sidebarToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = sidebarEl.classList.toggle('collapsed');
        sidebarToggleBtn.classList.toggle('collapsed', isCollapsed);
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
        if (sidebarArrowEl) {
            sidebarArrowEl.innerText = isCollapsed ? '▶' : '◀';
        }
        sidebarToggleBtn.title = isCollapsed ? 'Show Panel' : 'Hide Panel';
    });
}

// ════════════════════════════════════════════════════════════
// TIMELINE EVENT LISTENERS
// ════════════════════════════════════════════════════════════
slider.addEventListener('input', e => updateYear(parseInt(e.target.value)));

// ════════════════════════════════════════════════════════════
// MAP SOURCES HELPERS & LISTENERS
// ════════════════════════════════════════════════════════════
async function loadMapSources() {
    try {
            mapSources = await (await fetch('data/map_sources.json')).json();
    } catch (e) {
        console.warn('Could not load map_sources.json', e);
    }
}

let currentModalSourceYear = 637;

function populateMapSourceData(year) {
    currentModalSourceYear = Number(year);
    const yearKey = String(year);
    const i18nSrc = mapSourcesI18N[yearKey];
    const src = mapSources[yearKey] || {};

    const eraGroup = getEraGroupForYear(year);
    const gName = currentLang === 'ar' ? eraGroup.name_ar : eraGroup.name_en;

    const eraText = currentLang === 'ar' ? `الحقبة: ${year} م (${gName})` : `Era: ${year} CE (${gName})`;
    const titleText = currentLang === 'ar' ? (i18nSrc ? i18nSrc.title_ar : (src.title || `خريطة الموصل (${year} م)`)) : (i18nSrc ? i18nSrc.title_en : (src.title || `Map of Mosul (${year} CE)`));
    const authorText = currentLang === 'ar' ? (i18nSrc ? i18nSrc.author_ar : (src.author || 'غير محدد')) : (i18nSrc ? i18nSrc.author_en : (src.author || 'Unspecified'));
    const repoText = currentLang === 'ar' ? (i18nSrc ? i18nSrc.repo_ar : (src.source || 'أرشيف كارتوغرافي')) : (i18nSrc ? i18nSrc.repo_en : (src.source || 'Archival Record'));
    const dateText = currentLang === 'ar' ? (i18nSrc ? i18nSrc.date_ar : (src.date || `${year} م`)) : (i18nSrc ? i18nSrc.date_en : (src.date || `${year} CE`));
    const descText = currentLang === 'ar' ? (i18nSrc ? i18nSrc.notes_ar : (src.description || '')) : (i18nSrc ? i18nSrc.notes_en : (src.description || ''));

    const badgeEl  = document.getElementById('source-year-badge');
    const titleEl  = document.getElementById('source-title');
    const authorEl = document.getElementById('source-author');
    const repoEl   = document.getElementById('source-repo');
    const dateEl   = document.getElementById('source-date');
    const descEl   = document.getElementById('source-desc');

    if (badgeEl)  badgeEl.innerText  = eraText;
    if (titleEl)  titleEl.innerText  = titleText;
    if (authorEl) authorEl.innerText = authorText;
    if (repoEl)   repoEl.innerText   = repoText;
    if (dateEl)   dateEl.innerText   = dateText;
    if (descEl)   descEl.innerText   = descText;
}

function showMapSource(year) {
    populateMapSourceData(year);
    const winEl = document.getElementById('map-source-window');
    if (winEl) {
        winEl.classList.add('show');
    }
}

const mapSourceBtn   = document.getElementById('map-source-btn');
const sourceCloseBtn = document.getElementById('source-close-btn');

if (mapSourceBtn) {
    mapSourceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const activeYear = years[parseInt(slider.value)] || years[0];
        showMapSource(activeYear);
    });
}
if (sourceCloseBtn) {
    sourceCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const winEl = document.getElementById('map-source-window');
        if (winEl) winEl.classList.remove('show');
    });
}

// ════════════════════════════════════════════════════════════
// ERA DESCRIPTION MODAL HELPERS & LISTENERS
// ════════════════════════════════════════════════════════════
let currentModalDescYear = 637;

function populateEraDescription(year) {
    currentModalDescYear = Number(year);
    const desc = eraDescriptions[currentModalDescYear] || {};
    const eraGroup = getEraGroupForYear(currentModalDescYear);

    const yearBadgeText = currentLang === 'ar' ? `السنة: ${currentModalDescYear} م` : `Year: ${currentModalDescYear} CE`;
    const groupBadgeText = currentLang === 'ar' ? (desc.era_ar || eraGroup.name_ar) : (desc.era_en || eraGroup.name_en);
    const titleText = currentLang === 'ar' ? (desc.title_ar || `سنة ${currentModalDescYear} م`) : (desc.title_en || `Year ${currentModalDescYear} CE`);
    const narrativeText = currentLang === 'ar' ? (desc.text_ar || "لا يتوفر وصف تاريخي لهذه الحقبة حالياً.") : (desc.text_en || "Historical description for this era will be updated shortly.");

    const yearBadgeEl  = document.getElementById('era-desc-year-badge');
    const groupBadgeEl = document.getElementById('era-desc-group-badge');
    const titleEl      = document.getElementById('era-desc-title');
    const textEl       = document.getElementById('era-desc-text');

    if (yearBadgeEl)  yearBadgeEl.innerText  = yearBadgeText;
    if (groupBadgeEl) groupBadgeEl.innerText = groupBadgeText;
    if (titleEl)      titleEl.innerText      = titleText;
    if (textEl)       textEl.innerText       = narrativeText;
}

function showEraDescription(year) {
    populateEraDescription(year);
    const winEl = document.getElementById('era-desc-window');
    if (winEl) winEl.classList.add('show');
}

const eraDescBtn      = document.getElementById('era-desc-btn');
const eraDescCloseBtn = document.getElementById('era-desc-close-btn');
const eraModalPrevBtn = document.getElementById('era-modal-prev-btn');
const eraModalNextBtn = document.getElementById('era-modal-next-btn');
const eraModalSyncBtn = document.getElementById('era-modal-sync-btn');

if (eraDescBtn) {
    eraDescBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const activeYear = years[parseInt(slider.value)] || years[0];
        showEraDescription(activeYear);
    });
}
if (eraDescCloseBtn) {
    eraDescCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const winEl = document.getElementById('era-desc-window');
        if (winEl) winEl.classList.remove('show');
    });
}
if (eraModalPrevBtn) {
    eraModalPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const curIdx = years.indexOf(currentModalDescYear);
        const prevIdx = curIdx > 0 ? curIdx - 1 : years.length - 1;
        slider.value = prevIdx;
        updateYear(prevIdx);
    });
}
if (eraModalNextBtn) {
    eraModalNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const curIdx = years.indexOf(currentModalDescYear);
        const nextIdx = curIdx < years.length - 1 ? curIdx + 1 : 0;
        slider.value = nextIdx;
        updateYear(nextIdx);
    });
}
if (eraModalSyncBtn) {
    eraModalSyncBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetIdx = years.indexOf(currentModalDescYear);
        if (targetIdx !== -1) {
            slider.value = targetIdx;
            updateYear(targetIdx);
        }
    });
}

// ════════════════════════════════════════════════════════════
// RESEARCH CITATION MODAL
// ════════════════════════════════════════════════════════════
const researchMetaBtn  = document.getElementById('research-meta-btn');
const citationCloseBtn = document.getElementById('citation-close-btn');

if (researchMetaBtn) {
    researchMetaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const winEl = document.getElementById('research-citation-window');
        if (winEl) winEl.classList.add('show');
    });
}
if (citationCloseBtn) {
    citationCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const winEl = document.getElementById('research-citation-window');
        if (winEl) winEl.classList.remove('show');
    });
}

// Close modals on Escape key or outside click
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.source-window.show').forEach(win => win.classList.remove('show'));
    }
});

// ════════════════════════════════════════════════════════════
// MORPHOMETRIC ANALYSIS MODE SELECTOR
// ════════════════════════════════════════════════════════════
const modeSyntaxBtn  = document.getElementById('mode-syntax-btn');
const modeFractalBtn = document.getElementById('mode-fractal-btn');
const modeNormalBtn  = document.getElementById('mode-normal-btn');

function setMorphologyMode(mode) {
    currentAnalysisMode = ['normal', 'fractal', 'syntax'].includes(mode) ? mode : 'normal';
    isSpaceSyntaxActive = currentAnalysisMode !== 'normal';
    [modeSyntaxBtn, modeFractalBtn, modeNormalBtn].forEach(button => {
        if (!button) return;
        const active = button.dataset.mode === currentAnalysisMode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    window.mosulAnalysis?.refresh();
}

if (modeSyntaxBtn)  modeSyntaxBtn.addEventListener('click', () => setMorphologyMode('syntax'));
if (modeFractalBtn) modeFractalBtn.addEventListener('click', () => setMorphologyMode('fractal'));
if (modeNormalBtn)  modeNormalBtn.addEventListener('click', () => setMorphologyMode('normal'));

// ════════════════════════════════════════════════════════════
// SIDEBAR TABS
// ════════════════════════════════════════════════════════════
document.querySelectorAll('.mac-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mac-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        btn.setAttribute('aria-selected', 'true');
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const activePanelId = btn.dataset.tab;
        document.getElementById(activePanelId).classList.add('active');

        if (activePanelId === 'tab-syntax') {
            setMorphologyMode('fractal');
        } else {
            setMorphologyMode('normal');
        }
    });
});

// ════════════════════════════════════════════════════════════
// COMPARE MODE
// ════════════════════════════════════════════════════════════
const transitionsData = [
    { from: 1778, to: 1852, layer: 'evolution_1778_to_1852' },
    { from: 1852, to: 1906, layer: '1852_1906_Changes' },
    { from: 1906, to: 1919, layer: '1906_1919_Changes' },
    { from: 1919, to: 1944, layer: '1919_1944_Changes' },
    { from: 1944, to: 1966, layer: 'evolution_1944_to_1966' },
    { from: 1966, to: 1988, layer: 'evolution_1966_to_1988' },
    { from: 1988, to: 2003, layer: 'evolution_1988_to_2003' },
    { from: 2003, to: 2020, layer: 'evolution_2003_to_2020' },
    { from: 1944, to: 2020, layer: '1944_2020_Changes' }
];

let selectedCompareYear = null;

function populateCompareUI(currentYear) {
    const numCurrentYear = Number(currentYear);
    const currentIdx = years.indexOf(numCurrentYear);
    const prevYear = currentIdx > 0 ? years[currentIdx - 1] : null;
    const nextYear = currentIdx < years.length - 1 ? years[currentIdx + 1] : null;

    const prevBtn = document.getElementById('compare-prev-btn');
    const nextBtn = document.getElementById('compare-next-btn');

    if (prevBtn) {
        if (prevYear) {
            prevBtn.style.display = 'flex';
            prevBtn.innerText = currentLang === 'ar' ? `◄ السابقة (${prevYear} م)` : `◄ Previous (${prevYear} CE)`;
            prevBtn.dataset.year = prevYear;
        } else {
            prevBtn.style.display = 'none';
        }
    }

    if (nextBtn) {
        if (nextYear) {
            nextBtn.style.display = 'flex';
            nextBtn.innerText = currentLang === 'ar' ? `التالية (${nextYear} م) ►` : `Future (${nextYear} CE) ►`;
            nextBtn.dataset.year = nextYear;
        } else {
            nextBtn.style.display = 'none';
        }
    }

    if (!selectedCompareYear || !years.map(Number).includes(Number(selectedCompareYear)) || Number(selectedCompareYear) === numCurrentYear) {
        selectedCompareYear = prevYear ? prevYear : nextYear;
    }

    if (compareSelect) {
        const otherYears = years.filter(y => Number(y) !== numCurrentYear);
        compareSelect.innerHTML = otherYears.map(y => {
            const isPrev = Number(y) === Number(prevYear);
            const isNext = Number(y) === Number(nextYear);
            let label = currentLang === 'ar' ? `${y} م` : `${y} CE`;
            if (isPrev) label += currentLang === 'ar' ? ' (الحقبة السابقة)' : ' (Previous Era)';
            else if (isNext) label += currentLang === 'ar' ? ' (الحقبة التالية)' : ' (Future Era)';
            return `<option value="${y}" ${Number(y) === Number(selectedCompareYear) ? 'selected' : ''}>${label}</option>`;
        }).join('');
    }

    if (prevBtn) prevBtn.classList.toggle('active', Number(selectedCompareYear) === Number(prevYear));
    if (nextBtn) nextBtn.classList.toggle('active', Number(selectedCompareYear) === Number(nextYear));
}

function setMapYearLayers(targetMap, year) {
    if (!targetMap || !manifest || !manifest.layers) return;
    const numYear = Number(year);
    if (isNaN(numYear)) return;
    for (const yr of Object.keys(rasterManifest)) {
        if (targetMap.getLayer(`raster-layer-${yr}`)) targetMap.setLayoutProperty(`raster-layer-${yr}`, 'visibility', Number(yr) === numYear && rasterToggle.checked ? 'visible' : 'none');
    }

    const isCompare = (targetMap === mapCompare);
    const setVisFunc = isCompare ? setCompareLayerVisibility : setLayerVisibility;

    manifest.layers.forEach(l => setVisFunc(`layer-${l.layer}`, 'none'));

    const relevant = manifest.layers.filter(l => l.years && l.years.some(y => Number(y) === numYear));
    relevant.forEach(l => {
        const cat = getLayerCategory(l.layer);
        if (cat !== 'Era Changes') {
            setVisFunc(`layer-${l.layer}`, 'visible');
        }
    });

    updateBuildingHeatmapColors();
}

function updateCompareLayout() {
    if (!isCompareModeActive) return;
    compareBtn.setAttribute('aria-pressed', 'true');
    compareBtn.innerText = currentLang === 'ar' ? '⇄ إنهاء المقارنة' : '⇄ Exit comparison';
    const currentYear = Number(years[parseInt(slider.value)]);
    const currentIdx = years.indexOf(currentYear);
    const prevYear = currentIdx > 0 ? years[currentIdx - 1] : null;
    const nextYear = currentIdx < years.length - 1 ? years[currentIdx + 1] : null;

    if (!selectedCompareYear || Number(selectedCompareYear) === currentYear) {
        selectedCompareYear = prevYear ? prevYear : nextYear;
    }

    const prevBtn = document.getElementById('compare-prev-btn');
    const nextBtn = document.getElementById('compare-next-btn');
    if (prevBtn) prevBtn.classList.toggle('active', Number(selectedCompareYear) === Number(prevYear));
    if (nextBtn) nextBtn.classList.toggle('active', Number(selectedCompareYear) === Number(nextYear));

    if (compareSelect && parseInt(compareSelect.value) !== Number(selectedCompareYear)) {
        compareSelect.value = selectedCompareYear;
    }

    setMapYearLayers(map, currentYear);

    if (mapCompare) {
        setMapYearLayers(mapCompare, selectedCompareYear);
    }

    let relText = '';
    if (Number(selectedCompareYear) === Number(prevYear)) relText = currentLang === 'ar' ? ' (الحقبة السابقة)' : ' (Previous Era)';
    else if (Number(selectedCompareYear) === Number(nextYear)) relText = currentLang === 'ar' ? ' (الحقبة التالية)' : ' (Future Era)';

    const mapALabel = document.getElementById('map-a-label');
    const mapBLabel = document.getElementById('map-b-label');
    if (mapALabel) mapALabel.innerText = currentLang === 'ar' ? `الخريطة الرئيسية: ${currentYear} م` : `Primary Map: ${currentYear} CE`;
    if (mapBLabel) mapBLabel.innerText = currentLang === 'ar' ? `خريطة المقارنة: ${selectedCompareYear} م` : `Comparison: ${selectedCompareYear} CE`;
    window.dispatchEvent(new CustomEvent('mosul:compare'));
}

compareBtn.addEventListener('click', () => {
    isCompareModeActive = !isCompareModeActive;
    compareBtn.classList.toggle('active', isCompareModeActive);
    if (currentLang === 'ar') {
        compareBtn.innerText = isCompareModeActive ? '⇄ نمط المقارنة: مفعل' : '⇄ مقارنة الحقب';
    } else {
        compareBtn.innerText = isCompareModeActive ? '⇄ Compare Mode: ON' : '⇄ Compare Eras';
    }
    document.body.classList.toggle('compare-mode', isCompareModeActive);
    compareBtn.setAttribute('aria-pressed', String(isCompareModeActive));
    window.dispatchEvent(new CustomEvent('mosul:compare'));
    map.resize();

    if (isCompareModeActive) {
        const currentYear = years[parseInt(slider.value)];
        const currentIdx = years.indexOf(currentYear);
        selectedCompareYear = currentIdx > 0 ? years[currentIdx - 1] : years[currentIdx + 1];

        compareSection.style.display = 'block';
        document.getElementById('map-a-label').style.display = 'block';
        document.getElementById('map-b-label').style.display = 'block';
        populateCompareUI(currentYear);
        if (!mapCompare) initCompareMap();
        else {
            map.resize(); mapCompare.resize();
            updateCompareLayout();
            mapCompare.jumpTo({ center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() });
        }
    } else {
        compareSection.style.display = 'none';
        document.getElementById('map-a-label').style.display = 'none';
        document.getElementById('map-b-label').style.display = 'none';
        updateYear(parseInt(slider.value));
        map.resize();
    }
});

const prevBtn = document.getElementById('compare-prev-btn');
const nextBtn = document.getElementById('compare-next-btn');

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        const y = parseInt(prevBtn.dataset.year);
        if (y) {
            selectedCompareYear = y;
            updateCompareLayout();
        }
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        const y = parseInt(nextBtn.dataset.year);
        if (y) {
            selectedCompareYear = y;
            updateCompareLayout();
        }
    });
}

compareSelect.addEventListener('change', e => {
    selectedCompareYear = parseInt(e.target.value);
    updateCompareLayout();
});

function syncMove(src, tgt) {
    if (isSyncing) return;
    isSyncing = true;
    tgt.jumpTo({ center: src.getCenter(), zoom: src.getZoom(), pitch: src.getPitch(), bearing: src.getBearing() });
    isSyncing = false;
}

function initCompareMap() {
    mapCompare = new maplibregl.Map({
        container: 'map-compare',
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing()
    });

    mapCompare.on('load', () => {
        mapCompare.on('move', () => {
            if (isCompareModeActive) syncMove(mapCompare, map);
        });

        if (!map._hasCompareSync) {
            map._hasCompareSync = true;
            map.on('move', () => {
                if (isCompareModeActive && mapCompare) syncMove(map, mapCompare);
            });
        }

        mapCompare.addSource('terrain-source', {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium', tileSize: 256, maxzoom: 15
        });
        const ex = terrainExaggeration ? parseFloat(terrainExaggeration.value) || 1.5 : 1.5;
        if (!terrainToggle || terrainToggle.checked) {
            mapCompare.setTerrain({ source: 'terrain-source', exaggeration: ex });
            mapCompare.addLayer({
                id: 'hillshade-layer', type: 'hillshade', source: 'terrain-source',
                paint: {
                    'hillshade-shadow-color': 'rgba(0,0,0,0.65)',
                    'hillshade-highlight-color': 'rgba(255,255,255,0.08)',
                    'hillshade-accent-color': 'rgba(0,0,0,0.7)'
                }
            });
        }

        for (const [yr, info] of Object.entries(rasterManifest)) {
            mapCompare.addSource(`raster-source-${yr}`, { type: 'image', url: info.url, coordinates: info.coordinates });
            mapCompare.addLayer({ id: `raster-layer-${yr}`, type: 'raster', source: `raster-source-${yr}`, layout: { visibility: 'none' }, paint: { 'raster-opacity': currentRasterOpacity } });
        }
        loadedLayersData.forEach(({ layerInfo, data }) => addLayerToMap(mapCompare, layerInfo, data));

        map.resize(); mapCompare.resize();
        updateCompareLayout();
    });
}

// ════════════════════════════════════════════════════════════
// SPACE SYNTAX
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
// SPATIAL MEASUREMENT TOOL
// ════════════════════════════════════════════════════════════
function setupMeasureWidget() {
    const openBtn   = document.getElementById('measure-open-btn');
    const widget    = document.getElementById('measure-widget');
    const closeBtn  = document.getElementById('measure-close-btn');
    const distBtn   = document.getElementById('measure-dist-btn');
    const areaBtn   = document.getElementById('measure-area-btn');
    const clearBtn  = document.getElementById('measure-clear-btn');
    const resultEl  = document.getElementById('measure-result');
    const instrEl   = document.getElementById('measure-instruction');

    // Measure sources & layers
    map.addSource('measure-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('measure-lines',  { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('measure-fill',   { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({ id: 'measure-fill-layer',  type: 'fill',   source: 'measure-fill',   paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.15 } });
    map.addLayer({ id: 'measure-line-layer',  type: 'line',   source: 'measure-lines',  paint: { 'line-color': '#f59e0b', 'line-width': 2.5, 'line-dasharray': [2, 2] } });
    map.addLayer({ id: 'measure-point-layer', type: 'circle', source: 'measure-points', paint: { 'circle-color': '#fff', 'circle-radius': 5, 'circle-stroke-width': 2, 'circle-stroke-color': '#f59e0b' } });

    // Floating label popup for measurement
    const measurePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'measure-label-popup' });

    function resetMeasure() {
        measureCoords = [];
        measureMode   = 'none';
        distBtn.classList.remove('active');
        areaBtn.classList.remove('active');
        clearBtn.disabled   = true;
        resultEl.innerText  = '—';
        instrEl.innerText   = currentLang === 'ar' ? 'اختر أداة، ثم انقر على الخريطة. انقر نقراً مزدوجاً للإنهاء.' : 'Choose a tool, then click on the map. Double-click to finish.';
        map.getCanvas().style.cursor = '';
        measurePopup.remove();
        map.getSource('measure-points').setData({ type: 'FeatureCollection', features: [] });
        map.getSource('measure-lines') .setData({ type: 'FeatureCollection', features: [] });
        map.getSource('measure-fill')  .setData({ type: 'FeatureCollection', features: [] });
    }

    function updateMeasureDraw() {
        if (measureCoords.length === 0) return;

        const ptFeatures = measureCoords.map(c => turf.point(c));
        map.getSource('measure-points').setData(turf.featureCollection(ptFeatures));

        if (measureCoords.length >= 2) {
            const line = turf.lineString(measureCoords);
            map.getSource('measure-lines').setData(turf.featureCollection([line]));

            if (measureMode === 'distance') {
                const dist = turf.length(line, { units: 'kilometers' });
                resultEl.innerText = dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(3)} km`;
                const mid = measureCoords[measureCoords.length - 1];
                measurePopup.setLngLat(mid).setHTML(`<b>${resultEl.innerText}</b>`).addTo(map);
            }

            if (measureMode === 'area' && measureCoords.length >= 3) {
                const closed = [...measureCoords, measureCoords[0]];
                const poly   = turf.polygon([closed]);
                const a      = turf.area(poly);
                resultEl.innerText = a < 10000 ? `${a.toFixed(0)} m²` : `${(a / 1_000_000).toFixed(4)} km²`;
                map.getSource('measure-fill').setData(turf.featureCollection([poly]));
                const mid = measureCoords[Math.floor(measureCoords.length / 2)];
                measurePopup.setLngLat(mid).setHTML(`<b>${resultEl.innerText}</b>`).addTo(map);
            }
        }
    }

    function activateMode(mode) {
        measureMode = mode;
        measureCoords = [];
        map.getCanvas().style.cursor = 'crosshair';
        clearBtn.disabled = false;
        if (mode === 'distance') {
            distBtn.classList.add('active');
            areaBtn.classList.remove('active');
            instrEl.innerText = currentLang === 'ar' ? 'انقر لإضافة نقاط المسار. انقر نقراً مزدوجاً لإنهاء قياس المسافة.' : 'Click to add points. Double-click to finish distance.';
        } else {
            areaBtn.classList.add('active');
            distBtn.classList.remove('active');
            instrEl.innerText = currentLang === 'ar' ? 'انقر لإضافة رؤوس المضلع. انقر نقراً مزدوجاً لإغلاق وحساب المساحة.' : 'Click to add vertices. Double-click to close the polygon.';
        }
        resultEl.innerText = '—';
        map.getSource('measure-points').setData({ type: 'FeatureCollection', features: [] });
        map.getSource('measure-lines') .setData({ type: 'FeatureCollection', features: [] });
        map.getSource('measure-fill')  .setData({ type: 'FeatureCollection', features: [] });
        measurePopup.remove();
    }

    openBtn.addEventListener('click', () => {
        const hidden = widget.style.display === 'none' || widget.style.display === '';
        widget.style.display = hidden ? 'block' : 'none';
        if (!hidden) resetMeasure();
    });
    closeBtn.addEventListener('click', () => { widget.style.display = 'none'; resetMeasure(); });
    distBtn .addEventListener('click', () => activateMode('distance'));
    areaBtn .addEventListener('click', () => activateMode('area'));
    clearBtn.addEventListener('click', resetMeasure);

    // Map click — handle photo unpin & measurement points
    map.on('click', e => {
        if (clickedPhotoThisTurn) {
            clickedPhotoThisTurn = false;
            return;
        }
        if (isPhotoWindowPinned) {
            unpinPhotoWindow();
        }
        if (measureMode === 'none') return;
        // Prevent interaction conflicts with layers
        measureCoords.push([e.lngLat.lng, e.lngLat.lat]);
        updateMeasureDraw();
    });

    // Map double-click — finish
    map.on('dblclick', e => {
        if (measureMode === 'none') return;
        e.preventDefault();
        // One last point
        measureCoords.push([e.lngLat.lng, e.lngLat.lat]);
        updateMeasureDraw();
        map.getCanvas().style.cursor = '';
        instrEl.innerText = currentLang === 'ar' ? 'اكتمل القياس بنجاح. اضغط "مسح" للبدء من جديد.' : 'Measurement complete. Press "Clear" to reset.';
        measureMode = 'none';   // stop collecting
        distBtn.classList.remove('active');
        areaBtn.classList.remove('active');
    });

    // Live cursor preview
    map.on('mousemove', e => {
        if (measureMode === 'none' || measureCoords.length === 0) return;
        const preview = [...measureCoords, [e.lngLat.lng, e.lngLat.lat]];
        const line = turf.lineString(preview);
        map.getSource('measure-lines').setData(turf.featureCollection([line]));
        if (measureMode === 'distance') {
            const d = turf.length(line, { units: 'kilometers' });
            measurePopup.setLngLat(e.lngLat)
                .setHTML(`<b>${d < 1 ? `${(d*1000).toFixed(0)} m` : `${d.toFixed(3)} km`}</b>`)
                .addTo(map);
        } else if (preview.length >= 3) {
            const poly = turf.polygon([[...preview, preview[0]]]);
            const a    = turf.area(poly);
            measurePopup.setLngLat(e.lngLat)
                .setHTML(`<b>${a < 10000 ? `${a.toFixed(0)} m²` : `${(a/1_000_000).toFixed(4)} km²`}</b>`)
                .addTo(map);
            map.getSource('measure-fill').setData(turf.featureCollection([poly]));
        }
    });
}

// ════════════════════════════════════════════════════════════
// LANGUAGE SWITCHER EVENT LISTENER & INIT
// ════════════════════════════════════════════════════════════
const langToggleBtn = document.getElementById('lang-toggle-btn');
if (langToggleBtn) {
    langToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextLang = currentLang === 'ar' ? 'en' : 'ar';
        setLanguage(nextLang);
    });
}

// Initialize default language state
setLanguage(currentLang);
