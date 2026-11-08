// v3.2 re-shoot of the S3 receipt frames (8 Nov 2026) — second attempt.
// Fix: seller-service line no longer breaks "tedi/ous-sea.testnet" mid-word
// (video/work/dash/app.js: <br> before the seller account span).
//
// Framing MUST replicate shoot9.mjs's S3 section exactly, which produced
// the v3 frames: viewport 1920x1080, DSF 1.0 (the "z-" prefix is a
// misnomer — shoot9 shot z-s3-* at 1.0x "so the whole receipt fits"),
// renderS3(call), #s3-detail scrollIntoView, screenshot.
// Do NOT use shoot6.mjs (1280x720 DSF 1.5 for z-, no scroll, no
// hide-chrome — shoots the header/nav and a WIDER column) and do NOT add
// hide-chrome or scroll anything else: both wrong framings were tried
// and rejected on 8 Nov (diffs across the whole frame, "Call receipt"
// pushed off the top, balance boxes cut off the bottom).
import { chromium } from 'playwright-core';
import path from 'path';

const OUT = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames';
const DASH = 'file:///home/hatch/workspace/near-meteredpay/repo/video/work/dash/index.html';
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
// Only the two success receipts are re-shot: they are the only S3 frames
// whose seller-service line breaks "tedi/ous-sea.testnet" mid-word.
// fail/timeout/refusal are left at their v3.1 bytes (fail+timeout are not
// used by the 2-min video at all; refusal has no seller suffix, so no wrap).
const CALLS = ['video05-success-001', 'video05-success-002'];
const SHORT = { 'video05-success-001': 'success1', 'video05-fail-001': 'fail', 'video05-timeout-001': 'timeout', 'video05-success-002': 'success2', 'video05-overbudget-001': 'refusal' };

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:18080'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
  const page = await ctx.newPage();
  for (const call of CALLS) {
    await page.goto('about:blank');
    await page.goto(DASH + '#/s3', { waitUntil: 'load', timeout: 60000 });
    await wait(1200);
    await page.evaluate((c) => window.__meteredpay.renderS3(c), call);
    await wait(600);
    await page.evaluate(() => document.querySelector('#s3-detail').scrollIntoView({ block: 'start' }));
    await wait(400);
    await page.screenshot({ path: path.join(OUT, 'z-s3-' + SHORT[call] + '.png') });
    await page.screenshot({ path: path.join(OUT, 's3-' + SHORT[call] + '.png') });
    console.log('shot z-s3-' + SHORT[call] + '.png + s3-' + SHORT[call] + '.png', 'for', call);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
