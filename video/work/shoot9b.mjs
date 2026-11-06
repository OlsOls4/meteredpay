// One-off re-shoot of the S3 refusal frame (6 Nov 2026, video rebuild).
// shoot9's refusal shot caught the dashboard header at the top of the
// viewport (renderS3 replaced the content with a shorter receipt, so the
// scroll clamped back toward the top). The Ken Burns zoom then cropped the
// "M" off the "MeteredPay" wordmark. This re-shoot scrolls twice and waits,
// so the frame starts at "Call receipt" like the other S3 shots.
import { chromium } from 'playwright-core';
import path from 'path';

const OUT = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames';
const DASH = 'file:///home/hatch/workspace/near-meteredpay/repo/video/work/dash/index.html';
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:18080'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
  const page = await ctx.newPage();
  await page.goto('about:blank');
  await page.goto(DASH + '#/s3', { waitUntil: 'load', timeout: 60000 });
  await wait(1200);
  await page.evaluate(() => window.__meteredpay.renderS3('video05-overbudget-001'));
  await wait(600);
  await page.evaluate(() => document.querySelector('#s3-detail').scrollIntoView({ block: 'start' }));
  await wait(800);
  await page.evaluate(() => document.querySelector('#s3-detail').scrollIntoView({ block: 'start' }));
  await wait(500);
  // The refusal receipt is shorter than the success receipts, so the page
  // cannot scroll the 296 px header fully out of a 1080 px viewport.
  // Hide the header/nav for this shot (same framing the success S3 shots
  // already have by scrolling); receipt content is unchanged.
  await page.evaluate(() => document.body.classList.add('hide-chrome'));
  await wait(400);
  const top = await page.evaluate(() => {
    const el = document.querySelector('#s3-detail');
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), text: el.textContent.slice(0, 40) };
  });
  console.log('s3-detail top:', JSON.stringify(top));
  await page.screenshot({ path: path.join(OUT, 'z-s3-refusal.png') });
  console.log('shot z-s3-refusal.png');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
