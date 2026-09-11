# Street and bridge analysis networks

These analysis-only exports preserve the original files. Rebuild with `scripts/prepare-bridge-networks.py` (the Python dependencies listed in `scripts/requirements-centerlines.txt`) followed by `node scripts/analyze-bridge-networks.cjs`. Run `node tests/bridges.test.cjs` to verify results.

1944 uses the previously derived centerlines. 1966, 1988 and 2003 use their mapped street lines. The manifest assigns files named `1980_*` to the 1988 era; that existing dating is preserved. 2020 uses `2020-Roads.geojson` and the hyphenated Big/Small Roads files: these contain open street lines, unlike the 162 closed outlines in `2020_Roads.geojson`.

Bridges are graph path parts. Only bridge endpoints form street connections, so crossing a bridge deck does not create an intersection. Each endpoint may connect to its nearest mapped street within 50 m, provided the added approach does not pass through a mapped building. Added approaches extend the bridge part rather than adding artificial extra graph steps. Every accepted or rejected endpoint is recorded in `manifest.json`, together with source hashes. No long connections across missing street coverage are inferred.

All-components files retain unconnected bridge records; main-network files include the largest connected component. Calculations use 5 m tolerance for ordinary mapped street endpoints. Derived street parts retain exact shared junction IDs even when bridges are present. Connectivity, mean depth and reciprocal mean depth are recomputed with bridges, including downloaded attributes. These remain street-part topological metrics, not angular/axial Space Syntax measures.

| Era | Total bridge parts | Bridge parts in main network |
| --- | ---: | ---: |
| 1944 | 1 | 1 |
| 1966 | 2 | 2 |
| 1988 | 3 | 3 |
| 2003 | 9 | 7 |
| 2020 | 9 | 3 |

The two disconnected 2003 records have unnamed approaches hundreds of metres outside the mapped streets. In 2020, the fifth bridge's two parts and the old iron bridge join the main network. The third/fourth bridge approaches and unnamed records lack nearby mapped streets. The Freedom bridge endpoint lies inside a mapped building footprint: the nearest street is about 43 m away, and a straight connection would cross about 17 m of that footprint. It is retained but not joined through the building. Resolving these records requires correcting or completing the 2020 source geometry, rather than increasing the connection tolerance. Multiple parts with the same name are counted as parts, not distinct bridges.
