// Optional browser QA: npm install --no-save --package-lock=false playwright
// Then: node tests/browser.mjs (with `npm run dev` running in another terminal).
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = process.env.HILLION_URL || 'http://localhost:5173';
await mkdir('test-results', { recursive: true });
async function noOverflow() { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow'); }
async function choose(name) {
  await page.locator('#senior-search').fill(name);
  await page.locator('[role="option"]').filter({ hasText: name }).click();
  await page.locator('#guess-button').click();
}
async function next(count=1) { for(let i=0;i<count;i++) await page.locator('[data-action="next"]').click(); }
try {
  await page.goto(base);
  await page.waitForTimeout(1000);
  await page.screenshot({ path:'test-results/01-intro-laptop.png', fullPage:true });
  await noOverflow();
  assert.equal(await page.locator('#app img').count(),0);
  await page.locator('#help-button').click();
  assert.equal(await page.locator('#help-dialog').evaluate(dialog=>dialog.open),true);
  await page.keyboard.press('Escape');
  await page.locator('[data-action="start"]').click();
  assert.equal(await page.locator('.clue-card').count(),1);
  assert.equal(await page.locator('#guess-button').isDisabled(),true);
  await page.locator('#senior-search').fill('invalid name');
  assert.equal(await page.locator('#guess-button').isDisabled(),true);
  await choose('Aaron Brooks');
  assert.equal(await page.locator('.attempt-fraction').innerText(),'2/ 3');
  assert.ok((await page.locator('.points-ticket').innerText()).includes('900'));
  await page.locator('#senior-search').fill('aaron');
  assert.equal(await page.locator('[role="option"]').getAttribute('aria-disabled'),'true');
  await page.locator('#clear-search').click();
  await next(3);
  assert.equal(await page.locator('.clue-card').count(),4);
  assert.ok((await page.locator('.points-ticket').innerText()).includes('450'));
  await page.waitForTimeout(800);
  await page.screenshot({ path:'test-results/02-evidence-laptop.png', fullPage:true });
  await noOverflow();
  await page.locator('#senior-search').fill('mAyA');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#senior-search').inputValue(),'Maya Chen');
  await page.locator('#guess-button').click();
  assert.equal(await page.locator('.reveal-screen').count(),1);
  assert.equal(await page.locator('#app img').count(),0);
  await page.locator('[data-action="skip"]').click();
  assert.equal(await page.locator('.spotlight-screen').count(),1);
  assert.equal(await page.locator('.full-story li').count(),7);
  assert.ok((await page.locator('.result-numbers').innerText()).includes('450'));
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.locator('[data-action="share"]').click();
  const report=await page.evaluate(()=>navigator.clipboard.readText());
  assert.ok(report.includes('450/1,000'));
  assert.ok(!report.includes('Maya') && !report.includes('frog'));
  await page.waitForTimeout(800);
  await page.screenshot({ path:'test-results/03-spotlight-laptop.png', fullPage:true });
  await page.locator('[data-action="reset"]').click();
  await page.locator('[data-action="start"]').click();
  for (const person of ['Aaron Brooks','Abigail Foster','Adrian Kim']) await choose(person);
  assert.equal(await page.locator('#guess-form').count(),0);
  assert.equal(await page.locator('.attempt-token.used').count(),3);
  assert.equal(await page.locator('[data-action="finish"]').count(),0);
  await next(6);
  assert.equal(await page.locator('.clue-card').count(),7);
  assert.equal(await page.locator('#app img').count(),0);
  await page.locator('[data-action="finish"]').click();
  await page.locator('.reveal-stage.stamped').waitFor();
  await page.locator('.identity-preview img').waitFor();
  await page.screenshot({ path:'test-results/04-reveal.png', fullPage:true });
  await page.locator('.spotlight-screen').waitFor();
  assert.ok((await page.locator('.result-numbers').innerText()).includes('0 / 1,000'));
  assert.ok((await page.locator('.small-stamp').innerText()).includes('STORY DISCOVERED'));
  // Force both clipboard APIs to fail, so the manual-copy fallback is exercised.
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});document.execCommand=()=>false;});
  await page.locator('[data-action="share"]').click();
  assert.ok((await page.locator('.share-fallback').inputValue()).includes('HILLION #001'));
  assert.ok(!(await page.locator('.share-fallback').inputValue()).includes('Maya'));
  for (const width of [1280,768,390,320]) {
    await page.setViewportSize({width,height:900});
    await page.locator('#reset-button').click();
    await noOverflow();
    if(width===390){await page.waitForTimeout(1000);await page.screenshot({path:'test-results/05-intro-mobile.png',fullPage:true});}
    await page.locator('[data-action="start"]').click();
    await noOverflow();
    await page.locator('#senior-search').fill('chen');
    assert.ok(await page.locator('[role="option"]').count()>1);
    if(width===390){await page.waitForTimeout(850);await page.screenshot({path:'test-results/06-roster-mobile.png',fullPage:true});}
    await page.locator('#clear-search').click();
    await next(6);
    await noOverflow();
    await page.locator('[data-action="finish"]').click();
    await page.locator('[data-action="skip"]').click();
    await noOverflow();
    if(width===390){await page.waitForTimeout(800);await page.screenshot({path:'test-results/07-spotlight-mobile.png',fullPage:true});}
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#reset-button').click();
  await page.locator('[data-action="start"]').click();
  await choose('Maya Chen');
  assert.equal(await page.locator('.spotlight-screen').count(),1);
  assert.equal(await page.locator('.reveal-screen').count(),0);
  // Exercise native-share routing and cancellation without opening an OS sheet.
  await page.evaluate(()=>{
    const original=window.matchMedia.bind(window);
    window.matchMedia=query=>query==='(pointer: coarse)'?{matches:true}:original(query);
    Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.sharedPayload=payload;}});
  });
  await page.locator('[data-action="share"]').click();
  const nativeReport=await page.evaluate(()=>window.sharedPayload.text);
  assert.ok(nativeReport.includes('HILLION #001') && !nativeReport.includes('Maya'));
  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Canceled','AbortError');}});});
  await page.locator('[data-action="share"]').click();
  assert.ok((await page.locator('#share-status').innerText()).includes('canceled'));
  assert.deepEqual(errors,[]);
  console.log('Browser QA passed: guesses, duplicates, seven text clues, 450-point win, loss, timed reveal, skip, clipboard and manual fallback, reduced motion, keyboard search, and layouts at 1440/1280/768/390/320px.');
} finally { await browser.close(); }
