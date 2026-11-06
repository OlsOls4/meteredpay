// Wave-4 re-shoots (5 Nov 2026, ~23:58 UTC). Same recorded run
// (mp-video05.testnet + tamper mp-tamper05.testnet), no new recorded run,
// no new contract calls for the video. Frames:
//  - s1-coldopen.png: re-shot after the V-F8 explorer-link CSS fix
//    (video/work/dash only) so "View on testnet explorer" no longer
//    breaks mid-word in the S1 table.
//  - z2-coldopen-row.png: the REFUNDED (fail-001) row at DSF 2.0 for the
//    V-F1 cold-open crop (row only, no other rows visible).
//  - z2-threecards.png: the S1 three-card summary (Succeeded / Failed /
//    Refused) at DSF 2.0 for the V-F4 close (1:40-1:47).
//  - z-s2-deposit.png: S2 at DEPOSIT-TIME state for V-F1. The live
//    contract now returns the run's FINAL balances, so after the live
//    load the five balance boxes are set to the run log's post-deposit /
//    post-cap values (deposit 0.5, held 0, spent 0, available 0.5,
//    cap 0.2 — buyer/runs/demo-mp-video05.testnet-2026-11-05T22-14-54.jsonl
//    rows "deposit" and "set_budget_cap", also verbatim in
//    video/work/demo-run-console.log "balance after cap") and the call
//    history + refusals tables are emptied to the dashboard's own
//    "No calls recorded" / "No refusals recorded" rows, because at
//    deposit time no calls existed yet. Values are verbatim from the
//    run log; nothing is invented.
//  - s5-audit-fit.png: the S5 dispute-audit table at fit width for V-F4
//    (1:47-1:53). Framing only: main is widened to 1880 px for this
//    shot so all six columns fit in one 1920x1080 frame; table content
//    is the live contract read for the recorded buyer, unchanged.
import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const OUT = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames';
fs.mkdirSync(OUT, { recursive: true });
const DASH = 'file:///home/hatch/workspace/near-meteredpay/repo/video/work/dash/index.html';
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const DEPOSIT_TIME = { Deposited: '0.5', Held: '0', Spent: '0', Available: '0.5', 'Budget cap': '0.2' };

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:18080'] });

  // --- 1x shots (1920x1080) ---
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const waitFor = (fn, timeout) => page.waitForFunction(fn, undefined, { timeout });
  async function shot(name, url, setup) {
    await page.goto('about:blank');
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await wait(1500);
    if (setup) await setup();
    await wait(800);
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('shot', name);
  }
  // F8 re-shoot: S1 cold open (fail row outlined, playback table in view).
  await shot('s1-coldopen.png', DASH + '#/s1', async () => {
    await page.evaluate(() => {
      const rows = document.querySelectorAll('#playback-rows tr');
      if (rows[1]) { rows[1].style.outline = '4px solid #b45309'; rows[1].style.outlineOffset = '2px'; }
      document.querySelector('#playback-rows').scrollIntoView({ block: 'start' });
    });
    await wait(400);
  });
  // V-F4: S5 audit table at fit width (live contract read, framing only).
  await shot('s5-audit-fit.png', DASH + '#/s5', async () => {
    await waitFor(() => {
      const el = document.querySelector('#replay-result');
      return el && el.textContent.trim().length > 40;
    }, 120000);
    await waitFor(() => {
      const rows = document.querySelectorAll('#audit-rows tr');
      return rows.length >= 5 && !/Loading/.test(document.querySelector('#audit-rows').textContent);
    }, 120000);
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.style.maxWidth = '1880px';
      document.querySelectorAll('.table-wrap').forEach(el => { el.style.overflowX = 'visible'; });
      document.querySelector('#audit-rows').scrollIntoView({ block: 'start' });
    });
    await wait(400);
  });

  // --- 1.5x shots (1280x720 viewport, DSF 1.5 -> 1920x1080) ---
  const ctx15 = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  const p15 = await ctx15.newPage();
  const waitFor15 = (fn, timeout) => p15.waitForFunction(fn, undefined, { timeout });
  async function zshot(name, url, setup) {
    await p15.goto('about:blank');
    await p15.goto(url, { waitUntil: 'load', timeout: 60000 });
    await wait(1500);
    if (setup) await setup();
    await wait(800);
    await p15.screenshot({ path: path.join(OUT, name) });
    console.log('shot', name);
  }
  // V-F1: S2 at deposit-time state (live load, then run-log values).
  await zshot('z-s2-deposit.png', DASH + '#/s2', async () => {
    await p15.click('#buyer-load');
    await waitFor15(() => {
      const el = document.querySelector('#buyer-result');
      return el && !/Loading contract/.test(el.textContent) && /Deposited/.test(el.textContent);
    }, 120000);
    await p15.evaluate((vals) => {
      document.querySelectorAll('#buyer-result dl.five div').forEach((div) => {
        const dt = div.querySelector('dt');
        const dd = div.querySelector('dd');
        if (dt && dd && vals[dt.textContent.trim()] !== undefined) dd.textContent = vals[dt.textContent.trim()];
      });
      const tbodys = document.querySelectorAll('#buyer-result tbody');
      if (tbodys[0]) tbodys[0].innerHTML = '<tr><td colspan="7">No calls recorded for this buyer.</td></tr>';
      if (tbodys[1]) tbodys[1].innerHTML = '<tr><td colspan="5">No refusals recorded for this buyer.</td></tr>';
      document.querySelector('#buyer-result').scrollIntoView({ block: 'start' });
    }, DEPOSIT_TIME);
  });

  // --- 2x shots (960x540 viewport, DSF 2.0 -> 1920x1080) ---
  const ctx2 = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2.0 });
  const p2 = await ctx2.newPage();
  async function z2shot(name, url, setup) {
    await p2.goto('about:blank');
    await p2.goto(url, { waitUntil: 'load', timeout: 60000 });
    await wait(1500);
    if (setup) await setup();
    await wait(800);
    await p2.screenshot({ path: path.join(OUT, name) });
    console.log('shot', name);
  }
  // V-F1: REFUNDED row at 2x for the cold-open crop.
  await z2shot('z2-coldopen-row.png', DASH + '#/s1', async () => {
    await p2.evaluate(() => {
      const rows = document.querySelectorAll('#playback-rows tr');
      if (rows[1]) { rows[1].style.outline = '4px solid #b45309'; rows[1].style.outlineOffset = '2px'; }
      document.querySelector('#playback-rows').scrollIntoView({ block: 'start' });
    });
    await wait(400);
  });
  // V-F4: S1 three-card summary at 2x for the close.
  await z2shot('z2-threecards.png', DASH + '#/s1', async () => {
    await p2.evaluate(() => {
      document.querySelector('.proof-cards').scrollIntoView({ block: 'center' });
    });
    await wait(400);
  });

  await browser.close();
  console.log('SHOOT7 DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
