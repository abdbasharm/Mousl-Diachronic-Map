const years = [1852, 1906, 1919, 1944, 2020];
let manifest = null;

const categories = {
    'Building Blocks': ['building', 'block'],
    'Roads': ['roads'],
    'Open Spaces': ['open space', 'open_space'],
    'Era Changes': ['evolution', 'changes']
};

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [43.128, 36.335],
    zoom: 14.5,
    pitch: 45 
});

const stats = {};

map.on('load', async () => {
    const manifestResponse = await fetch('data/manifest.json');
    manifest = await manifestResponse.json();

    const layerPromises = manifest.layers.map(async (layerInfo) => {
        const response = await fetch(`data/${layerInfo.file}`);
        const data = await response.json();
        
        const layerId = `layer-${layerInfo.layer}`;
        const sourceId = `source-${layerInfo.layer}`;

        map.addSource(sourceId, { type: 'geojson', data: data });

        const layerNameLower = layerInfo.layer.toLowerCase();
        
        let color = '#94a3b8'; 
        let isBuilding = layerNameLower.includes('building') || layerNameLower.includes('block');
        let isRoad = layerNameLower.includes('roads');
        let isOpenSpace = layerNameLower.includes('open space') || layerNameLower.includes('open_space');
        
        if (isBuilding) color = '#10b981'; 
        if (isRoad) color = '#334155';
        if (isOpenSpace) {
            color = '#84cc16';
            opacity = 0.3;
        }

        const colorExpr = [
            'match', ['get', 'Status'],
            'Lost_or_Road_Cut', '#ef4444', 
            'Survived', '#f59e0b',        
            color
        ];

        if (isBuilding) {
            map.addLayer({
                id: layerId,
                type: 'fill-extrusion',
                source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-extrusion-color': colorExpr,
                    'fill-extrusion-height': [
                        'interpolate', ['linear'], ['get', 'PermIdx'],
                        0, 5, 20000, 18
                    ],
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.85
                }
            });
        } else {
            map.addLayer({
                id: layerId,
                type: 'fill',
                source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'fill-color': colorExpr,
                    'fill-opacity': isRoad ? 0.9 : (isOpenSpace ? 0.3 : 0.7),
                    'fill-outline-color': isOpenSpace ? 'transparent' : 'rgba(255,255,255,0.2)'
                }
            });
        }

        if (isBuilding) {
            const yearMatch = layerInfo.layer.match(/\d{4}/);
            if (yearMatch) {
                const year = yearMatch[0];
                let area = 0;
                turf.featureEach(data, (f) => { area += turf.area(f); });
                stats[year] = { buildings: (area / 1000000).toFixed(2), roads: (area * 0.15 / 1000).toFixed(2) };
            }
        }
    });

    await Promise.all(layerPromises);
    updateYear(0);
});

const slider = document.getElementById('timeline-slider');
const yearDisplay = document.getElementById('current-year');
const layerToggles = document.getElementById('layer-toggles');

slider.addEventListener('input', (e) => updateYear(e.target.value));

document.querySelectorAll('.slider-labels span').forEach((label, index) => {
    label.addEventListener('click', () => {
        slider.value = index;
        updateYear(index);
    });
});

function updateYear(index) {
    const year = years[index];
    yearDisplay.innerText = year;

    // Update nodes
    document.querySelectorAll('.node').forEach((n, i) => {
        n.classList.toggle('active', i == index);
    });

    manifest.layers.forEach(l => {
        map.setLayoutProperty(`layer-${l.layer}`, 'visibility', 'none');
    });

    const relevant = manifest.layers.filter(l => l.layer.includes(year.toString()));
    layerToggles.innerHTML = '';

    for (const [catName, keywords] of Object.entries(categories)) {
        const catLayers = relevant.filter(l => keywords.some(k => l.layer.toLowerCase().includes(k)));
        if (catLayers.length === 0) continue;

        const catHeader = document.createElement('div');
        catHeader.className = 'stat-label';
        catHeader.style.marginTop = '16px';
        catHeader.style.marginBottom = '8px';
        catHeader.innerText = catName;
        layerToggles.appendChild(catHeader);

        // Group layers by clean name
        const nameGroups = {};
        catLayers.forEach(l => {
            let name = l.layer.replace(/_/g, ' ').replace(new RegExp(`${year}-`, 'g'), '').replace(new RegExp(`${year} `, 'g'), '');
            name = name.replace('Analysis Permeability ', '').replace('-', '').trim();
            
            // Aggressive consolidation for Roads
            if (catName === 'Roads') name = 'Roads';
            if (catName === 'Building Blocks') name = 'Building Blocks';
            
            if (!nameGroups[name]) nameGroups[name] = [];
            nameGroups[name].push(l);
        });

        Object.entries(nameGroups).forEach(([name, layers]) => {
            const isEraChange = catName === 'Era Changes';
            layers.forEach(l => {
                map.setLayoutProperty(`layer-${l.layer}`, 'visibility', isEraChange ? 'none' : 'visible');
            });

            const item = document.createElement('div');
            item.className = 'layer-item';
            item.innerHTML = `<input type="checkbox" ${isEraChange ? '' : 'checked'}> <span>${name}</span>`;
            item.querySelector('input').addEventListener('change', (e) => {
                layers.forEach(l => {
                    map.setLayoutProperty(`layer-${l.layer}`, 'visibility', e.target.checked ? 'visible' : 'none');
                });
            });
            layerToggles.appendChild(item);
        });
    }

    if (stats[year]) {
        document.getElementById('stat-buildings').innerText = `${stats[year].buildings} km²`;
        document.getElementById('stat-roads').innerText = `${stats[year].roads} km`;
        const baseline = parseFloat(stats[1852].buildings);
        const growth = (parseFloat(stats[year].buildings) / baseline).toFixed(1);
        document.getElementById('stat-growth').innerText = `${growth} x`;
    }
}
