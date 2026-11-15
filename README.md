# Hillion v0.1

Seven clues. One Greenhill senior. A small, fully playable fictional mystery built with native HTML, CSS, JavaScript, and original SVG illustrations. No runtime dependencies, backend, or real student data.

## Run

Requires Node.js 20 or later. No install step needed.

```sh
npm run dev
```

Open **http://localhost:5173**. Use **Reset round** at any time, or replay from the spotlight. Set `PORT` to change the default port. `npm run build` produces a static `dist/` folder; serve it with `node scripts/serve.mjs --dist` or any static web host.

```sh
npm test
npm run check
npm run build
```

Optional browser checks: with Chrome installed, install Playwright temporarily (`npm install --no-save --package-lock=false playwright`), run the local server, then `node tests/browser.mjs`. Screenshots go into ignored `test-results/`. An existing Playwright installation can be supplied through `PLAYWRIGHT_MODULE_PATH`.

## Content and behavior

- `src/data.js`: the curated seven-clue case, 140 fictional roster names, scoring table, spotlight text, and portrait path. The answer is **Maya Chen** for development testing.
- `src/game.js`: pure state transitions, scoring, roster filtering, and spoiler-free result formatting.
- `src/app.js`: dossier, autocomplete, animated reveal, spotlight, clipboard/native-share/manual-copy handling, and accessible interactions.
- `src/style.css`: responsive paper-and-campus presentation, native CSS animations, and reduced-motion support.
- `assets/`: original local campus and fictional portrait illustrations. No student photo, official school logo, third-party image, or remote font dependency.

Each wrong guess costs one of three attempts and 100 potential points. Clues remain reviewable in the scrollable evidence sheet. After three wrong guesses, uncover the rest of the evidence before opening the spotlight. On clue seven, players may also finish voluntarily for zero points; that button states the outcome explicitly. The reveal takes about four seconds and can be skipped. Reduced-motion users go directly to the spotlight.

## Deliberate limits

One fixed fictional case; the “today” language demonstrates the eventual daily experience. Refreshing resets the round. No accounts, storage, analytics, backend, daily scheduling, roster service, or student submission system. Mock data is bundled in the browser, so this prototype is not resistant to inspecting the source. Sharing uses the native share sheet on touch devices when available, clipboard on desktop, and a selectable text fallback. The shared report contains no identity, facts, or submitted names.

Next, playtest the clue order and pacing with a small group, refine the campus art and spotlight from that feedback, then replace the fictional case with curated, voluntarily submitted student content.
