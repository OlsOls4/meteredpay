// Wave-4 fix-up shoot (6 Nov 2026, ~00:10 UTC): re-shoot ONLY
// s5-audit-fit.png. The first version's window scroll never landed:
// #audit-rows.scrollIntoView() scrolled the .table-wrap instead of the
// window, and #seller-health filled in after the scroll, so the frame
// starts mid-step-3 (a half-line of text at the top edge). This version
// waits for #seller-health to settle, widens main, then scrolls the
// WINDOW explicitly to the "Dispute audit" heading. Same live contract
// read, same buyer, no new run.
import { chromium } from 'playwright-core';
import path from 'path';

const OUT = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames';
const DASH = 'file:///home/hatch/workspace/near-meteredpay/repo/video/work/dash/index.html';
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:18080'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const waitFor = (fn, timeout) => page.waitForFunction(fn, undefined, { timeout });
  await page.goto('about:blank');
  await page.goto(DASH + '#/s5', { waitUntil: 'load', timeout: 60000 });
  await wait(1500);
  await waitFor(() => {
    const el = document.querySelector('#replay-result');
    return el && el.textContent.trim().length > 40;
  }, 120000);
  await waitFor(() => {
    const rows = document.querySelectorAll('#audit-rows tr');
    return rows.length >= 5 && !/Loading/.test(document.querySelector('#audit-rows').textContent);
  }, 120000);
  try {
    await waitFor(() => {
      const el = document.querySelector('#seller-health');
      return el && el.textContent.trim().length > 10;
    }, 30000);
  } catch { console.log('seller-health did not settle in 30 s; continuing'); }
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.style.maxWidth = '1880px';
    document.querySelectorAll('.table-wrap').forEach(el => { el.style.overflowX = 'visible'; });
  });
  await wait(400);
  // The page is only ~1623 px tall after widening, so window scrolling
  // cannot bring the audit heading to the top (max scrollY 543). Give
  // the body a tall min-height for this shot only (a framing-only live
  // DOM edit, never a repo change), then scroll the window to the
  // "Dispute audit" heading. The clip API is viewport-relative in this
  // Playwright build, so a normal viewport screenshot is used instead.
  const target = await page.evaluate(() => {
    const h3 = [...document.querySelectorAll('h3')].find(e => e.textContent.includes('Dispute audit'));
    if (!h3) return -1;
    const y = Math.max(0, h3.getBoundingClientRect().top + window.scrollY - 12);
    document.body.style.minHeight = (y + 1100) + 'px';
    return y;
  });
  console.log('target', target);
  await page.evaluate((y) => window.scrollTo(0, y), target);
  await wait(600);
  console.log('scrollY now', await page.evaluate(() => window.scrollY));
  await page.screenshot({ path: path.join(OUT, 's5-audit-fit.png') });
  console.log('shot s5-audit-fit.png (fix-up)');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
