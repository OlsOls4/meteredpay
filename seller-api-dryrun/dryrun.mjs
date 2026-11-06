// MeteredPay — third-party seller dry-run DRIVER (days 6-7).
//
// Drives the independent dry-run seller (server.mjs, port 8788) against
// the frozen contract with a FRESH buyer. Expected honest outcome:
//   1. Success attempt: the dry-run seller's response verifies locally
//      (hash + attestation against ITS OWN key), but submit_success is
//      REJECTED on-chain ("Invalid seller signature") — the key is not
//      registered. Call stays held; balances unchanged.
//   2. The hold is then released by a failure claim with NO seller
//      evidence (reason invalid_response) — foreign evidence would be
//      rejected on-chain too.
//   3. Failure attempt: the dry-run seller's failure response verifies
//      locally; the failure claim (reason seller_error, no evidence)
//      succeeds on-chain: hold released, never deducted.
// Final balances: deposit 0.5 / held 0 / spent 0 / available 0.5 / cap 0.2.
// A full paid dry run is impossible on the frozen contract — see README.md.
// Usage: node dryrun.mjs --buyer <buyer>.testnet [--api http://127.0.0.1:8788]
// Keys: buyer's key from ~/.near-credentials/testnet/<buyer>.json.
// Run log: dryrun-<buyer>-<timestamp>.jsonl (tx hashes only, no keys).
import { JsonRpcProvider, Account, KeyPair } from 'near-api-js';
import { mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { successBody, errorBody, responseHash, sellerAttestationMessage, sellerErrorMessage, buyerSuccessMessage } from '../shared/canonical.mjs';
import { ed25519Sign, ed25519Verify, loadTestnetKey } from '../shared/ed25519.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACT = process.env.CONTRACT_ID || 'apathetic-party.testnet';
const SELLER = process.env.SELLER_ACCOUNT_ID || 'tedious-sea.testnet'; // registered seller (on-chain guardrail)
const DRYRUN_SELLER = process.env.DRYRUN_SELLER_ACCOUNT_ID || 'dryrun-seller.testnet';
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.fastnear.com';
const EXPLORER = 'https://testnet.nearblocks.io/txns/';
const GAS = 100000000000000n;

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const BUYER = opt('buyer', null);
const API = opt('api', 'http://127.0.0.1:8788');
if (!BUYER) { console.error('Usage: node dryrun.mjs --buyer <buyer>.testnet [--api URL]'); process.exit(2); }

const RUNS_DIR = join(HERE, 'runs');
mkdirSync(RUNS_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_FILE = join(RUNS_DIR, `dryrun-${BUYER}-${stamp}.jsonl`);
function log(step, data) {
  appendFileSync(LOG_FILE, JSON.stringify({ step, time: new Date().toISOString(), ...data }) + '\n');
  console.log(`[${step}]`, JSON.stringify(data));
}
const fmtNear = (y) => (Number(BigInt(y)) / 1e24).toFixed(4) + ' testnet NEAR';
const parseNear = (s) => { const [w, f = ''] = String(s).split('.'); return BigInt(w) * 10n ** 24n + BigInt((f + '0'.repeat(24)).slice(0, 24)); };

const provider = new JsonRpcProvider({ url: RPC_URL });
const buyerKey = loadTestnetKey(BUYER);
const account = new Account(BUYER, provider, buyerKey.privateKeyString);
const buyerKeyPair = KeyPair.fromString(buyerKey.privateKeyString);

async function view(method, args) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await provider.callFunction({ contractId: CONTRACT, method, args, finality: 'final' }); }
    catch (e) { if (attempt === 3) throw e; await new Promise((r) => setTimeout(r, 5000)); }
  }
}
async function bal() {
  const v = await view('get_buyer_balance', { account_id: BUYER });
  return { deposit: v.deposit, held: v.held, spent: v.spent, available: v.available, cap: v.budget_cap };
}
function parseFailure(out) {
  const s = JSON.stringify(out.status || out);
  const m = s.match(/Smart contract panicked: ([^"\\]*)/) || s.match(/panicked: ([^"\\]*)/);
  return (m ? m[1] : s).slice(0, 200);
}
async function call(method, args, deposit = 0n) {
  const attempt = async () => {
    const out = await account.callFunctionRaw({ contractId: CONTRACT, methodName: method, args, gas: GAS, deposit });
    if (out.status && out.status.SuccessValue !== undefined) return { ok: true, tx: out.transaction.hash, link: EXPLORER + out.transaction.hash };
    return { ok: false, error: parseFailure(out), tx: out.transaction ? out.transaction.hash : null, link: out.transaction ? EXPLORER + out.transaction.hash : null };
  };
  try { return await attempt(); }
  catch (e) {
    const msg = String(e.message || e);
    if (/panicked|Failure/i.test(msg)) {
      const m = msg.match(/Smart contract panicked: ([^"]*)/) || msg.match(/panicked: (.*)/);
      // A rejected call may still have produced a transaction; the
      // hash is not reliably available from the thrown error, so the
      // driver records the rejection by its error text + the on-chain
      // call state read afterwards.
      return { ok: false, error: (m ? m[1] : msg).slice(0, 200), tx: null, link: null };
    }
    await new Promise((r) => setTimeout(r, 5000));
    return await attempt();
  }
}
async function showBal(label) {
  const b = await bal();
  console.log(`  balance ${label}: deposit=${fmtNear(b.deposit)} held=${fmtNear(b.held)} spent=${fmtNear(b.spent)} available=${fmtNear(b.available)} cap=${fmtNear(b.cap)}`);
  return b;
}

console.log('MeteredPay dry-run driver — TESTNET ONLY (contract ' + CONTRACT + ')');
console.log('Buyer: ' + BUYER + ' | Dry-run seller API: ' + API + ' | Registered seller on-chain: ' + SELLER);
const sellerInfo = await view('get_seller', {});
console.log(`Contract: seller=${sellerInfo.seller_account_id} price=${fmtNear(sellerInfo.price_per_call)} timeout=${sellerInfo.call_timeout_seconds}s`);
console.log('Dry-run seller public key (NOT registered): ' + process.env.DRYRUN_SELLER_PUBLIC_KEY + ' — read it from the seller /health + startup log, not from here.');
const dryrunKey = process.env.DRYRUN_SELLER_PUBLIC_KEY;
if (!dryrunKey) throw new Error('Set DRYRUN_SELLER_PUBLIC_KEY to the dry-run seller public key (printed at its startup) before running the driver.');
log('contract-confirmed', { seller: sellerInfo });

const before = await bal();
if (BigInt(before.deposit) !== 0n) throw new Error('Buyer ' + BUYER + ' already has a deposit — use a fresh buyer.');
const dep = await call('deposit', {}, parseNear('0.5'));
if (!dep.ok) throw new Error('deposit failed: ' + dep.error);
log('deposit', { tx: dep.tx, link: dep.link, bal: await bal() });
const cap = await call('set_budget_cap', { budget_cap: parseNear('0.2').toString() });
if (!cap.ok) throw new Error('set_budget_cap failed: ' + cap.error);
log('set_budget_cap', { tx: cap.tx, link: cap.link, bal: await bal() });
await showBal('after deposit+cap');

// --- Step 1: success attempt (must be rejected on-chain) ----------------
const callId1 = 'dry-success-001';
const req1 = await call('request_call', { call_id: callId1, seller_account_id: SELLER });
if (!req1.ok) throw new Error('request_call failed for ' + callId1 + ': ' + req1.error);
log('request_call', { call_id: callId1, tx: req1.tx, link: req1.link });
const resp1 = await (await fetch(API + '/call', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ call_id: callId1, buyer_account_id: BUYER, input: { text: 'Dry-run success call: reverse this text please.' } }),
  signal: AbortSignal.timeout(30000),
})).json();
if (resp1.status !== 'success') throw new Error('Dry-run seller returned non-success: ' + JSON.stringify(resp1));
const expectedHash1 = responseHash(successBody({ callId: callId1, output: resp1.output, sellerAccountId: resp1.seller_account_id, priceYocto: resp1.price_per_call_yocto }));
if (expectedHash1 !== resp1.response_hash) throw new Error('Response hash mismatch (dry-run seller is broken, not the contract)');
if (!ed25519Verify(dryrunKey, sellerAttestationMessage(callId1, resp1.response_hash), resp1.seller_signature)) {
  throw new Error('Dry-run seller signature FAILED local verification — spec shape broken');
}
console.log('  verified locally: response hash matches, dry-run seller attestation valid (against ITS OWN key, not the registered key)');
log('dryrun-success-verified-locally', { call_id: callId1, response_hash: resp1.response_hash, seller_account_id: resp1.seller_account_id });
const buyerSig1 = ed25519Sign(buyerKey.seedBytes, buyerSuccessMessage(callId1, resp1.response_hash, sellerInfo.price_per_call, SELLER));
const beforeClaim = await bal();
const s1 = await call('submit_success', { call_id: callId1, response_hash: resp1.response_hash, seller_signature: resp1.seller_signature, buyer_signature: buyerSig1 });
if (s1.ok) throw new Error('UNEXPECTED: submit_success with an unregistered seller SUCCEEDED — registration truth violated!');
console.log('  on-chain rejection (expected): ' + s1.error + ' | tx ' + (s1.tx || 'none') + ' ' + (s1.link || ''));
log('submit_success-rejected-on-chain', { call_id: callId1, error: s1.error, tx: s1.tx, link: s1.link });
const c1 = await view('get_call', { buyer_account_id: BUYER, call_id: callId1 });
if (c1.status !== 'paid') throw new Error('Expected ' + callId1 + ' to stay paid (held) after rejection, got ' + c1.status);
const afterClaim = await bal();
if (JSON.stringify(beforeClaim) !== JSON.stringify(afterClaim)) throw new Error('Balances changed on rejected success claim!');
console.log('  call stayed paid (held); balances unchanged — the contract refused an unregistered seller, exactly as the registration truth states.');
// Release the hold with a failure claim carrying NO seller evidence.
const rel1 = await call('submit_failure', { call_id: callId1, failure_reason: 'invalid_response', seller_error_hash: null, seller_error_signature: null });
if (!rel1.ok) throw new Error('release claim failed for ' + callId1 + ': ' + rel1.error);
log('released-no-evidence', { call_id: callId1, tx: rel1.tx, link: rel1.link, bal: await bal() });
await showBal('after release ' + callId1);

// --- Step 2: failure attempt (failure claim succeeds on-chain) ----------
const callId2 = 'dry-fail-001';
const req2 = await call('request_call', { call_id: callId2, seller_account_id: SELLER });
if (!req2.ok) throw new Error('request_call failed for ' + callId2 + ': ' + req2.error);
log('request_call', { call_id: callId2, tx: req2.tx, link: req2.link });
const resp2 = await (await fetch(API + '/call', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ call_id: callId2, buyer_account_id: BUYER, input: { text: 'FAIL: dry-run failure call' } }),
  signal: AbortSignal.timeout(30000),
})).json();
if (resp2.status !== 'failed') throw new Error('Dry-run seller returned non-failure: ' + JSON.stringify(resp2));
const expectedHash2 = responseHash(errorBody({ callId: callId2, errorCode: resp2.error_code, errorMessage: resp2.error_message, sellerAccountId: resp2.seller_account_id, priceYocto: resp2.price_per_call_yocto }));
if (expectedHash2 !== resp2.response_hash) throw new Error('Failure response hash mismatch');
if (!ed25519Verify(dryrunKey, sellerErrorMessage(callId2, resp2.response_hash), resp2.seller_signature)) {
  throw new Error('Dry-run seller error attestation FAILED local verification');
}
console.log('  verified locally: failure response hash matches, dry-run seller error attestation valid (against ITS OWN key)');
log('dryrun-failure-verified-locally', { call_id: callId2, response_hash: resp2.response_hash, error_code: resp2.error_code });
// NOTE: the failure claim carries NO seller evidence — the dry-run
// seller's error attestation would be rejected on-chain ("Invalid
// seller error signature") because its key is not registered.
const f2 = await call('submit_failure', { call_id: callId2, failure_reason: 'seller_error', seller_error_hash: null, seller_error_signature: null });
if (!f2.ok) throw new Error('submit_failure failed for ' + callId2 + ': ' + f2.error);
const done2 = await view('get_call', { buyer_account_id: BUYER, call_id: callId2 });
if (done2.status !== 'failed-refunded') throw new Error('Expected failed-refunded for ' + callId2 + ', got ' + done2.status);
log('failed-refunded', { call_id: callId2, tx: f2.tx, link: f2.link, bal: await bal() });
await showBal('after failure ' + callId2 + ' (held amount released, never deducted)');

const finalBal = await showBal('final');
const sellerBal = await view('get_seller_balance', {});
log('final', { bal: finalBal, seller: sellerBal });
console.log('\n=== DRY RUN COMPLETE (TESTNET ONLY) ===');
console.log(`Buyer ${BUYER}: deposit=${fmtNear(finalBal.deposit)} held=${fmtNear(finalBal.held)} spent=${fmtNear(finalBal.spent)} available=${fmtNear(finalBal.available)} cap=${fmtNear(finalBal.cap)}`);
console.log('Seller earned=' + fmtNear(sellerBal.earned) + ' withdrawn=' + fmtNear(sellerBal.withdrawn) + ' (testnet NEAR) — unchanged by this dry run (no deduction happened).');
console.log('Honest result: the dry-run seller API/signature/hash shape is proven, and the frozen contract refused its success claim on-chain because its key is not registered. A paid third-party dry run is impossible on this contract.');
console.log(`Run log: ${LOG_FILE}`);
