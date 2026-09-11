# Atlas edition notes

The atlas preserves the supplied GeoJSON, raster imagery and source records.

## New visitor tools

- Five guided chapters with focused camera positions and observation prompts.
- Explore and Research workspaces; morphology computation deferred until needed.
- Source context distinguishing listed surveys/imagery from early interpretive records requiring review.
- Comparison of mapped building footprint totals and counts of road and wall/gate records. These are dataset comparisons, not verified physical change or growth measurements.
- Clickable landmark/street records, name-matched appearances across datasets, and photos/descriptions only when attached to the selected feature.
- Map key, metric scale, compass and explicit explanation of illustrative 3D heights.
- View links restoring language, main/comparison years, camera and workspace. Localhost links only resolve on the computer running the server.

## Source review still required

`data/map_sources.json` contains conflicting year/period metadata:

| Dataset year | Period text in supplied source record |
| --- | --- |
| 637 | Atabeg Era (c. 1239 AD) |
| 912 | Safavid / Early Ottoman Transition (c. 1506 AD) |
| 1096 | Middle Ottoman Era (c. 1685 AD) |
| 1127 | Jalili Era Beginnings (c. 1715 AD) |

The interface flags these conflicts. It does not decide whether the dataset year, calendar system, source identification or period label should be corrected. Later source descriptions are presented as project-supplied records, not independently authenticated references. Feature-level accuracy/confidence was not supplied. Photo dates should not be inferred from the timeline year. Name matching is not proof of continuous survival or identical geometry.

## Validation

Checked JavaScript syntax, unique HTML IDs, local entry assets and all 113 manifest layer references. Browser checks covered Arabic/English desktop comparison, five-chapter navigation, Explore/Research switching, morphology activation, an actual landmark click, and restoration of comparison years/language from a view link. At 390 × 844, checked Arabic/English controls and corrected RTL overflow: document width 390 and comparison halves 195 each. Reviewed desktop and mobile screenshots. External basemap/terrain services still require connectivity.

## Analysis repair and panel simplification

Morphology now computes compactness (4πA/P²) and a finite-scale boundary box-counting estimate from footprint geometry. Space Syntax operates on a graph of supplied road polyline parts, with connectivity, mean topological depth and reciprocal mean depth (1/MD). It is not an axial/angular model or HH/NAIN result. A selectable endpoint tolerance and component counts expose the graph construction. Calculations run in a worker, preserve supplied attributes, and share a color range across paired maps.

Regression checks cover a square, a polygon hole, degenerate geometry, a known path graph, disconnected nodes, crossings and tolerance gaps; actual datasets 637, 1778, 1852 and 2020 are also checked. Browser validation covers both languages, metric/tolerance changes, empty early datasets, comparison and standard-view restoration.

The Reading this map section, journey description paragraphs and two requested landmark boilerplate paragraphs were removed from the interface. Descriptions for Al-Nuri and Al-Mujahidi were summarized from the supplied manuscript’s historical framework and attributed in their cards. Features without a description simply omit that field.
