// MeteredPay — assert a buyer's final state against the frozen replay
// state (Wave 6, F1/F2). Read-only RPC views, no keys, no seller.
//
// Usage:
//   node buyer/assert-final-state.mjs --buyer <buyer>.testnet
//     [--deposit 0.5] [--cap 0.2] [--mode demo|replay|auto]
//     [--contract apathetic-party.testnet]
//
// Expected: deposit --deposit / held 0 / spent 2x contract price /
// available deposit - 2x price / cap --cap. Exits 0 only if the
// on-chain state matches exactly; otherwise prints the mismatch and
// exits 1. replay.sh runs this after the buyer run, so a replay
// that "completed" with the wrong balances cannot report REPLAY OK.
//
// Call-shape assertion (post-submission council, 14 Nov 2026): balances
// alone cannot tell a genuine replay from a seller-down run whose calls
// were all claimed as failures, so list_calls / list_refusals are
// asserted too — demo mode: 2x success-deducted, 1x failed-refunded,
// 1x timeout-refunded, 1x refused (over_budget); replay mode: 2x
// success-deducted, 1x refused (over_budget). --mode auto (default)
// infers demo when any call is failed-/timeout-refunded, else replay.
// Seller earned: get_seller_balance is CUMULATIVE across all buyers,
// so "seller earned 0.2" is asserted per-buyer — the buyer's two
// success-deducted calls at the contract price (spent = 2x price) —
// and the cumulative earned is reported and asserted to be at least
// that much (it must include this buyer's 0.2).
import { JsonRpcProvider } from 'near-api-js';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const BUYER = opt('buyer', null);
const CONTRACT = opt('contract', process.env.CONTRACT_ID || 'apathetic-party.testnet');
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.near.org';
const DEPOSIT_NEAR = opt('deposit', '0.5');
const CAP_NEAR = opt('cap', '0.2');
const MODE = opt('mode', 'auto');
if (!BUYER) { console.error('Usage: node assert-final-state.mjs --buyer <buyer>.testnet [--deposit 0.5] [--cap 0.2] [--mode demo|replay|auto] [--contract <id>]'); process.exit(2); }
if (!['demo', 'replay', 'auto'].includes(MODE)) { console.error('mode must be demo, replay, or auto'); process.exit(2); }

const parseNear = (s) => {
  const [w, f = ''] = String(s).split('.');
  return BigInt(w) * 10n ** 24n + BigInt((f + '0'.repeat(24)).slice(0, 24));
};
const fmtNear = (y) => (Number(BigInt(y)) / 1e24).toFixed(4) + ' NEAR';

const provider = new JsonRpcProvider({ url: RPC_URL });
const seller = await provider.callFunction({ contractId: CONTRACT, method: 'get_seller', args: {}, finality: 'final' });
const b = await provider.callFunction({ contractId: CONTRACT, method: 'get_buyer_balance', args: { account_id: BUYER }, finality: 'final' });
const priceYocto = BigInt(seller.price_per_call);
const expected = {
  deposit: parseNear(DEPOSIT_NEAR),
  held: 0n,
  spent: 2n * priceYocto,
  available: parseNear(DEPOSIT_NEAR) - 2n * priceYocto,
  cap: parseNear(CAP_NEAR),
};
const actual = {
  deposit: BigInt(b.deposit), held: BigInt(b.held), spent: BigInt(b.spent),
  available: BigInt(b.available), cap: BigInt(b.budget_cap),
};
const mismatch = Object.entries(expected).find(([k, v]) => actual[k] !== v);
console.log(`Buyer ${BUYER} on ${CONTRACT}: deposit=${fmtNear(actual.deposit)} held=${fmtNear(actual.held)} spent=${fmtNear(actual.spent)} available=${fmtNear(actual.available)} cap=${fmtNear(actual.cap)} (price ${fmtNear(priceYocto)}/call)`);
if (mismatch) {
  console.error(`FINAL STATE ASSERTION FAILED: ${mismatch[0]} is ${fmtNear(actual[mismatch[0]])}, expected ${fmtNear(mismatch[1])}.`);
  process.exit(1);
}
console.log(`FINAL STATE ASSERTED: deposit=${fmtNear(expected.deposit)} held=${fmtNear(expected.held)} spent=${fmtNear(expected.spent)} available=${fmtNear(expected.available)} cap=${fmtNear(expected.cap)} (spent = 2x price ${fmtNear(priceYocto)}/call).`);

// --- call-shape + seller-earned assertions (post-submission council) -----
const fail = (msg) => { console.error(`FINAL STATE ASSERTION FAILED: ${msg}`); process.exit(1); };
const calls = await provider.callFunction({ contractId: CONTRACT, method: 'list_calls', args: { buyer_account_id: BUYER, from_index: '0', limit: '100' }, finality: 'final' });
const refusals = await provider.callFunction({ contractId: CONTRACT, method: 'list_refusals', args: { buyer_account_id: BUYER, from_index: '0', limit: '100' }, finality: 'final' });
const count = (status) => calls.filter((c) => c.status === status).length;
const mode = MODE === 'auto'
  ? (calls.some((c) => c.status === 'failed-refunded' || c.status === 'timeout-refunded') ? 'demo' : 'replay')
  : MODE;
console.log(`Call shape (mode ${mode}${MODE === 'auto' ? ' — auto-detected' : ''}): ${calls.map((c) => `${c.call_id}=${c.status}`).join(', ') || '(no calls)'}; refusals: ${refusals.map((r) => `${r.call_id}=${r.reason}`).join(', ') || '(none)'}`);
const expectedShape = mode === 'demo'
  ? { 'success-deducted': 2, 'failed-refunded': 1, 'timeout-refunded': 1, 'refused': 1 }
  : { 'success-deducted': 2, 'refused': 1 };
// NOTE: the refused (over-budget) call appears BOTH in list_calls (status
// "refused") and in list_refusals (reason over_budget) — the two views
// must agree on it.
for (const [status, n] of Object.entries(expectedShape)) {
  if (count(status) !== n) fail(`mode ${mode}: expected ${n}x ${status}, found ${count(status)} (calls: ${calls.map((c) => `${c.call_id}=${c.status}`).join(', ') || 'none'}).`);
}
const allowed = new Set(Object.keys(expectedShape));
if (calls.some((c) => !allowed.has(c.status))) {
  fail(`mode ${mode}: unexpected call status present (${calls.map((c) => `${c.call_id}=${c.status}`).join(', ')}).`);
}
if (refusals.length !== 1 || refusals[0].reason !== 'over_budget') {
  fail(`expected exactly 1 refusal with reason over_budget, found ${refusals.length} (${refusals.map((r) => `${r.call_id}=${r.reason}`).join(', ') || 'none'}).`);
}
const refusedCall = calls.find((c) => c.status === 'refused');
if (!refusedCall || refusedCall.call_id !== refusals[0].call_id) {
  fail(`list_calls refusal (${refusedCall ? refusedCall.call_id : 'none'}) does not match list_refusals (${refusals[0].call_id}).`);
}
// Seller earned, per-buyer: the buyer's success-deducted calls paid the
// seller 2x price (0.2). The contract's cumulative earned must be at
// least that (it aggregates every buyer, so it is not 0.2 itself).
const sellerBal = await provider.callFunction({ contractId: CONTRACT, method: 'get_seller_balance', args: {}, finality: 'final' });
const earnedFromBuyer = BigInt(count('success-deducted')) * priceYocto;
console.log(`Seller earned from this buyer: ${fmtNear(earnedFromBuyer)} (2x price); seller cumulative earned on-chain: ${fmtNear(BigInt(sellerBal.earned))}, withdrawn ${fmtNear(BigInt(sellerBal.withdrawn))}.`);
if (earnedFromBuyer !== 2n * priceYocto) fail(`seller earned from this buyer is ${fmtNear(earnedFromBuyer)}, expected ${fmtNear(2n * priceYocto)} (2 deducted calls).`);
if (BigInt(sellerBal.earned) < earnedFromBuyer) fail(`seller cumulative earned ${fmtNear(BigInt(sellerBal.earned))} is less than this buyer's ${fmtNear(earnedFromBuyer)} — on-chain seller balance is inconsistent.`);
console.log(`CALL SHAPE + SELLER EARNED ASSERTED (mode ${mode}): 2x success-deducted, ${mode === 'demo' ? '1x failed-refunded, 1x timeout-refunded, ' : ''}1x refused (over_budget), seller earned ${fmtNear(earnedFromBuyer)} from this buyer.`);
process.exit(0);
