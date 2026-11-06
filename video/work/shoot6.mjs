// Re-shoot ALL S3 receipt frames. Root cause of the earlier bad shots:
// route() does VIEWS.indexOf(hash-after-#/ ) — '#/s3?call=X' is not in
// VIEWS, so it falls back to S1. Fix: load '#/s3' (view switch works),
// then call the exposed renderS3(callId) directly, and verify visibility.
import { chromium } from 'playwright-core';
import path from 'path';
const OUT = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames';
const DASH = 'file:///home/hatch/workspace/near-meteredpay/repo/video/work/dash/index.html';
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const CALLS = ['video05-success-001', 'video05-fail-001', 'video05-timeout-001', 'video05-success-002', 'video05-overbudget-001'];
const SHORT = { 'video05-success-001': 'success1', 'video05-fail-001': 'fail', 'video05-timeout-001': 'timeout', 'video05-success-002': 'success2', 'video05-overbudget-001': 'refusal' };
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:18080'] });
  for (const [vw, vh, dsf, prefix] of [[1920, 1080, 1, 's3-'], [1280, 720, 1.5, 'z-s3-']]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf });
    const page = await ctx.newPage();
    for (const call of CALLS) {
      await page.goto('about:blank');
      await page.goto(DASH + '#/s3', { waitUntil: 'load', timeout: 60000 });
      await wait(1200);
      const vis = await page.evaluate(() => {
        const el = document.querySelector('#view-s3');
        return el && getComputedStyle(el).display !== 'none' && !el.hidden;
      });
      if (!vis) throw new Error('S3 view not visible for ' + call);
      await page.evaluate((c) => window.__meteredpay.renderS3(c), call);
      await wait(600);
      const ok = await page.evaluate((c) => {
        const d = document.querySelector('#s3-detail');
        return d && d.textContent.includes('Call ' + c);
      }, call);
      if (!ok) throw new Error('S3 detail did not render ' + call);
      await page.screenshot({ path: path.join(OUT, prefix + SHORT[call] + '.png') });
      console.log('shot', prefix + SHORT[call] + '.png', 'for', call);
    }
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
