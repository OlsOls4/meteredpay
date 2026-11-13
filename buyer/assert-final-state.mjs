// MeteredPay — assert a buyer's final state against the frozen replay
// state (Wave 6, F1/F2). Read-only RPC views, no keys, no seller.
//
// Usage:
//   node buyer/assert-final-state.mjs --buyer <buyer>.testnet
//     [--deposit 0.5] [--cap 0.2]
//     [--contract apathetic-party.testnet]
//
// Expected: deposit --deposit / held 0 / spent 2x contract price /
// available deposit - 2x price / cap --cap. Exits 0 only if the
// on-chain state matches exactly; otherwise prints the mismatch and
// exits 1. replay.sh runs this after the buyer run, so a replay
// that "completed" with the wrong balances cannot report REPLAY OK.
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
if (!BUYER) { console.error('Usage: node assert-final-state.mjs --buyer <buyer>.testnet [--deposit 0.5] [--cap 0.2] [--contract <id>]'); process.exit(2); }

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
process.exit(0);
