# Heritage representation corrections

Eight duplicate records removed. Every named heritage identity now has one active record per era. Point and polygon records are kept in separate manifest layers so their rendering does not depend on the first feature type.

| Era | Duplicate identity removed | Retained geometry |
| --- | --- | --- |
| 637 | الجامع الأموي | MultiPolygon |
| 637 | كنيسة مار إشعيا | MultiPolygon |
| 637 | كنيسة الطاهرة السريانية الكاثوليكية | MultiPolygon |
| 912 | الجامع الأموي | MultiPolygon |
| 1778 | مرقد الامام يحيى ابو القاسم | MultiPolygon |
| 1919 | خان الكمرك | MultiPolygon |
| 2003 | قره سراي | MultiPolygon |
| 2020 | قره سراي | MultiPolygon |

## Ziwani Mosque in 1852

The misplaced 1852 copy was replaced with the mapped 1919 footprint. The complete polygon lies inside the 1852 enclosure, formed from the historic wall line and its closing boundary. Other eras were not relocated. Geometry-source metadata records the correction.

## Separate churches

The two External Al-Tahira records in 1919 and 1944 represent separate locations. They retain their geometries and are distinguished as Chaldean and Syriac using the corresponding eastern/western 1852 named locations. The two Mar Toma churches remain distinct.

## Verification

The regression test checks every era for repeated names and mixed geometry types, preserves the approved workbook coverage, and checks all Ziwani footprint vertices against the 1852 wall. Original records are retained in before/ for audit. Run tests/heritage-representations.test.cjs for the current data; the earlier heritage-years test checks the prior revision snapshot.
