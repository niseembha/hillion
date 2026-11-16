# Architectural correction and physical coherence

This pass uses the nine original campus clips, their chronological contact/detail frames, the map, the supplied real/game comparison, and a new three-second contact sequence of `Hillion.mp4`. The recording is 77.96 seconds. Its timestamps identify defects in that build, not exact map registrations. The title and gameplay systems remain intact.

[Eleven real/before/after views](../references/processed/accuracy/index.html) · [Overview](../references/processed/accuracy/overview.jpg) · [Supplied-game chronological review](../references/processed/accuracy/game-contact.jpg).

## Location-by-location evidence and corrections

| Location / source | Prior model and important discrepancy | Correction / retained work |
|---|---|---|
| Field / 01:20–44; game 5–15 | Field, gym and basketball topology broadly correct; empty distant views and stylized planting persist | Map placement, gateway title and its successful first-note dolly retained; tree silhouettes varied without adding buildings |
| Gym / 01:44–64, 02:0–4, 03:0–8; game 15–27 | Pale piers and fine ceiling members understate brick/timber rhythm | Warm brick pier material, deeper cross beams, post-mounted light housings; Greenhill entrance signs and G retained |
| VSI west / 04:13–25; game 27–31 | Projecting punched-window screens already present | Existing screens and footprint retained; no invented doorway added |
| VSI canopy / 04:27–35 | Broad timber soffit and passage broadly correct | Retained canopy/support; roof zones now exclude tree trunks |
| VSI facade / 04:35–55; game 30–37 | Glass reads too uniform and louvers lack projection/support | Deeper three-dimensional horizontal louvers, diagonal brackets, heavier recessed vertical framing and additional glazing rails |
| Clocktower / 05:0–35; game 37–43 | Landmark and principal path relationship already present | Position, connected path and fitted polygonal flagstones retained; no speculative relocation |
| Upper School approach / 05:48–70, 06:0–20, 07:0–10; game 48–58 | Large repeated glass bays dominate every low block | Fulton and Korenvaes now use masonry elevations, narrow horizontal window bands, alternate door bays, broad shallow roof planes and angled masonry entry shoulders |
| Upper School court / 08:0–13; game 58–63 | Weak paving differentiation; trees conflict with covered-edge placement; paving runs beneath trunks | Redder running-bond brick, cut-out planted tree well, shifted table, and an approach along the covered edge that leaves the tree clear of the player lane |
| MPAC / 09:14–44; game 63–76 | Cantilever/lobby already recognizable; upper glazing too tall | Retained cantilever, recessed lobby, slim supports and chairs; reduced upper window height and matching reveals |

## Intersections and placement

The prior exclusion system checked building rectangles and sampled paths, but did not consider other hard furniture or covered roof footprints. Placement now also excludes registered hard-prop radii and tree trunks. Picnic tables join the same placement records before rendering; subsequent furniture and planting cannot occupy them. Foliage overlap is permitted; tree trunks are excluded from covered walks. The old court trees were replaced with a deliberately reserved well and the approach was adjusted within the same court, without moving a major building or clue.

`?placement` is a developer-only view showing hard-prop clearance circles, sampled camera lanes and a console table of placements. Normal play creates none of this diagnostic geometry. The automated audit checks roof/trunk intersections and registered hard-prop pairs; rendered ray sweeps check actual walls, posts and furniture along approaches at foot and upper-body heights. These tests complement each other: conservative circles are not proof that every triangle in the scene is intersection-free.

## Camera cause and fix

Leaving a close envelope could begin positional travel while the next route lay largely behind the current view. The existing quaternion rate limit prevented a literal snap, but the resulting translation during the turn felt dragged sideways. Large departure turns now receive a short stationary orientation lead-in, with eased target interpolation, before the existing soft-start walking curve begins. Small turns and the title dolly retain their prior behavior. Rotation remains delta-time based and bounded; inspection, clues, scoring, reveal and reset are preserved.

## QA and limits

The eleven comparison views use identical before/after map cameras, covering field, gym, VSI, clocktower, Upper School and MPAC. Rendered images were inspected, including revised material contrast, louvers and court paving. The Upper School camera registration remains **low confidence**: the footage does not establish an exact court plan, and its same-angle comparison still exposes a background sightline that is less enclosed than the real campus. This remains a limitation, not grounds to invent major buildings.

35 Node tests, syntax checks, the static production build, full gameplay/mobile regression and rendered clearance checks pass. The additional architecture regression runs every guided leg without Arrive-now, inspects all seven notes and measures camera continuity; results and fourteen walkthrough screenshots are written to `references/processed/accuracy/walk/`. Review artifacts and source footage stay local and are excluded from deployment.

Remaining approximations include measured facade dimensions, exact Upper School entrance registration, mature canopy shapes, hidden wall openings and interiors. Window recesses remain stylized surface assemblies rather than surveyed interiors. No claim of survey-level reconstruction or exhaustive mesh-pair collision proof is made. No new runtime dependency or heavy rendering effect was added.
