/**
 * Captures full workflow screenshots for the README.
 * Run: node scripts/capture-screenshots.cjs
 * Requires: npm run dev running in another terminal.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT    = path.join(__dirname, '..', 'docs', 'screenshots');
const APP    = 'http://localhost:5174';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BRIEF  = 'Launch campaign for Notion AI — target SaaS product managers at B2B companies. Goal: signups. Tone: smart, confident, slightly witty. Channels: LinkedIn, Email, Twitter.';

async function shot(page, name, label) {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log(`  ✓  ${label}`);
}

async function waitForOneOf(page, selectors, timeout = 120000) {
  return Promise.race(
    selectors.map(sel =>
      page.waitForSelector(sel, { timeout }).then(() => sel)
    )
  );
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('\n📸  Brief → Campaign — screenshot capture\n');

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 860 });

  // ── 1. Brief input (idle) ─────────────────────────────────────────────────
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await shot(page, '01-brief-input.png', 'Screen 1: Brief input');

  // ── 2. Brief filled ───────────────────────────────────────────────────────
  await page.fill('textarea', BRIEF);
  await page.waitForTimeout(300);
  await shot(page, '02-brief-filled.png', 'Screen 2: Brief filled in');

  // ── Submit ────────────────────────────────────────────────────────────────
  await page.click('button:has-text("Generate Campaign")');
  await page.waitForTimeout(1200);
  await shot(page, '03-agents-running.png', 'Screen 3: Agents running + trace panel');

  // ── Wait for next gate: clarification OR concept picker OR error ──────────
  console.log('  ⏳  Waiting for API responses (up to 2 min)…');
  const next = await waitForOneOf(page, [
    'button:has-text("Regenerate concepts")',
    'button:has-text("Continue to Strategy")',
    'button:has-text("Try again")',
  ], 120000);

  if (next.includes('Try again')) {
    await shot(page, '03b-error.png', 'Error state');
    console.error('\n❌  Hit error state — check 03b-error.png');
    await browser.close();
    process.exit(1);
  }

  // ── Handle clarification gate ─────────────────────────────────────────────
  if (next.includes('Continue to Strategy')) {
    console.log('  ℹ️   Clarification gate — answering…');
    await shot(page, '04-clarification.png', 'Screen 4: Clarification gate');
    const inputs = await page.locator('input[type="text"]').all();
    const answers = ['SaaS product managers', 'signups', 'smart and professional'];
    for (let i = 0; i < inputs.length; i++) {
      await inputs[i].fill(answers[i] || 'professional');
    }
    await page.waitForTimeout(300);
    await page.click('button:has-text("Continue to Strategy")');
    console.log('  ⏳  Waiting for Strategy agent…');
    await page.waitForSelector('button:has-text("Regenerate concepts")', { timeout: 120000 });
  }

  // ── 5. Concept picker ─────────────────────────────────────────────────────
  await page.waitForTimeout(400);
  await shot(page, '05-concept-picker.png', 'Screen 5: Concept picker');

  // Click the first concept card (they contain a confidence %)
  const allBtns = await page.locator('button').all();
  let picked = false;
  for (const btn of allBtns) {
    const txt = await btn.textContent().catch(() => '');
    if (txt && txt.includes('%')) {
      await btn.click();
      picked = true;
      break;
    }
  }
  if (!picked) await page.locator('button').nth(1).click();

  await page.waitForTimeout(900);
  await shot(page, '06-copy-writing.png', 'Screen 6: Copy agent writing');

  // ── Wait for campaign pack or error ──────────────────────────────────────
  console.log('  ⏳  Waiting for Critic + campaign pack…');
  const finalState = await waitForOneOf(page, [
    'button:has-text("Start new campaign")',
    'button:has-text("Try again")',
  ], 120000);

  if (finalState.includes('Try again')) {
    await shot(page, '07-error-state.png', 'Error state after copy/critic');
    console.error('\n❌  Hit error state at campaign pack stage — see 07-error-state.png');
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(500);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await shot(page, '07-campaign-pack-top.png', 'Screen 7: Campaign pack — top');

  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(300);
  await shot(page, '08-campaign-pack-linkedin.png', 'Screen 8: Campaign pack — LinkedIn');

  await page.evaluate(() => window.scrollTo(0, 1100));
  await page.waitForTimeout(300);
  await shot(page, '09-campaign-pack-twitter-email.png', 'Screen 9: Campaign pack — Twitter + Email');

  await browser.close();
  console.log('\n✅  Done — all screenshots saved to docs/screenshots/\n');
}

run().catch(err => {
  console.error('\n❌ ', err.message);
  process.exit(1);
});
