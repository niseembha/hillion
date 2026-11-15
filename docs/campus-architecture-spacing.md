# Architecture and spacing refinement

This pass revisits the nine walking clips after the map-alignment pass. Map rectangles, landmark relationships and the seven-stop sequence remain the reference layout. Building-specific architecture replaces the generic repeated box-and-window treatment, and the open spaces now have more room around an eye-height observer.

[Open the local before/after review](../references/processed/architecture/index.html) · [Comparison overview](../references/processed/architecture/overview.jpg) · [Original route reconstruction](campus-route-reconstruction.md).

## Architecture taken from the footage

| Location | Evidence reviewed again | Changes |
| --- | --- | --- |
| Athletic approach / gym | 01:20–54; 02:00–04; 03:00–08 | Cream brick with pale base, low ventilation louvers and high strip glazing; shallow curved metal gym roof; full glazed entry with transom and thin silver frames; Hornets lettering above the doors and G on the adjacent panel. Entry canopy uses light piers, steel braces and transparent roof panels. |
| Covered gym walk | 01:54–62; 03:00–08; 04:00–10 | Open rectangular brick piers, slender dark rafters, pale roof infill and a separate pitched link at the north end. Planting sits beyond the outer posts, with Rotunda farther away instead of another close wall filling the right side. |
| Rotunda pavilions | 01:34–44; 04:28–54 | Low pale masonry, actual gable ends, shallow standing-seam roofs, gutters and broad overhangs. Wider grouped windows with silver frames, transoms and sills replace narrow green stripes on tall flat boxes. |
| VSI | 04:13–25; 04:28–64 | Pale upper masses, projecting vertical west screens, stacked punched windows, south clerestories and a shallow horizontal silver louver band. Continuous ground-floor curtain wall has finer mullions and a planting edge. The undercroft now has a smooth timber-plank soffit with inset linear lights, rather than heavy exposed beams. |
| Crossman side of the court | 04:60–64; map | A relatively plain taller masonry end wall and low glazed entrance replace a repeated classroom facade. Identity follows the map and remains less certain than the clearly recognizable VSI facade. |
| Upper School | 05:48–80; 06:00–20; 07:02–08; 08:00–12 | Low shallow metal roofs, brick piers, dark canopy structure, recessed glazed bays and transoms; open roofed junctions and fine running-bond courtyard paving. The exact registration of clips 06–08 is still provisional. The footage supports the architectural vocabulary, not a complete classroom floor plan. |
| MPAC | 09:14–42, especially 09:38 | Sloping limestone leading edge rises into the cantilever; a deep upper window group has fine vertical divisions and stone reveals. Recessed glass wraps the lobby corner, with tall thin mullions, slender round columns, small soffit lights, building lettering and a low stone/pebble edge. This replaces a simple rectangular upper box. |

Roof pitches, stone courses, fin counts, exact glazing bays and structural spans are visual estimates. Unseen interiors have not been reconstructed. The game retains its pastel materials, lighting direction, sky, foliage style and detective interfaces; the materials are refined to distinguish cream brick, limestone, pale panel masonry and metal frames.

## Space and proportions

The previous 0.12-unit-per-map-pixel conversion compressed the campus horizontally while leaving people-scale eye height, doors, trees and furniture unchanged. This made tall-looking buildings face one another across unusually small gaps. The horizontal conversion is now **0.24 units per map pixel**, with the same map coordinates and north/east relationships. This is an illustrative calibration from the footage's relative proportions and walking sequence, **not a surveyed metre scale**.

The main gym walk is re-centred within the widened arcade. VSI's eastbound walk keeps a clear strip between the facade planting and the tables; tables, trees and fictional clue pedestals no longer fill the narrow central lane. Roofed court junctions have open crossing bays. Clue pedestals have been shifted to the edges where necessary so the following journey does not run through them.

| Space | Current model target | How it is checked |
| --- | --- | --- |
| Gym arcade, between piers | Approximately **3.5 units** clear | Horizontal ray measurement across a post bay, including the actual post geometry. |
| Gym facade to Rotunda | Approximately **7.7 units** across the mapped gap | Same map separation at the larger horizontal conversion; additional room outside the covered walk is planted. |
| VSI court | Approximately **7.1 units** between visible facades, with a **3-unit** principal path | Cross-court rays include glass and solid facades; walking checks include nearby furniture and low objects. |
| North Fulton court | Approximately **8.6 units** of mapped paved depth | The open court is spacious enough for separated tables, trees and circulation. Exact placement is still provisional. |
| MPAC forecourt | Nominal **7.2-unit** overhang depth; **4.2-unit** underside height | Measured upward ray under the overhang and an unobstructed approach to the recessed lobby. |

These values describe the model, not measured campus dimensions. Camera eye height remains 1.72 and the game's normal field of view is unchanged: the extra space comes from geometry. Travel remains compressed for gameplay.

## Validation and comparisons

The comparison uses the previous published source at `e7a94ba1e625f021679d51dd261f0d32302dc522` as the baseline. Both versions use the same map-coordinate camera and target registrations. Each preview resolves those registrations using its own horizontal scale; eye height and the estimated 82-degree portrait QA field of view are shared. Consequently these compare proportions at corresponding campus locations, not identical numerical world coordinates. Phone lens calibration and the precise recording pose remain unknown.

Eleven checkpoints cover the athletic approach, gym doors, covered walk, west VSI approach, undercroft, south VSI court, clocktower, eastern quad, provisional Upper School court, MPAC lawn and MPAC entry. Gameplay screenshots also use the unchanged normal camera through all seven stops. Original footage and the first geography-pass comparison are preserved locally.

Validation results:

- All **32 Node tests pass**, along with syntax checks and the static build.
- Actual WebGL journeys clear low obstacles and eye height at **300 intervals per segment**, on the centre line and at **±0.65 units**.
- Rendered cross-section measurements are **3.50** clear between gym piers, **7.13** across the VSI court, and **4.20** to the MPAC soffit.
- Sky coverage passes at the introduction and all seven stops. The ray check uses a subpixel retry for exact shared-triangle seams on the sky dome.
- The full browser gameplay regression passes: seven stops, envelope interactions, guesses/scoring, endings, reveal/skip, sharing/history, reduced motion and widths **1440/1280/768/390/320**.
- All nine source-video SHA-256 hashes match the original extraction manifest; every building/field map rectangle is unchanged.

The comparison media remain local and are excluded from deployment.

## Remaining limits

The footage is sufficient to distinguish the building forms and open-space character, but it does not provide dimensioned elevations or an exact plan of the Upper School court. Facade subdivisions, roof pitches, landscaping, structural spans and exact materials remain simplified. No hidden building connections or exact measured dimensions are claimed.

To reproduce the current comparison with Pillow, FFmpeg and optional Playwright available:

```sh
SURVEY_COMPARISON=architecture HILLION_URL=http://localhost:5173 node scripts/capture-campus-survey.mjs after
SURVEY_COMPARISON=architecture python scripts/compare-campus-survey.py
```

The baseline preview must use the baseline world, route and layout source; the capture script deliberately supplies one shared map-coordinate camera list to both previews. Before and after camera metadata must match before panels can be composed.
