// Re-shoot S1/guided frames (caption fixed in the copy) + 150%-zoom money-beat
// frames (E-6 test-frame gate: every amount legible with its "testnet NEAR"
// label at 150% browser zoom) + a live S2 frame for the tamper buyer.
// Zoomed frames use a 1280x720 viewport at deviceScaleFactor 1.5 -> 1920x1080.
import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const OUT = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames';
const DASH = 'file:///home/hatch/workspace/near-meteredpay/repo/video/work/dash/index.html';
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:18080'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const waitFor = (fn, timeout) => page.waitForFunction(fn, undefined, { timeout });
  async function shot(name, url, setup) {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await wait(1500);
    if (setup) await setup();
    await wait(800);
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('shot', name);
  }

  // --- 100% re-shoots with the fixed caption ---
  await shot('s1.png', DASH + '#/s1');
  await shot('s1-table.png', DASH + '#/s1', async () => {
    await page.evaluate(() => document.querySelector('#playback-rows').scrollIntoView({ block: 'start' }));
    await wait(400);
  });
  await shot('s1-coldopen.png', DASH + '#/s1', async () => {
    await page.evaluate(() => {
      const rows = document.querySelectorAll('#playback-rows tr');
      if (rows[1]) { rows[1].style.outline = '4px solid #b45309'; rows[1].style.outlineOffset = '2px'; }
      document.querySelector('#playback-rows').scrollIntoView({ block: 'start' });
    });
    await wait(400);
  });
  await page.goto(DASH + '#/s1', { waitUntil: 'load' });
  await wait(1200);
  const startBtn = await page.$('#guided-start');
  if (startBtn) {
    await startBtn.click(); await wait(1200);
    await page.screenshot({ path: path.join(OUT, 'guided-success1.png') }); console.log('shot guided-success1.png');
    const n1 = await page.$('#guided-next');
    if (n1) { await n1.click(); await wait(1200); await page.screenshot({ path: path.join(OUT, 'guided-fail.png') }); console.log('shot guided-fail.png'); }
    const n2 = await page.$('#guided-next');
    if (n2) { await n2.click(); await wait(1200); await page.screenshot({ path: path.join(OUT, 'guided-refusal.png') }); console.log('shot guided-refusal.png'); }
    const t = await page.$('#guided-timeout');
    if (t) { await t.click(); await wait(1200); await page.screenshot({ path: path.join(OUT, 'guided-timeout.png') }); console.log('shot guided-timeout.png'); }
  } else console.log('guided start button NOT FOUND');

  // --- live S2 for the tamper buyer (separate run, same contract) ---
  await shot('s2-tamper.png', DASH + '#/s2', async () => {
    await page.fill('#buyer-account', 'mp-tamper05.testnet');
    await page.click('#buyer-load');
    await waitFor(() => {
      const el = document.querySelector('#buyer-result');
      return el && !/Loading contract/.test(el.textContent) && /Deposited/.test(el.textContent);
    }, 120000);
    await page.evaluate(() => document.querySelector('#buyer-result').scrollIntoView({ block: 'start' }));
    await wait(400);
  });

  // --- 150% zoom money-beat frames ---
  await page.setViewportSize({ width: 1280, height: 720 });
  // deviceScaleFactor is set at context creation; emulate via CDP instead:
  await page.context().newCDPSession(page).then(async (cdp) => {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1.5, mobile: false });
  });
  async function zshot(name, url, setup) {
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
