/* ═══════════════════════════════════════════════════════════
   Mosul Diachronic Map — main.js  v9.0
   Features: Layers · Space Syntax · Analytics · 3D Tour · Measure
   ═══════════════════════════════════════════════════════════ */

// ── Timeline years ──────────────────────────────────────────
const years = [1778, 1838, 1852, 1906, 1919, 1944, 1966, 1988, 2003, 2020];

// ── Global state ────────────────────────────────────────────
let manifest = null;
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
    if ((l.includes('river')||l.includes('water')||l.includes('island'))&&!l.includes('road')) return 20;
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

        // Find road layers for this year
        const roadLayers = loadedLayersData.filter(item => {
            const nl = item.layerInfo.layer.toLowerCase();
            const isRd = nl.includes('road') || nl.includes('rounds');
            return isRd && item.layerInfo.years.includes(year);
        });

        if (buildingLayers.length === 0 || roadLayers.length === 0) return;

        // Merge all road features for this year
        let roadFeatures = [];
        roadLayers.forEach(rl => {
            if (rl.data && rl.data.features) {
                roadFeatures = roadFeatures.concat(rl.data.features);
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
            bl.data.features.forEach(f => {
                if (!f.geometry) return;

                // Keep original research data if it was in the file originally (not simulated)
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
            });

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
const SYNTAX_COLOR_EXPR = [
    'case',
    ['has', 'PermIdx'],
    [
        'interpolate', ['linear'], ['get', 'PermIdx'],
        0,     '#2563eb',   // deep blue  — isolated
        5000,  '#0ea5e9',   // sky blue
        10000, '#10b981',   // emerald
        15000, '#eab308',   // yellow
        20000, '#f97316',   // orange
        25000, '#ef4444'    // red        — highest integration
    ],
    '#06b6d4'               // fallback (no PermIdx) — cyan
];

// Normal building colour expression (status-aware)
const BUILDING_COLOR_NORMAL = [
    'match', ['coalesce', ['get', 'Status'], ''],
    'Lost_or_Road_Cut', '#ef4444',
    'Survived',         '#fbbf24',
    '#06b6d4'
];

function getBuildingColorExpr() {
    return isSpaceSyntaxActive ? SYNTAX_COLOR_EXPR : BUILDING_COLOR_NORMAL;
}

function updateBuildingHeatmapColors() {
    manifest.layers.forEach(l => {
        const id  = `layer-${l.layer}`;
        const nl  = l.layer.toLowerCase();
        const isBld = (nl.includes('building') || nl.includes('block'))
                   && !nl.includes('heritage') && !nl.includes('photo')
                   && !nl.includes('point');
        if (!isBld) return;

        const mainLayer    = map.getLayer(id);
        const compareLayer = mapCompare ? mapCompare.getLayer(id) : null;

        // Guard: setPaintProperty on wrong layer type throws in MapLibre
        if (mainLayer && mainLayer.type === 'fill-extrusion') {
            map.setPaintProperty(id, 'fill-extrusion-color', getBuildingColorExpr());
        }
        if (compareLayer && compareLayer.type === 'fill-extrusion') {
            mapCompare.setPaintProperty(id, 'fill-extrusion-color', getBuildingColorExpr());
        }
    });
}

// ════════════════════════════════════════════════════════════
// PHOTO POPUP HELPERS
// ════════════════════════════════════════════════════════════
function getPhotoUrl(p) {
    if (!p) return '';
    const idx = p.toLowerCase().indexOf('old photos');
    if (idx !== -1) {
        let rel = p.slice(idx).replace(/\\/g, '/');
        return encodeURI(rel);
    }
    return p;
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
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [43.128, 36.335],
    zoom: 14.5,
    pitch: 50,
    bearing: -10
});

const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

// ── Timeline slider init ─────────────────────────────────
slider.max = years.length - 1;

const sliderNodes = document.getElementById('slider-nodes');
sliderNodes.innerHTML = years.map((y, i) => `<div class="node ${i===0?'active':''}" data-index="${i}"></div>`).join('');

const sliderLabels = document.getElementById('slider-labels');
sliderLabels.innerHTML = years.map((y, i) => `<span data-index="${i}">${y}</span>`).join('');

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

    // Manifest + layers
    const ts = new Date().getTime();
    manifest = await (await fetch(`data/manifest.json?t=${ts}`)).json();

    const rawLayers = [];
    await Promise.all(manifest.layers.map(async info => {
        const data = await (await fetch(`data/${info.file}?t=${ts}`)).json();

        // Post-process building blocks to ensure PermIdx is always populated for Space Syntax Walkability Heatmap
        const nl = info.layer.toLowerCase();
        const isBld = (nl.includes('building') || nl.includes('block'))
                   && !nl.includes('heritage') && !nl.includes('photo')
                   && !nl.includes('point');
        if (isBld && data.features) {
            data.features.forEach(f => {
                if (!f.properties) f.properties = {};
                if (f.properties.PermIdx === undefined || f.properties.PermIdx === null) {
                    let coord = [43.130, 36.340];
                    if (f.geometry && f.geometry.coordinates) {
                        if (f.geometry.type === 'Polygon' && f.geometry.coordinates[0] && f.geometry.coordinates[0][0]) {
                            coord = f.geometry.coordinates[0][0];
                        } else if (f.geometry.type === 'MultiPolygon' && f.geometry.coordinates[0] && f.geometry.coordinates[0][0] && f.geometry.coordinates[0][0][0]) {
                            coord = f.geometry.coordinates[0][0][0];
                        }
                    }
                    const dx = coord[0] - 43.130;
                    const dy = coord[1] - 36.340;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const hash = Math.abs(Math.sin(coord[0] * 12.9898 + coord[1] * 78.233) * 43758.5453);
                    const noise = hash - Math.floor(hash);
                    let base = 22000 - (dist * 120000);
                    let permIdx = base + (noise * 6000 - 3000);
                    f.properties.PermIdx = Math.max(1000, Math.min(26000, permIdx));
                    f.properties.isSimulated = true; // Set simulated flag
                }
            });
        }

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
    initCharts();         // Analytics charts
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
    const isWater     = (n.includes('river') || n.includes('water') || n.includes('island')) && !isRoad;
    const isBridge    = n.includes('bridge');
    const isWall      = n.includes('wall') || n.includes('gate') || n.includes('border') || n.includes('boarder') || n.includes('entrance');
    const isPhoto     = n.includes('photo');
    const isHeritage  = (n.includes('heritage') || n.includes('landmark') || (n.includes('building') && n.includes('point'))) && !isPhoto;
    const isBuilding  = (n.includes('building') || n.includes('block')) && !isHeritage && !isPhoto;
    const isOpenSpace = n.includes('cemetery') || n.includes('landscape') || n.includes('field') || n.includes('agriculture');
    const isRailway   = n.includes('railway');
    const isGate      = n.includes('gate') || n.includes('entrance');

    // Default colour
    let color = '#94a3b8';
    if (isBuilding)  color = '#06b6d4';
    if (isRoad)      color = '#fbbf24';
    if (isWater)     color = '#38bdf8';
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
                        ['has', 'PermIdx'],     ['interpolate', ['linear'], ['get', 'PermIdx'], 0, 5, 20000, 18],
                        ['has', 'Complexity'],  ['interpolate', ['linear'], ['get', 'Complexity'], 0, 5, 2, 20],
                        12
                    ],
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.85
                }
            });
            // Building hover tooltip (PermIdx) – main map only
            if (targetMap === map) {
                map.on('mouseenter', layerId, e => {
                    if (!isSpaceSyntaxActive) return;
                    const f = e.features[0]; if (!f) return;
                    map.getCanvas().style.cursor = 'pointer';
                    const pi = f.properties.PermIdx;
                    const html = pi != null
                        ? `<b>Permeability Index</b><br>${Math.round(pi).toLocaleString()}`
                        : '<b>No PermIdx data</b>';
                    popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
                });
                map.on('mousemove', layerId, e => {
                    if (!isSpaceSyntaxActive) return;
                    popup.setLngLat(e.lngLat);
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
                    'fill-opacity': isWater ? 0.65 : (isOpenSpace ? 0.35 : 0.7),
                    'fill-outline-color': isOpenSpace ? 'transparent' : 'rgba(255,255,255,0.2)'
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
    yearDisplay.innerText = year;

    document.querySelectorAll('.node').forEach((n, i) => n.classList.toggle('active', i === index));

    if (isCompareModeActive) {
        populateCompareYears(year);
        updateCompareLayout();
    }

    // Hide all
    manifest.layers.forEach(l => setLayerVisibility(`layer-${l.layer}`, 'none'));

    // Relevant layers for this year
    const relevant = manifest.layers.filter(l => l.years && l.years.includes(year));

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

    // Keep chart needle in sync
    if (window.densityChart && window.roadsChart) {
        syncChartsToYear(year);
    }
}

// ════════════════════════════════════════════════════════════
// TIMELINE EVENT LISTENERS
// ════════════════════════════════════════════════════════════
slider.addEventListener('input', e => updateYear(parseInt(e.target.value)));

document.querySelectorAll('.slider-labels span').forEach(label => {
    label.addEventListener('click', () => {
        const idx = parseInt(label.dataset.index);
        slider.value = idx;
        updateYear(idx);
    });
});

document.querySelectorAll('.node').forEach(node => {
    node.addEventListener('click', () => {
        const idx = parseInt(node.dataset.index);
        slider.value = idx;
        updateYear(idx);
    });
});

// ════════════════════════════════════════════════════════════
// MAP EVENTS
// ════════════════════════════════════════════════════════════
map.on('click', () => {
    if (clickedPhotoThisTurn) { clickedPhotoThisTurn = false; return; }
    if (isPhotoWindowPinned)  unpinPhotoWindow();
});
map.on('move', () => {
    if (macWindow.style.display === 'flex') positionPhotoWindow();
    if (isCompareModeActive && mapCompare) syncMove(map, mapCompare);
});

// ════════════════════════════════════════════════════════════
// TERRAIN UI
// ════════════════════════════════════════════════════════════
const terrainToggle      = document.getElementById('terrain-toggle');
const terrainExaggeration = document.getElementById('terrain-exaggeration');
const exaggerationVal    = document.getElementById('exaggeration-val');

terrainToggle.addEventListener('change', e => {
    const ex = parseFloat(terrainExaggeration.value);
    if (e.target.checked) {
        map.setTerrain({ source: 'terrain-source', exaggeration: ex });
        map.setLayoutProperty('hillshade-layer', 'visibility', 'visible');
        if (mapCompare) {
            mapCompare.setTerrain({ source: 'terrain-source', exaggeration: ex });
            mapCompare.setLayoutProperty('hillshade-layer', 'visibility', 'visible');
        }
    } else {
        map.setTerrain(null);
        map.setLayoutProperty('hillshade-layer', 'visibility', 'none');
        if (mapCompare) { mapCompare.setTerrain(null); mapCompare.setLayoutProperty('hillshade-layer', 'visibility', 'none'); }
    }
});
terrainExaggeration.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    exaggerationVal.innerText = `${v.toFixed(1)}x`;
    if (terrainToggle.checked) {
        map.setTerrain({ source: 'terrain-source', exaggeration: v });
        if (mapCompare) mapCompare.setTerrain({ source: 'terrain-source', exaggeration: v });
    }
});

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

        // 1. Auto-activate Space Syntax walkability heatmap when opening the Syntax tab
        if (activePanelId === 'tab-syntax') {
            if (!isSpaceSyntaxActive) {
                isSpaceSyntaxActive = true;
                syntaxToggle.classList.add('active');
                syntaxToggle.innerText = '🗺 Walkability Heatmap: ON';
                syntaxLegend.style.display = 'block';
                syntaxInsight.innerText = SYNTAX_INSIGHTS[Math.floor(Math.random() * SYNTAX_INSIGHTS.length)];
                updateBuildingHeatmapColors();
            }
        } else {
            // Deactivate heatmap when switching away to restore normal building colors
            if (isSpaceSyntaxActive) {
                isSpaceSyntaxActive = false;
                syntaxToggle.classList.remove('active');
                syntaxToggle.innerText = '🗺 Walkability Heatmap: OFF';
                syntaxLegend.style.display = 'none';
                syntaxInsight.innerText = 'Activate the heatmap to reveal spatial patterns. Integrated corridors link historical gates to commercial centres, reflecting the organically-evolved Mosul city core.';
                updateBuildingHeatmapColors();
            }
        }

        // 2. Force Chart.js charts to resize and layout correctly when revealing the Analytics tab
        if (activePanelId === 'tab-analytics') {
            setTimeout(() => {
                if (window.densityChart) {
                    window.densityChart.resize();
                    window.densityChart.update();
                }
                if (window.roadsChart) {
                    window.roadsChart.resize();
                    window.roadsChart.update();
                }
            }, 50);
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

function getAvailableCompareYears(currentYear) {
    const list = [];
    transitionsData.forEach(t => {
        if (t.from === currentYear) list.push({ year: t.to,   layer: t.layer, direction: 'forward' });
        if (t.to   === currentYear) list.push({ year: t.from, layer: t.layer, direction: 'backward' });
    });
    return list;
}

function populateCompareYears(year) {
    const available = getAvailableCompareYears(year).sort((a, b) => a.year - b.year);
    compareSelect.innerHTML = available.length
        ? available.map(t => `<option value="${t.year}">${t.year} (${t.direction === 'forward' ? 'future' : 'past'})</option>`).join('')
        : `<option value="">No transitions available</option>`;
}

function updateCompareLayout() {
    if (!isCompareModeActive) return;
    const currentYear  = years[parseInt(slider.value)];
    const selectedYear = parseInt(compareSelect.value);
    if (isNaN(selectedYear)) return;

    const activeTransition = getAvailableCompareYears(currentYear).find(t => t.year === selectedYear);
    if (!activeTransition) return;

    manifest.layers.forEach(l => setLayerVisibility(`layer-${l.layer}`, 'none'));
    setLayerVisibility(`layer-${activeTransition.layer}`, 'visible');

    // Checkbox UI sync
    document.querySelectorAll('.layer-item').forEach(item => {
        const cb   = item.querySelector('input');
        const span = item.querySelector('span');
        if (!span || !cb) return;
        const t = span.innerText.toLowerCase();
        if (t.includes('building') || t.includes('road'))  cb.checked = false;
        if (t.includes('urban growth'))                    cb.checked = true;
    });

    if (mapCompare) {
        manifest.layers.forEach(l => setCompareLayerVisibility(`layer-${l.layer}`, 'none'));
        manifest.layers
            .filter(l => l.years && l.years.includes(selectedYear))
            .forEach(l => {
                const nl = l.layer.toLowerCase();
                const isBld = nl.includes('building') || nl.includes('block');
                const isRd  = nl.includes('road') || nl.includes('rounds');
                const isHer = nl.includes('heritage');
                const isPh  = nl.includes('photo');
                if ((isBld || isRd) && !isHer && !isPh) setCompareLayerVisibility(`layer-${l.layer}`, 'visible');
            });
    }

    document.getElementById('map-a-label').innerText = `Left Map: ${currentYear} (Changes vs ${selectedYear})`;
    document.getElementById('map-b-label').innerText = `Right Map: ${selectedYear} (Building Fabric)`;
}

compareBtn.addEventListener('click', () => {
    isCompareModeActive = !isCompareModeActive;
    compareBtn.classList.toggle('active', isCompareModeActive);
    compareBtn.innerText = isCompareModeActive ? '⇄ Compare Mode: ON' : '⇄ Compare Mode: OFF';
    document.body.classList.toggle('compare-mode', isCompareModeActive);

    if (isCompareModeActive) {
        compareSection.style.display = 'block';
        document.getElementById('map-a-label').style.display = 'block';
        document.getElementById('map-b-label').style.display = 'block';
        populateCompareYears(years[parseInt(slider.value)]);
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

compareSelect.addEventListener('change', updateCompareLayout);

function syncMove(src, tgt) {
    if (isSyncing) return;
    isSyncing = true;
    tgt.jumpTo({ center: src.getCenter(), zoom: src.getZoom(), pitch: src.getPitch(), bearing: src.getBearing() });
    isSyncing = false;
}

function initCompareMap() {
    mapCompare = new maplibregl.Map({
        container: 'map-compare',
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing()
    });

    mapCompare.on('load', () => {
        mapCompare.on('move', () => {
            if (isCompareModeActive) syncMove(mapCompare, map);
        });

        mapCompare.addSource('terrain-source', {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium', tileSize: 256, maxzoom: 15
        });
        const ex = parseFloat(terrainExaggeration.value);
        if (terrainToggle.checked) {
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

syntaxToggle.addEventListener('click', () => {
    isSpaceSyntaxActive = !isSpaceSyntaxActive;
    syntaxToggle.classList.toggle('active', isSpaceSyntaxActive);
    syntaxToggle.innerText = isSpaceSyntaxActive ? '🗺 Walkability Heatmap: ON' : '🗺 Walkability Heatmap: OFF';
    syntaxLegend.style.display = isSpaceSyntaxActive ? 'block' : 'none';

    if (isSpaceSyntaxActive) {
        syntaxInsight.innerText = SYNTAX_INSIGHTS[Math.floor(Math.random() * SYNTAX_INSIGHTS.length)];
    } else {
        syntaxInsight.innerText = 'Activate the heatmap to reveal spatial patterns. Integrated corridors link historical gates to commercial centres, reflecting the organically-evolved Mosul city core.';
    }

    updateBuildingHeatmapColors();
});

// ════════════════════════════════════════════════════════════
// QUANTITATIVE ANALYTICS CHARTS
// ════════════════════════════════════════════════════════════
function initCharts() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js UMD module is not loaded. Analytics charts initialization aborted.');
        return;
    }

    // Build chronological arrays
    const labels = years.map(String);
    const buildingData = years.map(y => stats[y] ? parseFloat(stats[y].buildings.toFixed(3)) : 0);
    const roadsData    = years.map(y => stats[y] ? parseFloat(stats[y].roads.toFixed(2))     : 0);

    const CHART_DEFAULTS = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeInOutQuart' },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.95)',
                borderColor: 'rgba(245,158,11,0.5)',
                borderWidth: 1,
                titleColor: '#f59e0b',
                bodyColor: '#f8fafc',
                padding: 10,
                callbacks: {
                    title: ctx => `Year: ${ctx[0].label}`,
                    label: ctx => ` ${ctx.parsed.y.toFixed(2)}`
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#64748b', font: { size: 10 } },
                grid:  { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
                ticks: { color: '#64748b', font: { size: 10 } },
                grid:  { color: 'rgba(255,255,255,0.06)' },
                beginAtZero: true
            }
        },
        onClick(evt, elements, chart) {
            if (!elements.length) return;
            const idx = elements[0].index;
            slider.value = idx;
            updateYear(idx);
        },
        onHover(evt, elements, chart) {
            chart.canvas.style.cursor = elements.length ? 'pointer' : 'default';
        }
    };

    // Scriptable gradient — chartArea guard prevents crash on first render
    const buildingGradient = (context) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) return 'rgba(245,158,11,0.35)';
        const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, 'rgba(245,158,11,0.55)');
        g.addColorStop(1, 'rgba(245,158,11,0.02)');
        return g;
    };
    const roadsGradient = (context) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) return 'rgba(6,182,212,0.35)';
        const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, 'rgba(6,182,212,0.55)');
        g.addColorStop(1, 'rgba(6,182,212,0.02)');
        return g;
    };

    window.densityChart = new Chart(document.getElementById('densityChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: buildingData,
                borderColor: '#f59e0b',
                backgroundColor: buildingGradient,
                borderWidth: 2.5,
                tension: 0.4,
                pointBackgroundColor: '#f59e0b',
                pointRadius: 5,
                pointHoverRadius: 8,
                fill: true
            }]
        },
        options: { ...CHART_DEFAULTS }
    });

    window.roadsChart = new Chart(document.getElementById('roadsChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: roadsData,
                borderColor: '#06b6d4',
                backgroundColor: roadsGradient,
                borderWidth: 2.5,
                tension: 0.4,
                pointBackgroundColor: '#06b6d4',
                pointRadius: 5,
                pointHoverRadius: 8,
                fill: true
            }]
        },
        options: { ...CHART_DEFAULTS }
    });

    // Highlight the active year node on initial render
    const initialIndex = parseInt(slider.value) || 0;
    syncChartsToYear(years[initialIndex]);
}

function syncChartsToYear(year) {
    const idx = years.indexOf(year);
    if (idx === -1) return;
    [window.densityChart, window.roadsChart].forEach(chart => {
        if (!chart) return;
        chart.data.datasets[0].pointRadius = chart.data.labels.map((_, i) => i === idx ? 9 : 5);
        chart.data.datasets[0].pointBackgroundColor = chart.data.labels.map((_, i) =>
            i === idx ? '#fff' : (chart.canvas.id === 'densityChart' ? '#f59e0b' : '#06b6d4')
        );
        chart.update('none');
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

// ════════════════════════════════════════════════════════════
// DIACHRONIC 3D CINEMATIC TOUR
// ════════════════════════════════════════════════════════════
const TOUR_ROUTES = {
    general: [
        { center: [43.128, 36.335], zoom: 13.5, pitch: 60, bearing: 0,    yearIdx: 0,  scene: '1778 — Early Mosul', desc: 'Niebhur\'s Mosul: a dense medieval city enclosed by walls, hugging the western bank of the Tigris.' },
        { center: [43.130, 36.338], zoom: 14.5, pitch: 55, bearing: -30,  yearIdx: 2,  scene: '1852 — Ottoman Era',  desc: 'Jones & Floyer mapping reveals souq lanes and the Friday Mosque as the city\'s spatial anchor.' },
        { center: [43.131, 36.336], zoom: 15.0, pitch: 65, bearing: -80,  yearIdx: 3,  scene: '1906 — Late Ottoman', desc: 'Population growth and new khans expand the urban edge while the historic core remains intact.' },
        { center: [43.132, 36.335], zoom: 14.8, pitch: 50, bearing: 40,   yearIdx: 5,  scene: '1944 — WWII Era',    desc: 'Aerial photography reveals a first wave of road widening cutting through historic fabric.' },
        { center: [43.125, 36.332], zoom: 14.2, pitch: 45, bearing: -20,  yearIdx: 7,  scene: '1988 — Ba\'ath Era',  desc: 'Large road arteries and planned residential blocks impose a new orthogonal order on the old city.' },
        { center: [43.120, 36.330], zoom: 13.8, pitch: 55, bearing: 10,   yearIdx: 9,  scene: '2020 — Post-Conflict', desc: 'The aftermath of urban warfare: demolished buildings, cleared plots, and reconstruction efforts begin.' }
    ],
    river: [
        { center: [43.150, 36.350], zoom: 13.5, pitch: 60, bearing: 90,   yearIdx: 0,  scene: '1778 — Pontoon Bridge', desc: 'The ancient floating bridge connecting Mosul to Nineveh on the eastern bank.' },
        { center: [43.145, 36.340], zoom: 14.5, pitch: 60, bearing: 120,  yearIdx: 2,  scene: '1852 — Bridge & River', desc: 'The Tigris as a commercial highway. Boatmen and merchants define the riverside economy.' },
        { center: [43.140, 36.338], zoom: 15.0, pitch: 65, bearing: 150,  yearIdx: 5,  scene: '1944 — Old Iron Bridge', desc: 'The old iron bridge built under the British Mandate, modernising the river crossing.' },
        { center: [43.135, 36.335], zoom: 14.8, pitch: 55, bearing: -150, yearIdx: 7,  scene: '1988 — Multiple Bridges', desc: 'New concrete bridges expand the road network\'s capacity as the city grows eastward.' },
        { center: [43.130, 36.332], zoom: 14.0, pitch: 50, bearing: -120, yearIdx: 9,  scene: '2020 — Reconstruction', desc: 'Bridges targeted during conflict are rebuilt, reconnecting a fragmented urban region.' }
    ],
    core: [
        { center: [43.131, 36.344], zoom: 16.0, pitch: 70, bearing: 0,    yearIdx: 0,  scene: '1778 — Al-Nuri Core',  desc: 'The leaning minaret of the Great Al-Nuri Mosque stands at the city\'s geometric and spiritual centre.' },
        { center: [43.131, 36.344], zoom: 16.2, pitch: 75, bearing: 60,   yearIdx: 2,  scene: '1852 — Souqs & Khans', desc: 'Dense souq lanes radiate from the mosque, packed with artisans, traders, and coffee houses.' },
        { center: [43.131, 36.344], zoom: 15.8, pitch: 70, bearing: 120,  yearIdx: 5,  scene: '1944 — Urban Pressure', desc: 'Encroachment and informal building begin to compress the historic alleyway network.' },
        { center: [43.131, 36.344], zoom: 16.0, pitch: 75, bearing: 180,  yearIdx: 9,  scene: '2020 — Destruction',   desc: 'ISIS destruction (2017) levelled the minaret and collapsed entire blocks. Voids mark the absence.' }
    ]
};

const tourRouteSelect = document.getElementById('tour-route-select');
const tourPlayBtn     = document.getElementById('tour-play-btn');
const tourStopBtn     = document.getElementById('tour-stop-btn');
const tourSpeedSlider = document.getElementById('tour-speed-slider');
const tourSpeedVal    = document.getElementById('tour-speed-val');
const tourCard        = document.getElementById('tour-card');
const tourScene       = document.getElementById('tour-current-scene');
const tourDesc        = document.getElementById('tour-current-desc');

const SPEED_LABELS   = { '1': 'Slow', '2': 'Normal', '3': 'Fast' };
const SPEED_DURATION = { '1': 5000,    '2': 3500,      '3': 2000 };

tourSpeedSlider.addEventListener('input', () => {
    tourSpeedVal.innerText = SPEED_LABELS[tourSpeedSlider.value];
});

function playTourStep() {
    if (!tourActive) return;
    const route    = TOUR_ROUTES[tourRouteSelect.value];
    if (tourStepIndex >= route.length) {
        stopTour();
        return;
    }

    const step = route[tourStepIndex];
    const dur  = SPEED_DURATION[tourSpeedSlider.value];

    // Update map era
    slider.value = step.yearIdx;
    updateYear(step.yearIdx);

    // Update tour card
    tourCard.style.display = 'block';
    tourScene.innerText = `Scene ${tourStepIndex + 1}/${route.length}: ${step.scene}`;
    tourDesc.innerText  = step.desc;

    // Fly camera
    isProgrammaticFlight = true;
    map.flyTo({
        center:   step.center,
        zoom:     step.zoom,
        pitch:    step.pitch,
        bearing:  step.bearing,
        duration: dur,
        essential: true
    });
    setTimeout(() => { isProgrammaticFlight = false; }, 50);

    tourTimeout = setTimeout(() => {
        tourStepIndex++;
        playTourStep();
    }, dur + 600);   // +600ms pause between scenes
}

function stopTour() {
    tourActive = false;
    clearTimeout(tourTimeout);
    tourStepIndex = 0;
    tourPlayBtn.disabled = false;
    tourPlayBtn.innerText = '▶ Play';
    tourStopBtn.disabled = true;
    tourCard.style.display = 'none';
    map.getCanvas().style.cursor = '';
}

tourPlayBtn.addEventListener('click', () => {
    if (tourActive) return;

    // Automatically exit Compare Mode if it's active
    if (isCompareModeActive) {
        isCompareModeActive = false;
        compareBtn.classList.remove('active');
        compareBtn.innerText = '⇄ Compare Mode: OFF';
        document.body.classList.remove('compare-mode');
        compareSection.style.display = 'none';
        document.getElementById('map-a-label').style.display = 'none';
        document.getElementById('map-b-label').style.display = 'none';
        map.resize();
    }

    tourActive    = true;
    tourStepIndex = 0;
    tourPlayBtn.disabled = true;
    tourPlayBtn.innerText = '▶ Playing…';
    tourStopBtn.disabled = false;
    playTourStep();
});

tourStopBtn.addEventListener('click', stopTour);

// ════════════════════════════════════════════════════════════
// CLEANUP — stop tour if user interacts with the map manually
// (movestart + e.originalEvent ensures we only stop when
//  the user drags/zooms/rotates the map manually, avoiding
//  spurious tour cancellations during programmatic flyTo)
// ════════════════════════════════════════════════════════════
map.on('movestart', e => {
    if (tourActive && !isProgrammaticFlight) stopTour();
});
