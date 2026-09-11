# Derived street networks: 1906, 1919 and 1944

These separate layers reconstruct candidate street centerlines inside mapped road-area polygons, subtracting building, heritage and river polygons. Original research layers are unchanged. The 1944 input is the polygon file `1944-Roads.geojson`, not the original line file `1944_Roads.geojson`.

| Era | All paths | Main connected network | Components |
| --- | ---: | ---: | ---: |
| 1906 | 1,294 | 1,211 | 25 |
| 1919 | 1,261 | 1,132 | 34 |
| 1944 | 1,327 | 1,086 | 55 |

The app defaults to the main connected network; all components and original mapped lines remain selectable. Download links include the displayed network and calculated attributes. Both GeoJSON variants use EPSG:4326 and can be opened directly in QGIS. For distance or length work, reproject to EPSG:32638.

## Method and interpretation

Geometry operations use UTM 38N. A 1 m mask of the remaining road area is thinned using Zhang skeletonization. Adjacent junction pixels are consolidated; degree-two nodes are merged, terminal spurs shorter than 3 m removed, and paths simplified by up to 0.6 m only when they remain inside the corridor. The generator checks that paths do not cross buildings or leave the corridor. Per-era reports record source hashes, parameters, counts and quality checks; review PNGs show the paths against buildings.

Connectivity comes from explicit shared endpoint IDs, without proximity connections across obstacles. Each path part is a graph node. `connectivity` counts neighboring parts, `mean_depth` averages shortest-path steps within its connected component, and `integration_1_md` is reciprocal mean depth. Isolated paths have null depth and integration. These are topological street-part measures, not axial/angular analysis or HH/NAIN normalization.

These automatically inferred lines require cartographic review, especially for alleys narrower than the grid, open areas and disconnected components. Components are not artificially joined through buildings. Historical eras drawn with different segmentation should be harmonized before making formal numerical comparisons. The main-network view prevents small detached components from dominating the integration color scale.

## Reproduction

With Python and Node installed, from the project directory:

```sh
python3 -m venv .venv-centerlines
.venv-centerlines/bin/pip install -r scripts/requirements-centerlines.txt
.venv-centerlines/bin/python scripts/derive-centerlines.py
node scripts/analyze-derived-centerlines.cjs
node tests/analysis.test.cjs
node tests/centerlines.test.cjs
```

Run both generation steps in order: the second adds metric attributes and writes the main-network downloads. The application itself needs no Python geometry packages; it loads the prepared GeoJSON and computes interactive metrics in its worker.

Serve the project with `python3 -m http.server 8765 --bind 127.0.0.1`, then open `http://127.0.0.1:8765/`. Opening the HTML directly does not allow its map-data requests.
