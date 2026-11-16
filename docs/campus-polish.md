# Detail, realism and camera polish

The mapped campus layout and the existing mystery game remain intact. This pass concentrates on the spaces seen along the guided route, the physical logic of the scenery, and the transition from walking to reading each note.

[Before / after review](../references/processed/polish/index.html) · [Comparison overview](../references/processed/polish/overview.jpg) · [Representative guided-walk video](../references/processed/polish/walk/guided-walk.mp4) · [Close-note desktop view](../references/processed/polish/walk/note-desktop.png).

The comparison baseline is the prior published source, `d2efecc8332b05fe5d01f86403429ed8a9a2d5e7`. Eleven matched map-coordinate views use the same comparison camera framing in both versions. The gameplay video uses the normal first-person camera.

## Reference review

The reference media are stored in `references/`, alongside the game's existing art in `assets/`. The review used the nine source-video contact sequences, turn/entrance detail frames, the mapped layout, and a 19-photo inventory. The most useful environmental evidence was:

- Clips 01–03 and the athletic photos: tree-lined approaches, wall-side planting, low retaining walls, entrance piers, ventilation, concrete joints, brick crossing bands, lights and the blue hydrant.
- Clip 04 and the STEM photo: continuous timber soffit, glazed corner/curtain wall, low railings, mulched beds, seat walls, low shrubs, tables and tree pockets.
- Clip 05, the quad photos and `greenhill.jpg`: framed lawns, stone paths and blocks, mature trees, outdoor seating and low classroom frontages.
- Clips 06–08: open covered junctions, fine brick paving, tree wells, ornamental planting, round tables and bins.
- Clip 09 and the MPAC photograph: recessed glazing, slender columns, small soffit lights, stone/pebble edges, lawn chairs, young trees and visible parking.

The future-athletic-building image is a concept reference, not evidence that another building belongs in the present campus model. The interior STEM photograph informed the restrained study-furniture vocabulary behind the glazing; it was not treated as a surveyed interior plan.

## Environment and architecture

A separate detail layer adds planted/mulched beds, flowering shrubs and grasses, tree surrounds and leaf litter, benches, lawn chairs, bins, light poles, small campus directories, flush drains and the blue hydrant. Concrete expansion joints, fitted polygonal flagstones, brick borders and planted islands give the open approaches and quad a finished edge. Parked cars populate the parking areas already shown on the map and footage.

Five low-poly students and two peacocks move slowly along short background routes, pausing and turning in place. These are fictional ambient figures. Calm/reduced-motion mode freezes this movement. They do not enter the reserved player lane or alter the mystery, score or clues.

The VSI undercroft now has continuous paving and an edge support. The curtain-wall room has a connected floor, rear wall and glazed return: exposed backing panels no longer read as freestanding green cards. A few simple study tables are visible through the glass. Gutters/downpipes and small rail details give the surrounding buildings more complete exterior logic without changing their footprints.

## Grounding and clearance

The previous loose canopy ring is replaced by rooted trees with branches and visible ground surrounds. Crown width is limited by actual facade setbacks; close street trees are narrow/pruned rather than intersecting a wall. Shrubs have grounded stems and connected crowns; grass blades and flowers begin in the bed surface.

The detail layer reserves the authored walking paths, the closer note approaches and the reading positions. Beds are cut around these lanes instead of running mulch or shrubs across pavement. Object placement excludes building interiors and clue landings. Moving background routes are checked against the rendered walls and furniture. The open gym, VSI and MPAC clearances from the previous pass are retained.

Ambient figures follow the lawn or paving height beneath their feet, with attached contact shadows that move with them. The yearbook refreshes its shadow as its cover opens.

## Camera and notes

Walking now uses distance-led pacing: a soft start, steady accelerated walking pace and a soft stop. The aim follows a short distance ahead on the actual route, staying close to the horizon. A note is the reason for the final turn; arbitrary side glances and oscillating camera sway have been removed.

The camera arrives about **2.05 model units** from each note, looking directly down toward it. Inspection moves to about **1.05 units**, with a small natural lowering of eye height. Desktop composition leaves the envelope to the left of the reading panel; mobile composition places it above the panel. Envelope labels face the approach and are clearly marked with the clue number. The yearbook stays hidden until its reveal, rests on the plinth when shown, and opens its cover toward the clear side when a facade is nearby.

When continuing, a short sidestep is inserted only if the direct departure would intersect the clue plinth. Camera rotations have a bounded angular speed and remain continuous when a journey finishes. Motion uses the render-frame clock, so returning from a hidden tab does not jump ahead through the route. Arrive-now, calm motion and reset remain available.

## Validation

- **35 Node tests** pass, covering the existing game/geography plus monotonic camera pacing, near-horizon walking aim and close-note poses.
- The full WebGL gameplay regression passes at widths **1440/1280/768/390/320**, including the seven clues, scoring/guesses, reveal, sharing/history, reduced motion and reset cancellation.
- The original route-clearance checks pass; additional checks sample the actual new note approaches and departures at foot and upper-body height. All seven reading poses frame the note clear of the desktop panel.
- All tree crowns fit their recorded facade setbacks. Background walking paths clear walls and furniture.
- The actual gym-to-VSI motion measurement stays within **1.35 radians/second** of turning, with no upward/sky-looking aim. A recorded representative walk and note inspection are linked above.
- The early yearbook reveal sits on the plinth at height 0.87 and its open cover clears the nearby VSI facade.
- Sky coverage, syntax checks and the static production build pass. Reference media and review videos remain local and are excluded from the deployed game.

The scene includes **76 grounded trees**, over **280 detail placements**, five students and two peacocks. Counts are model contents, not a claim about the real campus inventory. The local QA record is in `references/processed/polish/qa.json`.

## Inferred additions and remaining uncertainty

The footage drives the architectural forms and the vocabulary of planting, furniture, surfaces and fixtures. Exact infill locations, plant species, car counts/colors, interior study furniture and ambient character routes are inferred or invented to make the world feel complete, as requested. They are not represented as measured campus facts.

The precise registration of the Upper School court remains provisional, and facade subdivisions/dimensions remain stylized estimates. All principal building/field map rectangles, the horizontal map scale, the seven destinations and the detective aesthetic are preserved. Original photos/videos remain unchanged.

Repeated meshes are instanced and there are no new runtime dependencies. Main implementation files are `src/campus-detail.js`, `src/camera-motion.js`, `src/campus-architecture.js` and `src/world.js`; `tests/polish.browser.mjs` verifies the new behavior.
