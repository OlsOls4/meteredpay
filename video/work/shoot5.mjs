import { chromium } from 'playwright-core';
import path from 'path';
const OUT = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames';
const DASH = 'file:///home/hatch/workspace/near-meteredpay/repo/video/work/dash/index.html';
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:18080'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  for (const call of ['video05-fail-001', 'video05-timeout-001']) {
    await page.goto('about:blank');
    await page.goto(DASH + '#/s3?call=' + call, { waitUntil: 'load', timeout: 60000 });
    await wait(1500);
    await page.waitForFunction(() => { const m = document.querySelector('#view-s3'); return m && m.textContent.includes('video05-'); }, undefined, { timeout: 60000 });
    await wait(800);
    const name = call === 'video05-fail-001' ? 'z-s3-fail.png' : 'z-s3-timeout.png';
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('shot', name);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
