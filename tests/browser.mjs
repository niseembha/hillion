// Start `npm run dev`, then run this with an installed Playwright and Chrome.
// PLAYWRIGHT_MODULE_PATH can point at an existing installation, without adding a dependency.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [], failedRequests = [], portraits = [];
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => failedRequests.push(request.url()));
page.on('request', request => { if (request.url().endsWith('/assets/maya.svg')) portraits.push(request.url()); });
const base = process.env.HILLION_URL || 'http://localhost:5173';
await mkdir('test-results', { recursive: true });
const view = name => page.locator(`body[data-view="${name}"]`).waitFor({ state: 'visible', timeout: 20000 });
async function screenshot(name) { await page.waitForTimeout(700); await page.screenshot({ path: `test-results/${name}.png` }); }
async function noOverflow() { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow'); }
async function arrive(instant = true) {
  if (instant) await page.locator('[data-action="arrive"]').click();
  await view('discover');
  await page.waitForTimeout(650);
  const pin = await page.locator('#discovery-pin').boundingBox();
  const size = page.viewportSize();
  assert.ok(pin && pin.x >= 0 && pin.y > 90 && pin.x + pin.width < size.width + 1 && pin.y + pin.height < size.height, 'Envelope marker stays in the viewport');
  await page.locator('#discovery-pin').click();
  await view('clue');
}
async function next(instant = true) { await page.locator('[data-action="next"]').click(); await arrive(instant); }
async function choose(name) {
  if (!await page.locator('#guess-form').count()) await page.locator('[data-action="guess-toggle"]').click();
  await page.locator('#senior-search').fill(name);
  await page.locator('[role="option"]').filter({ hasText: name }).click();
  await page.locator('[type="submit"]').click();
}
async function reset() { await page.locator('#home-button').click(); await view('intro'); }
try {
  await page.goto(base);
  await view('intro');
  assert.equal(await page.locator('#campus-world').getAttribute('data-ready'), 'true');
  await page.waitForTimeout(1200);
  const before = Number(await page.locator('canvas').getAttribute('data-frames'));
  await screenshot('3d-01-intro');
  const after = Number(await page.locator('canvas').getAttribute('data-frames'));
  assert.ok(after > before + 10, 'The WebGL world renders continuously');
  assert.equal(portraits.length, 0, 'No portrait is loaded on the title screen');
  await noOverflow();
  await page.locator('#help-button').click();
  assert.equal(await page.locator('#help-dialog').evaluate(dialog => dialog.open), true);
  await page.keyboard.press('Escape');
  await page.locator('[data-action="start"]').click();
  await view('travel');
  assert.equal(await page.locator('.clue-overlay').count(), 0, 'UI leaves the world clear during travel');
  await arrive(false); // First journey is timed, not skipped.
  assert.equal(portraits.length, 0);
  await screenshot('3d-02-amphitheater');
  await choose('Aaron Brooks');
  assert.ok((await page.locator('.hud-score').innerText()).includes('900'));
  assert.equal(await page.locator('.attempt-dots .used').count(), 1);
  await page.locator('#senior-search').fill('aaron');
  assert.equal(await page.locator('[role="option"]').getAttribute('aria-disabled'), 'true');
  await page.locator('.clear-search').click();
  await page.locator('#senior-search').fill('invalid name');
  assert.equal(await page.locator('[type="submit"]').isDisabled(), true);
  await next(); await screenshot('3d-03-glass-courtyard');
  await next(); await screenshot('3d-04-breezeway');
  await next(); await screenshot('3d-05-oaks');
  assert.ok((await page.locator('.hud-score').innerText()).includes('450'));
  await page.locator('[data-action="history"]').click();
  assert.equal(await page.locator('#history-list li').count(), 4);
  await page.keyboard.press('Escape');
  await page.locator('[data-action="guess-toggle"]').click();
  await page.locator('#senior-search').fill('mAyA');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#senior-search').inputValue(), 'Maya Chen');
  await page.locator('[type="submit"]').click();
  await view('reveal');
  assert.equal(portraits.length, 0, 'The answer image is not requested before the reveal');
  await page.locator('[data-action="skip"]').click();
  await view('spotlight');
  assert.ok((await page.locator('.result-report').innerText()).includes('450'));
  await page.locator('.spotlight-facts summary').click();
  assert.equal(await page.locator('.spotlight-facts li').count(), 7);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('[data-action="share"]').click();
  const report = await page.evaluate(() => navigator.clipboard.readText());
  assert.ok(report.includes('450/1,000') && !report.includes('Maya') && !report.includes('frog'));
  await page.locator('.spotlight-facts summary').click();
  await screenshot('3d-06-spotlight');
  await reset();
  await page.locator('[data-action="start"]').click(); await arrive();
  for (const name of ['Aaron Brooks', 'Abigail Foster', 'Adrian Kim']) await choose(name);
  assert.equal(await page.locator('#guess-form').count(), 0);
  assert.equal(await page.locator('.attempt-dots .used').count(), 3);
  assert.equal(await page.locator('[data-action="finish"]').count(), 0);
  await next(); await next(); await next();
  await next(); await screenshot('3d-07-gathering-stones');
  await next(); await screenshot('3d-08-atrium');
  await next(false); await screenshot('3d-09-last-courtyard'); // Confirm the atrium exit route completes.
  assert.equal(await page.locator('#app img').count(), 0);
  assert.ok((await page.locator('.clue-text').innerText()).includes('purple streak'));
  await page.locator('[data-action="finish"]').click();
  await page.locator('.reveal-screen.identity').waitFor({ state: 'visible', timeout: 20000 });
  await screenshot('3d-10-yearbook-reveal');
  await view('spotlight');
  assert.ok((await page.locator('.result-report').innerText()).includes('0/1,000'));
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); document.execCommand = () => false; });
  await page.locator('[data-action="share"]').click();
  assert.ok((await page.locator('.share-fallback').inputValue()).includes('HILLION #001'));
  assert.ok(!(await page.locator('.share-fallback').inputValue()).includes('Maya'));
  await page.evaluate(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = query => query === '(pointer: coarse)' ? { matches: true } : original(query);
    Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => { window.sharedPayload = payload; } });
  });
  await page.locator('[data-action="share"]').click();
  assert.ok(!(await page.evaluate(() => window.sharedPayload.text)).includes('Maya'));
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Canceled', 'AbortError'); } }));
  await page.locator('[data-action="share"]').click();
  assert.ok((await page.locator('#share-status').innerText()).includes('canceled'));
  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width > 600 ? 800 : 844 });
    await reset(); await noOverflow();
    if (width === 390) await screenshot('3d-11-mobile-intro');
    await page.locator('[data-action="start"]').click(); await arrive();
    await noOverflow();
    await page.locator('[data-action="guess-toggle"]').click();
    await page.locator('#senior-search').fill('chen');
    assert.equal(await page.locator('[role="option"]').count(), 2);
    const bounds = await page.locator('.clue-overlay').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y > 130 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= 844, `Clue fits at ${width}px`);
    if (width === 390) await screenshot('3d-12-mobile-clue');
    await choose('Maya Chen');
    await page.locator('[data-action="skip"]').click();
    await noOverflow();
    if (width === 390) await screenshot('3d-13-mobile-spotlight');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await reset();
  await page.locator('[data-action="start"]').click(); await arrive(false);
  await choose('Maya Chen'); await view('spotlight');
  assert.equal(await page.locator('.reveal-screen').count(), 0);
  // Reset during a pending journey cannot later open an obsolete clue.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await reset(); await page.locator('[data-action="start"]').click(); await reset();
  await page.waitForTimeout(4500); await view('intro');
  assert.equal(await page.locator('#discovery-pin').isHidden(), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  console.log('3D browser QA passed: live WebGL rendering, guided travel, seven distinct stops, inspectable envelopes, preserved guesses and scoring, both endings, yearbook reveal, skip, history, share/copy fallbacks, keyboard search, reduced motion, reset cancellation, and layouts at 1440/1280/768/390/320px.');
} finally { await browser.close(); }
