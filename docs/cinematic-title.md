# The Greenhill gateway title screen

The opening now looks north from the eastern walkway near Brinkmann's northern end, toward Phillips Gymnasium, its covered walk and the Rotunda. Four live camera studies compared this gateway, a closer athletic view, Foote Quadrangle and the VSI walk. The quad offered attractive foliage but required a long journey back to clue one; the gateway retains a short, continuous entrance into the existing mystery.

The actual campus renderer, buildings, map footprints and scene instance are retained. New landscape infill sits beyond the playing-field boundary and south of the basketball slab: three framing trees, a small mulched bed and one additional peacock on a short lawn route. The infill locations are art-directed estimates, not surveyed campus features. Reference photos and the prior video analysis informed tree-lined walks, low planting, campus fixtures and architectural vocabulary. No reference image serves as the background.

Lighting uses the existing hemisphere, directional sun, shadow cache, sky and fog. A lower, warmer sun produces longer shadows; reduced ambient intensity gives the facades and foliage more depth. There is no postprocessing dependency or bloom. Golden-hour grading is consistent throughout play.

A large, tracked ivory serif HILLION wordmark replaces the small header branding on the title screen. A gold punctuation accent, the exact tagline, a restrained ornament and BEGIN MYSTERY form the hierarchy. Help, motion and supported fullscreen controls remain. The world, title and button enter in a short stagger; reduced motion removes these effects.

Existing foliage movement, drifting motes/clouds and distant students remain active. The new peacock walks, pauses and turns on the lawn, with a moving contact shadow. No camera sway was added, keeping the lettering and view stable.

Starting responds immediately, fades a noninteractive copy of the title for 650 ms, and begins a continuous dolly toward the first field note. The first approach is updated for the nearer gateway camera. Its aim eases from the establishing view to the envelope, with the existing bounded camera rotation. There is no scene replacement, canvas replacement, loading screen or teleport. All seven clues, destinations, scoring and subsequent walks remain intact. Arrive-now, reset and calm motion retain their existing behavior.

Validation: 35 Node tests, syntax/build checks, the full desktop/mobile gameplay regression, actual rendered route/actor clearance checks, and a focused title test. The title test checks the same canvas throughout Start, camera step/rotation continuity, desktop/mobile/landscape button bounds, first-note inspection and reset. Review screenshots and motion metrics are generated in `test-results/title/` (local, not deployed).

Remaining limitations: the architecture retains its existing stylized approximations; the new landscaping is inferred. The browser review uses automated Chrome screenshots rather than a human-operated device. Frame continuity is measured locally, not a performance guarantee for all phones.
