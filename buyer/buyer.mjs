// MeteredPay — buyer script (days 4-5).
//
// The payer's agent. It drives the demo against the frozen testnet
// contract (apathetic-party.testnet) and the demonstrator seller API:
//
//   demo mode (default): deposit -> success deducts -> failure releases
//     the held amount -> timeout releases the held amount -> second
//     success deducts -> over-budget request refused on-chain.
//   replay mode: the frozen replay script (prep/06 C8 / glossary §6):
//     deposit -> cap 2x price -> two successes -> third refused.
//
// Money rules (frozen, glossary): five-number balances everywhere
// (deposit, held, spent, available, budget_cap;
// available = deposit - spent - held); a "refund" is a RELEASE of a
// held amount, never deducted money returned — always write "held
// amount released, never deducted", with the release-tx link. There
// is no auto-refund: a release happens only on a buyer failure/timeout
// claim or backstop expiry, and that claim step is shown.
//
// The buyer verifies before signing anything: it recomputes the
// seller response hash from the canonical body it actually received,
// verifies the seller signature against the seller key registered on
// the contract, and only then signs the payer authorisation. Either
// signature alone is rejected on-chain; a seller-only claim can never
// deduct. Buyer dishonesty is NOT solved (a buyer could claim failure
// after success) — that is stated in the README FAQ, not hidden.
//
// Usage:
//   node buyer.mjs --buyer <buyer>.testnet [--api http://127.0.0.1:8787]
//                   [--deposit 0.5] [--cap 0.2] [--mode demo|replay|single]
//                   [--tag demo] [--allow-existing] [--skip-setup]
//                   [--scenario success|fail|timeout] [--schema <name>]
//                   [--document '<json>']
// --skip-setup: skip the script's deposit + set_budget_cap and assert
//   a manual deposit/cap (near-cli, README §2.5 Step 1) already
//   matches --deposit/--cap.
// Modes: demo (5 calls), replay (2 successes + refusal), single (ONE
// call, machine-readable JSON on stdout, exit 0 only if the call
// completed and its on-chain outcome is asserted — see buyer/README.md
// for exit codes and the JSON shape). Single mode is top-up-aware
// (U-6): it reuses an existing deposit, deposits only the shortfall
// to --deposit, sets the cap only if it differs, and uses a unique
// call ID per run — repeat calls need no manual flags. A success call
// returns the validated seller output in `seller_output` (U-2); a
// call refused on-chain (e.g. cap exhausted) returns
// outcome "refused" with `refusal_reason`, still exit 0.
// Failure claims (days 8-9, P1-6): a success call whose seller
// response fails verification (hash mismatch, seller-signature
// mismatch, price/seller mismatch, non-success response, or a
// non-timeout fetch error) NEVER throws with the price held. The
// buyer submits submit_failure with failure_reason invalid_response
// instead, which releases the held amount (failed-refunded). A
// timeout claim releases on reason timeout; a seller-error claim on
// reason seller_error. A held amount is therefore never stranded
// by a bad response — only by a buyer that never claims at all
// (backstop: expire_call after 600 s).
// --api guard (wave 4, U-F5): before calling the seller API the
// buyer checks the endpoint against the seller registered on the
// frozen contract (get_seller). A GET {api}/health that names a
// different seller_account_id — or any seller response naming a
// different seller — sets seller_registered=false, which single
// mode reports explicitly in its JSON (with the registered and
// endpoint seller ids) instead of silently refunding with a bare
// invalid_response. The call still proceeds and is still claimed
// invalid_response (the hold is released, never deducted); the
// guard makes the misdirection visible, it does not pay the
// wrong seller. When the endpoint cannot be probed (no /health,
// unreachable at probe time) seller_registered is null
// (unknown), never a false claim either way.
// Keys: the buyer's key is read at runtime from
//   ~/.near-credentials/testnet/<buyer>.json and never printed.
// Env: CONTRACT_ID (default apathetic-party.testnet),
//   SELLER_ACCOUNT_ID (default tedious-sea.testnet),
//   RPC_URL (default https://rpc.testnet.near.org).
// Run log: runs/<mode>-<buyer>-<timestamp>.jsonl (tx hashes + explorer
// links only, no keys). Exit 0 only if every step asserts.
import { JsonRpcProvider, Account, KeyPair } from 'near-api-js';
import { createHash } from 'node:crypto';
import { mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { successBody, errorBody, responseHash, sellerAttestationMessage, sellerErrorMessage, buyerSuccessMessage } from '../shared/canonical.mjs';
import { ed25519Sign, ed25519Verify, loadTestnetKey } from '../shared/ed25519.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACT = process.env.CONTRACT_ID || 'apathetic-party.testnet';
const SELLER = process.env.SELLER_ACCOUNT_ID || 'tedious-sea.testnet';
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.near.org';
const EXPLORER = 'https://testnet.nearblocks.io/txns/';
const GAS = 100000000000000n; // 100 Tgas, as in the days 1-3 harness
const BUYER_WAIT_MS = 30_000; // prep/04 §3.4 / glossary §7

// --- CLI --------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const has = (name) => argv.includes('--' + name);
const BUYER = opt('buyer', null);
const API = opt('api', 'http://127.0.0.1:8787');
const MODE = opt('mode', 'demo');
const TAG = opt('tag', MODE);
const DEPOSIT_NEAR = opt('deposit', MODE === 'replay' ? '0.5' : '0.5');
const CAP_NEAR = opt('cap', MODE === 'replay' ? '0.2' : '0.2');
if (!BUYER) { console.error('Usage: node buyer.mjs --buyer <buyer>.testnet [--api URL] [--deposit 0.5] [--cap 0.2] [--mode demo|replay|single] [--tag demo]'); process.exit(2); }
if (!['demo', 'replay', 'single'].includes(MODE)) { console.error('mode must be demo, replay, or single'); process.exit(2); }
const SCENARIO = opt('scenario', 'success');
if (MODE === 'single' && !['success', 'fail', 'timeout'].includes(SCENARIO)) { console.error('single-mode scenario must be success, fail, or timeout'); process.exit(2); }
const SINGLE_SCHEMA = opt('schema', 'quote');
const SINGLE_DOCUMENT = opt('document', null); // JSON string, single mode only
const SKIP_SETUP = has('skip-setup'); // skip deposit+cap; assert the manual ones match instead (README §2.5 Step 1)
const SINGLE = MODE === 'single';
// U-F5 --api guard state (see probeSellerEndpoint below). Declared
// here, before singleFail, so a failure before the main flow still
// reports JSON instead of hitting a TDZ error. sellerRegistered:
// true = endpoint names the registered seller, false = it names a
// different seller, null = could not be determined (no /health or
// unreachable at probe time).
let sellerRegistered = null;
let endpointSellerAccountId = null;
// Single mode is machine-readable: human progress lines go to stderr
// and ONLY the final JSON object goes to stdout.
if (SINGLE) {
  const origLog = console.log.bind(console);
  console.log = (...a) => process.stderr.write(a.map(String).join(' ') + '\n');
  console.error = (...a) => process.stderr.write(a.map(String).join(' ') + '\n');
  void origLog;
}
function singleOut(obj) {
  if (SINGLE) process.stdout.write(JSON.stringify(obj) + '\n');
}
function singleFail(e) {
  if (SINGLE) singleOut({ mode: 'single', buyer: BUYER, ok: false, seller_registered: sellerRegistered, registered_seller_account_id: SELLER, ...(endpointSellerAccountId ? { endpoint_seller_account_id: endpointSellerAccountId } : {}), error: { code: 'RUN_FAILED', message: String((e && e.message) || e).slice(0, 500) } });
  else console.error(e);
  process.exit(1);
}
// A top-level throw is an uncaught exception (sync) or an unhandled
// rejection (async) — single mode must answer JSON for both.
process.on('unhandledRejection', singleFail);
process.on('uncaughtException', singleFail);

// --- run log -----------------------------------------------------------------
const RUNS_DIR = join(HERE, 'runs');
mkdirSync(RUNS_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_FILE = join(RUNS_DIR, `${MODE}-${BUYER}-${stamp}.jsonl`);
const logRows = [];
function log(step, data) {
  const row = { step, time: new Date().toISOString(), ...data };
  logRows.push(row);
  appendFileSync(LOG_FILE, JSON.stringify(row) + '\n');
  console.log(`[${step}]`, JSON.stringify(data));
}

// --- NEAR helpers ------------------------------------------------------------
function parseNear(s) {
  const [w, f = ''] = String(s).split('.');
  return BigInt(w) * 10n ** 24n + BigInt((f + '0'.repeat(24)).slice(0, 24));
}
const fmtNear = (yocto) => (Number(BigInt(yocto)) / 1e24).toFixed(4) + ' testnet NEAR';
const ex = (h) => EXPLORER + h;

const provider = new JsonRpcProvider({ url: RPC_URL });
const buyerKey = loadTestnetKey(BUYER); // seed/private key never printed
const account = new Account(BUYER, provider, buyerKey.privateKeyString);
const buyerKeyPair = KeyPair.fromString(buyerKey.privateKeyString);

async function view(method, args) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await provider.callFunction({ contractId: CONTRACT, method, args, finality: 'final' });
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
async function bal(acct) {
  const v = await view('get_buyer_balance', { account_id: acct });
  return { deposit: v.deposit, held: v.held, spent: v.spent, available: v.available, cap: v.budget_cap };
}
function checkInvariant(b, where) {
  const ok = BigInt(b.deposit) - BigInt(b.spent) - BigInt(b.held) === BigInt(b.available);
  if (!ok) throw new Error(`Balance invariant FAILED at ${where}: ${JSON.stringify(b)} (available != deposit - spent - held)`);
  return b;
}
async function showBal(label) {
  const b = checkInvariant(await bal(BUYER), label);
  console.log(`  balance ${label}: deposit=${fmtNear(b.deposit)} held=${fmtNear(b.held)} spent=${fmtNear(b.spent)} available=${fmtNear(b.available)} cap=${fmtNear(b.cap)}`);
  console.log('  (These are contract balances. Your wallet balance will differ by testnet gas paid for your own transactions, shown separately on the explorer.)');
  return b;
}
function parseFailure(out) {
  const s = JSON.stringify(out.status || out);
  const m = s.match(/Smart contract panicked: ([^"\\]*)/) || s.match(/panicked: ([^"\\]*)/);
  return (m ? m[1] : s).slice(0, 200);
}
async function call(method, args, deposit = 0n) {
  const attempt = async () => {
    const out = await account.callFunctionRaw({ contractId: CONTRACT, methodName: method, args, gas: GAS, deposit });
    if (out.status && out.status.SuccessValue !== undefined) return { ok: true, tx: out.transaction.hash, link: ex(out.transaction.hash) };
    return { ok: false, error: parseFailure(out) };
  };
  try { return await attempt(); }
  catch (e) {
    const msg = String(e.message || e);
    if (/panicked|Failure/i.test(msg)) {
      const m = msg.match(/Smart contract panicked: ([^"]*)/) || msg.match(/panicked: (.*)/);
      return { ok: false, error: (m ? m[1] : msg).slice(0, 200) };
    }
    await new Promise((r) => setTimeout(r, 5000));
    return await attempt();
  }
}
async function getCall(id) { return view('get_call', { buyer_account_id: BUYER, call_id: id }); }
async function requestCall(id) {
  const r = await call('request_call', { call_id: id, seller_account_id: SELLER });
  if (!r.ok) throw new Error(`request_call failed for ${id}: ${r.error}`);
  const c = await getCall(id);
  log('request_call', { call_id: id, tx: r.tx, link: r.link, status: c.status, bal: await bal(BUYER) });
  return { r, c };
}

// --- seller API ---------------------------------------------------------------
// Default input is the schema-validation service shape (days 8-9):
// { schema: 'quote', document: { text } }. A caller may override the
// input (single mode --schema/--document). The legacy bare
// { text } shape is accepted by the seller as the quote schema.
function defaultInput(callId) {
  return { schema: 'quote', document: { text: `MeteredPay demo call ${callId}: pay per successful call, nothing for a failure.` } };
}
function singleInput(callId) {
  if (!SINGLE_DOCUMENT) return { schema: SINGLE_SCHEMA, document: { text: `MeteredPay single call ${callId}: pay per successful call, nothing for a failure.` } };
  let doc;
  try { doc = JSON.parse(SINGLE_DOCUMENT); } catch { throw new Error('--document must be valid JSON'); }
  return { schema: SINGLE_SCHEMA, document: doc };
}
async function apiCall(callId, scenario, inputOverride) {
  const res = await fetch(API + '/call', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ call_id: callId, buyer_account_id: BUYER, input: inputOverride || defaultInput(callId), scenario }),
    signal: AbortSignal.timeout(BUYER_WAIT_MS),
  });
  return res.json();
}
function isTimeoutError(e) {
  return !!e && (e.name === 'TimeoutError' || e.name === 'AbortError' || /aborted|timeout/i.test(String(e.message || e)));
}

// --- U-F5 --api guard --------------------------------------------------------
// Compare the seller the --api endpoint claims to be against the
// seller registered on the frozen contract (SELLER, from
// get_seller). Best-effort and never fatal: an endpoint with no
// /health, an unreachable endpoint, or an unparseable reply leaves
// sellerRegistered null (unknown). A definitive mismatch sets it
// false and is logged loudly; the call still proceeds and is still
// claimed invalid_response on verification failure — the guard
// makes the misdirection explicit, it never pays the wrong seller.
async function probeSellerEndpoint() {
  try {
    const res = await fetch(API + '/health', { signal: AbortSignal.timeout(5000) });
    const body = await res.json();
    if (body && typeof body.seller_account_id === 'string') noteEndpointSeller(body);
    else console.log('  NOTE: --api endpoint /health names no seller_account_id — seller registration could not be checked before calling (seller_registered: null).');
  } catch (e) {
    console.log(`  NOTE: --api endpoint could not be probed before calling (${String((e && e.message) || e).slice(0, 100)}) — seller registration unchecked (seller_registered: null).`);
  }
  if (sellerRegistered === false) {
    console.log(`  WARNING: --api endpoint seller is ${endpointSellerAccountId}, NOT the seller registered on the contract (${SELLER}). This contract can only ever pay ${SELLER}: calls to this endpoint will fail verification and be claimed invalid_response (hold released, never deducted).`);
  } else if (sellerRegistered === true) {
    console.log(`  --api guard: endpoint seller ${endpointSellerAccountId} matches the seller registered on the contract (${SELLER}).`);
  }
}
function noteEndpointSeller(resp) {
  if (!resp || typeof resp.seller_account_id !== 'string') return;
  endpointSellerAccountId = resp.seller_account_id;
  sellerRegistered = resp.seller_account_id === SELLER;
}

// Verify a FAILED seller response's error attestation (hash
// recompute + seller signature + seller/price match). Returns
// { seller_error_hash, seller_error_signature } or null when the
// attestation is absent or invalid. Used by doFailure and by
// doSuccess: a failed response that carries a VALID attestation
// (e.g. VALIDATION_FAILED) is claimed as seller_error WITH that
// evidence — it is a seller-attested failure, not an invalid
// response. A failed response with no valid attestation falls back
// to invalid_response.
function errorEvidence(callId, resp) {
  if (!resp || resp.status !== 'failed' || typeof resp.error_code !== 'string' || typeof resp.error_message !== 'string') return null;
  if (resp.seller_account_id !== SELLER || resp.price_per_call_yocto !== sellerInfo.price_per_call) return null;
  const expectedHash = responseHash(errorBody({ callId, errorCode: resp.error_code, errorMessage: resp.error_message, sellerAccountId: resp.seller_account_id, priceYocto: resp.price_per_call_yocto }));
  if (expectedHash !== resp.response_hash || !resp.seller_signature) return null;
  if (!ed25519Verify(sellerInfo.seller_public_key, sellerErrorMessage(callId, resp.response_hash), resp.seller_signature)) return null;
  return { seller_error_hash: resp.response_hash, seller_error_signature: resp.seller_signature };
}

// Submit a failure claim for an already-requested (held) call and
// assert the hold is released on-chain. reason is one of the three
// contract reasons: seller_error, invalid_response, timeout.
// timeout resolves to timeout-refunded; the others to failed-refunded.
// Returns { outcome, tx, link, failure_reason }.
async function claimFailure(callId, reason, evidence = {}) {
  const f = await call('submit_failure', { call_id: callId, failure_reason: reason, seller_error_hash: evidence.seller_error_hash ?? null, seller_error_signature: evidence.seller_error_signature ?? null });
  if (!f.ok) throw new Error(`submit_failure (${reason}) failed for ${callId}: ${f.error}`);
  const done = await getCall(callId);
  const expected = reason === 'timeout' ? 'timeout-refunded' : 'failed-refunded';
  if (done.status !== expected) throw new Error(`Expected ${expected} for ${callId}, got ${done.status}`);
  const b = await showBal(`after failure claim ${callId} (${reason}; held amount released, never deducted)`);
  log(expected, { call_id: callId, failure_reason: reason, tx: f.tx, link: f.link, bal: b });
  return { outcome: expected, tx: f.tx, link: f.link, failure_reason: reason };
}

// --- demo steps ---------------------------------------------------------------
let sellerInfo;
// Single mode treats an on-chain refusal as an asserted outcome
// (exit 0, JSON with outcome "refused"), not a crash: the integrator
// learns the budget is exhausted instead of getting RUN_FAILED.
// Demo/replay modes keep the old behaviour (a refused call throws),
// because those modes assert a fixed call sequence.
async function refusedOutcome(callId, r) {
  const refusals = await view('list_refusals', { buyer_account_id: BUYER, from_index: '0', limit: '10' });
  const latest = refusals.find((x) => x.call_id === callId);
  const reason = latest ? latest.reason : 'over_budget';
  const b = await showBal(`after refusal ${callId} (single mode; balances unchanged)`);
  log('refused', { call_id: callId, tx: r.tx, link: r.link, reason, bal: b });
  return { outcome: 'refused', tx: r.tx, link: r.link, refusal_reason: reason };
}

async function doSuccess(callId, inputOverride) {
  const { r, c } = await requestCall(callId);
  if (c.status === 'refused' && SINGLE) return refusedOutcome(callId, r);
  if (c.status !== 'paid') throw new Error(`Expected ${callId} to be paid (held), got ${c.status}`);
  await showBal(`after request ${callId} (price held)`);
  let resp;
  try {
    resp = await apiCall(callId, 'success', inputOverride);
    noteEndpointSeller(resp); // U-F5: record the endpoint's seller from its own response
  } catch (e) {
    // No receipt at all: a 30 s wait is a timeout claim; any other
    // fetch failure (seller unreachable, malformed body) is an
    // invalid_response claim. Either way the hold is released here —
    // never stranded behind a throw.
    if (isTimeoutError(e)) {
      console.log(`  seller did not respond within ${BUYER_WAIT_MS / 1000}s — timeout, not a success`);
      return claimFailure(callId, 'timeout');
    }
    console.log(`  seller API request failed for ${callId} (${String((e && e.message) || e).slice(0, 120)}) — submitting failure claim invalid_response`);
    return claimFailure(callId, 'invalid_response');
  }
  // P1-6: a bad response is a failure CLAIM, not a throw. Any of these
  // used to strand 0.1 NEAR held for 600 s; now the buyer releases it.
  // Exception: a FAILED response whose seller error attestation
  // verifies (e.g. VALIDATION_FAILED for an invalid document) is a
  // seller-attested failure — claim seller_error WITH that evidence,
  // not invalid_response.
  let invalid = null;
  if (!resp || resp.status !== 'success') {
    if (resp && resp.status === 'failed') {
      const ev = errorEvidence(callId, resp);
      if (ev) {
        console.log(`  seller returned failure ${resp.error_code} with valid attestation for ${callId} — submitting failure claim seller_error`);
        const claimed = await claimFailure(callId, 'seller_error', ev);
        return { ...claimed, error_code: resp.error_code, error_message: resp.error_message, seller_errors: resp.errors || null, seller_error_hash: ev.seller_error_hash };
      }
    }
    invalid = `seller returned non-success status ${resp ? JSON.stringify(resp.status) : 'no response'}`;
  } else if (resp.seller_account_id !== SELLER || resp.price_per_call_yocto !== sellerInfo.price_per_call) invalid = 'seller/price mismatch (response seller or price != contract)';
  else {
    const expectedHash = responseHash(successBody({ callId, output: resp.output, sellerAccountId: resp.seller_account_id, priceYocto: resp.price_per_call_yocto }));
    if (expectedHash !== resp.response_hash) invalid = `response hash mismatch: recomputed ${expectedHash} != stated ${resp.response_hash}`;
    else if (!ed25519Verify(sellerInfo.seller_public_key, sellerAttestationMessage(callId, resp.response_hash), resp.seller_signature)) invalid = 'seller signature FAILED verification';
  }
  if (invalid) {
    console.log(`  invalid response for ${callId}: ${invalid} — submitting failure claim invalid_response`);
    return claimFailure(callId, 'invalid_response');
  }
  console.log(`  verified: response hash matches, seller attestation valid for ${callId}`);
  const buyerSig = ed25519Sign(buyerKey.seedBytes, buyerSuccessMessage(callId, resp.response_hash, sellerInfo.price_per_call, SELLER));
  const s = await call('submit_success', { call_id: callId, response_hash: resp.response_hash, seller_signature: resp.seller_signature, buyer_signature: buyerSig });
  if (!s.ok) throw new Error(`submit_success failed for ${callId}: ${s.error}`);
  const done = await getCall(callId);
  if (done.status !== 'success-deducted') throw new Error(`Expected success-deducted for ${callId}, got ${done.status}`);
  const b = await showBal(`after success ${callId} (deducted)`);
  log('success-deducted', { call_id: callId, tx: s.tx, link: s.link, response_hash: resp.response_hash, seller_output: resp.output, bal: b });
  return { outcome: 'success-deducted', tx: s.tx, link: s.link, response_hash: resp.response_hash, seller_output: resp.output };
}

async function doFailure(callId, inputOverride) {
  const { r, c } = await requestCall(callId);
  if (c.status === 'refused' && SINGLE) return refusedOutcome(callId, r);
  if (c.status !== 'paid') throw new Error(`Expected ${callId} to be paid (held), got ${c.status}`);
  await showBal(`after request ${callId} (price held)`);
  let resp;
  try {
    resp = await apiCall(callId, 'fail', inputOverride);
    noteEndpointSeller(resp); // U-F5: record the endpoint's seller from its own response
  } catch (e) {
    // Seller unreachable mid-fail-call: do NOT throw with the price
    // held (that stranded it until the 600 s backstop). A failure
    // with no seller error attestation is still a failure — submit a
    // failure claim with no seller evidence, as the spec allows.
    // A 30 s wait is a timeout claim, like doSuccess/doTimeout.
    if (isTimeoutError(e)) {
      console.log(`  seller did not respond within ${BUYER_WAIT_MS / 1000}s — timeout, not a success`);
      return claimFailure(callId, 'timeout');
    }
    console.log(`  seller API request failed for ${callId} (${String((e && e.message) || e).slice(0, 120)}) — submitting failure claim seller_error with no seller evidence`);
    return claimFailure(callId, 'seller_error', { seller_error_hash: null, seller_error_signature: null });
  }
  if (resp.status !== 'failed') throw new Error(`Seller returned non-failure for ${callId}: ${JSON.stringify(resp)}`);
  const ev = errorEvidence(callId, resp);
  let evidence = { seller_error_hash: null, seller_error_signature: null };
  if (ev) {
    evidence = ev;
    console.log(`  verified: seller error attestation valid for ${callId}`);
  } else {
    console.log(`  NOTE: seller error evidence invalid/missing for ${callId} — submitting failure claim without seller evidence`);
  }
  const claimed = await claimFailure(callId, 'seller_error', evidence);
  return { ...claimed, error_code: resp.error_code, error_message: resp.error_message, seller_errors: resp.errors || null, seller_error_hash: evidence.seller_error_hash };
}

async function doTimeout(callId) {
  const { r, c } = await requestCall(callId);
  if (c.status === 'refused' && SINGLE) return refusedOutcome(callId, r);
  if (c.status !== 'paid') throw new Error(`Expected ${callId} to be paid (held), got ${c.status}`);
  await showBal(`after request ${callId} (price held)`);
  console.log(`  waiting up to ${BUYER_WAIT_MS / 1000}s for the seller API (scenario=timeout)…`);
  let resp;
  try {
    resp = await apiCall(callId, 'timeout');
    noteEndpointSeller(resp); // U-F5: record the endpoint's seller from its own response
  } catch (e) {
    if (isTimeoutError(e)) {
      console.log(`  seller did not respond within ${BUYER_WAIT_MS / 1000}s — timeout, not a success`);
      return claimFailure(callId, 'timeout');
    }
    console.log(`  seller API request failed for ${callId} (${String((e && e.message) || e).slice(0, 120)}) — submitting failure claim invalid_response`);
    return claimFailure(callId, 'invalid_response');
  }
  // The seller answered inside the wait: this is not a timeout. The
  // response cannot be a success for this call, so claim
  // invalid_response instead of stranding the hold behind a throw.
  console.log(`  seller responded unexpectedly for timeout call ${callId} (status ${JSON.stringify(resp && resp.status)}) — submitting failure claim invalid_response`);
  return claimFailure(callId, 'invalid_response');
}

async function expectRefusal(callId, reason) {
  const before = await bal(BUYER);
  const r = await call('request_call', { call_id: callId, seller_account_id: SELLER });
  if (!r.ok) throw new Error(`request_call tx failed for ${callId} (a refusal must be a successful tx): ${r.error}`);
  const c = await getCall(callId);
  if (c.status !== 'refused') throw new Error(`Expected ${callId} refused, got ${c.status}`);
  const refusals = await view('list_refusals', { buyer_account_id: BUYER, from_index: '0', limit: '10' });
  const latest = refusals[0];
  if (!latest || latest.reason !== reason) throw new Error(`Expected refusal reason ${reason} for ${callId}, got ${latest ? latest.reason : 'none'}`);
  const after = await bal(BUYER);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`Balances changed on refusal for ${callId}: before ${JSON.stringify(before)} after ${JSON.stringify(after)}`);
  console.log(`  refused: ${callId} reason=${reason} (verbatim), balances unchanged`);
  await showBal(`after refusal ${callId}`);
  log('refused', { call_id: callId, tx: r.tx, link: r.link, reason, bal: after });
  return r;
}

// --- main ----------------------------------------------------------------------
console.log(`MeteredPay buyer script — ${MODE} mode — TESTNET ONLY (contract ${CONTRACT})`);
console.log(`Buyer: ${BUYER} (public key ${buyerKey.publicKey}) — never prints a private key.`);
console.log(`Seller API: ${API} | Deposit: ${DEPOSIT_NEAR} testnet NEAR | Cap: ${CAP_NEAR} testnet NEAR`);
sellerInfo = await view('get_seller', {});
console.log(`Contract: seller=${sellerInfo.seller_account_id} price=${fmtNear(sellerInfo.price_per_call)} timeout=${sellerInfo.call_timeout_seconds}s`);
if (sellerInfo.seller_account_id !== SELLER) throw new Error(`Contract seller ${sellerInfo.seller_account_id} != ${SELLER}`);
log('contract-confirmed', { seller: sellerInfo });
// U-F5: check the --api endpoint's seller against the registered
// seller BEFORE any seller call (best-effort; never fatal).
await probeSellerEndpoint();

const before = await bal(BUYER);
await showBal('before (fresh buyer expected)');
if (BigInt(before.deposit) !== 0n && !has('allow-existing') && !SKIP_SETUP && !SINGLE) {
  throw new Error(`Buyer ${BUYER} already has a deposit (${fmtNear(before.deposit)}). Use a fresh buyer account, or pass --allow-existing.`);
}

if (SKIP_SETUP) {
  if (BigInt(before.deposit) !== parseNear(DEPOSIT_NEAR) || BigInt(before.cap) !== parseNear(CAP_NEAR)) {
    throw new Error(`--skip-setup expects an existing deposit of ${DEPOSIT_NEAR} and cap of ${CAP_NEAR} (found deposit ${fmtNear(before.deposit)}, cap ${fmtNear(before.cap)}). Deposit and set the cap first (README §2.5 Step 1).`);
  }
  console.log(`--skip-setup: using existing deposit ${DEPOSIT_NEAR} / cap ${CAP_NEAR} (deposited manually).`);
  log('deposit-manual', { amount_near: DEPOSIT_NEAR, cap_near: CAP_NEAR, bal: before });
} else if (SINGLE) {
  // U-6 top-up-aware single mode: reuse an existing deposit, deposit
  // only the shortfall to --deposit, and set the cap only if it
  // differs. A repeat single call therefore never double-deposits
  // 0.5 and never needs --allow-existing / --skip-setup.
  const depTarget = parseNear(DEPOSIT_NEAR);
  const capTarget = parseNear(CAP_NEAR);
  if (BigInt(before.deposit) < depTarget) {
    const shortfall = depTarget - BigInt(before.deposit);
    const dep = await call('deposit', {}, shortfall);
    if (!dep.ok) throw new Error('deposit failed: ' + dep.error);
    log('deposit-topup', { tx: dep.tx, link: dep.link, topped_up_near: (Number(shortfall) / 1e24).toFixed(4), target_near: DEPOSIT_NEAR, bal: await bal(BUYER) });
    await showBal('after top-up deposit');
  } else {
    console.log(`  reusing existing deposit ${fmtNear(before.deposit)} (target ${DEPOSIT_NEAR}; no top-up needed)`);
    log('deposit-reused', { amount_near: DEPOSIT_NEAR, bal: before });
  }
  if (BigInt(before.cap) !== capTarget) {
    const cap = await call('set_budget_cap', { budget_cap: capTarget.toString() });
    if (!cap.ok) throw new Error('set_budget_cap failed: ' + cap.error);
    log('set_budget_cap', { tx: cap.tx, link: cap.link, cap_near: CAP_NEAR, bal: await bal(BUYER) });
    await showBal('after cap');
  } else {
    console.log(`  reusing existing cap ${fmtNear(before.cap)} (already ${CAP_NEAR})`);
    log('cap-reused', { cap_near: CAP_NEAR, bal: before });
  }
} else {
  const dep = await call('deposit', {}, parseNear(DEPOSIT_NEAR));
  if (!dep.ok) throw new Error('deposit failed: ' + dep.error);
  log('deposit', { tx: dep.tx, link: dep.link, amount_near: DEPOSIT_NEAR, bal: await bal(BUYER) });
  await showBal('after deposit');

  const cap = await call('set_budget_cap', { budget_cap: parseNear(CAP_NEAR).toString() });
  if (!cap.ok) throw new Error('set_budget_cap failed: ' + cap.error);
  log('set_budget_cap', { tx: cap.tx, link: cap.link, cap_near: CAP_NEAR, bal: await bal(BUYER) });
  await showBal('after cap');
}

let singleResult = null;
if (MODE === 'single') {
  // U-6: unique call ID per run (timestamp + nonce) so repeat single
  // calls with the same buyer/tag never collide on-chain.
  const nonce = Math.random().toString(36).slice(2, 8);
  const callId = `${TAG}-single-${stamp}-${nonce}`;
  const input = singleInput(callId);
  if (SCENARIO === 'success') singleResult = await doSuccess(callId, input);
  else if (SCENARIO === 'fail') singleResult = await doFailure(callId, input);
  else singleResult = await doTimeout(callId);
  singleResult = { ...singleResult, call_id: callId, scenario: SCENARIO, schema: input.schema };
} else if (MODE === 'replay') {
  await doSuccess(`${TAG}-success-1`);
  await doSuccess(`${TAG}-success-2`);
  await expectRefusal(`${TAG}-third`, 'over_budget');
} else {
  await doSuccess(`${TAG}-success-001`);
  await doFailure(`${TAG}-fail-001`);
  await doTimeout(`${TAG}-timeout-001`);
  await doSuccess(`${TAG}-success-002`);
  await expectRefusal(`${TAG}-overbudget-001`, 'over_budget');
}

const finalBal = await showBal('final');
const sellerBal = await view('get_seller_balance', {});
const calls = await view('list_calls', { buyer_account_id: BUYER, from_index: '0', limit: '100' });
const refusals = await view('list_refusals', { buyer_account_id: BUYER, from_index: '0', limit: '100' });
log('final', { bal: finalBal, seller: sellerBal, seller_registered: sellerRegistered, registered_seller_account_id: SELLER, ...(endpointSellerAccountId ? { endpoint_seller_account_id: endpointSellerAccountId } : {}), calls: calls.map((c) => ({ call_id: c.call_id, status: c.status })), refusals: refusals.map((r) => ({ call_id: r.call_id, reason: r.reason })) });
if (SINGLE) {
  singleOut({
    mode: 'single', buyer: BUYER, ok: true, call_id: singleResult.call_id,
    scenario: singleResult.scenario, schema: singleResult.schema,
    outcome: singleResult.outcome,
    // U-F5: explicit --api guard signal. false = the endpoint named
    // a seller other than the one registered on the contract (the
    // call was claimed invalid_response, hold released, never
    // deducted); true = endpoint seller matches; null = the endpoint
    // could not be checked (no /health or unreachable at probe time).
    seller_registered: sellerRegistered,
    registered_seller_account_id: SELLER,
    ...(endpointSellerAccountId ? { endpoint_seller_account_id: endpointSellerAccountId } : {}),
    ...(singleResult.failure_reason ? { failure_reason: singleResult.failure_reason } : {}),
    ...(singleResult.error_code ? { error_code: singleResult.error_code, error_message: singleResult.error_message } : {}),
    ...(singleResult.seller_errors ? { seller_errors: singleResult.seller_errors } : {}),
    ...(singleResult.response_hash ? { response_hash: singleResult.response_hash } : {}),
    ...(singleResult.seller_output ? { seller_output: singleResult.seller_output } : {}),
    ...(singleResult.refusal_reason ? { refusal_reason: singleResult.refusal_reason } : {}),
    tx: singleResult.tx, link: singleResult.link,
    balances: { deposit: fmtNear(finalBal.deposit), held: fmtNear(finalBal.held), spent: fmtNear(finalBal.spent), available: fmtNear(finalBal.available), cap: fmtNear(finalBal.cap) },
    seller_earned: fmtNear(sellerBal.earned),
    run_log: LOG_FILE,
  });
  process.exit(0);
}
console.log('\n=== DEMO COMPLETE (TESTNET ONLY) ===');
console.log(`Buyer ${BUYER}: deposit=${fmtNear(finalBal.deposit)} held=${fmtNear(finalBal.held)} spent=${fmtNear(finalBal.spent)} available=${fmtNear(finalBal.available)} cap=${fmtNear(finalBal.cap)}`);
console.log(`Seller earned=${fmtNear(sellerBal.earned)} withdrawn=${fmtNear(sellerBal.withdrawn)} (testnet NEAR)`);
console.log(`Calls: ${calls.map((c) => c.call_id + '=' + c.status).join(', ')}`);
console.log(`Run log: ${LOG_FILE}`);
console.log('Honesty: a failed/timeout call was never deducted — its held amount was released on a buyer claim. Buyer dishonesty is NOT solved (a buyer could claim failure after success).');
