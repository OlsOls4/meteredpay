// Capture real rendered frames of the video dashboard copy (headless Chromium).
// S1/S2/S3/S5 + guided-proof cards are the repo dashboard's own views;
// S2/S5 load live from the frozen contract for buyer mp-video05.testnet.
// Also attempts a real testnet.nearblocks.io explorer frame; outcome logged.
import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const OUT = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames';
fs.mkdirSync(OUT, { recursive: true });
const DASH = 'file:///home/hatch/workspace/near-meteredpay/repo/video/work/dash/index.html';
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:18080'] }); // local forward proxy -> egress proxy (see proxy.mjs); Chromium cannot use the authed egress proxy directly
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => errors.push('reqfail: ' + r.url() + ' ' + ((r.failure() || {}).errorText || '')));

  async function shot(name, url, setup) {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await wait(1500);
    if (setup) await setup();
    await wait(800);
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('shot', name);
  }
  const waitFor = (fn, timeout) => page.waitForFunction(fn, undefined, { timeout });

  await shot('s1.png', DASH + '#/s1');
  // Playback table scrolled into view; cold-open variant highlights the Failed row.
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
  // Guided proof cards (one card per beat, real run data).
  await page.goto(DASH + '#/s1', { waitUntil: 'load' });
  await wait(1200);
  await page.evaluate(() => document.querySelector('#guided-start, #view-s1 button')?.scrollIntoView({ block: 'center' }));
  const startBtn = await page.$('#guided-start') || await page.$('button:has-text("60-second proof")');
  if (startBtn) {
    await startBtn.click(); await wait(1200);
    await page.screenshot({ path: path.join(OUT, 'guided-success1.png') }); console.log('shot guided-success1.png');
    const next1 = await page.$('#guided-next');
    if (next1) { await next1.click(); await wait(1200); await page.screenshot({ path: path.join(OUT, 'guided-fail.png') }); console.log('shot guided-fail.png'); }
    const next2 = await page.$('#guided-next');
    if (next2) { await next2.click(); await wait(1200); await page.screenshot({ path: path.join(OUT, 'guided-refusal.png') }); console.log('shot guided-refusal.png'); }
    const toBtn = await page.$('#guided-timeout');
    if (toBtn) { await toBtn.click(); await wait(1200); await page.screenshot({ path: path.join(OUT, 'guided-timeout.png') }); console.log('shot guided-timeout.png'); }
  } else console.log('guided start button NOT FOUND');
  // S2 empty, then loaded (live contract balances for this buyer).
  await shot('s2-empty.png', DASH + '#/s2');
  await shot('s2-loaded.png', DASH + '#/s2', async () => {
    await page.click('#buyer-load');
    await waitFor(() => {
      const el = document.querySelector('#buyer-result');
      return el && !/Load a buyer/.test(el.textContent) && !/Loading contract/.test(el.textContent) && /Deposited/.test(el.textContent);
    }, 120000);
  });
  // S3 receipts, one per call.
  for (const [name, call] of [
    ['s3-success1.png', 'video05-success-001'],
    ['s3-fail.png', 'video05-fail-001'],
    ['s3-timeout.png', 'video05-timeout-001'],
    ['s3-success2.png', 'video05-success-002'],
    ['s3-refusal.png', 'video05-overbudget-001'],
  ]) {
    await shot(name, DASH + '#/s3?call=' + call, async () => {
      await waitFor(() => {
        const m = document.querySelector('#view-s3');
        return m && m.textContent.includes('video05-');
      }, 60000);
    });
  }
  // S5 replay (live contract data for this buyer).
  await shot('s5.png', DASH + '#/s5', async () => {
    await waitFor(() => {
      const el = document.querySelector('#replay-result');
      return el && el.textContent.trim().length > 40;
    }, 120000);
  });
  // Real explorer frame attempt (may be bot-blocked in this VM).
  try {
    await page.goto('https://testnet.nearblocks.io/txns/FdAowPRkBuUrQkGgTnfhfNsnvqHZTkNzpA1nyt1SMhFT', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(4000);
    await page.screenshot({ path: path.join(OUT, 'explorer-success1.png') });
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.log('explorer attempt body start:', JSON.stringify(txt));
    fs.writeFileSync(path.join(OUT, 'explorer-attempt.txt'), txt);
  } catch (e) {
    console.log('explorer attempt FAILED:', e.message);
    fs.writeFileSync(path.join(OUT, 'explorer-attempt.txt'), 'FAILED: ' + e.message);
  }
  console.log('page errors:', JSON.stringify(errors, null, 2));
  fs.writeFileSync(path.join(OUT, 'capture-errors.json'), JSON.stringify(errors, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
