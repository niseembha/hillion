# Hillion v0.2 — Follow the story

Seven clues. One Greenhill senior. A guided first-person mystery through a compact, stylized 3D campus.

## Run

Requires Node.js 20+ and a browser with WebGL2 / hardware acceleration.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. If another server is using that port, run `PORT=5174 npm run dev` and open port 5174 instead.

```sh
npm test
npm run check
npm run build
```

The build is a static `dist/` folder, including locally hosted Three.js and its MIT license. Preview that output with `node scripts/serve.mjs --dist`. There is no backend, account, remote asset service, or runtime CDN dependency.

## The experience

Start the mystery, follow an automatic eye-height camera journey, and inspect an envelope at each stop. A compact note lets you guess or continue. Previous clues stay available through **Collected notes**. **Arrive now** skips any journey. The wave icon enables calm motion; the operating system's reduced-motion preference is also respected.

Seven clue stops follow the supplied Greenhill campus map and nine recorded walking clips: Brinkmann Field → Phillips athletic entrance → VSI / STEM + Innovation Center → Briggs Clocktower → eastern Foote Quadrangle → Fulton Upper School → MPAC. The geography is evidence-led; the procedural architecture remains stylized. Timestamp registrations, uncertainties and matched comparisons are documented in [the reconstruction](docs/campus-route-reconstruction.md) and [architecture and spacing review](docs/campus-architecture-spacing.md). Reference footage and extracted images remain local and are excluded from publication and the deployed build.

The final camera approaches the yearbook, its cover opens, and the fictional portrait appears for the first time. Skip directly to the spotlight at any point. The spotlight includes the result, portrait, message, expandable seven facts, sharing, and replay. Sharing preserves the original spoiler-free format and native-share / clipboard / manual-copy fallbacks.

## Source

- `src/game.js` and `src/data.js`: preserved rules, scoring, 140 fictional names, and curated case data.
- `src/campus-architecture.js`: footage-specific massing, roof profiles, facade details, colonnades and physical space around the route.
- `src/world.js`: Three.js scene, batched geometry, lighting, procedural textures, environmental motion, camera journeys, envelope markers, and animated yearbook.
- `src/route.js`: seven eye-height stops, look directions, envelope positions, safe path waypoints, and timing. Adjust this file to tune pacing and framing.
- `src/app.js`: coordinates gameplay with traveling, discovery, clue reading, reveal, and spotlight views. Restarting cancels pending journeys and reveal callbacks.
- `src/roster-ui.js` and `src/share.js`: adapted search / validation and result-sharing interactions.
- `src/style.css`: minimal HUD, focused note, contextual controls, spotlight, and responsive presentation.

Three.js is the only runtime dependency. The world uses instanced geometry, capped pixel density, and cached sun shadows. No physics engine, free-roam controls, model downloads, React, or animation library.

For development testing, the fictional answer is **Maya Chen**. Restart with the Hillion wordmark, the help menu, or **Play again** in the spotlight. Refreshing also starts over.

## Browser verification

With Chrome and Playwright available, start the server and run:

```sh
node tests/browser.mjs
```

Playwright is optional QA tooling; install it with `npm install --no-save --package-lock=false playwright`, or set `PLAYWRIGHT_MODULE_PATH` to an existing installation's module. `HILLION_URL` overrides the default preview URL. Screenshots are saved in ignored `test-results/`.

The checks cover real WebGL rendering, guided movement and in-world markers, all seven clue locations, valid / invalid / duplicate guesses, a 450-point clue-four win, a three-guess loss with continued exploration, reveal and skip, collected clues, sharing fallbacks, keyboard search, reduced motion, restarting during a journey, and 1440/1280/768/390/320px layouts. The native OS share sheet is simulated; actual clipboard copying is exercised in Chrome.

## Deliberate limits and next steps

One fixed fictional mystery with no persistence or daily rotation. Content is bundled in the browser. The model follows the map's building positions and the footage's exterior route and sightlines. Dimensions remain schematic, and the exact Upper School court sequence is provisional. There are no characters, live campus activity, or audio. WebGL2 is required, with a recovery message if it is unavailable or its context is lost.

Next, playtest travel length, clue framing, and the sense of place on the actual school laptops. Use that feedback to refine the route, foliage, and architectural detail before adding real, voluntarily submitted senior content.

### Footage-based geography update

`src/campus-layout.js` records ground footprints and open roofed passages from the annotated map. `src/route.js` keeps seven clue stops and evidence-based intervening waypoints. East is +X, north is −Z; the 0.24-unit-per-map-pixel scale is illustrative, not surveyed. Buildings no longer rely on decorative models placed independently of their map footprints.

`?overhead` shows a top-down route view. `?survey` exposes the world for the timestamped comparison cameras in `src/campus-survey.js`. Normal gameplay has no geography debugging controls. `scripts/process-campus-videos.py`, `scripts/capture-campus-survey.mjs` and `scripts/compare-campus-survey.py` reproduce local evidence sheets and before/after triptychs. Playwright and Pillow are optional QA tools, not runtime dependencies.

Geography tests sample each smoothed route against mapped ground occupancy. `tests/campus-video.browser.mjs` also checks the rendered routes against walls, posts, trees and furniture, plus the straight covered walk, open VSI undercroft, MPAC lobby setback and upward-facing paving. `tests/gym.browser.mjs` forwards to these updated checks; the old arch-specific geometry was contradicted by the footage. Early correct guesses still reveal the yearbook at the current clue location.

The architecture pass retains the map registrations and expands horizontal space around eye-height buildings and furniture. The gym arcade, low pitched pavilions, VSI fin/curtain-wall system and MPAC limestone cantilever are distinct procedural models. Clearances are checked at foot and eye height, across a 1.3-unit pedestrian band; see the architecture review for measured model spans and reference limits.
