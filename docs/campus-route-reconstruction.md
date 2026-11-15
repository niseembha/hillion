# Greenhill route reconstruction from the November 2026 footage

The supplied campus map determines placement and north/east relationships. The nine walking clips determine the sequence of views, turns, covered passages, facade treatment and changes of paving. VSI means **Rosa O. Valdes STEM + Innovation Center** throughout. Filename spellings “brinkman” and “philips” are retained in the evidence archive; map names are used in the game.

## Evidence and coordinate system

- Originals: `references/campus-videos/`, nine MOV files, retained unchanged. No footage, extracted frames or identifiable people are shipped with the game or published to the source repository.
- Map: supplied `references/map-and-route.pdf`, rendered locally to `references/processed/campus-map.png` at **2200 × 1700** pixels. Positions below use that render's pixels, with top-left origin, east right, north up.
- Extraction: `scripts/process-campus-videos.py` samples every **2 seconds**, respecting the iPhone rotation metadata. There are **161 chronological samples** plus selected larger frames at turns and entrances. `references/processed/manifest.json` records source-local timestamps, paths, durations and SHA-256 hashes of all originals. Contact sheets are split into at most 18 frames per sheet.
- Additional inspection: clip 01 at 4/6/18/34/44/48/54s; clip 04 at 0/9/11/13/16/25/28/32/64s; clip 05 at 0/16/24/28/30/32/34/48/62/70/74/80s; clip 07 at 2/4/6/8s; clip 08 at 0/4/10/12s; clip 09 at 0/2/14/28/38/40/42s.
- Game conversion is unchanged: `X=(mapX-1000)*0.12`, `Z=(mapY-700)*0.12`. The supplied map is schematic: this is **not a surveyed metre scale**, and the drawn football-field aspect ratio is not regulation geometry. Building heights, roof profiles, mullion counts and furniture spacing remain visual estimates.
- Confidence: **high** = recognizable landmark and clear directional sequence; **medium** = map-supported approximate registration; **low** = sequence visible, exact location/orientation unresolved. Confidence does not imply GPS accuracy. Camera pans are distinguished from walking turns. Separate clips are not assumed to be continuous recordings.

## Timestamp-to-map reconstruction

| Clip / source time | Observed evidence and walking sequence | Approximate map registration | Confidence / limitation |
| --- | --- | --- | --- |
| 01 00:00–00:04 | Looks across Brinkmann Field, then pans toward the campus walk and nearby seating. | East field edge near (795,1090); field bounds (670,935)–(795,1266). | High landmark; medium camera location. The exact access from seating to sidewalk is not determined. |
| 01 00:06–00:18 | Curved concrete approach, low retaining wall and steps on the right; basketball slab to the right of the northbound route. | Near (795,930) toward (790,880); slab (805,835)–(895,910). | High left/right relationship; medium exact step positions. |
| 01 00:20–00:44 | Walks north along a straight sidewalk: athletic facade and trees left, lawn and low classroom pavilion right, entrance canopy ahead. | (790,880) → (790,790), east of the Phillips building and west of Rotunda. | High route orientation; approximate distances. |
| 01 00:46–00:54; 02 00:00–00:04 | Glazed entrance with a large G / GREENHILL HORNETS graphic on the left; camera pans to inspect it, then looks along the covered walk. | East athletic entrance around (775,777), observer near (790,777). | High entrance recognition. The canopy junction serves the athletic complex; the clip does not establish a separate named door for each gym. |
| 01 00:54–01:02; 03 00:00–00:08 | Straight covered walkway, athletic wall left, rectangular brick posts and planting right, exposed rafters above. | North along the athletic complex's east edge around x=790, y=760→640. | High topology. Repeated bays cannot establish an exact distance or inter-clip jump. No cross-wall arches are present in this view. |
| 04 00:00–00:10 | Brief pans across the courtyard; resumes north through a pitched covered link, with parking becoming visible ahead/left. | North of athletic complex around (790,640) → (785,600). | Medium registration; head pans are not additional route turns. |
| 04 00:11–00:24 | Exits link, turns toward VSI's pale west elevation, continues north beside it. Window fins on right, parking on left. | West of VSI's southwest leg, x≈785, y≈610→565. | High building / side relationship, medium exact path. |
| 04 00:25–00:32 | Turns east beneath a timber soffit connecting the west wing to the long south facade. Low stone seat walls flank the passage. | Open passage near (794,553) → (832,553). | High visible passage, medium bounds. This is an exterior undercroft, **not** evidence of an interior classroom route. |
| 04 00:34–01:04 | Continues east through the paved court: VSI glass and horizontal fins left, low Rotunda pavilion / tables / trees right; taller masonry building ahead. | South VSI frontage, (832,553) → (943,553). Ahead is consistent with the Crossman side of the map. | High VSI orientation; medium identification of the distant blank wall as Crossman. |
| 05 00:00–00:16 | Leaves the east end of VSI's court, follows a bending concrete walk around lawn and an oak, passing umbrella tables. | Around (943,553) → (958,590). | Medium map registration; high transition from paved VSI court to landscaped quad. |
| 05 00:18–00:32 | Low covered classrooms surround the lawn; clocktower becomes visible as camera turns toward the quadrangle. | Northwest Foote Quadrangle; approach (958,591); tower anchored near (1007,637) from map. | High landmark, medium camera pose. Do not infer tower coordinates from the camera pan alone. |
| 05 00:34–00:50 | Turns east onto irregular flagstone; tower is passed to the right/south; low covered Upper School frontage ahead. | Southern quad arc around (980,614) → (1124,627), passing north of the tower. | High paving / onward sequence; medium exact curve. Existing curved amphitheater tiers were unsupported here. |
| 05 00:52–01:12 | Approaches glazed classroom frontage beneath low roof with brick posts; flagstone meets concrete. | Eastern quad near (1150,614)–(1175,607), west Fulton approach. | Medium; building assignment follows the map, not a readable sign. |
| 05 01:14–01:20; 06 00:00–00:20 | Turns along covered frontage, then follows branching concrete paths through a shaded classroom court. | Upper School west/north circulation, broadly x≈1160–1240, y≈520–610. | **Low exact registration**. Lawn, planting, branches and colonnades are visible; individual classroom names are not. |
| 07 00:00–00:10 | Approaches a roofed junction, moves through an open-sided covered passage and turns toward the next court. | Transition toward the north Fulton courtyard; exact bay unresolved. | **Low coordinates and absolute heading**. No new invented building connection or interior route is claimed. |
| 08 00:00–00:12 | Camera pans across a brick-paved court with trees and round tables, then walks toward/under a covered exit. | Provisional registration in the map's marked north-Fulton gap around (1280,499), south of Korenvaes. | **Low**: court sequence is clear, but exact court outline, column spacing and which exit is filmed are unresolved. Rendering remains a simplified open court in the mapped gap. |
| 09 00:00–00:04 | Leaves a covered Upper School edge and turns toward MPAC across open lawn. | East/northeast Fulton edge, about (1340,510). | Medium: MPAC identity and eastward connection are secure; exact exit is not. |
| 09 00:06–00:28 | Diagonal concrete walk across lawn; MPAC limestone mass ahead/right, parking left, young trees and lawn chairs beside approach. | (1370,534) → (1452,581), west/northwest of MPAC. | High relative relationship, medium camera registration. |
| 09 00:30–00:42 | Reaches prominent limestone overhang, recessed glass lobby, slender dark columns, low stone planting edge. | Northwest/west MPAC entry: overhang begins near x=1478, lobby recessed to x≈1508, y≈590–640. | High architectural identity; setback, heights and exact facade angles are estimated. The sloping stone edge is not fully reconstructed. |

## Changes made from this evidence

The field and gym now use separate map footprints; the oversized gym no longer occupies the natatorium/athletic-center area. Basketball remains east/right of the northbound approach. The entry is on the athletic complex's east face, followed by a post-and-rafter covered walk with an open north end. The invented repeated arch walls and terminal wall were removed.

VSI now occupies the mapped block and southwest leg. The journey stays west until the north end of the covered link, turns east beneath a raised southwest volume, then follows the south facade, with glazing/fins left and Rotunda to the right. It no longer makes the old early right turn directly toward an isolated decorative glass facade. The court, seating and small planting masses support the observed view; exact landscaping is approximate.

The clocktower is anchored to the map's tower symbol, with visible clock faces on all sides. The route passes north of its base and uses a flagstone arc across the quad. Unsupported amphitheater tiers were removed from this location. Upper School stays low with open outdoor circulation; there is no invented glazed multistorey atrium assigned to Fulton.

MPAC is a limestone upper volume over a recessed glass lobby, approached diagonally across lawn. The old freestanding timber atrium was removed from this location. Roof overhang and ground occupancy are represented separately, so the final approach can enter the sheltered forecourt without walking through a solid facade.

Existing materials, pastel palette, sky, lighting, fog, foliage style, detective UI, seven clues, scoring, guesses and yearbook reveal are retained. Envelope pedestals remain fictional game objects; they are not campus landmarks. Normal gameplay has no evidence labels or confidence overlays.

## What remains unresolved

The largest uncertainty is the exact bay-by-bay registration of clips 06–08 and their gaps. The map supports the broad west-Fulton → north-Fulton court → east exit sequence; it does not resolve the courtyard interior. That portion is an explicitly provisional exterior interpolation. No classroom names, unseen passages, interior floor plan, exact dimensions, slopes, landscaping inventory or GPS track have been inferred.

Heights, arcade lengths, roof pitches, exact facade setbacks, the field's regulation proportions, MPAC's sloping facade edge and the first sideline access need further measurement or a dimensioned plan. The current model improves **map placement, observed topology and recognizable sightlines**; it is not a complete photogrammetric reconstruction.

## Review artifacts and reproduction

- [Visual validation and remaining differences](campus-validation.md)
- [Local evidence triptychs](../references/processed/comparison/index.html)
- [Overview image](../references/processed/comparison/overview.jpg)
- [Timestamped contact sheets](../references/processed/)
- [Route registration on the supplied map](../references/processed/route-registration.png)

Use a Python environment with Pillow and FFmpeg on PATH:

```sh
python scripts/process-campus-videos.py
python scripts/process-campus-videos.py --detail 04:11,13,16,25,28,32
npm run dev
HILLION_URL=http://localhost:5173 node scripts/capture-campus-survey.mjs after
python scripts/compare-campus-survey.py
```

Playwright is optional local QA tooling; `PLAYWRIGHT_MODULE_PATH` may point to an existing installation. `?survey` exposes the scene for reproducible evidence cameras; `?overhead` remains the map-checking view. Neither changes normal play. Before screenshots were captured from the unchanged pre-update world/route/layout at source commit `5a0ad55f2f0ff8f74e5b53b8e7eba49732987550` in an isolated temporary preview, using the same comparison camera definitions and framing as the updated world.
