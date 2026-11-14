// MeteredPay — expire held (paid, past-timeout) calls (post-submission
// council, 14 Nov 2026). Read-only by default; transacts only with
// --execute.
//
//   node buyer/expire-held.mjs --buyer <buyer>.testnet [--contract apathetic-party.testnet]
//   node buyer/expire-held.mjs --buyer <buyer>.testnet --execute
//
// What it does: lists a buyer's `paid` calls via read-only RPC views
// (list_calls), and for each one past proposed_at + call_timeout_seconds
// (600 s on the frozen contract), prints what it WOULD expire:
// call_id, buyer, proposed_at, explorer link. --dry-run is the DEFAULT
// and sends NO transaction. --execute calls expire_call per expired
// call (near-cli, signed from the buyer's local keychain key) and then
// re-reads get_call to assert the call resolved to timeout-refunded.
//
// ── LIVE EXECUTION IS UNPROVEN IN THIS BATCH ─────────────────────────────
// --execute has NEVER been run against a live contract: no live run was
// performed while writing this script (chain transactions were barred
// from this batch), so the near-cli invocation, the gas/deposit flags,
// and the post-expiry assertion are UNPROVEN. Do NOT rely on --execute
// until a proof run on a FRESH buyer (with a deliberately expired paid
// hold) has been done and its tx + get_call result recorded. Until
// then, --dry-run (list-only) is the only proven mode. A judge must
// not treat this script as a working recovery tool.
// ──────────────────────────────────────────────────────────────────────────
//
// Read-only: --dry-run makes zero near-cli calls of any kind (views
// only, via plain HTTPS RPC). Recovery step (README): after a seller
// outage, run this in --dry-run first, check the candidate list, then
// --execute to release the held amounts.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const BUYER = opt('buyer', null);
const CONTRACT = opt('contract', process.env.CONTRACT_ID || 'apathetic-party.testnet');
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.near.org';
const EXECUTE = argv.includes('--execute');
const DRY_RUN = argv.includes('--dry-run') || !EXECUTE;
if (!BUYER) {
  console.error('Usage: node expire-held.mjs --buyer <buyer>.testnet [--contract <id>] [--dry-run|--execute]');
  process.exit(2);
}
if (EXECUTE) {
  console.error('WARNING: --execute is UNPROVEN (see script header) — no live expire_call run has ever been done with this script. Proceeding only because --execute was passed explicitly.');
  const keyFile = join(homedir(), '.near-credentials', 'testnet', BUYER + '.json');
  if (!existsSync(keyFile)) {
    console.error(`--execute needs the buyer's local keychain key at ${keyFile} (near-cli signs from the keychain).`);
    process.exit(2);
  }
}

const ex = (tx) => `https://testnet.nearblocks.io/txns/${tx}`;

async function rpcView(method, args) {
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 'meteredpay-expire-held', method: 'query',
    params: {
      request_type: 'call_function', account_id: CONTRACT,
      method_name: method, args_base64: Buffer.from(JSON.stringify(args), 'utf8').toString('base64'),
      finality: 'final',
    },
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(60_000) });
      const j = await res.json();
      if (!j.result || !j.result.result) throw new Error('RPC view returned no result: ' + JSON.stringify(j).slice(0, 200));
      return JSON.parse(Buffer.from(j.result.result).toString('utf8'));
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function chainNowNs() {
  // Chain time (block timestamp), not wall clock: expiry is judged by
  // the chain's clock. Falls back to wall clock with a loud note.
  try {
    const res = await fetch(RPC_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'meteredpay-expire-held-time', method: 'block', params: { finality: 'final' } }),
      signal: AbortSignal.timeout(30_000),
    });
    const j = await res.json();
    const ts = j?.result?.header?.timestamp;
    if (ts) return BigInt(ts);
    throw new Error('no header timestamp in block response');
  } catch (e) {
    console.error(`Note: could not read chain time (${e.message}) — using wall clock, which may differ from chain time by seconds.`);
    return BigInt(Date.now()) * 1_000_000n;
  }
}

const seller = await rpcView('get_seller', {});
const timeoutNs = BigInt(seller.call_timeout_seconds) * 1_000_000_000n;
const calls = await rpcView('list_calls', { buyer_account_id: BUYER, from_index: '0', limit: '100' });
const paid = calls.filter((c) => c.status === 'paid');
const nowNs = await chainNowNs();
const expired = paid.filter((c) => nowNs >= BigInt(c.proposed_at) + timeoutNs);
const fmtTs = (ns) => new Date(Number(BigInt(ns) / 1_000_000n)).toISOString();

console.log(`Buyer ${BUYER} on ${CONTRACT}: ${calls.length} call(s), ${paid.length} paid (held), ${expired.length} past timeout (${seller.call_timeout_seconds}s).`);
for (const c of expired) {
  const deadline = BigInt(c.proposed_at) + timeoutNs;
  console.log(`WOULD EXPIRE  call_id=${c.call_id} buyer=${BUYER} proposed_at=${fmtTs(c.proposed_at)} deadline=${fmtTs(deadline)} price_yocto=${c.price} https://testnet.nearblocks.io/address/${BUYER}`);
}
if (expired.length === 0) {
  console.log('No expired paid holds — nothing to expire.');
  process.exit(0);
}
if (DRY_RUN) {
  console.log(`--dry-run: listed ${expired.length} expired paid hold(s) above; no transaction sent. Re-run with --execute to expire them (UNPROVEN — see script header).`);
  process.exit(0);
}

// --execute: one expire_call per expired call, then assert timeout-refunded.
let failed = 0;
for (const c of expired) {
  try {
    const out = execFileSync('near', [
      'contract', 'call-function', 'as-transaction', CONTRACT, 'expire_call',
      'json-args', JSON.stringify({ buyer_account_id: BUYER, call_id: c.call_id }),
      'prepaid-gas', '100.000 TeraGas', 'attached-deposit', '0 NEAR',
      'sign-with-keychain', 'network-config', 'testnet', 'send',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const m = out.match(/Transaction ID:\s*(\S+)/);
    const tx = m ? m[1] : '(not captured)';
    const after = await rpcView('get_call', { buyer_account_id: BUYER, call_id: c.call_id });
    if (after && after.status === 'timeout-refunded') {
      console.log(`EXPIRED  call_id=${c.call_id} tx=${tx} ${ex(tx)} status=timeout-refunded (asserted via get_call)`);
    } else {
      console.error(`EXPIRE UNVERIFIED  call_id=${c.call_id} tx=${tx} ${ex(tx)} on-chain status=${after ? after.status : 'get_call returned nothing'} (expected timeout-refunded)`);
      failed++;
    }
  } catch (e) {
    console.error(`EXPIRE FAILED  call_id=${c.call_id}: ${(e.stderr || e.message || e).toString().slice(0, 500)}`);
    failed++;
  }
}
if (failed > 0) { console.error(`${failed} expire_call(s) failed or unverified — see above.`); process.exit(1); }
console.log(`All ${expired.length} expired paid hold(s) expired and asserted timeout-refunded.`);
process.exit(0);
