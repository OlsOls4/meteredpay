// Re-capture the 150%-zoom money-beat frames correctly:
// a fresh browser context with deviceScaleFactor 1.5 + 1280x720 viewport
// yields 1920x1080 screenshots, and every shot starts from about:blank so
// hash-only navigations cannot carry guided JS state across shots.
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
  const waitFor = (fn, timeout) => page.waitForFunction(fn, undefined, { timeout });
  async function zshot(name, url, setup) {
    await page.goto('about:blank');
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await wait(1500);
    if (setup) await setup();
    await wait(800);
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('shot', name);
  }
  await zshot('z-guided-success1.png', DASH + '#/s1', async () => {
    await page.click('#guided-start'); await wait(1200);
    await page.evaluate(() => document.querySelector('#guided').scrollIntoView({ block: 'start' }));
  });
  await zshot('z-guided-fail.png', DASH + '#/s1', async () => {
    await page.click('#guided-start'); await wait(1000);
    await page.click('#guided-next'); await wait(1200);
    await page.evaluate(() => document.querySelector('#guided').scrollIntoView({ block: 'start' }));
  });
  await zshot('z-guided-refusal.png', DASH + '#/s1', async () => {
    await page.click('#guided-start'); await wait(1000);
    await page.click('#guided-next'); await wait(800);
    await page.click('#guided-next'); await wait(1200);
    await page.evaluate(() => document.querySelector('#guided').scrollIntoView({ block: 'start' }));
  });
  await zshot('z-guided-timeout.png', DASH + '#/s1', async () => {
    await page.click('#guided-start'); await wait(1000);
    await page.click('#guided-next'); await wait(800);
    await page.click('#guided-next'); await wait(800);
    const t = await page.$('#guided-timeout'); if (t) await t.click();
    await wait(1200);
    await page.evaluate(() => document.querySelector('#guided').scrollIntoView({ block: 'start' }));
  });
  await zshot('z-s2-loaded.png', DASH + '#/s2', async () => {
    await page.click('#buyer-load');
    await waitFor(() => {
      const el = document.querySelector('#buyer-result');
      return el && !/Loading contract/.test(el.textContent) && /Deposited/.test(el.textContent);
    }, 120000);
    await page.evaluate(() => document.querySelector('#buyer-result').scrollIntoView({ block: 'start' }));
  });
  await zshot('z-s2-tamper.png', DASH + '#/s2', async () => {
    await page.fill('#buyer-account', 'mp-tamper05.testnet');
    await page.click('#buyer-load');
    await waitFor(() => {
      const el = document.querySelector('#buyer-result');
      return el && !/Loading contract/.test(el.textContent) && /Deposited/.test(el.textContent);
    }, 120000);
    await page.evaluate(() => document.querySelector('#buyer-result').scrollIntoView({ block: 'start' }));
  });
  await zshot('z-s3-success1.png', DASH + '#/s3?call=video05-success-001', async () => {
    await waitFor(() => { const m = document.querySelector('#view-s3'); return m && m.textContent.includes('video05-'); }, 60000);
  });
  await zshot('z-s3-refusal.png', DASH + '#/s3?call=video05-overbudget-001', async () => {
    await waitFor(() => { const m = document.querySelector('#view-s3'); return m && m.textContent.includes('video05-'); }, 60000);
  });
  await zshot('z-s5.png', DASH + '#/s5', async () => {
    await waitFor(() => { const el = document.querySelector('#replay-result'); return el && el.textContent.trim().length > 40; }, 120000);
    await page.evaluate(() => document.querySelector('#audit-rows').scrollIntoView({ block: 'center' }));
  });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
