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

Seven locations interpret the supplied photos: curved limestone amphitheater and clock tower, glass STEM courtyard with horizontal metal fins, elevated breezeway, shaded oak grove and brick arch, gathering stones, glazed timber atrium and stairs, and a final courtyard with a yearbook pedestal. These are original procedural meshes, not a geographical reconstruction. The reference photos remain local and are excluded from source publication and the deployed build.

The final camera approaches the yearbook, its cover opens, and the fictional portrait appears for the first time. Skip directly to the spotlight at any point. The spotlight includes the result, portrait, message, expandable seven facts, sharing, and replay. Sharing preserves the original spoiler-free format and native-share / clipboard / manual-copy fallbacks.

## Source

- `src/game.js` and `src/data.js`: preserved rules, scoring, 140 fictional names, and curated case data.
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

One fixed fictional mystery with no persistence or daily rotation. Content is bundled in the browser. This stylized set emphasizes recognizable architectural features and a guided route rather than exact campus dimensions; there are no characters, live campus activity, or audio. WebGL2 is required, with a recovery message if it is unavailable or its context is lost.

Next, playtest travel length, clue framing, and the sense of place on the actual school laptops. Use that feedback to refine the route, foliage, and architectural detail before adding real, voluntarily submitted senior content.
