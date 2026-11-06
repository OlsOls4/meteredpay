// Headless dashboard verification (node, no browser).
// Serves nothing; loads config.js + app.js in a vm with DOM stubs and
// a counting fetch stub, then checks:
//   1. Journey 0 playback renders the four recorded rows + refusal
//      with ZERO fetch calls (read-only playback).
//   2. The S2 buyer console renders five numbers from canned RPC views.
// Usage: node dashboard/verify.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const failures = [];
const check = (name, cond) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
  if (!cond) failures.push(name);
};

let fetchCalls = [];
function makeEl() {
  const el = {
    innerHTML: '', textContent: '', value: 'freeze1011-buyer.testnet',
    disabled: false, style: {}, _attrs: {}, _removed: false,
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(k, v) { el._attrs[k] = String(v); },
    removeAttribute(k) { delete el._attrs[k]; },
    getAttribute(k) { return k in el._attrs ? el._attrs[k] : ''; },
    addEventListener() {},
    focus() {},
    remove() { el._removed = true; },
  };
  return el;
}
const els = {};
const documentStub = {
  readyState: 'complete',
  getElementById: (id) => (els[id] ||= makeEl()),
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
  addEventListener: () => {},
};
const cannedViews = {
  get_seller: { seller_account_id: 'tedious-sea.testnet', seller_public_key: 'ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm', price_per_call: '100000000000000000000000', call_timeout_seconds: 600 },
  get_buyer_balance: { account_id: 'freeze1011-buyer.testnet', deposit: '500000000000000000000000', held: '0', spent: '200000000000000000000000', available: '300000000000000000000000', budget_cap: '200000000000000000000000' },
  // Newest first, as the contract returns them.
  list_calls: [
    // Not in the recorded run: exercises the block-link fallback (the
    // frozen contract stores no tx hash per call — see app.js).
    { call_id: 'demo-other-001', status: 'success-deducted', price: '100000000000000000000000', response_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', failure_reason: null, proposed_height: 123456, resolved_height: 123457 },
    { call_id: 'freeze1011-overbudget-001', status: 'refused', price: '100000000000000000000000', response_hash: null, failure_reason: null, proposed_height: 100005, resolved_height: 100006 },
    { call_id: 'freeze1011-fail-001', status: 'failed-refunded', price: '100000000000000000000000', response_hash: null, failure_reason: 'seller_error', proposed_height: 100003, resolved_height: 100004 },
    { call_id: 'freeze1011-success-001', status: 'success-deducted', price: '100000000000000000000000', response_hash: '58aa417c4bd47cec7d786f9381fb8a54aeb08585933b06f692afe2fab19b65be', failure_reason: null, proposed_height: 100001, resolved_height: 100002 },
  ],
  list_refusals: [{ call_id: 'freeze1011-overbudget-001', reason: 'over_budget', price: '100000000000000000000000', deposit: '500000000000000000000000', spent: '200000000000000000000000', held: '0', budget_cap: '200000000000000000000000' }],
  get_seller_balance: { seller_account_id: 'tedious-sea.testnet', earned: '800000000000000000000000', withdrawn: '200000000000000000000000' },
};
function cannedFetch(url, opts) {
  fetchCalls.push(url);
  // Seller /health check carries no RPC body.
  if (!opts || !opts.body) {
    return Promise.resolve({ json: () => Promise.resolve({ status: 'ok', seller_account_id: 'tedious-sea.testnet', price_per_call_yocto: '100000000000000000000000', mode: 'demo' }) });
  }
  const body = JSON.parse(opts.body);
  const data = cannedViews[body.params.method_name] || {};
  const payload = Buffer.from(JSON.stringify(data), 'utf8');
  return Promise.resolve({ json: () => Promise.resolve({ result: { result: Array.from(payload) } }) });
}

const ctx = vm.createContext({
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  URLSearchParams, TextDecoder, AbortSignal,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  unescape, encodeURIComponent,
  location: { hash: '#/s1' },
  navigator: {},
  document: documentStub,
  window: {},
  addEventListener: () => {},
  fetch: cannedFetch,
});
ctx.window = ctx;
ctx.window.METEREDPAY_CONFIG = undefined;

vm.runInContext(readFileSync(join(HERE, 'config.js'), 'utf8'), ctx);
vm.runInContext(readFileSync(join(HERE, 'app.js'), 'utf8'), ctx);
await new Promise((r) => setTimeout(r, 50));

// --- Test 1: Journey 0 playback makes zero network requests -----------
fetchCalls = [];
ctx.window.__meteredpay.renderPlayback();
const rowsHtml = els['playback-rows'].innerHTML;
check('playback makes zero fetch calls', fetchCalls.length === 0);
for (const h of ['BD3fkPVQNBBPjroxS85y3Bam2GK87TxDKSiFMVehC3Zd', '3a6juX9uJHB5fr2C9emqfR82jJD8nijCnb4k1TPwQo9e', 'C2EXM52zH62Y4JZ6ZaqF6DCo2tXuhW369dYhTKnStycB', 'ESem4KumVHwC7FfT6TT2aqrcsi4R1jGfFt66LhDTZ2qm']) {
  check('playback row links tx ' + h.slice(0, 8), rowsHtml.includes(h));
}
check('playback labels the recorded run verbatim', els['playback-note'].textContent.includes('Recorded demo run — replay it live on S5.'));
check('playback shows both txs per call (request + settlement)', rowsHtml.includes('Request transaction') && rowsHtml.includes('Deduction transaction'));
check('playback refusal is over_budget verbatim', rowsHtml.includes('over_budget'));

// --- Test 2: S2 buyer console renders five numbers from RPC views -----
// Drive the REAL loadBuyer through the exposed hook (days 8-9, F5):
// the harness must FAIL if the S2 wiring breaks — a canned RPC
// round-trip alone no longer counts as proof.
fetchCalls = [];
els['buyer-account'].value = 'freeze1011-buyer.testnet';
ctx.window.__meteredpay.loadBuyer();
await new Promise((r) => setTimeout(r, 200));
const buyerHtml = els['buyer-result'].innerHTML;
check('S2 loadBuyer makes RPC calls', fetchCalls.length >= 3);
for (const label of ['Deposited', 'Held', 'Spent', 'Available', 'Budget cap']) {
  check('S2 shows label ' + label, buyerHtml.includes('<dt>' + label + '</dt>'));
}
for (const [label, value] of [['Deposited', '0.5'], ['Held', '0'], ['Spent', '0.2'], ['Available', '0.3'], ['Budget cap', '0.2']]) {
  check(`S2 shows ${label}=${value}`, buyerHtml.includes('<dt>' + label + '</dt><dd>' + value + '</dd>'));
}
check('S2 shows refused call with over_budget verbatim', buyerHtml.includes('freeze1011-overbudget-001') && buyerHtml.includes('over_budget') && buyerHtml.includes('Refused'));
check('S2 shows deducted call', buyerHtml.includes('freeze1011-success-001') && buyerHtml.includes('Succeeded'));
check('fmtYocto formats 0.1', ctx.window.__meteredpay.fmtYocto('100000000000000000000000') === '0.1');

// --- Test 3: S3 static five-number labels match S2 (days 8-9, F8) -----
const s3Html = els['s3-detail'].innerHTML;
for (const label of ['Deposited', 'Held', 'Spent', 'Available', 'Budget cap']) {
  check('S3 shows label ' + label, s3Html.includes('<dt>' + label + '</dt>'));
}
check('S3 does not use the old Deposit/Cap labels', !s3Html.includes('<dt>Deposit</dt>') && !s3Html.includes('<dt>Cap</dt>'));
// --- Test 4: S5 audit rows state the failure-attestation truth (F1) ---
ctx.window.__meteredpay.loadReplay();
await new Promise((r) => setTimeout(r, 200));
const auditHtml = els['audit-rows'].innerHTML;
check('S5 audit failed row states no on-chain seller attestation',
  auditHtml.includes('No seller attestation is stored on-chain for failure claims (frozen contract)'));
check('S5 audit failed row links to its S3 receipt',
  auditHtml.includes('#/s3?call=freeze1011-fail-001'));
check('S5 audit success row still shows the attested hash',
  auditHtml.includes('58aa417c'));

// --- Test 5: H1 guided Journey 0 — 4 beats, zero fetch, keyboard ----
// Canonical freeze1011 order: success → fail → success (cap) → refusal;
// timeout is the optional 5th beat. The 2nd success must state the cap.
const mp = ctx.window.__meteredpay;
fetchCalls = [];
mp.guidedStart();
let g = els['guided'].innerHTML;
check('guided starts on the success beat', g.includes('freeze1011-success-001') && g.includes('Succeeded') && g.includes('Deducted 0.1'));
check('guided shows 1 of 4 progress', g.includes('1 of 4'));
check('guided beat 1 service is schema-validation', g.includes('meteredpay-schema-validate'));
check('guided card has result + amount + balance-after + explorer + receipt',
  g.includes('Balance after this call') && g.includes('testnet.nearblocks.io/txns/BD3fkPVQNBBPjroxS85y3Bam2GK87TxDKSiFMVehC3Zd') && g.includes('#/s3?call=freeze1011-success-001'));
check('guided card has real buttons (keyboard-operable)',
  g.includes('<button type="button" id="guided-next"') && g.includes('<button type="button" id="guided-back"'));
check('guided progressbar carries aria-valuenow', g.includes('role="progressbar"') && g.includes('aria-valuenow="1"'));
check('guided start makes zero fetch calls', fetchCalls.length === 0);
mp.guidedNext();
g = els['guided'].innerHTML;
check('guided step 2 is the failed call', g.includes('freeze1011-fail-001') && g.includes('2 of 4') && g.includes('Refunded'));
mp.guidedNext();
g = els['guided'].innerHTML;
check('guided step 3 is the second success (cap reached)', g.includes('freeze1011-success-002') && g.includes('3 of 4') && g.includes('Deducted 0.1'));
check('guided step 3 states spent now 0.2 = cap, next call refused', g.includes('Spent now 0.2 = cap — the next call will be refused.'));
mp.guidedNext();
g = els['guided'].innerHTML;
check('guided step 4 is the refused call', g.includes('freeze1011-overbudget-001') && g.includes('4 of 4') && g.includes('over_budget'));
check('guided ends at S5', g.includes('#/s5'));
mp.guidedBack();
check('guided Back returns to step 3', els['guided'].innerHTML.includes('3 of 4'));
mp.guidedNext();
check('guided state reports step 4 of 4', mp.guidedState().index === 3 && mp.guidedState().total === 4);
mp.guidedShowTimeout();
g = els['guided'].innerHTML;
check('guided optional timeout beat is 5 of 5', g.includes('5 of 5') && g.includes('freeze1011-timeout-001'));
check('guided whole sequence makes zero fetch calls', fetchCalls.length === 0);

// --- Test 6: S3 service label matches the row's seller output (F1
// harness gap) + M3 balance-before + M4 unknown-call not-found ------
for (const r of mp.PLAYBACK) {
  mp.renderS3(r.id);
  check('S3 service label matches seller output for ' + r.id,
    els['s3-detail'].innerHTML.includes(r.sellerService));
}
mp.renderS3('freeze1011-success-001');
check('S3 success names the schema-validation service (canonical run)',
  els['s3-detail'].innerHTML.includes('meteredpay-schema-validate'));
{
  const h = els['s3-detail'].innerHTML;
  check('S3 shows balance before AND after, before first',
    h.indexOf('Balance before this call') >= 0 && h.indexOf('Balance before this call') < h.indexOf('Balance after this call'));
  check('S3 success-001 balance-before is spent 0 / available 0.5',
    h.includes('<dt>Spent</dt><dd>0</dd>') && h.includes('<dt>Available</dt><dd>0.5</dd>'));
}
mp.renderS3('freeze1011-success-002');
check('S3 success-002 balance-before is spent 0.1 / available 0.4',
  els['s3-detail'].innerHTML.includes('<dt>Spent</dt><dd>0.1</dd>') && els['s3-detail'].innerHTML.includes('<dt>Available</dt><dd>0.4</dd>'));
mp.renderS3('no-such-call');
{
  const nf = els['s3-detail'].innerHTML;
  check('S3 unknown call id shows a not-found state', nf.includes('Call not found') && nf.includes('no-such-call'));
  check('S3 unknown call id does NOT silently show PLAYBACK[0]', !nf.includes('freeze1011-success-001') && !nf.includes('BD3fkPVQ'));
}

// --- Test 7: H2 — explorer links + balance-after on live S2 rows ----
fetchCalls = [];
els['buyer-account'].value = 'freeze1011-buyer.testnet';
mp.loadBuyer();
await new Promise((r) => setTimeout(r, 200));
const buyer2 = els['buyer-result'].innerHTML;
check('S2 history rows carry txLink (recorded calls)',
  buyer2.includes('testnet.nearblocks.io/txns/8UKh7z4zhkhPfPnQhwAi3iajynijjmLMbewDPqSVGgE'));
check('S2 history rows carry a block explorer link (unrecorded call)',
  buyer2.includes('testnet.nearblocks.io/blocks/123457'));
check('S2 history rows show balance after',
  buyer2.includes('<th>Balance after</th>') && buyer2.includes('Spent 0.1 · Available 0.4 testnet NEAR'));
check('S2 refusal row shows exact balance after + explorer link',
  buyer2.includes('Available 0.3 testnet NEAR (exact, recorded at refusal)') && buyer2.includes('testnet.nearblocks.io/txns/ESem4KumVHwC7FfT6TT2aqrcsi4R1jGfFt66LhDTZ2qm'));
check('S2 tables are wrapped for 320 px scrolling', buyer2.includes('table-wrap'));

// --- Test 8: M5 — S2 partial failure + retry + account-format hint --
els['buyer-account'].value = 'not-an-account';
mp.loadBuyer();
await new Promise((r) => setTimeout(r, 200));
check('S2 shows an account-format hint for a non-.testnet ID',
  els['buyer-result'].innerHTML.includes('usually end in <code>.testnet</code>'));
els['buyer-account'].value = 'freeze1011-buyer.testnet';
const realFetch = ctx.fetch;
ctx.fetch = (url, opts) => {
  if (opts && opts.body) {
    const m = JSON.parse(opts.body).params.method_name;
    if (m === 'list_refusals') return Promise.reject(new Error('rpc down'));
  }
  return cannedFetch(url, opts);
};
mp.loadBuyer();
await new Promise((r) => setTimeout(r, 200));
{
  const b4 = els['buyer-result'].innerHTML;
  check('S2 partial failure still renders balance + history',
    b4.includes('<dt>Deposited</dt>') && b4.includes('freeze1011-success-001'));
  check('S2 partial failure names the missing section + offers retry',
    b4.includes('could not be loaded (refusals)') && b4.includes('id="buyer-retry"'));
}
ctx.fetch = realFetch;

// --- Test 9: H2 — S4 seller log + S5 audit rows -----------------------
mp.loadSeller();
await new Promise((r) => setTimeout(r, 200));
{
  const sh = els['seller-result'].innerHTML;
  check('S4 log rows carry txLink', sh.includes('testnet.nearblocks.io/txns/8UKh7z4zhkhPfPnQhwAi3iajynijjmLMbewDPqSVGgE'));
  check('S4 log rows carry a block link (unrecorded call)', sh.includes('testnet.nearblocks.io/blocks/123457'));
  check('S4 log rows show earned after', sh.includes('0.1 testnet NEAR earned after this call'));
}
mp.loadReplay();
await new Promise((r) => setTimeout(r, 200));
{
  const a2 = els['audit-rows'].innerHTML;
  check('S5 audit rows carry explorer links',
    a2.includes('testnet.nearblocks.io/txns/8UKh7z4zhkhPfPnQhwAi3iajynijjmLMbewDPqSVGgE') && a2.includes('testnet.nearblocks.io/blocks/123457'));
  check('S5 audit rows show balance after', a2.includes('Spent 0.1 · Available 0.4 testnet NEAR'));
}

// --- Test 10: M2 aria-valuenow on the progressbar + M12 wait skip ----
mp.runWaitDemo();
check('M2 aria-valuenow is set on the progressbar element', els['wait-progress'].getAttribute('aria-valuenow') === '0');
check('M2 aria-valuenow is NOT set on the inner fill bar', els['wait-bar'].getAttribute('aria-valuenow') === '');
mp.skipWaitDemo();
check('M12 skip ends the wait demo',
  els['wait-text'].textContent.includes('Wait skipped') && els['wait-progress'].getAttribute('aria-valuenow') === '30');

// --- Test 11: static file checks — M1, M6, M9, U-5, H1 button -------
{
  const indexHtml = readFileSync(join(HERE, 'index.html'), 'utf8');
  const appJs = readFileSync(join(HERE, 'app.js'), 'utf8');
  const css = readFileSync(join(HERE, 'styles.css'), 'utf8');
  check('H1 S1 has the guided-proof button', indexHtml.includes('id="guided-start">See the 60-second proof</button>'));
  check('M1 index has <noscript> + JS-load-failure message', indexHtml.includes('<noscript>') && indexHtml.includes('id="js-warning"'));
  check('M1 JS-load-failure message is removed once app.js runs', els['js-warning']._removed === true);
  check('M6 S5 steps use Run, not the vacuous Do', !indexHtml.includes('Do:'));
  check('M9 tables scroll inside .table-wrap at 320 px', css.includes('.table-wrap') && css.includes('overflow-x: auto'));
  check('U-5 S1 leads with the schema-validation service',
    indexHtml.indexOf('meteredpay-schema-validate') < indexHtml.indexOf('<h3>Recorded demo run</h3>'));
  check('U-5 playback table labels the canonical freeze1011 run',
    indexHtml.includes('<caption') && indexHtml.includes('Canonical replay — freeze1011 run') && indexHtml.includes('frozen-run.json'));
  check('U-5 no word-count service remains in the dashboard',
    !indexHtml.includes('word-count') && !appJs.includes('Word-count service'));
  check('M11 copy has a fallback message + reverts to Copy',
    appJs.includes('Copy failed') && appJs.includes("btn.textContent = 'Copy'"));
}

// --- Test 12: S5 replay steps are ONE sequence in execution order -
// (second pass, F4/F5 S5 rewrite). The audit table itself is
// unchanged; only the steps list was rewritten.
{
  const indexHtml = readFileSync(join(HERE, 'index.html'), 'utf8');
  const stepsBlock = indexHtml.slice(indexHtml.indexOf('<ol class="steps">'), indexHtml.indexOf('</ol>'));
  const order = ['Deposit.</strong>', 'Success deducts.</strong>', 'Fail releases.</strong>', 'Timeout releases.</strong>', 'Success deducts again.</strong>', 'Over budget refused.</strong>'];
  let prev = -1, inOrder = true;
  for (const s of order) { const i = stepsBlock.indexOf(s); if (i <= prev) inOrder = false; prev = i; }
  check('S5 steps are in execution order (deposit → success → fail → timeout → success → refusal)', inOrder);
  check('S5 timeout step sits between fail and second success',
    stepsBlock.indexOf('Timeout releases.</strong>') > stepsBlock.indexOf('Fail releases.</strong>') &&
    stepsBlock.indexOf('Timeout releases.</strong>') < stepsBlock.indexOf('Success deducts again.</strong>'));
  check('S5 each step names the single outcome it produces',
    stepsBlock.includes("The script's first call") && stepsBlock.includes("The script's second call") &&
    stepsBlock.includes("The script's third call") && stepsBlock.includes("The script's fourth call") &&
    stepsBlock.includes("The script's fifth and last call"));
  check('S5 no longer warns steps are numbered by topic, not execution order',
    !indexHtml.includes('numbered by topic'));
  check('S5 demo command appears once (step 1 only — no per-step re-run)',
    (stepsBlock.match(/node buyer\/buyer\.mjs/g) || []).length === 1);
  check('S5 final state is after steps 1–6', indexHtml.includes('Final state after steps 1–6:'));
}

// --- Test 13: plain #/s3 renders renderS3(currentCall) -------------
// Panel acceptance (UI/UX F3): #/s3?call=no-such-call → #/s1 → #/s3
// shows the default success-001 receipt, never "Call not found".
// currentCall is still the default here (no valid ?call= yet), so the
// unknown id must not poison it.
{
  ctx.location.hash = '#/s3?call=no-such-call';
  mp.route();
  check('unknown call id shows not-found on its own link',
    els['s3-detail'].innerHTML.includes('Call not found') && els['s3-detail'].innerHTML.includes('no-such-call'));
  ctx.location.hash = '#/s1';
  mp.route();
  ctx.location.hash = '#/s3';
  mp.route();
  check('plain #/s3 after unknown id shows the default success-001 receipt, never Call not found',
    els['s3-detail'].innerHTML.includes('freeze1011-success-001') && !els['s3-detail'].innerHTML.includes('Call not found'));
  ctx.location.hash = '#/s3?call=freeze1011-fail-001';
  mp.route();
  check('route #/s3?call= shows that call', els['s3-detail'].innerHTML.includes('freeze1011-fail-001'));
  // Stale-content probe: render a different call directly, then
  // navigate to plain #/s3 — it must re-render the current call.
  mp.renderS3('freeze1011-success-001');
  check('probe shows success before plain #/s3', els['s3-detail'].innerHTML.includes('freeze1011-success-001'));
  ctx.location.hash = '#/s3';
  mp.route();
  check('plain #/s3 re-renders the current call (fail, not stale success)',
    els['s3-detail'].innerHTML.includes('freeze1011-fail-001') && !els['s3-detail'].innerHTML.includes('freeze1011-success-001'));
  // Unknown id after a valid call: still not-found on its own link,
  // but plain #/s3 falls back to the last valid receipt, not the error.
  ctx.location.hash = '#/s3?call=no-such-call';
  mp.route();
  check('unknown call id still shows not-found (after a valid call)',
    els['s3-detail'].innerHTML.includes('Call not found'));
  ctx.location.hash = '#/s3';
  mp.route();
  check('plain #/s3 after unknown id shows the last valid receipt (fail), never Call not found',
    els['s3-detail'].innerHTML.includes('freeze1011-fail-001') && !els['s3-detail'].innerHTML.includes('Call not found'));
  ctx.location.hash = '#/s1';
  mp.route();
}

// --- Test 14: guided restart resets the timeout beat ---------------
mp.guidedShowTimeout();
check('guided timeout beat is 5 of 5 (precondition)', els['guided'].innerHTML.includes('5 of 5'));
mp.guidedStart();
check('guided restart resets to 1 of 4 (timeout beat off again)',
  els['guided'].innerHTML.includes('1 of 4') && mp.guidedState().total === 4 && mp.guidedState().timeoutOn === false);

// --- Test 15: S4 partial failure + retry (mirrors S2 M5) -----------
{
  const realFetch = ctx.fetch;
  ctx.fetch = (url, opts) => {
    if (opts && opts.body) {
      const m = JSON.parse(opts.body).params.method_name;
      if (m === 'get_seller_balance') return Promise.reject(new Error('rpc down'));
    }
    return cannedFetch(url, opts);
  };
  mp.loadSeller();
  await new Promise((r) => setTimeout(r, 200));
  const s4 = els['seller-result'].innerHTML;
  check('S4 partial failure still renders seller registration', s4.includes('tedious-sea.testnet'));
  check('S4 partial failure names the missing section + offers retry',
    s4.includes('could not be loaded (seller balance)') && s4.includes('id="seller-retry"'));
  check('S4 partial failure still renders the call log', s4.includes('freeze1011-success-001'));
  check('S4 partial failure marks the unloaded balance, not a stale number',
    s4.includes('Could not be loaded.'));
  ctx.fetch = realFetch;
}

// --- Test 16: small items — S1 balance-after, heading dedupe,
// S2 Load button, S5 audit buyer label ------------------------------
{
  const indexHtml = readFileSync(join(HERE, 'index.html'), 'utf8');
  check('S1 playback table has a Balance after column', indexHtml.includes('<th>Balance after</th>'));
  check('S1 playback rows show balance after per row',
    els['playback-rows'].innerHTML.includes('Spent 0.1 · Available 0.4 testnet NEAR') &&
    els['playback-rows'].innerHTML.includes('Spent 0.2 · Available 0.3 testnet NEAR'));
  check('S1 has one "See the 60-second proof" heading (dedupe)',
    (indexHtml.match(/<h3>See the 60-second proof/g) || []).length === 1 &&
    indexHtml.includes('<h3>Recorded demo run</h3>'));
  check('S5 audit buyer label names the demo buyer + points own replays at S2',
    els['audit-buyer-label'].textContent.includes('freeze1011-buyer.testnet') &&
    els['audit-buyer-label'].textContent.includes('Your own replay\'s calls appear on S2'));
}
els['buyer-account'].value = 'freeze1011-buyer.testnet';
mp.loadBuyer();
check('S2 Load button is disabled while loading', els['buyer-load'].disabled === true);
await new Promise((r) => setTimeout(r, 200));
check('S2 Load button is re-enabled after loading', els['buyer-load'].disabled === false);


// --- Test 17: L2 canonical replay — manifest, README §2.5, S5 titles ---
{
  const manifest = JSON.parse(readFileSync(join(HERE, 'frozen-run.json'), 'utf8'));
  const readme = readFileSync(join(HERE, '..', 'README.md'), 'utf8');
  const appJs = readFileSync(join(HERE, 'app.js'), 'utf8');
  const indexHtml = readFileSync(join(HERE, 'index.html'), 'utf8');
  const sec25 = readme.slice(readme.indexOf('## 2.5'), readme.indexOf('## 2.6'));
  check('L2 manifest contract/seller/price/deposit/cap',
    manifest.contract === 'apathetic-party.testnet' && manifest.seller === 'tedious-sea.testnet' &&
    manifest.price_near === '0.1' && manifest.deposit_near === '0.5' && manifest.cap_near === '0.2');
  check('L2 manifest final state is 0.5/0/0.2/0.3/0.2',
    manifest.final_state.deposit === '0.5' && manifest.final_state.held === '0' &&
    manifest.final_state.spent === '0.2' && manifest.final_state.available === '0.3' && manifest.final_state.cap === '0.2');
  check('L2 manifest buyer is the freeze1011 buyer', manifest.buyer === 'freeze1011-buyer.testnet');
  const mCalls = manifest.calls.filter((c) => c.kind !== 'deposit' && c.kind !== 'set_budget_cap');
  check('L2 PLAYBACK ids match manifest call ids in order',
    mCalls.map((c) => c.call_id).join('|') === mp.PLAYBACK.map((r) => r.id).join('|'));
  for (const r of mp.PLAYBACK) {
    const m = mCalls.find((c) => c.call_id === r.id);
    check('L2 PLAYBACK ' + r.id + ' matches manifest txs/hashes',
      !!m && m.request_tx === r.requestTx && (m.settle_tx || null) === r.settleTx && (m.response_hash || null) === r.responseHash);
  }
  check('L2 guided beat 1 service is schema-validation',
    mp.PLAYBACK[0].sellerService.includes('meteredpay-schema-validate'));
  const s1hashes = [];
  mp.PLAYBACK.forEach((r) => { s1hashes.push(r.requestTx); if (r.settleTx) s1hashes.push(r.settleTx); });
  for (const h of s1hashes) check('L2 S1 hash ' + h.slice(0, 8) + ' appears in README §2.5', sec25.includes(h));
  const readmeTitles = [...sec25.matchAll(/\*\*Step \d+ — ([^.]+)\.\*\*/g)].map((m) => m[1]);
  const stepsBlock = indexHtml.slice(indexHtml.indexOf('<ol class="steps">'), indexHtml.indexOf('</ol>'));
  const s5Titles = [...stepsBlock.matchAll(/<li><strong>([^<]+)\.<\/strong>/g)].map((m) => m[1]);
  check('L2 README step titles == S5 step titles for steps 1–6',
    readmeTitles.length >= 6 && s5Titles.length === 6 && readmeTitles.slice(0, 6).join('|') === s5Titles.join('|'));
  for (const [file, text] of [['README.md', readme], ['index.html', indexHtml], ['app.js', appJs]]) {
    check('L2 no "numbered by topic" in ' + file, !text.includes('numbered by topic'));
  }
  check('F-R4 no "X post published" in README', !readme.includes('X post published'));
  check('F-R4 no "X post published by the human" in README', !readme.includes('X post published by the human'));
  check('F-R4 README states the X post is drafted, not published',
    readme.includes('X demo post drafted') && readme.includes('to be published by the human team lead before submission'));
  check('L2 README §2.5 labels the video run as a separate recorded run',
    sec25.includes('mp-video05') && sec25.includes('video/video-run-log.md'));
}

// --- Test 18: U-F7 ?buyer= deep link + U-F8 S4 buyer -----------------
{
  ctx.location.hash = '#/s2?buyer=freeze1011-buyer.testnet';
  fetchCalls = [];
  mp.route();
  check('U-F7 ?buyer= prefills the S2 account', els['buyer-account'].value === 'freeze1011-buyer.testnet');
  await new Promise((r) => setTimeout(r, 200));
  check('U-F7 ?buyer= auto-loads the buyer',
    els['buyer-result'].innerHTML.includes('<dt>Deposited</dt>') && fetchCalls.length >= 3);
  ctx.location.hash = '#/s1';
  mp.route();
  els['seller-buyer'].value = 'freeze1011-buyer.testnet';
  mp.loadSeller();
  await new Promise((r) => setTimeout(r, 200));
  check('U-F8 S4 log names the chosen buyer',
    els['seller-result'].innerHTML.includes('Seller call log (buyer freeze1011-buyer.testnet'));
}

// --- Test 19: U-F8 S2 rows show deducted + balance-before -----------
{
  els['buyer-account'].value = 'freeze1011-buyer.testnet';
  mp.loadBuyer();
  await new Promise((r) => setTimeout(r, 200));
  const b = els['buyer-result'].innerHTML;
  check('U-F8 S2 shows Deducted + Balance before columns',
    b.includes('<th>Deducted</th>') && b.includes('<th>Balance before</th>'));
  check('U-F8 S2 success row deducts 0.1 testnet NEAR',
    b.includes('freeze1011-success-001') && b.includes('0.1 testnet NEAR</td>'));
  check('U-F8 S2 refunded row deducts 0 testnet NEAR',
    b.includes('freeze1011-fail-001') && b.includes('0 testnet NEAR</td>'));
  check('U-F8 S2 success-001 balance-before is spent 0 / available 0.5',
    b.includes('Spent 0 · Available 0.5 testnet NEAR'));
}

// --- Test 20: U-F8 S3 "Make another call" links to S2 ---------------
mp.renderS3('freeze1011-success-001');
check('U-F8 S3 has a Make another call link to S2',
  els['s3-detail'].innerHTML.includes('<a href="#/s2">Make another call</a>'));

if (failures.length) { console.error('VERIFY FAILED: ' + failures.join('; ')); process.exit(1); }
console.log('DASHBOARD VERIFY OK');
