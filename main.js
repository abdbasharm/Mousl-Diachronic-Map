/* ═══════════════════════════════════════════════════════════
   Mosul Diachronic Map — main.js  v9.0
   Features: Layers · Space Syntax · Analytics · 3D Tour · Measure
   ═══════════════════════════════════════════════════════════ */

// ── Timeline years ──────────────────────────────────────────
const years = [637, 912, 1096, 1127, 1778, 1838, 1852, 1906, 1919, 1944, 1966, 1988, 2003, 2020];

function formatYearLabel(y) {
    return `${y}`;
}

// ── Era Groups Definition ─────────────────────────────────────
const eraGroups = [
    {
        id: "atabeg",
        name: "Islamic & Atabeg",
        fullName: "Islamic establishment and Atabeg expansion",
        years: [637, 912, 1096, 1127]
    },
    {
        id: "early-ottoman",
        name: "Early Ottoman",
        fullName: "Early Ottoman period",
        years: [1778]
    },
    {
        id: "middle-ottoman",
        name: "Middle Ottoman",
        fullName: "Middle Ottoman period",
        years: [1838, 1852]
    },
    {
        id: "late-ottoman",
        name: "Late Ottoman",
        fullName: "Late Ottoman period",
        years: [1906]
    },
    {
        id: "royal",
        name: "Royal Period",
        fullName: "Royal period",
        years: [1919, 1944]
    },
    {
        id: "modern",
        name: "Modern Expansion",
        fullName: "Modern expansion",
        years: [1966, 1988, 2003, 2020]
    }
];

function getEraGroupForYear(year) {
    const numYear = Number(year);
    return eraGroups.find(g => g.years.some(y => Number(y) === numYear)) || eraGroups[0];
}
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

// Bounding box helper for fast overlap check
function bboxOverlap(f1, f2) {
    if (!f1._bbox) f1._bbox = turf.bbox(f1);
    if (!f2._bbox) f2._bbox = turf.bbox(f2);
    const b1 = f1._bbox, b2 = f2._bbox;
    return !(b1[2] < b2[0] || b1[0] > b2[2] || b1[3] < b2[1] || b1[1] > b2[3]);
}

// Check if two line features are topologically connected (touching or within 15 meters)
function roadsIntersectOrClose(line1, line2) {
    if (!bboxOverlap(line1, line2)) return false;
    
    // 1. Check direct line intersection
    try {
        const inter = turf.lineIntersect(line1, line2);
        if (inter && inter.features && inter.features.length > 0) return true;
    } catch (_) {}
    
    // 2. Check distance between endpoints and the other line (account for small GIS drawing gaps)
    const coords1 = turf.getCoords(line1);
    const coords2 = turf.getCoords(line2);
    if (coords1.length === 0 || coords2.length === 0) return false;
    
    const ends1 = [coords1[0], coords1[coords1.length - 1]];
    const ends2 = [coords2[0], coords2[coords2.length - 1]];
    
    for (const p of ends1) {
        try {
            const pt = turf.point(p);
            const snapped = turf.nearestPointOnLine(line2, pt);
            const d = turf.distance(pt, snapped, { units: 'kilometers' });
            if (d < 0.015) return true; // 15 meters snapping
        } catch (_) {}
    }
    
    for (const p of ends2) {
        try {
            const pt = turf.point(p);
            const snapped = turf.nearestPointOnLine(line1, pt);
            const d = turf.distance(pt, snapped, { units: 'kilometers' });
            if (d < 0.015) return true; // 15 meters snapping
        } catch (_) {}
    }
    
    return false;
}

// Calculate space syntax walkability/permeability integration dynamically from the road network connectivity
function computeSpaceSyntax() {
    years.forEach(year => {
        // Find building layers for this year
        const buildingLayers = loadedLayersData.filter(item => {
            const nl = item.layerInfo.layer.toLowerCase();
            const isBld = (nl.includes('building') || nl.includes('block'))
                       && !nl.includes('heritage') && !nl.includes('photo')
                       && !nl.includes('point');
            return isBld && item.layerInfo.years.includes(year);
        });

        // Find road layers for this year (strictly line layers)
        const roadLayers = loadedLayersData.filter(item => {
            const nl = item.layerInfo.layer.toLowerCase();
            const isRd = (nl.includes('road') || nl.includes('rounds')) && !nl.startsWith('roads_') && !nl.startsWith('roads-');
            return isRd && item.layerInfo.years.includes(year);
        });

        if (buildingLayers.length === 0 || roadLayers.length === 0) return;

        // Merge all LineString road features for this year
        let roadFeatures = [];
        roadLayers.forEach(rl => {
            if (rl.data && rl.data.features) {
                rl.data.features.forEach(f => {
                    if (!f || !f.geometry) return;
                    const gtype = f.geometry.type;
                    if (gtype === 'LineString') {
                        roadFeatures.push(f);
                    } else if (gtype === 'MultiLineString') {
                        try {
                            const flat = turf.flatten(f);
                            if (flat && flat.features) {
                                flat.features.forEach(ff => roadFeatures.push(ff));
                            }
                        } catch (_) {
                            roadFeatures.push(f);
                        }
                    }
                });
            }
        });

        // Calculate connectivity (intersections/proximity connections) for each road segment O(N^2)
        const roadConnectivity = new Array(roadFeatures.length).fill(0);
        for (let i = 0; i < roadFeatures.length; i++) {
            const f1 = roadFeatures[i];
            if (!f1 || !f1.geometry) continue;
            for (let j = i + 1; j < roadFeatures.length; j++) {
                const f2 = roadFeatures[j];
                if (!f2 || !f2.geometry) continue;

                if (roadsIntersectOrClose(f1, f2)) {
                    roadConnectivity[i]++;
                    roadConnectivity[j]++;
                }
            }
        }

        // Map road connectivity to building block PermIdx
        buildingLayers.forEach(bl => {
            if (!bl.data || !bl.data.features) return;
            
            // First pass: assign simulated PermIdx only to features missing research data
            bl.data.features.forEach(f => {
                if (!f.geometry) return;

                // Keep original research data if present
                if (f.properties && f.properties.PermIdx !== undefined && f.properties.PermIdx !== null && !f.properties.isSimulated) {
                    return;
                }

                let bldPt;
                try {
                    bldPt = turf.centroid(f);
                } catch (_) {
                    let coord = [43.128, 36.335];
                    if (f.geometry.coordinates) {
                        if (f.geometry.type === 'Polygon' && f.geometry.coordinates[0] && f.geometry.coordinates[0][0]) coord = f.geometry.coordinates[0][0];
                        else if (f.geometry.type === 'MultiPolygon' && f.geometry.coordinates[0] && f.geometry.coordinates[0][0] && f.geometry.coordinates[0][0][0]) coord = f.geometry.coordinates[0][0][0];
                    }
                    bldPt = turf.point(coord);
                }

                // Find closest road segment
                let minBldDist = Infinity;
                let closestRoadIdx = -1;

                roadFeatures.forEach((rf, idx) => {
                    try {
                        const snapped = turf.nearestPointOnLine(rf, bldPt);
                        const d = turf.distance(bldPt, snapped, { units: 'kilometers' });
                        if (d < minBldDist) {
                            minBldDist = d;
                            closestRoadIdx = idx;
                        }
                    } catch (_) {}
                });

                let conn = 0;
                if (closestRoadIdx !== -1) {
                    conn = roadConnectivity[closestRoadIdx];
                }

                // Base PermIdx from closest road connectivity
                let basePerm = 3000 + conn * 2500;

                // Distance decay: drop permeability if building block is deep inside/isolated (above 200m from roads)
                const distanceDecay = Math.max(0.2, 1 - (minBldDist / 0.2));

                // Al-Nuri historic core premium (decaying over 1km)
                const corePt = turf.point([43.128, 36.335]);
                let distToCore = 1.0;
                try { distToCore = turf.distance(bldPt, corePt, { units: 'kilometers' }); } catch (_) {}
                const corePremium = Math.max(0, 12000 * (1 - distToCore / 1.0));

                // Bridge/riverfront corridor premium (decaying over 600m)
                const bridgePt = turf.point([43.138, 36.338]);
                let distToBridge = 0.6;
                try { distToBridge = turf.distance(bldPt, bridgePt, { units: 'kilometers' }); } catch (_) {}
                const bridgePremium = Math.max(0, 8000 * (1 - distToBridge / 0.6));

                let permIdx = (basePerm + corePremium + bridgePremium) * distanceDecay;

                if (!f.properties) f.properties = {};
                f.properties.PermIdx = Math.max(1000, Math.min(26000, permIdx));
                f.properties.isSimulated = true;
            });

            // Second pass: normalize ALL PermIdx values in this layer to NormPermIdx (0-100)
            // This ensures both research data and simulated data use the same color scale
            const allPermVals = bl.data.features
                .map(f => f.properties && f.properties.PermIdx)
                .filter(v => typeof v === 'number' && !isNaN(v));
            
            if (allPermVals.length > 0) {
                const pMin = Math.min(...allPermVals);
                const pMax = Math.max(...allPermVals);
                const pSpan = pMax > pMin ? pMax - pMin : 1;
                
                bl.data.features.forEach(f => {
                    if (!f.properties) return;
                    const pv = f.properties.PermIdx;
                    if (typeof pv === 'number' && !isNaN(pv)) {
                        f.properties.NormPermIdx = parseFloat(((pv - pMin) / pSpan * 100).toFixed(2));
                    }
                });
            }

            // Push updated geometry back to MapLibre sources
            const sourceId = `source-${bl.layerInfo.layer}`;
            if (map.getSource(sourceId)) {
                map.getSource(sourceId).setData(bl.data);
            }
            if (mapCompare && mapCompare.getSource(sourceId)) {
                mapCompare.getSource(sourceId).setData(bl.data);
            }
        });
    });
}

// ════════════════════════════════════════════════════════════
// SPACE SYNTAX — colour expression builders
// ════════════════════════════════════════════════════════════
// Normal building colour expression (status-aware)
let currentAnalysisMode = 'normal'; // 'fractal', 'normal'

// Normal building colour expression (status-aware)
const BUILDING_COLOR_NORMAL = [
    'match', ['coalesce', ['get', 'Status'], ''],
    'Lost_or_Road_Cut', '#ef4444',
    'Survived',         '#fbbf24',
    '#d97706'
];

function getLayerMorphologyColorExpr(layerItem) {
    if (currentAnalysisMode === 'normal') return BUILDING_COLOR_NORMAL;
    if (!layerItem || !layerItem.data || !layerItem.data.features) return BUILDING_COLOR_NORMAL;

    if (currentAnalysisMode === 'syntax') {
        // Check if this layer has any NormPermIdx (research data or post-computed)
        const hasNorm = layerItem.data.features.some(
            f => f.properties && typeof f.properties.NormPermIdx === 'number'
        );
        if (!hasNorm) return BUILDING_COLOR_NORMAL;

        // Use NormPermIdx (always 0–100) — safe, no ascending order errors
        return [
            'case',
            ['has', 'NormPermIdx'],
            [
                'interpolate', ['linear'], ['get', 'NormPermIdx'],
                0,   '#1e3a5f',  // dark navy — lowest integration (isolated)
                15,  '#2563eb',  // royal blue
                30,  '#0ea5e9',  // sky blue — secondary alley
                50,  '#10b981',  // emerald green — local street
                70,  '#f59e0b',  // amber — commercial connector
                85,  '#ef4444',  // red — primary movement artery
                100, '#7f1d1d'   // deep crimson — peak integration hub
            ],
            '#d97706' // fallback: no data
        ];
    } else if (currentAnalysisMode === 'fractal') {
        const hasNorm = layerItem.data.features.some(
            f => f.properties && typeof f.properties.NormFractalIdx === 'number'
        );
        if (!hasNorm) return BUILDING_COLOR_NORMAL;

        return [
            'case',
            ['has', 'NormFractalIdx'],
            [
                'interpolate', ['linear'], ['get', 'NormFractalIdx'],
                0,   '#312e81',  // deep indigo — low fractal complexity
                25,  '#6366f1',  // violet
                50,  '#a855f7',  // purple / magenta
                75,  '#ec4899',  // pink
                100, '#f43f5e'   // rose red — peak structural fractal complexity
            ],
            '#8b5cf6' // fallback: no fractal data
        ];
    }

    return BUILDING_COLOR_NORMAL;
}

function getBuildingColorExpr() {
    return BUILDING_COLOR_NORMAL;
}

function updateBuildingHeatmapColors() {
    loadedLayersData.forEach(item => {
        const id = `layer-${item.layerInfo.layer}`;
        const nl = item.layerInfo.layer.toLowerCase();
        const isBld = (nl.includes('building') || nl.includes('block'))
                   && !nl.includes('heritage') && !nl.includes('photo')
                   && !nl.includes('point');
        if (!isBld) return;

        const expr = getLayerMorphologyColorExpr(item);

        const mainLayer    = map.getLayer(id);
        const compareLayer = mapCompare ? mapCompare.getLayer(id) : null;

        if (mainLayer && mainLayer.type === 'fill-extrusion') {
            map.setPaintProperty(id, 'fill-extrusion-color', expr);
        }
        if (compareLayer && compareLayer.type === 'fill-extrusion') {
            mapCompare.setPaintProperty(id, 'fill-extrusion-color', expr);
        }
    });
}

// ════════════════════════════════════════════════════════════
// PHOTO POPUP HELPERS
// ════════════════════════════════════════════════════════════
function getPhotoUrl(p) {
    if (!p) return '';
    let clean = p.replace(/\\/g, '/');
    const idx = clean.toLowerCase().indexOf('old photos');
    if (idx !== -1) {
        clean = clean.slice(idx);
    } else if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
        clean = 'Old Photos/' + clean;
    }
    return encodeURI(clean);
}

function showPhotoWindow(feature, coords) {
    if (isPhotoWindowPinned) return;
    activePhotoFeature = feature;
    activePhotoCoords  = coords;
    hasBeenDragged     = false;

    const props    = feature.properties;
    const imgUrl   = getPhotoUrl(props.Photos || props.photo || '');
    const filename = (props.Photos || props.photo || '').split('/').pop().replace(/\.[^/.]+$/, '') || 'Historic Photograph';

    document.getElementById('mac-img').src         = imgUrl;
    document.getElementById('mac-title').innerText  = filename;
    document.getElementById('mac-caption').innerText = props.Descriptio || props.description || props.desc || filename;

    macWindow.style.display = 'flex';
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
    macWindow.style.transformOrigin = `${rect.left + px.x - left}px ${rect.top + px.y - top}px`;
}

function hidePhotoWindow() {
    if (isPhotoWindowPinned) return;
    macWindow.classList.remove('show');
    activePhotoFeature = null;
    activePhotoCoords  = null;
    setTimeout(() => { if (!macWindow.classList.contains('show')) macWindow.style.display = 'none'; }, 400);
}

function pinPhotoWindow()   { isPhotoWindowPinned = true;  macWindow.classList.add('pinned'); }
function unpinPhotoWindow() {
    isPhotoWindowPinned = false;
    macWindow.classList.remove('pinned', 'show');
    macWindow.style.pointerEvents = 'none';
    activePhotoFeature = null;
    activePhotoCoords  = null;
    setTimeout(() => { if (!macWindow.classList.contains('show')) macWindow.style.display = 'none'; }, 400);
}

// Photo window drag
const titleBar = macWindow.querySelector('.mac-titlebar');
titleBar.addEventListener('mousedown', e => {
    if (!macWindow.classList.contains('pinned')) return;
    isDragging = true; hasBeenDragged = true;
    dragStartX = e.clientX; dragStartY = e.clientY;
    windowStartX = parseInt(macWindow.style.left) || 0;
    windowStartY = parseInt(macWindow.style.top)  || 0;
    e.preventDefault();
});
document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    macWindow.style.left = `${windowStartX + e.clientX - dragStartX}px`;
    macWindow.style.top  = `${windowStartY + e.clientY - dragStartY}px`;
});
document.addEventListener('mouseup', () => { isDragging = false; });
macWindow.querySelector('.close-btn')   .addEventListener('click', e => { e.stopPropagation(); unpinPhotoWindow(); });
macWindow.querySelector('.minimize-btn').addEventListener('click', e => { e.stopPropagation(); unpinPhotoWindow(); });
macWindow.querySelector('.zoom-btn')    .addEventListener('click', e => { e.stopPropagation(); unpinPhotoWindow(); });

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
        html += `
        <div class="era-card-group ${groupIdx === 0 ? 'active-era' : ''}" data-era-id="${group.id}" data-first-idx="${firstIdx}">
            <div class="era-pill" title="${group.fullName}" data-first-idx="${firstIdx}">${group.name}</div>
            <div class="era-stem"></div>
            <div class="era-track-wrapper">
                ${group.years.length > 1 ? '<div class="era-line"></div>' : ''}
                ${group.years.map(y => {
                    const idx = globalIdx++;
                    return `
                    <div class="node-cell" data-index="${idx}" title="${group.fullName} (${y})">
                        <div class="node ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>
                        <span class="year-num ${idx === 0 ? 'active-year' : ''}" data-index="${idx}">${y}</span>
                    </div>
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
            e.stopPropagation();
            const idx = parseInt(pill.dataset.firstIdx);
            slider.value = idx;
            updateYear(idx);
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

    // Manifest + layers + map sources
    const ts = new Date().getTime();
    await loadMapSources();
    manifest = await (await fetch(`data/manifest.json?t=${ts}`)).json();

    const rawLayers = [];
    await Promise.all(manifest.layers.map(async info => {
        const data = await (await fetch(`data/${info.file}?t=${ts}`)).json();

        // (Space Syntax PermIdx assignment and normalization handled by computeSpaceSyntax() below,
        //  after all road layers are also loaded — this avoids incorrect early simulation)

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

    updateYear(0);
    computeSpaceSyntax(); // Calculate road-network space syntax walkability on-the-fly
    updateBuildingHeatmapColors();
    setupMeasureWidget(); // Measurement tool
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
                    if (name) popup.setLngLat(f.geometry.coordinates.slice()).setHTML(name).addTo(map);
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
                        popup.setLngLat(coords).setHTML(`<b>${name}</b>`).addTo(map);
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
    } else {
        // Polygon
        if (isBuilding) {
            targetMap.addLayer({
                id: layerId, type: 'fill-extrusion', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-extrusion-color': getBuildingColorExpr(),
                    'fill-extrusion-height': [
                        'case',
                        ['has', 'height'],     ['get', 'height'],
                        ['has', 'Complexity'], ['interpolate', ['linear'], ['get', 'Complexity'], 0, 6, 2, 14],
                        8
                    ],
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
        } else if (isWall) {
            targetMap.addLayer({
                id: layerId, type: 'fill-extrusion', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-extrusion-color': colorExpr,
                    'fill-extrusion-height': 22,
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.9
                }
            });
        } else if (isHeritage) {
            targetMap.addLayer({
                id: layerId, type: 'fill-extrusion', source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-extrusion-color': colorExpr,
                    'fill-extrusion-height': [
                        'case',
                        ['has', 'PermIdx'],    ['+', ['interpolate', ['linear'], ['get', 'PermIdx'], 0, 5, 20000, 18], 3],
                        ['has', 'Complexity'], ['+', ['interpolate', ['linear'], ['get', 'Complexity'], 0, 5, 2, 20], 3],
                        15
                    ],
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.85
                }
            });
            if (targetMap === map) {
                map.on('mouseenter', layerId, e => {
                    map.getCanvas().style.cursor = 'pointer';
                    const f = e.features[0]; if (!f) return;
                    const name = f.properties['Building N'] || f.properties['Building_N'] || f.properties.Name || f.properties.name || '';
                    if (name) popup.setLngLat(e.lngLat).setHTML(name).addTo(map);
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
        }
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
    const year = years[index];
    yearDisplay.innerText = formatYearLabel(year);

    const activeGroup = getEraGroupForYear(year);
    const badgeEl = document.getElementById('current-era-badge');
    if (badgeEl) {
        badgeEl.innerText = activeGroup.name;
        badgeEl.title = activeGroup.fullName;
    }

    document.querySelectorAll('.era-card-group').forEach(el => {
        el.classList.toggle('active-era', el.dataset.eraId === activeGroup.id);
    });

    document.querySelectorAll('.node').forEach((n) => {
        const i = parseInt(n.dataset.index);
        n.classList.toggle('active', i === index);
    });

    document.querySelectorAll('.year-num').forEach((s) => {
        const i = parseInt(s.dataset.index);
        s.classList.toggle('active-year', i === index);
    });

    const winEl = document.getElementById('map-source-window');
    if (winEl && winEl.classList.contains('show')) {
        populateMapSourceData(year);
    }

    if (isCompareModeActive) {
        const currentIdx = index;
        selectedCompareYear = currentIdx > 0 ? years[currentIdx - 1] : years[currentIdx + 1];
        populateCompareUI(year);
        updateCompareLayout();
    }

    // Hide all
    manifest.layers.forEach(l => setLayerVisibility(`layer-${l.layer}`, 'none'));

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
        hdr.innerText = catName;
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
            layers.forEach(l => setLayerVisibility(`layer-${l.layer}`, isEraChange ? 'none' : 'visible'));

            const item = document.createElement('div');
            item.className = 'layer-item';
            item.innerHTML = `<input type="checkbox" ${isEraChange ? '' : 'checked'}> <span>${name}</span>`;
            item.querySelector('input').addEventListener('change', e => {
                layers.forEach(l => setLayerVisibility(`layer-${l.layer}`, e.target.checked ? 'visible' : 'none'));
            });
            layerToggles.appendChild(item);
        });
    }

    // Update stat cards
    if (stats[year] && parseFloat(stats[year].buildings) > 0) {
        document.getElementById('stat-buildings').innerText = `${stats[year].buildings.toFixed(2)} km²`;
        document.getElementById('stat-roads').innerText     = `${stats[year].roads.toFixed(2)} km`;
        const validYears = Object.keys(stats).filter(y => parseFloat(stats[y].buildings) > 0).sort((a, b) => a - b);
        if (validYears.length) {
            const base   = parseFloat(stats[validYears[0]].buildings);
            const growth = (parseFloat(stats[year].buildings) / base).toFixed(1);
            document.getElementById('stat-growth').innerText = `${growth} x`;
        }
    } else {
        document.getElementById('stat-buildings').innerText = '-- km²';
        document.getElementById('stat-roads').innerText     = '-- km';
        document.getElementById('stat-growth').innerText    = '-- x';
    }

    if (isSpaceSyntaxActive) {
        updateBuildingHeatmapColors();
    }
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
        const ts = new Date().getTime();
        mapSources = await (await fetch(`data/map_sources.json?t=${ts}`)).json();
    } catch (e) {
        console.warn('Could not load map_sources.json', e);
    }
}

function populateMapSourceData(year) {
    const yearKey = String(year);
    const src = mapSources[yearKey] || {
        year: formatYearLabel(year),
        era: `Era ${formatYearLabel(year)}`,
        title: `Map of Mosul (${formatYearLabel(year)})`,
        author: "Unknown / Unspecified Cartographer",
        source: "Archival Record",
        date: `${formatYearLabel(year)}`,
        description: "No detailed source notes provided for this map year yet. You can add them in MAP_SOURCES.md or map_sources.json."
    };

    const badgeEl  = document.getElementById('source-year-badge');
    const titleEl  = document.getElementById('source-title');
    const authorEl = document.getElementById('source-author');
    const repoEl   = document.getElementById('source-repo');
    const dateEl   = document.getElementById('source-date');
    const descEl   = document.getElementById('source-desc');

    if (badgeEl)  badgeEl.innerText  = `Era: ${src.year} ${src.era ? `(${src.era})` : ''}`;
    if (titleEl)  titleEl.innerText  = src.title || `Map of Mosul (${formatYearLabel(year)})`;
    if (authorEl) authorEl.innerText = src.author || 'Unspecified';
    if (repoEl)   repoEl.innerText   = src.source || 'Unspecified';
    if (dateEl)   dateEl.innerText   = src.date || `${formatYearLabel(year)}`;
    if (descEl)   descEl.innerText   = src.description || '';
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
    currentAnalysisMode = mode;
    [modeSyntaxBtn, modeFractalBtn, modeNormalBtn].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });

    const legendTitle   = document.getElementById('syntax-legend-title');
    const legendBox     = document.getElementById('syntax-legend-container');
    const insightText   = document.getElementById('syntax-insight-text');

    if (mode === 'syntax') {
        if (modeSyntaxBtn) modeSyntaxBtn.classList.add('active');
        isSpaceSyntaxActive = true;
        if (legendTitle) legendTitle.innerText = 'Space Syntax Integration (Rₙ)';
        if (legendBox) legendBox.style.display = 'block';
        if (insightText) insightText.innerText = 'Space Syntax integration metrics (Rₙ) model pedestrian movement potential and commercial centrality across historical Mosul urban fabrics.';
    } else if (mode === 'fractal') {
        if (modeFractalBtn) modeFractalBtn.classList.add('active');
        isSpaceSyntaxActive = true;
        if (legendTitle) legendTitle.innerText = 'Fractal Dimension Complexity (D_f)';
        if (legendBox) legendBox.style.display = 'block';
        if (insightText) insightText.innerText = 'Fractal dimension metrics (D_f) analyze the self-similarity and structural complexity of Mosul\'s dense historical building blocks.';
    } else {
        if (modeNormalBtn) modeNormalBtn.classList.add('active');
        isSpaceSyntaxActive = false;
        if (legendBox) legendBox.style.display = 'none';
        if (insightText) insightText.innerText = 'Standard 3D extrusion mode showing realistic architectural building heights and historical fabric status.';
    }

    updateBuildingHeatmapColors();
}

if (modeSyntaxBtn)  modeSyntaxBtn.addEventListener('click', () => setMorphologyMode('syntax'));
if (modeFractalBtn) modeFractalBtn.addEventListener('click', () => setMorphologyMode('fractal'));
if (modeNormalBtn)  modeNormalBtn.addEventListener('click', () => setMorphologyMode('normal'));

// ════════════════════════════════════════════════════════════
// SIDEBAR TABS
// ════════════════════════════════════════════════════════════
document.querySelectorAll('.mac-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mac-tab').forEach(b => b.classList.remove('active'));
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
            prevBtn.innerText = `◄ Previous (${prevYear})`;
            prevBtn.dataset.year = prevYear;
        } else {
            prevBtn.style.display = 'none';
        }
    }

    if (nextBtn) {
        if (nextYear) {
            nextBtn.style.display = 'flex';
            nextBtn.innerText = `Future (${nextYear}) ►`;
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
            let label = `${y}`;
            if (Number(y) === Number(prevYear)) label += ' (Previous Era)';
            else if (Number(y) === Number(nextYear)) label += ' (Future Era)';
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
    if (Number(selectedCompareYear) === Number(prevYear)) relText = ' (Previous Era)';
    else if (Number(selectedCompareYear) === Number(nextYear)) relText = ' (Future Era)';

    document.getElementById('map-a-label').innerText = `Left Map: ${currentYear}`;
    document.getElementById('map-b-label').innerText = `Right Map: ${selectedCompareYear}${relText}`;
}

compareBtn.addEventListener('click', () => {
    isCompareModeActive = !isCompareModeActive;
    compareBtn.classList.toggle('active', isCompareModeActive);
    compareBtn.innerText = isCompareModeActive ? '⇄ Compare Mode: ON' : '⇄ Compare Mode: OFF';
    document.body.classList.toggle('compare-mode', isCompareModeActive);

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

        loadedLayersData.forEach(({ layerInfo, data }) => addLayerToMap(mapCompare, layerInfo, data));

        map.resize(); mapCompare.resize();
        updateCompareLayout();
    });
}

// ════════════════════════════════════════════════════════════
// SPACE SYNTAX
// ════════════════════════════════════════════════════════════
const syntaxToggle   = document.getElementById('syntax-toggle');
const syntaxLegend   = document.getElementById('syntax-legend-container');
const syntaxInsight  = document.getElementById('syntax-insight-text');

const SYNTAX_INSIGHTS = [
    'Integrated corridors connect historical city gates to commercial centres.',
    'High PermIdx zones align with souqs and main pedestrian arteries.',
    'Low permeability pockets mark enclosed residential quarters (mahallas).',
    'The riverside zone maintains consistently high integration across all eras.',
    'Post-conflict fabric (2020) shows fragmented integration reflecting wartime damage.'
];

if (syntaxToggle) {
    syntaxToggle.addEventListener('click', () => {
        isSpaceSyntaxActive = !isSpaceSyntaxActive;
        syntaxToggle.classList.toggle('active', isSpaceSyntaxActive);
        syntaxToggle.innerText = isSpaceSyntaxActive ? '🗺 Walkability Heatmap: ON' : '🗺 Walkability Heatmap: OFF';
        if (syntaxLegend) syntaxLegend.style.display = isSpaceSyntaxActive ? 'block' : 'none';

        if (syntaxInsight) {
            if (isSpaceSyntaxActive) {
                syntaxInsight.innerText = SYNTAX_INSIGHTS[Math.floor(Math.random() * SYNTAX_INSIGHTS.length)];
            } else {
                syntaxInsight.innerText = 'Activate the heatmap to reveal spatial patterns. Integrated corridors link historical gates to commercial centres, reflecting the organically-evolved Mosul city core.';
            }
        }

        updateBuildingHeatmapColors();
    });
}

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
        instrEl.innerText   = 'Choose a tool, then click on the map. Double-click to finish.';
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
            instrEl.innerText = 'Click to add points. Double-click to finish distance.';
        } else {
            areaBtn.classList.add('active');
            distBtn.classList.remove('active');
            instrEl.innerText = 'Click to add vertices. Double-click to close the polygon.';
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

    // Map click — add point
    map.on('click', e => {
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
        instrEl.innerText = 'Measurement complete. Press "Clear" to reset.';
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
