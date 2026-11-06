// Re-shoot guided + S3 frames for the video rebuild (6 Nov 2026).
// Uses the video-copy dash (video/work/dash) whose guided flow now runs
// success -> fail -> timeout -> refusal (timeout a normal step), with the
// "N of N" progress + playback-note footer removed and the S3 "Balance
// before" section dropped so receipts fit one 1080px frame.
// Guided shots: 1.5x zoom (1280x720 viewport, DSF 1.5) like shoot3.
// S3 shots: 1.0x (1920x1080 viewport, DSF 1.0) so the whole receipt fits.
// Static PLAYBACK data only — no seller API needed; proxy is for RPC
// reads only (S2/S5 not re-shot here).
import { chromium } from 'playwright-core';
import path from 'path';

const OUT = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames';
const DASH = 'file:///home/hatch/workspace/near-meteredpay/repo/video/work/dash/index.html';
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:18080'] });
  // --- 1.5x guided shots ---
  const ctx15 = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  const page = await ctx15.newPage();
  async function zshot(name, url, setup) {
    await page.goto('about:blank');
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await wait(1500);
    if (setup) await setup();
    await wait(800);
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('shot', name);
  }
  const guided = async (clicks) => {
    await page.click('#guided-start'); await wait(1000);
    for (const c of clicks) { await page.click(c); await wait(1000); }
    await page.evaluate(() => document.querySelector('#guided').scrollIntoView({ block: 'start' }));
  };
  await zshot('z-guided-success1.png', DASH + '#/s1', () => guided([]));
  await zshot('z-guided-fail.png', DASH + '#/s1', () => guided(['#guided-next']));
  await zshot('z-guided-timeout.png', DASH + '#/s1', () => guided(['#guided-next', '#guided-next']));
  await zshot('z-guided-refusal.png', DASH + '#/s1', () => guided(['#guided-next', '#guided-next', '#guided-next']));
  await ctx15.close();
  // --- 1.0x S3 shots ---
  const ctx10 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
  const p2 = await ctx10.newPage();
  async function s3shot(name, callId) {
    await p2.goto('about:blank');
    await p2.goto(DASH + '#/s3', { waitUntil: 'load', timeout: 60000 });
    await wait(1200);
    await p2.evaluate((id) => window.__meteredpay.renderS3(id), callId);
    await wait(600);
    await p2.evaluate(() => document.querySelector('#s3-detail').scrollIntoView({ block: 'start' }));
    await wait(400);
    await p2.screenshot({ path: path.join(OUT, name) });
    console.log('shot', name);
  }
  await s3shot('z-s3-success1.png', 'video05-success-001');
  await s3shot('z-s3-success2.png', 'video05-success-002');
  await s3shot('z-s3-refusal.png', 'video05-overbudget-001');
  await s3shot('z-s3-timeout.png', 'video05-timeout-001');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
